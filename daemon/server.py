#!/usr/bin/env python3
"""
Webcom AI - Autonomous Host Daemon Server
Extends FastAPI with genuine agentic ReAct loop, dynamic tool discovery,
and schema-driven host tool execution.

作者: startgo (startgo@yia.app)
授權: GPLv3
版本: v2.2.1
時間: 2026-10-08T07:51:00+08:00
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
import urllib.parse
from pathlib import Path
from typing import Dict, Any, List, Callable, Optional, AsyncGenerator, get_type_hints

# ================================================================
# 1. 系統路徑與全域日誌配置 (保證優先初始化)
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
from fastapi.responses import JSONResponse, FileResponse, RedirectResponse, StreamingResponse
from pydantic import BaseModel

# ================================================================
# 2. 動態工具註冊表 (Dynamic Tool Schema Registry)
# ================================================================
class ToolRegistry:
    def __init__(self):
        self._tools: Dict[str, Callable] = {}
        self._schemas: List[Dict[str, Any]] = []

    def register(self, name: Optional[str] = None, description: Optional[str] = None):
        """將原生 Python 函式動態轉換為標準 OpenAI Function Calling Schema"""
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
            logger.info(f"[ToolRegistry] Registered capability: {tool_name}")
            return func
        return decorator

    def get_schemas(self) -> List[Dict[str, Any]]:
        return self._schemas

    async def execute(self, name: str, arguments: Dict[str, Any]) -> Any:
        if name not in self._tools:
            return {"error": f"Tool '{name}' not found in active registry."}
        func = self._tools[name]
        try:
            if inspect.iscoroutinefunction(func):
                return await func(**arguments)
            else:
                return await asyncio.to_thread(func, **arguments)
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
    description="在主機系統執行終端指令 (Windows PowerShell 或 POSIX Shell)。可用於檢查環境、檔案、網路或行程狀態。"
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
    description="在獨立子行程中執行 Python 程式碼，適用於數學運算、數據轉換、演算法驗證與動態除錯。"
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
    description="讀取伺服器本機指定路徑之檔案文字內容。"
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
    description="將文字內容寫入伺服器本機指定路徑之檔案中 (若目錄不存在將自動遞迴建立)。"
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
    description="使用全網搜尋引擎檢索即時外部資訊。"
)
async def web_search(query: str, max_results: int = 5) -> Dict[str, Any]:
    encoded = urllib.parse.quote(query)
    url = f"https://api.duckduckgo.com/?q={encoded}&format=json&pretty=1&no_html=1&skip_disambig=1"
    headers = {"User-Agent": "WebcomAI-Agent/2.2.1"}
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers=headers, timeout=8) as resp:
                if resp.status != 200:
                    return {"error": f"Search engine returned HTTP {resp.status}"}
                data = await resp.json(content_type=None)
                results = []
                if data.get("AbstractText"):
                    results.append({"title": data.get("Heading"), "snippet": data.get("AbstractText"), "url": data.get("AbstractURL")})
                for topic in data.get("RelatedTopics", [])[:max_results]:
                    if isinstance(topic, dict) and topic.get("Text"):
                        results.append({"title": topic.get("FirstURL"), "snippet": topic.get("Text"), "url": topic.get("FirstURL")})
                return {"status": "success", "query": query, "results": results}
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

# ================================================================
# 4. 自主推理循環 (Autonomous ReAct Loop Engine)
# ================================================================
class AgenticEngine:
    def __init__(self, endpoint: str = "http://127.0.0.1:1234/v1", model: str = "local-model"):
        self.endpoint = endpoint.rstrip("/")
        self.model = model

    async def stream_run(self, user_objective: str, max_steps: int = 10) -> AsyncGenerator[str, None]:
        """
        以 Server-Sent Events (SSE) 串流傳遞自主代理的思考軌跡與工具反饋
        """
        messages = [
            {
                "role": "system",
                "content": (
                    "You are Webcom AI, an autonomous system-integration agent. "
                    "Analyze user requests, formulate multi-step plans, and invoke dynamic capabilities. "
                    "For locations, resolve coordinates before fetching meteorological data. "
                    "Observe tool outputs, reflect on unexpected errors, adjust actions, and produce rigorous conclusions."
                )
            },
            {"role": "user", "content": user_objective}
        ]

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

                messages.append({
                    "role": "tool",
                    "tool_call_id": call_id,
                    "content": json.dumps(observation, ensure_ascii=False)
                })

        yield f"data: {json.dumps({'type': 'limit_exceeded', 'steps': max_steps}, ensure_ascii=False)}\n\n"
        yield "data: [DONE]\n\n"

    async def run(self, user_objective: str, max_steps: int = 10) -> Dict[str, Any]:
        """批次完整執行介面"""
        trajectory = []
        final_ans = ""
        async for chunk in self.stream_run(user_objective, max_steps=max_steps):
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
# 5. FastAPI 應用配置與路由端點
# ================================================================
app = FastAPI(
    title="Webcom AI Host Daemon",
    description="Agentic Host Bridge with ReAct Loop Execution",
    version="2.2.1"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

agent = AgenticEngine(
    endpoint=os.getenv("WEBCOM_LLM_ENDPOINT", "http://127.0.0.1:1234/v1"),
    model=os.getenv("WEBCOM_LLM_MODEL", "local-model")
)

class AgentTaskRequest(BaseModel):
    objective: str
    max_steps: Optional[int] = 10

class ToolDirectExecuteRequest(BaseModel):
    name: str
    arguments: Dict[str, Any] = {}

@app.post("/api/agent/stream")
async def api_agent_stream(req: AgentTaskRequest):
    """即時 SSE 串流介面"""
    return StreamingResponse(
        agent.stream_run(req.objective, max_steps=req.max_steps or 10),
        media_type="text/event-stream"
    )

@app.post("/api/agent/run")
async def run_agent_task(req: AgentTaskRequest):
    """批次完成介面"""
    return await agent.run(user_objective=req.objective, max_steps=req.max_steps or 10)

@app.get("/api/agent/tools")
async def list_tools():
    """檢視所有註冊之 Tool Schemas"""
    return {"tools": registry.get_schemas()}

@app.post("/api/hermes/execute_tool")
async def direct_execute_tool(req: ToolDirectExecuteRequest):
    """Tier 3 原生工具直接呼叫端點"""
    res = await registry.execute(req.name, req.arguments)
    return {"status": "success", "result": res}

@app.get("/api/status")
async def get_system_status():
    return {
        "status": "online",
        "service": "Webcom AI Host Daemon",
        "version": "2.2.1",
        "platform": sys.platform,
        "root_dir": str(PROJECT_ROOT),
        "registered_tools_count": len(registry.get_schemas())
    }

# 靜態檔案路由掛載
web_dir = PROJECT_ROOT / "web"
if web_dir.exists():
    app.mount("/web", StaticFiles(directory=str(web_dir)), name="web")
    app.mount("/js", StaticFiles(directory=str(web_dir / "js")), name="js")
    app.mount("/assets", StaticFiles(directory=str(web_dir / "assets")), name="assets")

@app.get("/")
async def root():
    return RedirectResponse(url="/web/index.html") if web_dir.exists() else {"status": "running"}

if __name__ == "__main__":
    import uvicorn
    logger.info("[*] Starting Webcom AI Autonomous Host Daemon on http://127.0.0.1:8001...")
    uvicorn.run(app, host="0.0.0.0", port=8001)
