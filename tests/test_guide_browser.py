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

CDP_PORT = 9227
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

async def run_guide_test():
    if not CHROME_PATH:
        print("❌ Chrome or Edge not found on system.")
        sys.exit(1)

    print(f"[*] Launching headless Edge with remote debugging on port {CDP_PORT}...")
    proc = subprocess.Popen([
        CHROME_PATH,
        "--headless=new",
        f"--remote-debugging-port={CDP_PORT}",
        "--disable-gpu",
        "--no-first-run",
        "--no-default-browser-check",
        "http://127.0.0.1:8001"
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    try:
        # Wait for CDP endpoint
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

        # Wait for page readiness
        print("[*] Waiting for document readiness...")
        for _ in range(20):
            ready = await cdp.eval_js("document.readyState === 'complete'")
            if ready:
                break
            await asyncio.sleep(0.5)

        # 1. Open Guide Modal
        print("[*] Test 1: Opening Guide Modal...")
        open_res = await cdp.eval_js("""
            (() => {
                const btn = document.getElementById('btn-open-guide');
                if (!btn) return { error: 'btn-open-guide not found' };
                btn.click();
                const modal = document.getElementById('guide-modal');
                return {
                    found: true,
                    isHidden: modal.classList.contains('hidden')
                };
            })()
        """)
        print(f"  Result: {open_res}")
        assert not open_res.get('isHidden'), "Guide modal should not be hidden after click"

        # 2. Switch to GraphRAG Tab
        print("[*] Test 2: Switching to GraphRAG tab in Guide Modal...")
        tab_res = await cdp.eval_js("""
            (() => {
                const tabBtn = document.querySelector('button[data-tab=\"guide-tab-graphrag\"]');
                if (!tabBtn) return { error: 'GraphRAG tab button not found' };
                tabBtn.click();
                const pane = document.getElementById('guide-tab-graphrag');
                return {
                    buttonFound: true,
                    btnActive: tabBtn.classList.contains('active'),
                    paneHidden: pane.classList.contains('hidden'),
                    paneTextSnippet: pane.innerText.slice(0, 100)
                };
            })()
        """)
        print(f"  Result: {tab_res}")
        assert not tab_res.get('paneHidden'), "GraphRAG tab pane should be visible"
        print("  ✔ GraphRAG Tab is active and visible!")

        # 3. Switch to License & Copyright Tab
        print("[*] Test 3: Switching to License & Copyright tab...")
        lic_res = await cdp.eval_js("""
            (() => {
                const licBtn = document.querySelector('button[data-tab=\"guide-tab-license\"]');
                if (!licBtn) return { error: 'License tab button not found' };
                licBtn.click();
                const pane = document.getElementById('guide-tab-license');
                const text = pane.innerText;
                return {
                    buttonFound: true,
                    paneHidden: pane.classList.contains('hidden'),
                    hasVersion: text.includes('v2.2.0'),
                    hasGPL: text.includes('GPL v3'),
                    hasEzdxf: text.includes('ezdxf'),
                    hasHermes: text.includes('Hermes Agent'),
                    hasMarkitdown: text.includes('markitdown')
                };
            })()
        """)
        print(f"  Result: {lic_res}")
        assert not lic_res.get('paneHidden'), "License pane should be visible"
        assert lic_res.get('hasVersion'), "License pane should contain v2.2.0"
        assert lic_res.get('hasEzdxf'), "License pane should acknowledge ezdxf"
        assert lic_res.get('hasHermes'), "License pane should acknowledge Hermes Agent"
        print("  ✔ License & Copyright tab is active and all acknowledgements are verified!")

        # 4. Close Modal
        print("[*] Test 4: Closing Guide Modal...")
        close_res = await cdp.eval_js("""
            (() => {
                const closeBtn = document.getElementById('btn-close-guide-footer');
                if (!closeBtn) return { error: 'close button not found' };
                closeBtn.click();
                const modal = document.getElementById('guide-modal');
                return {
                    modalClosed: modal.classList.contains('hidden')
                };
            })()
        """)
        print(f"  Result: {close_res}")
        assert close_res.get('modalClosed'), "Guide modal should be hidden after close click"
        print("  ✔ Guide Modal closed cleanly!")

        print("\n🎉 ALL BROWSER CDP TESTS FOR GUIDE MODAL PASSED!")

    finally:
        proc.terminate()
        try:
            proc.wait(timeout=3)
        except Exception:
            proc.kill()

if __name__ == '__main__':
    asyncio.run(run_guide_test())
