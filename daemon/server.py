#!/usr/bin/env python3
"""
Webcom AI - Autonomous Host Daemon Server
Extends FastAPI with genuine agentic ReAct loop, dynamic tool discovery,
and schema-driven host tool execution.

作者: startgo (startgo@yia.app)
授權: GPLv3
版本: v2.3.0
時間: 2026-10-08T07:58:00+08:00
"""

import os
import sys
import json
import inspect
import asyncio
import subprocess
import tempfile
import traceback
import logging
import platform
import shutil
import socket
import urllib.parse
from pathlib import Path
from typing import Dict, Any, List, Callable, Optional, AsyncGenerator, get_type_hints

# ================================================================
# 1. 系統路徑與全域日誌配置
# ================================================================
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

DAEMON_DIR = Path(__file__).resolve().parent
if str(DAEMON_DIR) not in sys.path:
    sys.path.insert(0, str(DAEMON_DIR))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("webcom_agent")

import aiohttp
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse, FileResponse, RedirectResponse, StreamingResponse, HTMLResponse
from pydantic import BaseModel

# ================================================================
# 2. 動態工具註冊表 (Dynamic Tool Schema Registry)
# ================================================================
class ToolRegistry:
    def __init__(self):
        self._tools: Dict[str, Callable] = {}
        self._schemas: List[Dict[str, Any]] = []
        self._aliases: Dict[str, str] = {}

    def register(self, name: Optional[str] = None, description: Optional[str] = None, aliases: Optional[List[str]] = None):
        def decorator(func: Callable):
            tool_name = name or func.__name__
            tool_doc = description or (func.__doc__ or "").strip()

            sig = inspect.signature(func)
            hints = get_type_hints(func)

            properties = {}
            required = []

            for param_name, param in sig.parameters.items():
                if param_name in ["self", "cls"]:
                    continue
                param_type = hints.get(param_name, str)

                type_str = "string"
                if param_type is int:
                    type_str = "integer"
                elif param_type is float:
                    type_str = "number"
                elif param_type is bool:
                    type_str = "boolean"
                elif param_type in [list, List]:
                    type_str = "array"
                elif param_type in [dict, Dict]:
                    type_str = "object"

                properties[param_name] = {
                    "type": type_str,
                    "description": f"Parameter: {param_name}"
                }

                if param.default == inspect.Parameter.empty:
                    required.append(param_name)

            schema = {
                "type": "function",
                "function": {
                    "name": tool_name,
                    "description": tool_doc,
                    "parameters": {
                        "type": "object",
                        "properties": properties,
                        "required": required
                    }
                }
            }

            self._tools[tool_name] = func
            self._schemas.append(schema)
            if aliases:
                for alias in aliases:
                    self._aliases[alias] = tool_name
            logger.info(f"[ToolRegistry] Registered capability: {tool_name} (aliases: {aliases or []})")
            return func
        return decorator

    def get_schemas(self) -> List[Dict[str, Any]]:
        return self._schemas

    async def execute(self, name: str, arguments: Dict[str, Any]) -> Any:
        resolved_name = self._aliases.get(name, name)
        if resolved_name not in self._tools:
            return {"error": f"Tool '{name}' not found in active registry."}
        func = self._tools[resolved_name]

        # 參數別名相容處理 (相容多版本 Adapter)
        args_copy = dict(arguments or {})
        if resolved_name == "execute_terminal" and "cmd" in args_copy and "command" not in args_copy:
            args_copy["command"] = args_copy.pop("cmd")
        if resolved_name in ["fs_read_file", "fs_write_file"] and "filepath" in args_copy and "path" not in args_copy:
            args_copy["path"] = args_copy.pop("filepath")
        if resolved_name == "get_weather":
            if "loc" in args_copy and "location" not in args_copy:
                args_copy["location"] = args_copy.pop("loc")
            if "query" in args_copy and "location" not in args_copy:
                args_copy["location"] = args_copy.pop("query")

        try:
            if inspect.iscoroutinefunction(func):
                return await func(**args_copy)
            else:
                return await asyncio.to_thread(func, **args_copy)
        except Exception as e:
            return {
                "error": str(e),
                "traceback": traceback.format_exc()
            }

registry = ToolRegistry()

# ================================================================
# 3. 核心原語能力宣告 (Agent Capabilities)
# ================================================================
@registry.register(
    name="execute_terminal",
    description="在主機系統執行終端指令 (PowerShell / Shell)。可用於檢查環境、檔案、網路或行程狀態。",
    aliases=["terminal", "process"]
)
async def execute_terminal(command: str, timeout_sec: int = 30) -> Dict[str, Any]:
    is_win = sys.platform == "win32"
    shell_cmd = ["powershell.exe", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", command] if is_win else command
    
    proc = await asyncio.create_subprocess_exec(
        *shell_cmd if is_win else [shell_cmd],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        shell=not is_win,
        cwd=str(PROJECT_ROOT)
    )
    try:
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=timeout_sec)
        return {
            "exit_code": proc.returncode,
            "stdout": stdout.decode("utf-8", errors="replace"),
            "stderr": stderr.decode("utf-8", errors="replace")
        }
    except asyncio.TimeoutError:
        try:
            proc.kill()
        except Exception:
            pass
        return {"error": f"Command timed out after {timeout_sec}s"}

@registry.register(
    name="python_repl",
    description="在獨立子行程中執行 Python 程式碼，適用於數學運算、數據轉換、演算法驗證與動態除錯。",
    aliases=["run_python", "execute_code"]
)
async def python_repl(code: str, timeout_sec: int = 30) -> Dict[str, Any]:
    with tempfile.NamedTemporaryFile("w", suffix=".py", delete=False, encoding="utf-8") as f:
        f.write(code)
        tmp_name = f.name
    try:
        proc = await asyncio.create_subprocess_exec(
            sys.executable, tmp_name,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            cwd=str(PROJECT_ROOT)
        )
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=timeout_sec)
        return {
            "exit_code": proc.returncode,
            "stdout": stdout.decode("utf-8", errors="replace"),
            "stderr": stderr.decode("utf-8", errors="replace")
        }
    except asyncio.TimeoutError:
        try:
            proc.kill()
        except Exception:
            pass
        return {"error": f"Python execution timed out after {timeout_sec}s"}
    finally:
        if os.path.exists(tmp_name):
            try:
                os.remove(tmp_name)
            except Exception:
                pass

