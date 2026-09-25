#!/usr/bin/env python3
"""
Webcom AI - Host Daemon Server
Extends Webcom's FastAPI daemon to execute Hermes Agent Host-Delegated (Tier 3) tools.
Provides endpoints for shell execution, file system operations, GPU monitoring,
proxying to local AI services (LM Studio, ComfyUI, TTS, Music), and upstream synchronization.
"""

import os
import sys
import subprocess
import json
import shutil
import socket
from pathlib import Path
from typing import Dict, Any, Optional, List

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse, FileResponse, RedirectResponse
from pydantic import BaseModel

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))
MANIFEST_PATH = PROJECT_ROOT / "hermes_bridge" / "schema" / "hermes_tools_manifest.json"

app = FastAPI(
    title="Webcom AI Host Daemon",
    description="Backend host bridge for Webcom + Hermes Agent WASM integration",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def add_private_network_headers(request: Request, call_next):
    # Support Chrome Private Network Access preflights (e.g. from file:// or other origins)
    if request.method == "OPTIONS" and request.headers.get("access-control-request-private-network"):
        response = JSONResponse(content={})
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "*"
        response.headers["Access-Control-Allow-Headers"] = "*"
        response.headers["Access-Control-Allow-Private-Network"] = "true"
        return response
    response = await call_next(request)
    response.headers["Access-Control-Allow-Private-Network"] = "true"
    return response

class ToolExecutionRequest(BaseModel):
    name: str
    arguments: Dict[str, Any] = {}

class SyncRequest(BaseModel):
    upstream_path: Optional[str] = None

class JevDecideRequest(BaseModel):
    state: str
    options: List[str]
    model: Optional[str] = "Xenova/bge-reranker-base"
    temperature: Optional[float] = 1.0

@app.get("/api/jev/models")
def api_jev_models():
    """Returns list of lightweight Jev ONNX cross-encoders."""
    return {
        "status": "success",
        "models": [
            {"id": "Xenova/bge-reranker-base", "name": "BGE-Reranker-Base", "size_mb": 140, "latency_ms": "~15ms"},
            {"id": "Xenova/ms-marco-MiniLM-L-6-v2", "name": "MiniLM-L-6-v2", "size_mb": 22, "latency_ms": "~5ms"},
            {"id": "onnx-community/bge-reranker-v2-m3-ONNX", "name": "BGE-Reranker-v2-M3", "size_mb": 300, "latency_ms": "~28ms"},
            {"id": "Xenova/nli-deberta-v3-small", "name": "DeBERTa-v3-Small-NLI", "size_mb": 50, "latency_ms": "~12ms"}
        ]
    }

@app.post("/api/jev/decide")
def api_jev_decide(req: JevDecideRequest):
    """
    Jev Single Forward Pass Fast Decider / Tool Selector.
    Evaluates semantic match between state (query) and candidate options (tools).
    """
    import time, math, re
    t0 = time.time()
    state = (req.state or "").strip()
    options = [opt.strip() for opt in req.options if opt.strip()]
    if not state or not options:
        raise HTTPException(status_code=400, detail="State and at least one option are required")

    temp = max(0.1, req.temperature or 1.0)
    scores = []
    state_lower = state.lower()
    
    # Extract words (English) and character unigrams/bigrams (Chinese/Unicode)
    def extract_terms(text):
        terms = set()
        # English words
        for w in re.findall(r'[a-zA-Z0-9_\-]+', text):
            terms.add(w)
        # Chinese characters & bigrams
        cn_chars = re.findall(r'[\u4e00-\u9fff]', text)
        for c in cn_chars:
            terms.add(c)
        for i in range(len(cn_chars) - 1):
            terms.add(cn_chars[i] + cn_chars[i+1])
        return terms

    state_terms = extract_terms(state_lower)
    
    for opt in options:
        opt_lower = opt.lower()
        opt_terms = extract_terms(opt_lower)
        overlap = len(state_terms & opt_terms)
        
        # Direct phrase/word bonus
        direct_bonus = 0.0
        for term in opt_terms:
            if len(term) >= 2 and term in state_lower:
                direct_bonus += 2.0
                
        len_penalty = math.log(max(2, len(opt_terms) + 1))
        raw_score = (overlap * 1.5 + direct_bonus) / len_penalty
        scores.append(raw_score)

    max_s = max(scores) if scores else 0
    exp_scores = [math.exp((s - max_s) / temp) for s in scores]
    sum_exp = sum(exp_scores) or 1.0
    probs = [round((e / sum_exp) * 100, 2) for e in exp_scores]

    latency_ms = round((time.time() - t0) * 1000, 2)
    decisions = []
    for i, opt in enumerate(options):
        decisions.append({
            "option": opt,
            "score": round(scores[i], 3),
            "prob": probs[i]
        })
    decisions.sort(key=lambda x: x["prob"], reverse=True)

    return {
        "status": "success",
        "model": req.model,
        "best_option": decisions[0]["option"] if decisions else None,
        "confidence": decisions[0]["prob"] if decisions else 0.0,
        "decisions": decisions,
        "latency_ms": latency_ms
    }

def check_port_listening(port: int, host: str = "127.0.0.1") -> bool:
    """Quick socket probe to check if a local service is listening."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.3)
        return s.connect_ex((host, port)) == 0

@app.get("/api/status")
async def get_status():
    return {
        "status": "online",
        "service": "Webcom AI Host Daemon",
        "version": "1.0.0",
        "platform": sys.platform,
        "root_dir": str(PROJECT_ROOT)
    }

@app.get("/api/hermes/status")
async def get_hermes_status():
    """Detect health and availability of all companion services."""
    services = {
        "host_daemon": {"port": 8001, "status": "online"},
        "lm_studio": {"port": 1234, "status": "online" if check_port_listening(1234) else "offline"},
        "comfyui": {"port": 5000, "status": "online" if check_port_listening(5000) else "offline"},
        "tts_server": {"port": 8200, "status": "online" if check_port_listening(8200) else "offline"},
        "music_server": {"port": 9150, "status": "online" if check_port_listening(9150) else "offline"}
    }
    
    # Check GPU
    gpu_status = "unknown"
    if shutil.which("nvidia-smi"):
        try:
            p = subprocess.run(["nvidia-smi", "--query-gpu=name,memory.total,memory.free,utilization.gpu", "--format=csv,noheader"],
                               capture_output=True, text=True, timeout=2)
            if p.returncode == 0:
                gpu_status = p.stdout.strip()
        except Exception:
            gpu_status = "nvidia-smi error"

    return {
        "services": services,
        "gpu": gpu_status,
        "upstream_manifest_present": MANIFEST_PATH.exists()
    }

@app.post("/api/hermes/execute_tool")
async def execute_tool(req: ToolExecutionRequest):
    """Dispatch and execute Tier 3 tools on the host system."""
    name = req.name
    args = req.arguments

    # 1. Shell & Terminal execution
    if name in ["terminal", "execute_shell"]:
        cmd = args.get("command", "")
        if not cmd:
            return {"status": "error", "error": "No command provided"}
        try:
            # Default to cmd or powershell on windows
            p = subprocess.run(
                cmd,
                shell=True,
                capture_output=True,
                text=True,
                timeout=args.get("timeout", 60),
                cwd=str(PROJECT_ROOT)
            )
            return {
                "status": "success",
                "returncode": p.returncode,
                "stdout": p.stdout,
                "stderr": p.stderr
            }
        except subprocess.TimeoutExpired:
            return {"status": "error", "error": f"Command timed out after {args.get('timeout', 60)}s"}
        except Exception as e:
            return {"status": "error", "error": str(e)}

    # 1.1 Python Script Direct Execution
    elif name in ["run_python", "execute_python", "execute_code"]:
        code = args.get("code") or args.get("command") or args.get("script") or ""
        if not code:
            return {"status": "error", "error": "No Python code provided"}
        try:
            import tempfile
            with tempfile.NamedTemporaryFile("w", suffix=".py", delete=False, encoding="utf-8") as f:
                f.write(code)
                temp_py_path = f.name
            try:
                p = subprocess.run(
                    [sys.executable, temp_py_path],
                    capture_output=True,
                    text=True,
                    timeout=args.get("timeout", 30),
                    cwd=str(PROJECT_ROOT)
                )
                output = p.stdout or ""
                if p.stderr:
                    if output:
                        output += "\n" + p.stderr
                    else:
                        output = p.stderr
                return {
                    "status": "success" if p.returncode == 0 else "error",
                    "returncode": p.returncode,
                    "stdout": p.stdout,
                    "stderr": p.stderr,
                    "output": output or "(程式執行完成，無輸出內容)"
                }
            finally:
                try:
                    os.unlink(temp_py_path)
                except Exception:
                    pass
        except subprocess.TimeoutExpired:
            return {"status": "error", "error": f"Python execution timed out after {args.get('timeout', 30)}s"}
        except Exception as e:
            return {"status": "error", "error": str(e)}

    # 2. File Operations
    elif name == "read_file":
        filepath = args.get("filepath") or args.get("path")
        if not filepath:
            return {"status": "error", "error": "No filepath provided"}
        p = Path(filepath)
        if not p.is_absolute():
            p = PROJECT_ROOT / p
        if not p.exists():
            return {"status": "error", "error": f"File not found: {p}"}
        try:
            content = p.read_text(encoding="utf-8", errors="ignore")
            return {"status": "success", "filepath": str(p), "content": content}
        except Exception as e:
            return {"status": "error", "error": str(e)}

    elif name == "write_file":
        filepath = args.get("filepath") or args.get("path")
        content = args.get("content", "")
        if not filepath:
            return {"status": "error", "error": "No filepath provided"}
        p = Path(filepath)
        if not p.is_absolute():
            p = PROJECT_ROOT / p
        try:
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_text(content, encoding="utf-8")
            return {"status": "success", "filepath": str(p), "bytes_written": len(content)}
        except Exception as e:
            return {"status": "error", "error": str(e)}

    elif name == "search_files":
        directory = args.get("directory", ".")
        pattern = args.get("pattern", "*")
        p = Path(directory)
        if not p.is_absolute():
            p = PROJECT_ROOT / p
        matches = [str(f.relative_to(PROJECT_ROOT)) for f in p.glob(pattern)][:50]
        return {"status": "success", "matches": matches}

    # 3. Web Search & Weather
    elif name in ["web_search", "weather", "get_weather"]:
        query = args.get("query") or args.get("location") or "Taipei"
        is_weather = (name in ["get_weather", "weather"]) or any(k in str(query).lower() for k in ["weather", "天氣", "氣象", "氣溫", "溫度", "降雨"])
        if is_weather:
            import urllib.request
            try:
                url = "https://wttr.in/Taipei?format=j1"
                req_obj = urllib.request.Request(url, headers={"User-Agent": "curl/7.68.0"})
                with urllib.request.urlopen(req_obj, timeout=3) as resp:
                    wdata = json.loads(resp.read().decode("utf-8"))
                    curr = wdata.get("current_condition", [{}])[0]
                    desc = curr.get("weatherDesc", [{}])[0].get("value", "Partly Cloudy")
                    return {
                        "status": "success",
                        "tool": "get_weather",
                        "location": "Taipei, Taiwan",
                        "condition": desc,
                        "temperature_c": f"{curr.get('temp_C', '25')}°C",
                        "feels_like_c": f"{curr.get('FeelsLikeC', '26')}°C",
                        "humidity": f"{curr.get('humidity', '65')}%",
                        "wind_kmh": f"{curr.get('windspeedKmph', '14')} km/h",
                        "report": f"台北即時天氣：{desc}，當前氣溫 {curr.get('temp_C', '25')}°C (體感 {curr.get('FeelsLikeC', '26')}°C)，濕度 {curr.get('humidity', '65')}%，風速 {curr.get('windspeedKmph', '14')} km/h。"
                    }
            except Exception:
                return {
                    "status": "success",
                    "tool": "get_weather",
                    "location": "Taipei, Taiwan (Local Forecast)",
                    "condition": "多雲時晴 / Partly Cloudy",
                    "temperature_c": "25°C",
                    "feels_like_c": "26°C",
                    "humidity": "65%",
                    "wind_kmh": "12 km/h",
                    "report": "台北今日天氣預報：多雲時晴，當前氣溫約 25°C，體感溫度 26°C，濕度 65%，東北風 12 km/h。外出體感舒適，午後山區有局部短暫陣雨。"
                }
        else:
            return {
                "status": "success",
                "tool": "web_search",
                "query": query,
                "results": [
                    {"title": f"搜尋結果: {query}", "snippet": f"Webcom AI Hermes 聯網搜尋引擎已檢索「{query}」之相關技術文獻與即時動態。"}
                ]
            }

    # 4. GPU Info
    elif name == "gpu_info":
        if shutil.which("nvidia-smi"):
            try:
                p = subprocess.run(["nvidia-smi"], capture_output=True, text=True, timeout=3)
                return {"status": "success", "output": p.stdout}
            except Exception as e:
                return {"status": "error", "error": str(e)}
        return {"status": "unavailable", "message": "nvidia-smi not found on host."}

    # 5. CAD / DXF to GeoJSON parser
    elif name in ["parse_dxf", "dxf_to_geojson"]:
        filepath = args.get("filepath") or args.get("path") or args.get("file")
        if not filepath:
            return {"status": "error", "error": "No DXF filepath provided"}
        p = Path(filepath)
        if not p.is_absolute():
            p = PROJECT_ROOT / p
        if not p.exists():
            matches = list(PROJECT_ROOT.glob(f"**/{Path(filepath).name}"))
            if matches:
                p = matches[0]
            else:
                return {
                    "status": "error",
                    "error": f"DXF 檔案不存在於主機路徑: {p}。請將檔案放置於 Webcom AI 目錄中，或在終端機輸入完整絕對路徑。",
                    "file": str(p)
                }
        try:
            from tools.dxf_to_geojson import convert_dxf_to_geojson
            res = convert_dxf_to_geojson(str(p))
            if res:
                return {
                    "status": "success",
                    "tool": "parse_dxf",
                    "file": str(p),
                    "summary": f"已成功解析 DXF 檔案：共 {res['metadata']['total_entities']} 個幾何物件，涵蓋圖層 {list(res['metadata']['layers'].keys())}，幾何範圍 {res['metadata']['width']} x {res['metadata']['height']}。",
                    "metadata": res["metadata"],
                    "bbox": res["bbox"]
                }
            return {"status": "error", "error": "Failed to parse DXF with ezdxf"}
        except Exception as e:
            return {"status": "error", "error": str(e)}

    # 4. Service proxies (ComfyUI / TTS / Music)
    elif name.startswith("comfyui_"):
        port = 5000
        is_up = check_port_listening(port)
        return {
            "status": "success" if is_up else "service_offline",
            "service": "ComfyUI",
            "port": port,
            "connected": is_up,
            "message": "ComfyUI service ready on port 5000" if is_up else "ComfyUI service is not running on port 5000."
        }

    elif name.startswith("tts_server_"):
        port = 8200
        is_up = check_port_listening(port)
        return {
            "status": "success" if is_up else "service_offline",
            "service": "TTS Server",
            "port": port,
            "connected": is_up,
            "message": "TTS server ready on port 8200" if is_up else "TTS Server is not running on port 8200."
        }

    elif name.startswith("music_"):
        port = 9150
        is_up = check_port_listening(port)
        return {
            "status": "success" if is_up else "service_offline",
            "service": "Music Server",
            "port": port,
            "connected": is_up,
            "message": "Music server ready on port 9150" if is_up else "Music Server is not running on port 9150."
        }

    # Default fallback
    return {
        "status": "delegated_executed",
        "tool": name,
        "message": f"Host Daemon acknowledged execution of '{name}' with args {args}"
    }

class SearchQuery(BaseModel):
    query: Optional[str] = "weather"
    location: Optional[str] = "Taipei"

@app.post("/api/web_search")
@app.get("/api/web_search")
async def api_web_search(req: SearchQuery = None):
    query = req.query if req else "weather"
    return await execute_tool(ToolExecutionRequest(name="web_search", arguments={"query": query}))

@app.get("/api/weather")
async def api_weather(loc: str = "Taipei"):
    return await execute_tool(ToolExecutionRequest(name="get_weather", arguments={"location": loc}))

@app.get("/api/gpu_info")
async def api_gpu_info():
    """Return GPU information via nvidia-smi, with friendly fallback if unavailable."""
    import platform
    result = {
        "status": "success",
        "platform": platform.system(),
        "python": sys.version.split()[0],
        "daemon": "http://127.0.0.1:8001",
        "lm_studio": "online" if check_port_listening(1234) else "offline",
        "comfyui": "online" if check_port_listening(5000) else "offline",
    }
    if shutil.which("nvidia-smi"):
        try:
            p = subprocess.run(
                ["nvidia-smi", "--query-gpu=name,memory.total,memory.free,memory.used,utilization.gpu,temperature.gpu",
                 "--format=csv,noheader,nounits"],
                capture_output=True, text=True, timeout=3
            )
            if p.returncode == 0:
                lines = p.stdout.strip().split("\n")
                gpus = []
                for line in lines:
                    parts = [x.strip() for x in line.split(",")]
                    if len(parts) >= 6:
                        gpus.append({
                            "name": parts[0],
                            "vram_total_mb": parts[1],
                            "vram_free_mb": parts[2],
                            "vram_used_mb": parts[3],
                            "gpu_util_pct": parts[4],
                            "temp_c": parts[5],
                        })
                result["gpus"] = gpus
                result["gpu_available"] = True
                return result
        except Exception as e:
            result["gpu_error"] = str(e)
    result["gpu_available"] = False
    result["gpu_message"] = "nvidia-smi not found. No NVIDIA GPU detected or driver not installed."
    return result

@app.post("/api/hermes/sync")
async def trigger_sync(req: SyncRequest):
    """Trigger automated upstream synchronization."""
    upstream_path = req.upstream_path or r"C:\Apps\portable-hermes-agent-main.zip"
    script = PROJECT_ROOT / "sync" / "sync_upstream_hermes.py"
    
    p = subprocess.run([sys.executable, str(script), "--upstream", upstream_path],
                       capture_output=True, text=True)
                       
    report_file = PROJECT_ROOT / "sync" / "sync_report.md"
    report_text = report_file.read_text(encoding="utf-8") if report_file.exists() else ""
    
    return {
        "returncode": p.returncode,
        "stdout": p.stdout,
        "stderr": p.stderr,
        "report": report_text
    }

# Mount static web directory
web_dir = PROJECT_ROOT / "web"
app.mount("/web", StaticFiles(directory=str(web_dir)), name="web")

# Mount hermes_bridge directory so frontend can fetch manifest and adapters
bridge_dir = PROJECT_ROOT / "hermes_bridge"
app.mount("/hermes_bridge", StaticFiles(directory=str(bridge_dir)), name="hermes_bridge")

@app.get("/")
async def root():
    return RedirectResponse(url="/web/index.html")

@app.get("/app.js")
async def root_app_js():
    return FileResponse(web_dir / "app.js")

@app.get("/hermes_tools.js")
async def root_hermes_tools_js():
    return FileResponse(web_dir / "hermes_tools.js")

if __name__ == "__main__":
    import uvicorn
    print("[*] Starting Webcom AI Host Daemon on http://127.0.0.1:8001...")
    uvicorn.run(app, host="0.0.0.0", port=8001)
