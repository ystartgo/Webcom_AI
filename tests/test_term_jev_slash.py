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

    print(f"[*] Launching headless browser on CDP port {CDP_PORT}...")
    proc = subprocess.Popen([
        CHROME_PATH,
        "--headless=new",
        f"--remote-debugging-port={CDP_PORT}",
        "--disable-gpu",
        "--no-first-run",
        "--no-default-browser-check",
        "--window-size=1280,900",
        "http://127.0.0.1:8001"
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
        for _ in range(20):
            ready = await cdp.eval_js("document.readyState === 'complete' && !!window.app")
            if ready:
                break
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
        await asyncio.sleep(0.3) # wait for debounce & Jev eval

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

        print("\n==========================================")
        print("🎉 ALL JEV TERMINAL SLASH TESTS PASSED! 🎉")
        print("==========================================")

    finally:
        proc.terminate()
        try:
            proc.wait(timeout=2)
        except Exception:
            proc.kill()

if __name__ == "__main__":
    asyncio.run(run_test())