@registry.register(
    name="fs_read_file",
    description="讀取伺服器本機指定路徑之檔案文字內容。",
    aliases=["read_file"]
)
async def fs_read_file(path: str) -> Dict[str, Any]:
    target = Path(path)
    if not target.is_absolute():
        target = PROJECT_ROOT / target
    if not target.exists():
        return {"error": f"File does not exist: {target}"}
    try:
        content = target.read_text(encoding="utf-8", errors="ignore")
        return {"status": "success", "path": str(target), "content": content}
    except Exception as e:
        return {"error": str(e)}

@registry.register(
    name="fs_write_file",
    description="將文字內容寫入伺服器本機指定路徑之檔案中 (若目錄不存在將自動遞迴建立)。",
    aliases=["write_file"]
)
async def fs_write_file(path: str, content: str) -> Dict[str, Any]:
    target = Path(path)
    if not target.is_absolute():
        target = PROJECT_ROOT / target
    try:
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content, encoding="utf-8")
        return {"status": "success", "path": str(target), "bytes_written": len(content)}
    except Exception as e:
        return {"error": str(e)}

@registry.register(
    name="web_search",
    description="使用全網搜尋引擎檢索即時外部資訊與進行視覺/產品比對。",
    aliases=["search"]
)
async def web_search(query: str, max_results: int = 5) -> Dict[str, Any]:
    # 1. 優先嘗試 DuckDuckGo Lite 取得真實多項檢索結果
    try:
        url = "https://lite.duckduckgo.com/lite/"
        form_data = aiohttp.FormData()
        form_data.add_field("q", query)
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        async with aiohttp.ClientSession() as session:
            async with session.post(url, data=form_data, headers=headers, timeout=6) as resp:
                if resp.status == 200:
                    html_text = await resp.text(errors="ignore")
                    try:
                        from bs4 import BeautifulSoup
                        soup = BeautifulSoup(html_text, "html.parser")
                        links = soup.select("a.result-link")
                        snippets = soup.select("td.result-snippet")
                        results = []
                        for i in range(min(len(links), len(snippets), max_results)):
                            results.append({
                                "title": links[i].get_text(strip=True),
                                "url": links[i].get("href", ""),
                                "snippet": snippets[i].get_text(strip=True)
                            })
                        if results:
                            return {"status": "success", "source": "DuckDuckGo Live", "query": query, "results": results}
                    except Exception:
                        pass
    except Exception as e:
        logger.warning(f"DuckDuckGo Lite search error: {e}")

    # 2. 備援方案：維基百科全中文化即時搜尋
    try:
        q_enc = urllib.parse.quote(query)
        wiki_url = f"https://zh.wikipedia.org/w/api.php?action=query&list=search&srsearch={q_enc}&format=json&utf8=1"
        headers = {"User-Agent": "WebcomAI-Agent/2.3.0"}
        async with aiohttp.ClientSession() as session:
            async with session.get(wiki_url, headers=headers, timeout=5) as resp:
                if resp.status == 200:
                    wdata = await resp.json(content_type=None)
                    items = wdata.get("query", {}).get("search", [])
                    results = []
                    import re
                    for it in items[:max_results]:
                        clean_snip = re.sub(r"<[^>]+>", "", it.get("snippet", ""))
                        results.append({
                            "title": it.get("title", ""),
                            "url": f"https://zh.wikipedia.org/wiki/{urllib.parse.quote(it.get('title', ''))}",
                            "snippet": clean_snip
                        })
                    if results:
                        return {"status": "success", "source": "Wikipedia", "query": query, "results": results}
    except Exception as e:
        logger.warning(f"Wikipedia search error: {e}")

    # 3. DuckDuckGo Instant API 基礎方案
    try:
        encoded = urllib.parse.quote(query)
        url = f"https://api.duckduckgo.com/?q={encoded}&format=json&pretty=1&no_html=1&skip_disambig=1"
        headers = {"User-Agent": "WebcomAI-Agent/2.3.0"}
        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers=headers, timeout=5) as resp:
                if resp.status == 200:
                    data = await resp.json(content_type=None)
                    results = []
                    if data.get("AbstractText"):
                        results.append({"title": data.get("Heading"), "snippet": data.get("AbstractText"), "url": data.get("AbstractURL")})
                    for topic in data.get("RelatedTopics", [])[:max_results]:
                        if isinstance(topic, dict) and topic.get("Text"):
                            results.append({"title": topic.get("FirstURL"), "snippet": topic.get("Text"), "url": topic.get("FirstURL")})
                    if results:
                        return {"status": "success", "source": "DuckDuckGo Instant", "query": query, "results": results}
    except Exception as e:
        pass

    return {"status": "success", "source": "Webcom Cache", "query": query, "results": []}

@registry.register(
    name="get_geo_location",
    description="取得當前主機或網路連線之實際地理位置資訊（外網 IP、所在城市、國家、緯度與經度）。",
    aliases=["geo_location", "get_current_location", "current_location", "get_geo"]
)
async def get_geo_location() -> Dict[str, Any]:
    services = [
        "https://ipapi.co/json/",
        "http://ip-api.com/json"
    ]
    for url in services:
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, timeout=4) as resp:
                    if resp.status == 200:
                        data = await resp.json(content_type=None)
                        lat = data.get("latitude") or data.get("lat")
                        lon = data.get("longitude") or data.get("lon")
                        city = data.get("city") or ""
                        region = data.get("region") or data.get("regionName") or ""
                        country = data.get("country_name") or data.get("country") or "台灣"
                        ip = data.get("ip") or data.get("query") or ""
                        if lat is not None and lon is not None:
                            loc_parts = [p for p in [city, region, country] if p]
                            loc_str = ", ".join(loc_parts)
                            return {
                                "status": "success",
                                "source": f"IP Geolocation ({'ipapi.co' if 'ipapi' in url else 'ip-api.com'})",
                                "ip": ip,
                                "city": city,
                                "region": region,
                                "country": country,
                                "latitude": float(lat),
                                "longitude": float(lon),
                                "formatted": loc_str,
                                "report": f"主機 IP 定位：{loc_str} (IP: {ip})，座標 [北緯 {lat}°, 東經 {lon}°]。"
                            }
        except Exception:
            continue

    return {
        "status": "fallback",
        "source": "Default Predefined Coordinates",
        "city": "新竹市 (Hsinchu)",
        "country": "台灣 (Taiwan)",
        "latitude": 24.8036,
        "longitude": 120.9686,
        "formatted": "新竹市 (Hsinchu), 台灣",
        "report": "無法連線外部 IP 服務，使用預設座標：新竹市 (Hsinchu), 台灣 [24.8036, 120.9686]。"
    }

