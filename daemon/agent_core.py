#!/usr/bin/env python3
"""
Webcom AI - Autonomous Agentic Core Engine
Implements genuine ReAct loop, Dynamic Tool Registry, and Structured Function Calling.

作者: startgo (startgo@yia.app)
授權: GPLv3
版本: v2.0.0
時間: 2026-10-08T07:47:00+08:00
"""

import sys
import os
import json
import asyncio
import inspect
import aiohttp
import traceback
from typing import Dict, Any, List, Callable, Optional, get_type_hints

# ================================================================
# 1. 動態工具註冊表 (Dynamic Tool Registry)
# ================================================================
class ToolRegistry:
    def __init__(self):
        self._tools: Dict[str, Callable] = {}
        self._schemas: List[Dict[str, Any]] = []

    def register(self, name: Optional[str] = None, description: Optional[str] = None):
        """將一般 Python 函式自動轉換為具備 OpenAI 相容 JSON Schema 的 Agent 工具"""
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
                if param_type == int:
                    type_str = "integer"
                elif param_type == float:
                    type_str = "number"
                elif param_type == bool:
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
            return func
        return decorator

    def get_schemas(self) -> List[Dict[str, Any]]:
        return self._schemas

    async def execute(self, name: str, arguments: Dict[str, Any]) -> Any:
        if name not in self._tools:
            return {"error": f"Tool '{name}' not recognized in active registry."}
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

# 全域註冊表實例
registry = ToolRegistry()

# ================================================================
# 2. 實體工具宣告 (純能力提供，無特定業務硬編碼)
# ================================================================
@registry.register(name="execute_terminal", description="執行本地終端指令 (PowerShell/Bash)，用於系統巡檢、檔案操作或行程控制。")
async def execute_terminal(command: str, timeout: int = 60) -> Dict[str, Any]:
    import subprocess
    is_win = sys.platform == "win32"
    shell_cmd = ["powershell.exe", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", command] if is_win else command
    
    proc = await asyncio.create_subprocess_exec(
        *shell_cmd if is_win else [shell_cmd],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        shell=not is_win
    )
    try:
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=timeout)
        return {
            "exit_code": proc.returncode,
            "stdout": stdout.decode("utf-8", errors="replace"),
            "stderr": stderr.decode("utf-8", errors="replace")
        }
    except asyncio.TimeoutError:
        proc.kill()
        return {"error": f"Command timed out after {timeout} seconds"}

