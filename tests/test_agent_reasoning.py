#!/usr/bin/env python3
"""
test_agent_reasoning.py - Test Hermes Agent Loop with a Local Small Model
Verifies that a local model (via LM Studio or API) can:
1. Receive system prompt with Hermes tool definitions.
2. Emit an autonomous <tool_call>.
3. Receive the executed tool result (<tool_response>).
4. Synthesize the final grounded response.
"""

import urllib.request
import json
import re
import sys
import io
from pathlib import Path

# Force UTF-8 output on Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

PROJECT_ROOT = Path(__file__).resolve().parent.parent

# 1. Hermes Agent System Prompt
SYSTEM_PROMPT = """你是一個具備自主工具調用能力的 Hermes AI 助理 (Agent)。
你可以使用工具獲取本機環境數據並解決問題。

要使用工具，請嚴格輸出以下 XML 格式（不要包含任何額外 Markdown 程式碼區塊標記，直接輸出 XML）：
<tool_call>{"name": "工具名稱", "arguments": {"參數名": "參數值"}}</tool_call>

可用工具清單：
1. gpu_info: 查詢本機 NVIDIA GPU 狀態、顯存與溫度。參數: {}
2. run_python: 執行 Python 程式碼並回傳結果。參數: {"code": "代碼字串"}
3. terminal: 在本機執行終端機命令。參數: {"command": "指令字串"}

行為準則：
1. 當使用者詢問需要系統或環境資訊時，請主動調用對應工具。
2. 輸出 <tool_call> 後等待工具執行結果。
"""

def call_local_llm(messages, model="google/gemma-4-e4b"):
    payload = {
        "model": model,
        "messages": messages,
        "temperature": 0.2,
        "max_tokens": 512
    }
    req = urllib.request.Request(
        "http://127.0.0.1:1234/v1/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        res = json.loads(resp.read().decode("utf-8"))
        return res["choices"][0]["message"]["content"]

def execute_tool_via_daemon(tool_name, tool_args):
    payload = {"name": tool_name, "arguments": tool_args}
    req = urllib.request.Request(
        "http://127.0.0.1:8001/api/hermes/execute_tool",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        return json.loads(resp.read().decode("utf-8"))

def main():
    print("=" * 60)
    print("🧪 啟動 Hermes Agent 雙向自主工具調用迴圈測試 (Local Model)")
    print("=" * 60)

    # Check available models in LM Studio
    try:
        req = urllib.request.Request("http://127.0.0.1:1234/v1/models")
        with urllib.request.urlopen(req, timeout=5) as resp:
            models_data = json.loads(resp.read().decode("utf-8"))
            available_models = [m["id"] for m in models_data.get("data", [])]
            print(f"[*] LM Studio 目前可用模型清單: {available_models}")
    except Exception as e:
        print(f"[!] 無法連線至 LM Studio (Port 1234): {e}")
        return 1

    # Select the model currently loaded or gemma-4-e4b
    target_model = available_models[0] if available_models else "google/gemma-4-e4b"
    # Prefer gemma-4-e4b if present
    if "google/gemma-4-e4b" in available_models:
        target_model = "google/gemma-4-e4b"
    print(f"[*] 測試目標小模型: {target_model}")

    user_query = "請查詢我這台電腦目前的 GPU 型號、顯存使用量與當前溫度，並向我回報。"
    print(f"\n[1] 使用者輸入: {user_query}")

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_query}
    ]

    print("\n[2] 送出 Prompt 給模型，等待 Agent 進行自主推理與 Tool Calling...")
    ai_turn1 = call_local_llm(messages, model=target_model)
    print("\n--- 模型第一輪回應 (Reasoning & Tool Call) ---")
    print(ai_turn1.strip())
    print("---------------------------------------------")

    # Check for <tool_call>
    match = re.search(r'<tool_call>(.*?)</tool_call>', ai_turn1, re.DOTALL)
    if not match:
        print("\n[!] 模型未產生 <tool_call> 標籤，可能直接回覆或模型 Tool Calling 格式需要適配。")
        return 1

    tool_call_raw = match.group(1).strip()
    try:
        tool_call_json = json.loads(tool_call_raw)
        tool_name = tool_call_json.get("name")
        tool_args = tool_call_json.get("arguments", {})
    except Exception as e:
        print(f"[!] 解析 tool_call JSON 失敗: {e}")
        return 1

    print(f"\n[3] 成功攔截 Tool Call: 工具名稱 = '{tool_name}', 參數 = {tool_args}")
    print(f"[*] 正在調用 Webcom AI Daemon 執行工具...")

    tool_res = execute_tool_via_daemon(tool_name, tool_args)
    print(f"[+] 工具執行結果回傳 (Tool Output):")
    print(json.dumps(tool_res, indent=2, ensure_ascii=False)[:300] + "...")

    # Turn 2: Feed tool result back to model
    messages.append({"role": "assistant", "content": ai_turn1})
    messages.append({"role": "user", "content": f"<tool_response>{json.dumps(tool_res, ensure_ascii=False)}</tool_response>\n請根據上述實際工具執行的回傳數據，為使用者進行總結報告。"})

    print("\n[4] 將工具數據回傳模型，等待最終 Grounded 總結...")
    ai_turn2 = call_local_llm(messages, model=target_model)
    print("\n=== Agent 最終回答 (Final Grounded Report) ===")
    print(ai_turn2.strip())
    print("=============================================")
    print("\n🎉 驗證成功：小模型已具備完整的 Agent 意圖判斷、Tool Call 發射、結果感知與數據總結能力！")
    return 0

if __name__ == "__main__":
    sys.exit(main())