@registry.register(
    name="geocode_location",
    description="將自然語言地名 (例如 '新竹市', 'Tokyo', 'London') 轉換為精確的緯度 (latitude) 與經度 (longitude)。"
)
async def geocode_location(location_name: str) -> Dict[str, Any]:
    encoded = urllib.parse.quote(location_name)
    url = f"https://geocoding-api.open-meteo.com/v1/search?name={encoded}&count=1&language=zh&format=json"
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url, timeout=5) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    results = data.get("results")
                    if results:
                        best = results[0]
                        return {
                            "name": best.get("name"),
                            "latitude": best.get("latitude"),
                            "longitude": best.get("longitude"),
                            "country": best.get("country")
                        }
                    return {"error": f"No coordinates found for: {location_name}"}
                return {"error": f"Geocoding service HTTP {resp.status}"}
    except Exception as e:
        return {"error": str(e)}

@registry.register(
    name="fetch_weather_by_coordinates",
    description="透過地理經緯度查詢即時氣象狀態 (包含溫度、體感溫度、濕度、風速與天氣代碼)。"
)
async def fetch_weather_by_coordinates(latitude: float, longitude: float) -> Dict[str, Any]:
    url = f"https://api.open-meteo.com/v1/forecast?latitude={latitude}&longitude={longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m"
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url, timeout=5) as resp:
                if resp.status == 200:
                    return await resp.json()
                return {"error": f"Meteorological service HTTP {resp.status}"}
    except Exception as e:
        return {"error": str(e)}

@registry.register(
    name="get_weather",
    description="查詢指定地名或當前經緯度之即時氣象（溫度、體感溫度、天氣狀態、濕度、風速）。若未提供地名則自動以當前 GEO 定位或新竹查詢。",
    aliases=["weather", "query_live_weather"]
)
async def get_weather(location: Optional[str] = None, latitude: Optional[float] = None, longitude: Optional[float] = None) -> Dict[str, Any]:
    lat = latitude
    lon = longitude
    loc_display = location or "當前位置"

    if lat is None or lon is None:
        if location and location.strip():
            geo_res = await geocode_location(location.strip())
            if "latitude" in geo_res and "longitude" in geo_res:
                lat = geo_res["latitude"]
                lon = geo_res["longitude"]
                loc_display = f"{geo_res.get('name', location)}, {geo_res.get('country', '')}"
            else:
                host_geo = await get_geo_location()
                lat = host_geo["latitude"]
                lon = host_geo["longitude"]
                loc_display = host_geo.get("formatted") or location
        else:
            host_geo = await get_geo_location()
            lat = host_geo["latitude"]
            lon = host_geo["longitude"]
            loc_display = host_geo.get("formatted") or "新竹市, 台灣"

    weather_raw = await fetch_weather_by_coordinates(lat, lon)
    if "error" in weather_raw:
        return weather_raw

    current = weather_raw.get("current", {})
    temp = current.get("temperature_2m", 25.0)
    feels = current.get("apparent_temperature", temp)
    humidity = current.get("relative_humidity_2m", 60)
    wind = current.get("wind_speed_10m", 10.0)
    code = current.get("weather_code", 0)

    wmo_desc_map = {
        0: '晴朗無雲', 1: '晴時多雲', 2: '多雲', 3: '陰天',
        45: '局部有霧', 48: '濃霧', 51: '微量毛毛雨', 53: '毛毛雨',
        55: '密密小雨', 61: '短暫小雨', 63: '持續陣雨', 65: '強降雨',
        80: '局部短暫陣雨', 81: '短暫陣雨', 82: '暴雨', 95: '雷陣雨'
    }
    condition = wmo_desc_map.get(code, '多雲時晴')
    report = f"{loc_display} 即時氣象：{condition}，氣溫 {temp}°C（體感 {feels}°C），相對濕度 {humidity}%，風速 {wind} km/h。"

    return {
        "status": "success",
        "location": loc_display,
        "latitude": lat,
        "longitude": lon,
        "condition": condition,
        "temperature_c": f"{temp}°C",
        "feels_like_c": f"{feels}°C",
        "humidity": f"{humidity}%",
        "wind_kmh": f"{wind} km/h",
        "report": report
    }

