"""
test_hallucination_loop_guard.py — Comprehensive tests for:
1. detectHallucinationLoop (Periodic cycle, sentence repetition, stutter)
2. Jev Fast-Decision hallucination state evaluation & confidence
3. Jev Sandbox Modal Scenario 3 (Hallucination Loop Guard)
4. Real-time streaming interception, clean truncation & UI warning card
5. Agent Tool-Calling loop interception (3 consecutive identical calls)
"""

import asyncio
import json
import os
import subprocess
import sys
import urllib.request
import websockets

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

CDP_PORT = 9222
CHROME_PATH = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if not os.path.exists(CHROME_PATH):
    CHROME_PATH = r"C:\Program Files\Microsoft\Edge\Application\msedge.exe"

class SimpleCDP:
    def __init__(self, ws_url):
        self.ws_url = ws_url
        self.ws = None
        self.id_counter = 0

    async def connect(self):
        self.ws = await websockets.connect(self.ws_url, max_size=50*1024*1024)

    async def send_cmd(self, method, params=None):
        self.id_counter += 1
        msg_id = self.id_counter
        payload = {"id": msg_id, "method": method, "params": params or {}}
        await self.ws.send(json.dumps(payload))
        while True:
            resp = json.loads(await self.ws.recv())
            if resp.get("id") == msg_id:
                return resp

    async def eval_js(self, expression):
        res = await self.send_cmd("Runtime.evaluate", {
            "expression": expression,
            "awaitPromise": True,
            "returnByValue": True
        })
        if "exceptionDetails" in res.get("result", {}):
            raise RuntimeError(f"JS Exception: {res['result']['exceptionDetails']}")
        return res.get("result", {}).get("result", {}).get("value")


