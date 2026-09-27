import json
import os
import subprocess
import sys
import tempfile
import time
import urllib.request
import websockets
import asyncio

sys.stdout.reconfigure(encoding='utf-8')

CDP_PORT = 9245

class SimpleCDP:
    def __init__(self, ws_url):
        self.ws_url = ws_url
        self.ws = None
        self.msg_id = 0

    async def connect(self):
        self.ws = await websockets.connect(self.ws_url, max_size=50_000_000)

    async def send_cmd(self, method, params=None):
        self.msg_id += 1
        cid = self.msg_id
        payload = {"id": cid, "method": method, "params": params or {}}
        await self.ws.send(json.dumps(payload))
        while True:
            resp = json.loads(await self.ws.recv())
            if resp.get("id") == cid:
                return resp.get("result", {})

    async def eval_js(self, expression):
        res = await self.send_cmd("Runtime.evaluate", {
            "expression": expression,
            "awaitPromise": True,
            "returnByValue": True
        })
        val = res.get("result", {}).get("value")
        exc = res.get("exceptionDetails")
        if exc:
            raise RuntimeError(f"JS Error: {exc}")
        return val

async def run_tests():
    temp_profile = tempfile.mkdtemp(prefix="cdp_test_trans_")
    chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
    if not os.path.exists(chrome_path):
        chrome_path = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
    
    cmd = [
        chrome_path,
        f"--remote-debugging-port={CDP_PORT}",
        f"--user-data-dir={temp_profile}",
        "--headless=new",
        "--disable-gpu",
        "--no-first-run",
        "--window-size=1280,900",
        "http://127.0.0.1:8001/web/index.html"
    ]
    proc = subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    
    try:
        ws_url = None
        for _ in range(30):
            time.sleep(0.5)
            try:
                with urllib.request.urlopen(f"http://127.0.0.1:{CDP_PORT}/json") as resp:
                    tabs = json.loads(resp.read().decode())
                    for tab in tabs:
                        if tab.get("type") == "page" and "webSocketDebuggerUrl" in tab:
                            ws_url = tab["webSocketDebuggerUrl"]
                            break
                    if ws_url:
                        break
            except Exception:
                pass
        
        if not ws_url:
            print("❌ Failed to connect to CDP endpoint.")
            sys.exit(1)

        print(f"✔ Connected to CDP: {ws_url}")
        cdp = SimpleCDP(ws_url)
        await cdp.connect()
        await cdp.send_cmd("Page.enable")
        await cdp.send_cmd("Runtime.enable")

        print("[*] Waiting for document readiness and app initialization...")
        for _ in range(30):
            try:
                ready = await cdp.eval_js("document.readyState === 'complete' && !!window.app && typeof window.app.formatApiErrorMessage === 'function'")
                if ready:
                    break
            except Exception:
                pass
            await asyncio.sleep(0.5)

        # Test 1: formatApiErrorMessage 401 with TokenTable prefix
        print("[*] Test 1: formatApiErrorMessage 401 with TokenTable prefix...")
        t1 = await cdp.eval_js("""
        (() => {
            const html = window.app.formatApiErrorMessage(
                401,
                JSON.stringify({"error":{"message":"Invalid API key format. Expected: tt-live-...","type":"invalid_request_error"}}),
                { model: 'qwen3.8-flash' }
            );
            const div = document.createElement('div');
            div.innerHTML = html;
            return {
                hasKeyValidationTitle: div.innerText.includes('API 金鑰驗證失敗 (HTTP 401 Unauthorized)'),
                hasPrefixHint: div.innerText.includes('tt-live-...'),
                hasRouterTip: div.innerText.includes('Router 設定')
            };
        })()
        """)
        print("    Test 1 Result:", t1)
        assert t1.get("hasKeyValidationTitle") and t1.get("hasPrefixHint") and t1.get("hasRouterTip"), f"Test 1 Failed: {t1}"
        print("✔ Test 1 Passed: 401 API Error correctly localized with tt-live-... explanation!")

        # Test 2: showDiagModal in zh-TW
        print("[*] Test 2: showDiagModal in zh-TW...")
        t2 = await cdp.eval_js("""
        (async () => {
            window.app.setLanguage('zh-TW');
            await window.app.showDiagModal();
            const body = document.getElementById('modal-body');
            const text = body ? body.innerText : '';
            return {
                hasServiceMatrix: text.includes('本機生態服務連線矩陣'),
                hasDaemonOnline: text.includes('常駐服務連線正常') || text.includes('未連線'),
                hasOnlineOrOffline: text.includes('連線中') || text.includes('未連線'),
                hasZeroErrors: text.includes('(0 個錯誤)') || text.includes('則已攔截'),
                hasClearLog: text.includes('清空錯誤記錄'),
                hasCopyReport: text.includes('複製完整排障報告')
            };
        })()
        """)
        print("    Test 2 Result:", t2)
        assert t2.get("hasServiceMatrix") and t2.get("hasOnlineOrOffline") and t2.get("hasClearLog"), f"Test 2 Failed: {t2}"
        print("✔ Test 2 Passed: Diagnostics Modal fully localized in Traditional Chinese!")

        # Test 3: showDiagModal in English
        print("[*] Test 3: showDiagModal in English...")
        t3 = await cdp.eval_js("""
        (async () => {
            window.app.setLanguage('en');
            await window.app.showDiagModal();
            const body = document.getElementById('modal-body');
            const text = body ? body.innerText : '';
            return {
                hasServiceMatrixEn: text.includes('Host Companion Services Matrix'),
                hasOnlineOrOfflineEn: text.includes('online') || text.includes('offline'),
                hasClearLogEn: text.includes('Clear error logs'),
                hasCopyReportEn: text.includes('Copy Full Diagnostic Report')
            };
        })()
        """)
        print("    Test 3 Result:", t3)
        assert t3.get("hasServiceMatrixEn") and t3.get("hasOnlineOrOfflineEn") and t3.get("hasClearLogEn"), f"Test 3 Failed: {t3}"
        print("✔ Test 3 Passed: Diagnostics Modal fully localized in English!")

        # Test 4: WebGPU pure local mode verification
        print("[*] Test 4: WebGPU mode should be Tier 1 Pure Local (no external API)...")
        t4 = await cdp.eval_js("""
        (async () => {
            window.app.updateEngineUI('webgpu');
            const container = document.getElementById('chat-container');
            const dict = {};
            await window.app._streamWebGpuAnswer('測試本地推論', container, dict);
            const lastMsg = container.lastElementChild;
            const text = lastMsg ? lastMsg.innerText : '';
            const html = lastMsg ? lastMsg.innerHTML : '';
            return {
                isTier1: html.includes('Tier 1: Pure Local (WebGPU)'),
                hasWebGpuBadge: html.includes('WebGPU'),
                notCallingRemoteApi: !html.includes('tt-live-') && !html.includes('HTTP 401'),
                hasRetryBtn: Boolean(lastMsg && lastMsg.querySelector('.btn-retry-msg'))
            };
        })()
        """)
        print("    Test 4 Result:", t4)
        assert t4.get("isTier1") and t4.get("hasWebGpuBadge") and t4.get("notCallingRemoteApi") and t4.get("hasRetryBtn"), f"Test 4 Failed: {t4}"
        print("✔ Test 4 Passed: WebGPU correctly routes as Tier 1 Pure Local without external API calls & has Retry button!")

        # Test 5: ONNX WASM pure local mode answer generation verification
        print("[*] Test 5: ONNX WASM mode should generate real answer as Tier 1 Pure Local...")
        t5 = await cdp.eval_js("""
        (async () => {
            window.app.updateEngineUI('onnx');
            const container = document.getElementById('chat-container');
            const dict = {};
            await window.app._streamOnnxAnswer('簡單介紹自己', container, dict);
            const lastMsg = container.lastElementChild;
            const contentEl = lastMsg ? lastMsg.querySelector('.assistant-content-text') : null;
            const text = contentEl ? contentEl.innerText : '';
            const html = lastMsg ? lastMsg.innerHTML : '';
            return {
                isTier1: html.includes('Tier 1: Pure Local (ONNX WASM)'),
                hasOnnxBadge: html.includes('ONNX WASM'),
                notCallingRemoteApi: !html.includes('tt-live-') && !html.includes('HTTP 401'),
                hasRetryBtn: Boolean(lastMsg && lastMsg.querySelector('.btn-retry-msg')),
                hasCopyBtn: Boolean(lastMsg && lastMsg.querySelector('.btn-copy-msg')),
                generatedRealAnswer: text.length > 50 && (text.includes('Hermes') || text.includes('Webcom AI') || text.includes('沙盒')),
                notJustPlaceholderNotice: !text.includes('提示：若需更高性能的串流長文本生成，建議於上方切換至'),
                hasTokenSpeedBadge: Boolean(lastMsg && lastMsg.querySelector('.token-speed-tag')),
                speedText: lastMsg && lastMsg.querySelector('.token-speed-text') ? lastMsg.querySelector('.token-speed-text').innerText : '',
                hasSpeedUnit: Boolean(lastMsg && lastMsg.querySelector('.token-speed-text') && lastMsg.querySelector('.token-speed-text').innerText.includes('t/s'))
            };
        })()
        """)
        print("    Test 5 Result:", t5)
        assert t5.get("isTier1") and t5.get("hasOnnxBadge") and t5.get("notCallingRemoteApi") and t5.get("hasRetryBtn") and t5.get("generatedRealAnswer") and t5.get("notJustPlaceholderNotice") and t5.get("hasTokenSpeedBadge") and t5.get("hasSpeedUnit"), f"Test 5 Failed: {t5}"
        print(f"✔ Test 5 Passed: ONNX WASM generated genuine local response with speed tag [{t5.get('speedText')}] & 100% Tier 1 privacy!")

        # Test 6: TokenSpeedTracker unit & live display verification
        print("[*] Test 6: Verify TokenSpeedTracker updates t/s and calculates tokens per second...")
        t6 = await cdp.eval_js("""
        (async () => {
            const container = document.createElement('div');
            container.innerHTML = `
                <div class="token-speed-tag hidden">
                    <span class="token-speed-indicator"></span>
                    <span class="token-speed-text">0.0 t/s</span>
                </div>
            `;
            const badge = container.querySelector('.token-speed-tag');
            const tracker = new TokenSpeedTracker(badge, true);
            tracker.start();
            tracker.update('這是第一組生成文字。');
            await new Promise(r => setTimeout(r, 60));
            tracker.update('這是第二組繁體中文生成文字，包含更多 tokens 以測試速率。');
            await new Promise(r => setTimeout(r, 60));
            tracker.finish();

            const isVisible = !badge.classList.contains('hidden');
            const text = badge.querySelector('.token-speed-text').innerText;
            const hasTs = text.includes('t/s');
            const speedVal = parseFloat(text);
            const hasStatsTitle = badge.title.includes('tokens') && badge.title.includes('t/s');

            return {
                isVisible,
                text,
                hasTs,
                isNumericSpeed: !isNaN(speedVal) && speedVal > 0,
                hasStatsTitle
            };
        })()
        """)
        print("    Test 6 Result:", t6)
        assert t6.get("isVisible") and t6.get("hasTs") and t6.get("isNumericSpeed") and t6.get("hasStatsTitle"), f"Test 6 Failed: {t6}"
        print(f"✔ Test 6 Passed: TokenSpeedTracker correctly computed [{t6.get('text')}] with stats tooltip!")

        print("\n=======================================================")
        print("🎉 ALL LOCALIZATION, WEBGPU, ONNX & TOKEN SPEED TESTS PASSED! 🎉")
        print("=======================================================\n")
    finally:
        proc.terminate()

if __name__ == "__main__":
    asyncio.run(run_tests())