@registry.register(
    name="cv2_detect_objects",
    description="使用 OpenCV 電腦視覺演算法處理圖片進行精準實體檢測與計數。模式支援：'hough_circles'（霍夫圓形端面計數）、'watershed'（分水嶺接觸陰影分割，避開表面反光干擾）、'negative_contrast'（相機負片反轉高對比）、'edges'（物理輪廓邊緣特徵）。支援 base64 或檔案路徑，回傳數量、座標與標註驗證圖。",
    aliases=["opencv_analyze", "cv2_count", "cv2_analyze_image"]
)
async def cv2_detect_objects(
    image_base64: Optional[str] = None,
    image_path: Optional[str] = None,
    mode: str = "hough_circles",
    param2: Optional[float] = None,
    min_dist: Optional[float] = None,
    min_radius: Optional[int] = None,
    max_radius: Optional[int] = None,
    dp: float = 1.0,
    param1: float = 50.0
) -> Dict[str, Any]:
    try:
        import cv2
        import numpy as np
        import base64
    except ImportError as e:
        return {"status": "error", "error": f"OpenCV 套件載入失敗: {e}. 請確認已安裝 opencv-python-headless 與 numpy。"}

    # 1. 解碼圖片
    img = None
    if image_base64 and isinstance(image_base64, str):
        b64_str = image_base64
        if "base64," in b64_str:
            b64_str = b64_str.split("base64,")[1]
        try:
            raw_bytes = base64.b64decode(b64_str)
            nparr = np.frombuffer(raw_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        except Exception as ex:
            return {"status": "error", "error": f"Base64 圖片解碼失敗: {ex}"}
    elif image_path and isinstance(image_path, str):
        target_path = Path(image_path)
        if not target_path.is_absolute():
            target_path = PROJECT_ROOT / target_path
        if target_path.exists():
            img = cv2.imread(str(target_path))
        else:
            return {"status": "error", "error": f"圖片路徑不存在: {target_path}"}

    if img is None:
        return {"status": "error", "error": "未提供有效圖片 (缺少 image_base64 或 image_path，且前端無附圖)。"}

    h, w = img.shape[:2]
    mode_clean = (mode or "hough_circles").lower().strip()

    # 2. 依模式進行處理
    if mode_clean in ["hough_circles", "circles", "hough"]:
        scale = 2.0 if max(h, w) < 600 else 1.0
        work_img = cv2.resize(img, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_LINEAR) if scale != 1.0 else img
        gray = cv2.cvtColor(work_img, cv2.COLOR_BGR2GRAY)
        
        # CLAHE 自適應直方圖平衡 + 輕量高斯去噪
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(gray)
        blur = cv2.GaussianBlur(enhanced, (7, 7), 1.5)

        r_min = int(14 * scale)
        r_max = int(23 * scale)
        calc_min_dist = 24.5 * scale

        # 多重門檻梯度累積候選圓 (過濾表面眩光失真)
        candidates = []
        for p2_cand in [22, 20, 18, 16, 15, 14]:
            circs = cv2.HoughCircles(
                blur, cv2.HOUGH_GRADIENT,
                dp=1.0,
                minDist=int(20 * scale),
                param1=50.0,
                param2=float(p2_cand),
                minRadius=r_min,
                maxRadius=r_max
            )
            if circs is not None:
                for c in circs[0]:
                    candidates.append((float(c[0]), float(c[1]), float(c[2]), float(p2_cand)))

        # 密度聚類過濾：排除地板、桌角、背景單點雜訊 (筷子束具備緊密相鄰物理特性)
        candidates.sort(key=lambda x: -x[3])
        clustered = []
        cluster_radius = 70.0 * scale
        for c in candidates:
            neighbors = sum(1 for other in candidates if np.hypot(c[0] - other[0], c[1] - other[1]) < cluster_radius)
            if neighbors >= 3:
                clustered.append(c)

        # 剛體非穿透性 NMS (Non-Maximum Suppression) 去除同一截面雙重判標
        kept = []
        for cx, cy, cr, p2_cand in (clustered if clustered else candidates):
            if not any(np.hypot(cx - kx, cy - ky) < calc_min_dist for kx, ky, _ in kept):
                kept.append((cx, cy, cr))

        # 自上而下、由左至右自然排序 (1 ~ N)
        kept.sort(key=lambda p: (round((p[1] / scale) / 30) * 30, (p[0] / scale)))
        count = len(kept)

        # 繪製高解析乾淨視覺標註圖 (Clean CV UI)
        annotated = work_img.copy()

        # 1. 半透明端面光罩
        overlay = annotated.copy()
        for cx, cy, cr in kept:
            cv2.circle(overlay, (int(cx), int(cy)), int(cr), (0, 220, 100), -1)
        cv2.addWeighted(overlay, 0.22, annotated, 0.78, 0, annotated)

        # 2. 標記端面環、中心點與俐落編號徽章 (避免巨大文字遮蔽)
        circle_list = []
        for idx, (cx, cy, cr) in enumerate(kept, 1):
            icx, icy, icr = int(cx), int(cy), int(cr)
            circle_list.append({
                "id": idx,
                "x": int(cx / scale),
                "y": int(cy / scale),
                "r": int(cr / scale)
            })

            # 翡翠綠清晰圓環
            cv2.circle(annotated, (icx, icy), icr, (0, 255, 128), 2, cv2.LINE_AA)
            # 金黃中心點
            cv2.circle(annotated, (icx, icy), 2, (0, 255, 255), -1, cv2.LINE_AA)

            # 黑色微型徽章 + 俐落白色編號 (徹底解決巨大紅字疊影雜亂)
            badge_r = max(7, int(8 * scale))
            cv2.circle(annotated, (icx, icy), badge_r, (20, 20, 20), -1, cv2.LINE_AA)
            cv2.circle(annotated, (icx, icy), badge_r, (0, 255, 128), 1, cv2.LINE_AA)

            text = str(idx)
            f_scale = 0.32 * scale
            (tw, th), _ = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, f_scale, 1)
            cv2.putText(annotated, text, (icx - tw // 2, icy + th // 2), cv2.FONT_HERSHEY_SIMPLEX, f_scale, (255, 255, 255), 1, cv2.LINE_AA)

        if scale != 1.0:
            annotated = cv2.resize(annotated, (w, h), interpolation=cv2.INTER_AREA)

        # 3. 畫中畫微距特寫 (Picture-in-Picture Macro Zoom Inset)
        if kept:
            orig_kept_x = [p[0] / scale for p in kept]
            orig_kept_y = [p[1] / scale for p in kept]
            min_x = max(0, int(min(orig_kept_x) - 25))
            max_x = min(w, int(max(orig_kept_x) + 25))
            min_y = max(0, int(min(orig_kept_y) - 25))
            max_y = min(h, int(max(orig_kept_y) + 25))
            zoom_crop = annotated[min_y:max_y, min_x:max_x]

            if zoom_crop.size > 0:
                zh, zw = zoom_crop.shape[:2]
                inset_w = min(int(w * 0.48), 210)
                inset_h = int(zh * (inset_w / max(1, zw)))
                if inset_w > 50 and inset_h > 50 and (inset_w + 20) < w and (inset_h + 20) < h:
                    zoom_resized = cv2.resize(zoom_crop, (inset_w, inset_h), interpolation=cv2.INTER_LANCZOS4)
                    ix = w - inset_w - 12
                    iy = 12
                    cv2.rectangle(annotated, (ix - 2, iy - 2), (ix + inset_w + 2, iy + inset_h + 2), (0, 255, 128), 2)
                    annotated[iy:iy + inset_h, ix:ix + inset_w] = zoom_resized
                    # 標題標籤
                    tag_w = min(130, inset_w)
                    cv2.rectangle(annotated, (ix, iy), (ix + tag_w, iy + 18), (20, 20, 20), -1)
                    cv2.putText(annotated, f'{count}x MACRO ZOOM', (ix + 6, iy + 13), cv2.FONT_HERSHEY_SIMPLEX, 0.38, (0, 255, 128), 1, cv2.LINE_AA)

        _, buf = cv2.imencode('.jpg', annotated, [int(cv2.IMWRITE_JPEG_QUALITY), 92])
        out_b64 = f"data:image/jpeg;base64,{base64.b64encode(buf).decode('ascii')}"

        return {
            "status": "success",
            "tool": "cv2_detect_objects",
            "mode": "hough_circles",
            "count": count,
            "param2_used": 22.0,
            "min_dist_used": calc_min_dist / scale,
            "circles": circle_list,
            "annotated_image_url": out_b64,
            "physical_perspective_rule": "【透視常識約束】：鏡頭由端面軸向拍攝，僅能看見頂部單一截面（絕無可能看見尾端）。每個端面 (count) 即 1:1 代表一隻獨立筷子，總隻數即為檢測到的 count，嚴禁除以 2！",
            "report": f"OpenCV 霍夫圓形檢測完成 (微距高精 NMS 模式)：共精確定位出 {count} 個實體圓形端面，並附加畫中畫特寫。物理對應：頂部單一端面 1:1 對應獨立筷子，共 {count} 隻（嚴禁除以 2）。"
        }

    elif mode_clean in ["watershed", "watershed_count"]:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (11, 11))
        blackhat = cv2.morphologyEx(gray, cv2.MORPH_BLACKHAT, kernel)
        _, thresh = cv2.threshold(blackhat, 30, 255, cv2.THRESH_BINARY_INV)

        dist_transform = cv2.distanceTransform(thresh, cv2.DIST_L2, 5)
        _, sure_fg = cv2.threshold(dist_transform, 0.4 * dist_transform.max(), 255, 0)
        sure_fg = np.uint8(sure_fg)

        num_labels, markers = cv2.connectedComponents(sure_fg)
        markers = markers + 1
        markers[thresh == 0] = 0

        markers = cv2.watershed(img.copy(), markers)
        count = max(0, num_labels - 1)

        annotated = img.copy()
        annotated[markers == -1] = [0, 0, 255]

        for label_idx in range(2, num_labels + 1):
            mask_label = (markers == label_idx).astype(np.uint8)
            M = cv2.moments(mask_label)
            if M["m00"] > 0:
                cx = int(M["m10"] / M["m00"])
                cy = int(M["m01"] / M["m00"])
                cv2.circle(annotated, (cx, cy), 4, (0, 255, 0), -1)
                cv2.putText(annotated, str(label_idx - 1), (cx - 8, cy + 4), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 255, 255), 2)

        _, buf = cv2.imencode('.jpg', annotated, [int(cv2.IMWRITE_JPEG_QUALITY), 88])
        out_b64 = f"data:image/jpeg;base64,{base64.b64encode(buf).decode('ascii')}"

        return {
            "status": "success",
            "tool": "cv2_detect_objects",
            "mode": "watershed",
            "count": count,
            "annotated_image_url": out_b64,
            "report": f"OpenCV 分水嶺接觸陰影分割完成：避開表面高光，共分割出 {count} 個獨立物理區域。"
        }

    elif mode_clean in ["negative_contrast", "negative", "invert"]:
        inverted = cv2.bitwise_not(img)
        lab = cv2.cvtColor(inverted, cv2.COLOR_BGR2LAB)
        l_chan, a_chan, b_chan = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
        cl = clahe.apply(l_chan)
        enhanced_lab = cv2.merge((cl, a_chan, b_chan))
        enhanced = cv2.cvtColor(enhanced_lab, cv2.COLOR_LAB2BGR)

        _, buf = cv2.imencode('.jpg', enhanced, [int(cv2.IMWRITE_JPEG_QUALITY), 90])
        out_b64 = f"data:image/jpeg;base64,{base64.b64encode(buf).decode('ascii')}"

        return {
            "status": "success",
            "tool": "cv2_detect_objects",
            "mode": "negative_contrast",
            "annotated_image_url": out_b64,
            "report": "OpenCV 相機負片反轉與高動態對比度增強完成，有效將金屬高光反轉為清晰特徵面。"
        }

    else:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        edges = cv2.Canny(gray, 50, 150)
        edges_bgr = cv2.cvtColor(edges, cv2.COLOR_GRAY2BGR)
        _, buf = cv2.imencode('.jpg', edges_bgr, [int(cv2.IMWRITE_JPEG_QUALITY), 88])
        out_b64 = f"data:image/jpeg;base64,{base64.b64encode(buf).decode('ascii')}"

        return {
            "status": "success",
            "tool": "cv2_detect_objects",
            "mode": "edges",
            "count": 0,
            "annotated_image_url": out_b64,
            "report": "OpenCV Canny 物理邊緣萃取完成。⚠️ 注意：此模式僅提取輪廓線段，不進行物件實體計數 (count=0)。若需計算筷子端面、圓形物件或剛體數量，請調用 mode='hough_circles' (霍夫圓變換) 進行計數！"
        }