@registry.register(name="python_repl", description="執行任意 Python 程式碼，適用於數學運算、數據轉換與動態除錯。")
async def python_repl(code: str) -> Dict[str, Any]:
    import subprocess, tempfile
    with tempfile.NamedTemporaryFile("w", suffix=".py", delete=False, encoding="utf-8") as f:
        f.write(code)
        tmp = f.name
    try:
        proc = await asyncio.create_subprocess_exec(
            sys.executable, tmp,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        stdout, stderr = await proc.communicate()
        return {
            "exit_code": proc.returncode,
            "stdout": stdout.decode("utf-8", errors="replace"),
            "stderr": stderr.decode("utf-8", errors="replace")
        }
    finally:
        if os.path.exists(tmp):
            os.remove(tmp)

@registry.register(name="query_live_weather", description="查詢指定地理座標的精確氣象狀態 (經緯度)。")
async def query_live_weather(latitude: float, longitude: float) -> Dict[str, Any]:
    url = f"https://api.open-meteo.com/v1/forecast?latitude={latitude}&longitude={longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m"
    async with aiohttp.ClientSession() as session:
        async with session.get(url, timeout=5) as resp:
            if resp.status == 200:
                return await resp.json()
            return {"error": f"Upstream meteorological API status {resp.status}"}

@registry.register(name="web_search", description="使用搜尋引擎搜尋全網技術資訊或即時資料。")
async def web_search(query: str, max_results: int = 5) -> List[Dict[str, Any]]:
    import urllib.parse
    encoded = urllib.parse.quote(query)
    url = f"https://api.duckduckgo.com/?q={encoded}&format=json&pretty=1&no_html=1&skip_disambig=1"
    async with aiohttp.ClientSession() as session:
        async with session.get(url, timeout=6) as resp:
            if resp.status != 200:
                return [{"error": f"Search failed with code {resp.status}"}]
            data = await resp.json(content_type=None)
            results = []
            if data.get("AbstractText"):
                results.append({"title": data.get("Heading"), "snippet": data.get("AbstractText"), "url": data.get("AbstractURL")})
            for topic in data.get("RelatedTopics", [])[:max_results]:
                if isinstance(topic, dict) and topic.get("Text"):
                    results.append({"title": topic.get("FirstURL"), "snippet": topic.get("Text"), "url": topic.get("FirstURL")})
            return results or [{"snippet": "No direct snippets returned; query executed."}]

# ================================================================
# 3. 自主推理循環 (Autonomous ReAct Loop Engine)
# ================================================================
class AgenticEngine:
    def __init__(self, endpoint: str = "http://127.0.0.1:1234/v1", model: str = "local-model"):
        self.endpoint = endpoint.rstrip("/")
        self.model = model

    async def run(self, user_objective: str, max_steps: int = 8) -> Dict[str, Any]:
        """
        執行自主代理閉環：
        Perceive -> Thought -> Action (Tool Call) -> Observation -> Loop -> Final Answer
        """
        messages = [
            {
                "role": "system",
                "content": (
                    "You are Webcom AI, an autonomous system-integration agent. "
                    "Analyze the user request, plan execution steps, and use the provided tools dynamically. "
                    "Do not guess values if you can query them using tools. "
                    "Always observe tool output, reflect on errors, and adjust parameters until the objective is accomplished."
                )
            },
            {"role": "user", "content": user_objective}
        ]

        trajectory = []

        for step in range(1, max_steps + 1):
            payload = {
                "model": self.model,
                "messages": messages,
                "tools": registry.get_schemas(),
                "tool_choice": "auto",
                "temperature": 0.2
            }

            async with aiohttp.ClientSession() as session:
                async with session.post(f"{self.endpoint}/chat/completions", json=payload, timeout=45) as resp:
                    if resp.status != 200:
                        err_text = await resp.text()
                        return {
                            "status": "failed",
                            "step": step,
                            "error": f"Inference engine failure ({resp.status}): {err_text}",
                            "trajectory": trajectory
                        }
                    res_json = await resp.json()

            choice = res_json["choices"][0]
            message = choice["message"]
            messages.append(message)

            tool_calls = message.get("tool_calls")
            
            # 若 LLM 判定任務完成，不再需要呼叫工具，則給出最終解答
            if not tool_calls:
                return {
                    "status": "completed",
                    "total_steps": step,
                    "final_answer": message.get("content", ""),
                    "trajectory": trajectory
                }

            # 執行工具呼叫
            for call in tool_calls:
                call_id = call["id"]
                tool_name = call["function"]["name"]
                
                try:
                    args = json.loads(call["function"]["arguments"])
                except Exception:
                    args = {}

                # 執行動作並取得 Observation
                observation = await registry.execute(tool_name, args)

                step_record = {
                    "step": step,
                    "tool": tool_name,
                    "arguments": args,
                    "observation": observation
                }
                trajectory.append(step_record)

                # 將反饋送回 Context，讓 Agent 進行 Reflection
                messages.append({
                    "role": "tool",
                    "tool_call_id": call_id,
                    "content": json.dumps(observation, ensure_ascii=False)
                })

        return {
            "status": "max_steps_exceeded",
            "total_steps": max_steps,
            "message": "Agent exceeded maximum reasoning hops without arriving at a terminal state.",
            "trajectory": trajectory
        }
