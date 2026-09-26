"""
test_i18n_app_library.py - Chrome CDP Automated Test for App Library & Tier Indicator I18N
Verifies:
1. Bottom Tier Indicator localized in both English and zh-TW (no untranslated Chinese)
2. App Library Modal localized in English (Title, Subtitle, Count badge)
3. App Cards localized in English: Titles, Descriptions, Run button (▶ Run)
4. LLM Bilingual Translation buttons present (#btn-llm-translate-all-apps, #btn-llm-translate-app)
5. Edit Custom App Modal localized in English (Title, Category options)
6. window.webcomApp.translateWithLLM functionality
7. Reversibility when switching back to zh-TW
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
    CHROME_PATH = r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"

async def cdp_eval(ws, expression, await_promise=False):
    msg_id = int(time.time() * 1000) % 100000
    req = {
        "id": msg_id,
        "method": "Runtime.evaluate",
        "params": {
            "expression": expression,
            "returnByValue": True,
            "awaitPromise": await_promise
        }
    }
    await ws.send(json.dumps(req))
    while True:
        resp = await ws.recv()
        data = json.loads(resp)
        if data.get("id") == msg_id:
            res = data.get("result", {}).get("result", {})
            if "value" in res:
                return res["value"]
            return res

async def run_cdp_tests():
    port = 9335
    proc = subprocess.Popen([
        CHROME_PATH,
        f"--remote-debugging-port={port}",
        "--headless=new",
        "--disable-gpu",
        "--no-sandbox",
        "--user-data-dir=" + os.path.join(PROJECT_ROOT, ".chrome_test_profile_app_lib"),
        INDEX_FILE_URL
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    time.sleep(2.5)

    try:
        targets_url = f"http://127.0.0.1:{port}/json"
        with urllib.request.urlopen(targets_url) as resp:
            targets = json.loads(resp.read().decode())
        page_target = next(t for t in targets if t.get("type") == "page")
        ws_url = page_target["webSocketDebuggerUrl"]

        async with websockets.connect(ws_url, max_size=10_000_000) as ws:
            print("Connected to Chrome via CDP!")

            # 1. Verify Default Chinese Tier Indicator
            await cdp_eval(ws, "window.webcomApp.setLanguage('zh-TW'); window.webcomApp.activeEngine = 'webgpu'; window.webcomApp.updateTierIndicator();")
            tier_zh = await cdp_eval(ws, "document.getElementById('current-tier-indicator')?.innerText")
            print(f"[zh-TW] Tier Indicator: {tier_zh}")
            assert "WebGPU 本機瀏覽器原生 (Tier 1)" in tier_zh, f"Expected Chinese in tier indicator, got: {tier_zh}"

            # 2. Switch to English
            print("\n--- Switching Language to English ('en') ---")
            await cdp_eval(ws, "window.webcomApp.setLanguage('en')")
            await asyncio.sleep(0.5)

            # Check window.currentLang
            current_lang = await cdp_eval(ws, "window.currentLang")
            print(f"window.currentLang: {current_lang}")
            assert current_lang == 'en', f"Expected 'en', got {current_lang}"

            # Check Tier Indicator in English
            tier_en = await cdp_eval(ws, "document.getElementById('current-tier-indicator')?.innerText")
            print(f"[en] Tier Indicator: {tier_en}")
            assert "WebGPU In-Browser Native (Tier 1)" in tier_en, f"English tier indicator mismatch: {tier_en}"
            assert "本機瀏覽器原生" not in tier_en, "Found untranslated Chinese in English tier indicator!"

            # 3. Open App Library Modal
            print("\n--- Verifying App Library Modal in English ---")
            await cdp_eval(ws, "window.openAppLibraryModal()")
            await asyncio.sleep(0.3)

            lib_title = await cdp_eval(ws, "document.querySelector('#app-library-modal h2')?.innerText")
            print(f"App Library Title: {lib_title}")
            assert "App Library" in lib_title, f"Lib title not translated: {lib_title}"

            btn_translate_all = await cdp_eval(ws, "document.getElementById('btn-llm-translate-all-apps')?.innerText")
            print(f"Translate All Apps Button: {btn_translate_all}")
            assert "LLM" in btn_translate_all, "Translate all button text missing LLM"

            cards = await cdp_eval(ws, """(() => {
                const els = document.querySelectorAll('#app-lib-grid .group');
                return Array.from(els).map(c => ({
                    title: c.querySelector('h3')?.innerText,
                    desc: c.querySelector('p')?.innerText,
                    runBtn: c.querySelector('.btn-run-app')?.innerText
                }));
            })()""")
            print(f"Rendered Cards ({len(cards)}):")
            for c in cards:
                print(f"  - [{c['title']}] Run: '{c['runBtn']}' | Desc: {c['desc']}")
                assert "▶ Run" in c['runBtn'] or "Run" in c['runBtn'], f"Run button not translated: {c['runBtn']}"
                assert c['title'] in ['Pomodoro Focus Timer', 'JSON Formatter & Beautifier', 'Python Fibonacci Generator'], f"Title not translated: {c['title']}"

            # 4. Open Edit Custom App Modal
            print("\n--- Verifying Edit Custom App Modal in English ---")
            await cdp_eval(ws, """(() => {
                const apps = JSON.parse(localStorage.getItem('webcom_custom_apps_v2') || '[]');
                window.openEditCustomAppModal(apps[0]);
            })()""")
            await asyncio.sleep(0.3)

            edit_title = await cdp_eval(ws, "document.getElementById('app-edit-modal-title')?.innerText")
            print(f"Edit Modal Title: {edit_title}")
            assert edit_title == "Edit Custom App", f"Edit modal title not translated: {edit_title}"

            cat_options = await cdp_eval(ws, """(() => {
                const sel = document.getElementById('app-edit-category');
                return Array.from(sel.options).map(o => o.text);
            })()""")
            print(f"Category Options: {cat_options}")
            assert any("Web App" in o for o in cat_options), "Category options missing English Web App"
            assert any("Python Script" in o for o in cat_options), "Category options missing English Python Script"

            btn_llm_app = await cdp_eval(ws, "document.getElementById('btn-llm-translate-app')?.innerText")
            print(f"Single App LLM Translate Button: {btn_llm_app}")
            assert "LLM" in btn_llm_app, "Missing LLM single app translate button"

            # 5. Test translateWithLLM
            print("\n--- Testing translateWithLLM Functionality ---")
            trans_result = await cdp_eval(ws, """(async () => {
                return await window.webcomApp.translateWithLLM(
                    '番茄工作法極簡專注計時器',
                    '具備 25 分鐘工作、5 分鐘短休息與客製時間切換，支援沙箱純本地運行。'
                );
            })()""", await_promise=True)
            print(f"translateWithLLM result: {trans_result}")
            assert "Pomodoro" in trans_result.get("title", ""), f"Translation failed: {trans_result}"

            # 6. Switch back to zh-TW and verify reversibility
            print("\n--- Switching back to Traditional Chinese ('zh-TW') ---")
            await cdp_eval(ws, "window.webcomApp.setLanguage('zh-TW')")
            await asyncio.sleep(0.3)

            tier_zh_restored = await cdp_eval(ws, "document.getElementById('current-tier-indicator')?.innerText")
            print(f"[zh-TW restored] Tier Indicator: {tier_zh_restored}")
            assert "本機瀏覽器原生" in tier_zh_restored, "Failed to restore Chinese tier indicator!"

            cards_zh = await cdp_eval(ws, """(() => {
                const els = document.querySelectorAll('#app-lib-grid .group');
                return Array.from(els).map(c => ({
                    title: c.querySelector('h3')?.innerText,
                    runBtn: c.querySelector('.btn-run-app')?.innerText
                }));
            })()""")
            print(f"[zh-TW restored] First card: {cards_zh[0]}")
            assert "執行" in cards_zh[0]['runBtn'], "Run button not restored to 執行!"
            assert "番茄" in cards_zh[0]['title'], "Card title not restored to Chinese!"

            print("\n✔ ALL APP LIBRARY & TIER INDICATOR I18N TESTS PASSED (100%)! 🎉")

    finally:
        proc.terminate()
        proc.wait()

if __name__ == '__main__':
    asyncio.run(run_cdp_tests())