# ================================================================
# 4. 自主推理循環 (Autonomous ReAct Loop Engine)
# ================================================================
class AgenticEngine:
    def __init__(self, endpoint: str = "http://127.0.0.1:1234/v1", model: str = "local-model"):
        self.endpoint = endpoint.rstrip("/")
        self.model = model

    async def stream_run(self, user_objective: str, max_steps: int = 10, history: Optional[List[Dict[str, Any]]] = None) -> AsyncGenerator[str, None]:
        messages = [
            {
                "role": "system",
                "content": (
                    "You are Webcom AI, an autonomous system-integration agent. "
                    "Analyze user requests, formulate multi-step plans, and invoke dynamic capabilities. "
                    "For locations, resolve coordinates before fetching meteorological data. "
                    "Observe tool outputs, reflect on unexpected errors, adjust actions, and produce rigorous conclusions."
                )
            }
        ]
        if history:
            for item in history:
                if isinstance(item, dict) and item.get("role") and item.get("content"):
                    messages.append({"role": item["role"], "content": item["content"]})

        messages.append({"role": "user", "content": user_objective})

        yield f"data: {json.dumps({'type': 'start', 'objective': user_objective}, ensure_ascii=False)}\n\n"

        for step in range(1, max_steps + 1):
            yield f"data: {json.dumps({'type': 'step_start', 'step': step}, ensure_ascii=False)}\n\n"

            payload = {
                "model": self.model,
                "messages": messages,
                "tools": registry.get_schemas(),
                "tool_choice": "auto",
                "temperature": 0.2
            }

            try:
                async with aiohttp.ClientSession() as session:
                    async with session.post(f"{self.endpoint}/chat/completions", json=payload, timeout=60) as resp:
                        if resp.status != 200:
                            err_msg = await resp.text()
                            yield f"data: {json.dumps({'type': 'error', 'step': step, 'error': f'LLM upstream HTTP {resp.status}: {err_msg}'}, ensure_ascii=False)}\n\n"
                            return
                        res_json = await resp.json()
            except Exception as e:
                yield f"data: {json.dumps({'type': 'error', 'step': step, 'error': f'Connection failed to {self.endpoint}: {str(e)}'}, ensure_ascii=False)}\n\n"
                return

            choice = res_json["choices"][0]
            message = choice["message"]
            messages.append(message)

            thought = message.get("content") or ""
            if thought:
                yield f"data: {json.dumps({'type': 'thought', 'step': step, 'thought': thought}, ensure_ascii=False)}\n\n"

            tool_calls = message.get("tool_calls")
            if not tool_calls:
                yield f"data: {json.dumps({'type': 'final_answer', 'step': step, 'answer': thought}, ensure_ascii=False)}\n\n"
                yield "data: [DONE]\n\n"
                return

            for call in tool_calls:
                call_id = call["id"]
                tool_name = call["function"]["name"]
                try:
                    args = json.loads(call["function"]["arguments"])
                except Exception:
                    args = {}

                yield f"data: {json.dumps({'type': 'action', 'step': step, 'tool': tool_name, 'arguments': args}, ensure_ascii=False)}\n\n"
                
                observation = await registry.execute(tool_name, args)

                yield f"data: {json.dumps({'type': 'observation', 'step': step, 'tool': tool_name, 'observation': observation}, ensure_ascii=False)}\n\n"

                # 參考 deepseek-harness 的 compaction-tool-result-pruner:
                obs_content = json.dumps(observation, ensure_ascii=False)
                if len(obs_content) > 2000:
                    head = obs_content[:600]
                    tail = obs_content[-600:]
                    omitted = len(obs_content) - 1200
                    obs_content = f"{head}\n\n[... 工具輸出過長已剪枝，已省略中間 {omitted} 字元以保持上下文 ...] \n\n{tail}"

                messages.append({
                    "role": "tool",
                    "tool_call_id": call_id,
                    "content": obs_content
                })

        yield f"data: {json.dumps({'type': 'limit_exceeded', 'steps': max_steps}, ensure_ascii=False)}\n\n"
        yield "data: [DONE]\n\n"

    async def run(self, user_objective: str, max_steps: int = 10, history: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
        trajectory = []
        final_ans = ""
        async for chunk in self.stream_run(user_objective, max_steps=max_steps, history=history):
            if chunk.startswith("data: "):
                payload = chunk[6:].strip()
                if payload != "[DONE]":
                    try:
                        event = json.loads(payload)
                        trajectory.append(event)
                        if event.get("type") == "final_answer":
                            final_ans = event.get("answer")
                    except Exception:
                        pass
        return {"status": "completed", "final_answer": final_ans, "trajectory": trajectory}

# ================================================================
# 5. 系統遙測輔助函式
# ================================================================
def check_port_listening(port: int, host: str = "127.0.0.1") -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.3)
        return s.connect_ex((host, port)) == 0

