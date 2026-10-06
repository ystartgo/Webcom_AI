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
    def __init__(self, port=9232):
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
            f"--user-data-dir=C:/temp/edge_profile_applib_full_{int(time.time())}",
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

async def test_app_library_full():
    cdp = ChromeDevTools(9232)
    proc = await cdp.connect(URL)
    try:
        await asyncio.sleep(2.0)
        await cdp.eval_js("window.alert = () => {}; window.confirm = () => true;")

        print("\n==========================================")
        print("  Webcom AI App Library Comprehensive Tests")
        print("==========================================")

        # 1. Open App Library Modal
        print("\n--- TEST 1: Open App Library & Verify Cards ---")
        opened = await cdp.eval_js("""(() => {
            window.openAppLibraryModal();
            const modal = document.getElementById('app-library-modal');
            const cards = document.querySelectorAll('#app-lib-grid > div');
            return {
                open: modal && !modal.classList.contains('hidden'),
                count: cards.length
            };
        })()""")
        print(f"  App Library opened: {opened['open']}, Cards: {opened['count']}")
        assert opened['open'] and opened['count'] >= 3, f"Modal open failed: {opened}"
        print("  ✔ 1. App Library modal opens with starter cards")

        # 2. Run Python App (The one in user's screenshot)
        print("\n--- TEST 2: Run Python App ('Python 數列生成與視覺化') ---")
        py_run_res = await cdp.eval_js("""(() => {
            const cards = document.querySelectorAll('#app-lib-grid > div');
            const pyCard = Array.from(cards).find(c => c.querySelector('h3')?.innerText?.includes('Python'));
            if (!pyCard) return { error: 'Python card not found' };
            const runBtn = pyCard.querySelector('.btn-run-app');
            runBtn.click();

            const drawerModal = document.getElementById('artifact-drawer-modal');
            const drawerTitle = document.getElementById('drawer-artifact-title')?.innerText;
            const drawerOpen = drawerModal && !drawerModal.classList.contains('hidden');
            const curSession = window.webcomApp?.currentSession;

            return { drawerOpen, drawerTitle, curSession };
        })()""")
        print("  Triggered Python App:", py_run_res)
        assert py_run_res['drawerOpen'], "Artifact Drawer did not open for Python app"
        assert py_run_res['curSession'] == 'py', f"Session was not switched to py: {py_run_res['curSession']}"
        print("  ✔ 2. Python app launches Artifact Drawer and activates #3-PY session")

        # Wait 2 seconds for Python runner to finish execution
        await asyncio.sleep(2.0)
        output_res = await cdp.eval_js("""(() => {
            const consoleEl = document.getElementById('py-runner-console');
            const badgeEl = document.getElementById('py-runner-status-badge');
            const termLogs = document.getElementById('term-logs')?.innerText;
            return {
                consoleText: consoleEl?.innerText,
                badgeText: badgeEl?.innerText,
                termContainsFib: termLogs?.includes('Fibonacci (First 25 items)')
            };
        })()""")
        print(f"  Console output snippet:\n    {output_res['consoleText'][:120]}...")
        print(f"  Badge text: {output_res['badgeText']}")
        print(f"  Terminal received Fibonacci output: {output_res['termContainsFib']}")
        assert 'Fibonacci' in output_res['consoleText'], f"Fibonacci not found in runner output: {output_res['consoleText']}"
        assert output_res['termContainsFib'], "Fibonacci output not logged to Terminal"
        print("  ✔ 3. Python Fibonacci calculation ran successfully with live output in Drawer & Terminal")

        # Close Drawer
        await cdp.eval_js("window.closeArtifactDrawer();")

        # 4. Run HTML App (Pomodoro)
        print("\n--- TEST 4: Run HTML App ('番茄工作法極簡專注計時器') ---")
        await cdp.eval_js("window.openAppLibraryModal();")
        html_run_res = await cdp.eval_js("""(() => {
            const cards = document.querySelectorAll('#app-lib-grid > div');
            const htmlCard = Array.from(cards).find(c => c.querySelector('h3')?.innerText?.includes('番茄'));
            htmlCard.querySelector('.btn-run-app').click();

            const drawerModal = document.getElementById('artifact-drawer-modal');
            const iframe = document.getElementById('drawer-artifact-iframe');
            return {
                drawerOpen: drawerModal && !drawerModal.classList.contains('hidden'),
                iframeHasSrcdoc: !!(iframe && iframe.srcdoc && iframe.srcdoc.includes('Pomodoro'))
            };
        })()""")
        print("  HTML App run result:", html_run_res)
        assert html_run_res['drawerOpen'] and html_run_res['iframeHasSrcdoc'], "HTML App failed to render in drawer iframe"
        print("  ✔ 4. HTML app renders interactively inside Artifact Drawer iframe")

        await cdp.eval_js("window.closeArtifactDrawer();")

        # 5. Test Edit Modal on Python App
        print("\n--- TEST 5: Open Edit Modal & Field Population ---")
        await cdp.eval_js("window.openAppLibraryModal();")
        edit_res = await cdp.eval_js("""(() => {
            const cards = document.querySelectorAll('#app-lib-grid > div');
            const pyCard = Array.from(cards).find(c => c.querySelector('h3')?.innerText?.includes('Python'));
            pyCard.querySelector('.btn-edit-app').click();

            const modal = document.getElementById('app-edit-modal');
            const nameVal = document.getElementById('app-edit-name')?.value;
            const catVal = document.getElementById('app-edit-category')?.value;
            const codeVal = document.getElementById('app-edit-code')?.value;

            return {
                open: modal && !modal.classList.contains('hidden'),
                nameVal,
                catVal,
                hasCode: !!(codeVal && codeVal.includes('fib'))
            };
        })()""")
        print("  Edit modal result:", edit_res)
        assert edit_res['open'] and 'Python' in edit_res['nameVal'] and edit_res['catVal'] == 'py' and edit_res['hasCode'], f"Edit modal fields not populated correctly: {edit_res}"
        print("  ✔ 5. Edit custom app modal correctly populates all form fields")

        await cdp.eval_js("window.closeAppEditModal();")

        # 6. Test New App Creation & Storage
        print("\n--- TEST 6: Create New Custom App & Verify in Grid ---")
        new_app_res = await cdp.eval_js("""(() => {
            window.openEditCustomAppModal(null);
            document.getElementById('app-edit-name').value = '單元測試計數器 App';
            document.getElementById('app-edit-category').value = 'html';
            document.getElementById('app-edit-desc').value = '自動化測試建立的示範計數器應用';
            document.getElementById('app-edit-code').value = '<h1>Test Counter: 100</h1>';
            window.saveCustomAppFromModal();

            const cards = document.querySelectorAll('#app-lib-grid > div');
            const found = Array.from(cards).find(c => c.querySelector('h3')?.innerText?.includes('單元測試計數器'));
            return {
                totalCards: cards.length,
                found: !!found,
                foundTitle: found?.querySelector('h3')?.innerText
            };
        })()""")
        print("  New app creation result:", new_app_res)
        assert new_app_res['found'], "Created app not found in grid"
        print("  ✔ 6. New custom app created and saved successfully")

        # 7. Test Delete App Action
        print("\n--- TEST 7: Delete Newly Created App ---")
        del_res = await cdp.eval_js("""(() => {
            const cards = document.querySelectorAll('#app-lib-grid > div');
            const target = Array.from(cards).find(c => c.querySelector('h3')?.innerText?.includes('單元測試計數器'));
            target.querySelector('.btn-delete-app').click();

            const delModal = document.getElementById('app-delete-modal');
            const modalTarget = document.getElementById('app-delete-modal-target')?.innerText;
            const isOpen = delModal && !delModal.classList.contains('hidden');

            // Confirm delete
            window.executeDeleteApp();

            const cardsAfter = document.querySelectorAll('#app-lib-grid > div');
            const foundAfter = Array.from(cardsAfter).find(c => c.querySelector('h3')?.innerText?.includes('單元測試計數器'));

            return {
                isOpen,
                modalTargetSnippet: modalTarget?.substring(0, 50),
                stillPresent: !!foundAfter,
                countAfter: cardsAfter.length
            };
        })()""")
        print("  Delete test result:", del_res)
        assert del_res['isOpen'] and not del_res['stillPresent'], "Delete action failed"
        print("  ✔ 7. Custom app deletion modal & execution verified cleanly")

        print("\n=======================================================")
        print("  🏆 ALL APP LIBRARY TESTS PASSED (100% OPERATIONAL)  ")
        print("=======================================================")

    finally:
        proc.kill()

if __name__ == '__main__':
    asyncio.run(test_app_library_full())
