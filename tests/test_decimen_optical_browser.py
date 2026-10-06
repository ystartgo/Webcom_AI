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
BASE_URL = "http://127.0.0.1:8001"

class BrowserCDP:
    def __init__(self, port=9235):
        self.port = port
        self.ws = None
        self.msg_id = 0
        self.proc = None
        self.logs = []

    async def connect(self, target_url):
        self.proc = subprocess.Popen([
            CHROME_PATH,
            f"--remote-debugging-port={self.port}",
            "--headless=new",
            "--disable-gpu",
            "--no-first-run",
            f"--user-data-dir=C:/temp/edge_profile_decimen_test_{int(time.time())}",
            target_url
        ])
        for _ in range(30):
            try:
                resp = urllib.request.urlopen(f"http://127.0.0.1:{self.port}/json").read()
                tabs = json.loads(resp)
                page_tab = next(t for t in tabs if t.get("type") == "page")
                self.ws = await websockets.connect(page_tab["webSocketDebuggerUrl"], max_size=50*1024*1024)
                await self.send("Runtime.enable")
                await self.send("Log.enable")
                return self.proc
            except Exception:
                await asyncio.sleep(0.5)
        raise RuntimeError("Failed to connect to browser CDP")

    async def send(self, method, params=None):
        self.msg_id += 1
        msg = {"id": self.msg_id, "method": method, "params": params or {}}
        await self.ws.send(json.dumps(msg))
        while True:
            res = json.loads(await self.ws.recv())
            if "method" in res and res["method"] in ["Runtime.consoleAPICalled", "Log.entryAdded"]:
                self.logs.append(res)
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

    async def close(self):
        if self.ws:
            await self.ws.close()
        if self.proc:
            self.proc.terminate()

