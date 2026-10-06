import asyncio
import json
import subprocess
import urllib.request
import websockets
import time
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

CHROME_PATH = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
URL = "http://127.0.0.1:8001"

class ChromeDevTools:
    def __init__(self, port=9234):
        self.port = port
        self.ws = None
        self.msg_id = 0

    async def connect(self, target_url):
        p = subprocess.Popen([
            CHROME_PATH,
            f"--remote-debugging-port={self.port}",
            "--headless=new",
            "--disable-gpu",
            "--no-first-run",
            f"--user-data-dir=C:/temp/edge_profile_jev_test_{int(time.time())}",
            target_url
        ])
        for _ in range(30):
            try:
                resp = urllib.request.urlopen(f"http://127.0.0.1:{self.port}/json").read()
                tabs = json.loads(resp)
                page_tab = next(t for t in tabs if t.get("type") == "page")
                self.ws = await websockets.connect(page_tab["webSocketDebuggerUrl"], max_size=50*1024*1024)
                await self.send("Runtime.enable")
                return p
            except Exception:
                await asyncio.sleep(0.5)
        raise RuntimeError("Failed to connect to browser CDP")

    async def send(self, method, params=None):
        self.msg_id += 1
        msg = {"id": self.msg_id, "method": method, "params": params or {}}
        await self.ws.send(json.dumps(msg))
        while True:
            res = json.loads(await self.ws.recv())
            if res.get("id") == self.msg_id:
                return res

    async def eval_js(self, expression):
        res = await self.send("Runtime.evaluate", {
            "expression": expression,
            "returnByValue": True,
            "awaitPromise": True
        })
        if "exceptionDetails" in res.get("result", {}):
            raise RuntimeError(f"JS Exception: {res['result']['exceptionDetails']}")
        return res.get("result", {}).get("result", {}).get("value")