async def test_hallucination_guard_suite():
    print("\n=======================================================")
    print("  Webcom AI — Hallucination Loop Guard & Jev Recovery  ")
    print("=======================================================\n")

    user_data = os.path.join(os.environ.get("TEMP", r"C:\tmp"), "edge_test_loop_profile")
    cmd = [
        CHROME_PATH,
        f"--remote-debugging-port={CDP_PORT}",
        f"--user-data-dir={user_data}",
        "--no-first-run",
        "--no-default-browser-check",
        "--headless=new",
        "http://127.0.0.1:8001/web/index.html"
    ]
    proc = subprocess.Popen(cmd)

    try:
        ws_url = None
        for _ in range(30):
            await asyncio.sleep(0.5)
            try:
                resp = urllib.request.urlopen(f"http://127.0.0.1:{CDP_PORT}/json")
                targets = json.loads(resp.read().decode())
                for t in targets:
                    if t.get("type") == "page" and "8001" in t.get("url", ""):
                        ws_url = t.get("webSocketDebuggerUrl")
                        break
                if ws_url:
                    break
            except Exception:
                pass

        assert ws_url, "Could not obtain CDP WebSocketDebuggerUrl"
        cdp = SimpleCDP(ws_url)
        await cdp.connect()

        # Wait for page ready
        await asyncio.sleep(2)

        # ----------------------------------------------------
        # TEST 1: detectHallucinationLoop unit tests in browser
        # ----------------------------------------------------
        print("--- TEST 1: detectHallucinationLoop Unit Tests ---")
        unit_res = await cdp.eval_js("""(() => {
            const app = window.webcomApp;
            // 1. Normal text (should return null)
            const normal = "這是一個標準的系統架構說明文件，包含前端介面與後端服務。";
            const resNormal = app.detectHallucinationLoop(normal);

            // 2. Periodic cycle pattern (repeated 4 times)
            const cycleText = "系統正在進行微服務健康檢查。\\n請確認以下安全配置：\\n請確認以下安全配置：\\n請確認以下安全配置：\\n請確認以下安全配置：";
            const resCycle = app.detectHallucinationLoop(cycleText);

            // 3. Repeating sentence pattern
            const sentenceText = "推論運算分析完成。建議查看資源使用量。建議查看資源使用量。建議查看資源使用量。";
            const resSentence = app.detectHallucinationLoop(sentenceText);

            // 4. Stutter pattern
            const stutterText = "計算結果為" + ".".repeat(20);
            const resStutter = app.detectHallucinationLoop(stutterText);

            return {
                normalIsNull: resNormal === null,
                cycleDetected: !!resCycle && resCycle.count >= 3,
                cycleCleanedSnippet: resCycle?.cleanText,
                sentenceDetected: !!resSentence && resSentence.count >= 3,
                sentenceCleanedSnippet: resSentence?.cleanText,
                stutterDetected: !!resStutter && resStutter.count >= 10
            };
        })()""")
        print("  Unit tests result:", json.dumps(unit_res, indent=2, ensure_ascii=False))
        assert unit_res['normalIsNull'], "Normal text incorrectly flagged as loop"
        assert unit_res['cycleDetected'], "Cycle pattern loop failed detection"
        assert unit_res['sentenceDetected'], "Sentence repetition loop failed detection"
        assert unit_res['stutterDetected'], "Stutter pattern loop failed detection"
        print("  ✔ 1. detectHallucinationLoop unit tests passed (cycle, sentence, stutter)")

        # ----------------------------------------------------
        # TEST 2: Jev Fast-Decision on Hallucination Loop State
        # ----------------------------------------------------
        print("\n--- TEST 2: Jev Fast-Decision on Hallucination Loop Recovery ---")
        jev_res = await cdp.eval_js("""(async () => {
            return await window.webcomApp.evalJevDecision(
                "LLM generation entered repetitive hallucination loop (repeating sentence: '請確認以下系統安全配置項目' 4 times). Prevent degenerative runaway.",
                [
                    "中斷生成並修剪循環 (truncate_and_warn)",
                    "降低溫度重新推論 (retry_lower_temp)",
                    "切換備用模型重試 (switch_model_fallback)"
                ],
                0.35
            );
        })()""")
        print("  Jev Loop Decision:", json.dumps(jev_res, indent=2, ensure_ascii=False))
        assert "truncate_and_warn" in jev_res['best_option'] or "修剪循環" in jev_res['best_option'], f"Unexpected decision: {jev_res['best_option']}"
        assert jev_res['confidence'] > 80, f"Confidence too low: {jev_res['confidence']}"
        print(f"  ✔ 2. Jev correctly selected '{jev_res['best_option']}' with {jev_res['confidence']}% confidence in {jev_res['latency_ms']} ms")

        # ----------------------------------------------------
        # TEST 3: Jev Sandbox Modal Scenario 3 (Loop Guard)
        # ----------------------------------------------------
        print("\n--- TEST 3: Jev Sandbox Modal Scenario 3 (Loop Guard) ---")
        modal_res = await cdp.eval_js("""(async () => {
            window.webcomApp.showJevModal();
            const btnLoop = document.getElementById('btn-jev-scen-loop');
            if (btnLoop) btnLoop.click();

            const actionBtn = document.getElementById('btn-modal-action');
            if (actionBtn) actionBtn.click();

            await new Promise(r => setTimeout(r, 400));
            const outText = document.getElementById('jev-output')?.innerText || '';
            return {
                modalOpen: !document.getElementById('modal-backdrop')?.classList.contains('hidden'),
                outText
            };
        })()""")
        print("  Jev Modal Scenario 3 Output:\n   ", modal_res['outText'].replace('\n', '\n    '))
        assert "修剪循環" in modal_res['outText'] or "truncate_and_warn" in modal_res['outText'], "Modal failed to show truncate option"
        print("  ✔ 3. Jev Modal Scenario 3 evaluated and displayed Hallucination Loop decision")
        await cdp.eval_js("document.getElementById('modal-backdrop').classList.add('hidden');")

        # ----------------------------------------------------
        # TEST 4: Real-time Streaming Interception & UI Guard Card
        # ----------------------------------------------------
        print("\n--- TEST 4: Streaming Interception & Hallucination Guard Card ---")
        card_res = await cdp.eval_js("""(async () => {
            const container = document.getElementById('chat-container');
            const dict = { copyBtn: '複製', retryBtn: '重試', reasoningThinking: '推論中...' };

            // Use daemon /v1 mock completions endpoint with native simulate_loop support
            window.webcomApp.profiles[window.webcomApp.activeProfileId].endpoint = 'http://127.0.0.1:8001/v1';

            // Trigger stream with query containing 'simulate_loop'
            await window.webcomApp._streamLlmAnswer("測試 simulate_loop 攔截機制", container, dict, 0);

            // Wait a moment for DOM rendering
            await new Promise(r => setTimeout(r, 200));

            const card = document.getElementById('jev-hallucination-card');
            const textContent = card?.parentElement?.textContent || '';
            const btnLowerTemp = document.getElementById('btn-jev-lower-temp');
            const btnAccept = document.getElementById('btn-jev-accept-truncated');

            return {
                cardRendered: !!card,
                cardText: card?.innerText,
                hasLowerTempBtn: !!btnLowerTemp,
                hasAcceptBtn: !!btnAccept,
                cleanTextIncludesReport: textContent.includes('這是系統分析與診斷報告')
            };
        })()""")
        print("  Guard Card Snapshot:", json.dumps(card_res, indent=2, ensure_ascii=False))
        assert card_res['cardRendered'], "Jev hallucination guard card not rendered upon loop detection"
        assert card_res['hasLowerTempBtn'], "Missing '降溫重新推論' button"
        assert card_res['hasAcceptBtn'], "Missing '保留修剪後內容' button"
        assert card_res['cleanTextIncludesReport'], "Clean output lost prefix before loop"
        print("  ✔ 4. Stream repetition loop cleanly intercepted, truncated, and rendered Guard Card")

        # ----------------------------------------------------
        # TEST 5: Agent Tool-Calling Hallucination Loop Guard
        # ----------------------------------------------------
        print("\n--- TEST 5: Agent Tool-Calling Loop Guard ---")
        tool_loop_res = await cdp.eval_js("""(async () => {
            const app = window.webcomApp;
            // Clear history
            app.toolExecutionHistory = [];

            // Call simulateHermesReasoning 3 times consecutively with same query targeting same tool
            await app.simulateHermesReasoning("查詢今天台北天氣");
            await app.simulateHermesReasoning("查詢今天台北天氣");
            await app.simulateHermesReasoning("查詢今天台北天氣");

            const toolLoopCard = document.getElementById('jev-tool-loop-card');
            const termLogs = document.getElementById('term-logs')?.innerText || '';

            return {
                cardRendered: !!toolLoopCard,
                cardText: toolLoopCard?.innerText,
                termHasLog: termLogs.includes('攔截工具調用死循環') || termLogs.includes('Jev Agent防護')
            };
        })()""")
        print("  Tool Loop Card Snapshot:", json.dumps(tool_loop_res, indent=2, ensure_ascii=False))
        assert tool_loop_res['cardRendered'], "Agent tool-calling loop card not rendered after 3 identical calls"
        assert tool_loop_res['termHasLog'], "Terminal missing Jev Agent loop guard log"
        print("  ✔ 5. Agent tool-calling loop successfully intercepted with Jev advisory card")

        print("\n=======================================================")
        print("  🏆 ALL HALLUCINATION LOOP GUARD TESTS PASSED (100%)  ")
        print("=======================================================\n")

    finally:
        proc.kill()

if __name__ == '__main__':
    asyncio.run(test_hallucination_guard_suite())
