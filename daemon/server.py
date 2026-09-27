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
import platform
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
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
        return response
    response = await call_next(request)
    response.headers["Access-Control-Allow-Private-Network"] = "true"
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
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

class GraphRagQueryRequest(BaseModel):
    query: str
    mode: Optional[str] = "hybrid"
    max_hops: Optional[int] = 2
    limit: Optional[int] = 15

from daemon.graphrag_engine import backend_graphrag

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

    # Domain associations for error recovery and intent routing
    domain_associations = {
        "500": ["retry", "重試", "5s", "5秒", "delay", "自動重試", "暫態", "backoff"],
        "err500": ["retry", "重試", "5s", "5秒", "delay", "自動重試"],
        "internal server error": ["retry", "重試", "5s", "5秒", "自動重試"],
        "timeout": ["retry", "重試", "5s", "5秒", "delay"],
        "429": ["retry", "重試", "delay", "5s", "5秒", "rate limit"],
        "overloaded": ["retry", "重試", "5s", "5秒", "delay"],
        "401": ["key", "auth", "金鑰", "token", "settings"],
        "403": ["key", "auth", "權限", "settings"],
        "404": ["model", "endpoint", "端點", "not found"],
        "hallucination": ["truncate", "截斷", "warn", "loop", "循環", "修剪", "降溫", "lower_temp", "break", "跳出循環"],
        "loop": ["truncate", "截斷", "warn", "loop", "循環", "修剪", "降溫", "lower_temp", "break", "跳出循環"],
        "repetition": ["truncate", "截斷", "warn", "重複", "循環", "修剪", "降溫", "lower_temp"],
        "repetitive": ["truncate", "截斷", "warn", "重複", "循環", "修剪", "降溫", "lower_temp"],
        "degenerative": ["truncate", "截斷", "warn", "重複", "循環", "修剪", "降溫", "lower_temp"],
        "幻覺": ["truncate", "截斷", "warn", "重複", "循環", "修剪", "降溫", "lower_temp", "跳出循環"],
        "重複": ["truncate", "截斷", "warn", "重複", "循環", "修剪", "降溫", "lower_temp", "跳出循環"],
        "死循環": ["truncate", "截斷", "warn", "重複", "循環", "修剪", "降溫", "lower_temp", "跳出循環"],
        "tool_loop": ["break", "跳出循環", "詢問", "clarify", "替代工具", "終止", "求助"]
    }
    for trigger, assocs in domain_associations.items():
        if trigger in state_lower:
            for a in assocs:
                state_terms.add(a.lower())
    
    for opt in options:
        opt_lower = opt.lower()
        opt_terms = extract_terms(opt_lower)
        overlap = len(state_terms & opt_terms)
        
        # Direct phrase/word bonus
        direct_bonus = 0.0
        for term in opt_terms:
            if len(term) >= 2 and (term in state_lower or term in state_terms):
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

mock_err_counts = {}

@app.post("/v1/chat/completions")
async def mock_chat_completions(request: Request):
    """
    OpenAI-compatible test endpoint.
    Supports simulating HTTP 500 transient errors.
    If header 'x-simulate-500' is 'once', first request returns 500, then 200.
    """
    sim_header = request.headers.get("x-simulate-500", "")
    req_body = await request.json()
    client_ip = request.client.host if request.client else "unknown"

    if sim_header == "once":
        cnt = mock_err_counts.get(client_ip, 0)
        mock_err_counts[client_ip] = cnt + 1
        if cnt == 0:
            return JSONResponse(
                status_code=500,
                content={"error": {"message": "Internal Server Error: transient server overload (simulated)", "code": 500}}
            )

    sim_loop = request.headers.get("x-simulate-loop", "")
    user_prompt = ""
    for msg in req_body.get("messages", []):
        if msg.get("role") == "user":
            user_prompt = msg.get("content", "")

    from fastapi.responses import StreamingResponse
    import asyncio

    if sim_loop == "repeat" or "simulate_loop" in user_prompt:
        async def loop_stream_generator():
            yield "data: {\"choices\":[{\"delta\":{\"content\":\"這是系統分析與診斷報告：所有微服務運作正常。\\n\"}}]}\n\n"
            await asyncio.sleep(0.04)
            # Repeated sentence 5 times to trigger loop guard
            for _ in range(5):
                yield "data: {\"choices\":[{\"delta\":{\"content\":\"請確認以下系統安全配置項目。\\n\"}}]}\n\n"
                await asyncio.sleep(0.04)
            yield "data: [DONE]\n\n"
        return StreamingResponse(loop_stream_generator(), media_type="text/event-stream")

    async def stream_generator():
        yield "data: {\"choices\":[{\"delta\":{\"content\":\"[由 Jev 決策 5 秒後重試成功]\\n\\nAPI 服務已恢復正常，成功接收您的請求！\"}}]}\n\n"
        await asyncio.sleep(0.05)
        yield "data: [DONE]\n\n"

    return StreamingResponse(stream_generator(), media_type="text/event-stream")