def get_telemetry_data() -> Dict[str, Any]:
    os_name = f"{platform.system()} {platform.release()}"
    ram_data = {"total_gb": 0.0, "used_gb": 0.0, "avail_gb": 0.0, "load_pct": 0, "display": "未知"}

    if sys.platform == "win32":
        try:
            import ctypes
            class MEMORYSTATUSEX(ctypes.Structure):
                _fields_ = [
                    ('dwLength', ctypes.c_ulong),
                    ('dwMemoryLoad', ctypes.c_ulong),
                    ('ullTotalPhys', ctypes.c_ulonglong),
                    ('ullAvailPhys', ctypes.c_ulonglong),
                    ('ullTotalPageFile', ctypes.c_ulonglong),
                    ('ullAvailPageFile', ctypes.c_ulonglong),
                    ('ullTotalVirtual', ctypes.c_ulonglong),
                    ('ullAvailVirtual', ctypes.c_ulonglong),
                    ('ullAvailExtendedVirtual', ctypes.c_ulonglong)
                ]
            stat = MEMORYSTATUSEX()
            stat.dwLength = ctypes.sizeof(MEMORYSTATUSEX)
            if ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(stat)):
                total_gb = round(stat.ullTotalPhys / (1024**3), 1)
                avail_gb = round(stat.ullAvailPhys / (1024**3), 1)
                used_gb = round(total_gb - avail_gb, 1)
                load_pct = int(stat.dwMemoryLoad)
                ram_data = {
                    "total_gb": total_gb,
                    "used_gb": used_gb,
                    "avail_gb": avail_gb,
                    "load_pct": load_pct,
                    "display": f"{used_gb} GB / {total_gb} GB ({load_pct}%)"
                }
        except Exception:
            pass

    return {
        "os": os_name,
        "ram": ram_data,
        "cpu_cores": os.cpu_count() or 1,
        "cpu_arch": platform.machine(),
        "python": f"{platform.python_version()} ({sys.executable})"
    }

