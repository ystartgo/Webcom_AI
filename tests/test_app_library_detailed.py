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
    def __init__(self, port=9230):
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
            f"--user-data-dir=C:/temp/edge_profile_test_app_lib_{int(time.time())}",
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

async def test_app_library():
    cdp = ChromeDevTools(9230)
    proc = await cdp.connect(URL)
    try:
        await asyncio.sleep(2.0)
        
        # 1. Open App Library Modal
        print("\n--- 1. Open App Library Modal ---")
        opened = await cdp.eval_js("""(() => {
            window.openAppLibraryModal();
            const modal = document.getElementById('app-library-modal');
            return modal && !modal.classList.contains('hidden');
        })()""")
        print(f"Modal opened: {opened}")

        # 2. Check cards rendered
        cards_info = await cdp.eval_js("""(() => {
            const cards = document.querySelectorAll('#app-lib-grid > div');
            return Array.from(cards).map(c => {
                const title = c.querySelector('h3')?.innerText;
                const cat = c.querySelector('span')?.innerText;
                const hasRun = !!c.querySelector('.btn-run-app');
                const hasEdit = !!c.querySelector('.btn-edit-app');
                const hasDel = !!c.querySelector('.btn-delete-app');
                return { title, cat, hasRun, hasEdit, hasDel };
            });
        })()""")
        print(f"Cards found ({len(cards_info)}):", cards_info)

        # 3. Simulate clicking [▶ 執行] on Python app (index 2: 'Python 數列生成與視覺化')
        print("\n--- 3. Click [▶ 執行] on Python app ---")
        click_res = await cdp.eval_js("""(() => {
            const cards = document.querySelectorAll('#app-lib-grid > div');
            const pyCard = Array.from(cards).find(c => c.querySelector('h3')?.innerText?.includes('Python'));
            if (!pyCard) return { error: 'Python card not found' };
            const runBtn = pyCard.querySelector('.btn-run-app');
            if (!runBtn) return { error: 'Run button not found' };
            
            // Record state before click
            const drawerBefore = !document.getElementById('artifact-drawer-modal')?.classList.contains('hidden');
            const termLogsBefore = document.getElementById('term-logs')?.innerText;
            const curSessionBefore = window.webcomApp?.currentSession;

            runBtn.click();

            // Check state right after click
            const drawerAfter = !document.getElementById('artifact-drawer-modal')?.classList.contains('hidden');
            const termLogsAfter = document.getElementById('term-logs')?.innerText;
            const curSessionAfter = window.webcomApp?.currentSession;
            const appLibModalAfter = !document.getElementById('app-library-modal')?.classList.contains('hidden');

            return {
                drawerBefore,
                drawerAfter,
                termLogsDiff: termLogsAfter.substring(termLogsBefore.length),
                curSessionBefore,
                curSessionAfter,
                appLibModalAfter
            };
        })()""")
        print("Click result:", json.dumps(click_res, indent=2, ensure_ascii=False))

        # Wait a bit to see if async tool execution or terminal update occurs
        await asyncio.sleep(2.0)
        logs_now = await cdp.eval_js("""document.getElementById('term-logs')?.innerText""")
        print("Terminal logs after 2s:\n", logs_now)

        # 4. Simulate clicking [▶ 執行] on HTML app (Pomodoro)
        print("\n--- 4. Click [▶ 執行] on HTML app (Pomodoro) ---")
        await cdp.eval_js("window.openAppLibraryModal();")
        html_click_res = await cdp.eval_js("""(() => {
            const cards = document.querySelectorAll('#app-lib-grid > div');
            const htmlCard = Array.from(cards).find(c => c.querySelector('h3')?.innerText?.includes('番茄'));
            if (!htmlCard) return { error: 'Html card not found' };
            const runBtn = htmlCard.querySelector('.btn-run-app');
            runBtn.click();

            const drawerAfter = !document.getElementById('artifact-drawer-modal')?.classList.contains('hidden');
            const drawerTitle = document.getElementById('drawer-artifact-title')?.innerText;
            const iframeSrc = document.getElementById('drawer-artifact-iframe')?.srcdoc?.substring(0, 100);
            return { drawerAfter, drawerTitle, iframeSrc };
        })()""")
        print("HTML App run result:", json.dumps(html_click_res, indent=2, ensure_ascii=False))

    finally:
        proc.kill()

if __name__ == '__main__':
    asyncio.run(test_app_library())
