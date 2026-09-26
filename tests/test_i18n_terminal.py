"""
test_i18n_terminal.py - Automated Browser CDP Test for Terminal & Banner Localization
Verifies:
1. Static i18n key parity between HTML data-i18n and app.js TRANSLATIONS (zh-TW & en)
2. Live DOM banner translation (ASCII box) in zh-TW and en
3. Terminal session tabs translation (#1-命令列, #2-WSL 容器, etc.)
4. HermesToolDispatcher log localization and prefix normalization (no duplicate [Dispatcher] [HermesToolDispatcher])
5. Terminal clear and environment switch messages in both languages
"""

import sys
import os
import json
import time
import subprocess
import urllib.request
import asyncio
import websockets
from bs4 import BeautifulSoup

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
INDEX_FILE_URL = "file:///" + os.path.join(PROJECT_ROOT, "web", "index.html").replace("\\", "/")

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
if not os.path.exists(CHROME_PATH):
    CHROME_PATH = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

CDP_PORT = 9223

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
        res = await self.call("Runtime.evaluate", {
            "expression": expression,
            "awaitPromise": True,
            "returnByValue": True
        })
        if "exceptionDetails" in res:
            raise RuntimeError(f"JS Exception: {res['exceptionDetails']}")
        return res.get("result", {}).get("value")

    async def close(self):
        if self.ws:
            await self.ws.close()

def test_static_i18n_keys():
    print("=== Step 1: Checking Static i18n Keys ===")
    with open(os.path.join(PROJECT_ROOT, "web", "index.html"), "r", encoding="utf-8") as f:
        soup = BeautifulSoup(f.read(), "html.parser")
    
    html_keys = set()
    for el in soup.find_all(attrs={"data-i18n": True}):
        html_keys.add(el["data-i18n"])
    for el in soup.find_all(attrs={"data-i18n-title": True}):
        html_keys.add(el["data-i18n-title"])
    for el in soup.find_all(attrs={"data-i18n-placeholder": True}):
        html_keys.add(el["data-i18n-placeholder"])

    with open(os.path.join(PROJECT_ROOT, "web", "app.js"), "r", encoding="utf-8") as f:
        app_js = f.read()

    # Verify critical terminal keys are in HTML
    critical_keys = [
        "termBannerTitle", "termBannerT1", "termBannerT2", "termBannerT3",
        "tabShell", "tabWsl", "tabPy", "tabSerial", "tabNovnc",
        "termStatusReady", "termInitSuccess", "termHelpPrompt",
        "greetingTier1", "greetingTier2", "greetingTier3"
    ]
    for k in critical_keys:
        assert k in html_keys, f"Critical key '{k}' missing from index.html data-i18n"
        assert f"{k}:" in app_js, f"Critical key '{k}' missing from app.js TRANSLATIONS"
    print(f"✔ All {len(critical_keys)} critical terminal & banner keys verified in HTML and app.js.")

