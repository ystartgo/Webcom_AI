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

CDP_PORT = 9228
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

async def run_bilingual_guide_test():
    if not CHROME_PATH:
        print("❌ Chrome or Edge not found.")
        sys.exit(1)

    print(f"[*] Launching headless browser on CDP port {CDP_PORT}...")
    proc = subprocess.Popen([
        CHROME_PATH,
        "--headless=new",
        f"--remote-debugging-port={CDP_PORT}",
        "--disable-gpu",
        "--window-size=1280,900",
        "--no-first-run",
        "--no-default-browser-check",
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

        print("[*] Waiting for document readiness...")
        for _ in range(20):
            ready = await cdp.eval_js("document.readyState === 'complete'")
            if ready:
                break
            await asyncio.sleep(0.5)

        # 1. Test Chinese Initial State
        print("[*] Test 1: Verifying Traditional Chinese Operation Guide Button...")
        zh_btn = await cdp.eval_js("""
            (() => {
                const btn = document.getElementById('btn-open-guide');
                return {
                    text: (btn?.textContent || btn?.innerText || '').trim(),
                    title: btn?.getAttribute('title')
                };
            })()
        """)
        print(f"  Result: {zh_btn}")
        assert "操作說明" in zh_btn.get("text", "") or "說明" in zh_btn.get("text", ""), "Guide button should show 操作說明"
        print("  ✔ Traditional Chinese button verified!")

        # 2. Open Guide Modal in zh-TW
        print("[*] Test 2: Opening Guide Modal in zh-TW...")
        await cdp.eval_js("document.getElementById('btn-open-guide').click()")
        zh_modal = await cdp.eval_js("""
            (() => {
                const modal = document.getElementById('guide-modal');
                const title = document.querySelector('#guide-modal [data-i18n=\"guideModalTitle\"]')?.innerText;
                const quickPane = document.getElementById('guide-tab-quick')?.innerText;
                return {
                    visible: !modal.classList.contains('hidden'),
                    title: title,
                    hasZhQuick: quickPane?.includes('推論模式說明')
                };
            })()
        """)
        print(f"  Result: {zh_modal}")
        assert zh_modal.get("visible"), "Guide modal should be open"
        assert zh_modal.get("hasZhQuick"), "Quick tab should have Chinese text in zh-TW mode"
        print("  ✔ zh-TW Guide Modal content verified!")

        # 3. Switch Language to English via In-Modal Toggle
        print("[*] Test 3: Switching Language to English via Modal Lang Toggle...")
        toggle_res = await cdp.eval_js("""
            (() => {
                const toggle = document.getElementById('btn-guide-lang-toggle');
                toggle.click();
                return {
                    langLabel: document.getElementById('guide-lang-label')?.innerText,
                    currentLang: window.currentLang
                };
            })()
        """)
        print(f"  Result: {toggle_res}")
        await asyncio.sleep(0.5)

        en_modal = await cdp.eval_js("""
            (() => {
                const title = document.querySelector('#guide-modal [data-i18n=\"guideModalTitle\"]')?.innerText;
                const quickText = document.getElementById('guide-tab-quick')?.innerText;
                const btnTopText = document.getElementById('btn-open-guide')?.innerText.trim();
                return {
                    title: title,
                    btnTopText: btnTopText,
                    hasEnQuick: quickText?.includes('Five Inference Modes') || quickText?.includes('Inference Modes'),
                    hasEnGpuGuard: quickText?.includes('GPU Resource Protection') || quickText?.includes('90% Ceiling Guard')
                };
            })()
        """)
        print(f"  Result: {en_modal}")
        assert "User Guide" in en_modal.get("btnTopText", ""), "Top button should translate to User Guide"
        assert en_modal.get("hasEnQuick"), "Quick tab should be translated to English"
        assert en_modal.get("hasEnGpuGuard"), "GPU Guard should be translated to English"
        print("  ✔ English Guide Modal and Top Button verified!")

        # 4. Check English GraphRAG tab
        print("[*] Test 4: Switching to GraphRAG Tab in English...")
        await cdp.eval_js("""
            document.querySelector('button[data-tab=\"guide-tab-graphrag\"]').click()
        """)
        await asyncio.sleep(0.3)
        en_graphrag = await cdp.eval_js("""
            (() => {
                const pane = document.getElementById('guide-tab-graphrag');
                const text = pane?.innerText || '';
                return {
                    hasWhatIs: text.includes('What is GraphRAG'),
                    hasMultiHop: text.includes('Multi-Hop Traversal'),
                    hasCanvas: text.includes('Force-Directed Physical Canvas Visualizer'),
                    hasHermes: text.includes('Hermes Agent Autonomous Tool Calling')
                };
            })()
        """)
        print(f"  Result: {en_graphrag}")
        assert en_graphrag.get("hasWhatIs"), "GraphRAG should have English title"
        assert en_graphrag.get("hasMultiHop"), "GraphRAG should have English Multi-Hop explanation"
        print("  ✔ English GraphRAG Tab verified!")

        # 5. Check English License tab
        print("[*] Test 5: Switching to License Tab in English...")
        await cdp.eval_js("""
            document.querySelector('button[data-tab=\"guide-tab-license\"]').click()
        """)
        await asyncio.sleep(0.3)
        en_lic = await cdp.eval_js("""
            (() => {
                const pane = document.getElementById('guide-tab-license');
                const text = pane?.innerText || '';
                return {
                    hasLicHeader: text.includes('Copyright Notice & Open-Source License'),
                    hasAck: text.includes('Third-Party Acknowledgements'),
                    hasEzdxf: text.includes('ezdxf'),
                    hasHermes: text.includes('NousResearch Hermes Agent')
                };
            })()
        """)
        print(f"  Result: {en_lic}")
        assert en_lic.get("hasLicHeader"), "License should have English header"
        assert en_lic.get("hasAck"), "License should have English acknowledgements"
        print("  ✔ English License & Acknowledgements tab verified!")

        # 6. Close Modal
        print("[*] Test 6: Closing modal...")
        await cdp.eval_js("document.getElementById('btn-close-guide').click()")

        # 7. Test Chat Query for '操作說明' / 'user guide'
        print("[*] Test 7: Testing Chat tool dispatch for '操作說明'...")
        chat_res = await cdp.eval_js("""
            (async () => {
                // Dispatch search_guide directly through chat
                const query = '請提供系統操作說明手冊';
                const input = document.getElementById('chat-input');
                input.value = query;
                const sendBtn = document.getElementById('btn-send-chat');
                sendBtn.click();
                
                // wait for response bubble
                for (let i = 0; i < 20; i++) {
                    await new Promise(r => setTimeout(r, 200));
                    const lastMsg = document.querySelector('#chat-container .assistant-msg-bubble:last-child');
                    if (lastMsg && (lastMsg.innerText.includes('search_guide') || lastMsg.innerText.includes('操作說明') || lastMsg.innerText.includes('User Guide'))) {
                        return {
                            found: true,
                            text: lastMsg.innerText.slice(0, 150),
                            hasGuideBtn: !!lastMsg.querySelector('button[onclick*=\"openGuideModal\"]')
                        };
                    }
                }
                return { found: false };
            })()
        """)
        print(f"  Result: {chat_res}")
        assert chat_res.get("found"), "Chat should dispatch search_guide and render response"
        assert chat_res.get("hasGuideBtn"), "Chat response should contain button to open guide modal"
        print("  ✔ Chat tool dispatch for 操作說明 verified!")

        print("\n🎉 ALL BILINGUAL GUIDE & TRANSLATION TESTS PASSED PERFECTLY!")

    finally:
        proc.terminate()
        try:
            proc.wait(timeout=3)
        except Exception:
            proc.kill()

if __name__ == '__main__':
    asyncio.run(run_bilingual_guide_test())
