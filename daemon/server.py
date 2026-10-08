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

    def register(self, name: Optional[str] = None, description: Optional[str] = None):
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
    description="在主機系統執行終端指令 (PowerShell / Shell)。可用於檢查環境、檔案、網路或行程狀態。"
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
    headers = {"User-Agent": "WebcomAI-Agent/2.3.0"}
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

# 1. Agent 自主推論端點
@app.post("/api/agent/stream")
async def api_agent_stream(req: AgentTaskRequest):
    return StreamingResponse(
        agent.stream_run(req.objective, max_steps=req.max_steps or 10),
        media_type="text/event-stream"
    )

@app.post("/api/agent/run")
async def run_agent_task(req: AgentTaskRequest):
    return await agent.run(user_objective=req.objective, max_steps=req.max_steps or 10)

@app.get("/api/agent/tools")
async def list_tools():
    return {"tools": registry.get_schemas()}

@app.post("/api/hermes/execute_tool")
async def direct_execute_tool(req: ToolDirectExecuteRequest):
    res = await registry.execute(req.name, req.arguments)
    return {"status": "success", "result": res}

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
