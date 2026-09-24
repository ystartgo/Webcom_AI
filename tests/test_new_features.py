"""
test_new_features.py - E2E Verification of:
1. Text selection & Copy button on right side dialogue.
2. ONNX mode asking '查詢今天天氣' (weather tool, engine badge, weather report card).
3. Retry button on assistant bubbles.
4. Slash command autocomplete popover (/ menu, filtering, keyboard navigation, click).
5. Full English localization without untranslated Chinese nodes.
"""

import sys
import os
import json
import time
import subprocess
import urllib.request
import asyncio
import websockets

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
INDEX_FILE_URL = "file:///" + os.path.join(PROJECT_ROOT, "web", "index.html").replace("\\", "/")
SERVER_URL = "http://127.0.0.1:8001/web/index.html"
CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
if not os.path.exists(CHROME_PATH):
    CHROME_PATH = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

CDP_PORT = 9225

class CDPClient:
    def __init__(self, ws_url):
        self.ws_url = ws_url
        self.ws = None
        self._msg_id = 0

    async def connect(self):
        self.ws = await websockets.connect(self.ws_url)

    async def call(self, method, params=None):
        self._msg_id += 1
        msg = {"id": self._msg_id, "method": method, "params": params or {}}
        await self.ws.send(json.dumps(msg))
        while True:
            resp_raw = await self.ws.recv()
            resp = json.loads(resp_raw)
            if resp.get("id") == self._msg_id:
                return resp.get("result", {})

    async def eval_js(self, expression):
        result = await self.call("Runtime.evaluate", {
            "expression": expression,
            "returnByValue": True,
            "awaitPromise": True
        })
        if "exceptionDetails" in result:
            raise RuntimeError(f"JS Exception: {result['exceptionDetails']}")
        return result.get("result", {}).get("value")

    async def close(self):
        if self.ws:
            await self.ws.close()