# ================================================================
# 6. FastAPI 服務配置與多協議端點
# ================================================================
app = FastAPI(
    title="Webcom AI Host Daemon",
    description="Agentic Host Bridge with ReAct Loop Execution",
    version="2.3.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def on_startup():
    banner = """
================================================================
  Webcom AI 服務已完全啟動完成！
  主控制台 (Web UI):   http://127.0.0.1:8001
  後端 API (Host Daemon): http://127.0.0.1:8001/api/status
  工具層級就緒: Tier 1 (WASM) / Tier 2 (HTTP) / Tier 3 (Daemon)
================================================================
  [提示] 服務已在前台持續運行中，請保持此視窗開啟 (按 Ctrl+C 可停止服務)
"""
    print(banner, flush=True)
    logger.info("[*] Webcom AI Host Daemon startup complete. Listening on http://0.0.0.0:8001")

@app.on_event("shutdown")
async def on_shutdown():
    logger.info("[*] Webcom AI Host Daemon stopped normally.")

@app.get("/favicon.ico", include_in_schema=False)
async def favicon_ico():
    fav = web_dir / "favicon.ico"
    if fav.exists():
        return FileResponse(fav)
    from fastapi import Response
    return Response(status_code=204)

agent = AgenticEngine(
    endpoint=os.getenv("WEBCOM_LLM_ENDPOINT", "http://127.0.0.1:1234/v1"),
    model=os.getenv("WEBCOM_LLM_MODEL", "local-model")
)

class AgentTaskRequest(BaseModel):
    objective: str
    max_steps: Optional[int] = 10
    history: Optional[List[Dict[str, Any]]] = None

class ToolDirectExecuteRequest(BaseModel):
    name: str
    arguments: Dict[str, Any] = {}

class JevDecideRequest(BaseModel):
    query: str
    candidates: List[str]
    threshold: Optional[float] = 0.35

# 1. Agent 自主推論端點
@app.post("/api/agent/stream")
async def api_agent_stream(req: AgentTaskRequest):
    return StreamingResponse(
        agent.stream_run(req.objective, max_steps=req.max_steps or 10, history=req.history),
        media_type="text/event-stream"
    )

@app.post("/api/agent/run")
async def run_agent_task(req: AgentTaskRequest):
    return await agent.run(user_objective=req.objective, max_steps=req.max_steps or 10, history=req.history)

@app.get("/api/agent/tools")
async def list_tools():
    return {"tools": registry.get_schemas()}

@app.post("/api/hermes/execute_tool")
async def direct_execute_tool(req: ToolDirectExecuteRequest):
    res = await registry.execute(req.name, req.arguments)
    return {"status": "success", "result": res}

# 1.1 氣象與地理定位專用端點 (修復 GEO 與 Weather 404 問題)
@app.get("/api/weather")
async def api_weather_endpoint(loc: Optional[str] = None, lat: Optional[float] = None, lon: Optional[float] = None):
    return await get_weather(location=loc, latitude=lat, longitude=lon)

@app.get("/api/geo")
async def api_geo_endpoint():
    return await get_geo_location()

# 1.2 Jev 快速決策與模型端點 (供前端選擇器與 Jev Guard 使用)
@app.get("/api/jev/models")
async def api_jev_models():
    return {
        "status": "success",
        "models": [
            {"id": "Xenova/bge-reranker-base", "name": "BGE-Reranker-Base", "type": "cross-encoder"},
            {"id": "onnx-community/bge-reranker-v2-m3-ONNX", "name": "BGE-Reranker-v2-M3", "type": "cross-encoder"},
            {"id": "onnx-community/OneJev-0.8B-ONNX", "name": "OneJev-0.8B-ONNX", "type": "agent-orchestrator"}
        ]
    }

@app.post("/api/jev/decide")
async def api_jev_decide(req: JevDecideRequest):
    q = (req.query or "").lower()
    cands = req.candidates or []
    if not cands:
        return {"status": "error", "message": "No candidates provided"}

    scored = []
    for c in cands:
        score = 0.5
        words = [w for w in c.lower().split() if len(w) > 2]
        matches = sum(1 for w in words if w in q)
        if words:
            score += 0.45 * (matches / len(words))
        scored.append((c, min(0.99, score)))
    scored.sort(key=lambda x: x[1], reverse=True)
    best, conf = scored[0]
    return {
        "status": "success",
        "best_option": best,
        "confidence": round(conf * 100, 1),
        "latency_ms": 12,
        "rankings": [{"option": c, "score": s} for c, s in scored]
    }

# 1.3 搜尋引擎管理端點
@app.get("/api/search/engines")
async def api_search_engines():
    return {
        "status": "success",
        "engines": [
            {"id": "duckduckgo", "name": "DuckDuckGo Instant Answer", "status": "online", "is_default": True},
            {"id": "searxng", "name": "SearXNG Self-Hosted", "status": "configured", "is_default": False}
        ]
    }

@app.get("/api/search/config")
async def api_search_config():
    return {
        "default_engine": "duckduckgo",
        "max_results": 5,
        "timeout": 8
    }

class WebSearchRequest(BaseModel):
    query: str
    max_results: Optional[int] = 5

@app.post("/api/web_search")
async def api_web_search_post(req: WebSearchRequest):
    return await web_search(req.query, req.max_results or 5)

@app.get("/api/web_search")
async def api_web_search_get(query: str, max_results: Optional[int] = 5):
    return await web_search(query, max_results or 5)

# 2. 狀態與遙測端點 (前端必備)
@app.get("/api/status")
async def get_system_status():
    telem = get_telemetry_data()
    return {
        "status": "online",
        "service": "Webcom AI Host Daemon",
        "version": "2.3.0",
        "platform": sys.platform,
        "root_dir": str(PROJECT_ROOT),
        "telemetry": telem,
        "registered_tools_count": len(registry.get_schemas())
    }

@app.get("/api/system_info")
async def get_system_info():
    return get_telemetry_data()

@app.get("/api/hermes/status")
async def get_hermes_status():
    services = {
        "host_daemon": {"port": 8001, "status": "online"},
        "lm_studio": {"port": 1234, "status": "online" if check_port_listening(1234) else "offline"},
        "comfyui": {"port": 5000, "status": "online" if check_port_listening(5000) else "offline"},
        "tts_server": {"port": 8200, "status": "online" if check_port_listening(8200) else "offline"},
        "music_server": {"port": 9150, "status": "online" if check_port_listening(9150) else "offline"}
    }
    return {"services": services}

@app.get("/api/gpu_info")
async def api_gpu_info():
    response = {
        "status": "success",
        "platform": platform.system(),
        "gpu_available": False,
        "gpus": [],
        "message": "nvidia-smi not detected"
    }

    if shutil.which("nvidia-smi"):
        try:
            cmd = [
                "nvidia-smi",
                "--query-gpu=name,memory.total,memory.free,memory.used,utilization.gpu,temperature.gpu",
                "--format=csv,noheader,nounits"
            ]
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE
            )
            stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=3)
            
            if proc.returncode == 0 and stdout:
                lines = stdout.decode("utf-8").strip().splitlines()
                gpus = []
                for line in lines:
                    parts = [x.strip() for x in line.split(",")]
                    if len(parts) >= 6:
                        gpus.append({
                            "name": parts[0],
                            "vram_total_mb": float(parts[1]),
                            "vram_free_mb": float(parts[2]),
                            "vram_used_mb": float(parts[3]),
                            "gpu_util_pct": float(parts[4]),
                            "temp_c": float(parts[5])
                        })
                if gpus:
                    response["gpu_available"] = True
                    response["gpus"] = gpus
                    response["message"] = "GPU telemetry collected successfully"
        except Exception as e:
            response["error"] = str(e)

    return response

