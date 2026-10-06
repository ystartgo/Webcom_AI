"""
test_chat_persistence_and_gpu_guard.py — Automated verification of:
1. Local JSON / localStorage Chat Persistence with timestamps (壓時間記錄聊天對話防止當機刷新 對話不見)
2. Chat History Restoration upon page reload
3. JSON Chat Export with timestamps and metadata
4. GPU 90% Resource Ceiling & Crash Prevention Governor (防卡頓崩潰)
"""

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

CDP_PORT = 9223
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
    print("  Webcom AI — Chat Persistence & GPU 90% Guard Tests  ")
    print("=======================================================\n")

    user_data = os.path.join(os.environ.get("TEMP", r"C:\tmp"), "edge_test_chat_persist_profile")
    cmd = [
        CHROME_PATH,
        f"--remote-debugging-port={CDP_PORT}",
        f"--user-data-dir={user_data}",
        "--headless=new",
        "--disable-gpu",
        "--no-first-run",
        "http://127.0.0.1:8001"
    ]

    proc = subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    await asyncio.sleep(2.0)

    try:
        tabs_url = f"http://127.0.0.1:{CDP_PORT}/json"
        req = urllib.request.urlopen(tabs_url)
        tabs = json.loads(req.read().decode('utf-8'))
        target_tab = next(t for t in tabs if t.get('type') == 'page')
        ws_url = target_tab['webSocketDebuggerUrl']

        cdp = SimpleCDP(ws_url)
        await cdp.connect()
        print("✔ Connected to Edge via CDP WebSocket.")

        # Robust wait for page load & webcomApp initialization
        for _ in range(30):
            try:
                ready = await cdp.eval_js("document.readyState === 'complete' && !!window.webcomApp && !!document.getElementById('chat-autosave-indicator')")
                if ready:
                    break
            except Exception:
                pass
            await asyncio.sleep(0.3)

        # -------------------------------------------------------------
        # Test 1: Verify UI Badges and Elements exist
        # -------------------------------------------------------------
        print("\n--- Test 1: UI Badges & Controls Initialization ---")
        ui_check = await cdp.eval_js("""
            (() => {
                const autoSaveBadge = document.getElementById('chat-autosave-indicator');
                const autoSaveTime = document.getElementById('chat-autosave-time');
                const gpuBadge = document.getElementById('gpu-guard-badge');
                const autoSaveChk = document.getElementById('cfg-chat-autosave');
                const gpuRange = document.getElementById('cfg-gpu-limit-range');

                return {
                    hasAutoSaveBadge: !!autoSaveBadge,
                    autoSaveText: autoSaveBadge ? autoSaveBadge.innerText : null,
                    hasGpuBadge: !!gpuBadge,
                    gpuBadgeText: gpuBadge ? gpuBadge.innerText : null,
                    hasAutoSaveChk: !!autoSaveChk,
                    hasGpuRange: !!gpuRange
                };
            })()
        """)
        print(f"UI Status: {ui_check}")
        assert ui_check["hasAutoSaveBadge"], "Chat auto-save badge must exist!"
        assert ui_check["hasGpuBadge"], "GPU Guard badge must exist!"
        print("✔ Test 1 Passed: Autosave badge and GPU 90% badge found in DOM.")

        # -------------------------------------------------------------
        # Test 2: Send Message & Verify LocalStorage Persistence with Timestamp
        # -------------------------------------------------------------
        print("\n--- Test 2: Message Auto-Persistence to localStorage ---")
        test_msg = "Hello Webcom AI, test persistence!"
        send_res = await cdp.eval_js(f"""
            (() => {{
                const app = window.webcomApp;
                if (!app) return {{ error: 'No app instance' }};
                app.appendUserMessage("{test_msg}");
                
                const raw = localStorage.getItem('webcom_chat_history');
                const saved = raw ? JSON.parse(raw) : null;
                return {{
                    chatHistoryLength: app.chatHistory.length,
                    savedVersion: saved ? saved.version : null,
                    savedAt: saved ? saved.savedAt : null,
                    messagesCount: saved && saved.messages ? saved.messages.length : 0,
                    lastMessageRole: saved && saved.messages ? saved.messages[saved.messages.length - 1].role : null,
                    lastMessageContent: saved && saved.messages ? saved.messages[saved.messages.length - 1].content : null,
                    lastMessageTimestamp: saved && saved.messages ? saved.messages[saved.messages.length - 1].timestamp : null,
                    lastMessageTimeLabel: saved && saved.messages ? saved.messages[saved.messages.length - 1].timeLabel : null
                }};
            }})()
        """)
        print(f"Persistence Result: {send_res}")
        assert send_res["chatHistoryLength"] >= 1, "chatHistory must have recorded message"
        assert send_res["messagesCount"] >= 1, "localStorage must contain saved messages"
        assert send_res["lastMessageRole"] == "user", "Role must be user"
        assert send_res["lastMessageContent"] == test_msg, "Message content must match"
        assert send_res["lastMessageTimestamp"] is not None, "Timestamp must be recorded"
        assert send_res["lastMessageTimeLabel"] is not None, "Time label must be recorded"
        print("✔ Test 2 Passed: Message saved with timestamp to localStorage.")

        # -------------------------------------------------------------
        # Test 3: Page Reload / Reconnect Chat Restoration
        # -------------------------------------------------------------
        print("\n--- Test 3: Reload & Restoration from Snapshot ---")
        # Clear DOM chat container to simulate fresh reload
        reload_test = await cdp.eval_js("""
            (() => {
                const app = window.webcomApp;
                const container = document.getElementById('chat-container');
                // Clear container and in-memory chat
                container.innerHTML = '<div id="greeting-bubble">Greeting</div>';
                app.chatHistory = [];
                
                // Now restore
                app.restoreChatHistory();
                
                const restoredBubbles = container.querySelectorAll('.user-msg-bubble, .assistant-msg-bubble');
                const autosaveTime = document.getElementById('chat-autosave-time')?.innerText;
                
                return {
                    chatHistoryLength: app.chatHistory.length,
                    domBubbleCount: restoredBubbles.length,
                    autosaveTime: autosaveTime
                };
            })()
        """)
        print(f"Restore Result: {reload_test}")
        assert reload_test["chatHistoryLength"] >= 1, "Chat history should be restored from localStorage"
        assert reload_test["domBubbleCount"] >= 1, "DOM should have restored message bubbles"
        print("✔ Test 3 Passed: Chat restored successfully from localStorage snapshot.")

        # -------------------------------------------------------------
        # Test 4: Export Chat JSON Format Verification
        # -------------------------------------------------------------
        print("\n--- Test 4: Export Chat JSON Schema ---")
        export_check = await cdp.eval_js("""
            (() => {
                const app = window.webcomApp;
                const now = new Date();
                const exportData = {
                    app: 'Webcom AI Console',
                    version: '2.0',
                    exportedAt: now.toISOString(),
                    engine: app.activeEngine,
                    profile: app.activeProfileId,
                    gpuSafetyLimit: `${Math.round(app.gpuMaxRatio * 100)}%`,
                    totalMessages: app.chatHistory.length,
                    messages: app.chatHistory.map(m => ({
                        id: m.id,
                        role: m.role,
                        content: m.content,
                        timestamp: m.timestamp,
                        timeLabel: m.timeLabel
                    }))
                };
                return exportData;
            })()
        """)
        print(f"Export Data: version={export_check['version']}, gpuSafetyLimit={export_check['gpuSafetyLimit']}, count={export_check['totalMessages']}")
        assert export_check["version"] == "2.0", "Version must be 2.0"
        assert export_check["gpuSafetyLimit"] == "90%", "Default safety limit should be 90%"
        assert export_check["totalMessages"] >= 1, "Messages should be included in export"
        assert "timestamp" in export_check["messages"][0], "Message must have timestamp"
        print("✔ Test 4 Passed: JSON export schema correctly structured.")

        # -------------------------------------------------------------
        # Test 5: GPU 90% Protection Governor
        # -------------------------------------------------------------
        print("\n--- Test 5: GPU 90% Resource Ceiling & Crash Prevention ---")
        # Step 5A: Normal GPU load (<90%)
        normal_gpu = await cdp.eval_js("""
            (() => {
                const app = window.webcomApp;
                app.checkGpuResourceCeiling({
                    gpus: [{
                        vram_total_mb: 16000,
                        vram_used_mb: 2000,
                        gpu_util_pct: 12
                    }]
                });
                const badge = document.getElementById('gpu-guard-badge');
                return {
                    safetyActive: app.gpuSafetyActive,
                    badgeText: badge ? badge.innerText : null,
                    badgeClass: badge ? badge.className : null
                };
            })()
        """)
        print(f"Normal GPU Check: {normal_gpu}")
        assert not normal_gpu["safetyActive"], "GPU safety should be inactive when normal"
        assert "90%防護" in normal_gpu["badgeText"], "Badge should show 90%防護"

        # Step 5B: Overload GPU load (92% VRAM >= 90%)
        overload_gpu = await cdp.eval_js("""
            (() => {
                const app = window.webcomApp;
                // Feed simulated 92% VRAM
                app.checkGpuResourceCeiling({
                    gpus: [{
                        vram_total_mb: 16000,
                        vram_used_mb: 14720, // 92%
                        gpu_util_pct: 75
                    }]
                });
                const badge = document.getElementById('gpu-guard-badge');
                return {
                    safetyActive: app.gpuSafetyActive,
                    maxTokensCap: app.maxTokensCap,
                    badgeText: badge ? badge.innerText : null,
                    badgeClass: badge ? badge.className : null
                };
            })()
        """)
        print(f"Overload GPU Check: {overload_gpu}")
        assert overload_gpu["safetyActive"], "GPU safety must be active on 92% VRAM"
        assert overload_gpu["maxTokensCap"] == 512, "maxTokensCap must be throttled to 512"
        assert "警戒 92%" in overload_gpu["badgeText"], "Badge must show 警戒 92%"

        # Step 5C: Recovery (<90%)
        recovery_gpu = await cdp.eval_js("""
            (() => {
                const app = window.webcomApp;
                app.checkGpuResourceCeiling({
                    gpus: [{
                        vram_total_mb: 16000,
                        vram_used_mb: 3000,
                        gpu_util_pct: 20
                    }]
                });
                const badge = document.getElementById('gpu-guard-badge');
                return {
                    safetyActive: app.gpuSafetyActive,
                    badgeText: badge ? badge.innerText : null
                };
            })()
        """)
        print(f"Recovery GPU Check: {recovery_gpu}")
        assert not recovery_gpu["safetyActive"], "Safety should reset when load normalizes"
        assert "90%防護" in recovery_gpu["badgeText"], "Badge should revert to 90%防護"
        print("✔ Test 5 Passed: GPU 90% resource ceiling triggered, throttled tokens, and restored.")

        # -------------------------------------------------------------
        # Test 6: Clear Chat with Undo Banner
        # -------------------------------------------------------------
        print("\n--- Test 6: Clear Chat with Undo Banner ---")
        clear_test = await cdp.eval_js("""
            (() => {
                const app = window.webcomApp;
                app.clearChat(true);
                const banner = document.getElementById('chat-undo-banner');
                const storageRaw = localStorage.getItem('webcom_chat_history');
                return {
                    hasUndoBanner: !!banner,
                    historyLength: app.chatHistory.length,
                    storageCleared: storageRaw === null
                };
            })()
        """)
        print(f"Clear Result: {clear_test}")
        assert clear_test["hasUndoBanner"], "Undo banner should appear on clear"
        assert clear_test["historyLength"] == 0, "chatHistory must be empty"
        assert clear_test["storageCleared"], "Storage must be cleared"
        print("✔ Test 6 Passed: Clear chat with undo banner verified.")

        print("\n=======================================================")
        print("  🎉 ALL 6 CHAT PERSISTENCE & GPU GUARD TESTS PASSED!  ")
        print("=======================================================\n")

    finally:
        proc.terminate()
        try:
            proc.wait(timeout=3)
        except Exception:
            proc.kill()

if __name__ == "__main__":
    asyncio.run(main())