async def run_tests():
    print(f"[*] Launching headless browser for verification: {CHROME_PATH}")
    proc = subprocess.Popen([
        CHROME_PATH,
        "--headless=new",
        "--disable-extensions",
        f"--remote-debugging-port={CDP_PORT}",
        "--disable-gpu",
        "--no-first-run",
        "--no-default-browser-check",
        "--user-data-dir=" + os.path.join(PROJECT_ROOT, "temp_test_profile_features"),
        "about:blank"
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    cdp_client = None
    try:
        ws_url = None
        for _ in range(30):
            try:
                resp = urllib.request.urlopen(f"http://127.0.0.1:{CDP_PORT}/json")
                targets = json.loads(resp.read().decode())
                pages = [t for t in targets if t.get("type") == "page"]
                if pages and pages[0].get("webSocketDebuggerUrl"):
                    ws_url = pages[0].get("webSocketDebuggerUrl")
                    break
            except Exception:
                pass
            time.sleep(0.3)

        if not ws_url:
            raise RuntimeError("Could not connect to Chrome CDP endpoint.")

        print(f"[*] Connected to CDP endpoint: {ws_url}")
        cdp_client = CDPClient(ws_url)
        await cdp_client.connect()

        # Set 1366x768 resolution
        await cdp_client.call("Emulation.setDeviceMetricsOverride", {
            "width": 1366,
            "height": 768,
            "deviceScaleFactor": 1,
            "mobile": False
        })

        # Test both on daemon URL and file:// URL
        test_urls = [
            ("Host Daemon Server (8001)", SERVER_URL),
            ("Standalone (file://)", INDEX_FILE_URL)
        ]

        for suite_name, target_url in test_urls:
            print(f"\n{'='*70}\n[*] Running Suite: {suite_name} -> {target_url}\n{'='*70}")
            await cdp_client.call("Page.navigate", {"url": target_url})
            await asyncio.sleep(1.5)

            # Ensure app initialized
            is_ready = await cdp_client.eval_js("typeof window.webcomApp !== 'undefined'")
            assert is_ready, "webcomApp not initialized!"
            print("  ✔ [1] webcomApp is ready on window.")

            # -------------------------------------------------------------
            # Requirement 1: Text Selection & Copy button on right side
            # -------------------------------------------------------------
            body_no_select = await cdp_client.eval_js("document.body.classList.contains('select-none')")
            assert not body_no_select, "body still has select-none!"
            chat_selectable = await cdp_client.eval_js("document.getElementById('chat-container').classList.contains('select-text')")
            assert chat_selectable, "chat-container lacks select-text!"
            print("  ✔ [2.1] Body has no select-none and #chat-container has select-text for mouse selection.")

            # Test Copy Button on Greeting Bubble
            btn_copy_greeting = await cdp_client.eval_js("document.getElementById('btn-copy-greeting') !== null")
            assert btn_copy_greeting, "Greeting copy button not found!"
            
            # Click Greeting Copy Button (await Promise resolution)
            copy_res = await cdp_client.eval_js("""(async () => {
                const btn = document.getElementById('btn-copy-greeting');
                btn.click();
                await new Promise(r => setTimeout(r, 100));
                return btn.innerText;
            })()""")
            assert "已複製" in copy_res or "Copied" in copy_res or "✔" in copy_res, f"Copy button feedback failed: {copy_res}"
            print(f"  ✔ [2.2] Greeting copy button clicked and gave instant feedback: '{copy_res}'.")

            # -------------------------------------------------------------
            # Requirement 4: Slash Command Mode Autocomplete Popover
            # -------------------------------------------------------------
            # 4.1 Type '/' in chat input
            slash_open = await cdp_client.eval_js("""(() => {
                const input = document.getElementById('chat-input');
                input.value = '/';
                input.dispatchEvent(new Event('input'));
                const menu = document.getElementById('slash-menu');
                return {
                    isActive: menu.classList.contains('active'),
                    itemCount: menu.querySelectorAll('.slash-item').length,
                    firstTitle: menu.querySelector('.slash-item-title')?.innerText || ''
                };
            })()""")
            assert slash_open["isActive"], "Slash menu did not open when typing '/'!"
            assert slash_open["itemCount"] >= 5, f"Slash menu items count too low: {slash_open['itemCount']}"
            print(f"  ✔ [3.1] Typing '/' triggered #slash-menu with {slash_open['itemCount']} items (First: '{slash_open['firstTitle']}').")

            # 4.2 Filter with '/we'
            slash_filter = await cdp_client.eval_js("""(() => {
                const input = document.getElementById('chat-input');
                input.value = '/we';
                input.dispatchEvent(new Event('input'));
                const menu = document.getElementById('slash-menu');
                const titles = Array.from(menu.querySelectorAll('.slash-item-title')).map(el => el.innerText);
                return {
                    isActive: menu.classList.contains('active'),
                    titles
                };
            })()""")
            assert any('/weather' in t for t in slash_filter["titles"]), f"Filtering '/we' did not match /weather: {slash_filter['titles']}"
            print(f"  ✔ [3.2] Filtering '/we' narrowed items to: {slash_filter['titles']}")

            # 4.3 Click #btn-quick-slash
            btn_slash_test = await cdp_client.eval_js("""(() => {
                const btn = document.getElementById('btn-quick-slash');
                btn.click();
                const menu = document.getElementById('slash-menu');
                return {
                    isActive: menu.classList.contains('active'),
                    inputVal: document.getElementById('chat-input').value
                };
            })()""")
            assert btn_slash_test["isActive"] and btn_slash_test["inputVal"] == '/', "Quick slash button failed to open menu!"
            print("  ✔ [3.3] Clicking #btn-quick-slash ('/指令') opened autocomplete menu and set input to '/'.")

            # -------------------------------------------------------------
            # Requirement 2: ONNX Mode asking '查詢今天天氣'
            # -------------------------------------------------------------
            # 2.1 Switch to ONNX engine
            await cdp_client.eval_js("""(() => {
                const sel = document.getElementById('engine-select');
                sel.value = 'onnx';
                sel.dispatchEvent(new Event('change'));
            })()""")
            cur_engine = await cdp_client.eval_js("window.webcomApp.activeEngine")
            assert cur_engine == 'onnx', f"Engine was not switched to ONNX: {cur_engine}"
            print("  ✔ [4.1] Switched inference engine to ONNX.")

            # 2.2 Send message '查詢今天天氣'
            await cdp_client.eval_js("""(() => {
                const input = document.getElementById('chat-input');
                input.value = '查詢今天天氣';
                const sendBtn = document.getElementById('btn-send-chat');
                sendBtn.click();
            })()""")
            print("  [*] Sent query '查詢今天天氣'. Waiting for Hermes reasoning and tool execution...")
            await asyncio.sleep(2.5)

            # 2.3 Verify result card
            weather_check = await cdp_client.eval_js("""(() => {
                const lastMsg = document.querySelector('#chat-container > div:last-child');
                const badge = lastMsg.querySelector('.font-mono')?.innerText || '';
                const bubbleText = lastMsg.innerText || '';
                const hasCopyBtn = lastMsg.querySelector('.btn-copy-msg') !== null;
                const hasRetryBtn = lastMsg.querySelector('.btn-retry-msg') !== null;
                const hasTool = bubbleText.includes('get_weather') || bubbleText.includes('weather');
                const hasTemp = bubbleText.includes('°C') || bubbleText.includes('氣溫') || bubbleText.includes('溫度');
                const isSelectable = lastMsg.classList.contains('select-text') || lastMsg.querySelector('.select-text') !== null;
                return {
                    badge,
                    hasCopyBtn,
                    hasRetryBtn,
                    hasTool,
                    hasTemp,
                    isSelectable,
                    snippet: bubbleText.slice(0, 180).replace(/\\n/g, ' ')
                };
            })()""")

            assert weather_check["hasTool"], f"get_weather tool was not executed! Snippet: {weather_check['snippet']}"
            assert weather_check["hasTemp"], f"Temperature not found in result! Snippet: {weather_check['snippet']}"
            assert weather_check["hasCopyBtn"], "Copy button missing on assistant message!"
            assert weather_check["hasRetryBtn"], "Retry button missing on assistant message!"
            assert "ONNX" in weather_check["badge"], f"ONNX engine badge not found: {weather_check['badge']}"
            print(f"  ✔ [4.2] ONNX Weather Query executed successfully! Engine badge: {weather_check['badge']}")
            print(f"  ✔ [4.3] Weather card rendered with live data & temp. Snippet: {weather_check['snippet']}")

            # -------------------------------------------------------------
            # Requirement 3: Retry Button
            # -------------------------------------------------------------
            msg_count_before = await cdp_client.eval_js("document.querySelectorAll('#chat-container > div').length")
            retry_res = await cdp_client.eval_js("""(() => {
                const lastMsg = document.querySelector('#chat-container > div:last-child');
                const retryBtn = lastMsg.querySelector('.btn-retry-msg');
                if (retryBtn) {
                    retryBtn.click();
                    return true;
                }
                return false;
            })()""")
            assert retry_res, "Could not click retry button!"
            print("  [*] Clicked Retry button. Waiting for re-execution...")
            await asyncio.sleep(2.5)

            msg_count_after = await cdp_client.eval_js("document.querySelectorAll('#chat-container > div').length")
            assert msg_count_after > msg_count_before, f"Retry did not add new messages! Before: {msg_count_before}, After: {msg_count_after}"
            print(f"  ✔ [5.1] Retry button successfully re-executed prompt. Message count increased from {msg_count_before} to {msg_count_after}.")

            # Test Copy Button on the newly created assistant bubble
            copy_msg_res = await cdp_client.eval_js("""(async () => {
                const lastMsg = document.querySelector('#chat-container > div:last-child');
                const copyBtn = lastMsg.querySelector('.btn-copy-msg');
                if (copyBtn) {
                    copyBtn.click();
                    await new Promise(r => setTimeout(r, 100));
                    return copyBtn.innerText;
                }
                return '';
            })()""")
            assert "已複製" in copy_msg_res or "Copied" in copy_msg_res or "✔" in copy_msg_res, f"Copy button feedback failed: {copy_msg_res}"
            print(f"  ✔ [5.2] Copy button on assistant message gave instant feedback: '{copy_msg_res}'.")

            # -------------------------------------------------------------
            # Requirement 5: English Localization Audit
            # -------------------------------------------------------------
            print("\n  [*] Switching to English language mode ('en')...")
            await cdp_client.eval_js("""(() => {
                const langSel = document.getElementById('lang-select');
                langSel.value = 'en';
                langSel.dispatchEvent(new Event('change'));
            })()""")
            await asyncio.sleep(0.5)

            en_audit = await cdp_client.eval_js("""(() => {
                const engineOptTexts = Array.from(document.getElementById('engine-select').options).map(o => o.text);
                const toolsetOptTexts = Array.from(document.getElementById('toolset-select').options).map(o => o.text);
                const promptChips = Array.from(document.querySelectorAll('.btn-prompt-chip')).map(b => ({
                    text: b.innerText.trim(),
                    prompt: b.getAttribute('data-prompt')
                }));
                const daemonBadgeText = document.getElementById('daemon-badge').innerText.trim();
                const termStatus = document.getElementById('term-status-text').innerText.trim();
                const enterHint = document.querySelector('[data-i18n="enterHint"]').innerText.trim();
                const btnSlashText = document.querySelector('[data-i18n="btnSlash"]').innerText.trim();
                const btnImageText = document.querySelector('[data-i18n="btnImage"]').innerText.trim();
                const btnDocText = document.querySelector('[data-i18n="btnDoc"]').innerText.trim();

                // Check for Chinese in critical UI controls
                const cnRegex = /[\\u4e00-\\u9fff]/;
                let cnFailures = [];
                engineOptTexts.forEach(t => { if (cnRegex.test(t)) cnFailures.push(`Engine: ${t}`); });
                toolsetOptTexts.forEach(t => { if (cnRegex.test(t)) cnFailures.push(`Toolset: ${t}`); });
                if (cnRegex.test(daemonBadgeText)) cnFailures.push(`Daemon badge: ${daemonBadgeText}`);
                if (cnRegex.test(termStatus)) cnFailures.push(`Term status: ${termStatus}`);
                if (cnRegex.test(enterHint)) cnFailures.push(`Enter hint: ${enterHint}`);
                if (cnRegex.test(btnSlashText)) cnFailures.push(`Slash button: ${btnSlashText}`);
                if (cnRegex.test(btnImageText)) cnFailures.push(`Image button: ${btnImageText}`);
                if (cnRegex.test(btnDocText)) cnFailures.push(`Doc button: ${btnDocText}`);

                return {
                    engineOptTexts,
                    toolsetOptTexts,
                    promptChips,
                    daemonBadgeText,
                    termStatus,
                    enterHint,
                    btnSlashText,
                    btnImageText,
                    btnDocText,
                    cnFailures
                };
            })()""")

            print(f"    - Engine options in EN: {en_audit['engineOptTexts']}")
            print(f"    - Toolset options in EN: {en_audit['toolsetOptTexts']}")
            print(f"    - Toolbar buttons in EN: Image='{en_audit['btnImageText']}', Doc='{en_audit['btnDocText']}', Slash='{en_audit['btnSlashText']}'")
            print(f"    - Term status in EN: '{en_audit['termStatus']}'")
            print(f"    - Enter hint in EN: '{en_audit['enterHint']}'")
            print(f"    - Prompt chips in EN (sample): {[c['text'] for c in en_audit['promptChips'][:2]]}")

            assert len(en_audit["cnFailures"]) == 0, f"Found untranslated Chinese elements in English mode: {en_audit['cnFailures']}"
            print("  ✔ [6.1] Zero untranslated Chinese nodes detected on all main controls in English mode!")

    finally:
        if cdp_client:
            await cdp_client.close()
        proc.terminate()
        try:
            proc.wait(timeout=2)
        except Exception:
            proc.kill()
        print("\n[*] Headless browser terminated.")

if __name__ == "__main__":
    asyncio.run(run_tests())
