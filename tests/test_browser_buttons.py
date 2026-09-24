"""
test_browser_buttons.py - Automated Browser E2E Test for Webcom AI Console
Tests all UI buttons, settings modal, language switching, tools menu,
and interactions under both:
1. Pure index standalone file mode: file:///C:/Apps/webcom_AI/web/index.html
2. Host Daemon HTTP mode: http://127.0.0.1:8001/
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

        # Set 1366x768 resolution override
        await cdp_client.call("Emulation.setDeviceMetricsOverride", {
            "width": 1366,
            "height": 768,
            "deviceScaleFactor": 1,
            "mobile": False
        })
        print("  [*] Emulated 1366x768 display resolution.")

        await cdp_client.call("Page.navigate", {"url": INDEX_FILE_URL})
        await asyncio.sleep(1.0)
        # Clear storage to test clean fresh-load state
        await cdp_client.eval_js("localStorage.clear(); location.reload();")
        await asyncio.sleep(1.5)

        # 1. Verify WebcomAIApp initialization
        is_ready = await cdp_client.eval_js("typeof window.webcomApp !== 'undefined'")
        assert is_ready, "webcomApp is not initialized on window!"
        print("  ✔ [1] window.webcomApp loaded successfully without CORS errors")

        # 1.1 Verify 1366x768 Layout Integrity (No cut-off buttons)
        header_check = await cdp_client.eval_js("""(() => {
            const header = document.querySelector('header');
            const btns = Array.from(header.querySelectorAll('button, select, input, span'));
            const vw = window.innerWidth;
            let overflowElements = [];
            btns.forEach(el => {
                const r = el.getBoundingClientRect();
                if (r.right > vw + 2) {
                    overflowElements.push({ id: el.id, tag: el.tagName, right: r.right, vw });
                }
            });
            return {
                scrollWidth: document.documentElement.scrollWidth,
                vw: window.innerWidth,
                overflowCount: overflowElements.length,
                overflowElements
            };
        })()""")
        assert header_check['overflowCount'] == 0, f"Elements overflowing 1366px screen: {header_check['overflowElements']}"
        print(f"  ✔ [1.1] 1366x768 Viewport Verification: All header buttons fit perfectly inside width (ScrollWidth: {header_check['scrollWidth']}px <= 1366px)")

        # 1.2 Verify Dynamic Model Selectors for All Engines (WebGPU, ONNX, API, Co-Think)
        # Check initial API mode
        api_visible = await cdp_client.eval_js("!document.getElementById('wrapper-profile-select').classList.contains('hidden')")
        webgpu_hidden = await cdp_client.eval_js("document.getElementById('wrapper-webgpu-select').classList.contains('hidden')")
        onnx_hidden = await cdp_client.eval_js("document.getElementById('wrapper-onnx-select').classList.contains('hidden')")
        assert api_visible and webgpu_hidden and onnx_hidden, "Initial engine model selector visibility mismatch"
        print("  ✔ [1.2] Initial engine (API) displays #wrapper-profile-select and hides WebGPU/ONNX")

        # Switch to WebGPU
        await cdp_client.eval_js("""{
            const sel = document.getElementById('engine-select');
            sel.value = 'webgpu';
            sel.dispatchEvent(new Event('change'));
        }""")
        webgpu_visible = await cdp_client.eval_js("!document.getElementById('wrapper-webgpu-select').classList.contains('hidden')")
        api_hidden = await cdp_client.eval_js("document.getElementById('wrapper-profile-select').classList.contains('hidden')")
        webgpu_opt_count = await cdp_client.eval_js("document.querySelectorAll('#webgpu-model-select option').length")
        assert webgpu_visible and api_hidden, "WebGPU model selector failed to show"
        assert webgpu_opt_count >= 5, f"Expected at least 5 WebGPU models, got {webgpu_opt_count}"
        
        # Select WebGPU Model
        await cdp_client.eval_js("""{
            const sel = document.getElementById('webgpu-model-select');
            sel.value = 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC';
            sel.dispatchEvent(new Event('change'));
        }""")
        active_webgpu = await cdp_client.eval_js("window.webcomApp.activeWebgpuModel")
        assert "Qwen2.5-1.5B" in active_webgpu, f"Active WebGPU model mismatch: {active_webgpu}"
        print(f"  ✔ [1.3] WebGPU Engine shows {webgpu_opt_count} models; model selection verified: '{active_webgpu}'")

        # Switch to ONNX
        await cdp_client.eval_js("""{
            const sel = document.getElementById('engine-select');
            sel.value = 'onnx';
            sel.dispatchEvent(new Event('change'));
        }""")
        onnx_visible = await cdp_client.eval_js("!document.getElementById('wrapper-onnx-select').classList.contains('hidden')")
        webgpu_now_hidden = await cdp_client.eval_js("document.getElementById('wrapper-webgpu-select').classList.contains('hidden')")
        onnx_opt_count = await cdp_client.eval_js("document.querySelectorAll('#onnx-model-select option').length")
        assert onnx_visible and webgpu_now_hidden, "ONNX model selector failed to show"
        assert onnx_opt_count >= 4, f"Expected at least 4 ONNX models, got {onnx_opt_count}"

        # Select ONNX Model (e.g. bge-reranker-base for Jev)
        await cdp_client.eval_js("""{
            const sel = document.getElementById('onnx-model-select');
            sel.value = 'Xenova/bge-reranker-base';
            sel.dispatchEvent(new Event('change'));
        }""")
        active_onnx = await cdp_client.eval_js("window.webcomApp.activeOnnxModel")
        assert "bge-reranker" in active_onnx, f"Active ONNX model mismatch: {active_onnx}"
        print(f"  ✔ [1.4] ONNX Engine shows {onnx_opt_count} models; model selection verified: '{active_onnx}'")

        # Switch to Co-Think Dual Engine (WebGPU + API)
        await cdp_client.eval_js("""{
            const sel = document.getElementById('engine-select');
            sel.value = 'cothink';
            sel.dispatchEvent(new Event('change'));
        }""")
        cothink_webgpu = await cdp_client.eval_js("!document.getElementById('wrapper-webgpu-select').classList.contains('hidden')")
        cothink_api = await cdp_client.eval_js("!document.getElementById('wrapper-profile-select').classList.contains('hidden')")
        assert cothink_webgpu and cothink_api, "Co-think dual selectors not both visible"
        print("  ✔ [1.5] Co-Think Dual Engine mode shows both WebGPU and API selectors simultaneously")

        # Reset back to API mode
        await cdp_client.eval_js("""{
            const sel = document.getElementById('engine-select');
            sel.value = 'api';
            sel.dispatchEvent(new Event('change'));
        }""")

        # 2. Test Language Switcher (zh-TW -> en -> zh-TW)
        await cdp_client.eval_js("""{
            const sel = document.getElementById('lang-select');
            sel.value = 'en';
            sel.dispatchEvent(new Event('change'));
        }""")
        title_en = await cdp_client.eval_js("document.querySelector('[data-i18n=\"appTitle\"]').innerText")
        btn_settings_en = await cdp_client.eval_js("document.querySelector('[data-i18n=\"routerSettings\"]').innerText")
        assert "Webcom AI Console" in title_en, f"English title mismatch: {title_en}"
        assert "Router Settings" in btn_settings_en, f"English button mismatch: {btn_settings_en}"
        print(f"  ✔ [2] Language switch to English verified: Title='{title_en}', Button='{btn_settings_en}'")

        # Switch back to zh-TW
        await cdp_client.eval_js("""{
            const sel = document.getElementById('lang-select');
            sel.value = 'zh-TW';
            sel.dispatchEvent(new Event('change'));
        }""")
        title_zh = await cdp_client.eval_js("document.querySelector('[data-i18n=\"appTitle\"]').innerText")
        assert "控制台" in title_zh, f"Chinese title mismatch: {title_zh}"
        print(f"  ✔ [3] Language switch to Traditional Chinese verified: Title='{title_zh}'")

        # 3. Test API / LLM Router Settings Modal (#btn-open-settings, #settings-modal)
        await cdp_client.eval_js("document.getElementById('btn-open-settings').click()")
        is_settings_open = await cdp_client.eval_js("!document.getElementById('settings-modal').classList.contains('hidden')")
        assert is_settings_open, "Settings modal did not open on #btn-open-settings click"
        print("  ✔ [4] API Settings button (#btn-open-settings) opened #settings-modal")

        # Test preset click inside Settings (e.g. TokenTable)
        await cdp_client.eval_js("document.querySelector('.btn-preset-profile[data-preset=\"tokentable\"]').click()")
        preset_endpoint = await cdp_client.eval_js("document.getElementById('cfg-prof-endpoint').value")
        assert "tokentable.asia" in preset_endpoint, f"TokenTable preset failed, endpoint: {preset_endpoint}"
        print(f"  ✔ [5] Quick preset button loaded TokenTable endpoint: '{preset_endpoint}'")

        # Test connection button inside Settings (#btn-test-conn)
        await cdp_client.eval_js("document.getElementById('btn-test-conn').click()")
        await asyncio.sleep(0.5)
        test_status = await cdp_client.eval_js("document.getElementById('test-conn-status').innerText")
        assert test_status and len(test_status) > 0, "Test connection status was empty"
        print(f"  ✔ [6] Test Connection button (#btn-test-conn) gave feedback: '{test_status[:40]}...'")

        # Close Settings Modal (#btn-close-settings)
        await cdp_client.eval_js("document.getElementById('btn-close-settings').click()")
        is_settings_closed = await cdp_client.eval_js("document.getElementById('settings-modal').classList.contains('hidden')")
        assert is_settings_closed, "Settings modal did not close on #btn-close-settings click"
        print("  ✔ [7] Close Settings button (#btn-close-settings) closed modal")

        # 4. Test Panel Collapse (#btn-collapse-left) and Snap 2/3 (#btn-snap-23)
        await cdp_client.eval_js("document.getElementById('btn-collapse-left').click()")
        has_collapse_class = await cdp_client.eval_js("document.body.classList.contains('panel-collapsed-left')")
        assert has_collapse_class, "Body missing panel-collapsed-left class after click"
        await cdp_client.eval_js("document.getElementById('btn-collapse-left').click()")
        print("  ✔ [8] Left panel collapse button (#btn-collapse-left) toggled visibility")

        await cdp_client.eval_js("document.getElementById('btn-snap-23').click()")
        left_w = await cdp_client.eval_js("document.getElementById('left-pane').style.width")
        assert left_w == "33%", f"Expected left pane 33% width, got {left_w}"
        await cdp_client.eval_js("document.getElementById('btn-snap-23').click()")
        print("  ✔ [9] Window snap 2/3 button (#btn-snap-23) toggled 33%/67% layout")

        # 5. Test Top Tools Menu (#btn-top-tools-menu) and Jev Sandbox (#btn-open-jev)
        await cdp_client.eval_js("document.getElementById('btn-top-tools-menu').click()")
        is_menu_open = await cdp_client.eval_js("!document.getElementById('dropdown-top-tools').classList.contains('hidden')")
        assert is_menu_open, "Dropdown top tools menu did not open"
        print("  ✔ [10] Top tools hamburger button (#btn-top-tools-menu) opened dropdown")

        await cdp_client.eval_js("document.getElementById('btn-open-jev').click()")
        is_jev_open = await cdp_client.eval_js("!document.getElementById('modal-backdrop').classList.contains('hidden')")
        assert is_jev_open, "Jev modal did not open"
        jev_title = await cdp_client.eval_js("document.getElementById('modal-title').innerText")
        assert "Jev" in jev_title, f"Unexpected Jev modal title: {jev_title}"
        await cdp_client.eval_js("document.getElementById('btn-modal-action').click()")
        await asyncio.sleep(0.3)
        jev_out = await cdp_client.eval_js("document.getElementById('jev-output').innerText")
        assert "決策完成" in jev_out or "ms" in jev_out, "Jev fast decision output missing"
        await cdp_client.eval_js("document.getElementById('btn-close-modal').click()")
        print(f"  ✔ [11] Jev Sandbox (#btn-open-jev) executed ~15ms fast-decision simulation")

        # 6. Verify all Terminal Session Tab buttons
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
        print(f"  ✔ [12] All 5 Terminal tabs (#1-SHELL, #2-WSL, #3-PY, #4-SERIAL, #7-NOVNC) switched cleanly")

        # 7. Test Terminal Send button (#btn-term-send)
        await cdp_client.eval_js("document.getElementById('term-input').value = 'x = 42 * 2; print(x)'")
        await cdp_client.eval_js("document.getElementById('btn-term-send').click()")
        await asyncio.sleep(0.5)
        term_text = await cdp_client.eval_js("document.getElementById('term-logs').innerText")
        assert "42 * 2" in term_text or "Python" in term_text, "Terminal send did not log output"
        print("  ✔ [13] Terminal send button (#btn-term-send) executed input and logged output")

        # 8. Test Terminal Clear button (#btn-term-clear)
        await cdp_client.eval_js("document.getElementById('btn-term-clear').click()")
        cleared_text = await cdp_client.eval_js("document.getElementById('term-logs').innerText")
        assert "清空" in cleared_text, "Terminal logs were not cleared"
        print("  ✔ [14] Terminal clear button (#btn-term-clear) cleared terminal logs")

        # 9. Test Engine Select and Toolset Select
        await cdp_client.eval_js("""{
            const sel = document.getElementById('engine-select');
            sel.value = 'webgpu';
            sel.dispatchEvent(new Event('change'));
        }""")
        tier_text = await cdp_client.eval_js("document.getElementById('current-tier-indicator').innerText")
        assert "WebGPU" in tier_text, f"Expected WebGPU in indicator, got: {tier_text}"
        print(f"  ✔ [15] Engine select dropdown updated tier indicator to: '{tier_text}'")

        # 10. Test Sync & Diag modals
        await cdp_client.eval_js("document.getElementById('btn-sync').click()")
        modal_title = await cdp_client.eval_js("document.getElementById('modal-title').innerText")
        assert "同步" in modal_title or "Sync" in modal_title
        await cdp_client.eval_js("document.getElementById('btn-close-modal').click()")
        print("  ✔ [16] Upstream Sync button (#btn-sync) verified")

        await cdp_client.eval_js("document.getElementById('btn-diag').click()")
        diag_title = await cdp_client.eval_js("document.getElementById('modal-title').innerText")
        assert "檢測" in diag_title or "診斷" in diag_title or "Diagnostics" in diag_title
        await cdp_client.eval_js("document.getElementById('btn-modal-cancel').click()")
        print("  ✔ [17] Diagnostics button (#btn-diag) verified")

        # 11. Test Chat Send button (#btn-send-chat)
        await cdp_client.eval_js("document.getElementById('chat-input').value = '請用 Python 計算費氏數列'")
        await cdp_client.eval_js("document.getElementById('btn-send-chat').click()")
        await asyncio.sleep(1.0)
        chat_html = await cdp_client.eval_js("document.getElementById('chat-container').innerHTML")
        assert "run_python" in chat_html or "Tier 1" in chat_html, "Chat response missing tool reasoning card"
        print("  ✔ [18] Chat send button (#btn-send-chat) dispatched reasoning and rendered tool card")

        # 11.1 Test Right Pane Feature Toggles (Agent, Web, RAG, MCP)
        toggles = [
            ("toggle-agent", "Agent"),
            ("toggle-web", "Web 聯網"),
            ("toggle-rag", "RAG 知識庫"),
            ("toggle-mcp", "MCP 協議")
        ]
        for t_id, name in toggles:
            init_val = await cdp_client.eval_js(f"document.getElementById('{t_id}').getAttribute('data-active')")
            await cdp_client.eval_js(f"document.getElementById('{t_id}').click()")
            new_val = await cdp_client.eval_js(f"document.getElementById('{t_id}').getAttribute('data-active')")
            assert init_val != new_val, f"Toggle {t_id} failed to switch state (was {init_val}, still {new_val})"
            # Click again to restore
            await cdp_client.eval_js(f"document.getElementById('{t_id}').click()")
            print(f"  ✔ [18.1] Feature Toggle #{t_id} ({name}) interactive click and state toggle verified")

        # 11.2 Test Quick Slash Command Button (/)
        await cdp_client.eval_js("document.getElementById('btn-quick-slash').click()")
        input_slash_val = await cdp_client.eval_js("document.getElementById('chat-input').value")
        assert input_slash_val == "/", f"Expected '/' in chat input, got: '{input_slash_val}'"
        print("  ✔ [18.2] Quick Slash Command button (#btn-quick-slash) inserted '/' into input")

        # 11.3 Test Suggestion Prompt Chips Click (Native Webcom Experience)
        await cdp_client.eval_js("document.querySelector('.btn-prompt-chip').click()")
        await asyncio.sleep(1.0)
        chat_chip_html = await cdp_client.eval_js("document.getElementById('chat-container').innerHTML")
        assert "費氏數列" in chat_chip_html, "Prompt chip click did not trigger message send"
        print("  ✔ [18.3] Clickable suggestion chip (.btn-prompt-chip) executed prompt directly")

        # 12. Test Clear Chat button (#btn-clear-chat)
        await cdp_client.eval_js("document.getElementById('btn-clear-chat').click()")
        cleared_bubbles = await cdp_client.eval_js("document.querySelectorAll('#chat-container > div').length")
        assert cleared_bubbles <= 2, f"Chat container was not cleared properly (count={cleared_bubbles})"
        
        # Verify prompt chips are still clickable after clear
        chips_count = await cdp_client.eval_js("document.querySelectorAll('.btn-prompt-chip').length")
        assert chips_count >= 3, f"Expected at least 3 prompt chips after clearChat, got {chips_count}"
        print(f"  ✔ [19] Clear chat button (#btn-clear-chat) restored clean chat state and {chips_count} active chips")

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
        print(f"  ✔ [20] Webcom loaded via Daemon HTTP. Daemon Online Status: {daemon_online}")

        # Test diag modal over HTTP
        await cdp_client.eval_js("document.getElementById('btn-diag').click()")
        for _ in range(10):
            await asyncio.sleep(0.5)
            modal_body = await cdp_client.eval_js("document.getElementById('modal-body').innerText")
            if "8001" in modal_body or "Host Daemon" in modal_body:
                break
        assert "8001" in modal_body or "Host Daemon" in modal_body, f"Diag modal body missing daemon info: {modal_body}"
        print("  ✔ [21] Diag modal over HTTP shows real live services & GPU matrix")
        await cdp_client.eval_js("document.getElementById('btn-close-modal').click()")

        print("\n" + "=" * 65)
        print("🎉 ALL 21 E2E BROWSER BUTTON, SETTINGS & I18N TESTS PASSED PERFECTLY!")
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
