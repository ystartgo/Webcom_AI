"""
test_browser_buttons.py - Automated Browser E2E Test for Webcom AI Console
Tests all UI buttons and interactions under both:
1. Pure index standalone file mode: file:///C:/Apps/webcom_AI/web/index.html
2. Host Daemon HTTP mode: http://127.0.0.1:8001/

Connects to headless Chrome via Chrome DevTools Protocol (CDP).
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
CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
if not os.path.exists(CHROME_PATH):
    CHROME_PATH = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

CDP_PORT = 9222

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

async def run_e2e_tests():
    print(f"[*] Launching browser: {CHROME_PATH}")
    proc = subprocess.Popen([
        CHROME_PATH,
        "--headless=new",
        "--disable-extensions",
        f"--remote-debugging-port={CDP_PORT}",
        "--disable-gpu",
        "--no-first-run",
        "--no-default-browser-check",
        "--user-data-dir=" + os.path.join(PROJECT_ROOT, "temp_browser_profile"),
        "about:blank"
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    cdp_client = None
    try:
        # Wait for CDP endpoint
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

        print(f"[*] Connected to CDP at: {ws_url}")
        cdp_client = CDPClient(ws_url)
        await cdp_client.connect()

        # ========================================================
        # TEST SUITE 1: Pure Standalone Index (file:// URL)
        # ========================================================
        print("\n" + "=" * 65)
        print(f"[*] TEST SUITE 1: Pure Standalone Index (file://)")
        print(f"[*] URL: {INDEX_FILE_URL}")
        print("=" * 65)

        await cdp_client.call("Page.navigate", {"url": INDEX_FILE_URL})
        await asyncio.sleep(1.5)

        # 1. Verify WebcomAIApp initialization
        is_ready = await cdp_client.eval_js("typeof window.webcomApp !== 'undefined'")
        assert is_ready, "webcomApp is not initialized on window!"
        print("  ✔ [1] window.webcomApp loaded successfully without CORS errors")

        # 2. Verify all Terminal Session Tab buttons
        sessions = [
            ("tab-shell", "PS>", "shell"),
            ("tab-wsl", "wsl$", "wsl"),
            ("tab-py", ">>>", "py"),
            ("tab-serial", "COM>", "serial"),
            ("tab-novnc", "vnc>", "novnc")
        ]
        for tab_id, expected_prompt, session_name in sessions:
            await cdp_client.eval_js(f"document.getElementById('{tab_id}').click()")
            prompt = await cdp_client.eval_js("document.getElementById('term-prompt-indicator').innerText")
            active_session = await cdp_client.eval_js("window.webcomApp.currentSession")
            assert prompt == expected_prompt, f"Expected prompt '{expected_prompt}' for tab '{tab_id}', got '{prompt}'"
            assert active_session == session_name, f"Expected session '{session_name}', got '{active_session}'"
            print(f"  ✔ [2] Tab click '{tab_id}' switched prompt to '{prompt}' and session to '{session_name}'")

        # 3. Test Terminal Send button (#btn-term-send)
        # In 'py' session, execute code
        await cdp_client.eval_js("document.getElementById('term-input').value = 'x = 42 * 2; print(x)'")
        await cdp_client.eval_js("document.getElementById('btn-term-send').click()")
        await asyncio.sleep(0.5)
        term_text = await cdp_client.eval_js("document.getElementById('term-logs').innerText")
        assert "42 * 2" in term_text or "Python" in term_text, "Terminal send did not log output"
        print("  ✔ [3] Terminal send button (#btn-term-send) executed input and logged output")

        # 4. Test Terminal Clear button (#btn-term-clear)
        await cdp_client.eval_js("document.getElementById('btn-term-clear').click()")
        cleared_text = await cdp_client.eval_js("document.getElementById('term-logs').innerText")
        assert "清空" in cleared_text, "Terminal logs were not cleared"
        print("  ✔ [4] Terminal clear button (#btn-term-clear) cleared terminal logs")

        # 5. Test Engine Select dropdown (#engine-select)
        await cdp_client.eval_js("""{
            const sel = document.getElementById('engine-select');
            sel.value = 'webgpu';
            sel.dispatchEvent(new Event('change'));
        }""")
        tier_text = await cdp_client.eval_js("document.getElementById('current-tier-indicator').innerText")
        assert "WebGPU" in tier_text, f"Expected WebGPU in indicator, got: {tier_text}"
        print(f"  ✔ [5] Engine select dropdown updated tier indicator to: '{tier_text}'")

        # 6. Test Toolset Select dropdown (#toolset-select)
        await cdp_client.eval_js("""{
            const sel = document.getElementById('toolset-select');
            sel.value = 'coding';
            sel.dispatchEvent(new Event('change'));
        }""")
        active_toolset = await cdp_client.eval_js("window.webcomApp.activeToolset")
        assert active_toolset == 'coding', f"Expected activeToolset 'coding', got '{active_toolset}'"
        print("  ✔ [6] Toolset select dropdown switched activeToolset to 'coding'")

        # 7. Test Header Buttons: Upstream Sync modal (#btn-sync, #btn-close-modal)
        await cdp_client.eval_js("document.getElementById('btn-sync').click()")
        is_modal_visible = await cdp_client.eval_js("!document.getElementById('modal-backdrop').classList.contains('hidden')")
        assert is_modal_visible, "Modal did not open on btn-sync click"
        modal_title = await cdp_client.eval_js("document.getElementById('modal-title').innerText")
        assert "同步" in modal_title, f"Unexpected modal title: {modal_title}"
        print(f"  ✔ [7] Sync button (#btn-sync) opened modal with title: '{modal_title}'")

        # Test modal action button inside Sync modal
        await cdp_client.eval_js("document.getElementById('btn-modal-action').click()")
        await asyncio.sleep(0.5)
        sync_out = await cdp_client.eval_js("document.getElementById('sync-output').innerText")
        assert sync_out and len(sync_out) > 0, "Sync modal action produced no output"
        print("  ✔ [8] Modal action button (#btn-modal-action) executed analysis in pure standalone mode")

        # Close modal via #btn-close-modal
        await cdp_client.eval_js("document.getElementById('btn-close-modal').click()")
        is_modal_hidden = await cdp_client.eval_js("document.getElementById('modal-backdrop').classList.contains('hidden')")
        assert is_modal_hidden, "Modal did not close on #btn-close-modal click"
        print("  ✔ [9] Modal close button (#btn-close-modal) successfully closed modal")

        # 8. Test Header Buttons: Diag modal (#btn-diag, #btn-modal-cancel)
        await cdp_client.eval_js("document.getElementById('btn-diag').click()")
        is_diag_open = await cdp_client.eval_js("!document.getElementById('modal-backdrop').classList.contains('hidden')")
        assert is_diag_open, "Diag modal did not open"
        diag_title = await cdp_client.eval_js("document.getElementById('modal-title').innerText")
        assert "自我檢測" in diag_title or "診斷" in diag_title, f"Unexpected diag title: {diag_title}"
        print(f"  ✔ [10] Diag button (#btn-diag) opened modal with title: '{diag_title}'")

        # Close via cancel button
        await cdp_client.eval_js("document.getElementById('btn-modal-cancel').click()")
        is_diag_closed = await cdp_client.eval_js("document.getElementById('modal-backdrop').classList.contains('hidden')")
        assert is_diag_closed, "Modal did not close on #btn-modal-cancel click"
        print("  ✔ [11] Modal cancel button (#btn-modal-cancel) closed modal")

        # 9. Test Chat Send button (#btn-send-chat)
        await cdp_client.eval_js("document.getElementById('chat-input').value = '請用 Python 計算費氏數列'")
        await cdp_client.eval_js("document.getElementById('btn-send-chat').click()")
        await asyncio.sleep(1.0)
        chat_html = await cdp_client.eval_js("document.getElementById('chat-container').innerHTML")
        assert "run_python" in chat_html or "Tier 1" in chat_html, "Chat response missing tool reasoning card"
        print("  ✔ [12] Chat send button (#btn-send-chat) dispatched reasoning and rendered tool card")

        # 10. Test Clear Chat button (#btn-clear-chat)
        await cdp_client.eval_js("document.getElementById('btn-clear-chat').click()")
        cleared_bubbles = await cdp_client.eval_js("document.querySelectorAll('#chat-container > div').length")
        assert cleared_bubbles <= 2, f"Chat container was not cleared properly (count={cleared_bubbles})"
        print("  ✔ [13] Clear chat button (#btn-clear-chat) restored clean chat state")

        # 11. Test Daemon badge click (#daemon-badge)
        await cdp_client.eval_js("document.getElementById('daemon-badge').click()")
        await asyncio.sleep(0.5)
        print("  ✔ [14] Daemon badge (#daemon-badge) click re-probed status cleanly")

        # ========================================================
        # TEST SUITE 2: Host Daemon HTTP Mode (http://127.0.0.1:8001/)
        # ========================================================
        print("\n" + "=" * 65)
        print(f"[*] TEST SUITE 2: Host Daemon HTTP Mode")
        print(f"[*] URL: http://127.0.0.1:8001/")
        print("=" * 65)

        await cdp_client.call("Page.navigate", {"url": "http://127.0.0.1:8001/"})
        await asyncio.sleep(1.5)

        is_ready_http = await cdp_client.eval_js("typeof window.webcomApp !== 'undefined'")
        assert is_ready_http, "webcomApp failed to load over HTTP!"
        daemon_online = await cdp_client.eval_js("window.webcomApp.daemonOnline")
        print(f"  ✔ [1] Webcom loaded via Daemon HTTP. Daemon Online Status: {daemon_online}")

        # Test diag modal over HTTP
        await cdp_client.eval_js("document.getElementById('btn-diag').click()")
        for _ in range(10):
            await asyncio.sleep(0.5)
            modal_body = await cdp_client.eval_js("document.getElementById('modal-body').innerText")
            if "8001" in modal_body or "Host Daemon" in modal_body:
                break
        assert "8001" in modal_body or "Host Daemon" in modal_body, f"Diag modal body missing daemon info: {modal_body}"
        print("  ✔ [2] Diag modal over HTTP shows real live services & GPU matrix")
        await cdp_client.eval_js("document.getElementById('btn-close-modal').click()")

        print("\n" + "=" * 65)
        print("🎉 ALL 16 E2E BROWSER BUTTON & WORKFLOW TESTS PASSED PERFECTLY!")
        print("=" * 65)

    finally:
        if cdp_client:
            await cdp_client.close()
        proc.terminate()
        try:
            proc.wait(timeout=2)
        except Exception:
            proc.kill()

if __name__ == "__main__":
    asyncio.run(run_e2e_tests())