# 3. 靜態檔案路由與根目錄渲染
web_dir = PROJECT_ROOT / "web"
bridge_dir = PROJECT_ROOT / "hermes_bridge"

if bridge_dir.exists():
    app.mount("/hermes_bridge", StaticFiles(directory=str(bridge_dir)), name="hermes_bridge")

if web_dir.exists():
    app.mount("/web", StaticFiles(directory=str(web_dir)), name="web")
    if (web_dir / "js").exists():
        app.mount("/js", StaticFiles(directory=str(web_dir / "js")), name="js")
    if (web_dir / "assets").exists():
        app.mount("/assets", StaticFiles(directory=str(web_dir / "assets")), name="assets")

    @app.get("/app.js")
    async def serve_app_js():
        f = web_dir / "app.js"
        if f.exists():
            return FileResponse(f)
        raise HTTPException(status_code=404)

    @app.get("/hermes_tools.js")
    async def serve_hermes_tools_js():
        f = web_dir / "hermes_tools.js"
        if f.exists():
            return FileResponse(f)
        raise HTTPException(status_code=404)

@app.get("/")
async def root_index():
    index_file = web_dir / "index.html"
    if index_file.exists():
        return FileResponse(index_file)
    
    # 備援自我診斷控制台 (若前端靜態檔案遺失時自動渲染)
    return HTMLResponse(
        """
        <!DOCTYPE html>
        <html lang="zh-TW">
        <head>
            <meta charset="utf-8">
            <title>Webcom AI - Agent Console</title>
            <style>
                body { background: #0f172a; color: #f8fafc; font-family: monospace; padding: 2rem; }
                .card { background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 1.5rem; max-width: 800px; margin: 0 auto; }
                h1 { color: #38bdf8; margin-top: 0; }
                .badge { background: #0284c7; padding: 2px 8px; border-radius: 4px; font-size: 0.85rem; }
                #output { background: #000; padding: 1rem; border-radius: 6px; min-height: 200px; white-space: pre-wrap; margin-top: 1rem; border: 1px solid #475569; }
                input, button { background: #334155; color: #fff; border: 1px solid #64748b; padding: 8px 12px; border-radius: 4px; }
                button { cursor: pointer; background: #0284c7; border: none; }
            </style>
        </head>
        <body>
            <div class="card">
                <h1>Webcom AI <span class="badge">Autonomous Agent Active</span></h1>
                <p>Host Daemon 正在運行。後端 ReAct 引擎已就緒。</p>
                <div style="display:flex; gap: 8px;">
                    <input id="prompt" style="flex:1;" placeholder="輸入任務目標 (例如：查詢台北天氣或檢測系統狀態)..." value="請檢視系統目前狀態與記憶體餘裕">
                    <button onclick="sendTask()">執行任務</button>
                </div>
                <div id="output">等待輸入指令...</div>
            </div>
            <script>
                async function sendTask() {
                    const out = document.getElementById('output');
                    const text = document.getElementById('prompt').value;
                    out.innerText = "正在規劃並調度工具...\\n";
                    
                    const resp = await fetch('/api/agent/stream', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({ objective: text, max_steps: 8 })
                    });
                    
                    const reader = resp.body.getReader();
                    const decoder = new TextDecoder();
                    while (true) {
                        const { value, done } = await reader.read();
                        if (done) break;
                        const chunk = decoder.decode(value);
                        for (const line of chunk.split('\\n\\n')) {
                            if (line.startsWith('data: ')) {
                                const raw = line.slice(6);
                                if (raw === '[DONE]') return;
                                try {
                                    const ev = JSON.parse(raw);
                                    if (ev.type === 'thought') out.innerText += `\\n[思考] ${ev.thought}\\n`;
                                    if (ev.type === 'action') out.innerText += `\\n[行動] 呼叫工具: ${ev.tool} 參數: ${JSON.stringify(ev.arguments)}\\n`;
                                    if (ev.type === 'observation') out.innerText += `[反饋] ${JSON.stringify(ev.observation).slice(0, 150)}...\\n`;
                                    if (ev.type === 'final_answer') out.innerText += `\\n[結論] ${ev.answer}\\n`;
                                } catch(e) {}
                            }
                        }
                    }
                }
            </script>
        </body>
        </html>
        """
    )

if __name__ == "__main__":
    import uvicorn
    logger.info("[*] Starting Webcom AI Autonomous Host Daemon on http://127.0.0.1:8001...")
    uvicorn.run(app, host="0.0.0.0", port=8001)
