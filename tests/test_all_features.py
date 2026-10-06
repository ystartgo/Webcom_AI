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

CDP_PORT = 9226

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

def launch_headless_chrome(target_url, port=CDP_PORT):
    import tempfile
    user_data = tempfile.mkdtemp(prefix="chrome_test_profile_")
    args = [
        CHROME_PATH,
        f"--remote-debugging-port={port}",
        "--headless=new",
        "--disable-gpu",
        "--no-first-run",
        "--no-default-browser-check",
        f"--user-data-dir={user_data}",
        "--window-size=1366,768",
        target_url
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
    raise RuntimeError("Failed to connect to Chrome CDP within timeout")

async def test_page_features(client, mode_label):
    print(f"\n==========================================")
    print(f"Testing Webcom AI Features ({mode_label})")
    print(f"==========================================")

    await asyncio.sleep(1.5)

    # Disable blocking alert/confirm dialogs
    await client.eval_js("window.alert = () => {}; window.confirm = () => true;")

    # 1. Verify btn-tokentable-topbar is NOT in topbar (per user request: only in settings modal)
    tt_in_topbar = await client.eval_js("""(() => {
        const btn = document.getElementById('btn-tokentable-topbar');
        return btn !== null;
    })()""")
    assert not tt_in_topbar, "btn-tokentable-topbar should NOT be present on the topbar"
    print("✔ 1. Topbar TokenTable button confirmed absent (only present in Settings per user requirement)")

    # 2. Verify Settings modal & Quick Fill TokenTable
    res_sett = await client.eval_js("""(() => {
        const btnOpen = document.getElementById('btn-open-settings');
        btnOpen.click();
        const modal = document.getElementById('settings-modal');
        const isOpened = !modal.classList.contains('hidden');
        
        // Click quick fill
        const btnQf = document.getElementById('btn-quick-fill-tokentable');
        if (!btnQf) return { opened: isOpened, quickFillFound: false };
        btnQf.click();
        const endpoint = (document.getElementById('cfg-prof-endpoint') || document.getElementById('cfg-api-endpoint'))?.value;
        const model = (document.getElementById('cfg-prof-model') || document.getElementById('cfg-api-model'))?.value;

        // Close modal
        document.getElementById('btn-close-settings')?.click();
        const isClosed = modal.classList.contains('hidden');

        return { opened: isOpened, quickFillFound: true, endpoint, model, closed: isClosed };
    })()""")
    assert res_sett['opened'], "Settings modal did not open"
    assert res_sett['quickFillFound'], "btn-quick-fill-tokentable not found"
    assert 'https://tokentable.asia/v1' in res_sett['endpoint'], f"Endpoint mismatch: {res_sett['endpoint']}"
    assert res_sett['closed'], "Settings modal did not close"
    print(f"✔ 2. Settings modal & TokenTable Quick Fill verified: {res_sett['endpoint']}")

    # 3. Verify RAG Knowledge Base Modal
    res_rag = await client.eval_js("""(() => {
        document.getElementById('btn-open-rag')?.click();
        const modal = document.getElementById('rag-modal');
        const isOpened = modal && !modal.classList.contains('hidden');
        const docsCount = document.querySelectorAll('#rag-doc-list > div, #rag-docs-list > div').length;
        const tabsCount = document.querySelectorAll('#rag-category-tabs > button').length;
        
        // Close modal
        document.getElementById('btn-close-rag')?.click();
        const isClosed = modal.classList.contains('hidden');
        return { opened: isOpened, docsCount, tabsCount, closed: isClosed };
    })()""")
    assert res_rag['opened'], "RAG modal did not open"
    assert res_rag['docsCount'] > 0, "RAG docs list is empty"
    assert res_rag['tabsCount'] >= 5, f"RAG category tabs count: {res_rag['tabsCount']}"
    assert res_rag['closed'], "RAG modal did not close"
    print(f"✔ 3. RAG Modal verified with {res_rag['tabsCount']} category tabs and {res_rag['docsCount']} docs")

    # 4. Verify MCP Modal
    res_mcp = await client.eval_js("""(() => {
        document.getElementById('btn-open-mcp')?.click();
        const modal = document.getElementById('mcp-modal');
        const isOpened = modal && !modal.classList.contains('hidden');
        const epInput = document.getElementById('cfg-mcp-endpoint')?.value;
        
        // Close modal
        document.getElementById('btn-close-mcp')?.click();
        const isClosed = modal.classList.contains('hidden');
        return { opened: isOpened, epInput, closed: isClosed };
    })()""")
    assert res_mcp['opened'], "MCP modal did not open"
    assert res_mcp['epInput'], "cfg-mcp-endpoint is empty"
    assert res_mcp['closed'], "MCP modal did not close"
    print(f"✔ 4. MCP Modal verified with endpoint: {res_mcp['epInput']}")

    # 5. Verify App Library Modal
    res_app = await client.eval_js("""(() => {
        document.getElementById('btn-open-app-lib')?.click();
        const modal = document.getElementById('app-library-modal');
        const isOpened = modal && !modal.classList.contains('hidden');
        const appsCount = document.querySelectorAll('#app-lib-grid > div').length;
        const filterBtns = document.querySelectorAll('.app-lib-filter-btn').length;

        // Close modal
        document.getElementById('btn-close-app-lib')?.click();
        const isClosed = modal.classList.contains('hidden');
        return { opened: isOpened, appsCount, filterBtns, closed: isClosed };
    })()""")
    assert res_app['opened'], "App Library modal did not open"
    assert res_app['appsCount'] > 0, "App Library grid is empty"
    assert res_app['filterBtns'] >= 5, "App Library filters missing"
    assert res_app['closed'], "App Library modal did not close"
    print(f"✔ 5. App Library Modal verified with {res_app['appsCount']} apps and {res_app['filterBtns']} filters")

    # 6. Verify Guide Modal
    res_guide = await client.eval_js("""(() => {
        document.getElementById('btn-open-guide')?.click();
        const modal = document.getElementById('guide-modal');
        const isOpened = modal && !modal.classList.contains('hidden');
        const tabs = document.querySelectorAll('.guide-tab-btn');
        const tabsCount = tabs.length;

        // Click 2nd tab (Artifact)
        if (tabs[1]) tabs[1].click();
        const artPane = document.getElementById('guide-tab-artifact');
        const artVisible = artPane && !artPane.classList.contains('hidden');

        // Close modal
        document.getElementById('btn-close-guide')?.click();
        const isClosed = modal.classList.contains('hidden');
        return { opened: isOpened, tabsCount, artVisible, closed: isClosed };
    })()""")
    assert res_guide['opened'], "Guide modal did not open"
    assert res_guide['tabsCount'] >= 8, f"Expected >= 8 guide tabs, got {res_guide['tabsCount']}"
    assert res_guide['artVisible'], "Guide artifact tab failed to open"
    assert res_guide['closed'], "Guide modal did not close"
    print(f"✔ 6. Guide Modal verified with {res_guide['tabsCount']} documentation tabs")

    # 7. Verify Artifact Drawer Modal
    res_art = await client.eval_js("""(() => {
        document.getElementById('btn-open-artifact')?.click();
        const modal = document.getElementById('artifact-drawer-modal');
        const isOpened = modal && !modal.classList.contains('hidden');

        // Switch to Code tab
        document.getElementById('drawer-tab-code')?.click();
        const codePane = document.getElementById('drawer-pane-code') || document.getElementById('drawer-code-pane');
        const codeVisible = codePane && !codePane.classList.contains('hidden');

        // Switch to Diff tab
        document.getElementById('drawer-tab-diff')?.click();
        const diffPane = document.getElementById('drawer-pane-diff') || document.getElementById('drawer-diff-pane');
        const diffVisible = diffPane && !diffPane.classList.contains('hidden');

        // Close drawer
        (document.getElementById('btn-close-artifact-drawer') || document.getElementById('drawer-btn-close'))?.click();
        const isClosed = modal.classList.contains('hidden');
        return { opened: isOpened, codeVisible, diffVisible, closed: isClosed };
    })()""")
    assert res_art['opened'], "Artifact drawer modal did not open"
    assert res_art['codeVisible'], "Artifact code view failed to open"
    assert res_art['diffVisible'], "Artifact diff view failed to open"
    assert res_art['closed'], "Artifact drawer modal did not close"
    print("✔ 7. Artifact Drawer Workbench verified with Preview, Code & Diff modes")

    # 8. Verify Serial Controls Bar & Serial Log Modal
    res_ser = await client.eval_js("""(() => {
        const serialBar = document.getElementById('serial-controls-bar');
        const initHidden = serialBar && serialBar.classList.contains('hidden');

        // Click #tab-serial
        document.getElementById('tab-serial')?.click();
        const serialBarVisible = serialBar && !serialBar.classList.contains('hidden');

        // Open serial log modal
        document.getElementById('btn-open-serial-log')?.click();
        const logModal = document.getElementById('serial-log-modal');
        const logModalVisible = logModal && !logModal.classList.contains('hidden');

        // Close log modal
        window.closeSerialLogModal();
        const logModalClosed = logModal.classList.contains('hidden');

        // Switch back to #tab-shell
        document.getElementById('tab-shell')?.click();
        const serialBarHiddenAgain = serialBar && serialBar.classList.contains('hidden');

        return { initHidden, serialBarVisible, logModalVisible, logModalClosed, serialBarHiddenAgain };
    })()""")
    assert res_ser['initHidden'], "Serial bar should be hidden initially"
    assert res_ser['serialBarVisible'], "Serial bar should be visible on #tab-serial"
    assert res_ser['logModalVisible'], "Serial Log modal failed to open"
    assert res_ser['logModalClosed'], "Serial Log modal failed to close"
    assert res_ser['serialBarHiddenAgain'], "Serial bar should be hidden on #tab-shell"
    print("✔ 8. Serial Controls Bar & Serial Log Modal verified")

    # 9. Verify Speech-to-text input button
    res_speech = await client.eval_js("""(() => {
        const btn = document.getElementById('btn-speech-input');
        return btn !== null && typeof window.toggleSpeechInput === 'function';
    })()""")
    assert res_speech, "Speech input button or function missing"
    print("✔ 9. Speech-to-text Input Button verified")

    # 10. Check Bilingual i18n & 0 missing keys
    res_i18n = await client.eval_js("""(() => {
        const missingKeys = [];
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const k = el.getAttribute('data-i18n');
            if (k && !TRANSLATIONS['zh-TW'][k]) missingKeys.push(k);
        });
        document.querySelectorAll('[data-i18n-title]').forEach(el => {
            const k = el.getAttribute('data-i18n-title');
            if (k && !TRANSLATIONS['zh-TW'][k]) missingKeys.push(k);
        });
        return { totalExamined: document.querySelectorAll('[data-i18n]').length, missingKeys };
    })()""")
    assert len(res_i18n['missingKeys']) == 0, f"Missing i18n keys: {res_i18n['missingKeys']}"
    print(f"✔ 10. Bilingual i18n verification passed ({res_i18n['totalExamined']} elements checked, 0 missing)")

    print(f"🎉 ALL 10 TESTS PASSED IN {mode_label}!")

async def main():
    # 1. Test HTTP
    print("\n--- [MODE 1] Launching HTTP Daemon Test ---")
    proc1, ws_url1 = launch_headless_chrome(SERVER_URL)
    client1 = CDPClient(ws_url1)
    await client1.connect()
    try:
        await test_page_features(client1, "HTTP Mode")
    finally:
        await client1.ws.close()
        proc1.kill()

    # 2. Test file://
    print("\n--- [MODE 2] Launching Standalone file:// Test ---")
    proc2, ws_url2 = launch_headless_chrome(INDEX_FILE_URL)
    client2 = CDPClient(ws_url2)
    await client2.connect()
    try:
        await test_page_features(client2, "file:// Mode")
    finally:
        await client2.ws.close()
        proc2.kill()

    print("\n=======================================================")
    print("  🏆 ALL CHECKS PASSED ON BOTH HTTP AND FILE PROTOCOLS  ")
    print("=======================================================")

if __name__ == '__main__':
    asyncio.run(main())