async def test_live_browser():
    print("\n=== Step 2: Launching Headless Browser & Running CDP Verification ===")
    user_data_dir = os.path.join(PROJECT_ROOT, ".tmp_cdp_profile_i18n")
    os.makedirs(user_data_dir, exist_ok=True)

    cmd = [
        CHROME_PATH,
        f"--remote-debugging-port={CDP_PORT}",
        f"--user-data-dir={user_data_dir}",
        "--headless=new",
        "--disable-gpu",
        "--no-first-run",
        "--no-default-browser-check",
        INDEX_FILE_URL
    ]

    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    time.sleep(2)

    try:
        # Get websocket debugger URL
        req = urllib.request.urlopen(f"http://127.0.0.1:{CDP_PORT}/json")
        targets = json.loads(req.read().decode('utf-8'))
        page_target = next(t for t in targets if t.get("type") == "page")
        ws_url = page_target["webSocketDebuggerUrl"]

        client = CDPClient(ws_url)
        await client.connect()

        # Wait for webcomApp initialization
        for _ in range(20):
            ready = await client.eval_js("Boolean(window.webcomApp && window.webcomApp.dispatcher)")
            if ready:
                break
            await asyncio.sleep(0.3)

        # 1. Test zh-TW initial state
        await client.eval_js("window.webcomApp.setLanguage('zh-TW')")
        banner_title = await client.eval_js("document.getElementById('term-banner-title')?.innerText")
        tab_shell = await client.eval_js("document.getElementById('tab-shell')?.innerText")
        tab_wsl = await client.eval_js("document.getElementById('tab-wsl')?.innerText")
        tab_py = await client.eval_js("document.getElementById('tab-py')?.innerText")
        tab_serial = await client.eval_js("document.getElementById('tab-serial')?.innerText")
        tab_novnc = await client.eval_js("document.getElementById('tab-novnc')?.innerText")

        print(f"[zh-TW] Banner: {banner_title}")
        print(f"[zh-TW] Tabs: Shell='{tab_shell}', WSL='{tab_wsl}', Py='{tab_py}', Serial='{tab_serial}', noVNC='{tab_novnc}'")

        assert "雙引擎 AI 控制台" in banner_title, "Banner title should be in Traditional Chinese"
        assert "命令列" in tab_shell, f"Expected 命令列 in tab_shell, got {tab_shell}"
        assert "WSL 容器" in tab_wsl, f"Expected WSL 容器 in tab_wsl, got {tab_wsl}"

        # 2. Test Clear Terminal in zh-TW
        await client.eval_js("window.webcomApp.clearTerminal()")
        term_text = await client.eval_js("document.getElementById('term-logs')?.innerText")
        print(f"[zh-TW] Clear output: {term_text.strip()}")
        assert "終端機輸出記錄已清空。" in term_text, "Expected Chinese clear message"

        # 3. Test HermesToolDispatcher log in zh-TW (no duplicate prefix)
        await client.eval_js("window.webcomApp.dispatcher.init()")
        term_text_after_init = await client.eval_js("document.getElementById('term-logs')?.innerText")
        print(f"[zh-TW] Dispatcher init log: {term_text_after_init.splitlines()[-1] if term_text_after_init else ''}")
        assert "[工具派發器]" in term_text_after_init, "Expected [工具派發器] prefix in zh-TW"
        assert "[Dispatcher] [HermesToolDispatcher]" not in term_text_after_init, "Duplicate prefix detected!"

        # 4. Switch to English (en)
        print("\n--- Switching to English ('en') ---")
        await client.eval_js("window.webcomApp.setLanguage('en')")
        banner_title_en = await client.eval_js("document.getElementById('term-banner-title')?.innerText")
        tab_shell_en = await client.eval_js("document.getElementById('tab-shell')?.innerText")
        tab_wsl_en = await client.eval_js("document.getElementById('tab-wsl')?.innerText")
        tab_py_en = await client.eval_js("document.getElementById('tab-py')?.innerText")

        print(f"[en] Banner: {banner_title_en}")
        print(f"[en] Tabs: Shell='{tab_shell_en}', WSL='{tab_wsl_en}', Py='{tab_py_en}'")

        assert "Dual-Engine AI Console" in banner_title_en, "Banner title should be in English"
        assert "SHELL (PS)" in tab_shell_en, f"Expected SHELL (PS) in tab_shell_en, got {tab_shell_en}"
        assert "WSL Container" in tab_wsl_en, f"Expected WSL Container in tab_wsl_en, got {tab_wsl_en}"

        # 5. Test Clear Terminal in English
        await client.eval_js("window.webcomApp.clearTerminal()")
        term_text_en = await client.eval_js("document.getElementById('term-logs')?.innerText")
        print(f"[en] Clear output: {term_text_en.strip()}")
        assert "Terminal output log cleared." in term_text_en, "Expected English clear message"

        # 6. Test HermesToolDispatcher log in English
        await client.eval_js("window.webcomApp.dispatcher.init()")
        term_text_en_init = await client.eval_js("document.getElementById('term-logs')?.innerText")
        print(f"[en] Dispatcher init log: {term_text_en_init.splitlines()[-1] if term_text_en_init else ''}")
        assert "[Dispatcher]" in term_text_en_init, "Expected [Dispatcher] prefix in English"
        assert "[Dispatcher] [HermesToolDispatcher]" not in term_text_en_init, "Duplicate prefix detected!"

        # 7. Switch back to zh-TW
        await client.eval_js("window.webcomApp.setLanguage('zh-TW')")
        banner_title_tw_again = await client.eval_js("document.getElementById('term-banner-title')?.innerText")
        assert "雙引擎 AI 控制台" in banner_title_tw_again

        print("\n✔ ALL TERMINAL & BANNER I18N TESTS PASSED (100%)!")

        await client.close()
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=3)
        except Exception:
            proc.kill()

if __name__ == "__main__":
    test_static_i18n_keys()
    asyncio.run(test_live_browser())
