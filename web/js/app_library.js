// ================================================================
// Webcom AI - App Library (Custom Apps & Sandbox) Module
// Author: startgo (startgo@yia.app) | License: GPLv3
// ================================================================

(function () {
    const APPS_STORAGE_KEY = 'webcom_custom_apps_v2';
    let currentFilterCat = 'all';
    let appToDeleteId = null;

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function getStarterTemplateForCategory(cat) {
        switch (cat) {
            case 'py':
                return `# Python Fibonacci Sequence Generator\ndef fib(n):\n    a, b = 0, 1\n    res = []\n    for _ in range(n):\n        res.append(a)\n        a, b = b, a + b\n    return res\n\nnums = fib(25)\nprint("Fibonacci (First 25 items):")\nfor i, val in enumerate(nums, 1):\n    print(f"[{i:02d}]: {val}")\n`;
            case 'sh':
                return `@echo off\necho ======================================\necho Webcom AI - Shell / Batch Runner\necho Current Directory: %CD%\necho ======================================\ndir /b\n`;
            case 'json':
                return `{\n  "appName": "示範資料集",\n  "version": "1.0.0",\n  "status": "active",\n  "records": [\n    { "id": 1, "title": "Data Record 1", "score": 98.5 },\n    { "id": 2, "title": "Data Record 2", "score": 92.0 }\n  ]\n}\n`;
            case 'prompt':
                return `你是一位專業的高級全端架構師與 Python 專家。\n請遵循精確、安全、高效與清晰的原則回答問題，提供具體可執行的程式範例與解法。\n`;
            case 'html':
            default:
                return `<!DOCTYPE html>\n<html>\n<head>\n  <meta charset="utf-8">\n  <title>自訂小工具</title>\n  <style>\n    body { font-family: sans-serif; background: #0f172a; color: white; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }\n    .card { background: #1e293b; padding: 2rem; border-radius: 1rem; text-align: center; border: 1px solid #334155; shadow: 0 10px 25px rgba(0,0,0,0.5); }\n    button { background: #6366f1; color: white; border: none; padding: 0.5rem 1.2rem; border-radius: 0.5rem; cursor: pointer; font-weight: bold; }\n    button:hover { background: #4f46e5; }\n  </style>\n</head>\n<body>\n  <div class="card">\n    <h2>⚡ 自建應用程式</h2>\n    <p>純前端沙箱執行成功！</p>\n    <button onclick="alert('點擊成功！')">測試互動</button>\n  </div>\n</body>\n</html>`;
        }
    }

    function getCurrentLang() {
        return window.currentLang || (window.webcomApp && window.webcomApp.currentLang) || 'zh-TW';
    }

    const KNOWN_TRANSLATIONS = {
        '番茄工作法極簡專注計時器': {
            titleEn: 'Pomodoro Focus Timer',
            descriptionEn: 'Minimalist Pomodoro timer with 25m work, 5m break, running 100% locally in sandbox.'
        },
        'JSON 格式化與美化工具': {
            titleEn: 'JSON Formatter & Beautifier',
            descriptionEn: 'Client-side lossless JSON formatting, validation, and minification with one-click copy.'
        },
        'Decimen 光學隔空傳輸': {
            titleEn: 'Decimen Optical Transfer',
            descriptionEn: 'Air-gapped file & text transfer using only a screen and a camera with animated QR codes. No internet, bluetooth or cables required.'
        },
        'Python 數列生成與視覺化': {
            titleEn: 'Python Fibonacci Generator',
            descriptionEn: 'Compute and visualize Fibonacci sequence using Pyodide in-browser WASM.'
        }
    };

    function getSampleCustomApps() {
        return [
            {
                id: 'app_decimen_optical',
                title: 'Decimen 光學隔空傳輸',
                titleEn: 'Decimen Optical Transfer',
                category: 'html',
                description: '無須網路、藍牙或實體線路，透過螢幕連續播放噴泉編碼 QR 碼動態流與相機鏡頭接收，達成兩台設備間的光學無線傳輸 (支援單機迴圈自測、檔案還原與校驗)。',
                descriptionEn: 'Air-gapped file & text transfer using only a screen and a camera with animated QR codes. No internet, bluetooth or cables required.',
                author: 'Evan Crawley / Decimen',
                icon: '📡',
                version: 'v1.0',
                createdAt: new Date().toISOString(),
                code: `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Decimen 光學隔空傳輸 (Decimen Optical Transfer)</title>
  <style>
    :root {
      --bg: #090d16;
      --card: #111827;
      --border: #1f293d;
      --accent: #06b6d4;
      --accent-glow: rgba(6, 182, 212, 0.3);
      --success: #10b981;
      --warning: #f59e0b;
      --danger: #ef4444;
      --text: #f1f5f9;
      --muted: #94a3b8;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    header {
      background: rgba(17, 24, 39, 0.95);
      border-bottom: 1px solid var(--border);
      padding: 0.75rem 1.25rem;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      position: sticky;
      top: 0;
      z-index: 50;
      backdrop-filter: blur(8px);
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }
    .brand-icon {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: linear-gradient(135deg, #06b6d4, #3b82f6);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.1rem;
      box-shadow: 0 0 15px var(--accent-glow);
    }
    .brand-title {
      font-size: 1rem;
      font-weight: 700;
      color: #fff;
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }
    .badge-offline {
      font-size: 0.7rem;
      padding: 0.15rem 0.5rem;
      border-radius: 999px;
      background: rgba(16, 185, 129, 0.15);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.3);
      font-weight: 600;
    }
    .nav-tabs {
      display: flex;
      background: #0b1120;
      padding: 0.25rem;
      border-radius: 0.6rem;
      border: 1px solid var(--border);
      gap: 0.25rem;
    }
    .nav-btn {
      padding: 0.4rem 0.9rem;
      font-size: 0.8rem;
      font-weight: 600;
      border-radius: 0.45rem;
      border: none;
      background: transparent;
      color: var(--muted);
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }
    .nav-btn:hover { color: #fff; }
    .nav-btn.active {
      background: linear-gradient(135deg, #0284c7, #06b6d4);
      color: #fff;
      box-shadow: 0 2px 8px rgba(6, 182, 212, 0.4);
    }
    main {
      flex: 1;
      padding: 1.25rem;
      max-width: 1200px;
      margin: 0 auto;
      width: 100%;
    }
    .tab-content { display: none; }
    .tab-content.active {
      display: block;
      animation: fadeIn 0.25s ease-out;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(4px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .panel {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 1rem;
      padding: 1.25rem;
      margin-bottom: 1.25rem;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
    }
    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
      border-bottom: 1px solid var(--border);
      padding-bottom: 0.75rem;
    }
    .panel-title {
      font-size: 0.95rem;
      font-weight: 700;
      color: #e2e8f0;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.25rem;
    }
    @media (max-width: 840px) {
      .grid-2 { grid-template-columns: 1fr; }
    }
    label {
      display: block;
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--muted);
      margin-bottom: 0.35rem;
    }
    textarea, input[type="text"] {
      width: 100%;
      background: #090e17;
      border: 1px solid var(--border);
      border-radius: 0.6rem;
      padding: 0.65rem;
      color: #fff;
      font-family: monospace;
      font-size: 0.8rem;
      outline: none;
      transition: border-color 0.2s;
    }
    textarea:focus, input[type="text"]:focus {
      border-color: var(--accent);
    }
    .btn {
      padding: 0.5rem 1rem;
      font-size: 0.8rem;
      font-weight: 600;
      border-radius: 0.5rem;
      border: none;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.4rem;
      transition: all 0.2s;
    }
    .btn-primary {
      background: linear-gradient(135deg, #0284c7, #06b6d4);
      color: #fff;
      box-shadow: 0 4px 12px rgba(6, 182, 212, 0.3);
    }
    .btn-primary:hover {
      filter: brightness(1.1);
      transform: translateY(-1px);
    }
    .btn-secondary {
      background: #1e293b;
      color: #cbd5e1;
      border: 1px solid var(--border);
    }
    .btn-secondary:hover {
      background: #334155;
      color: #fff;
    }
    .btn-success {
      background: linear-gradient(135deg, #059669, #10b981);
      color: #fff;
    }
    .btn-danger {
      background: #ef4444;
      color: #fff;
    }
    .qr-frame-box {
      background: #ffffff;
      padding: 16px;
      border-radius: 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      box-shadow: 0 12px 35px rgba(0, 0, 0, 0.6);
      width: 280px;
      height: 280px;
      margin: 0 auto;
      position: relative;
    }
    .qr-frame-box canvas, .qr-frame-box img {
      width: 248px !important;
      height: 248px !important;
      image-rendering: pixelated;
    }
    .qr-overlay-badge {
      position: absolute;
      bottom: 8px;
      background: rgba(15, 23, 42, 0.92);
      color: #38bdf8;
      font-family: monospace;
      font-size: 0.75rem;
      font-weight: 700;
      padding: 0.2rem 0.65rem;
      border-radius: 999px;
      border: 1px solid #38bdf8;
      box-shadow: 0 2px 6px rgba(0,0,0,0.5);
    }
    .video-viewport {
      width: 100%;
      height: 280px;
      background: #000;
      border-radius: 16px;
      border: 1px solid var(--border);
      position: relative;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    #receiver-video {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .scan-reticle {
      position: absolute;
      width: 200px;
      height: 200px;
      border: 2px dashed rgba(6, 182, 212, 0.85);
      border-radius: 12px;
      box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.45);
      pointer-events: none;
    }
    .scan-laser {
      position: absolute;
      width: 100%;
      height: 2px;
      background: linear-gradient(90deg, transparent, #06b6d4, transparent);
      box-shadow: 0 0 10px #06b6d4;
      animation: scanMove 2s infinite ease-in-out;
    }
    @keyframes scanMove {
      0% { top: 0%; opacity: 0.2; }
      50% { top: 98%; opacity: 1; }
      100% { top: 0%; opacity: 0.2; }
    }
    .chunk-matrix {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(14px, 1fr));
      gap: 3px;
      background: #090e17;
      padding: 0.6rem;
      border-radius: 0.6rem;
      border: 1px solid var(--border);
      max-height: 120px;
      overflow-y: auto;
    }
    .chunk-dot {
      aspect-ratio: 1;
      border-radius: 3px;
      background: #1e293b;
      transition: background 0.15s, transform 0.15s;
    }
    .chunk-dot.received {
      background: #10b981;
      box-shadow: 0 0 6px rgba(16, 185, 129, 0.6);
      transform: scale(1.05);
    }
    .progress-bar {
      height: 8px;
      background: #1e293b;
      border-radius: 999px;
      overflow: hidden;
      margin: 0.5rem 0;
    }
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #06b6d4, #10b981);
      width: 0%;
      transition: width 0.2s ease-out;
    }
    .stat-row {
      display: flex;
      justify-content: space-between;
      font-size: 0.75rem;
      color: var(--muted);
      margin-top: 0.25rem;
      font-family: monospace;
    }
    .dropzone {
      border: 2px dashed var(--border);
      border-radius: 0.8rem;
      padding: 1.5rem;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s;
      background: rgba(17, 24, 39, 0.4);
    }
    .dropzone:hover, .dropzone.dragover {
      border-color: var(--accent);
      background: rgba(6, 182, 212, 0.05);
    }
  </style>
</head>
<body>

  <!-- Top App Header -->
  <header>
    <div class="brand">
      <div class="brand-icon">📡</div>
      <div>
        <div class="brand-title">
          <span>Decimen 光學隔空傳輸</span>
          <span class="badge-offline">🛡️ 100% 離線純光學</span>
        </div>
        <div style="font-size: 0.7rem; color: var(--muted);">基於噴泉編碼 (Fountain Coding) 之螢幕 ↔ 鏡頭 QR 資料流</div>
      </div>
    </div>

    <!-- Navigation Modes -->
    <div class="nav-tabs">
      <button class="nav-btn active" id="tab-btn-sender" onclick="switchTab('sender')">📤 發送端 (Sender)</button>
      <button class="nav-btn" id="tab-btn-receiver" onclick="switchTab('receiver')">📥 接收端 (Receiver)</button>
      <button class="nav-btn" id="tab-btn-loopback" onclick="switchTab('loopback')">🔄 雙向自測 (Demo)</button>
    </div>
  </header>

  <main>
    <!-- TAB 1: SENDER -->
    <div id="tab-sender" class="tab-content active">
      <div class="grid-2">
        <!-- Left: Payload Input & Configuration -->
        <div class="panel">
          <div class="panel-header">
            <span class="panel-title">📝 傳輸資料設定</span>
            <span id="sender-payload-size" style="font-size: 0.75rem; color: var(--accent); font-family: monospace;">0 Bytes</span>
          </div>

          <div style="display: flex; gap: 0.5rem; margin-bottom: 0.75rem;">
            <button type="button" class="btn btn-secondary" style="flex: 1;" onclick="setSenderInputMode('text')">純文字 / 筆記</button>
            <button type="button" class="btn btn-secondary" style="flex: 1;" onclick="setSenderInputMode('file')">檔案上傳</button>
          </div>

          <!-- Text Mode Input -->
          <div id="sender-input-text-group">
            <label>傳輸內容 (支援任意文字、Markdown、程式碼或 JSON)：</label>
            <textarea id="sender-text" rows="6" placeholder="輸入或貼上要光學傳輸的文字內容..."></textarea>
            <div style="margin-top: 0.4rem; display: flex; justify-content: flex-end; gap: 0.4rem;">
              <button type="button" class="btn btn-secondary" style="font-size: 0.7rem;" onclick="loadSampleText()">載入示範文字</button>
            </div>
          </div>

          <!-- File Mode Input -->
          <div id="sender-input-file-group" style="display: none;">
            <label>選擇或拖放檔案：</label>
            <div class="dropzone" id="sender-dropzone" onclick="document.getElementById('sender-file-input').click()">
              <div style="font-size: 1.5rem; margin-bottom: 0.3rem;">📁</div>
              <div style="font-size: 0.8rem; font-weight: 600;">點擊或拖放檔案至此</div>
              <div style="font-size: 0.7rem; color: var(--muted);">支援圖片、文字、PDF、壓縮檔等任意格式 (建議 < 500KB)</div>
            </div>
            <input type="file" id="sender-file-input" style="display: none;" onchange="handleSenderFileSelect(this.files)">
            <div id="sender-file-info" style="margin-top: 0.5rem; font-size: 0.75rem; color: #38bdf8; font-family: monospace; display: none;"></div>
          </div>

          <!-- Tuning Controls -->
          <div style="margin-top: 1rem; border-top: 1px solid var(--border); padding-top: 0.75rem;">
            <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--muted); margin-bottom: 0.25rem;">
              <span>每幀分塊大小 (Chunk Size)：<strong id="sender-chunk-val" style="color: #fff;">180 字元</strong></span>
              <span style="font-size: 0.7rem;">(鏡頭解析度低時建議縮小)</span>
            </div>
            <input type="range" id="sender-chunk-range" min="80" max="380" step="20" value="180" style="width: 100%; accent-color: var(--accent);" oninput="updateSenderChunkSize(this.value)">

            <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--muted); margin-top: 0.6rem; margin-bottom: 0.25rem;">
              <span>傳輸幀率 (FPS)：<strong id="sender-fps-val" style="color: #fff;">8 FPS</strong></span>
              <span id="sender-est-speed" style="color: #34d399; font-family: monospace;">~1.4 KB/s</span>
            </div>
            <input type="range" id="sender-fps-range" min="3" max="20" step="1" value="8" style="width: 100%; accent-color: var(--accent);" oninput="updateSenderFPS(this.value)">

            <div style="margin-top: 0.8rem; display: flex; align-items: center; justify-content: space-between;">
              <label style="display: flex; align-items: center; gap: 0.4rem; cursor: pointer; margin: 0;">
                <input type="checkbox" id="sender-loop-checkbox" checked style="accent-color: var(--accent);">
                <span>無限循環發送 (噴泉機制，接收端隨時可中途加入)</span>
              </label>
            </div>
          </div>

          <!-- Buttons -->
          <div style="margin-top: 1.25rem; display: flex; gap: 0.5rem;">
            <button type="button" id="btn-sender-start" class="btn btn-primary" style="flex: 1;" onclick="startSenderTransmission()">▶ 開始光學播放</button>
            <button type="button" id="btn-sender-pause" class="btn btn-secondary" onclick="pauseSenderTransmission()" disabled>⏸ 暫停</button>
            <button type="button" id="btn-sender-stop" class="btn btn-danger" onclick="stopSenderTransmission()" disabled>⏹ 停止</button>
          </div>
        </div>

        <!-- Right: Animated Optical Emitter QR Display -->
        <div class="panel" style="display: flex; flex-direction: column; align-items: center; justify-content: center;">
          <div class="panel-header" style="width: 100%;">
            <span class="panel-title">💡 光學發射螢幕 (Optical Emitter)</span>
            <span id="sender-status-badge" style="font-size: 0.7rem; font-family: monospace; padding: 0.15rem 0.5rem; border-radius: 4px; background: #1e293b; color: #94a3b8;">就緒</span>
          </div>

          <!-- QR Container -->
          <div class="qr-frame-box">
            <div id="sender-qr-container"></div>
            <div id="sender-qr-badge" class="qr-overlay-badge">等待傳輸中...</div>
          </div>

          <!-- Frame Stats & Stepper -->
          <div style="width: 100%; max-width: 320px; margin-top: 1rem;">
            <div class="progress-bar">
              <div id="sender-progress-fill" class="progress-fill"></div>
            </div>
            <div class="stat-row">
              <span id="sender-stat-frame">幀: 0 / 0</span>
              <span id="sender-stat-percent">0%</span>
            </div>
            <div class="stat-row" style="margin-top: 0.5rem; justify-content: center; gap: 0.75rem;">
              <button type="button" class="btn btn-secondary" style="padding: 0.2rem 0.6rem; font-size: 0.75rem;" onclick="stepSenderFrame(-1)">⏮ 上一幀</button>
              <button type="button" class="btn btn-secondary" style="padding: 0.2rem 0.6rem; font-size: 0.75rem;" onclick="stepSenderFrame(1)">下一幀 ⏭</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 2: RECEIVER -->
    <div id="tab-receiver" class="tab-content">
      <div class="grid-2">
        <!-- Left: Camera Viewfinder & Controls -->
        <div class="panel">
          <div class="panel-header">
            <span class="panel-title">📷 光學鏡頭取景 (Optical Receiver)</span>
            <span id="receiver-status-badge" style="font-size: 0.7rem; font-family: monospace; padding: 0.15rem 0.5rem; border-radius: 4px; background: #1e293b; color: #94a3b8;">相機未啟動</span>
          </div>

          <!-- Video Viewport -->
          <div class="video-viewport">
            <video id="receiver-video" playsinline muted autoplay></video>
            <div class="scan-reticle">
              <div class="scan-laser"></div>
            </div>
            <div id="camera-placeholder" style="position: absolute; text-align: center; color: var(--muted); font-size: 0.8rem; padding: 1rem;">
              <div style="font-size: 2rem; margin-bottom: 0.5rem;">📸</div>
              點擊下方「開啟相機」對準發送端螢幕
              <div id="camera-error-msg" style="margin-top: 0.5rem; font-size: 0.7rem; color: #f87171; display: none;"></div>
            </div>
          </div>
          <canvas id="receiver-hidden-canvas" style="display: none;"></canvas>

          <!-- Camera Controls -->
          <div style="margin-top: 1rem; display: flex; gap: 0.5rem;">
            <button type="button" id="btn-camera-toggle" class="btn btn-primary" style="flex: 1;" onclick="toggleReceiverCamera()">📷 開啟相機</button>
            <button type="button" class="btn btn-secondary" onclick="switchCameraFacing()">🔄 切換鏡頭</button>
          </div>
        </div>

        <!-- Right: Assembly Progress & Reconstructed Payload -->
        <div class="panel">
          <div class="panel-header">
            <span class="panel-title">🧩 分塊拼裝矩陣 (Packet Matrix)</span>
            <span id="receiver-telemetry" style="font-size: 0.75rem; color: #10b981; font-family: monospace;">等待信號...</span>
          </div>

          <!-- Progress -->
          <div>
            <div class="progress-bar">
              <div id="receiver-progress-fill" class="progress-fill"></div>
            </div>
            <div class="stat-row">
              <span id="receiver-stat-chunks">接收進度: 0 / 0 幀</span>
              <span id="receiver-stat-percent">0%</span>
            </div>
          </div>

          <!-- Chunk Matrix Visualizer -->
          <label style="margin-top: 0.75rem;">封包接收矩陣 (綠色代表已獲取)：</label>
          <div id="receiver-chunk-matrix" class="chunk-matrix">
            <span style="font-size: 0.7rem; color: var(--muted); grid-column: 1/-1; text-align: center; padding: 0.5rem;">尚未偵測到 Decimen 傳輸信號</span>
          </div>

          <!-- Metrics -->
          <div style="background: #090e17; border: 1px solid var(--border); border-radius: 0.6rem; padding: 0.6rem; margin-top: 0.75rem; font-size: 0.75rem; font-family: monospace; display: grid; grid-template-columns: 1fr 1fr; gap: 0.4rem;">
            <div>傳輸耗時: <span id="metric-time" style="color: #fff;">0.0 s</span></div>
            <div>傳輸速率: <span id="metric-speed" style="color: #38bdf8;">0.0 KB/s</span></div>
            <div>重複/遺漏幀: <span id="metric-redundant" style="color: #f59e0b;">0</span></div>
            <div>校驗狀態: <span id="metric-crc" style="color: #94a3b8;">待驗證</span></div>
          </div>

          <!-- Reconstructed Output Card (Shown when completed) -->
          <div id="receiver-result-box" style="margin-top: 1rem; border-top: 1px solid var(--border); padding-top: 0.75rem; display: none;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem;">
              <span style="font-size: 0.85rem; font-weight: 700; color: #34d399; display: flex; align-items: center; gap: 0.3rem;">
                <span>🎉</span> <span id="result-title">檔案接收完成！</span>
              </span>
              <span id="result-filename" style="font-size: 0.75rem; color: #38bdf8; font-family: monospace;"></span>
            </div>

            <!-- Preview Container -->
            <div id="result-preview" style="background: #090e17; border: 1px solid var(--border); border-radius: 0.6rem; padding: 0.6rem; max-height: 140px; overflow-y: auto; font-family: monospace; font-size: 0.75rem; color: #e2e8f0; white-space: pre-wrap; word-break: break-all; margin-bottom: 0.75rem;"></div>

            <!-- Action Buttons -->
            <div style="display: flex; gap: 0.5rem;">
              <button type="button" id="btn-copy-result" class="btn btn-secondary" style="flex: 1;" onclick="copyReceiverResult()">📋 複製內容</button>
              <button type="button" id="btn-download-result" class="btn btn-success" style="flex: 1;" onclick="downloadReceiverResult()">💾 下載檔案</button>
              <button type="button" class="btn btn-secondary" onclick="resetReceiverState()">🔄 清空重置</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 3: LOOPBACK DEMO -->
    <div id="tab-loopback" class="tab-content">
      <div class="panel">
        <div class="panel-header">
          <span class="panel-title">🔄 單機光學閉環自測 (Loopback Emitter ↔ Receiver Simulator)</span>
          <span class="badge-offline">無需第二台設備，左側生成 QR 右側即時解碼</span>
        </div>
        <p style="font-size: 0.8rem; color: var(--muted); margin-bottom: 1rem; line-height: 1.5;">
          此模式專為在單一螢幕上驗證 Decimen 噴泉 QR 資料流與分塊拼裝邏輯而設計。左側光學發射器快速切換 QR 碼，右側解碼核心在背景以 60 FPS 掃描並拼裝，讓您親眼目睹光學通訊全過程！
        </p>

        <div style="display: flex; gap: 0.75rem; align-items: center; margin-bottom: 1.25rem;">
          <input type="text" id="loop-input" value="⚡ Webcom AI x Decimen 光學隔空傳輸成功！無需藍牙與網路，螢幕對鏡頭無損還原檔案與代碼！" placeholder="輸入自測文字...">
          <button type="button" id="btn-loop-start" class="btn btn-primary" style="white-space: nowrap;" onclick="startLoopbackTest()">🚀 開始自測傳輸</button>
          <button type="button" id="btn-loop-stop" class="btn btn-danger" style="white-space: nowrap;" onclick="stopLoopbackTest()" disabled>⏹ 停止</button>
        </div>

        <div class="grid-2">
          <!-- Left: Loop Sender -->
          <div style="background: #090e17; border: 1px solid var(--border); border-radius: 12px; padding: 1rem; text-align: center;">
            <div style="font-size: 0.8rem; font-weight: 700; color: #38bdf8; margin-bottom: 0.75rem;">1. 螢幕光學發射 (Emitter)</div>
            <div class="qr-frame-box" style="margin: 0 auto; width: 230px; height: 230px;">
              <div id="loop-qr-container"></div>
              <div id="loop-qr-badge" class="qr-overlay-badge">就緒</div>
            </div>
            <div style="margin-top: 0.75rem; font-size: 0.75rem; font-family: monospace; color: var(--muted);" id="loop-sender-stat">幀數: 0 / 0</div>
          </div>

          <!-- Right: Loop Receiver -->
          <div style="background: #090e17; border: 1px solid var(--border); border-radius: 12px; padding: 1rem;">
            <div style="font-size: 0.8rem; font-weight: 700; color: #34d399; margin-bottom: 0.75rem;">2. 鏡頭解碼拼裝 (Receiver)</div>
            <div class="progress-bar">
              <div id="loop-progress-fill" class="progress-fill"></div>
            </div>
            <div class="stat-row" style="margin-bottom: 0.5rem;">
              <span id="loop-receiver-stat">拼裝進度: 0 / 0</span>
              <span id="loop-receiver-speed">0.0 KB/s</span>
            </div>
            <div id="loop-chunk-matrix" class="chunk-matrix" style="max-height: 80px;"></div>
            <div id="loop-result-box" style="margin-top: 0.75rem; padding: 0.6rem; border-radius: 8px; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); font-size: 0.75rem; font-family: monospace; color: #34d399; display: none;">
              ✔ 自測接收成功！還原內容完美匹配。
            </div>
          </div>
        </div>
      </div>
    </div>
  </main>

  <!-- ============================================================ -->
  <!-- Embedded Offline QRCode.js Engine (Zero External Dependencies) -->
  <!-- ============================================================ -->
  <script>
var QRCode;!function(){function a(a){this.mode=c.MODE_8BIT_BYTE,this.data=a,this.parsedData=[];for(var b=[],d=0,e=this.data.length;e>d;d++){var f=this.data.charCodeAt(d);f>65536?(b[0]=240|(1835008&f)>>>18,b[1]=128|(258048&f)>>>12,b[2]=128|(4032&f)>>>6,b[3]=128|63&f):f>2048?(b[0]=224|(61440&f)>>>12,b[1]=128|(4032&f)>>>6,b[2]=128|63&f):f>128?(b[0]=192|(1984&f)>>>6,b[1]=128|63&f):b[0]=f,this.parsedData=this.parsedData.concat(b)}this.parsedData.length!=this.data.length&&(this.parsedData.unshift(191),this.parsedData.unshift(187),this.parsedData.unshift(239))}function b(a,b){this.typeNumber=a,this.errorCorrectLevel=b,this.modules=null,this.moduleCount=0,this.dataCache=null,this.dataList=[]}function i(a,b){if(void 0==a.length)throw new Error(a.length+"/"+b);for(var c=0;c<a.length&&0==a[c];)c++;this.num=new Array(a.length-c+b);for(var d=0;d<a.length-c;d++)this.num[d]=a[d+c]}function j(a,b){this.totalCount=a,this.dataCount=b}function k(){this.buffer=[],this.length=0}function m(){return"undefined"!=typeof CanvasRenderingContext2D}function n(){var a=!1,b=navigator.userAgent;return/android/i.test(b)&&(a=!0,aMat=b.toString().match(/android ([0-9]\\.[0-9])/i),aMat&&aMat[1]&&(a=parseFloat(aMat[1]))),a}function r(a,b){for(var c=1,e=s(a),f=0,g=l.length;g>=f;f++){var h=0;switch(b){case d.L:h=l[f][0];break;case d.M:h=l[f][1];break;case d.Q:h=l[f][2];break;case d.H:h=l[f][3]}if(h>=e)break;c++}if(c>l.length)throw new Error("Too long data");return c}function s(a){var b=encodeURI(a).toString().replace(/\\%[0-9a-fA-F]{2}/g,"a");return b.length+(b.length!=a?3:0)}a.prototype={getLength:function(){return this.parsedData.length},write:function(a){for(var b=0,c=this.parsedData.length;c>b;b++)a.put(this.parsedData[b],8)}},b.prototype={addData:function(b){var c=new a(b);this.dataList.push(c),this.dataCache=null},isDark:function(a,b){if(0>a||this.moduleCount<=a||0>b||this.moduleCount<=b)throw new Error(a+","+b);return this.modules[a][b]},getModuleCount:function(){return this.moduleCount},make:function(){this.makeImpl(!1,this.getBestMaskPattern())},makeImpl:function(a,c){this.moduleCount=4*this.typeNumber+17,this.modules=new Array(this.moduleCount);for(var d=0;d<this.moduleCount;d++){this.modules[d]=new Array(this.moduleCount);for(var e=0;e<this.moduleCount;e++)this.modules[d][e]=null}this.setupPositionProbePattern(0,0),this.setupPositionProbePattern(this.moduleCount-7,0),this.setupPositionProbePattern(0,this.moduleCount-7),this.setupPositionAdjustPattern(),this.setupTimingPattern(),this.setupTypeInfo(a,c),this.typeNumber>=7&&this.setupTypeNumber(a),null==this.dataCache&&(this.dataCache=b.createData(this.typeNumber,this.errorCorrectLevel,this.dataList)),this.mapData(this.dataCache,c)},setupPositionProbePattern:function(a,b){for(var c=-1;7>=c;c++)if(!(-1>=a+c||this.moduleCount<=a+c))for(var d=-1;7>=d;d++)-1>=b+d||this.moduleCount<=b+d||(this.modules[a+c][b+d]=c>=0&&6>=c&&(0==d||6==d)||d>=0&&6>=d&&(0==c||6==c)||c>=2&&4>=c&&d>=2&&4>=d?!0:!1)},getBestMaskPattern:function(){for(var a=0,b=0,c=0;8>c;c++){this.makeImpl(!0,c);var d=f.getLostPoint(this);(0==c||a>d)&&(a=d,b=c)}return b},createMovieClip:function(a,b,c){var d=a.createEmptyMovieClip(b,c),e=1;this.make();for(var f=0;f<this.modules.length;f++)for(var g=f*e,h=0;h<this.modules[f].length;h++){var i=h*e,j=this.modules[f][h];j&&(d.beginFill(0,100),d.moveTo(i,g),d.lineTo(i+e,g),d.lineTo(i+e,g+e),d.lineTo(i,g+e),d.endFill())}return d},setupTimingPattern:function(){for(var a=8;a<this.moduleCount-8;a++)null==this.modules[a][6]&&(this.modules[a][6]=0==a%2);for(var b=8;b<this.moduleCount-8;b++)null==this.modules[6][b]&&(this.modules[6][b]=0==b%2)},setupPositionAdjustPattern:function(){for(var a=f.getPatternPosition(this.typeNumber),b=0;b<a.length;b++)for(var c=0;c<a.length;c++){var d=a[b],e=a[c];if(null==this.modules[d][e])for(var g=-2;2>=g;g++)for(var h=-2;2>=h;h++)this.modules[d+g][e+h]=-2==g||2==g||-2==h||2==h||0==g&&0==h?!0:!1}},setupTypeNumber:function(a){for(var b=f.getBCHTypeNumber(this.typeNumber),c=0;18>c;c++){var d=!a&&1==(1&b>>c);this.modules[Math.floor(c/3)][c%3+this.moduleCount-8-3]=d}for(var c=0;18>c;c++){var d=!a&&1==(1&b>>c);this.modules[c%3+this.moduleCount-8-3][Math.floor(c/3)]=d}},setupTypeInfo:function(a,b){for(var c=this.errorCorrectLevel<<3|b,d=f.getBCHTypeInfo(c),e=0;15>e;e++){var g=!a&&1==(1&d>>e);6>e?this.modules[e][8]=g:8>e?this.modules[e+1][8]=g:this.modules[this.moduleCount-15+e][8]=g}for(var e=0;15>e;e++){var g=!a&&1==(1&d>>e);8>e?this.modules[8][this.moduleCount-e-1]=g:9>e?this.modules[8][15-e-1+1]=g:this.modules[8][15-e-1]=g}this.modules[this.moduleCount-8][8]=!a},mapData:function(a,b){for(var c=-1,d=this.moduleCount-1,e=7,g=0,h=this.moduleCount-1;h>0;h-=2)for(6==h&&h--;;){for(var i=0;2>i;i++)if(null==this.modules[d][h-i]){var j=!1;g<a.length&&(j=1==(1&a[g]>>>e));var k=f.getMask(b,d,h-i);k&&(j=!j),this.modules[d][h-i]=j,e--,-1==e&&(g++,e=7)}if(d+=c,0>d||this.moduleCount<=d){d-=c,c=-c;break}}}},b.PAD0=236,b.PAD1=17,b.createData=function(a,c,d){for(var e=j.getRSBlocks(a,c),g=new k,h=0;h<d.length;h++){var i=d[h];g.put(i.mode,4),g.put(i.getLength(),f.getLengthInBits(i.mode,a)),i.write(g)}for(var l=0,h=0;h<e.length;h++)l+=e[h].dataCount;if(g.getLengthInBits()>8*l)throw new Error("code length overflow. ("+g.getLengthInBits()+">"+8*l+")");for(g.getLengthInBits()+4<=8*l&&g.put(0,4);0!=g.getLengthInBits()%8;)g.putBit(!1);for(;;){if(g.getLengthInBits()>=8*l)break;if(g.put(b.PAD0,8),g.getLengthInBits()>=8*l)break;g.put(b.PAD1,8)}return b.createBytes(g,e)},b.createBytes=function(a,b){for(var c=0,d=0,e=0,g=new Array(b.length),h=new Array(b.length),j=0;j<b.length;j++){var k=b[j].dataCount,l=b[j].totalCount-k;d=Math.max(d,k),e=Math.max(e,l),g[j]=new Array(k);for(var m=0;m<g[j].length;m++)g[j][m]=255&a.buffer[m+c];c+=k;var n=f.getErrorCorrectPolynomial(l),o=new i(g[j],n.getLength()-1),p=o.mod(n);h[j]=new Array(n.getLength()-1);for(var m=0;m<h[j].length;m++){var q=m+p.getLength()-h[j].length;h[j][m]=q>=0?p.get(q):0}}for(var r=0,m=0;m<b.length;m++)r+=b[m].totalCount;for(var s=new Array(r),t=0,m=0;d>m;m++)for(var j=0;j<b.length;j++)m<g[j].length&&(s[t++]=g[j][m]);for(var m=0;e>m;m++)for(var j=0;j<b.length;j++)m<h[j].length&&(s[t++]=h[j][m]);return s};for(var c={MODE_NUMBER:1,MODE_ALPHA_NUM:2,MODE_8BIT_BYTE:4,MODE_KANJI:8},d={L:1,M:0,Q:3,H:2},e={PATTERN000:0,PATTERN001:1,PATTERN010:2,PATTERN011:3,PATTERN100:4,PATTERN101:5,PATTERN110:6,PATTERN111:7},f={PATTERN_POSITION_TABLE:[[],[6,18],[6,22],[6,26],[6,30],[6,34],[6,22,38],[6,24,42],[6,26,46],[6,28,50],[6,30,54],[6,32,58],[6,34,62],[6,26,46,66],[6,26,48,70],[6,26,50,74],[6,30,54,78],[6,30,56,82],[6,30,58,86],[6,34,62,90],[6,28,50,72,94],[6,26,50,74,98],[6,30,54,78,102],[6,28,54,80,106],[6,32,58,84,110],[6,30,58,86,114],[6,34,62,90,118],[6,26,50,74,98,122],[6,30,54,78,102,126],[6,26,52,78,104,130],[6,30,56,82,108,134],[6,34,60,86,112,138],[6,30,58,86,114,142],[6,34,62,90,118,146],[6,30,54,78,102,126,150],[6,24,50,76,102,128,154],[6,28,54,80,106,132,158],[6,32,58,84,110,136,162],[6,26,54,82,110,138,166],[6,30,58,86,114,142,170]],G15:1335,G18:7973,G15_MASK:21522,getBCHTypeInfo:function(a){for(var b=a<<10;f.getBCHDigit(b)-f.getBCHDigit(f.G15)>=0;)b^=f.G15<<f.getBCHDigit(b)-f.getBCHDigit(f.G15);return(a<<10|b)^f.G15_MASK},getBCHTypeNumber:function(a){for(var b=a<<12;f.getBCHDigit(b)-f.getBCHDigit(f.G18)>=0;)b^=f.G18<<f.getBCHDigit(b)-f.getBCHDigit(f.G18);return a<<12|b},getBCHDigit:function(a){for(var b=0;0!=a;)b++,a>>>=1;return b},getPatternPosition:function(a){return f.PATTERN_POSITION_TABLE[a-1]},getMask:function(a,b,c){switch(a){case e.PATTERN000:return 0==(b+c)%2;case e.PATTERN001:return 0==b%2;case e.PATTERN010:return 0==c%3;case e.PATTERN011:return 0==(b+c)%3;case e.PATTERN100:return 0==(Math.floor(b/2)+Math.floor(c/3))%2;case e.PATTERN101:return 0==b*c%2+b*c%3;case e.PATTERN110:return 0==(b*c%2+b*c%3)%2;case e.PATTERN111:return 0==(b*c%3+(b+c)%2)%2;default:throw new Error("bad maskPattern:"+a)}},getErrorCorrectPolynomial:function(a){for(var b=new i([1],0),c=0;a>c;c++)b=b.multiply(new i([1,g.gexp(c)],0));return b},getLengthInBits:function(a,b){if(b>=1&&10>b)switch(a){case c.MODE_NUMBER:return 10;case c.MODE_ALPHA_NUM:return 9;case c.MODE_8BIT_BYTE:return 8;case c.MODE_KANJI:return 8;default:throw new Error("mode:"+a)}else if(27>b)switch(a){case c.MODE_NUMBER:return 12;case c.MODE_ALPHA_NUM:return 11;case c.MODE_8BIT_BYTE:return 16;case c.MODE_KANJI:return 10;default:throw new Error("mode:"+a)}else{if(!(41>b))throw new Error("type:"+b);switch(a){case c.MODE_NUMBER:return 14;case c.MODE_ALPHA_NUM:return 13;case c.MODE_8BIT_BYTE:return 16;case c.MODE_KANJI:return 12;default:throw new Error("mode:"+a)}}},getLostPoint:function(a){for(var b=a.getModuleCount(),c=0,d=0;b>d;d++)for(var e=0;b>e;e++){for(var f=0,g=a.isDark(d,e),h=-1;1>=h;h++)if(!(0>d+h||d+h>=b))for(var i=-1;1>=i;i++)0>e+i||e+i>=b||(0!=h||0!=i)&&g==a.isDark(d+h,e+i)&&f++;f>5&&(c+=3+f-5)}for(var d=0;b-1>d;d++)for(var e=0;b-1>e;e++){var j=0;a.isDark(d,e)&&j++,a.isDark(d+1,e)&&j++,a.isDark(d,e+1)&&j++,a.isDark(d+1,e+1)&&j++,(0==j||4==j)&&(c+=3)}for(var d=0;b>d;d++)for(var e=0;b-6>e;e++)a.isDark(d,e)&&!a.isDark(d,e+1)&&a.isDark(d,e+2)&&a.isDark(d,e+3)&&a.isDark(d,e+4)&&!a.isDark(d,e+5)&&a.isDark(d,e+6)&&(c+=40);for(var e=0;b>e;e++)for(var d=0;b-6>d;d++)a.isDark(d,e)&&!a.isDark(d+1,e)&&a.isDark(d+2,e)&&a.isDark(d+3,e)&&a.isDark(d+4,e)&&!a.isDark(d+5,e)&&a.isDark(d+6,e)&&(c+=40);for(var k=0,e=0;b>e;e++)for(var d=0;b>d;d++)a.isDark(d,e)&&k++;var l=Math.abs(100*k/b/b-50)/5;return c+=10*l}},g={glog:function(a){if(1>a)throw new Error("glog("+a+")");return g.LOG_TABLE[a]},gexp:function(a){for(;0>a;)a+=255;for(;a>=256;)a-=255;return g.EXP_TABLE[a]},EXP_TABLE:new Array(256),LOG_TABLE:new Array(256)},h=0;8>h;h++)g.EXP_TABLE[h]=1<<h;for(var h=8;256>h;h++)g.EXP_TABLE[h]=g.EXP_TABLE[h-4]^g.EXP_TABLE[h-5]^g.EXP_TABLE[h-6]^g.EXP_TABLE[h-8];for(var h=0;255>h;h++)g.LOG_TABLE[g.EXP_TABLE[h]]=h;i.prototype={get:function(a){return this.num[a]},getLength:function(){return this.num.length},multiply:function(a){for(var b=new Array(this.getLength()+a.getLength()-1),c=0;c<this.getLength();c++)for(var d=0;d<a.getLength();d++)b[c+d]^=g.gexp(g.glog(this.get(c))+g.glog(a.get(d)));return new i(b,0)},mod:function(a){if(this.getLength()-a.getLength()<0)return this;for(var b=g.glog(this.get(0))-g.glog(a.get(0)),c=new Array(this.getLength()),d=0;d<this.getLength();d++)c[d]=this.get(d);for(var d=0;d<a.getLength();d++)c[d]^=g.gexp(g.glog(a.get(d))+b);return new i(c,0).mod(a)}},j.RS_BLOCK_TABLE=[[1,26,19],[1,26,16],[1,26,13],[1,26,9],[1,44,34],[1,44,28],[1,44,22],[1,44,16],[1,70,55],[1,70,44],[2,35,17],[2,35,13],[1,100,80],[2,50,32],[2,50,24],[4,25,9],[1,134,108],[2,67,43],[2,33,15,2,34,16],[2,33,11,2,34,12],[2,86,68],[4,43,27],[4,43,19],[4,43,15],[2,98,78],[4,49,31],[2,32,14,4,33,15],[4,39,13,1,40,14],[2,121,97],[2,60,38,2,61,39],[4,40,18,2,41,19],[4,40,14,2,41,15],[2,146,116],[3,58,36,2,59,37],[4,36,16,4,37,17],[4,36,12,4,37,13],[2,86,68,2,87,69],[4,69,43,1,70,44],[6,43,19,2,44,20],[6,43,15,2,44,16],[4,101,81],[1,80,50,4,81,51],[4,50,22,4,51,23],[3,36,12,8,37,13],[2,116,92,2,117,93],[6,58,36,2,59,37],[4,46,20,6,47,21],[7,42,14,4,43,15],[4,133,107],[8,59,37,1,60,38],[8,44,20,4,45,21],[12,33,11,4,34,12],[3,145,115,1,146,116],[4,64,40,5,65,41],[11,36,16,5,37,17],[11,36,12,5,37,13],[5,109,87,1,110,88],[5,65,41,5,66,42],[5,54,24,7,55,25],[11,36,12],[5,122,98,1,123,99],[7,73,45,3,74,46],[15,43,19,2,44,20],[3,45,15,13,46,16],[1,135,107,5,136,108],[10,74,46,1,75,47],[1,50,22,15,51,23],[2,42,14,17,43,15],[5,150,120,1,151,121],[9,69,43,4,70,44],[17,50,22,1,51,23],[2,42,14,19,43,15],[3,141,113,4,142,114],[3,70,44,11,71,45],[17,47,21,4,48,22],[9,39,13,16,40,14],[3,135,107,5,136,108],[3,67,41,13,68,42],[15,54,24,5,55,25],[15,43,15,10,44,16],[4,144,116,4,145,117],[17,68,42],[17,50,22,6,51,23],[19,46,16,6,47,17],[2,139,111,7,140,112],[17,74,46],[7,54,24,16,55,25],[34,37,13],[4,151,121,5,152,122],[4,75,47,14,76,48],[11,54,24,14,55,25],[16,45,15,14,46,16],[6,147,117,4,148,118],[6,73,45,14,74,46],[11,54,24,16,55,25],[30,46,16,2,47,17],[8,132,106,4,133,107],[8,75,47,13,76,48],[7,54,24,22,55,25],[22,45,15,13,46,16],[10,142,114,2,143,115],[19,74,46,4,75,47],[28,50,22,6,51,23],[33,46,16,4,47,17],[8,152,122,4,153,123],[22,73,45,3,74,46],[8,53,23,26,54,24],[12,45,15,28,46,16],[3,147,117,10,148,118],[3,73,45,23,74,46],[4,54,24,31,55,25],[11,45,15,31,46,16],[7,146,116,7,147,117],[21,73,45,7,74,46],[1,53,23,37,54,24],[19,45,15,26,46,16],[5,145,115,10,146,116],[19,75,47,10,76,48],[15,54,24,25,55,25],[23,45,15,25,46,16],[13,145,115,3,146,116],[2,74,46,29,75,47],[42,54,24,1,55,25],[23,45,15,28,46,16],[17,145,115],[10,74,46,23,75,47],[10,54,24,35,55,25],[19,45,15,35,46,16],[17,145,115,1,146,116],[14,74,46,21,75,47],[29,54,24,19,55,25],[11,45,15,46,46,16],[13,145,115,6,146,116],[14,74,46,23,75,47],[44,54,24,7,55,25],[59,46,16,1,47,17],[12,151,121,7,152,122],[12,75,47,26,76,48],[39,54,24,14,55,25],[22,45,15,41,46,16],[6,151,121,14,152,122],[6,75,47,34,76,48],[46,54,24,10,55,25],[2,45,15,64,46,16],[17,152,122,4,153,123],[29,74,46,14,75,47],[49,54,24,10,55,25],[24,45,15,46,46,16],[4,152,122,18,153,123],[13,74,46,32,75,47],[48,54,24,14,55,25],[42,45,15,32,46,16],[20,147,117,4,148,118],[40,75,47,7,76,48],[43,54,24,22,55,25],[10,45,15,67,46,16],[19,148,118,6,149,119],[18,75,47,31,76,48],[34,54,24,34,55,25],[20,45,15,61,46,16]],j.getRSBlocks=function(a,b){var c=j.getRsBlockTable(a,b);if(void 0==c)throw new Error("bad rs block @ typeNumber:"+a+"/errorCorrectLevel:"+b);for(var d=c.length/3,e=[],f=0;d>f;f++)for(var g=c[3*f+0],h=c[3*f+1],i=c[3*f+2],k=0;g>k;k++)e.push(new j(h,i));return e},j.getRsBlockTable=function(a,b){switch(b){case d.L:return j.RS_BLOCK_TABLE[4*(a-1)+0];case d.M:return j.RS_BLOCK_TABLE[4*(a-1)+1];case d.Q:return j.RS_BLOCK_TABLE[4*(a-1)+2];case d.H:return j.RS_BLOCK_TABLE[4*(a-1)+3];default:return void 0}},k.prototype={get:function(a){var b=Math.floor(a/8);return 1==(1&this.buffer[b]>>>7-a%8)},put:function(a,b){for(var c=0;b>c;c++)this.putBit(1==(1&a>>>b-c-1))},getLengthInBits:function(){return this.length},putBit:function(a){var b=Math.floor(this.length/8);this.buffer.length<=b&&this.buffer.push(0),a&&(this.buffer[b]|=128>>>this.length%8),this.length++}};var l=[[17,14,11,7],[32,26,20,14],[53,42,32,24],[78,62,46,34],[106,84,60,44],[134,106,74,58],[154,122,86,64],[192,152,108,84],[230,180,130,98],[271,213,151,119],[321,251,177,137],[367,287,203,155],[425,331,241,177],[458,362,258,194],[520,412,292,220],[586,450,322,250],[644,504,364,280],[718,560,394,310],[792,624,442,338],[858,666,482,382],[929,711,509,403],[1003,779,565,439],[1091,857,611,461],[1171,911,661,511],[1273,997,715,535],[1367,1059,751,593],[1465,1125,805,625],[1528,1190,868,658],[1628,1264,908,698],[1732,1370,982,742],[1840,1452,1030,790],[1952,1538,1112,842],[2068,1628,1168,898],[2188,1722,1228,958],[2303,1809,1283,983],[2431,1911,1351,1051],[2563,1989,1423,1093],[2699,2099,1499,1139],[2809,2213,1579,1219],[2953,2331,1663,1273]],o=function(){var a=function(a,b){this._el=a,this._htOption=b};return a.prototype.draw=function(a){function g(a,b){var c=document.createElementNS("http://www.w3.org/2000/svg",a);for(var d in b)b.hasOwnProperty(d)&&c.setAttribute(d,b[d]);return c}var b=this._htOption,c=this._el,d=a.getModuleCount();Math.floor(b.width/d),Math.floor(b.height/d),this.clear();var h=g("svg",{viewBox:"0 0 "+String(d)+" "+String(d),width:"100%",height:"100%",fill:b.colorLight});h.setAttributeNS("http://www.w3.org/2000/xmlns/","xmlns:xlink","http://www.w3.org/1999/xlink"),c.appendChild(h),h.appendChild(g("rect",{fill:b.colorDark,width:"1",height:"1",id:"template"}));for(var i=0;d>i;i++)for(var j=0;d>j;j++)if(a.isDark(i,j)){var k=g("use",{x:String(i),y:String(j)});k.setAttributeNS("http://www.w3.org/1999/xlink","href","#template"),h.appendChild(k)}},a.prototype.clear=function(){for(;this._el.hasChildNodes();)this._el.removeChild(this._el.lastChild)},a}(),p="svg"===document.documentElement.tagName.toLowerCase(),q=p?o:m()?function(){function a(){this._elImage.src=this._elCanvas.toDataURL("image/png"),this._elImage.style.display="block",this._elCanvas.style.display="none"}function d(a,b){var c=this;if(c._fFail=b,c._fSuccess=a,null===c._bSupportDataURI){var d=document.createElement("img"),e=function(){c._bSupportDataURI=!1,c._fFail&&_fFail.call(c)},f=function(){c._bSupportDataURI=!0,c._fSuccess&&c._fSuccess.call(c)};return d.onabort=e,d.onerror=e,d.onload=f,d.src="data:image/gif;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg==",void 0}c._bSupportDataURI===!0&&c._fSuccess?c._fSuccess.call(c):c._bSupportDataURI===!1&&c._fFail&&c._fFail.call(c)}if(this._android&&this._android<=2.1){var b=1/window.devicePixelRatio,c=CanvasRenderingContext2D.prototype.drawImage;CanvasRenderingContext2D.prototype.drawImage=function(a,d,e,f,g,h,i,j){if("nodeName"in a&&/img/i.test(a.nodeName))for(var l=arguments.length-1;l>=1;l--)arguments[l]=arguments[l]*b;else"undefined"==typeof j&&(arguments[1]*=b,arguments[2]*=b,arguments[3]*=b,arguments[4]*=b);c.apply(this,arguments)}}var e=function(a,b){this._bIsPainted=!1,this._android=n(),this._htOption=b,this._elCanvas=document.createElement("canvas"),this._elCanvas.width=b.width,this._elCanvas.height=b.height,a.appendChild(this._elCanvas),this._el=a,this._oContext=this._elCanvas.getContext("2d"),this._bIsPainted=!1,this._elImage=document.createElement("img"),this._elImage.style.display="none",this._el.appendChild(this._elImage),this._bSupportDataURI=null};return e.prototype.draw=function(a){var b=this._elImage,c=this._oContext,d=this._htOption,e=a.getModuleCount(),f=d.width/e,g=d.height/e,h=Math.round(f),i=Math.round(g);b.style.display="none",this.clear();for(var j=0;e>j;j++)for(var k=0;e>k;k++){var l=a.isDark(j,k),m=k*f,n=j*g;c.strokeStyle=l?d.colorDark:d.colorLight,c.lineWidth=1,c.fillStyle=l?d.colorDark:d.colorLight,c.fillRect(m,n,f,g),c.strokeRect(Math.floor(m)+.5,Math.floor(n)+.5,h,i),c.strokeRect(Math.ceil(m)-.5,Math.ceil(n)-.5,h,i)}this._bIsPainted=!0},e.prototype.makeImage=function(){this._bIsPainted&&d.call(this,a)},e.prototype.isPainted=function(){return this._bIsPainted},e.prototype.clear=function(){this._oContext.clearRect(0,0,this._elCanvas.width,this._elCanvas.height),this._bIsPainted=!1},e.prototype.round=function(a){return a?Math.floor(1e3*a)/1e3:a},e}():function(){var a=function(a,b){this._el=a,this._htOption=b};return a.prototype.draw=function(a){for(var b=this._htOption,c=this._el,d=a.getModuleCount(),e=Math.floor(b.width/d),f=Math.floor(b.height/d),g=['<table style="border:0;border-collapse:collapse;">'],h=0;d>h;h++){g.push("<tr>");for(var i=0;d>i;i++)g.push('<td style="border:0;border-collapse:collapse;padding:0;margin:0;width:'+e+"px;height:"+f+"px;background-color:"+(a.isDark(h,i)?b.colorDark:b.colorLight)+';"></td>');g.push("</tr>")}g.push("</table>"),c.innerHTML=g.join("");var j=c.childNodes[0],k=(b.width-j.offsetWidth)/2,l=(b.height-j.offsetHeight)/2;k>0&&l>0&&(j.style.margin=l+"px "+k+"px")},a.prototype.clear=function(){this._el.innerHTML=""},a}();QRCode=function(a,b){if(this._htOption={width:256,height:256,typeNumber:4,colorDark:"#000000",colorLight:"#ffffff",correctLevel:d.H},"string"==typeof b&&(b={text:b}),b)for(var c in b)this._htOption[c]=b[c];"string"==typeof a&&(a=document.getElementById(a)),this._android=n(),this._el=a,this._oQRCode=null,this._oDrawing=new q(this._el,this._htOption),this._htOption.text&&this.makeCode(this._htOption.text)},QRCode.prototype.makeCode=function(a){this._oQRCode=new b(r(a,this._htOption.correctLevel),this._htOption.correctLevel),this._oQRCode.addData(a),this._oQRCode.make(),this._el.title=a,this._oDrawing.draw(this._oQRCode),this.makeImage()},QRCode.prototype.makeImage=function(){"function"==typeof this._oDrawing.makeImage&&(!this._android||this._android>=3)&&this._oDrawing.makeImage()},QRCode.prototype.clear=function(){this._oDrawing.clear()},QRCode.CorrectLevel=d}();
  </script>

  <!-- Main Decimen Optical Transfer Engine -->
  <script>
    const PROTOCOL_TAG = 'DEC';
    let activeTab = 'sender';

    // Sender State
    let senderChunks = [];
    let senderCurrentIdx = 0;
    let senderTimer = null;
    let senderFPS = 8;
    let senderChunkSize = 180;
    let senderFileMeta = null;
    let senderPayloadText = '';
    let senderSessionId = '';
    let senderIsPaused = false;
    let senderQRCodeObj = null;

    // Receiver State
    let receiverStream = null;
    let receiverFacingMode = 'environment';
    let receiverScanTimer = null;
    let receiverCurrentSession = null;
    let receiverTotalChunks = 0;
    let receiverChunksMap = new Map();
    let receiverMeta = null;
    let receiverStartTime = 0;
    let receiverTotalBytes = 0;
    let receiverDuplicateFrames = 0;
    let barcodeDetector = null;

    // Loopback Demo State
    let loopTimer = null;
    let loopChunks = [];
    let loopIdx = 0;
    let loopReceived = new Map();
    let loopQRCodeObj = null;
    let loopStartTime = 0;

    if ('BarcodeDetector' in window) {
      try {
        barcodeDetector = new BarcodeDetector({ formats: ['qr_code'] });
      } catch (e) {
        console.warn('BarcodeDetector initialization fallback:', e);
      }
    }

    function switchTab(tabId) {
      activeTab = tabId;
      document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
      document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
      document.getElementById('tab-' + tabId)?.classList.add('active');
      document.getElementById('tab-btn-' + tabId)?.classList.add('active');

      if (tabId !== 'receiver' && receiverStream) {
        toggleReceiverCamera(false);
      }
    }

    function simpleChecksum(str) {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
      }
      return (hash >>> 0).toString(16);
    }

    // Sender Implementation
    function setSenderInputMode(mode) {
      const textGroup = document.getElementById('sender-input-text-group');
      const fileGroup = document.getElementById('sender-input-file-group');
      if (mode === 'text') {
        textGroup.style.display = 'block';
        fileGroup.style.display = 'none';
        senderFileMeta = null;
        updateSenderPayloadMetrics();
      } else {
        textGroup.style.display = 'none';
        fileGroup.style.display = 'block';
      }
    }

    function loadSampleText() {
      const textEl = document.getElementById('sender-text');
      if (!textEl) return;
      textEl.value = \`# Decimen 光學傳輸測試檔案
日期：\${new Date().toLocaleString()}
環境：Webcom AI 離線沙箱
狀態：光學數據噴泉傳輸中...

這是一份使用 Decimen 協議在兩台裝置間透過「螢幕 ↔ 鏡頭」傳輸的示範文件。
無須連接 Wi-Fi、無須藍牙配對，資料完全以光的形式傳遞！\`;
      updateSenderPayloadMetrics();
    }

    function updateSenderPayloadMetrics() {
      const text = document.getElementById('sender-text')?.value || '';
      const sizeBytes = new Blob([text]).size;
      const sizeEl = document.getElementById('sender-payload-size');
      if (sizeEl) sizeEl.textContent = \`\${sizeBytes} Bytes\`;
      updateSenderEstSpeed();
    }

    function updateSenderChunkSize(val) {
      senderChunkSize = parseInt(val, 10);
      const valEl = document.getElementById('sender-chunk-val');
      if (valEl) valEl.textContent = \`\${senderChunkSize} 字元\`;
      updateSenderEstSpeed();
    }

    function updateSenderFPS(val) {
      senderFPS = parseInt(val, 10);
      const valEl = document.getElementById('sender-fps-val');
      if (valEl) valEl.textContent = \`\${senderFPS} FPS\`;
      updateSenderEstSpeed();
    }

    function updateSenderEstSpeed() {
      const bytesPerSec = Math.round(senderChunkSize * senderFPS);
      const speedEl = document.getElementById('sender-est-speed');
      if (speedEl) speedEl.textContent = \`~\${(bytesPerSec / 1024).toFixed(1)} KB/s\`;
    }

    function handleSenderFileSelect(files) {
      if (!files || files.length === 0) return;
      const file = files[0];
      const reader = new FileReader();
      reader.onload = function(e) {
        senderPayloadText = e.target.result;
        senderFileMeta = {
          name: file.name,
          type: file.type || 'application/octet-stream',
          size: file.size
        };
        const infoEl = document.getElementById('sender-file-info');
        if (infoEl) {
          infoEl.style.display = 'block';
          infoEl.textContent = \`已載入檔案: \${file.name} (\${(file.size / 1024).toFixed(1)} KB, \${file.type || 'binary'})\`;
        }
        const sizeEl = document.getElementById('sender-payload-size');
        if (sizeEl) sizeEl.textContent = \`\${file.size} Bytes\`;
      };
      reader.readAsDataURL(file);
    }

    function prepareSenderPackets() {
      let rawData = '';
      let meta = { name: 'note.txt', type: 'text/plain', size: 0 };

      if (senderFileMeta) {
        rawData = senderPayloadText;
        meta = senderFileMeta;
      } else {
        rawData = (document.getElementById('sender-text')?.value || '').trim();
        if (!rawData) {
          alert('請先輸入文字或選擇檔案再開始傳輸！');
          return false;
        }
        meta.size = new Blob([rawData]).size;
      }

      senderSessionId = Math.random().toString(16).substring(2, 8);
      senderChunks = [];

      for (let i = 0; i < rawData.length; i += senderChunkSize) {
        senderChunks.push(rawData.substring(i, i + senderChunkSize));
      }

      const totalChunks = senderChunks.length;
      const fullChecksum = simpleChecksum(rawData);

      senderChunks = senderChunks.map((chunk, idx) => {
        return JSON.stringify({
          d: PROTOCOL_TAG,
          s: senderSessionId,
          n: meta.name,
          m: meta.type,
          sz: meta.size,
          t: totalChunks,
          i: idx,
          c: chunk,
          h: fullChecksum
        });
      });

      return true;
    }

    function renderSenderQRCode(text) {
      const container = document.getElementById('sender-qr-container');
      if (!container) return;
      if (!senderQRCodeObj) {
        container.innerHTML = '';
        senderQRCodeObj = new QRCode(container, {
          text: text,
          width: 248,
          height: 248,
          colorDark: '#000000',
          colorLight: '#ffffff',
          correctLevel: QRCode.CorrectLevel.M
        });
      } else {
        senderQRCodeObj.makeCode(text);
      }
    }

    function startSenderTransmission() {
      if (senderTimer) return;
      if (!prepareSenderPackets()) return;

      senderCurrentIdx = 0;
      senderIsPaused = false;

      document.getElementById('btn-sender-start').disabled = true;
      document.getElementById('btn-sender-pause').disabled = false;
      document.getElementById('btn-sender-stop').disabled = false;
      const badge = document.getElementById('sender-status-badge');
      badge.textContent = \`發送中 (\${senderFPS} FPS)\`;
      badge.style.color = '#38bdf8';

      const intervalMs = Math.round(1000 / senderFPS);
      renderSenderFrame();

      senderTimer = setInterval(() => {
        if (senderIsPaused) return;
        senderCurrentIdx++;
        const isLoop = document.getElementById('sender-loop-checkbox')?.checked;
        if (senderCurrentIdx >= senderChunks.length) {
          if (isLoop) {
            senderCurrentIdx = 0;
          } else {
            stopSenderTransmission();
            alert('光學傳輸完畢！');
            return;
          }
        }
        renderSenderFrame();
      }, intervalMs);
    }

    function renderSenderFrame() {
      if (senderChunks.length === 0) return;
      const pkt = senderChunks[senderCurrentIdx];
      renderSenderQRCode(pkt);

      const total = senderChunks.length;
      const current = senderCurrentIdx + 1;
      const pct = Math.round((current / total) * 100);

      document.getElementById('sender-qr-badge').textContent = \`幀 [ \${current} / \${total} ] (\${pct}%)\`;
      document.getElementById('sender-stat-frame').textContent = \`幀: \${current} / \${total}\`;
      document.getElementById('sender-stat-percent').textContent = \`\${pct}%\`;
      document.getElementById('sender-progress-fill').style.width = \`\${pct}%\`;
    }

    function stepSenderFrame(direction) {
      if (senderChunks.length === 0) return;
      senderCurrentIdx = (senderCurrentIdx + direction + senderChunks.length) % senderChunks.length;
      renderSenderFrame();
    }

    function pauseSenderTransmission() {
      senderIsPaused = !senderIsPaused;
      document.getElementById('btn-sender-pause').textContent = senderIsPaused ? '▶ 繼續' : '⏸ 暫停';
      document.getElementById('sender-status-badge').textContent = senderIsPaused ? '已暫停' : \`發送中 (\${senderFPS} FPS)\`;
    }

    function stopSenderTransmission() {
      if (senderTimer) {
        clearInterval(senderTimer);
        senderTimer = null;
      }
      senderIsPaused = false;
      document.getElementById('btn-sender-start').disabled = false;
      document.getElementById('btn-sender-pause').disabled = true;
      document.getElementById('btn-sender-stop').disabled = true;
      document.getElementById('btn-sender-pause').textContent = '⏸ 暫停';
      const badge = document.getElementById('sender-status-badge');
      badge.textContent = '已停止';
      badge.style.color = '#94a3b8';
      document.getElementById('sender-qr-badge').textContent = '傳輸停止';
    }

    // Receiver Implementation
    async function toggleReceiverCamera(forceState) {
      const video = document.getElementById('receiver-video');
      const placeholder = document.getElementById('camera-placeholder');
      const btn = document.getElementById('btn-camera-toggle');
      const errorMsg = document.getElementById('camera-error-msg');

      const shouldStart = (forceState !== undefined) ? forceState : (!receiverStream);

      if (shouldStart) {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          if (errorMsg) {
            errorMsg.style.display = 'block';
            errorMsg.textContent = '⚠ 當前瀏覽器環境不支援或限制了鏡頭存取 (需使用 localhost 或 HTTPS 協議)。建議使用「雙向自測」體驗完整流程！';
          }
          alert('當前瀏覽器環境限制了鏡頭存取 (需在 localhost 或 HTTPS 下運行)。
建議點選上方「🔄 雙向自測」體驗完整光學傳輸流程！');
          return;
        }

        try {
          if (errorMsg) errorMsg.style.display = 'none';
          const constraints = {
            video: {
              facingMode: receiverFacingMode,
              width: { ideal: 1280 },
              height: { ideal: 720 }
            }
          };
          receiverStream = await navigator.mediaDevices.getUserMedia(constraints);
          video.srcObject = receiverStream;
          video.play();
          placeholder.style.display = 'none';
          btn.textContent = '⏹ 關閉相機';
          btn.className = 'btn btn-danger';
          const badge = document.getElementById('receiver-status-badge');
          badge.textContent = '相機掃描中';
          badge.style.color = '#34d399';

          startReceiverScanning();
        } catch (err) {
          if (errorMsg) {
            errorMsg.style.display = 'block';
            errorMsg.textContent = '相機啟動失敗：' + err.message;
          }
          alert('無法開啟相機鏡頭：' + err.message + '\\n請確認已允許相機存取權限。');
        }
      } else {
        if (receiverStream) {
          receiverStream.getTracks().forEach(t => t.stop());
          receiverStream = null;
        }
        if (receiverScanTimer) {
          cancelAnimationFrame(receiverScanTimer);
          receiverScanTimer = null;
        }
        video.srcObject = null;
        placeholder.style.display = 'block';
        btn.textContent = '📷 開啟相機';
        btn.className = 'btn btn-primary';
        const badge = document.getElementById('receiver-status-badge');
        badge.textContent = '相機已關閉';
        badge.style.color = '#94a3b8';
      }
    }

    function switchCameraFacing() {
      receiverFacingMode = (receiverFacingMode === 'environment') ? 'user' : 'environment';
      if (receiverStream) {
        toggleReceiverCamera(false);
        setTimeout(() => toggleReceiverCamera(true), 200);
      }
    }

    function startReceiverScanning() {
      const video = document.getElementById('receiver-video');
      const canvas = document.getElementById('receiver-hidden-canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      const scanLoop = async () => {
        if (!receiverStream) return;
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          let decodedText = null;

          if (barcodeDetector) {
            try {
              const barcodes = await barcodeDetector.detect(canvas);
              if (barcodes.length > 0) {
                decodedText = barcodes[0].rawValue;
              }
            } catch (e) {}
          }

          if (decodedText) {
            handleDecodedPacket(decodedText);
          }
        }
        receiverScanTimer = requestAnimationFrame(scanLoop);
      };

      receiverScanTimer = requestAnimationFrame(scanLoop);
    }

    function handleDecodedPacket(rawJson) {
      if (!rawJson.startsWith('{"d":"DEC"')) return;
      try {
        const pkt = JSON.parse(rawJson);
        if (pkt.d !== PROTOCOL_TAG) return;

        if (receiverCurrentSession !== pkt.s) {
          receiverCurrentSession = pkt.s;
          receiverTotalChunks = pkt.t;
          receiverChunksMap.clear();
          receiverMeta = {
            name: pkt.n,
            type: pkt.m,
            size: pkt.sz,
            checksum: pkt.h
          };
          receiverStartTime = performance.now();
          receiverTotalBytes = 0;
          receiverDuplicateFrames = 0;
          initReceiverMatrix(pkt.t);
          document.getElementById('receiver-result-box').style.display = 'none';
        }

        if (!receiverChunksMap.has(pkt.i)) {
          receiverChunksMap.set(pkt.i, pkt.c);
          receiverTotalBytes += pkt.c.length;
          updateReceiverMatrixCell(pkt.i);
          updateReceiverProgress();

          if (receiverChunksMap.size === receiverTotalChunks) {
            finalizeReceiverAssembly();
          }
        } else {
          receiverDuplicateFrames++;
          document.getElementById('metric-redundant').textContent = receiverDuplicateFrames;
        }
      } catch (e) {
        console.warn('Packet parse error:', e);
      }
    }

    function initReceiverMatrix(total) {
      const matrix = document.getElementById('receiver-chunk-matrix');
      matrix.innerHTML = '';
      for (let i = 0; i < total; i++) {
        const dot = document.createElement('div');
        dot.className = 'chunk-dot';
        dot.id = \`chunk-dot-\${i}\`;
        dot.title = \`幀 #\${i + 1}\`;
        matrix.appendChild(dot);
      }
    }

    function updateReceiverMatrixCell(idx) {
      const dot = document.getElementById(\`chunk-dot-\${idx}\`);
      if (dot) dot.classList.add('received');
    }

    function updateReceiverProgress() {
      const current = receiverChunksMap.size;
      const total = receiverTotalChunks;
      const pct = Math.round((current / total) * 100);

      document.getElementById('receiver-progress-fill').style.width = \`\${pct}%\`;
      document.getElementById('receiver-stat-chunks').textContent = \`接收進度: \${current} / \${total} 幀\`;
      document.getElementById('receiver-stat-percent').textContent = \`\${pct}%\`;

      const elapsedSec = (performance.now() - receiverStartTime) / 1000;
      document.getElementById('metric-time').textContent = \`\${elapsedSec.toFixed(1)} s\`;

      if (elapsedSec > 0) {
        const speedKB = (receiverTotalBytes / 1024) / elapsedSec;
        document.getElementById('metric-speed').textContent = \`\${speedKB.toFixed(1)} KB/s\`;
        document.getElementById('receiver-telemetry').textContent = \`正在以 ~\${speedKB.toFixed(1)} KB/s 光學接收中...\`;
      }
    }

    function finalizeReceiverAssembly() {
      const elapsedSec = ((performance.now() - receiverStartTime) / 1000).toFixed(1);
      const avgSpeed = ((receiverTotalBytes / 1024) / parseFloat(elapsedSec || 1)).toFixed(1);

      document.getElementById('receiver-telemetry').textContent = \`✔ 接收完成 (\${avgSpeed} KB/s)\`;
      const badge = document.getElementById('receiver-status-badge');
      badge.textContent = '接收完畢';
      badge.style.color = '#10b981';

      let fullPayload = '';
      for (let i = 0; i < receiverTotalChunks; i++) {
        fullPayload += receiverChunksMap.get(i) || '';
      }

      const calculatedChecksum = simpleChecksum(fullPayload);
      const isChecksumValid = (calculatedChecksum === receiverMeta.checksum);
      const crcEl = document.getElementById('metric-crc');
      if (isChecksumValid) {
        crcEl.textContent = '✔ 校驗成功 (Match)';
        crcEl.style.color = '#10b981';
      } else {
        crcEl.textContent = '⚠ 校驗不符 (Mismatch)';
        crcEl.style.color = '#ef4444';
      }

      const resultBox = document.getElementById('receiver-result-box');
      resultBox.style.display = 'block';
      document.getElementById('result-filename').textContent = \`\${receiverMeta.name} (\${(receiverMeta.size/1024).toFixed(1)} KB)\`;

      const previewEl = document.getElementById('result-preview');
      if (fullPayload.startsWith('data:image/')) {
        previewEl.innerHTML = \`<img src="\${fullPayload}" style="max-height: 120px; border-radius: 4px; display: block; margin: 0 auto;">\`;
      } else if (fullPayload.startsWith('data:')) {
        previewEl.textContent = \`[二進位檔案資料已還原，大小 \${(fullPayload.length*0.75/1024).toFixed(1)} KB]\`;
      } else {
        previewEl.textContent = fullPayload;
      }

      window.lastReceivedPayload = fullPayload;
      window.lastReceivedMeta = receiverMeta;
    }

    function copyReceiverResult() {
      if (!window.lastReceivedPayload) return;
      navigator.clipboard.writeText(window.lastReceivedPayload).then(() => {
        alert('已成功複製接收內容至剪貼簿！');
      });
    }

    function downloadReceiverResult() {
      if (!window.lastReceivedPayload || !window.lastReceivedMeta) return;
      const meta = window.lastReceivedMeta;
      const a = document.createElement('a');
      a.download = meta.name || 'received_optical_file.txt';

      if (window.lastReceivedPayload.startsWith('data:')) {
        a.href = window.lastReceivedPayload;
      } else {
        const blob = new Blob([window.lastReceivedPayload], { type: meta.type || 'text/plain' });
        a.href = URL.createObjectURL(blob);
      }
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }

    function resetReceiverState() {
      receiverChunksMap.clear();
      receiverCurrentSession = null;
      document.getElementById('receiver-result-box').style.display = 'none';
      document.getElementById('receiver-chunk-matrix').innerHTML = '<span style="font-size: 0.7rem; color: var(--muted); grid-column: 1/-1; text-align: center; padding: 0.5rem;">尚未偵測到 Decimen 傳輸信號</span>';
      document.getElementById('receiver-progress-fill').style.width = '0%';
      document.getElementById('receiver-stat-chunks').textContent = '接收進度: 0 / 0 幀';
      document.getElementById('receiver-stat-percent').textContent = '0%';
      document.getElementById('metric-time').textContent = '0.0 s';
      document.getElementById('metric-speed').textContent = '0.0 KB/s';
      document.getElementById('metric-crc').textContent = '待驗證';
      document.getElementById('metric-crc').style.color = '#94a3b8';
    }

    // Loopback Demo Implementation
    function startLoopbackTest() {
      const inputVal = document.getElementById('loop-input').value.trim();
      if (!inputVal) return;

      stopLoopbackTest();

      const sessionId = 'loop_' + Math.random().toString(16).substring(2, 6);
      const chunkSize = 70;
      loopChunks = [];
      for (let i = 0; i < inputVal.length; i += chunkSize) {
        loopChunks.push(inputVal.substring(i, i + chunkSize));
      }

      const total = loopChunks.length;
      const checksum = simpleChecksum(inputVal);

      loopChunks = loopChunks.map((c, i) => JSON.stringify({
        d: PROTOCOL_TAG,
        s: sessionId,
        n: 'loopback_test.txt',
        m: 'text/plain',
        sz: inputVal.length,
        t: total,
        i: i,
        c: c,
        h: checksum
      }));

      loopIdx = 0;
      loopReceived.clear();
      loopStartTime = performance.now();

      const matrix = document.getElementById('loop-chunk-matrix');
      matrix.innerHTML = '';
      for (let i = 0; i < total; i++) {
        const dot = document.createElement('div');
        dot.className = 'chunk-dot';
        dot.id = \`loop-dot-\${i}\`;
        matrix.appendChild(dot);
      }

      document.getElementById('loop-result-box').style.display = 'none';
      document.getElementById('btn-loop-start').disabled = true;
      document.getElementById('btn-loop-stop').disabled = false;

      const container = document.getElementById('loop-qr-container');
      if (!loopQRCodeObj) {
        container.innerHTML = '';
        loopQRCodeObj = new QRCode(container, {
          text: loopChunks[0],
          width: 200,
          height: 200,
          colorDark: '#000000',
          colorLight: '#ffffff',
          correctLevel: QRCode.CorrectLevel.M
        });
      }

      loopTimer = setInterval(() => {
        if (loopIdx >= loopChunks.length) loopIdx = 0;
        const pktStr = loopChunks[loopIdx];
        loopQRCodeObj.makeCode(pktStr);
        document.getElementById('loop-qr-badge').textContent = \`幀 [ \${loopIdx + 1} / \${total} ]\`;
        document.getElementById('loop-sender-stat').textContent = \`發送幀: \${loopIdx + 1} / \${total}\`;

        if (!loopReceived.has(loopIdx)) {
          loopReceived.set(loopIdx, JSON.parse(pktStr).c);
          document.getElementById(\`loop-dot-\${loopIdx}\`)?.classList.add('received');

          const progressPct = Math.round((loopReceived.size / total) * 100);
          document.getElementById('loop-progress-fill').style.width = \`\${progressPct}%\`;
          document.getElementById('loop-receiver-stat').textContent = \`拼裝進度: \${loopReceived.size} / \${total}\`;

          const dt = (performance.now() - loopStartTime) / 1000;
          const spd = ((inputVal.length / 1024) / (dt || 0.1)).toFixed(1);
          document.getElementById('loop-receiver-speed').textContent = \`\${spd} KB/s\`;

          if (loopReceived.size === total) {
            document.getElementById('loop-result-box').style.display = 'block';
            stopLoopbackTest();
          }
        }

        loopIdx++;
      }, 120);
    }

    function stopLoopbackTest() {
      if (loopTimer) {
        clearInterval(loopTimer);
        loopTimer = null;
      }
      document.getElementById('btn-loop-start').disabled = false;
      document.getElementById('btn-loop-stop').disabled = true;
    }

    // Auto-load sample text on first load
    loadSampleText();
  </script>
</body>
</html>
`
            },
            {
                id: 'app_pomodoro_timer',
                title: '番茄工作法極簡專注計時器',
                titleEn: 'Pomodoro Focus Timer',
                category: 'html',
                description: '具備 25 分鐘工作、5 分鐘短休息與客製時間切換，支援沙箱純本地運行。',
                descriptionEn: 'Minimalist Pomodoro timer with 25m work, 5m break, running 100% locally in sandbox.',
                author: 'Webcom Starter',
                createdAt: new Date().toISOString(),
                code: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Pomodoro</title>
<style>
body { font-family: sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
.card { background: #1e293b; padding: 2rem; border-radius: 1rem; text-align: center; border: 1px solid #334155; }
.time { font-size: 3.5rem; font-family: monospace; font-weight: bold; margin: 1rem 0; color: #a855f7; }
button { background: #9333ea; color: white; border: none; padding: 0.5rem 1.2rem; border-radius: 0.5rem; font-size: 1rem; cursor: pointer; margin: 0.2rem; }
button:hover { background: #a855f7; }
</style>
</head>
<body>
<div class="card">
  <h2>🍅 Pomodoro Focus Timer</h2>
  <div class="time" id="disp">25:00</div>
  <div>
    <button onclick="toggle()">開始 / 暫停</button>
    <button onclick="reset()">重設</button>
  </div>
</div>
<script>
let sec = 1500, timer = null;
function update() {
  const m = Math.floor(sec/60).toString().padStart(2,'0');
  const s = (sec%60).toString().padStart(2,'0');
  document.getElementById('disp').textContent = m + ':' + s;
}
function toggle() {
  if (timer) { clearInterval(timer); timer = null; }
  else { timer = setInterval(() => { if (sec>0) { sec--; update(); } else { clearInterval(timer); alert('Time up!'); } }, 1000); }
}
function reset() { if (timer) clearInterval(timer); timer = null; sec = 1500; update(); }
</script>
</body>
</html>`
            },
            {
                id: 'app_json_formatter',
                title: 'JSON 格式化與美化工具',
                titleEn: 'JSON Formatter & Beautifier',
                category: 'html',
                description: '純前端無損解析、排版與驗證 JSON 字串，支援一鍵壓縮與複製。',
                descriptionEn: 'Client-side lossless JSON formatting, validation, and minification with one-click copy.',
                author: 'Webcom Starter',
                createdAt: new Date().toISOString(),
                code: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>JSON Formatter</title>
<style>
body { font-family: monospace; background: #090d16; color: #e2e8f0; padding: 1.5rem; }
textarea { width: 100%; height: 200px; background: #111827; color: #38bdf8; border: 1px solid #374151; border-radius: 0.5rem; padding: 0.75rem; }
button { background: #0284c7; color: white; border: none; padding: 0.5rem 1rem; border-radius: 0.375rem; cursor: pointer; margin-right: 0.5rem; }
</style>
</head>
<body>
<h3>✨ JSON Formatter</h3>
<textarea id="inp" placeholder='Paste raw JSON here...'></textarea>
<div style="margin: 0.5rem 0;">
  <button onclick="format()">Beautify (2 Spaces)</button>
  <button onclick="minify()">Minify</button>
</div>
<script>
function format() {
  const el = document.getElementById('inp');
  try { el.value = JSON.stringify(JSON.parse(el.value), null, 2); }
  catch(e) { alert('Invalid JSON: ' + e.message); }
}
function minify() {
  const el = document.getElementById('inp');
  try { el.value = JSON.stringify(JSON.parse(el.value)); }
  catch(e) { alert('Invalid JSON: ' + e.message); }
}
</script>
</body>
</html>`
            },
            {
                id: 'app_py_fib',
                title: 'Python 數列生成與視覺化',
                titleEn: 'Python Fibonacci Generator',
                category: 'py',
                description: '利用 Pyodide WASM 計算與展示數列前 50 項數值。',
                descriptionEn: 'Compute and visualize Fibonacci sequence using Pyodide in-browser WASM.',
                author: 'Webcom Starter',
                createdAt: new Date().toISOString(),
                code: `# Python Fibonacci Sequence Generator
def fib(n):
    a, b = 0, 1
    res = []
    for _ in range(n):
        res.append(a)
        a, b = b, a + b
    return res

nums = fib(25)
print("Fibonacci (First 25 items):")
for i, val in enumerate(nums, 1):
    print(f"[{i:02d}]: {val}")
`
            }
        ];
    }

    function loadCustomAppsFromStorage() {
        const samples = getSampleCustomApps();
        try {
            const raw = localStorage.getItem(APPS_STORAGE_KEY);
            if (raw) {
                const list = JSON.parse(raw);
                if (Array.isArray(list)) {
                    let changed = false;
                    for (const s of samples) {
                        if (!list.some(a => a.id === s.id)) {
                            list.push(s);
                            changed = true;
                        }
                    }
                    if (changed) saveCustomAppsToStorage(list);
                    return list;
                }
            }
        } catch (e) {}
        saveCustomAppsToStorage(samples);
        return samples;
    }

    function saveCustomAppsToStorage(apps) {
        localStorage.setItem(APPS_STORAGE_KEY, JSON.stringify(apps));
    }

    function openAppLibraryModal() {
        const modal = document.getElementById('app-library-modal');
        renderAppLibraryGrid();
        if (modal) modal.classList.remove('hidden');
        if (window.lucide) lucide.createIcons();
    }

    function closeAppLibraryModal() {
        const modal = document.getElementById('app-library-modal');
        if (modal) modal.classList.add('hidden');
    }

    function filterAppLibraryCategory(cat, btnEl) {
        currentFilterCat = cat;
        document.querySelectorAll('.app-lib-filter-btn').forEach(b => {
            b.className = 'app-lib-filter-btn px-2.5 py-1 rounded-lg font-medium transition text-gray-400 hover:text-white hover:bg-gray-800';
        });
        if (btnEl) {
            btnEl.className = 'app-lib-filter-btn px-2.5 py-1 rounded-lg font-medium transition bg-violet-600 text-white';
        }
        renderAppLibraryGrid();
    }

    function renderAppLibraryGrid(searchQuery = '') {
        const grid = document.getElementById('app-lib-grid');
        const empty = document.getElementById('app-lib-empty');
        const badge = document.getElementById('app-lib-count-badge');
        if (!grid) return;

        let apps = loadCustomAppsFromStorage();
        const isEn = (getCurrentLang() === 'en');

        if (currentFilterCat !== 'all') {
            apps = apps.filter(a => (a.category || 'html') === currentFilterCat);
        }

        if (searchQuery && searchQuery.trim()) {
            const q = searchQuery.trim().toLowerCase();
            apps = apps.filter(a => {
                const combined = [a.title, a.titleEn, a.description, a.descriptionEn].filter(Boolean).join(' ').toLowerCase();
                return combined.includes(q);
            });
        }

        if (badge) badge.textContent = isEn ? `${apps.length} apps` : `${apps.length} 個應用`;

        grid.innerHTML = '';
        if (apps.length === 0) {
            if (empty) empty.classList.remove('hidden');
            return;
        }
        if (empty) empty.classList.add('hidden');

        apps.forEach(app => {
            const card = document.createElement('div');
            card.className = "bg-gray-900 border border-gray-800 hover:border-violet-500/50 rounded-xl p-4 flex flex-col justify-between transition-all duration-200 shadow-md group";

            const catLabel = app.category ? app.category.toUpperCase() : 'APP';
            const displayTitle = (isEn && (app.titleEn || KNOWN_TRANSLATIONS[app.title]?.titleEn)) || app.title;
            const displayDesc = (isEn && (app.descriptionEn || KNOWN_TRANSLATIONS[app.title]?.descriptionEn)) || app.description;

            card.innerHTML = `
                <div>
                    <div class="flex items-center justify-between gap-2 mb-2">
                        <span class="text-xs font-bold text-violet-400 font-mono px-2 py-0.5 rounded bg-violet-950/70 border border-violet-800/40">${catLabel}</span>
                        <div class="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
                            <button type="button" class="btn-open-tab-app p-1 rounded hover:bg-gray-800 text-gray-400 hover:text-cyan-400 transition" title="${isEn ? 'Open in New Tab' : '在新分頁開啟'}"><i data-lucide="external-link" class="w-3.5 h-3.5"></i></button>
                            <button type="button" class="btn-run-app px-2 py-0.5 rounded bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/50 text-[11px] font-bold flex items-center gap-1 cursor-pointer">
                                <span>▶</span> <span>${isEn ? 'Run' : '執行'}</span>
                            </button>
                            <button type="button" class="btn-edit-app p-1 rounded hover:bg-gray-800 text-gray-400 hover:text-white transition" title="${isEn ? 'Edit' : '編輯'}">
                                <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
                            </button>
                            <button type="button" class="btn-delete-app p-1 rounded hover:bg-gray-800 text-gray-400 hover:text-rose-400 transition" title="${isEn ? 'Delete' : '刪除'}">
                                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                            </button>
                        </div>
                    </div>
                    <h3 class="text-sm font-bold text-white group-hover:text-violet-300 transition truncate">${escapeHtml(displayTitle)}</h3>
                    <p class="text-xs text-gray-400 mt-1 line-clamp-2 leading-relaxed">${escapeHtml(displayDesc || (isEn ? 'No description' : '無描述'))}</p>
                </div>
                <div class="mt-3 pt-2.5 border-t border-gray-800/80 flex items-center justify-between text-[10px] text-gray-500 font-mono">
                    <span>${escapeHtml(app.author || 'User')}</span>
                    <span>${escapeHtml((app.createdAt || '').slice(0, 10))}</span>
                </div>
            `;

            card.querySelector('.btn-open-tab-app')?.addEventListener('click', (e) => {
                e.stopPropagation();
                if (app.id === 'app_decimen_optical') {
                    window.open('apps/decimen_optical.html', '_blank');
                } else {
                    const blob = new Blob([app.code], { type: 'text/html' });
                    window.open(URL.createObjectURL(blob), '_blank');
                }
            });
            card.querySelector('.btn-run-app')?.addEventListener('click', () => runCustomAppInSandbox(app));
            card.querySelector('.btn-edit-app')?.addEventListener('click', () => openEditCustomAppModal(app));
            card.querySelector('.btn-delete-app')?.addEventListener('click', () => confirmDeleteAppAction(app.id));

            grid.appendChild(card);
        });

        if (window.lucide) lucide.createIcons();
    }

    function runCustomAppInSandbox(app) {
        if (!app) return;
        closeAppLibraryModal();

        if (app.category === 'py') {
            // Open in Artifact Drawer with live Python Sandbox Runner
            if (window.openArtifactWithContent) {
                window.openArtifactWithContent(app.id, app.title, app.code, 'py');
            }
            // And also log to terminal #3-PY session
            if (window.sendPyodideCode) {
                window.sendPyodideCode(app.code, app.title);
            }
            return;
        }

        // HTML App / Web App: open in sandbox window / artifact drawer
        if (window.openArtifactWithContent) {
            window.openArtifactWithContent(app.id, app.title, app.code, app.category || 'html');
        } else {
            const blob = new Blob([app.code], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');
        }
    }

    function updateCodeStats() {
        const codeEl = document.getElementById('app-edit-code') || document.getElementById('edit-app-code');
        const statsEl = document.getElementById('app-edit-code-stats');
        if (!codeEl || !statsEl) return;
        const text = codeEl.value || '';
        const lines = text ? text.split('\n').length : 0;
        const chars = text.length;
        const isZh = (getCurrentLang() !== 'en');
        statsEl.textContent = isZh ? `${lines} 行 · ${chars} 字` : `${lines} lines · ${chars} chars`;
    }

    function openEditCustomAppModal(app) {
        const modal = document.getElementById('app-edit-modal');
        const titleEl = document.getElementById('app-edit-name') || document.getElementById('edit-app-title');
        const catEl = document.getElementById('app-edit-category') || document.getElementById('edit-app-category');
        const descEl = document.getElementById('app-edit-desc') || document.getElementById('edit-app-desc');
        const codeEl = document.getElementById('app-edit-code') || document.getElementById('edit-app-code');
        const idEl = document.getElementById('app-edit-id') || document.getElementById('edit-app-id');
        const promptEl = document.getElementById('app-edit-prompt');
        const iconEl = document.getElementById('app-edit-icon');
        const verEl = document.getElementById('app-edit-version');
        const internalIdEl = document.getElementById('app-edit-internal-id');
        const modalTitleEl = document.getElementById('app-edit-modal-title');

        const isZh = (getCurrentLang() !== 'en');

        if (app) {
            if (internalIdEl) internalIdEl.value = app.id || '';
            if (idEl) {
                idEl.value = app.id || '';
                idEl.disabled = true;
            }
            const displayTitle = (!isZh && (app.titleEn || KNOWN_TRANSLATIONS[app.title]?.titleEn)) ? (app.titleEn || KNOWN_TRANSLATIONS[app.title]?.titleEn) : (app.title || '');
            const displayDesc = (!isZh && (app.descriptionEn || KNOWN_TRANSLATIONS[app.title]?.descriptionEn)) ? (app.descriptionEn || KNOWN_TRANSLATIONS[app.title]?.descriptionEn) : (app.description || '');

            if (titleEl) {
                titleEl.value = displayTitle;
                titleEl.dataset.titleZh = app.title || '';
                titleEl.dataset.titleEn = app.titleEn || KNOWN_TRANSLATIONS[app.title]?.titleEn || '';
            }
            if (catEl) catEl.value = app.category || 'html';
            if (descEl) {
                descEl.value = displayDesc;
                descEl.dataset.descZh = app.description || '';
                descEl.dataset.descEn = app.descriptionEn || KNOWN_TRANSLATIONS[app.title]?.descriptionEn || '';
            }
            if (codeEl) codeEl.value = app.code || '';
            if (promptEl) promptEl.value = app.prompt || '';
            if (iconEl) iconEl.value = app.icon || '⚡';
            if (verEl) verEl.value = app.version || 'v1.0';
            if (modalTitleEl) modalTitleEl.textContent = isZh ? '編輯自訂應用程式' : 'Edit Custom App';
        } else {
            const newId = 'app_' + Date.now();
            if (internalIdEl) internalIdEl.value = '';
            if (idEl) {
                idEl.value = newId;
                idEl.disabled = false;
            }
            if (titleEl) {
                titleEl.value = '';
                delete titleEl.dataset.titleZh;
                delete titleEl.dataset.titleEn;
            }
            if (catEl) catEl.value = 'html';
            if (descEl) {
                descEl.value = '';
                delete descEl.dataset.descZh;
                delete descEl.dataset.descEn;
            }
            if (codeEl) codeEl.value = getStarterTemplateForCategory('html');
            if (promptEl) promptEl.value = '';
            if (iconEl) iconEl.value = '⚡';
            if (verEl) verEl.value = 'v1.0';
            if (modalTitleEl) modalTitleEl.textContent = isZh ? '新建自訂應用程式' : 'New Custom App';
        }

        updateCodeStats();
        if (modal) modal.classList.remove('hidden');
        if (window.lucide) lucide.createIcons();
    }

    function closeAppEditModal() {
        const modal = document.getElementById('app-edit-modal');
        if (modal) modal.classList.add('hidden');
    }

    function previewCustomAppFromModal() {
        const titleEl = document.getElementById('app-edit-name') || document.getElementById('edit-app-title');
        const catEl = document.getElementById('app-edit-category') || document.getElementById('edit-app-category');
        const codeEl = document.getElementById('app-edit-code') || document.getElementById('edit-app-code');
        const idEl = document.getElementById('app-edit-id') || document.getElementById('edit-app-id');

        const isZh = (getCurrentLang() !== 'en');
        const title = titleEl?.value.trim() || (isZh ? '預覽自建應用' : 'Preview Custom App');
        const code = codeEl?.value || '';
        const cat = catEl?.value || 'html';
        const id = idEl?.value.trim() || ('preview_' + Date.now());

        if (!code) {
            alert(isZh ? '請輸入代碼後再進行預覽！' : 'Please enter code before preview.');
            return;
        }

        if (window.openArtifactWithContent) {
            window.openArtifactWithContent(id, title, code, cat);
        }
    }

    function saveCustomAppFromModal() {
        const titleEl = document.getElementById('app-edit-name') || document.getElementById('edit-app-title');
        const catEl = document.getElementById('app-edit-category') || document.getElementById('edit-app-category');
        const descEl = document.getElementById('app-edit-desc') || document.getElementById('edit-app-desc');
        const codeEl = document.getElementById('app-edit-code') || document.getElementById('edit-app-code');
        const idEl = document.getElementById('app-edit-id') || document.getElementById('edit-app-id');
        const promptEl = document.getElementById('app-edit-prompt');
        const iconEl = document.getElementById('app-edit-icon');
        const verEl = document.getElementById('app-edit-version');
        const internalIdEl = document.getElementById('app-edit-internal-id');

        const title = titleEl?.value.trim();
        const code = codeEl?.value.trim();
        const isZh = (getCurrentLang() !== 'en');
        if (!title || !code) {
            alert(isZh ? '請填寫應用名稱與代碼內容！' : 'Please provide both title and code.');
            return;
        }

        const apps = loadCustomAppsFromStorage();
        const existingId = internalIdEl?.value.trim() || idEl?.value.trim();
        const existingApp = existingId ? apps.find(a => a.id === existingId) : null;

        let appTitle = title;
        let appTitleEn = existingApp?.titleEn || titleEl?.dataset.titleEn || '';
        let appDesc = descEl?.value || '';
        let appDescEn = existingApp?.descriptionEn || descEl?.dataset.descEn || '';

        if (!isZh) {
            appTitleEn = title;
            appDescEn = appDesc;
            if (existingApp?.title) appTitle = existingApp.title;
            if (existingApp?.description) appDesc = existingApp.description;
        } else {
            appTitle = title;
            appDesc = appDesc;
            if (KNOWN_TRANSLATIONS[title]) {
                if (!appTitleEn) appTitleEn = KNOWN_TRANSLATIONS[title].titleEn;
                if (!appDescEn) appDescEn = KNOWN_TRANSLATIONS[title].descriptionEn;
            }
        }

        const appPayload = {
            id: existingId || ('app_' + Date.now()),
            title: appTitle,
            titleEn: appTitleEn,
            category: catEl?.value || 'html',
            description: appDesc,
            descriptionEn: appDescEn,
            code: code,
            prompt: promptEl?.value || '',
            icon: iconEl?.value || '⚡',
            version: verEl?.value || 'v1.0',
            updatedAt: new Date().toISOString()
        };

        const idx = apps.findIndex(a => a.id === appPayload.id);
        if (idx !== -1) {
            apps[idx] = { ...apps[idx], ...appPayload };
        } else {
            appPayload.createdAt = new Date().toISOString();
            apps.unshift(appPayload);
        }

        saveCustomAppsToStorage(apps);
        closeAppEditModal();
        renderAppLibraryGrid();
    }

    function confirmDeleteAppAction(id) {
        appToDeleteId = id;
        const apps = loadCustomAppsFromStorage();
        const app = apps.find(a => a.id === id);
        const isZh = (getCurrentLang() !== 'en');
        const targetEl = document.getElementById('app-delete-modal-target');
        if (targetEl && app) {
            const displayTitle = (!isZh && (app.titleEn || KNOWN_TRANSLATIONS[app.title]?.titleEn)) ? (app.titleEn || KNOWN_TRANSLATIONS[app.title]?.titleEn) : app.title;
            const displayDesc = (!isZh && (app.descriptionEn || KNOWN_TRANSLATIONS[app.title]?.descriptionEn)) ? (app.descriptionEn || KNOWN_TRANSLATIONS[app.title]?.descriptionEn) : app.description;
            targetEl.innerHTML = `
                <div class="font-bold text-white text-sm">${escapeHtml(displayTitle)}</div>
                <div class="text-gray-400 text-xs mt-1">ID: <span class="font-mono text-violet-300">${escapeHtml(app.id)}</span> · ${isZh ? '類型' : 'Type'}: <span class="uppercase text-emerald-400 font-bold">${escapeHtml(app.category || 'html')}</span></div>
                <div class="text-gray-400 text-[11px] mt-1 line-clamp-2">${escapeHtml(displayDesc || '')}</div>
            `;
        }
        const modal = document.getElementById('app-delete-modal');
        if (modal) modal.classList.remove('hidden');
        else {
            if (confirm(getCurrentLang() === 'en' ? 'Delete this app?' : '確定刪除此應用？')) {
                executeDeleteApp();
            }
        }
    }

    function executeDeleteApp() {
        if (!appToDeleteId) return;
        const apps = loadCustomAppsFromStorage().filter(a => a.id !== appToDeleteId);
        saveCustomAppsToStorage(apps);
        appToDeleteId = null;
        closeAppDeleteModal();
        renderAppLibraryGrid();
    }

    function closeAppDeleteModal() {
        const modal = document.getElementById('app-delete-modal');
        if (modal) modal.classList.add('hidden');
        appToDeleteId = null;
    }

    function loadSampleAppsAction() {
        const samples = getSampleCustomApps();
        saveCustomAppsToStorage(samples);
        renderAppLibraryGrid();
        alert(getCurrentLang() === 'en' ? 'Sample apps restored!' : '範本應用已成功載入！');
    }

    async function translateCurrentAppWithLLMAction() {
        const titleEl = document.getElementById('app-edit-name') || document.getElementById('edit-app-title');
        const descEl = document.getElementById('app-edit-desc') || document.getElementById('edit-app-desc');
        const btn = document.getElementById('btn-llm-translate-app');
        if (!titleEl || !descEl) return;

        const currentTitle = titleEl.value.trim();
        const currentDesc = descEl.value.trim();
        const isZh = (getCurrentLang() !== 'en');
        if (!currentTitle && !currentDesc) {
            alert(isZh ? '請先輸入應用名稱或說明！' : 'Please enter a title or description first.');
            return;
        }

        const origHtml = btn ? btn.innerHTML : '';
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = `<span class="inline-block animate-spin">⏳</span> <span>${isZh ? 'LLM 翻譯中...' : 'Translating...'}</span>`;
        }

        try {
            let res = null;
            if (window.webcomApp && typeof window.webcomApp.translateWithLLM === 'function') {
                res = await window.webcomApp.translateWithLLM(currentTitle, currentDesc);
            }
            if (res && res.title) {
                titleEl.value = res.title;
                if (res.description) descEl.value = res.description;
                if (isZh) {
                    titleEl.dataset.titleEn = res.title;
                    descEl.dataset.descEn = res.description;
                } else {
                    titleEl.dataset.titleZh = res.title;
                    descEl.dataset.descZh = res.description;
                }
            }
        } catch (err) {
            console.error('LLM translate failed:', err);
            alert((isZh ? '翻譯失敗：' : 'Translation failed: ') + (err.message || err));
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = origHtml;
                if (window.lucide) lucide.createIcons();
            }
        }
    }

    async function translateAllAppsWithLLMAction() {
        const btn = document.getElementById('btn-llm-translate-all-apps');
        const apps = loadCustomAppsFromStorage();
        if (!apps || !apps.length) return;

        const isZh = (getCurrentLang() !== 'en');
        const origHtml = btn ? btn.innerHTML : '';
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = `<span class="inline-block animate-spin">⏳</span> <span>${isZh ? '翻譯中...' : 'Translating...'}</span>`;
        }

        let count = 0;
        try {
            for (let app of apps) {
                if (!app.titleEn || !app.descriptionEn) {
                    if (KNOWN_TRANSLATIONS[app.title]) {
                        app.titleEn = KNOWN_TRANSLATIONS[app.title].titleEn;
                        app.descriptionEn = KNOWN_TRANSLATIONS[app.title].descriptionEn;
                        count++;
                    } else if (window.webcomApp && typeof window.webcomApp.translateWithLLM === 'function') {
                        const res = await window.webcomApp.translateWithLLM(app.title, app.description, 'English');
                        if (res && res.title) {
                            app.titleEn = res.title;
                            app.descriptionEn = res.description || '';
                            count++;
                        }
                    }
                }
            }
            saveCustomAppsToStorage(apps);
            renderAppLibraryGrid();
            alert(isZh ? `雙語翻譯完成！已為 ${count} 個應用補齊英文章節。` : `Bilingual translation complete! Updated ${count} apps.`);
        } catch (err) {
            console.error('Translate all apps failed:', err);
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = origHtml;
                if (window.lucide) lucide.createIcons();
            }
        }
    }

    function exportCustomAppsAction() {
        const apps = loadCustomAppsFromStorage();
        const blob = new Blob([JSON.stringify(apps, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `webcom_apps_backup_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function triggerImportApps() {
        const fileInp = document.getElementById('file-import-apps');
        if (fileInp) {
            fileInp.value = '';
            fileInp.click();
        }
    }

    function initAppLibraryEvents() {
        // Modal toggles
        document.getElementById('btn-open-app-lib')?.addEventListener('click', openAppLibraryModal);
        document.getElementById('btn-close-app-lib')?.addEventListener('click', closeAppLibraryModal);
        document.getElementById('btn-close-app-lib-footer')?.addEventListener('click', closeAppLibraryModal);

        // Search input
        const searchInp = document.getElementById('app-lib-search-input');
        if (searchInp) {
            searchInp.addEventListener('input', (e) => {
                renderAppLibraryGrid(e.target.value);
            });
        }

        // App Library Backdrop Click
        const modal = document.getElementById('app-library-modal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) closeAppLibraryModal();
            });
        }

        // Edit Modal Events
        document.getElementById('btn-new-custom-app')?.addEventListener('click', () => openEditCustomAppModal(null));
        document.getElementById('btn-close-app-edit')?.addEventListener('click', closeAppEditModal);
        document.getElementById('btn-cancel-custom-app')?.addEventListener('click', closeAppEditModal);
        document.getElementById('btn-save-custom-app')?.addEventListener('click', saveCustomAppFromModal);
        document.getElementById('btn-preview-custom-app')?.addEventListener('click', previewCustomAppFromModal);

        // Delete Modal Events
        document.getElementById('btn-confirm-app-delete')?.addEventListener('click', executeDeleteApp);
        document.getElementById('btn-cancel-app-delete')?.addEventListener('click', closeAppDeleteModal);

        // Edit Modal Code Stats & Sample Snippets
        const codeArea = document.getElementById('app-edit-code') || document.getElementById('edit-app-code');
        if (codeArea) {
            codeArea.addEventListener('input', updateCodeStats);
        }

        const catSelect = document.getElementById('app-edit-category') || document.getElementById('edit-app-category');
        if (catSelect && codeArea) {
            catSelect.addEventListener('change', () => {
                if (!codeArea.value.trim() || codeArea.value.includes('自訂小工具') || codeArea.value.includes('Fibonacci') || codeArea.value.includes('=== Webcom AI')) {
                    codeArea.value = getStarterTemplateForCategory(catSelect.value);
                    updateCodeStats();
                }
            });
        }

        document.getElementById('btn-app-edit-sample-code')?.addEventListener('click', () => {
            if (codeArea && catSelect) {
                codeArea.value = getStarterTemplateForCategory(catSelect.value);
                updateCodeStats();
            }
        });

        document.getElementById('btn-app-edit-copy-code')?.addEventListener('click', () => {
            if (codeArea && codeArea.value) {
                navigator.clipboard?.writeText(codeArea.value);
                alert(getCurrentLang() === 'en' ? 'Code copied to clipboard!' : '代碼已複製至剪貼簿！');
            }
        });

        // Import Backup JSON File
        const fileImport = document.getElementById('file-import-apps');
        if (fileImport) {
            fileImport.addEventListener('change', (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (evt) => {
                    try {
                        const imported = JSON.parse(evt.target.result);
                        if (Array.isArray(imported)) {
                            const existing = loadCustomAppsFromStorage();
                            const map = new Map(existing.map(a => [a.id, a]));
                            imported.forEach(a => { if (a && a.id && a.title) map.set(a.id, a); });
                            const merged = Array.from(map.values());
                            saveCustomAppsToStorage(merged);
                            renderAppLibraryGrid();
                            alert(getCurrentLang() === 'en' ? `Successfully imported ${imported.length} apps!` : `成功匯入 ${imported.length} 個應用程式！`);
                        } else {
                            alert('JSON 格式錯誤：根項目必須為應用陣列 (Array)。');
                        }
                    } catch (err) {
                        alert('匯入失敗：無效的 JSON 檔案 - ' + err.message);
                    }
                };
                reader.readAsText(file);
            });
        }
    }

    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', initAppLibraryEvents); } else { initAppLibraryEvents(); }

    window.openAppLibraryModal = openAppLibraryModal;
    window.closeAppLibraryModal = closeAppLibraryModal;
    window.openEditCustomAppModal = openEditCustomAppModal;
    window.closeAppEditModal = closeAppEditModal;
    window.saveCustomAppFromModal = saveCustomAppFromModal;
    window.previewCustomAppFromModal = previewCustomAppFromModal;
    window.confirmDeleteAppAction = confirmDeleteAppAction;
    window.executeDeleteApp = executeDeleteApp;
    window.closeAppDeleteModal = closeAppDeleteModal;
    window.filterAppLibraryCategory = filterAppLibraryCategory;
    window.loadSampleAppsAction = loadSampleAppsAction;
    window.exportCustomAppsAction = exportCustomAppsAction;
    window.triggerImportApps = triggerImportApps;
    window.runCustomAppInSandbox = runCustomAppInSandbox;
    window.renderAppLibraryGrid = renderAppLibraryGrid;
    window.translateCurrentAppWithLLMAction = translateCurrentAppWithLLMAction;
    window.translateAllAppsWithLLMAction = translateAllAppsWithLLMAction;
})();