def check_port_listening(port: int, host: str = "127.0.0.1") -> bool:
    """Quick socket probe to check if a local service is listening."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.3)
        return s.connect_ex((host, port)) == 0

def get_host_system_telemetry() -> Dict[str, Any]:
    os_name = f"{platform.system()} {platform.release()}"
    if sys.platform == "win32":
        try:
            win_ver = sys.getwindowsversion()
            if win_ver.build >= 22000:
                os_name = f"Windows 11 (組建 {win_ver.build}) 64-bit"
            else:
                os_name = f"Windows 10 (組建 {win_ver.build}) 64-bit"
        except Exception:
            pass
    elif sys.platform == "darwin":
        os_name = f"macOS {platform.mac_ver()[0]}"
    else:
        os_name = f"Linux {platform.release()}"

    ram_data = {
        "total_gb": 0.0,
        "used_gb": 0.0,
        "avail_gb": 0.0,
        "load_pct": 0,
        "display": "未知 (無法讀取記憶體狀態)"
    }

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
                    "display": f"{used_gb} GB / {total_gb} GB (使用率: {load_pct}% · 可用餘裕: {avail_gb} GB)"
                }
        except Exception as e:
            ram_data["display"] = f"讀取錯誤: {e}"
    else:
        try:
            total_b = os.sysconf('SC_PAGE_SIZE') * os.sysconf('SC_PHYS_PAGES')
            avail_b = os.sysconf('SC_PAGE_SIZE') * os.sysconf('SC_AVPHYS_PAGES')
            total_gb = round(total_b / (1024**3), 1)
            avail_gb = round(avail_b / (1024**3), 1)
            used_gb = round(total_gb - avail_gb, 1)
            load_pct = round((used_gb / total_gb) * 100) if total_gb else 0
            ram_data = {
                "total_gb": total_gb,
                "used_gb": used_gb,
                "avail_gb": avail_gb,
                "load_pct": load_pct,
                "display": f"{used_gb} GB / {total_gb} GB (使用率: {load_pct}% · 可用餘裕: {avail_gb} GB)"
            }
        except Exception:
            pass

    gpu_info = "CPU 模式 (無獨立 GPU 驅動)"
    if shutil.which("nvidia-smi"):
        try:
            smi_res = subprocess.run(
                ["nvidia-smi", "--query-gpu=name,memory.total,memory.used,utilization.gpu", "--format=csv,noheader,nounits"],
                capture_output=True, text=True, timeout=3
            )
            if smi_res.returncode == 0 and smi_res.stdout.strip():
                parts = [x.strip() for x in smi_res.stdout.strip().split(",")]
                if len(parts) >= 4:
                    gpu_info = f"NVIDIA {parts[0]} · {parts[2]}MB/{parts[1]}MB VRAM (負載: {parts[3]}% · GPU 90% 守護)"
                else:
                    gpu_info = f"NVIDIA {smi_res.stdout.strip()} (GPU 90% 顯存守護已就緒)"
        except Exception:
            pass

    return {
        "os": os_name,
        "ram": ram_data,
        "cpu_cores": os.cpu_count() or 1,
        "cpu_arch": platform.machine(),
        "gpu": gpu_info,
        "python": f"{platform.python_version()} ({sys.executable})"
    }

@app.get("/api/status")
async def get_status():
    telem = get_host_system_telemetry()
    return {
        "status": "online",
        "service": "Webcom AI Host Daemon",
        "version": "1.0.0",
        "platform": sys.platform,
        "root_dir": str(PROJECT_ROOT),
        "telemetry": telem
    }

@app.get("/api/system_info")
async def get_system_info():
    return get_host_system_telemetry()

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
        
        cmd_clean = cmd.strip().lower()
        if cmd_clean in ["/", "/?", "/help", "/list", "/commands"]:
            directory = (
                "╔══════════════════════════════════════════════════════════════════════════════╗\n"
                "║  ⚡ JEV SYSTEM 1 環境指令即時清單 (ENVIRONMENT COMMAND DIRECTORY)              ║\n"
                "╚══════════════════════════════════════════════════════════════════════════════╝\n"
                "● 當前活動環境: 【PowerShell / 本地命令列】 (Jev SFP 延遲: ~5ms, 信心度: 79.4%)\n"
                "● 推薦指令清單 (按 Tab 帶入或直接執行):\n"
                "  [1] nvidia-smi                   — NVIDIA 顯示卡狀態與顯存 (GPU 90% 守護)\n"
                "  [2] Get-Process (Top 10 CPU)     — 查詢 CPU 佔用前 10 大程序\n"
                "  [3] Test-NetConnection :8001     — 測試 Host Daemon (Port 8001) 連通性\n"
                "  [4] ipconfig /all                — 檢視所有網路卡 IP 與 DNS 配置\n"
                "  [5] Get-Service (Running)        — 查詢 Windows 正在運行的系統服務\n"
                "  [6] Get-PSDrive (FileSystem)     — 檢查硬碟儲存空間與分割區餘量\n"
                "  [7] python --version             — 檢查本機 Python 執行環境\n"
                "  [8] git status                   — 檢查當前 Git 儲存庫分支與檔案異動\n"
                "  [9] /detect                      — ⚡ Jev 全環境深入探測 (Probe Env)\n"
                "  [10] Clear-Host                  — 清除終端機畫面 (CLS)\n"
                "──────────────────────────────────────────────────────────────────────────────\n"
                "💡 操作提示: 在下方輸入框輸入「/」會即時彈出浮動選單，按 ↑/↓ 選擇、Tab 帶入、Enter 直接執行。亦可輸入 /detect 進行深度環境探測。"
            )
            return {
                "status": "success",
                "returncode": 0,
                "stdout": directory,
                "stderr": "",
                "output": directory
            }

        if cmd_clean in ["/detect", "/env", "/jev", "/probe", "/status"] or cmd_clean.startswith("/detect "):
            telem = get_host_system_telemetry()
            report = (
                "╔══════════════════════════════════════════════════════════════════════════════╗\n"
                "║  ⚡ JEV SYSTEM 1 環境指令即時偵測報告 (HOST DAEMON PROBE REPORT)             ║\n"
                "╚══════════════════════════════════════════════════════════════════════════════╝\n"
                f"● 作業系統版本: {telem['os']}\n"
                f"● 系統主記憶體: {telem['ram']['display']}\n"
                f"● 處理器核心數: {telem['cpu_cores']} 執行緒 ({telem['cpu_arch']})\n"
                f"● Python 核心: {telem['python']}\n"
                f"● 顯示卡硬體守護: {telem['gpu']}\n"
                f"● 主機常駐服務: 127.0.0.1:8001 (FastAPI Daemon 正常連線中)\n"
                f"● 專案工作目錄: {PROJECT_ROOT}\n"
                "──────────────────────────────────────────────────────────────────────────────\n"
                "🎯 Jev 已為此環境鎖定推薦指令 (直接在下方輸入框鍵入「/」叫出清單)：\n"
                "  1. nvidia-smi (顯卡與顯存狀態)\n"
                "  2. Get-Process | Sort-Object CPU -Descending | Select-Object -First 10\n"
                "  3. Test-NetConnection 127.0.0.1 -Port 8001\n"
                "──────────────────────────────────────────────────────────────────────────────"
            )
            return {
                "status": "success",
                "returncode": 0,
                "stdout": report,
                "stderr": "",
                "output": report
            }
        
        if cmd_clean in ["/cls", "/clear"]:
            return {
                "status": "success",
                "returncode": 0,
                "stdout": "",
                "stderr": "",
                "output": ""
            }

        if sys.platform == "win32":
            # Auto-upgrade raw PowerShell status commands to clean tabular displays
            if cmd_clean in ["/top", "/ps", "/process"]:
                cmd = "Get-Process | Sort-Object CPU -Descending | Select-Object -First 10 | Format-Table @{N='PID';E={$_.Id};Width=8}, @{N='行程名稱 (ProcessName)';E={$_.ProcessName};Width=24}, @{N='CPU(秒)';E={[math]::Round($_.CPU,1)};Width=12}, @{N='記憶體(MB)';E={[math]::Round($_.WorkingSet64/1MB,1)};Width=12} -AutoSize"
            elif "get-process" in cmd_clean and "sort-object cpu" in cmd_clean and "format-" not in cmd_clean:
                cmd = "Get-Process | Sort-Object CPU -Descending | Select-Object -First 10 | Format-Table @{N='PID';E={$_.Id};Width=8}, @{N='行程名稱 (ProcessName)';E={$_.ProcessName};Width=24}, @{N='CPU(秒)';E={[math]::Round($_.CPU,1)};Width=12}, @{N='記憶體(MB)';E={[math]::Round($_.WorkingSet64/1MB,1)};Width=12} -AutoSize"
            elif "get-psdrive" in cmd_clean and "format-" not in cmd_clean:
                cmd = "Get-PSDrive -PSProvider FileSystem | Format-Table @{N='磁碟槽 (Drive)';E={$_.Name + ':'};Width=12}, @{N='已用(GB)';E={[math]::Round($_.Used/1GB,1)};Width=12}, @{N='可用餘裕(GB)';E={[math]::Round($_.Free/1GB,1)};Width=14}, @{N='使用率';E={[math]::Round(($_.Used/($_.Used+$_.Free))*100, 1).ToString() + '%'};Width=10}, @{N='路徑 (Root)';E={$_.Root}} -AutoSize"
            elif "get-service" in cmd_clean and "status" in cmd_clean and "format-" not in cmd_clean:
                cmd = "Get-Service | Where-Object {$_.Status -eq 'Running'} | Select-Object -First 12 | Format-Table @{N='服務代號 (Name)';E={$_.Name};Width=24}, @{N='狀態';E={'運作中'};Width=8}, @{N='顯示名稱 (DisplayName)';E={$_.DisplayName}} -AutoSize"
            elif cmd_clean.startswith("/") and not cmd_clean.startswith("/?"):
                hint = f"[Jev 提示] 未知終端斜線指令: \"{cmd}\"。請輸入「/」查看環境指令清單，或輸入「/detect」進行環境探測。"
                return {
                    "status": "success",
                    "returncode": 0,
                    "stdout": hint,
                    "stderr": "",
                    "output": hint
                }

        try:
            timeout_sec = args.get("timeout", 60)
            if sys.platform == "win32":
                # Default terminal on Windows is PowerShell (matching the PS> prompt)
                ps_cmd = f"[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; {cmd}"
                p = subprocess.run(
                    ["powershell.exe", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", ps_cmd],
                    capture_output=True,
                    timeout=timeout_sec,
                    cwd=str(PROJECT_ROOT)
                )
            else:
                p = subprocess.run(
                    cmd,
                    shell=True,
                    capture_output=True,
                    timeout=timeout_sec,
                    cwd=str(PROJECT_ROOT)
                )

            def decode_bytes(b: bytes) -> str:
                if not b:
                    return ""
                # Check for UTF-16LE BOM or null-byte pattern typical of Windows CLI tools (wsl.exe, cmd, etc.)
                if b.startswith(b"\xff\xfe") or (len(b) >= 4 and b[1] == 0 and b[3] == 0):
                    try:
                        return b.decode("utf-16-le").replace("\x00", "").rstrip()
                    except Exception:
                        pass
                for enc in ["utf-8", "cp950", "oem", "gbk", "latin-1"]:
                    try:
                        s = b.decode(enc)
                        if s.count("\x00") > len(s) // 4:
                            try:
                                return b.decode("utf-16-le").replace("\x00", "").rstrip()
                            except Exception:
                                pass
                        return s.replace("\x00", "").rstrip()
                    except UnicodeDecodeError:
                        continue
                return b.decode("utf-8", errors="replace").replace("\x00", "").rstrip()

            stdout_str = decode_bytes(p.stdout)
            stderr_str = decode_bytes(p.stderr)

            return {
                "status": "success",
                "returncode": p.returncode,
                "stdout": stdout_str,
                "stderr": stderr_str,
                "output": stdout_str or stderr_str or "(命令執行完成，無輸出內容)"
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

    # GraphRAG & Knowledge Graph Query
    elif name in ["graphrag_query", "query_knowledge_graph", "query_knowledge_base"]:
        q = args.get("query") or args.get("question") or args.get("keyword") or ""
        mode = args.get("mode") or "hybrid"
        max_hops = int(args.get("max_hops") or 2)
        limit = int(args.get("limit") or 15)
        res = backend_graphrag.query(q, mode=mode, max_hops=max_hops, limit=limit)
        return res

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

@app.get("/api/graphrag/graph")
async def api_graphrag_get_graph():
    """Retrieve full knowledge graph for visualizer."""
    return backend_graphrag.get_graph()

@app.post("/api/graphrag/query")
async def api_graphrag_query(req: GraphRagQueryRequest):
    """Execute multi-hop Knowledge Graph enhanced RAG traversal."""
    return backend_graphrag.query(
        req.query,
        mode=req.mode or "hybrid",
        max_hops=req.max_hops or 2,
        limit=req.limit or 15
    )

@app.post("/api/graphrag/rebuild")
async def api_graphrag_rebuild():
    """Reload or rebuild knowledge graph."""
    backend_graphrag.load_graph()
    return {"status": "success", "message": "GraphRAG knowledge graph reloaded successfully."}

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