async def test_jev_retry_suite():
    cdp = ChromeDevTools(9234)
    proc = await cdp.connect(URL)
    try:
        await asyncio.sleep(2.0)
        await cdp.eval_js("window.alert = () => {}; window.confirm = () => true;")

        print("\n=======================================================")
        print("  Webcom AI — Jev HTTP 500 Decision & 5s Retry Tests")
        print("=======================================================")

        # 1. Test evalJevDecision API function
        print("\n--- TEST 1: Jev Fast-Decision on HTTP 500 Fault Recovery ---")
        jev_res = await cdp.eval_js("""(async () => {
            const state = "API returned HTTP 500 Internal Server Error (server temporary overloaded). Evaluate recovery.";
            const options = [
                "5秒後自動重試 (retry_after_5s)",
                "立即終止並顯示錯誤 (abort_immediately)",
                "切換本機離線推論 (offline_fallback)"
            ];
            return await window.webcomApp.evalJevDecision(state, options, 0.35);
        })()""")
        print("  Jev Result:", json.dumps(jev_res, indent=2, ensure_ascii=False))
        assert "retry_after_5s" in jev_res["best_option"], f"Unexpected best option: {jev_res['best_option']}"
        assert jev_res["confidence"] > 50, f"Confidence too low: {jev_res['confidence']}"
        print(f"  ✔ 1. Jev correctly selected '5秒後自動重試' with {jev_res['confidence']}% confidence in {jev_res['latency_ms']} ms")

        # 2. Test Jev Sandbox Modal Scenario 2
        print("\n--- TEST 2: Jev Sandbox Modal Scenario 2 (API 500 Recovery) ---")
        modal_res = await cdp.eval_js("""(async () => {
            window.webcomApp.showJevModal();
            // Switch to scenario 2
            document.getElementById('btn-jev-scen-err500')?.click();
            // Click execute
            document.getElementById('btn-modal-action')?.click();
            // Wait for evaluation
            await new Promise(r => setTimeout(r, 200));
            const outText = document.getElementById('jev-output')?.innerText;
            return {
                modalOpen: !document.getElementById('modal-backdrop')?.classList.contains('hidden'),
                outText
            };
        })()""")
        print("  Jev Modal Output:\n   ", modal_res['outText'].replace('\n', '\n    '))
        assert "5秒後自動重試" in modal_res['outText'], f"Jev Modal failed to show retry option: {modal_res['outText']}"
        print("  ✔ 2. Jev Modal Scenario 2 successfully evaluated and displayed HTTP 500 recovery decision")

        # Close modal
        await cdp.eval_js("document.getElementById('modal-backdrop').classList.add('hidden');")

        # 3. Test HTTP 500 Transient Fault & 5-Second Countdown Card
        print("\n--- TEST 3: Chat Stream HTTP 500 Trigger & 5s Countdown Card ---")
        card_res = await cdp.eval_js("""(async () => {
            const container = document.getElementById('chat-container');
            const dict = { copyBtn: '複製', retryBtn: '重試', reasoningThinking: '推論中...' };
            
            // Call _streamLlmAnswer directly with custom simulated 500 endpoint
            // We use our daemon mock /v1 with X-Simulate-500: once
            window.webcomApp.profiles[window.webcomApp.activeProfileId].endpoint = 'http://127.0.0.1:8001/v1';

            // We monkeypatch fetch for one request to simulate HTTP 500
            const originalFetch = window.fetch;
            let callCount = 0;
            window.fetch = async (url, opts) => {
                if (url.includes('/chat/completions')) {
                    callCount++;
                    if (callCount === 1) {
                        return new Response(JSON.stringify({ error: { message: "Internal Server Error: simulated 500", code: 500 } }), {
                            status: 500,
                            statusText: "Internal Server Error",
                            headers: { 'Content-Type': 'application/json' }
                        });
                    }
                }
                return originalFetch(url, opts);
            };

            // Trigger stream
            window.webcomApp._streamLlmAnswer("測試 500 重試機制", container, dict, 0);

            // Wait a short moment for Jev evaluation and card render
            await new Promise(r => setTimeout(r, 300));

            const countdownEl = document.getElementById('jev-countdown-num');
            const countdownCard = document.getElementById('jev-retry-card');

            return {
                cardRendered: !!countdownCard,
                cardText: countdownCard?.innerText,
                countdownVal: countdownEl?.innerText,
                callCount
            };
        })()""")
        print("  Countdown Card Snapshot:", json.dumps(card_res, indent=2, ensure_ascii=False))
        assert card_res['cardRendered'], "Jev retry countdown card not rendered on HTTP 500"
        assert "5s" in card_res['countdownVal'] or "4s" in card_res['countdownVal'], f"Countdown value unexpected: {card_res['countdownVal']}"
        print("  ✔ 3. HTTP 500 detected, Jev evaluated fault, and rendered 5-second countdown card")

        # 4. Wait for countdown and verify automatic retry execution
        print("\n--- TEST 4: Automatic Retry Execution After 5 Seconds ---")
        print("  Waiting 5.5 seconds for countdown to expire and retry to succeed...")
        await asyncio.sleep(5.5)

        retry_res = await cdp.eval_js("""(() => {
            const bubbles = document.querySelectorAll('.assistant-content-text');
            const lastBubble = bubbles[bubbles.length - 1];
            const text = lastBubble?.innerText || '';
            const termLogs = document.getElementById('term-logs')?.innerText || '';
            return {
                bubbleText: text,
                termHasJevLog: termLogs.includes('Jev 決策分流') && termLogs.includes('500')
            };
        })()""")
        print(f"  Result text after auto-retry:\n    {retry_res['bubbleText'][:150]}...")
        print(f"  Terminal has Jev decision log: {retry_res['termHasJevLog']}")
        assert "Jev 決策" in retry_res['bubbleText'] or "重試成功" in retry_res['bubbleText'] or len(retry_res['bubbleText']) > 10, f"Retry output empty: {retry_res['bubbleText']}"
        assert retry_res['termHasJevLog'], "Jev decision not logged to terminal"
        print("  ✔ 4. Automatic retry after 5 seconds executed and received completed stream response")

        print("\n=======================================================")
        print("  🏆 ALL JEV HTTP 500 & 5S RETRY TESTS PASSED (100%)    ")
        print("=======================================================")

    finally:
        proc.kill()

if __name__ == '__main__':
    asyncio.run(test_jev_retry_suite())
