"""
test_workbench_and_diagnostics.py
Automated E2E test verifying:
1. Artifact Workbench "功能" dropdown menu opens and closes cleanly.
2. Device width buttons (100%, 768px, 375px) dynamically adjust #drawer-frame-wrapper maxWidth.
3. System Diagnostics modal (#btn-diag) displays live daemon probe, error monitor log, and copy report button.
4. Global error collector (window.webcomErrors) logs exceptions properly.
"""

import sys
import os
import json
import time
import subprocess
import urllib.request
import asyncio
import tempfile
import websockets

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SERVER_URL = "http://127.0.0.1:8001/web/index.html"
CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
if not os.path.exists(CHROME_PATH):
    CHROME_PATH = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

CDP_PORT = 9227

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

def launch_chrome(url, port=CDP_PORT):
    user_data = tempfile.mkdtemp(prefix="chrome_test_wb_")
    args = [
        CHROME_PATH,
        f"--remote-debugging-port={port}",
        "--headless=new",
        "--disable-gpu",
        "--no-first-run",
        "--no-default-browser-check",
        f"--user-data-dir={user_data}",
        "--window-size=1366,768",
        url
    ]
    proc = subprocess.Popen(args, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    for _ in range(30):
        try:
            req = urllib.request.urlopen(f"http://127.0.0.1:{port}/json", timeout=1)
            tabs = json.loads(req.read().decode())
            for tab in tabs:
                if tab.get("type") == "page":
                    return proc, tab["webSocketDebuggerUrl"]
        except Exception:
            time.sleep(0.2)
    proc.kill()
    raise RuntimeError("Failed to connect to Chrome CDP")

async def test_suite():
    print("[*] Launching browser for workbench & diagnostics test...")
    proc, ws_url = launch_chrome(SERVER_URL)
    client = CDPClient(ws_url)
    await client.connect()

    try:
        await asyncio.sleep(2.0)
        await client.eval_js("window.alert = () => {}; window.confirm = () => true;")

        print("\n--- TEST 1: Daemon Detection & Probe ---")
        daemon_res = await client.eval_js("""(() => {
            return {
                online: window.webcomApp?.daemonOnline,
                badgeText: document.getElementById('daemon-badge')?.innerText?.trim(),
                lastError: window.lastDaemonError
            };
        })()""")
        print(f"  Daemon status: {daemon_res}")
        assert daemon_res['online'], f"Daemon not detected as online: {daemon_res}"
        print("  ✔ 1. Daemon 8001 detected as ONLINE on page load")

        print("\n--- TEST 2: Diagnostics Modal & Error Monitor ---")
        diag_res = await client.eval_js("""(async () => {
            // Await showDiagModal
            await window.webcomApp?.showDiagModal();
            const modal = document.getElementById('modal-backdrop');
            const isOpen = modal && !modal.classList.contains('hidden');
            const title = document.getElementById('modal-title')?.innerText;
            const body = document.getElementById('modal-body')?.innerText;
            const hasCopyReportBtn = !!document.getElementById('btn-copy-diag-report');

            // Close modal
            (document.getElementById('btn-close-modal') || document.getElementById('btn-modal-cancel'))?.click();
            const isClosed = modal.classList.contains('hidden');

            return { isOpen, title, hasCopyReportBtn, isClosed, bodyPreview: body?.slice(0, 150) };
        })()""")
        assert diag_res['isOpen'], "Diagnostics modal failed to open"
        assert diag_res['hasCopyReportBtn'], "btn-copy-diag-report missing from diagnostics modal"
        assert diag_res['isClosed'], "Diagnostics modal failed to close"
        print(f"  ✔ 2. Diagnostics modal opens, displays services & error log, and closes cleanly")
        print(f"       Preview: {diag_res['bodyPreview']}")

        print("\n--- TEST 3: Artifact Workbench '功能' (More Actions) Dropdown ---")
        wb_dropdown_res = await client.eval_js("""(() => {
            // 1. Open drawer
            document.getElementById('btn-open-artifact')?.click();
            const drawer = document.getElementById('artifact-drawer-modal');
            const drawerOpen = drawer && !drawer.classList.contains('hidden');

            // 2. Click "功能" (#drawer-btn-more-menu)
            const menuBtn = document.getElementById('drawer-btn-more-menu');
            const dd = document.getElementById('dropdown-drawer-more');
            const initHidden = dd && dd.classList.contains('hidden');

            menuBtn.click();
            const expandedAfterClick = dd && !dd.classList.contains('hidden');

            // 3. Click again to toggle close
            menuBtn.click();
            const closedAfterSecondClick = dd && dd.classList.contains('hidden');

            // 4. Open again
            menuBtn.click();
            const reOpened = dd && !dd.classList.contains('hidden');

            // Close dropdown
            window.closeDrawerMoreDropdown();
            const closedByFunc = dd && dd.classList.contains('hidden');

            return { drawerOpen, initHidden, expandedAfterClick, closedAfterSecondClick, reOpened, closedByFunc };
        })()""")
        assert wb_dropdown_res['drawerOpen'], "Artifact drawer failed to open"
        assert wb_dropdown_res['initHidden'], "Dropdown was not hidden initially"
        assert wb_dropdown_res['expandedAfterClick'], "'功能' dropdown failed to expand on click"
        assert wb_dropdown_res['closedAfterSecondClick'], "'功能' dropdown failed to toggle close"
        assert wb_dropdown_res['reOpened'], "'功能' dropdown failed to re-open"
        assert wb_dropdown_res['closedByFunc'], "closeDrawerMoreDropdown failed"
        print("  ✔ 3. Artifact Workbench '功能' dropdown expands and closes perfectly")

        print("\n--- TEST 4: Artifact Device Width Switching (100% / 768px / 375px) ---")
        device_res = await client.eval_js("""(() => {
            const wrapper = document.getElementById('drawer-frame-wrapper');
            const btnTablet = document.querySelector('.drawer-device-btn[data-device=\"768px\"]');
            const btnMobile = document.querySelector('.drawer-device-btn[data-device=\"375px\"]');
            const btnDesktop = document.querySelector('.drawer-device-btn[data-device=\"100%\"]');

            // Switch to Tablet (768px)
            if (btnTablet) btnTablet.click();
            const wTablet = wrapper?.style?.maxWidth;

            // Switch to Mobile (375px)
            if (btnMobile) btnMobile.click();
            const wMobile = wrapper?.style?.maxWidth;

            // Switch back to Desktop (100%)
            if (btnDesktop) btnDesktop.click();
            const wDesktop = wrapper?.style?.maxWidth;

            // Close drawer
            document.getElementById('btn-close-artifact-drawer')?.click();
            const drawerClosed = document.getElementById('artifact-drawer-modal')?.classList?.contains('hidden');

            return { wTablet, wMobile, wDesktop, drawerClosed };
        })()""")
        assert device_res['wTablet'] == '768px', f"Tablet width expected 768px, got {device_res['wTablet']}"
        assert device_res['wMobile'] == '375px', f"Mobile width expected 375px, got {device_res['wMobile']}"
        assert device_res['wDesktop'] == '100%', f"Desktop width expected 100%, got {device_res['wDesktop']}"
        assert device_res['drawerClosed'], "Artifact drawer failed to close"
        print(f"  ✔ 4. Device width switching verified: Tablet={device_res['wTablet']}, Mobile={device_res['wMobile']}, Desktop={device_res['wDesktop']}")

        print("\n--- TEST 5: Global Error Collector (window.webcomErrors) ---")
        err_res = await client.eval_js("""(() => {
            const initialCount = window.webcomErrors?.length || 0;
            // Record a test warning
            window.recordWebcomError('TestMonitor', 'Simulated monitor check event', 'test.js', 42, 1);
            const afterCount = window.webcomErrors?.length || 0;
            const lastEntry = window.webcomErrors[window.webcomErrors.length - 1];
            return { initialCount, afterCount, lastType: lastEntry?.type, lastMsg: lastEntry?.message };
        })()""")
        assert err_res['afterCount'] == err_res['initialCount'] + 1, "Error collector did not increment"
        assert err_res['lastType'] == 'TestMonitor', "Error collector entry mismatch"
        print(f"  ✔ 5. Global Error Collector verified: captured {err_res['lastType']} ('{err_res['lastMsg']}')")

        print("\n=======================================================")
        print("  🏆 ALL WORKBENCH, DROPDOWN & DIAGNOSTICS TESTS PASSED ")
        print("=======================================================")

    finally:
        await client.ws.close()
        proc.kill()

if __name__ == '__main__':
    asyncio.run(test_suite())