async def run_tests():
    print("==================================================", flush=True)
    print("  Testing Decimen Optical Transfer in Browser     ", flush=True)
    print("==================================================", flush=True)
    cdp = BrowserCDP(9235)
    try:
        # Part 1: Console integration test
        print("\n--- 1. Testing Console App Library Integration ---", flush=True)
        await cdp.connect(f"{BASE_URL}/web/index.html")
        await asyncio.sleep(2.0)

        # Open App Library
        await cdp.eval_js("window.openAppLibraryModal();")
        await asyncio.sleep(0.5)

        # Find card and run in Sandbox
        run_res = await cdp.eval_js("""(() => {
            const cards = document.querySelectorAll('#app-lib-grid > div');
            const target = Array.from(cards).find(c => (c.querySelector('h3')?.innerText || '').includes('Decimen'));
            if (!target) return { error: 'Card not found' };
            const runBtn = target.querySelector('.btn-run-app');
            runBtn.click();
            
            const drawer = document.getElementById('artifact-drawer-modal');
            const isOpen = drawer && !drawer.classList.contains('hidden');
            const iframe = document.getElementById('drawer-artifact-iframe');
            const hasIframe = !!iframe && !iframe.classList.contains('hidden');
            const srcdocLen = iframe ? (iframe.srcdoc || '').length : 0;
            return {
                drawerOpen: isOpen,
                hasIframe,
                srcdocLen
            };
        })()""")
        print("Console Drawer Sandbox Test Result:", json.dumps(run_res, indent=2, ensure_ascii=False), flush=True)

        # Part 2: Standalone Functional Test
        print("\n--- 2. Testing Standalone App (decimen_optical.html) ---", flush=True)
        await cdp.eval_js(f"window.location.href = '{BASE_URL}/web/apps/decimen_optical.html'")
        await asyncio.sleep(2.0)

        title = await cdp.eval_js("document.title")
        print(f"App Page Loaded: '{title}'", flush=True)

        # Test 2.1: Sender Tab & QR Code Generation
        print("\n--- 2.1 Sender Mode: Fountain QR Packet Generation & Playback ---", flush=True)
        sender_res = await cdp.eval_js("""(() => {
            const textarea = document.getElementById('sender-text');
            textarea.value = "【Webcom AI 光學隔空傳輸驗證】這是一段透過高頻動態 QR Code 進行光學穿透傳輸的測試文字！1234567890 ABCDEFGHIJKLMNOPQRSTUVWXYZ !@#$%^&*() " +
                             "無須網路、藍牙或實體線路，透過螢幕連續播放噴泉編碼 QR 碼動態流與相機鏡頭接收，達成兩台設備間的光學無線傳輸！" +
                             "Decimen 演算法保證封包校驗與容錯無損還原。重複長度測試封包區塊一二三四五六七八九十。";
            
            // Trigger payload update and preview
            updateSenderPayloadMetrics();
            
            // Check pre-transmission state
            const payloadBytes = document.getElementById('sender-payload-size')?.innerText || '';
            const estSpeed = document.getElementById('sender-est-speed')?.innerText || '';
            const badgeBefore = document.getElementById('sender-status-badge')?.innerText || '';
            const qrBoxBefore = document.getElementById('sender-qr-container')?.innerHTML || '';
            const hasQrCanvasBefore = qrBoxBefore.includes('<canvas') || qrBoxBefore.includes('<img');

            // Start transmission
            startSenderTransmission();

            return {
                payloadBytes,
                estSpeed,
                badgeBefore,
                hasQrCanvasBefore,
                totalChunks: senderChunks.length,
                chunkSize: senderChunkSize,
                fps: senderFPS
            };
        })()""")
        print("Sender Setup & Generation:", json.dumps(sender_res, indent=2, ensure_ascii=False), flush=True)

        # Let sender play for 2.5 seconds to advance frames
        await asyncio.sleep(2.5)

        playback_stat = await cdp.eval_js("""(() => {
            const badge = document.getElementById('sender-status-badge')?.innerText || '';
            const frameStat = document.getElementById('sender-stat-frame')?.innerText || '';
            const progress = document.getElementById('sender-progress-fill')?.style?.width || '';
            const qrBox = document.getElementById('sender-qr-container')?.innerHTML || '';
            const hasCanvas = qrBox.includes('<canvas') || qrBox.includes('<img');
            const isPlaying = !!senderTimer;
            const currentIdx = senderCurrentIdx;

            // Pause
            pauseSenderTransmission();
            const isPlayingAfterPause = !!senderTimer;

            // Step forward
            stepSenderFrame(1);
            const idxAfterStepFwd = senderCurrentIdx;

            // Step backward
            stepSenderFrame(-1);
            const idxAfterStepBack = senderCurrentIdx;

            // Stop
            stopSenderTransmission();
            const badgeAfterStop = document.getElementById('sender-status-badge')?.innerText || '';
            const isPlayingAfterStop = !!senderTimer;

            return {
                badge,
                frameStat,
                progress,
                hasCanvas,
                isPlaying,
                currentIdx,
                isPlayingAfterPause,
                idxAfterStepFwd,
                idxAfterStepBack,
                badgeAfterStop,
                isPlayingAfterStop
            };
        })()""")
        print("Sender Playback, Pause, Stepping & Stop Test:", json.dumps(playback_stat, indent=2, ensure_ascii=False), flush=True)

        # Test 2.2: Receiver Tab UI Verification
        print("\n--- 2.2 Receiver Mode: Viewfinder & Matrix UI ---", flush=True)
        receiver_res = await cdp.eval_js("""(() => {
            switchTab('tab-receiver');
            const video = document.getElementById('receiver-video');
            const matrix = document.getElementById('receiver-chunk-matrix');
            const statusBadge = document.getElementById('receiver-status-badge')?.innerText || '';
            const btnCam = document.getElementById('btn-camera-toggle')?.innerText || '';
            return {
                hasVideo: !!video,
                hasMatrix: !!matrix,
                statusBadge,
                btnCam
            };
        })()""")
        print("Receiver Tab UI:", json.dumps(receiver_res, indent=2, ensure_ascii=False), flush=True)

        # Test 2.3: Loopback Self-Test (單機閉環自測)
        print("\n--- 2.3 Single-Device Loopback Self-Test (雙向閉環即時傳輸與拼裝解碼) ---", flush=True)
        loop_init = await cdp.eval_js("""(() => {
            switchTab('tab-loopback');
            const input = document.getElementById('loop-input');
            input.value = "🚀【Webcom AI 光學通訊實測】Decimen 隔空無損傳輸測試！" +
                          "這是一段跨越螢幕與鏡頭的光學動態 QR 資料流測試文本，包含中文字元、數字 1234567890、特殊符號 @#$%^&*()！" +
                          "透過動態分塊噴泉編碼（Fountain Codes），接收端在任意時刻切入皆可無損拼裝還原原始檔案與程式碼！" +
                          "校驗碼與分塊狀態矩陣視覺化全面驗證通過！";
            startLoopbackTest();
            return {
                testTextLen: input.value.length,
                totalChunks: loopChunks ? loopChunks.length : 0,
                started: true
            };
        })()""")
        print(f"Loopback Started with {loop_init['testTextLen']} chars, {loop_init['totalChunks']} packets.", flush=True)

        # Poll loopback progress
        test_success = False
        final_info = {}
        for second in range(1, 15):
            await asyncio.sleep(0.5)
            poll_res = await cdp.eval_js("""(() => {
                const badge = document.getElementById('loop-qr-badge')?.innerText || '';
                const senderStat = document.getElementById('loop-sender-stat')?.innerText || '';
                const receiverStat = document.getElementById('loop-receiver-stat')?.innerText || '';
                const speed = document.getElementById('loop-receiver-speed')?.innerText || '';
                const progress = document.getElementById('loop-progress-fill')?.style?.width || '';
                const resultBox = document.getElementById('loop-result-box');
                const isSuccessShown = resultBox && resultBox.style.display !== 'none';
                const successText = resultBox ? resultBox.innerText.trim() : '';
                const receivedCount = loopReceived ? loopReceived.size : 0;
                const totalChunks = loopChunks ? loopChunks.length : 0;
                
                return {
                    badge,
                    senderStat,
                    receiverStat,
                    speed,
                    progress,
                    isSuccessShown,
                    successText,
                    receivedCount,
                    totalChunks
                };
            })()""")
            print(f"  [T+{second}s] Emitter: {poll_res['badge']} | Receiver: {poll_res['receiverStat']} | Progress: {poll_res['progress']} | Speed: {poll_res['speed']}", flush=True)
            if poll_res['isSuccessShown']:
                test_success = True
                final_info = poll_res
                break

        print("\n==================================================", flush=True)
        if test_success:
            print("  >>> LOOPBACK OPTICAL TRANSMISSION: PASSED! <<<", flush=True)
            print(f"  Result Banner: {final_info['successText']}", flush=True)
            print(f"  All {final_info['receivedCount']} / {final_info['totalChunks']} packets successfully transferred & reassembled!", flush=True)
        else:
            print("  >>> LOOPBACK OPTICAL TRANSMISSION: TIMED OUT! <<<", flush=True)
        print("==================================================", flush=True)

        # Check console logs for errors
        console_errors = [l for l in cdp.logs if l.get('params', {}).get('type') == 'error' or l.get('params', {}).get('entry', {}).get('level') == 'error']
        # Filter out harmless 404 favicon
        real_errors = [e for e in console_errors if 'favicon' not in str(e)]
        print(f"\nJavaScript Console Error Check: {len(real_errors)} errors detected.")
        if real_errors:
            print("Errors:", json.dumps(real_errors, indent=2, ensure_ascii=False), flush=True)
        else:
            print("Zero JavaScript / Runtime errors detected across all tested modes!", flush=True)

    finally:
        await cdp.close()

if __name__ == "__main__":
    asyncio.run(run_tests())
