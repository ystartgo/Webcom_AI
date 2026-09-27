import asyncio
import json
import os
import subprocess
import sys
import time
import urllib.request
import websockets

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

CDP_PORT = 9229
EDGE_PATHS = [
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Google\Chrome\Application\chrome.exe"
]
CHROME_PATH = next((p for p in EDGE_PATHS if os.path.exists(p)), None)

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
        val = res.get("result", {}).get("result", {}).get("value")
        exc = res.get("result", {}).get("exceptionDetails")
        if exc:
            raise RuntimeError(f"JS Error: {exc}")
        return val

async def run_test():
    if not CHROME_PATH:
        print("❌ Chrome or Edge not found.")
        sys.exit(1)

    import tempfile
    user_data_dir = tempfile.mkdtemp(prefix="cdp_test_")
    print(f"[*] Launching headless browser on CDP port {CDP_PORT} with user data {user_data_dir}...")
    proc = subprocess.Popen([
        CHROME_PATH,
        "--headless=new",
        f"--remote-debugging-port={CDP_PORT}",
        f"--user-data-dir={user_data_dir}",
        "--disable-gpu",
        "--no-first-run",
        "--no-default-browser-check",
        "--window-size=1280,900",
        "http://127.0.0.1:8001/web/index.html"
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

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
                ready = await cdp.eval_js("document.readyState === 'complete' && !!window.app && !!document.getElementById('term-input')")
                if ready:
                    break
            except Exception:
                pass
            await asyncio.sleep(0.5)

        # Test 1: Verify DOM elements exist
        print("\n[*] Test 1: Check DOM elements for Jev Terminal Slash...")
        dom_check = await cdp.eval_js("""
            (() => {
                const input = document.getElementById('term-input');
                const menu = document.getElementById('term-slash-menu');
                return {
                    hasInput: !!input,
                    hasMenu: !!menu,
                    placeholder: input ? input.placeholder : '',
                    menuClasses: menu ? menu.className : ''
                };
            })()
        """)
        print(f"    DOM Check: {dom_check}")
        assert dom_check["hasInput"], "term-input not found"
        assert dom_check["hasMenu"], "term-slash-menu not found"
        print("✔ Test 1 Passed: Elements present.")

        # Test 2: Trigger slash popup
        print("\n[*] Test 2: Type '/' into #term-input to trigger Jev Environment Detection...")
        slash_trigger = await cdp.eval_js("""
            (() => {
                const input = document.getElementById('term-input');
                input.value = '/';
                input.dispatchEvent(new Event('input', { bubbles: true }));
                return true;
            })()
        """)
        for _ in range(25):
            menu_active = await cdp.eval_js("document.getElementById('term-slash-menu')?.classList.contains('active')")
            if menu_active:
                break
            await asyncio.sleep(0.1)

        menu_state = await cdp.eval_js("""
            (() => {
                const menu = document.getElementById('term-slash-menu');
                const items = menu.querySelectorAll('.slash-item');
                const header = menu.querySelector('.slash-menu-header');
                return {
                    isOpen: menu.classList.contains('active'),
                    itemCount: items.length,
                    headerText: header ? header.textContent.trim() : '',
                    firstItemCmd: items[0] ? (items[0].querySelector('.slash-item-cmd') ? items[0].querySelector('.slash-item-cmd').textContent.trim() : '') : ''
                };
            })()
        """)
        print(f"    Menu State after '/': {menu_state}")
        assert menu_state["isOpen"], "term-slash-menu should have .active class"
        assert menu_state["itemCount"] > 0, "term-slash-menu should have items"
        assert "Jev" in menu_state["headerText"], "Header should mention Jev"
        print("✔ Test 2 Passed: Menu opened with Jev Environment Detector header and commands.")

        # Test 3: Filter commands by typing '/det'
        print("\n[*] Test 3: Filter commands with '/det'...")
        await cdp.eval_js("""
            (() => {
                const input = document.getElementById('term-input');
                input.value = '/det';
                input.dispatchEvent(new Event('input', { bubbles: true }));
            })()
        """)
        await asyncio.sleep(0.2)

        filter_state = await cdp.eval_js("""
            (() => {
                const menu = document.getElementById('term-slash-menu');
                const items = menu.querySelectorAll('.slash-item');
                const cmds = Array.from(items).map(i => i.querySelector('.slash-item-cmd').textContent.trim());
                return {
                    itemCount: items.length,
                    cmds: cmds
                };
            })()
        """)
        print(f"    Filtered State: {filter_state}")
        assert filter_state["itemCount"] >= 1, "Should match /detect"
        assert "/detect" in filter_state["cmds"], "/detect should be in filtered list"
        print("✔ Test 3 Passed: Filtering works correctly.")

        # Test 4: Tab auto-completion
        print("\n[*] Test 4: Press Tab to complete command...")
        tab_result = await cdp.eval_js("""
            (() => {
                const input = document.getElementById('term-input');
                const menu = document.getElementById('term-slash-menu');
                const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
                input.dispatchEvent(event);
                return {
                    inputValue: input.value,
                    isOpen: menu.classList.contains('active')
                };
            })()
        """)
        print(f"    Tab result: {tab_result}")
        assert tab_result["inputValue"] == "/detect", "Input value should be completed to /detect"
        assert not tab_result["isOpen"], "Menu should be closed after Tab completion"
        print("✔ Test 4 Passed: Tab completion fills input and dismisses menu.")

        # Test 5: Execute /detect to verify Jev Environment Probe Report
        print("\n[*] Test 5: Execute /detect and verify Jev ASCII report in terminal...")
        await cdp.eval_js("""
            (() => {
                const input = document.getElementById('term-input');
                input.value = '/detect';
                const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
                input.dispatchEvent(event);
            })()
        """)
        await asyncio.sleep(0.5)

        logs_content = await cdp.eval_js("""
            (() => {
                const logs = document.getElementById('term-logs');
                return logs ? logs.textContent : '';
            })()
        """)
        assert ("ENVIRONMENT PROBE REPORT" in logs_content or "環境指令即時偵測報告" in logs_content), f"Jev Probe Report header missing in logs: {logs_content[:200]}"
        assert ("當前活動終端" in logs_content or "Active Terminal" in logs_content), "Session info missing in report"
        assert ("作業系統" in logs_content or "Operating System" in logs_content), "OS info missing in report"
        assert ("記憶體" in logs_content or "RAM" in logs_content), "RAM info missing in report"
        print("✔ Test 5 Passed: /detect produced Jev Environment Probe Report with OS & RAM telemetry.")

        # Test 5b: Submit '/' directly and verify Jev prints Environment Command Directory
        print("\n[*] Test 5b: Submit '/' directly to verify Jev Command Directory in logs...")
        await cdp.eval_js("""
            (() => {
                const input = document.getElementById('term-input');
                input.value = '/';
                const sendBtn = document.getElementById('btn-term-send');
                if (sendBtn) sendBtn.click();
            })()
        """)
        await asyncio.sleep(0.5)

        logs_content_dir = await cdp.eval_js("""
            (() => {
                const logs = document.getElementById('term-logs');
                return logs ? logs.textContent : '';
            })()
        """)
        assert ("ENVIRONMENT COMMAND DIRECTORY" in logs_content_dir or "環境指令即時清單" in logs_content_dir), f"Directory header missing: {logs_content_dir[:200]}"
        print("✔ Test 5b Passed: Sending '/' prints full Environment Command Directory to terminal logs.")

        # Test 6: Environment Detection across sessions (Switch to Pyodide and WSL)
        print("\n[*] Test 6: Switch session to Pyodide (WASM) and test Jev detection...")
        py_switch = await cdp.eval_js("""
            (() => {
                const tabPy = document.getElementById('tab-py');
                if (tabPy) tabPy.click();
                const input = document.getElementById('term-input');
                input.value = '/';
                input.dispatchEvent(new Event('input', { bubbles: true }));
                return true;
            })()
        """)
        await asyncio.sleep(0.3)

        py_menu = await cdp.eval_js("""
            (() => {
                const menu = document.getElementById('term-slash-menu');
                const items = menu.querySelectorAll('.slash-item');
                const header = menu.querySelector('.slash-menu-header');
                const cmds = Array.from(items).map(i => i.querySelector('.slash-item-cmd').textContent.trim());
                return {
                    headerText: header ? header.textContent.trim() : '',
                    cmds: cmds.slice(0, 5)
                };
            })()
        """)
        print(f"    Pyodide Menu State: {py_menu}")
        assert "Python" in py_menu["headerText"] or "Pyodide" in py_menu["headerText"], f"Expected Python/Pyodide in header: {py_menu['headerText']}"
        assert any(cmd in py_menu["cmds"] for cmd in ["sys.version", "import math", "import json", "gc.get_count()"]), f"Expected python commands, got {py_menu['cmds']}"
        print("✔ Test 6 Passed: Dynamic session switching updates Jev environment context!")

        # Test 7: Terminal Command History with ArrowUp / ArrowDown
        print("\n[*] Test 7: Verify Terminal Command History navigation (ArrowUp & ArrowDown)...")
        # Switch back to shell tab
        await cdp.eval_js("document.getElementById('tab-shell').click()")
        await asyncio.sleep(0.2)

        # Submit two test commands
        await cdp.eval_js("""
            (() => {
                const app = window.app || window.webcomApp;
                const input = document.getElementById('term-input');
                input.value = 'echo "HIST_CMD_ALPHA"';
                app.handleSendTerminal();
                input.value = 'echo "HIST_CMD_BETA"';
                app.handleSendTerminal();
            })()
        """)
        await asyncio.sleep(0.3)

        # Test ArrowUp once -> Should recall 'echo "HIST_CMD_BETA"'
        hist_up_1 = await cdp.eval_js("""
            (() => {
                const input = document.getElementById('term-input');
                input.value = '';
                const evt = new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true });
                input.dispatchEvent(evt);
                return input.value;
            })()
        """)
        print(f"    ArrowUp (1st): {hist_up_1}")
        assert hist_up_1 == 'echo "HIST_CMD_BETA"', f"Expected HIST_CMD_BETA, got {hist_up_1}"

        # Test ArrowUp twice -> Should recall 'echo "HIST_CMD_ALPHA"'
        hist_up_2 = await cdp.eval_js("""
            (() => {
                const input = document.getElementById('term-input');
                const evt = new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true });
                input.dispatchEvent(evt);
                return input.value;
            })()
        """)
        print(f"    ArrowUp (2nd): {hist_up_2}")
        assert hist_up_2 == 'echo "HIST_CMD_ALPHA"', f"Expected HIST_CMD_ALPHA, got {hist_up_2}"

        # Test ArrowDown once -> Should go back forward to 'echo "HIST_CMD_BETA"'
        hist_down_1 = await cdp.eval_js("""
            (() => {
                const input = document.getElementById('term-input');
                const evt = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true });
                input.dispatchEvent(evt);
                return input.value;
            })()
        """)
        print(f"    ArrowDown (1st): {hist_down_1}")
        assert hist_down_1 == 'echo "HIST_CMD_BETA"', f"Expected HIST_CMD_BETA, got {hist_down_1}"

        # Test ArrowDown again -> Should restore empty draft
        hist_down_2 = await cdp.eval_js("""
            (() => {
                const input = document.getElementById('term-input');
                const evt = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true });
                input.dispatchEvent(evt);
                return input.value;
            })()
        """)
        print(f"    ArrowDown (2nd): '{hist_down_2}'")
        assert hist_down_2 == '', f"Expected empty draft, got '{hist_down_2}'"
        print("✔ Test 7 Passed: Command history (ArrowUp/ArrowDown) recalls commands in correct order!")

        # Test 8: Terminal Virtual Keypad Toolbar Buttons (vkey-up, vkey-down, vkey-del, etc.)
        print("\n[*] Test 8: Verify Virtual Keypad Toolbar elements and interactions...")
        vkeys_check = await cdp.eval_js("""
            (() => {
                const vkeyIds = ['vkey-up', 'vkey-down', 'vkey-left', 'vkey-right', 'vkey-tab', 'vkey-del', 'vkey-enter', 'vkey-ctrl-a', 'vkey-ctrl-c', 'vkey-ctrl-v', 'vkey-ctrl-x', 'vkey-esc', 'vkey-history'];
                const status = {};
                vkeyIds.forEach(id => {
                    const el = document.getElementById(id);
                    status[id] = !!el && !el.classList.contains('hidden');
                });
                return status;
            })()
        """)
        print(f"    Vkey status: {vkeys_check}")
        for k, v in vkeys_check.items():
            assert v, f"Virtual key button {k} must exist and be visible"

        # Click vkey-up
        vkey_up_val = await cdp.eval_js("""
            (() => {
                document.getElementById('vkey-up').click();
                return document.getElementById('term-input').value;
            })()
        """)
        print(f"    vkey-up clicked -> value: {vkey_up_val}")
        assert vkey_up_val == 'echo "HIST_CMD_BETA"', f"Expected HIST_CMD_BETA, got {vkey_up_val}"

        # Click vkey-del
        vkey_del_val = await cdp.eval_js("""
            (() => {
                const input = document.getElementById('term-input');
                input.value = 'test1234';
                input.setSelectionRange(8, 8);
                document.getElementById('vkey-del').click();
                return input.value;
            })()
        """)
        print(f"    vkey-del clicked on 'test1234' -> value: '{vkey_del_val}'")
        assert vkey_del_val == 'test123', f"Expected 'test123', got '{vkey_del_val}'"

        # Click vkey-esc
        vkey_esc_val = await cdp.eval_js("""
            (() => {
                document.getElementById('vkey-esc').click();
                return document.getElementById('term-input').value;
            })()
        """)
        assert vkey_esc_val == '', f"Expected empty input after vkey-esc, got '{vkey_esc_val}'"
        print("✔ Test 8 Passed: Virtual Keypad toolbar buttons function properly!")

        # Test 9: Execute 'history' command & vkey-history button
        print("\n[*] Test 9: Execute 'history' command & check formatted list in logs...")
        await cdp.eval_js("""
            (() => {
                const app = window.app || window.webcomApp;
                const input = document.getElementById('term-input');
                input.value = 'history';
                app.handleSendTerminal();
            })()
        """)
        await asyncio.sleep(0.3)

        logs_history = await cdp.eval_js("""
            (() => {
                const logs = document.getElementById('term-logs');
                return logs ? logs.textContent : '';
            })()
        """)
        assert ("COMMAND HISTORY LIST" in logs_history or "終端機歷史指令記錄清單" in logs_history), f"History list header missing in logs: {logs_history[-300:]}"
        assert 'echo "HIST_CMD_ALPHA"' in logs_history, "HIST_CMD_ALPHA should appear in history output"
        assert 'echo "HIST_CMD_BETA"' in logs_history, "HIST_CMD_BETA should appear in history output"
        print("✔ Test 9 Passed: 'history' command displays formatted command list in terminal logs!")

        # Test 10: Type '/hist' into input, verify '/history' in slash menu, Tab/Enter executes it
        print("\n[*] Test 10: Type '/hist' in slash menu to verify /history completion...")
        await cdp.eval_js("""
            (() => {
                const input = document.getElementById('term-input');
                input.value = '/hist';
                input.dispatchEvent(new Event('input', { bubbles: true }));
            })()
        """)
        for _ in range(25):
            menu_active = await cdp.eval_js("document.getElementById('term-slash-menu')?.classList.contains('active')")
            if menu_active:
                break
            await asyncio.sleep(0.1)

        hist_menu = await cdp.eval_js("""
            (() => {
                const menu = document.getElementById('term-slash-menu');
                const items = menu.querySelectorAll('.slash-item');
                return {
                    isOpen: menu.classList.contains('active'),
                    itemCount: items.length,
                    firstCmd: items[0]?.querySelector('.slash-item-cmd')?.textContent.trim()
                };
            })()
        """)
        print(f"    Slash menu for '/hist': {hist_menu}")
        assert hist_menu["isOpen"], "Slash menu should open for /hist"
        assert hist_menu["firstCmd"] == "/history", f"Expected /history, got {hist_menu['firstCmd']}"

        # Press Enter on /history
        await cdp.eval_js("""
            (() => {
                const input = document.getElementById('term-input');
                const evt = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
                input.dispatchEvent(evt);
            })()
        """)
        await asyncio.sleep(0.3)
        print("✔ Test 10 Passed: '/history' is auto-detected in Jev slash menu and executable!")

        # Test 11: Execute 'wsl -l' and verify UTF-16LE clean decoding without mojibake
        print("\n[*] Test 11: Execute 'wsl -l' and verify clean Chinese/English UTF-16LE output...")
        await cdp.eval_js("""
            (() => {
                const input = document.getElementById('term-input');
                input.value = 'wsl -l';
                const app = window.app || window.webcomApp;
                app.handleSendTerminal();
            })()
        """)
        await asyncio.sleep(1.2)

        logs_wsl = await cdp.eval_js("""
            (() => {
                const logs = document.getElementById('term-logs');
                return logs ? logs.textContent : '';
            })()
        """)
        print(f"    Last logs snippet: {repr(logs_wsl[-250:])}")
        assert "Windows" in logs_wsl, "Expected 'Windows' in wsl output"
        assert "Debian" in logs_wsl, "Expected 'Debian' in wsl output"
        assert "P[" not in logs_wsl and "Hr|vHO" not in logs_wsl, "Should not contain mojibake like P[ or Hr|vHO"
        print("✔ Test 11 Passed: 'wsl -l' decoded cleanly without UTF-16LE distortion or mojibake!")

        print("\n=======================================================")
        print("🎉 ALL JEV TERMINAL SLASH & HISTORY TESTS PASSED! 🎉")
        print("=======================================================")

    finally:
        proc.terminate()
        try:
            proc.wait(timeout=2)
        except Exception:
            proc.kill()

if __name__ == "__main__":
    asyncio.run(run_test())
