"""
test_terminal_powershell.py — Automated verification of PowerShell terminal execution (ls, dir)
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


async def main():
    print("\n=======================================================")
    print("  Webcom AI — Terminal PowerShell (ls, dir) Tests      ")
    print("=======================================================\n")

    user_data = os.path.join(os.environ.get("TEMP", r"C:\tmp"), "edge_test_term_profile")
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

        # 1. Test 'ls' command via terminal input
        print("--- TEST 1: Execute 'ls' in Web Terminal ---")
        ls_res = await cdp.eval_js("""(async () => {
            const app = window.webcomApp;
            const input = document.getElementById('term-input');
            input.value = 'ls';
            await app.handleSendTerminal();

            // Wait a brief moment for execution
            await new Promise(r => setTimeout(r, 600));

            const screenText = document.getElementById('terminal-screen')?.innerText || '';
            return {
                hasPrompt: screenText.includes('ls'),
                hasMode: screenText.includes('Mode') || screenText.includes('LastWriteTime'),
                hasFiles: screenText.includes('webcom_AI') || screenText.includes('START.bat') || screenText.includes('web'),
                noError: !screenText.includes('is not recognized')
            };
        })()""")
        print("  'ls' execution snapshot:", json.dumps(ls_res, indent=2, ensure_ascii=False))
        assert ls_res['hasPrompt'], "Prompt indicator missing for 'ls'"
        assert ls_res['hasMode'], "'ls' output missing directory column header"
        assert ls_res['hasFiles'], "'ls' output missing repository files"
        assert ls_res['noError'], "'ls' still returned unrecognized command error"
        print("  ✔ 1. 'ls' successfully recognized and executed via PowerShell with full directory listing")

        # 2. Test 'dir' command via terminal input
        print("\n--- TEST 2: Execute 'dir' in Web Terminal ---")
        dir_res = await cdp.eval_js("""(async () => {
            const app = window.webcomApp;
            const input = document.getElementById('term-input');
            input.value = 'dir';
            await app.handleSendTerminal();

            await new Promise(r => setTimeout(r, 600));

            const screenText = document.getElementById('terminal-screen')?.innerText || '';
            return {
                hasPrompt: screenText.includes('dir'),
                hasFiles: screenText.includes('START.bat') || screenText.includes('web')
            };
        })()""")
        print("  'dir' execution snapshot:", json.dumps(dir_res, indent=2, ensure_ascii=False))
        assert dir_res['hasPrompt'], "Prompt indicator missing for 'dir'"
        assert dir_res['hasFiles'], "'dir' output missing directory contents"
        print("  ✔ 2. 'dir' successfully executed and output displayed cleanly in Web Terminal")

        print("\n=======================================================")
        print("  🏆 ALL TERMINAL POWERSHELL TESTS PASSED (100%)       ")
        print("=======================================================\n")

    finally:
        proc.kill()

if __name__ == '__main__':
    asyncio.run(main())
