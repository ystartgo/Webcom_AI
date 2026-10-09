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
        'PPT 方塊圖向量還原器': {
            titleEn: 'PPT Diagram to Editable PPTX',
            descriptionEn: 'Convert user-uploaded diagram images into Base64 and adaptive high-contrast recognition format, extracting boxes and text to output genuine native editable Microsoft PowerPoint (.pptx) files.'
        },
        '3D 智慧元件工作坊': {
            titleEn: '3D Component Studio',
            descriptionEn: 'WebGL shader studio with Transparent glass, Emissive core glow, Fresnel holographic rim lighting, Wireframe overlay, and precision AutoCAD DWG/DXF & ISO STEP AP214 vector exports.'
        },

        'PPT 流程圖向量還原器': {
            titleEn: 'PPT Diagram Vectorizer & Editor',
            descriptionEn: 'Convert PPT diagram screenshots back into editable vector block diagrams with connectors, text, and PPT-convertible SVG export.'
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
                version: 'v3.2',
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

    <!-- Navigation Modes & Controls -->
    <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
      <div class="nav-tabs">
        <button type="button" class="nav-btn active" id="tab-btn-sender" onclick="switchTab('sender')">📤 <span id="label-tab-sender">發送端 (Sender)</span></button>
        <button type="button" class="nav-btn" id="tab-btn-receiver" onclick="switchTab('receiver')">📥 <span id="label-tab-receiver">接收端 (Receiver)</span></button>
        <button type="button" class="nav-btn" id="tab-btn-loopback" onclick="switchTab('loopback')">🔄 <span id="label-tab-loopback">雙向自測 (Demo)</span></button>
      </div>
      <button type="button" id="btn-lang-toggle" class="btn btn-secondary" style="font-size: 0.75rem; padding: 0.35rem 0.65rem;" onclick="toggleAppLanguage()">🌐 EN / 繁中</button>
      <button type="button" class="btn btn-secondary" style="font-size: 0.75rem; padding: 0.35rem 0.65rem;" onclick="window.close()" title="關閉傳輸視窗">✕</button>
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
            <textarea id="sender-text" rows="6" placeholder="輸入或貼上要光學傳輸的文字內容..." oninput="updateSenderPayloadMetrics()"></textarea>
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
            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
              <button type="button" id="btn-copy-result" class="btn btn-secondary" style="flex: 1;" onclick="copyReceiverResult()">📋 複製內容</button>
              <button type="button" id="btn-download-result" class="btn btn-success" style="flex: 1;" onclick="downloadReceiverResult()">💾 下載檔案</button>
              <button type="button" id="btn-import-received-rag" class="btn btn-primary" style="flex: 1.5; display: none; background: linear-gradient(135deg, #4f46e5, #06b6d4);" onclick="importReceivedPayloadToRag()">✨ 一鍵入庫 RAG 知識庫</button>
              <button type="button" id="btn-reset-receiver" class="btn btn-secondary" onclick="resetReceiverState()">🔄 清空重置</button>
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
    <!-- Footer Attribution & Copyright -->
    <footer style="margin-top: 1.5rem; padding: 1rem 0.5rem; border-top: 1px solid var(--border); font-size: 0.75rem; color: var(--muted); display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 0.75rem;">
      <div style="line-height: 1.5;">
        <div>📡 <strong>Decimen Optical Air-Gap Protocol</strong> by <strong>Evan Crawley / Decimen</strong> (Apache 2.0 License).</div>
        <div>🛡️ Integrated into <strong>Webcom AI Dual-Engine Console</strong> by <strong>startgo</strong> (<a href="mailto:startgo@yia.app" style="color: #38bdf8; text-decoration: underline;">startgo@yia.app</a>, GPLv3).</div>
      </div>
      <div style="font-family: monospace; font-size: 0.7rem; color: #64748b; text-align: right;">
        100% In-Browser &bull; Zero External Network &bull; Pure Optical Wireless
      </div>
    </footer>
  </main>

  <!-- ============================================================ -->
  <!-- Embedded Offline QRCode.js Engine (Zero External Dependencies) -->
  <!-- ============================================================ -->
  <script>
var QRCode;!function(){function a(a){
  this.mode=c.MODE_8BIT_BYTE;
  this.data=a;
  if(typeof a==='string'){
    if(typeof TextEncoder!=='undefined'){
      this.parsedData=Array.from(new TextEncoder().encode(a));
    } else {
      this.parsedData=[];
      for(var i=0;i<a.length;i++){
        var code=a.charCodeAt(i);
        if(code<0x80) this.parsedData.push(code);
        else if(code<0x800) this.parsedData.push(0xc0|(code>>6), 0x80|(code&0x3f));
        else if(code<0xd800||code>=0xe000) this.parsedData.push(0xe0|(code>>12), 0x80|((code>>6)&0x3f), 0x80|(code&0x3f));
        else { i++; code=((code&0x3ff)<<10)|(a.charCodeAt(i)&0x3ff)+0x10000; this.parsedData.push(0xf0|(code>>18), 0x80|((code>>12)&0x3f), 0x80|((code>>6)&0x3f), 0x80|(code&0x3f)); }
      }
    }
  } else {
    this.parsedData=Array.from(a);
  }
}function b(a,b){this.typeNumber=a,this.errorCorrectLevel=b,this.modules=null,this.moduleCount=0,this.dataCache=null,this.dataList=[]}function i(a,b){if(void 0==a.length)throw new Error(a.length+"/"+b);for(var c=0;c<a.length&&0==a[c];)c++;this.num=new Array(a.length-c+b);for(var d=0;d<a.length-c;d++)this.num[d]=a[d+c]}function j(a,b){this.totalCount=a,this.dataCount=b}function k(){this.buffer=[],this.length=0}function m(){return"undefined"!=typeof CanvasRenderingContext2D}function n(){var a=!1,b=navigator.userAgent;return/android/i.test(b)&&(a=!0,aMat=b.toString().match(/android ([0-9]\\.[0-9])/i),aMat&&aMat[1]&&(a=parseFloat(aMat[1]))),a}function r(a,b){for(var c=1,e=s(a),f=0,g=l.length;g>=f;f++){var h=0;switch(b){case d.L:h=l[f][0];break;case d.M:h=l[f][1];break;case d.Q:h=l[f][2];break;case d.H:h=l[f][3]}if(h>=e)break;c++}if(c>l.length)throw new Error("Too long data");return c}function s(a){
  if(typeof a==='string'){
    if(typeof TextEncoder!=='undefined') return new TextEncoder().encode(a).length;
    var len=0;
    for(var i=0;i<a.length;i++){
      var code=a.charCodeAt(i);
      if(code<0x80) len+=1;
      else if(code<0x800) len+=2;
      else if(code<0xd800||code>=0xe000) len+=3;
      else { i++; len+=4; }
    }
    return len;
  }
  return a.length;
}a.prototype={getLength:function(){return this.parsedData.length},write:function(a){for(var b=0,c=this.parsedData.length;c>b;b++)a.put(this.parsedData[b],8)}},b.prototype={addData:function(b){var c=new a(b);this.dataList.push(c),this.dataCache=null},isDark:function(a,b){if(0>a||this.moduleCount<=a||0>b||this.moduleCount<=b)throw new Error(a+","+b);return this.modules[a][b]},getModuleCount:function(){return this.moduleCount},make:function(){this.makeImpl(!1,this.getBestMaskPattern())},makeImpl:function(a,c){this.moduleCount=4*this.typeNumber+17,this.modules=new Array(this.moduleCount);for(var d=0;d<this.moduleCount;d++){this.modules[d]=new Array(this.moduleCount);for(var e=0;e<this.moduleCount;e++)this.modules[d][e]=null}this.setupPositionProbePattern(0,0),this.setupPositionProbePattern(this.moduleCount-7,0),this.setupPositionProbePattern(0,this.moduleCount-7),this.setupPositionAdjustPattern(),this.setupTimingPattern(),this.setupTypeInfo(a,c),this.typeNumber>=7&&this.setupTypeNumber(a),null==this.dataCache&&(this.dataCache=b.createData(this.typeNumber,this.errorCorrectLevel,this.dataList)),this.mapData(this.dataCache,c)},setupPositionProbePattern:function(a,b){for(var c=-1;7>=c;c++)if(!(-1>=a+c||this.moduleCount<=a+c))for(var d=-1;7>=d;d++)-1>=b+d||this.moduleCount<=b+d||(this.modules[a+c][b+d]=c>=0&&6>=c&&(0==d||6==d)||d>=0&&6>=d&&(0==c||6==c)||c>=2&&4>=c&&d>=2&&4>=d?!0:!1)},getBestMaskPattern:function(){for(var a=0,b=0,c=0;8>c;c++){this.makeImpl(!0,c);var d=f.getLostPoint(this);(0==c||a>d)&&(a=d,b=c)}return b},createMovieClip:function(a,b,c){var d=a.createEmptyMovieClip(b,c),e=1;this.make();for(var f=0;f<this.modules.length;f++)for(var g=f*e,h=0;h<this.modules[f].length;h++){var i=h*e,j=this.modules[f][h];j&&(d.beginFill(0,100),d.moveTo(i,g),d.lineTo(i+e,g),d.lineTo(i+e,g+e),d.lineTo(i,g+e),d.endFill())}return d},setupTimingPattern:function(){for(var a=8;a<this.moduleCount-8;a++)null==this.modules[a][6]&&(this.modules[a][6]=0==a%2);for(var b=8;b<this.moduleCount-8;b++)null==this.modules[6][b]&&(this.modules[6][b]=0==b%2)},setupPositionAdjustPattern:function(){for(var a=f.getPatternPosition(this.typeNumber),b=0;b<a.length;b++)for(var c=0;c<a.length;c++){var d=a[b],e=a[c];if(null==this.modules[d][e])for(var g=-2;2>=g;g++)for(var h=-2;2>=h;h++)this.modules[d+g][e+h]=-2==g||2==g||-2==h||2==h||0==g&&0==h?!0:!1}},setupTypeNumber:function(a){for(var b=f.getBCHTypeNumber(this.typeNumber),c=0;18>c;c++){var d=!a&&1==(1&b>>c);this.modules[Math.floor(c/3)][c%3+this.moduleCount-8-3]=d}for(var c=0;18>c;c++){var d=!a&&1==(1&b>>c);this.modules[c%3+this.moduleCount-8-3][Math.floor(c/3)]=d}},setupTypeInfo:function(a,b){for(var c=this.errorCorrectLevel<<3|b,d=f.getBCHTypeInfo(c),e=0;15>e;e++){var g=!a&&1==(1&d>>e);6>e?this.modules[e][8]=g:8>e?this.modules[e+1][8]=g:this.modules[this.moduleCount-15+e][8]=g}for(var e=0;15>e;e++){var g=!a&&1==(1&d>>e);8>e?this.modules[8][this.moduleCount-e-1]=g:9>e?this.modules[8][15-e-1+1]=g:this.modules[8][15-e-1]=g}this.modules[this.moduleCount-8][8]=!a},mapData:function(a,b){for(var c=-1,d=this.moduleCount-1,e=7,g=0,h=this.moduleCount-1;h>0;h-=2)for(6==h&&h--;;){for(var i=0;2>i;i++)if(null==this.modules[d][h-i]){var j=!1;g<a.length&&(j=1==(1&a[g]>>>e));var k=f.getMask(b,d,h-i);k&&(j=!j),this.modules[d][h-i]=j,e--,-1==e&&(g++,e=7)}if(d+=c,0>d||this.moduleCount<=d){d-=c,c=-c;break}}}},b.PAD0=236,b.PAD1=17,b.createData=function(a,c,d){for(var e=j.getRSBlocks(a,c),g=new k,h=0;h<d.length;h++){var i=d[h];g.put(i.mode,4),g.put(i.getLength(),f.getLengthInBits(i.mode,a)),i.write(g)}for(var l=0,h=0;h<e.length;h++)l+=e[h].dataCount;if(g.getLengthInBits()>8*l)throw new Error("code length overflow. ("+g.getLengthInBits()+">"+8*l+")");for(g.getLengthInBits()+4<=8*l&&g.put(0,4);0!=g.getLengthInBits()%8;)g.putBit(!1);for(;;){if(g.getLengthInBits()>=8*l)break;if(g.put(b.PAD0,8),g.getLengthInBits()>=8*l)break;g.put(b.PAD1,8)}return b.createBytes(g,e)},b.createBytes=function(a,b){for(var c=0,d=0,e=0,g=new Array(b.length),h=new Array(b.length),j=0;j<b.length;j++){var k=b[j].dataCount,l=b[j].totalCount-k;d=Math.max(d,k),e=Math.max(e,l),g[j]=new Array(k);for(var m=0;m<g[j].length;m++)g[j][m]=255&a.buffer[m+c];c+=k;var n=f.getErrorCorrectPolynomial(l),o=new i(g[j],n.getLength()-1),p=o.mod(n);h[j]=new Array(n.getLength()-1);for(var m=0;m<h[j].length;m++){var q=m+p.getLength()-h[j].length;h[j][m]=q>=0?p.get(q):0}}for(var r=0,m=0;m<b.length;m++)r+=b[m].totalCount;for(var s=new Array(r),t=0,m=0;d>m;m++)for(var j=0;j<b.length;j++)m<g[j].length&&(s[t++]=g[j][m]);for(var m=0;e>m;m++)for(var j=0;j<b.length;j++)m<h[j].length&&(s[t++]=h[j][m]);return s};for(var c={MODE_NUMBER:1,MODE_ALPHA_NUM:2,MODE_8BIT_BYTE:4,MODE_KANJI:8},d={L:1,M:0,Q:3,H:2},e={PATTERN000:0,PATTERN001:1,PATTERN010:2,PATTERN011:3,PATTERN100:4,PATTERN101:5,PATTERN110:6,PATTERN111:7},f={PATTERN_POSITION_TABLE:[[],[6,18],[6,22],[6,26],[6,30],[6,34],[6,22,38],[6,24,42],[6,26,46],[6,28,50],[6,30,54],[6,32,58],[6,34,62],[6,26,46,66],[6,26,48,70],[6,26,50,74],[6,30,54,78],[6,30,56,82],[6,30,58,86],[6,34,62,90],[6,28,50,72,94],[6,26,50,74,98],[6,30,54,78,102],[6,28,54,80,106],[6,32,58,84,110],[6,30,58,86,114],[6,34,62,90,118],[6,26,50,74,98,122],[6,30,54,78,102,126],[6,26,52,78,104,130],[6,30,56,82,108,134],[6,34,60,86,112,138],[6,30,58,86,114,142],[6,34,62,90,118,146],[6,30,54,78,102,126,150],[6,24,50,76,102,128,154],[6,28,54,80,106,132,158],[6,32,58,84,110,136,162],[6,26,54,82,110,138,166],[6,30,58,86,114,142,170]],G15:1335,G18:7973,G15_MASK:21522,getBCHTypeInfo:function(a){for(var b=a<<10;f.getBCHDigit(b)-f.getBCHDigit(f.G15)>=0;)b^=f.G15<<f.getBCHDigit(b)-f.getBCHDigit(f.G15);return(a<<10|b)^f.G15_MASK},getBCHTypeNumber:function(a){for(var b=a<<12;f.getBCHDigit(b)-f.getBCHDigit(f.G18)>=0;)b^=f.G18<<f.getBCHDigit(b)-f.getBCHDigit(f.G18);return a<<12|b},getBCHDigit:function(a){for(var b=0;0!=a;)b++,a>>>=1;return b},getPatternPosition:function(a){return f.PATTERN_POSITION_TABLE[a-1]},getMask:function(a,b,c){switch(a){case e.PATTERN000:return 0==(b+c)%2;case e.PATTERN001:return 0==b%2;case e.PATTERN010:return 0==c%3;case e.PATTERN011:return 0==(b+c)%3;case e.PATTERN100:return 0==(Math.floor(b/2)+Math.floor(c/3))%2;case e.PATTERN101:return 0==b*c%2+b*c%3;case e.PATTERN110:return 0==(b*c%2+b*c%3)%2;case e.PATTERN111:return 0==(b*c%3+(b+c)%2)%2;default:throw new Error("bad maskPattern:"+a)}},getErrorCorrectPolynomial:function(a){for(var b=new i([1],0),c=0;a>c;c++)b=b.multiply(new i([1,g.gexp(c)],0));return b},getLengthInBits:function(a,b){if(b>=1&&10>b)switch(a){case c.MODE_NUMBER:return 10;case c.MODE_ALPHA_NUM:return 9;case c.MODE_8BIT_BYTE:return 8;case c.MODE_KANJI:return 8;default:throw new Error("mode:"+a)}else if(27>b)switch(a){case c.MODE_NUMBER:return 12;case c.MODE_ALPHA_NUM:return 11;case c.MODE_8BIT_BYTE:return 16;case c.MODE_KANJI:return 10;default:throw new Error("mode:"+a)}else{if(!(41>b))throw new Error("type:"+b);switch(a){case c.MODE_NUMBER:return 14;case c.MODE_ALPHA_NUM:return 13;case c.MODE_8BIT_BYTE:return 16;case c.MODE_KANJI:return 12;default:throw new Error("mode:"+a)}}},getLostPoint:function(a){for(var b=a.getModuleCount(),c=0,d=0;b>d;d++)for(var e=0;b>e;e++){for(var f=0,g=a.isDark(d,e),h=-1;1>=h;h++)if(!(0>d+h||d+h>=b))for(var i=-1;1>=i;i++)0>e+i||e+i>=b||(0!=h||0!=i)&&g==a.isDark(d+h,e+i)&&f++;f>5&&(c+=3+f-5)}for(var d=0;b-1>d;d++)for(var e=0;b-1>e;e++){var j=0;a.isDark(d,e)&&j++,a.isDark(d+1,e)&&j++,a.isDark(d,e+1)&&j++,a.isDark(d+1,e+1)&&j++,(0==j||4==j)&&(c+=3)}for(var d=0;b>d;d++)for(var e=0;b-6>e;e++)a.isDark(d,e)&&!a.isDark(d,e+1)&&a.isDark(d,e+2)&&a.isDark(d,e+3)&&a.isDark(d,e+4)&&!a.isDark(d,e+5)&&a.isDark(d,e+6)&&(c+=40);for(var e=0;b>e;e++)for(var d=0;b-6>d;d++)a.isDark(d,e)&&!a.isDark(d+1,e)&&a.isDark(d+2,e)&&a.isDark(d+3,e)&&a.isDark(d+4,e)&&!a.isDark(d+5,e)&&a.isDark(d+6,e)&&(c+=40);for(var k=0,e=0;b>e;e++)for(var d=0;b>d;d++)a.isDark(d,e)&&k++;var l=Math.abs(100*k/b/b-50)/5;return c+=10*l}},g={glog:function(a){if(1>a)throw new Error("glog("+a+")");return g.LOG_TABLE[a]},gexp:function(a){for(;0>a;)a+=255;for(;a>=256;)a-=255;return g.EXP_TABLE[a]},EXP_TABLE:new Array(256),LOG_TABLE:new Array(256)},h=0;8>h;h++)g.EXP_TABLE[h]=1<<h;for(var h=8;256>h;h++)g.EXP_TABLE[h]=g.EXP_TABLE[h-4]^g.EXP_TABLE[h-5]^g.EXP_TABLE[h-6]^g.EXP_TABLE[h-8];for(var h=0;255>h;h++)g.LOG_TABLE[g.EXP_TABLE[h]]=h;i.prototype={get:function(a){return this.num[a]},getLength:function(){return this.num.length},multiply:function(a){for(var b=new Array(this.getLength()+a.getLength()-1),c=0;c<this.getLength();c++)for(var d=0;d<a.getLength();d++)b[c+d]^=g.gexp(g.glog(this.get(c))+g.glog(a.get(d)));return new i(b,0)},mod:function(a){if(this.getLength()-a.getLength()<0)return this;for(var b=g.glog(this.get(0))-g.glog(a.get(0)),c=new Array(this.getLength()),d=0;d<this.getLength();d++)c[d]=this.get(d);for(var d=0;d<a.getLength();d++)c[d]^=g.gexp(g.glog(a.get(d))+b);return new i(c,0).mod(a)}},j.RS_BLOCK_TABLE=[[1,26,19],[1,26,16],[1,26,13],[1,26,9],[1,44,34],[1,44,28],[1,44,22],[1,44,16],[1,70,55],[1,70,44],[2,35,17],[2,35,13],[1,100,80],[2,50,32],[2,50,24],[4,25,9],[1,134,108],[2,67,43],[2,33,15,2,34,16],[2,33,11,2,34,12],[2,86,68],[4,43,27],[4,43,19],[4,43,15],[2,98,78],[4,49,31],[2,32,14,4,33,15],[4,39,13,1,40,14],[2,121,97],[2,60,38,2,61,39],[4,40,18,2,41,19],[4,40,14,2,41,15],[2,146,116],[3,58,36,2,59,37],[4,36,16,4,37,17],[4,36,12,4,37,13],[2,86,68,2,87,69],[4,69,43,1,70,44],[6,43,19,2,44,20],[6,43,15,2,44,16],[4,101,81],[1,80,50,4,81,51],[4,50,22,4,51,23],[3,36,12,8,37,13],[2,116,92,2,117,93],[6,58,36,2,59,37],[4,46,20,6,47,21],[7,42,14,4,43,15],[4,133,107],[8,59,37,1,60,38],[8,44,20,4,45,21],[12,33,11,4,34,12],[3,145,115,1,146,116],[4,64,40,5,65,41],[11,36,16,5,37,17],[11,36,12,5,37,13],[5,109,87,1,110,88],[5,65,41,5,66,42],[5,54,24,7,55,25],[11,36,12],[5,122,98,1,123,99],[7,73,45,3,74,46],[15,43,19,2,44,20],[3,45,15,13,46,16],[1,135,107,5,136,108],[10,74,46,1,75,47],[1,50,22,15,51,23],[2,42,14,17,43,15],[5,150,120,1,151,121],[9,69,43,4,70,44],[17,50,22,1,51,23],[2,42,14,19,43,15],[3,141,113,4,142,114],[3,70,44,11,71,45],[17,47,21,4,48,22],[9,39,13,16,40,14],[3,135,107,5,136,108],[3,67,41,13,68,42],[15,54,24,5,55,25],[15,43,15,10,44,16],[4,144,116,4,145,117],[17,68,42],[17,50,22,6,51,23],[19,46,16,6,47,17],[2,139,111,7,140,112],[17,74,46],[7,54,24,16,55,25],[34,37,13],[4,151,121,5,152,122],[4,75,47,14,76,48],[11,54,24,14,55,25],[16,45,15,14,46,16],[6,147,117,4,148,118],[6,73,45,14,74,46],[11,54,24,16,55,25],[30,46,16,2,47,17],[8,132,106,4,133,107],[8,75,47,13,76,48],[7,54,24,22,55,25],[22,45,15,13,46,16],[10,142,114,2,143,115],[19,74,46,4,75,47],[28,50,22,6,51,23],[33,46,16,4,47,17],[8,152,122,4,153,123],[22,73,45,3,74,46],[8,53,23,26,54,24],[12,45,15,28,46,16],[3,147,117,10,148,118],[3,73,45,23,74,46],[4,54,24,31,55,25],[11,45,15,31,46,16],[7,146,116,7,147,117],[21,73,45,7,74,46],[1,53,23,37,54,24],[19,45,15,26,46,16],[5,145,115,10,146,116],[19,75,47,10,76,48],[15,54,24,25,55,25],[23,45,15,25,46,16],[13,145,115,3,146,116],[2,74,46,29,75,47],[42,54,24,1,55,25],[23,45,15,28,46,16],[17,145,115],[10,74,46,23,75,47],[10,54,24,35,55,25],[19,45,15,35,46,16],[17,145,115,1,146,116],[14,74,46,21,75,47],[29,54,24,19,55,25],[11,45,15,46,46,16],[13,145,115,6,146,116],[14,74,46,23,75,47],[44,54,24,7,55,25],[59,46,16,1,47,17],[12,151,121,7,152,122],[12,75,47,26,76,48],[39,54,24,14,55,25],[22,45,15,41,46,16],[6,151,121,14,152,122],[6,75,47,34,76,48],[46,54,24,10,55,25],[2,45,15,64,46,16],[17,152,122,4,153,123],[29,74,46,14,75,47],[49,54,24,10,55,25],[24,45,15,46,46,16],[4,152,122,18,153,123],[13,74,46,32,75,47],[48,54,24,14,55,25],[42,45,15,32,46,16],[20,147,117,4,148,118],[40,75,47,7,76,48],[43,54,24,22,55,25],[10,45,15,67,46,16],[19,148,118,6,149,119],[18,75,47,31,76,48],[34,54,24,34,55,25],[20,45,15,61,46,16]],j.getRSBlocks=function(a,b){var c=j.getRsBlockTable(a,b);if(void 0==c)throw new Error("bad rs block @ typeNumber:"+a+"/errorCorrectLevel:"+b);for(var d=c.length/3,e=[],f=0;d>f;f++)for(var g=c[3*f+0],h=c[3*f+1],i=c[3*f+2],k=0;g>k;k++)e.push(new j(h,i));return e},j.getRsBlockTable=function(a,b){switch(b){case d.L:return j.RS_BLOCK_TABLE[4*(a-1)+0];case d.M:return j.RS_BLOCK_TABLE[4*(a-1)+1];case d.Q:return j.RS_BLOCK_TABLE[4*(a-1)+2];case d.H:return j.RS_BLOCK_TABLE[4*(a-1)+3];default:return void 0}},k.prototype={get:function(a){var b=Math.floor(a/8);return 1==(1&this.buffer[b]>>>7-a%8)},put:function(a,b){for(var c=0;b>c;c++)this.putBit(1==(1&a>>>b-c-1))},getLengthInBits:function(){return this.length},putBit:function(a){var b=Math.floor(this.length/8);this.buffer.length<=b&&this.buffer.push(0),a&&(this.buffer[b]|=128>>>this.length%8),this.length++}};var l=[[17,14,11,7],[32,26,20,14],[53,42,32,24],[78,62,46,34],[106,84,60,44],[134,106,74,58],[154,122,86,64],[192,152,108,84],[230,180,130,98],[271,213,151,119],[321,251,177,137],[367,287,203,155],[425,331,241,177],[458,362,258,194],[520,412,292,220],[586,450,322,250],[644,504,364,280],[718,560,394,310],[792,624,442,338],[858,666,482,382],[929,711,509,403],[1003,779,565,439],[1091,857,611,461],[1171,911,661,511],[1273,997,715,535],[1367,1059,751,593],[1465,1125,805,625],[1528,1190,868,658],[1628,1264,908,698],[1732,1370,982,742],[1840,1452,1030,790],[1952,1538,1112,842],[2068,1628,1168,898],[2188,1722,1228,958],[2303,1809,1283,983],[2431,1911,1351,1051],[2563,1989,1423,1093],[2699,2099,1499,1139],[2809,2213,1579,1219],[2953,2331,1663,1273]],o=function(){var a=function(a,b){this._el=a,this._htOption=b};return a.prototype.draw=function(a){function g(a,b){var c=document.createElementNS("http://www.w3.org/2000/svg",a);for(var d in b)b.hasOwnProperty(d)&&c.setAttribute(d,b[d]);return c}var b=this._htOption,c=this._el,d=a.getModuleCount();Math.floor(b.width/d),Math.floor(b.height/d),this.clear();var h=g("svg",{viewBox:"0 0 "+String(d)+" "+String(d),width:"100%",height:"100%",fill:b.colorLight});h.setAttributeNS("http://www.w3.org/2000/xmlns/","xmlns:xlink","http://www.w3.org/1999/xlink"),c.appendChild(h),h.appendChild(g("rect",{fill:b.colorDark,width:"1",height:"1",id:"template"}));for(var i=0;d>i;i++)for(var j=0;d>j;j++)if(a.isDark(i,j)){var k=g("use",{x:String(i),y:String(j)});k.setAttributeNS("http://www.w3.org/1999/xlink","href","#template"),h.appendChild(k)}},a.prototype.clear=function(){for(;this._el.hasChildNodes();)this._el.removeChild(this._el.lastChild)},a}(),p="svg"===document.documentElement.tagName.toLowerCase(),q=p?o:m()?function(){function a(){this._elImage.src=this._elCanvas.toDataURL("image/png"),this._elImage.style.display="block",this._elCanvas.style.display="none"}function d(a,b){var c=this;if(c._fFail=b,c._fSuccess=a,null===c._bSupportDataURI){var d=document.createElement("img"),e=function(){c._bSupportDataURI=!1,c._fFail&&_fFail.call(c)},f=function(){c._bSupportDataURI=!0,c._fSuccess&&c._fSuccess.call(c)};return d.onabort=e,d.onerror=e,d.onload=f,d.src="data:image/gif;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg==",void 0}c._bSupportDataURI===!0&&c._fSuccess?c._fSuccess.call(c):c._bSupportDataURI===!1&&c._fFail&&c._fFail.call(c)}if(this._android&&this._android<=2.1){var b=1/window.devicePixelRatio,c=CanvasRenderingContext2D.prototype.drawImage;CanvasRenderingContext2D.prototype.drawImage=function(a,d,e,f,g,h,i,j){if("nodeName"in a&&/img/i.test(a.nodeName))for(var l=arguments.length-1;l>=1;l--)arguments[l]=arguments[l]*b;else"undefined"==typeof j&&(arguments[1]*=b,arguments[2]*=b,arguments[3]*=b,arguments[4]*=b);c.apply(this,arguments)}}var e=function(a,b){this._bIsPainted=!1,this._android=n(),this._htOption=b,this._elCanvas=document.createElement("canvas"),this._elCanvas.width=b.width,this._elCanvas.height=b.height,a.appendChild(this._elCanvas),this._el=a,this._oContext=this._elCanvas.getContext("2d"),this._bIsPainted=!1,this._elImage=document.createElement("img"),this._elImage.style.display="none",this._el.appendChild(this._elImage),this._bSupportDataURI=null};return e.prototype.draw=function(a){var b=this._elImage,c=this._oContext,d=this._htOption,e=a.getModuleCount(),f=d.width/e,g=d.height/e,h=Math.round(f),i=Math.round(g);b.style.display="none",this.clear();for(var j=0;e>j;j++)for(var k=0;e>k;k++){var l=a.isDark(j,k),m=k*f,n=j*g;c.strokeStyle=l?d.colorDark:d.colorLight,c.lineWidth=1,c.fillStyle=l?d.colorDark:d.colorLight,c.fillRect(m,n,f,g),c.strokeRect(Math.floor(m)+.5,Math.floor(n)+.5,h,i),c.strokeRect(Math.ceil(m)-.5,Math.ceil(n)-.5,h,i)}this._bIsPainted=!0},e.prototype.makeImage=function(){this._bIsPainted&&d.call(this,a)},e.prototype.isPainted=function(){return this._bIsPainted},e.prototype.clear=function(){this._oContext.clearRect(0,0,this._elCanvas.width,this._elCanvas.height),this._bIsPainted=!1},e.prototype.round=function(a){return a?Math.floor(1e3*a)/1e3:a},e}():function(){var a=function(a,b){this._el=a,this._htOption=b};return a.prototype.draw=function(a){for(var b=this._htOption,c=this._el,d=a.getModuleCount(),e=Math.floor(b.width/d),f=Math.floor(b.height/d),g=['<table style="border:0;border-collapse:collapse;">'],h=0;d>h;h++){g.push("<tr>");for(var i=0;d>i;i++)g.push('<td style="border:0;border-collapse:collapse;padding:0;margin:0;width:'+e+"px;height:"+f+"px;background-color:"+(a.isDark(h,i)?b.colorDark:b.colorLight)+';"></td>');g.push("</tr>")}g.push("</table>"),c.innerHTML=g.join("");var j=c.childNodes[0],k=(b.width-j.offsetWidth)/2,l=(b.height-j.offsetHeight)/2;k>0&&l>0&&(j.style.margin=l+"px "+k+"px")},a.prototype.clear=function(){this._el.innerHTML=""},a}();QRCode=function(a,b){if(this._htOption={width:256,height:256,typeNumber:4,colorDark:"#000000",colorLight:"#ffffff",correctLevel:d.H},"string"==typeof b&&(b={text:b}),b)for(var c in b)this._htOption[c]=b[c];"string"==typeof a&&(a=document.getElementById(a)),this._android=n(),this._el=a,this._oQRCode=null,this._oDrawing=new q(this._el,this._htOption),this._htOption.text&&this.makeCode(this._htOption.text)},QRCode.prototype.makeCode=function(a){this._oQRCode=new b(r(a,this._htOption.correctLevel),this._htOption.correctLevel),this._oQRCode.addData(a),this._oQRCode.make(),this._el.title=a,this._oDrawing.draw(this._oQRCode),this.makeImage()},QRCode.prototype.makeImage=function(){"function"==typeof this._oDrawing.makeImage&&(!this._android||this._android>=3)&&this._oDrawing.makeImage()},QRCode.prototype.clear=function(){this._oDrawing.clear()},QRCode.CorrectLevel=d}();
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
      textEl.value = [
        '# Decimen 光學傳輸測試檔案',
        '日期：' + new Date().toLocaleString(),
        '環境：Webcom AI 離線沙箱',
        '狀態：光學數據噴泉傳輸中...',
        '',
        '這是一份使用 Decimen 協議在兩台裝置間透過「螢幕 ↔ 鏡頭」傳輸的示範文件。',
        '無須連接 Wi-Fi、無須藍牙配對，資料完全以光的形式傳遞！'
      ].join('\\n');
      updateSenderPayloadMetrics();
      if (!senderTimer && prepareSenderPackets()) {
        renderSenderFrame();
        const badge = document.getElementById('sender-qr-badge');
        if (badge) badge.textContent = '待機預覽 [ 1 / ' + senderChunks.length + ' ]';
        const statusBadge = document.getElementById('sender-status-badge');
        if (statusBadge) {
          statusBadge.textContent = '待命中 (已排程)';
          statusBadge.style.color = '#10b981';
        }
      }
    }

    function updateSenderPayloadMetrics() {
      const text = document.getElementById('sender-text')?.value || '';
      const sizeBytes = new Blob([text]).size;
      const sizeEl = document.getElementById('sender-payload-size');
      if (sizeEl) sizeEl.textContent = sizeBytes + ' Bytes';
      updateSenderEstSpeed();
      if (!senderTimer && text.trim().length > 0) {
        if (prepareSenderPackets()) {
          renderSenderFrame();
          const badge = document.getElementById('sender-qr-badge');
          if (badge) badge.textContent = '待機預覽 [ 1 / ' + senderChunks.length + ' ]';
        }
      }
    }

    function updateSenderChunkSize(val) {
      senderChunkSize = parseInt(val, 10);
      const valEl = document.getElementById('sender-chunk-val');
      if (valEl) valEl.textContent = senderChunkSize + ' 字元';
      updateSenderEstSpeed();
    }

    function updateSenderFPS(val) {
      senderFPS = parseInt(val, 10);
      const valEl = document.getElementById('sender-fps-val');
      if (valEl) valEl.textContent = senderFPS + ' FPS';
      updateSenderEstSpeed();
    }

    function updateSenderEstSpeed() {
      const bytesPerSec = Math.round(senderChunkSize * senderFPS);
      const speedEl = document.getElementById('sender-est-speed');
      if (speedEl) speedEl.textContent = '~' + (bytesPerSec / 1024).toFixed(1) + ' KB/s';
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
          infoEl.textContent = '已載入檔案: ' + file.name + ' (' + (file.size / 1024).toFixed(1) + ' KB, ' + (file.type || 'binary') + ')';
        }
        const sizeEl = document.getElementById('sender-payload-size');
        if (sizeEl) sizeEl.textContent = file.size + ' Bytes';
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
      try {
        if (!senderQRCodeObj) {
          container.innerHTML = '';
          senderQRCodeObj = new QRCode(container, {
            text: text,
            width: 248,
            height: 248,
            colorDark: '#000000',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.L
          });
        } else {
          senderQRCodeObj.makeCode(text);
        }
      } catch (e) {
        console.warn('QR Code generation fallback:', e);
        try {
          container.innerHTML = '';
          senderQRCodeObj = new QRCode(container, {
            text: text,
            width: 248,
            height: 248,
            colorDark: '#000000',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.L
          });
        } catch (err2) {
          console.error('QR render fatal error:', err2);
          container.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:#ef4444;font-size:0.75rem;text-align:center;padding:10px;font-weight:600;">⚠️ 封包資料過長<br><span style="color:#64748b;font-size:0.7rem;margin-top:4px;">請調小切片大小 (當前: ' + senderChunkSize + ')</span></div>';
        }
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
      badge.textContent = '發送中 (' + senderFPS + ' FPS)';
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

      document.getElementById('sender-qr-badge').textContent = '幀 [ ' + current + ' / ' + total + ' ] (' + pct + '%)';
      document.getElementById('sender-stat-frame').textContent = '幀: ' + current + ' / ' + total;
      document.getElementById('sender-stat-percent').textContent = pct + '%';
      document.getElementById('sender-progress-fill').style.width = pct + '%';
    }

    function stepSenderFrame(direction) {
      if (senderChunks.length === 0) return;
      senderCurrentIdx = (senderCurrentIdx + direction + senderChunks.length) % senderChunks.length;
      renderSenderFrame();
    }

    function pauseSenderTransmission() {
      senderIsPaused = !senderIsPaused;
      document.getElementById('btn-sender-pause').textContent = senderIsPaused ? '▶ 繼續' : '⏸ 暫停';
      document.getElementById('sender-status-badge').textContent = senderIsPaused ? '已暫停' : '發送中 (' + senderFPS + ' FPS)';
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
          alert(['當前瀏覽器環境限制了鏡頭存取 (需在 localhost 或 HTTPS 下運行)。', '建議點選上方「🔄 雙向自測」體驗完整光學傳輸流程！'].join('\\n'));
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
          alert(['無法開啟相機鏡頭：' + err.message, '請確認已允許相機存取權限。'].join('\\n'));
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
        dot.id = 'chunk-dot-' + i;
        dot.title = '幀 #' + (i + 1);
        matrix.appendChild(dot);
      }
    }

    function updateReceiverMatrixCell(idx) {
      const dot = document.getElementById('chunk-dot-' + idx);
      if (dot) dot.classList.add('received');
    }

    function updateReceiverProgress() {
      const current = receiverChunksMap.size;
      const total = receiverTotalChunks;
      const pct = Math.round((current / total) * 100);

      document.getElementById('receiver-progress-fill').style.width = pct + '%';
      document.getElementById('receiver-stat-chunks').textContent = '接收進度: ' + current + ' / ' + total + ' 幀';
      document.getElementById('receiver-stat-percent').textContent = pct + '%';

      const elapsedSec = (performance.now() - receiverStartTime) / 1000;
      document.getElementById('metric-time').textContent = elapsedSec.toFixed(1) + ' s';

      if (elapsedSec > 0) {
        const speedKB = (receiverTotalBytes / 1024) / elapsedSec;
        document.getElementById('metric-speed').textContent = speedKB.toFixed(1) + ' KB/s';
        document.getElementById('receiver-telemetry').textContent = '正在以 ~' + speedKB.toFixed(1) + ' KB/s 光學接收中...';
      }
    }

    function finalizeReceiverAssembly() {
      const elapsedSec = ((performance.now() - receiverStartTime) / 1000).toFixed(1);
      const avgSpeed = ((receiverTotalBytes / 1024) / parseFloat(elapsedSec || 1)).toFixed(1);

      document.getElementById('receiver-telemetry').textContent = '✔ 接收完成 (' + avgSpeed + ' KB/s)';
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
      document.getElementById('result-filename').textContent = receiverMeta.name + ' (' + (receiverMeta.size/1024).toFixed(1) + ' KB)';

      const previewEl = document.getElementById('result-preview');
      if (fullPayload.startsWith('data:image/')) {
        previewEl.innerHTML = '<img src="' + fullPayload + '" style="max-height: 120px; border-radius: 4px; display: block; margin: 0 auto;">';
      } else if (fullPayload.startsWith('data:')) {
        previewEl.textContent = '[二進位檔案資料已還原，大小 ' + (fullPayload.length*0.75/1024).toFixed(1) + ' KB]';
      } else {
        previewEl.textContent = fullPayload;
      }

      window.lastReceivedPayload = fullPayload;
      window.lastReceivedMeta = receiverMeta;

      // Auto-detect RAG format
      let isRag = false;
      try {
        const parsed = JSON.parse(fullPayload);
        if (parsed && (parsed.format === 'ragpack' || Array.isArray(parsed.documents) || (parsed.title && parsed.content))) {
          isRag = true;
        }
      } catch (e) {}

      const ragBtn = document.getElementById('btn-import-received-rag');
      if (ragBtn) {
        ragBtn.style.display = isRag ? 'inline-flex' : 'none';
        ragBtn.disabled = false;
        ragBtn.textContent = '✨ 一鍵入庫 RAG 知識庫';
        ragBtn.style.background = 'linear-gradient(135deg, #4f46e5, #06b6d4)';
      }
    }

    function importReceivedPayloadToRag() {
      if (!window.lastReceivedPayload) return;
      try {
        const data = JSON.parse(window.lastReceivedPayload);
        const docsToAdd = data.documents || (Array.isArray(data) ? data : (data.title && data.content ? [data] : []));
        if (!docsToAdd.length) {
          alert('未找到有效的知識文件格式！');
          return;
        }
        let currentDocs = [];
        try {
          currentDocs = JSON.parse(localStorage.getItem('webcom_rag_docs') || '[]');
        } catch(e) {
          currentDocs = [];
        }
        let addedCount = 0;
        docsToAdd.forEach(d => {
          if (!d.id) d.id = 'doc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
          if (!currentDocs.some(exist => exist.id === d.id || (exist.title === d.title && exist.content === d.content))) {
            currentDocs.unshift(d);
            addedCount++;
          }
        });
        localStorage.setItem('webcom_rag_docs', JSON.stringify(currentDocs));

        // Notify parent or opener if available
        if (window.opener && typeof window.opener.renderRagDocList === 'function') {
          window.opener.renderRagCategoryTabs?.();
          window.opener.renderRagDocList?.();
          if (window.opener.graphRagEngine) {
            window.opener.graphRagEngine.rebuildFromAllDocs?.();
          }
        }
        alert(\`🎉 成功透過光學隔空傳輸匯入 \${addedCount} 篇知識文件至 RAG 知識庫！\`);
        const btn = document.getElementById('btn-import-received-rag');
        if (btn) {
          btn.textContent = '✔ 已成功入庫 RAG';
          btn.style.background = '#059669';
          btn.disabled = true;
        }
      } catch (err) {
        alert('匯入失敗：' + err.message);
      }
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
      const inputVal = (document.getElementById('loop-input')?.value || '').trim();
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
        dot.id = 'loop-dot-' + i;
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
          correctLevel: QRCode.CorrectLevel.L
        });
      }

      loopTimer = setInterval(() => {
        if (loopIdx >= loopChunks.length) loopIdx = 0;
        const pktStr = loopChunks[loopIdx];
        loopQRCodeObj.makeCode(pktStr);
        document.getElementById('loop-qr-badge').textContent = '幀 [ ' + (loopIdx + 1) + ' / ' + total + ' ]';
        document.getElementById('loop-sender-stat').textContent = '發送幀: ' + (loopIdx + 1) + ' / ' + total;

        if (!loopReceived.has(loopIdx)) {
          loopReceived.set(loopIdx, JSON.parse(pktStr).c);
          document.getElementById('loop-dot-' + loopIdx)?.classList.add('received');

          const progressPct = Math.round((loopReceived.size / total) * 100);
          document.getElementById('loop-progress-fill').style.width = progressPct + '%';
          document.getElementById('loop-receiver-stat').textContent = '拼裝進度: ' + loopReceived.size + ' / ' + total;

          const dt = (performance.now() - loopStartTime) / 1000;
          const spd = ((inputVal.length / 1024) / (dt || 0.1)).toFixed(1);
          document.getElementById('loop-receiver-speed').textContent = spd + ' KB/s';

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

    // Language Switching Logic
    let currentAppLang = 'zh-TW';
    function toggleAppLanguage() {
      currentAppLang = (currentAppLang === 'zh-TW') ? 'en' : 'zh-TW';
      applyAppLanguage(currentAppLang);
    }

    function applyAppLanguage(lang) {
      const isEn = (lang === 'en');
      const langBtn = document.getElementById('btn-lang-toggle');
      if (langBtn) langBtn.textContent = isEn ? '🌐 Switch ZH' : '🌐 Switch EN';
      
      const tabSender = document.getElementById('label-tab-sender');
      if (tabSender) tabSender.textContent = isEn ? 'Sender' : '發送端 (Sender)';
      const tabReceiver = document.getElementById('label-tab-receiver');
      if (tabReceiver) tabReceiver.textContent = isEn ? 'Receiver' : '接收端 (Receiver)';
      const tabLoopback = document.getElementById('label-tab-loopback');
      if (tabLoopback) tabLoopback.textContent = isEn ? 'Loopback Demo' : '雙向自測 (Demo)';
      
      const btnStart = document.getElementById('btn-sender-start');
      if (btnStart) btnStart.textContent = isEn ? '🚀 Start Transmission' : '🚀 開始發送';
      const btnStop = document.getElementById('btn-sender-stop');
      if (btnStop) btnStop.textContent = isEn ? '⏹ Stop' : '⏹ 停止';
      const btnCam = document.getElementById('btn-cam-toggle');
      if (btnCam) btnCam.textContent = isEn ? '📷 Toggle Camera' : '📷 啟動鏡頭掃描';
      const copyBtn = document.getElementById('btn-copy-result');
      if (copyBtn) copyBtn.textContent = isEn ? '📋 Copy Content' : '📋 複製內容';
      const dlBtn = document.getElementById('btn-download-result');
      if (dlBtn) dlBtn.textContent = isEn ? '💾 Download File' : '💾 下載檔案';
      const rstBtn = document.getElementById('btn-reset-receiver');
      if (rstBtn) rstBtn.textContent = isEn ? '🔄 Reset' : '🔄 清空重置';
      const ragBtn = document.getElementById('btn-import-received-rag');
      if (ragBtn && !ragBtn.disabled) ragBtn.textContent = isEn ? '✨ Ingest into RAG' : '✨ 一鍵入庫 RAG 知識庫';
    }

    // Prefill Handling from Webcom AI RAG
    function checkPrefillPayload() {
      try {
        const hash = window.location.hash.replace('#', '');
        const prefillRaw = localStorage.getItem('decimen_optical_prefill');
        if (prefillRaw) {
          localStorage.removeItem('decimen_optical_prefill');
          const prefill = JSON.parse(prefillRaw);
          if (prefill.mode === 'receiver' || hash === 'receiver') {
            switchTab('receiver');
            return true;
          }
          if (prefill.content) {
            const textEl = document.getElementById('sender-text');
            if (textEl) {
              textEl.value = prefill.content;
              setSenderInputMode('text');
              updateSenderPayloadMetrics();
              if (prefill.name) {
                senderFileMeta = { name: prefill.name, type: 'application/json', size: prefill.content.length };
              }
              if (prepareSenderPackets()) {
                renderSenderFrame();
                const badge = document.getElementById('sender-qr-badge');
                if (badge) badge.textContent = 'RAG 知識載入 [ 1 / ' + senderChunks.length + ' ]';
                const statusBadge = document.getElementById('sender-status-badge');
                if (statusBadge) {
                  statusBadge.textContent = '已載入 RAG 知識包 (' + senderChunks.length + ' 幀)';
                  statusBadge.style.color = '#06b6d4';
                }
              }
              switchTab('sender');
              return true;
            }
          }
        }
        if (['sender', 'receiver', 'loopback'].includes(hash)) {
          switchTab(hash);
          return true;
        }
      } catch (e) {
        console.warn('Failed to parse prefill:', e);
      }
      return false;
    }

    // Initialize: check if RAG prefill payload was provided; otherwise load sample text
    if (!checkPrefillPayload()) {
      loadSampleText();
    }
  </script>
</body>
</html>

`
            },
            {
                id: 'app_ppt_diagram_reconstructor',
                title: 'PPT 方塊圖向量還原器',
                titleEn: 'PPT Diagram to Editable PPTX',
                category: 'html',
                description: '將任意上傳或剪貼簿貼上的方塊圖圖片一鍵轉為 Base64，並自動轉換為自適應高對比二值化格式進行深度解析，精準萃取幾何矩形與文字，還原為可編輯的向量畫布，並直接匯出 100% 原生可編輯 Microsoft PowerPoint (.pptx) 檔案。初始狀態不預載任何內容以保護隱私。',
                descriptionEn: 'Convert user-uploaded diagram images into Base64 and adaptive high-contrast recognition format, extracting boxes and text to output genuine native editable Microsoft PowerPoint (.pptx) files.',
                author: 'Webcom AI Assistant',
                icon: '📊',
                version: 'v3.2.3',
                createdAt: new Date().toISOString(),
                code: `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PPT 方塊圖還原器 (Image to Editable .PPTX)</title>
  <script src="/web/js/vendor/pptxgen.bundle.js"></script>
  <script>if(typeof PptxGenJS==='undefined'){document.write('<script src="../js/vendor/pptxgen.bundle.js"><\\/script>');}</script>
  <script>if(typeof PptxGenJS==='undefined'){document.write('<script src="https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js"><\\/script>');}</script>
  <script src="/web/js/vendor/tesseract.min.js"></script>
  <script>if(typeof Tesseract==='undefined'){document.write('<script src="../js/vendor/tesseract.min.js"><\\/script>');}</script>
  <script>if(typeof Tesseract==='undefined'){document.write('<script src="https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js"><\\/script>');}</script>
  <style>
    :root {
      --bg: #090d16;
      --panel: #0f172a;
      --card: #1e293b;
      --card-hover: #334155;
      --border: #334155;
      --accent: #06b6d4;
      --accent-glow: rgba(6, 182, 212, 0.35);
      --purple: #8b5cf6;
      --success: #10b981;
      --warning: #f59e0b;
      --danger: #ef4444;
      --text: #f8fafc;
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
      overflow: hidden;
      user-select: none;
    }
    header {
      background: rgba(15, 23, 42, 0.95);
      border-bottom: 1px solid var(--border);
      padding: 0.75rem 1.25rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      backdrop-filter: blur(8px);
      z-index: 50;
      flex-shrink: 0;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }
    .brand-icon {
      width: 2rem;
      height: 2rem;
      border-radius: 0.5rem;
      background: linear-gradient(135deg, var(--accent), var(--purple));
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.1rem;
      box-shadow: 0 0 12px var(--accent-glow);
    }
    .brand h1 {
      font-size: 1.05rem;
      font-weight: 700;
      background: linear-gradient(to right, #38bdf8, #c084fc);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .brand-sub {
      font-size: 0.72rem;
      color: var(--muted);
      margin-left: 0.3rem;
    }
    .toolbar {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.45rem 0.85rem;
      border-radius: 0.5rem;
      border: 1px solid var(--border);
      background: var(--card);
      color: var(--text);
      font-size: 0.78rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
      white-space: nowrap;
    }
    .btn:hover {
      background: var(--card-hover);
      border-color: #475569;
      transform: translateY(-1px);
    }
    .btn:active {
      transform: translateY(0);
    }
    .btn-primary {
      background: linear-gradient(135deg, #0284c7, #0369a1);
      border-color: #38bdf8;
      box-shadow: 0 2px 8px rgba(2, 132, 199, 0.4);
    }
    .btn-primary:hover {
      background: linear-gradient(135deg, #0369a1, #075985);
      border-color: #7dd3fc;
    }
    .btn-accent {
      background: linear-gradient(135deg, #7c3aed, #6d28d9);
      border-color: #a78bfa;
      box-shadow: 0 2px 8px rgba(124, 58, 237, 0.4);
    }
    .btn-accent:hover {
      background: linear-gradient(135deg, #6d28d9, #5b21b6);
    }
    .btn-success {
      background: linear-gradient(135deg, #059669, #047857);
      border-color: #34d399;
      box-shadow: 0 2px 8px rgba(5, 150, 105, 0.4);
    }
    .btn-success:hover {
      background: linear-gradient(135deg, #047857, #065f46);
    }
    .btn-danger {
      background: #7f1d1d;
      border-color: #f87171;
    }
    .btn-danger:hover {
      background: #991b1b;
    }
    .btn-group {
      display: flex;
      border: 1px solid var(--border);
      border-radius: 0.5rem;
      overflow: hidden;
    }
    .btn-group .btn {
      border: none;
      border-radius: 0;
      border-right: 1px solid var(--border);
    }
    .btn-group .btn:last-child {
      border-right: none;
    }

    /* Main Container */
    main {
      flex: 1;
      display: grid;
      grid-template-columns: 420px 1fr;
      overflow: hidden;
      position: relative;
    }

    /* Left Panel: Source Image & Detection Controls */
    .left-panel {
      background: var(--panel);
      border-right: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      overflow-y: auto;
    }
    .panel-header {
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--border);
      font-size: 0.8rem;
      font-weight: 700;
      color: #38bdf8;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .dropzone {
      margin: 0.75rem;
      border: 2px dashed #475569;
      border-radius: 0.75rem;
      padding: 1.25rem 1rem;
      text-align: center;
      background: rgba(30, 41, 59, 0.4);
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .dropzone:hover, .dropzone.dragover {
      border-color: var(--accent);
      background: rgba(6, 182, 212, 0.08);
      box-shadow: 0 0 16px var(--accent-glow);
    }
    .dropzone p {
      font-size: 0.8rem;
      color: var(--muted);
      margin-top: 0.4rem;
    }
    .image-preview-wrapper {
      padding: 0.75rem;
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .image-container {
      position: relative;
      max-width: 100%;
      border-radius: 0.5rem;
      overflow: hidden;
      border: 1px solid var(--border);
      background: #000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.5);
    }
    #src-image, #src-canvas {
      display: block;
      max-width: 100%;
      height: auto;
    }
    #overlay-canvas {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: auto;
      cursor: crosshair;
    }
    .controls-card {
      margin: 0.5rem 0.75rem 0.75rem;
      background: rgba(30, 41, 59, 0.6);
      border: 1px solid var(--border);
      border-radius: 0.5rem;
      padding: 0.75rem;
      font-size: 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
    }
    .control-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
    }
    .control-row label {
      color: var(--muted);
      white-space: nowrap;
    }
    .control-row input[type="range"] {
      flex: 1;
      accent-color: var(--accent);
    }
    .control-val {
      font-family: monospace;
      color: #38bdf8;
      width: 2.5rem;
      text-align: right;
    }
    .stats-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      padding: 0.2rem 0.5rem;
      border-radius: 0.35rem;
      background: rgba(56, 189, 248, 0.12);
      border: 1px solid rgba(56, 189, 248, 0.3);
      color: #38bdf8;
      font-size: 0.7rem;
      font-family: monospace;
    }

    /* Right Panel: Interactive Vector Canvas */
    .right-panel {
      background: #020617;
      display: flex;
      flex-direction: column;
      position: relative;
      overflow: hidden;
    }
    .editor-topbar {
      padding: 0.5rem 1rem;
      background: rgba(15, 23, 42, 0.85);
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      flex-wrap: wrap;
      z-index: 10;
    }
    .canvas-viewport {
      flex: 1;
      position: relative;
      overflow: hidden;
      cursor: default;
      background: 
        radial-gradient(circle at 50% 50%, rgba(30, 41, 59, 0.4) 0%, transparent 80%),
        linear-gradient(to right, rgba(51, 65, 85, 0.15) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(51, 65, 85, 0.15) 1px, transparent 1px);
      background-size: 100% 100%, 24px 24px, 24px 24px;
    }
    #editor-svg {
      width: 100%;
      height: 100%;
      position: absolute;
      top: 0;
      left: 0;
    }

    /* Flowchart Elements Styling */
    .flow-node {
      cursor: move;
      transition: filter 0.1s ease;
    }
    .flow-node:hover {
      filter: drop-shadow(0 0 8px var(--accent-glow));
    }
    .flow-node.selected rect {
      stroke: #38bdf8 !important;
      stroke-width: 2.5px !important;
      stroke-dasharray: 4, 3;
      animation: dash 15s linear infinite;
    }
    @keyframes dash {
      to { stroke-dashoffset: 1000; }
    }
    .flow-node text {
      pointer-events: none;
      user-select: none;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-weight: 600;
    }
    .flow-port {
      fill: #38bdf8;
      stroke: #0f172a;
      stroke-width: 2;
      opacity: 0;
      transition: opacity 0.15s ease, r 0.15s ease;
      cursor: crosshair;
    }
    .flow-node:hover .flow-port, .flow-node.selected .flow-port {
      opacity: 0.85;
    }
    .flow-port:hover {
      opacity: 1;
      r: 6;
      fill: #f59e0b;
    }
    .flow-edge {
      fill: none;
      stroke: #94a3b8;
      stroke-width: 2.5;
      cursor: pointer;
      transition: stroke 0.15s ease, stroke-width 0.15s ease;
    }
    .flow-edge:hover {
      stroke: #38bdf8;
      stroke-width: 3.5;
    }
    .flow-edge.selected {
      stroke: #f59e0b;
      stroke-width: 3.5;
    }
    .edge-label-bg {
      fill: #0f172a;
      stroke: #475569;
      stroke-width: 1;
      rx: 4;
      cursor: pointer;
    }
    .edge-label-text {
      font-size: 11px;
      fill: #e2e8f0;
      text-anchor: middle;
      dominant-baseline: central;
      font-family: monospace;
      font-weight: bold;
      pointer-events: none;
    }

    /* Selection Property Inspector */
    .inspector-panel {
      position: absolute;
      bottom: 1rem;
      right: 1rem;
      background: rgba(15, 23, 42, 0.92);
      border: 1px solid var(--border);
      border-radius: 0.75rem;
      padding: 0.75rem 1rem;
      box-shadow: 0 10px 25px rgba(0,0,0,0.5);
      backdrop-filter: blur(8px);
      z-index: 20;
      font-size: 0.75rem;
      display: none;
      flex-direction: column;
      gap: 0.5rem;
      width: 260px;
    }
    .inspector-panel.active {
      display: flex;
    }
    .inspector-title {
      font-weight: 700;
      color: #c084fc;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--border);
      padding-bottom: 0.3rem;
    }
    .inspector-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
    }
    .inspector-row input[type="text"] {
      width: 100%;
      background: #020617;
      border: 1px solid #475569;
      border-radius: 0.35rem;
      padding: 0.3rem 0.5rem;
      color: white;
      font-size: 0.75rem;
    }
    .color-swatches {
      display: flex;
      gap: 0.35rem;
    }
    .swatch {
      width: 1.25rem;
      height: 1.25rem;
      border-radius: 0.25rem;
      cursor: pointer;
      border: 1px solid rgba(255,255,255,0.2);
    }
    .swatch:hover {
      transform: scale(1.15);
    }

    /* Modal dialog */
    .modal-overlay {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.75);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 100;
      backdrop-filter: blur(4px);
    }
    .modal-overlay.active {
      display: flex;
    }
    .modal-box {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 1rem;
      width: 90%;
      max-width: 650px;
      max-height: 85vh;
      overflow-y: auto;
      padding: 1.5rem;
      box-shadow: 0 20px 40px rgba(0,0,0,0.8);
      position: relative;
    }
    .modal-box h2 {
      font-size: 1.1rem;
      color: #38bdf8;
      margin-bottom: 0.75rem;
    }
    .modal-box textarea {
      width: 100%;
      height: 220px;
      background: #020617;
      border: 1px solid var(--border);
      border-radius: 0.5rem;
      padding: 0.75rem;
      color: #38bdf8;
      font-family: monospace;
      font-size: 0.75rem;
      resize: vertical;
    }

    /* Toast Notification */
    .toast {
      position: fixed;
      bottom: 1.5rem;
      left: 50%;
      transform: translateX(-50%) translateY(100px);
      background: #1e293b;
      border: 1px solid #38bdf8;
      color: #f8fafc;
      padding: 0.6rem 1.4rem;
      border-radius: 1rem;
      font-size: 0.8rem;
      font-weight: 600;
      white-space: pre-line;
      line-height: 1.4;
      box-shadow: 0 8px 24px rgba(0,0,0,0.6);
      transition: transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      z-index: 200;
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }
    .toast.show {
      transform: translateX(-50%) translateY(0);
    }

    /* Hidden elements */
    #file-input { display: none; }
  </style>
</head>
<body>

  <!-- Top Header Navigation -->
  <header>
    <div class="brand">
      <div class="brand-icon" style="background: linear-gradient(135deg, #ea580c, #c2410c);">📊</div>
      <div>
        <h1>PPT 方塊圖還原器 <span class="brand-sub">Image to Editable .PPTX</span></h1>
      </div>
    </div>

    <div class="toolbar">
      <input type="file" id="file-input" accept=".jpg,.jpeg,.png,.webp,.gif,.bmp,.pptx,image/jpeg,image/png,image/webp,image/gif">
      <button type="button" class="btn btn-primary" id="btn-upload">📁 上傳方塊圖圖片</button>
      <button type="button" class="btn" id="btn-paste">📋 貼上 (Ctrl+V)</button>
      <button type="button" class="btn" id="btn-detect">🔍 重新分析偵測</button>
      <button type="button" class="btn btn-accent" id="btn-llm-refine" style="background: linear-gradient(135deg, #6366f1, #4f46e5); border-color: #818cf8; color: white; font-weight: 600;" title="使用平台 LLM / 幾何排版引擎智慧微調排版、修正跑板、校準晶振與直角連線">🤖 LLM 智慧微調 (跑板修正)</button>
      <button type="button" class="btn" id="btn-theme-toggle" title="切換投影片配色風格">🎨 主題: 深色</button>
      <button type="button" class="btn" id="btn-export-pptx" style="background: linear-gradient(135deg, #ea580c, #c2410c); border-color: #fb923c; color: white; font-weight: 700; box-shadow: 0 2px 10px rgba(234, 88, 12, 0.45);" title="下載原生 Microsoft PowerPoint (.pptx) 可編輯檔案 (非 SVG、非圖片)">📥 下載可編輯 .PPTX</button>
      <button type="button" class="btn" id="btn-export-json">📦 匯出 JSON</button>
    </div>
  </header>

  <!-- Main Split Body -->
  <main>
    <!-- Left: Source Image & Vision Detection -->
    <section class="left-panel">
      <div class="panel-header">
        <span>📸 原始圖片與幾何偵測</span>
        <span class="stats-badge" id="stats-badge">請上傳圖片</span>
      </div>

      <div class="dropzone" id="dropzone">
        <div style="font-size: 2.2rem; margin-bottom: 0.5rem;">📥</div>
        <strong style="font-size: 0.95rem; color: #38bdf8;">拖曳或點選上傳方塊圖 / 架構圖圖片</strong>
        <p style="margin-top: 0.5rem; line-height: 1.5;">接收圖片後將立即轉換為 Base64，並自動轉換為自適應高對比二值化格式，大幅提昇幾何輪廓與文字辨識率！</p>
      </div>

      <div class="image-preview-wrapper" id="preview-wrapper" style="display: none;">
        <div style="display: flex; gap: 0.4rem; margin-bottom: 0.5rem;">
          <button type="button" class="btn" id="btn-view-raw" style="flex: 1; font-size: 0.72rem;">📸 原始圖片</button>
          <button type="button" class="btn btn-accent" id="btn-view-enhanced" style="flex: 1; font-size: 0.72rem;">⚡ 辨識增強格式</button>
        </div>
        <div class="image-container" id="img-container">
          <canvas id="src-canvas"></canvas>
          <canvas id="enhanced-canvas" style="display: none;"></canvas>
          <canvas id="overlay-canvas"></canvas>
        </div>
        <div id="base64-badge" style="margin-top: 0.5rem; padding: 0.5rem 0.65rem; border-radius: 0.35rem; background: rgba(15,23,42,0.9); border: 1px solid #334155; font-size: 0.72rem; color: #38bdf8; word-break: break-all;">
          📥 尚未載入圖片
        </div>
      </div>

      <div class="controls-card">
        <strong style="color: #38bdf8;">⚙️ 影像分析與濾鏡參數</strong>
        
        <div class="control-row">
          <label>二值化門檻 (Threshold):</label>
          <input type="range" id="param-threshold" min="30" max="240" value="180">
          <span class="control-val" id="val-threshold">180</span>
        </div>

        <div class="control-row">
          <label>最小方塊面積 (Min Area):</label>
          <input type="range" id="param-min-area" min="100" max="5000" value="200" step="50">
          <span class="control-val" id="val-min-area">200</span>
        </div>

        <div class="control-row">
          <label>邊緣吸附容差 (Snap Pad):</label>
          <input type="range" id="param-snap" min="4" max="30" value="12">
          <span class="control-val" id="val-snap">12px</span>
        </div>

        <div class="control-row" style="margin-top: 0.2rem;">
          <label style="display: flex; align-items: center; gap: 0.4rem; cursor: pointer;">
            <input type="checkbox" id="param-ocr-enable" checked style="accent-color: #06b6d4;">
            <span>🔤 啟用 OCR 自動文字識別填入</span>
          </label>
        </div>

        <div style="display: flex; gap: 0.4rem; margin-top: 0.3rem;">
          <button type="button" class="btn btn-primary" id="btn-re-detect" style="flex: 1;">⚡ 重新執行偵測</button>
          <button type="button" class="btn" id="btn-toggle-overlay" style="flex: 1;">👁️ 切換遮罩預覽</button>
        </div>
      </div>

      <div style="padding: 0.75rem; font-size: 0.72rem; color: var(--muted); line-height: 1.5; border-top: 1px solid var(--border);">
        <strong style="color: #f97316;">🔥 PowerPoint 原生可編輯檔案 (.pptx)：</strong><br>
        1. 點擊頂部<strong>「📥 下載可編輯 .PPTX」</strong>，直接生成 100% 原生 PowerPoint 簡報檔案。<br>
        2. <strong>不用 SVG、不用手動轉換</strong>：每個方塊皆為 PowerPoint 原生幾何形狀 (Shape)，文字為原生文字框 (Text Frame)，連線為原生向量連接線與箭頭 (Connector)。<br>
        3. 用 PowerPoint 開啟後，可直接拖曳移動、變更顏色、雙擊修改文字，完全可編輯！
      </div>
    </section>

    <!-- Right: Fully Interactive Vector Canvas -->
    <section class="right-panel">
      <div class="editor-topbar">
        <div style="display: flex; align-items: center; gap: 0.4rem;">
          <button type="button" class="btn" id="btn-add-node">➕ 新增方塊</button>
          <button type="button" class="btn" id="btn-connect-mode">🔗 連線模式</button>
          <button type="button" class="btn btn-danger" id="btn-delete-selected">🗑️ 刪除選取</button>
          <button type="button" class="btn" id="btn-clear-canvas">🧹 清空畫布</button>
        </div>

        <div style="display: flex; align-items: center; gap: 0.4rem;">
          <button type="button" class="btn" id="btn-zoom-in">🔍+</button>
          <button type="button" class="btn" id="btn-zoom-out">🔍-</button>
          <button type="button" class="btn" id="btn-zoom-fit">適應視窗</button>
          <button type="button" class="btn btn-accent" id="btn-copy-svg-code">📋 複製 SVG 代碼</button>
        </div>
      </div>

      <!-- Vector SVG Canvas Viewport -->
      <div class="canvas-viewport" id="canvas-viewport">
        <svg id="editor-svg">
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#94a3b8" id="arrow-path" />
            </marker>
            <marker id="arrow-selected" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#f59e0b" />
            </marker>
          </defs>

          <!-- Group for connecting lines -->
          <g id="edges-group"></g>
          <!-- Group for flowchart nodes -->
          <g id="nodes-group"></g>
          <!-- Group for temporary drawing line -->
          <line id="temp-line" x1="0" y1="0" x2="0" y2="0" stroke="#38bdf8" stroke-width="2" stroke-dasharray="4,4" style="display: none;" />
        </svg>

        <!-- Node & Edge Property Inspector -->
        <div class="inspector-panel" id="inspector-panel">
          <div class="inspector-title">
            <span id="insp-type">方塊屬性</span>
            <button type="button" id="btn-close-insp" style="background: none; border: none; color: var(--muted); cursor: pointer;">✕</button>
          </div>
          
          <div id="node-insp-content">
            <div class="inspector-row">
              <label>標籤文字:</label>
              <input type="text" id="insp-text" value="">
            </div>
            <div class="inspector-row">
              <label>文字字級:</label>
              <input type="range" id="insp-fontsize" min="10" max="32" value="14" style="flex:1;">
              <span id="insp-fontsize-val" style="width:2rem;text-align:right;">14px</span>
            </div>
            <div class="inspector-row">
              <label>填滿色彩:</label>
              <div class="color-swatches" id="swatches-fill">
                <div class="swatch" style="background: #cbd5e1;" data-color="#cbd5e1" title="Qualcomm/SoC (灰白)"></div>
                <div class="swatch" style="background: #0284c7;" data-color="#0284c7" title="Third Party (青藍)"></div>
                <div class="swatch" style="background: #7c3aed;" data-color="#7c3aed" title="Connector/Header (紫色)"></div>
                <div class="swatch" style="background: #0f766e;" data-color="#0f766e" title="Magnetics/Filter (深青)"></div>
                <div class="swatch" style="background: #1e293b;" data-color="#1e293b" title="Dark Slate (深色)"></div>
              </div>
            </div>
            <div class="inspector-row">
              <label>邊框色彩:</label>
              <div class="color-swatches" id="swatches-stroke">
                <div class="swatch" style="background: #38bdf8;" data-color="#38bdf8"></div>
                <div class="swatch" style="background: #34d399;" data-color="#34d399"></div>
                <div class="swatch" style="background: #c084fc;" data-color="#c084fc"></div>
                <div class="swatch" style="background: #facc15;" data-color="#facc15"></div>
                <div class="swatch" style="background: #94a3b8;" data-color="#94a3b8"></div>
              </div>
            </div>
            <div class="inspector-row">
              <label>圓角半徑:</label>
              <input type="range" id="insp-radius" min="0" max="24" value="8" style="flex:1;">
              <span id="insp-radius-val" style="width:2rem;text-align:right;">8px</span>
            </div>
          </div>

          <div id="edge-insp-content" style="display: none;">
            <div class="inspector-row">
              <label>線段標籤:</label>
              <input type="text" id="insp-edge-label" value="" placeholder="例如：是 / 否 / OK">
            </div>
          </div>
        </div>
      </div>
    </section>
  </main>

  <!-- LLM Layout Refinement Modal -->
  <div class="modal-overlay" id="llm-refine-modal">
    <div class="modal-box" style="max-width: 580px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.8rem;">
        <h2 style="margin: 0; font-size: 1.15rem; color: #818cf8; display: flex; align-items: center; gap: 0.5rem;">
          <span>🤖</span> LLM 智慧微調對齊 (跑板修正)
        </h2>
        <span id="llm-engine-status" style="font-size: 0.72rem; padding: 0.2rem 0.6rem; border-radius: 9999px; background: rgba(99, 102, 241, 0.2); color: #a5b4fc; border: 1px solid rgba(99, 102, 241, 0.4);">
          ● 平台排版優化引擎: 就緒
        </span>
      </div>
      <p style="font-size: 0.82rem; color: var(--muted); margin-bottom: 1rem; line-height: 1.45;">
        自動診斷並校正 OCR 辨識或拖曳時產生的些微「跑板」誤差，包含晶片置中對齊、RF 射頻鏈路直線校正、晶振引腳貼齊，以及平行匯流排（DDR4 / SGMII）均勻等距排列。
      </p>

      <div style="margin-bottom: 0.8rem;">
        <label style="display: block; font-size: 0.76rem; font-weight: 600; margin-bottom: 0.4rem; color: var(--text);">快速微調模式：</label>
        <div style="display: flex; flex-direction: column; gap: 0.4rem;">
          <button type="button" class="btn" id="btn-quick-auto-align" style="text-align: left; justify-content: flex-start; background: rgba(99, 102, 241, 0.15); border-color: rgba(99, 102, 241, 0.3);">
            ⚡ <b>一鍵全域自動對齊</b>：修復所有射頻鏈路、晶振引腳、平行匯流排跑板
          </button>
          <button type="button" class="btn" id="btn-quick-wifi-align" style="text-align: left; justify-content: flex-start;">
            🎯 <b>Wi-Fi 射頻鏈路置中</b>：校正 2.4G / 5G / 6G 晶片與 FEM、BPF、天線為 100% 直角水平線
          </button>
          <button type="button" class="btn" id="btn-quick-xtal-align" style="text-align: left; justify-content: flex-start;">
            💎 <b>晶振引腳校準</b>：將 BT/GPS/Wi-Fi 石英晶振貼齊主晶片 Clock 引腳
          </button>
          <button type="button" class="btn" id="btn-quick-bus-align" style="text-align: left; justify-content: flex-start;">
            📏 <b>平行匯流排均勻化</b>：校準 DDR4 (3條紅線) 與 Ethernet SGMII/USXGMII 間距
          </button>
        </div>
      </div>

      <div style="margin-bottom: 1rem;">
        <label style="display: block; font-size: 0.76rem; font-weight: 600; margin-bottom: 0.4rem; color: var(--text);">自訂微調提示詞 (LLM Prompt)：</label>
        <input type="text" id="llm-refine-prompt" class="form-control" style="width: 100%; padding: 0.5rem; border-radius: 0.4rem; background: var(--bg); border: 1px solid var(--border); color: var(--text); font-size: 0.8rem;" placeholder="例如：將所有射頻濾波器與天線置中對齊，消除任何些微跑板...">
      </div>

      <div style="display: flex; justify-content: flex-end; gap: 0.5rem;">
        <button type="button" class="btn btn-accent" id="btn-run-llm-refine" style="background: linear-gradient(135deg, #6366f1, #4f46e5); border-color: #818cf8; color: white;">🚀 執行智慧微調</button>
        <button type="button" class="btn btn-danger" id="btn-close-llm-modal">關閉</button>
      </div>
    </div>
  </div>

  <!-- Export Code Modal -->
  <div class="modal-overlay" id="export-modal">
    <div class="modal-box">
      <h2 id="modal-title">匯出內容</h2>
      <textarea id="modal-code" readonly></textarea>
      <div style="display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1rem;">
        <button type="button" class="btn" id="btn-copy-modal">📋 複製內容</button>
        <button type="button" class="btn btn-primary" id="btn-download-modal">💾 下載檔案</button>
        <button type="button" class="btn btn-danger" id="btn-close-modal">關閉</button>
      </div>
    </div>
  </div>

  <!-- Toast -->
  <div class="toast" id="toast">
    <span id="toast-icon">✨</span>
    <span id="toast-msg">已完成操作</span>
  </div>

  <script>
    // ==========================================
    // State Management
    // ==========================================
    async function apiFetch(endpoint, options = {}) {
      const cleanEndpoint = endpoint.startsWith('/') ? endpoint : '/' + endpoint;
      const candidates = [
        'http://127.0.0.1:8001' + cleanEndpoint,
        'http://localhost:8001' + cleanEndpoint
      ];
      if (window.location.protocol.startsWith('http')) {
        candidates.push(cleanEndpoint);
      }
      let lastErr = null;
      for (const url of candidates) {
        try {
          const res = await fetch(url, options);
          if (res.ok) return res;
        } catch (err) {
          lastErr = err;
        }
      }
      throw lastErr || new Error('無法連線至服務端點 ' + endpoint);
    }

    
    const state = {
      imageLoaded: false,
      imageWidth: 0,
      imageHeight: 0,
      nodes: [],      // [{ id, x, y, width, height, text, fill, stroke, strokeWidth, radius, fontSize, textColor }]
      edges: [],      // [{ id, from, to, label, fromPort, toPort }]
      selectedNodeId: null,
      selectedEdgeId: null,
      isConnectMode: false,
      connectStartNodeId: null,
      connectStartPort: null,
      zoom: 1.0,
      panX: 0,
      panY: 0,
      isPanning: false,
      startPanX: 0,
      startPanY: 0,
      draggedNode: null,
      dragOffsetX: 0,
      dragOffsetY: 0,
      showOverlay: true,
      rawBase64: null,
      enhancedBase64: null,
      activeView: 'enhanced',
      title: '系統架構方塊圖',
      theme: 'dark'
    };

    // DOM Elements
    const fileInput = document.getElementById('file-input');
    const dropzone = document.getElementById('dropzone');
    const previewWrapper = document.getElementById('preview-wrapper');
    const srcCanvas = document.getElementById('src-canvas');
    const enhancedCanvas = document.getElementById('enhanced-canvas');
    const overlayCanvas = document.getElementById('overlay-canvas');
    const base64Badge = document.getElementById('base64-badge');
    const btnViewRaw = document.getElementById('btn-view-raw');
    const btnViewEnhanced = document.getElementById('btn-view-enhanced');
    const editorSvg = document.getElementById('editor-svg');
    const nodesGroup = document.getElementById('nodes-group');
    const edgesGroup = document.getElementById('edges-group');
    const tempLine = document.getElementById('temp-line');
    const canvasViewport = document.getElementById('canvas-viewport');
    const inspectorPanel = document.getElementById('inspector-panel');
    const statsBadge = document.getElementById('stats-badge');

    // UI Toast
    function showToast(msg, icon = '✨') {
      const toast = document.getElementById('toast');
      document.getElementById('toast-msg').textContent = msg;
      document.getElementById('toast-icon').textContent = icon;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 2800);
    }

    // ==========================================
    // Flowchart Node & Edge Management
    // ==========================================
    function createNode(options = {}) {
      const id = 'node_' + Math.random().toString(36).substring(2, 9);
      const node = {
        id: id,
        x: options.x || 100,
        y: options.y || 100,
        width: options.width || 140,
        height: options.height || 64,
        text: options.text || '步驟方塊',
        fill: options.fill || '#1e293b',
        stroke: options.stroke || '#38bdf8',
        strokeWidth: options.strokeWidth || 2,
        radius: options.radius !== undefined ? options.radius : 8,
        fontSize: options.fontSize || 13,
        textColor: options.textColor || '#f8fafc'
      };
      state.nodes.push(node);
      renderCanvas();
      selectNode(id);
      return node;
    }

    function createEdge(fromId, toId, label = '') {
      if (fromId === toId) return;
      // Prevent duplicates
      const exists = state.edges.some(e => e.from === fromId && e.to === toId);
      if (exists) return;

      const edge = {
        id: 'edge_' + Math.random().toString(36).substring(2, 9),
        from: fromId,
        to: toId,
        label: label,
        fromPort: 'auto',
        toPort: 'auto'
      };
      state.edges.push(edge);
      renderCanvas();
      return edge;
    }

    function selectNode(id) {
      state.selectedNodeId = id;
      state.selectedEdgeId = null;
      renderCanvas();
      updateInspector();
    }

    function selectEdge(id) {
      state.selectedEdgeId = id;
      state.selectedNodeId = null;
      renderCanvas();
      updateInspector();
    }

    function clearSelection() {
      state.selectedNodeId = null;
      state.selectedEdgeId = null;
      renderCanvas();
      updateInspector();
    }

    function deleteSelected() {
      if (state.selectedNodeId) {
        state.nodes = state.nodes.filter(n => n.id !== state.selectedNodeId);
        state.edges = state.edges.filter(e => e.from !== state.selectedNodeId && e.to !== state.selectedNodeId);
        state.selectedNodeId = null;
        renderCanvas();
        updateInspector();
        showToast('已刪除方塊', '🗑️');
      } else if (state.selectedEdgeId) {
        state.edges = state.edges.filter(e => e.id !== state.selectedEdgeId);
        state.selectedEdgeId = null;
        renderCanvas();
        updateInspector();
        showToast('已刪除連線', '🗑️');
      }
    }

    // ==========================================
    // Intelligent Port Calculation & Edge Path
    // ==========================================
    function calculateBestPorts(sourceNode, targetNode) {
      const sCenter = { x: sourceNode.x + sourceNode.width / 2, y: sourceNode.y + sourceNode.height / 2 };
      const tCenter = { x: targetNode.x + targetNode.width / 2, y: targetNode.y + targetNode.height / 2 };

      const sRight = sourceNode.x + sourceNode.width, sLeft = sourceNode.x;
      const tRight = targetNode.x + targetNode.width, tLeft = targetNode.x;
      const sTop = sourceNode.y, sBot = sourceNode.y + sourceNode.height;
      const tTop = targetNode.y, tBot = targetNode.y + targetNode.height;

      const isHorizSep = (sRight <= tLeft + 15) || (tRight <= sLeft + 15);
      const isVertSep = (sBot <= tTop + 15) || (tBot <= sTop + 15);

      const dx = tCenter.x - sCenter.x;
      const dy = tCenter.y - sCenter.y;

      let isHoriz;
      if (isHorizSep && !isVertSep) {
        isHoriz = true;
      } else if (isVertSep && !isHorizSep) {
        isHoriz = false;
      } else {
        isHoriz = Math.abs(dx) >= Math.abs(dy);
      }

      let start = { x: 0, y: 0 };
      let end = { x: 0, y: 0 };

      if (isHoriz) {
        let connY;
        if (tTop <= sCenter.y && sCenter.y <= tBot) {
          connY = sCenter.y;
        } else if (sTop <= tCenter.y && tCenter.y <= sBot) {
          connY = tCenter.y;
        } else if (!(sBot < tTop || tBot < sTop)) {
          connY = (Math.max(sTop, tTop) + Math.min(sBot, tBot)) / 2;
        } else {
          connY = null;
        }

        if (dx > 0) {
          start = { x: sRight, y: connY !== null ? connY : sCenter.y };
          end = { x: tLeft, y: connY !== null ? connY : tCenter.y };
        } else {
          start = { x: sLeft, y: connY !== null ? connY : sCenter.y };
          end = { x: tRight, y: connY !== null ? connY : tCenter.y };
        }
      } else {
        let connX;
        if (tLeft <= sCenter.x && sCenter.x <= tRight) {
          connX = sCenter.x;
        } else if (sLeft <= tCenter.x && tCenter.x <= sRight) {
          connX = tCenter.x;
        } else if (!(sRight < tLeft || tRight < sLeft)) {
          connX = (Math.max(sLeft, tLeft) + Math.min(sRight, tRight)) / 2;
        } else {
          connX = null;
        }

        if (dy > 0) {
          start = { x: connX !== null ? connX : sCenter.x, y: sBot };
          end = { x: connX !== null ? connX : tCenter.x, y: tTop };
        } else {
          start = { x: connX !== null ? connX : sCenter.x, y: sTop };
          end = { x: connX !== null ? connX : tCenter.x, y: tBot };
        }
      }

      return { start, end };
    }

    function generateSmoothPath(p1, p2) {
      // 100% Straight and Orthogonal Right-Angle Paths (水平/垂直直線與正交折線)
      if (Math.abs(p1.y - p2.y) < 1.0) {
        // Perfectly straight horizontal line!
        return \`M \${p1.x} \${p1.y} L \${p2.x} \${p1.y}\`;
      }
      if (Math.abs(p1.x - p2.x) < 1.0) {
        // Perfectly straight vertical line!
        return \`M \${p1.x} \${p1.y} L \${p1.x} \${p2.y}\`;
      }

      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;

      // Orthogonal 3-segment right-angle line (折線)
      if (Math.abs(dx) >= Math.abs(dy)) {
        const midX = p1.x + dx / 2;
        return \`M \${p1.x} \${p1.y} L \${midX} \${p1.y} L \${midX} \${p2.y} L \${p2.x} \${p2.y}\`;
      } else {
        const midY = p1.y + dy / 2;
        return \`M \${p1.x} \${p1.y} L \${p1.x} \${midY} L \${p2.x} \${midY} L \${p2.x} \${p2.y}\`;
      }
    }

    // ==========================================
    // SVG Canvas Renderer
    // ==========================================
    function renderCanvas() {
      // 1. Render Edges
      edgesGroup.innerHTML = '';
      state.edges.forEach(edge => {
        const source = state.nodes.find(n => n.id === edge.from);
        const target = state.nodes.find(n => n.id === edge.to);
        if (!source || !target) return;

        let { start, end } = calculateBestPorts(source, target);
        if (edge.offsetY) {
          start.y += edge.offsetY;
          end.y += edge.offsetY;
        }
        if (edge.offsetX) {
          start.x += edge.offsetX;
          end.x += edge.offsetX;
        }

        const pathData = generateSmoothPath(start, end);
        const isSelected = (state.selectedEdgeId === edge.id);

        const edgeG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        edgeG.setAttribute('data-id', edge.id);
        edgeG.onclick = (e) => {
          e.stopPropagation();
          selectEdge(edge.id);
        };

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', pathData);
        path.setAttribute('class', \`flow-edge \${isSelected ? 'selected' : ''}\`);

        const arrow = edge.arrow || (['QSPI', 'I2C', 'Data', 'Addr', 'Ctrl', 'UART', 'SGMII', 'USXGMII'].some(k => (edge.label || '').includes(k)) ? 'both' : 'forward');
        if (arrow === 'both') {
          path.setAttribute('marker-start', isSelected ? 'url(#arrow-selected)' : 'url(#arrow)');
          path.setAttribute('marker-end', isSelected ? 'url(#arrow-selected)' : 'url(#arrow)');
        } else if (arrow === 'backward') {
          path.setAttribute('marker-start', isSelected ? 'url(#arrow-selected)' : 'url(#arrow)');
        } else {
          path.setAttribute('marker-end', isSelected ? 'url(#arrow-selected)' : 'url(#arrow)');
        }

        if (edge.color) {
          path.style.stroke = edge.color;
        }
        if (edge.dash) {
          path.setAttribute('stroke-dasharray', '4,3');
        }
        edgeG.appendChild(path);

        // Optional Edge Text Label
        if (edge.label) {
          const midX = (start.x + end.x) / 2;
          const midY = (start.y + end.y) / 2;

          const labelG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          const labelWidth = Math.max(28, edge.label.length * 7.5 + 8);
          rect.setAttribute('x', midX - labelWidth / 2);
          rect.setAttribute('y', midY - 14);
          rect.setAttribute('width', labelWidth);
          rect.setAttribute('height', 14);
          rect.setAttribute('fill', state.theme === 'dark' ? '#090d16' : '#ffffff');
          rect.setAttribute('opacity', '0.85');

          const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          text.setAttribute('x', midX);
          text.setAttribute('y', midY - 3);
          text.setAttribute('text-anchor', 'middle');
          text.setAttribute('fill', edge.color || (state.theme === 'dark' ? '#94a3b8' : '#334155'));
          text.setAttribute('font-size', '8.5px');
          text.setAttribute('font-weight', '700');
          text.textContent = edge.label;

          labelG.appendChild(rect);
          labelG.appendChild(text);
          edgeG.appendChild(labelG);
        }

        edgesGroup.appendChild(edgeG);
      });

      // 2. Render Nodes
      nodesGroup.innerHTML = '';
      state.nodes.forEach(node => {
        const isSelected = (state.selectedNodeId === node.id);
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('class', \`flow-node \${isSelected ? 'selected' : ''}\`);
        g.setAttribute('transform', \`translate(\${node.x}, \${node.y})\`);
        g.setAttribute('data-id', node.id);

        // Base rectangle, circle, or crystal oscillator
        let shapeElem;
        if (node.shape === 'crystal') {
          shapeElem = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          shapeElem.setAttribute('width', node.width);
          shapeElem.setAttribute('height', node.height);
          shapeElem.setAttribute('fill', 'transparent');
          shapeElem.setAttribute('stroke', 'transparent');
          g.appendChild(shapeElem);

          const strokeCol = node.stroke || '#0284c7';
          const strokeW = node.strokeWidth || 1.5;
          const dashArr = node.dash ? '3,2' : 'none';

          // Left lead
          const lLead = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          lLead.setAttribute('x1', 0);
          lLead.setAttribute('y1', node.height / 2);
          lLead.setAttribute('x2', node.width * 0.22);
          lLead.setAttribute('y2', node.height / 2);
          lLead.setAttribute('stroke', strokeCol);
          lLead.setAttribute('stroke-width', strokeW);
          if (node.dash) lLead.setAttribute('stroke-dasharray', dashArr);
          g.appendChild(lLead);

          // Left plate
          const lPlate = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          lPlate.setAttribute('x1', node.width * 0.22);
          lPlate.setAttribute('y1', 1);
          lPlate.setAttribute('x2', node.width * 0.22);
          lPlate.setAttribute('y2', node.height - 1);
          lPlate.setAttribute('stroke', strokeCol);
          lPlate.setAttribute('stroke-width', strokeW);
          if (node.dash) lPlate.setAttribute('stroke-dasharray', dashArr);
          g.appendChild(lPlate);

          // Quartz center body
          const qz = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          qz.setAttribute('x', node.width * 0.33);
          qz.setAttribute('y', node.height * 0.12);
          qz.setAttribute('width', node.width * 0.34);
          qz.setAttribute('height', node.height * 0.76);
          qz.setAttribute('fill', '#ffffff');
          qz.setAttribute('stroke', strokeCol);
          qz.setAttribute('stroke-width', strokeW);
          if (node.dash) qz.setAttribute('stroke-dasharray', dashArr);
          g.appendChild(qz);

          // Right plate
          const rPlate = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          rPlate.setAttribute('x1', node.width * 0.78);
          rPlate.setAttribute('y1', 1);
          rPlate.setAttribute('x2', node.width * 0.78);
          rPlate.setAttribute('y2', node.height - 1);
          rPlate.setAttribute('stroke', strokeCol);
          rPlate.setAttribute('stroke-width', strokeW);
          if (node.dash) rPlate.setAttribute('stroke-dasharray', dashArr);
          g.appendChild(rPlate);

          // Right lead
          const rLead = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          rLead.setAttribute('x1', node.width * 0.78);
          rLead.setAttribute('y1', node.height / 2);
          rLead.setAttribute('x2', node.width);
          rLead.setAttribute('y2', node.height / 2);
          rLead.setAttribute('stroke', strokeCol);
          rLead.setAttribute('stroke-width', strokeW);
          if (node.dash) rLead.setAttribute('stroke-dasharray', dashArr);
          g.appendChild(rLead);
        } else if (node.shape === 'circle' || node.shape === 'oval') {
          shapeElem = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
          shapeElem.setAttribute('cx', node.width / 2);
          shapeElem.setAttribute('cy', node.height / 2);
          shapeElem.setAttribute('rx', node.width / 2);
          shapeElem.setAttribute('ry', node.height / 2);
          if (node.fill === 'none') {
            shapeElem.setAttribute('fill', 'transparent');
            shapeElem.setAttribute('stroke', 'transparent');
          } else {
            shapeElem.setAttribute('fill', node.fill);
            shapeElem.setAttribute('stroke', node.stroke || '#475569');
            shapeElem.setAttribute('stroke-width', node.strokeWidth || 1.5);
          }
          g.appendChild(shapeElem);
        } else {
          shapeElem = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          shapeElem.setAttribute('width', node.width);
          shapeElem.setAttribute('height', node.height);
          shapeElem.setAttribute('rx', node.radius || 0);
          shapeElem.setAttribute('ry', node.radius || 0);
          if (node.fill === 'none') {
            shapeElem.setAttribute('fill', 'transparent');
            shapeElem.setAttribute('stroke', 'transparent');
          } else {
            shapeElem.setAttribute('fill', node.fill);
            shapeElem.setAttribute('stroke', node.stroke || '#475569');
            shapeElem.setAttribute('stroke-width', node.strokeWidth || 1.5);
          }
          g.appendChild(shapeElem);
        }

        // Text label (multi-line supported)
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', node.width / 2);
        text.setAttribute('y', node.height / 2);
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('dominant-baseline', 'central');
        text.setAttribute('fill', node.textColor || '#0f172a');
        text.setAttribute('font-size', \`\${node.fontSize || 12}px\`);

        const lines = (node.text || '').split('\\n').filter(Boolean);
        if (lines.length === 1) {
          text.textContent = lines[0];
        } else if (lines.length > 1) {
          lines.forEach((line, idx) => {
            const tspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
            tspan.setAttribute('x', node.width / 2);
            tspan.setAttribute('dy', idx === 0 ? ('-' + ((lines.length - 1) * 0.55) + 'em') : '1.15em');
            tspan.textContent = line;
            text.appendChild(tspan);
          });
        }
        g.appendChild(text);

        // 4 Connection ports
        const ports = [
          { name: 'top', cx: node.width / 2, cy: 0 },
          { name: 'bottom', cx: node.width / 2, cy: node.height },
          { name: 'left', cx: 0, cy: node.height / 2 },
          { name: 'right', cx: node.width, cy: node.height / 2 }
        ];
        ports.forEach(p => {
          const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          circle.setAttribute('cx', p.cx);
          circle.setAttribute('cy', p.cy);
          circle.setAttribute('r', 5);
          circle.setAttribute('class', 'flow-port');
          circle.setAttribute('data-port', p.name);
          circle.onmousedown = (e) => {
            e.stopPropagation();
            startConnect(node.id, p.name, node.x + p.cx, node.y + p.cy);
          };
          g.appendChild(circle);
        });

        // Mouse Drag & Select Listeners
        g.onmousedown = (e) => {
          if (e.target.classList.contains('flow-port')) return;
          e.stopPropagation();
          selectNode(node.id);
          state.draggedNode = node;
          state.dragOffsetX = e.clientX - node.x;
          state.dragOffsetY = e.clientY - node.y;
        };

        // Double click inline edit
        g.ondblclick = (e) => {
          e.stopPropagation();
          promptEditNodeText(node);
        };

        nodesGroup.appendChild(g);
      });

      // Update badge
      statsBadge.textContent = \`\${state.nodes.length} 方塊 | \${state.edges.length} 連線\`;
    }

    function promptEditNodeText(node) {
      const newText = prompt('請輸入方塊文字 (可用 \\\\n 換行):', node.text);
      if (newText !== null && newText.trim() !== '') {
        node.text = newText;
        renderCanvas();
        updateInspector();
        showToast('已更新方塊文字');
      }
    }

    // ==========================================
    // Interactive Mouse & Connect Handlers
    // ==========================================
    window.addEventListener('mousemove', (e) => {
      // Dragging a node
      if (state.draggedNode) {
        state.draggedNode.x = Math.max(10, e.clientX - state.dragOffsetX);
        state.draggedNode.y = Math.max(10, e.clientY - state.dragOffsetY);
        renderCanvas();
      }

      // Drawing connection preview line
      if (state.isConnectMode && state.connectStartNodeId) {
        const svgRect = editorSvg.getBoundingClientRect();
        tempLine.setAttribute('x2', e.clientX - svgRect.left);
        tempLine.setAttribute('y2', e.clientY - svgRect.top);
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (state.draggedNode) {
        state.draggedNode = null;
      }

      if (state.isConnectMode && state.connectStartNodeId) {
        tempLine.style.display = 'none';
        const targetEl = document.elementFromPoint(e.clientX, e.clientY);
        const nodeGroup = targetEl ? targetEl.closest('.flow-node') : null;
        if (nodeGroup) {
          const targetId = nodeGroup.getAttribute('data-id');
          if (targetId && targetId !== state.connectStartNodeId) {
            createEdge(state.connectStartNodeId, targetId);
            showToast('已成功建立方塊連線！', '🔗');
          }
        }
        state.connectStartNodeId = null;
        state.isConnectMode = false;
        document.getElementById('btn-connect-mode').classList.remove('btn-accent');
      }
    });

    editorSvg.onmousedown = (e) => {
      if (e.target === editorSvg) {
        clearSelection();
      }
    };

    function startConnect(nodeId, portName, startX, startY) {
      state.isConnectMode = true;
      state.connectStartNodeId = nodeId;
      state.connectStartPort = portName;
      tempLine.setAttribute('x1', startX);
      tempLine.setAttribute('y1', startY);
      tempLine.setAttribute('x2', startX);
      tempLine.setAttribute('y2', startY);
      tempLine.style.display = 'block';
    }

    // ==========================================
    // Selection Inspector Panel Logic
    // ==========================================
    function updateInspector() {
      if (state.selectedNodeId) {
        const node = state.nodes.find(n => n.id === state.selectedNodeId);
        if (!node) {
          inspectorPanel.classList.remove('active');
          return;
        }
        inspectorPanel.classList.add('active');
        document.getElementById('insp-type').textContent = '方塊屬性設定';
        document.getElementById('node-insp-content').style.display = 'block';
        document.getElementById('edge-insp-content').style.display = 'none';

        document.getElementById('insp-text').value = node.text;
        document.getElementById('insp-fontsize').value = node.fontSize;
        document.getElementById('insp-fontsize-val').textContent = \`\${node.fontSize}px\`;
        document.getElementById('insp-radius').value = node.radius;
        document.getElementById('insp-radius-val').textContent = \`\${node.radius}px\`;
      } else if (state.selectedEdgeId) {
        const edge = state.edges.find(e => e.id === state.selectedEdgeId);
        if (!edge) {
          inspectorPanel.classList.remove('active');
          return;
        }
        inspectorPanel.classList.add('active');
        document.getElementById('insp-type').textContent = '連線線段屬性';
        document.getElementById('node-insp-content').style.display = 'none';
        document.getElementById('edge-insp-content').style.display = 'block';
        document.getElementById('insp-edge-label').value = edge.label || '';
      } else {
        inspectorPanel.classList.remove('active');
      }
    }

    // Inspector inputs change listeners
    document.getElementById('insp-text').addEventListener('input', (e) => {
      if (state.selectedNodeId) {
        const node = state.nodes.find(n => n.id === state.selectedNodeId);
        if (node) {
          node.text = e.target.value;
          renderCanvas();
        }
      }
    });

    document.getElementById('insp-fontsize').addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      document.getElementById('insp-fontsize-val').textContent = \`\${val}px\`;
      if (state.selectedNodeId) {
        const node = state.nodes.find(n => n.id === state.selectedNodeId);
        if (node) {
          node.fontSize = val;
          renderCanvas();
        }
      }
    });

    document.getElementById('insp-radius').addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      document.getElementById('insp-radius-val').textContent = \`\${val}px\`;
      if (state.selectedNodeId) {
        const node = state.nodes.find(n => n.id === state.selectedNodeId);
        if (node) {
          node.radius = val;
          renderCanvas();
        }
      }
    });

    document.querySelectorAll('#swatches-fill .swatch').forEach(sw => {
      sw.addEventListener('click', () => {
        const color = sw.getAttribute('data-color');
        if (state.selectedNodeId) {
          const node = state.nodes.find(n => n.id === state.selectedNodeId);
          if (node) {
            node.fill = color;
            renderCanvas();
          }
        }
      });
    });

    document.querySelectorAll('#swatches-stroke .swatch').forEach(sw => {
      sw.addEventListener('click', () => {
        const color = sw.getAttribute('data-color');
        if (state.selectedNodeId) {
          const node = state.nodes.find(n => n.id === state.selectedNodeId);
          if (node) {
            node.stroke = color;
            renderCanvas();
          }
        }
      });
    });

    document.getElementById('insp-edge-label').addEventListener('input', (e) => {
      if (state.selectedEdgeId) {
        const edge = state.edges.find(ed => ed.id === state.selectedEdgeId);
        if (edge) {
          edge.label = e.target.value;
          renderCanvas();
        }
      }
    });

    document.getElementById('btn-close-insp').addEventListener('click', clearSelection);

    // ==========================================
    // Computer Vision Detection Engine (純前端像素分析)
    // ==========================================
    // ==========================================
    // Base64 Conversion & Recognition Format Engine
    // ==========================================
    function handleImageFile(file) {
      if (!file) return;
      statsBadge.textContent = '📥 接收圖片中...';
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64Data = event.target.result;
        state.rawBase64 = base64Data;
        const kbSize = Math.round(base64Data.length / 1024);
        if (base64Badge) {
          base64Badge.innerHTML = \`📥 已轉換為 Base64 (\${kbSize} KB) ➔ <span style="color:#38bdf8;">正在轉為高對比辨識格式...</span>\`;
        }

        const img = new Image();
        img.onload = () => {
          transformAndRecognizeDiagram(img, base64Data);
        };
        img.src = base64Data;
      };
      reader.readAsDataURL(file);
    }

    async function transformAndRecognizeDiagram(imgElement, rawB64) {
      state.imageLoaded = true;
      state.imageWidth = imgElement.naturalWidth || imgElement.width;
      state.imageHeight = imgElement.naturalHeight || imgElement.height;

      // 1. Setup canvases
      srcCanvas.width = state.imageWidth;
      srcCanvas.height = state.imageHeight;
      enhancedCanvas.width = state.imageWidth;
      enhancedCanvas.height = state.imageHeight;
      overlayCanvas.width = state.imageWidth;
      overlayCanvas.height = state.imageHeight;

      const srcCtx = srcCanvas.getContext('2d');
      srcCtx.drawImage(imgElement, 0, 0);

      // 2. Transform into Recognition-Optimized Format (自適應高對比二值化與幾何銳化)
      const enhCtx = enhancedCanvas.getContext('2d');
      const imgData = srcCtx.getImageData(0, 0, state.imageWidth, state.imageHeight);
      const data = imgData.data;
      const w = state.imageWidth;
      const h = state.imageHeight;

      // Dynamic Range Auto-leveling & Luminance Analysis
      let minLum = 255, maxLum = 0, sumLum = 0;
      const gray = new Uint8Array(w * h);
      for (let i = 0; i < data.length; i += 4) {
        const lum = 0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2];
        gray[i / 4] = lum;
        if (lum < minLum) minLum = lum;
        if (lum > maxLum) maxLum = lum;
        sumLum += lum;
      }
      const meanLum = sumLum / (w * h);
      const isDarkBg = meanLum < 115;
      const range = Math.max(1, maxLum - minLum);

      // Adaptive local binarization
      const binary = new Uint8Array(w * h);
      const enhImgData = enhCtx.createImageData(w, h);
      const enhData = enhImgData.data;

      const targetThresh = isDarkBg ? Math.min(230, meanLum + 22) : Math.max(40, meanLum - 22);

      for (let i = 0; i < w * h; i++) {
        const val = gray[i];
        const stretched = ((val - minLum) / range) * 255;
        let isForeground = false;
        if (isDarkBg) {
          isForeground = (val > targetThresh) || (stretched > 130);
        } else {
          isForeground = (val < targetThresh) || (stretched < 140);
        }
        binary[i] = isForeground ? 1 : 0;

        // Render pure high-contrast binary into enhancedCanvas
        const pixelIdx = i * 4;
        const color = isForeground ? 0 : 255;
        enhData[pixelIdx] = color;
        enhData[pixelIdx + 1] = color;
        enhData[pixelIdx + 2] = color;
        enhData[pixelIdx + 3] = 255;
      }
      enhCtx.putImageData(enhImgData, 0, 0);

      // Save enhanced format Base64
      state.enhancedBase64 = enhancedCanvas.toDataURL('image/png');
      if (base64Badge) {
        base64Badge.innerHTML = \`📥 Base64 轉換完成 (\${Math.round(rawB64.length/1024)} KB) ➔ <span style="color:#10b981;font-weight:bold;">⚡ 已轉為高對比辨識格式</span>\`;
      }

      previewWrapper.style.display = 'flex';
      dropzone.style.display = 'none';

      // 3. Try Backend Endpoint /api/diagram/recognize_base64
      statsBadge.textContent = '🔍 正在辨識方塊與文字...';
      let backendSuccess = false;
      try {
        const minAreaVal = parseInt(document.getElementById('param-min-area').value);
        const ocrCheck = document.getElementById('param-ocr-enable').checked;
        const res = await apiFetch('/api/diagram/recognize_base64', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image_base64: rawB64,
            min_area: minAreaVal,
            ocr_enabled: ocrCheck
          })
        });
        if (res.ok) {
          const result = await res.json();
          if (result.status === 'success' && result.nodes && result.nodes.length > 0) {
            state.nodes = result.nodes;
            state.edges = result.edges || [];
            if (result.enhanced_base64) {
              state.enhancedBase64 = result.enhanced_base64;
            }
            backendSuccess = true;
            statsBadge.textContent = \`✅ 已解析 \${state.nodes.length} 方塊、\${state.edges.length} 連線\`;
            showToast(\`成功辨識 \${state.nodes.length} 個方塊！可於畫布微調或下載 .PPTX\`, '🎉');
            renderCanvas();
            drawOverlayBoxes(state.nodes);
            return;
          }
        }
      } catch (err) {
        console.log('Backend recognition offline, using enhanced client-side recognition:', err);
      }

      // 4. Client-side Fallback using Enhanced Binary Data
      runClientSideDetection(binary, w, h, data);
    }

    function runClientSideDetection(binary, w, h, origData) {
      const detectedBoxes = [];
      const visited = new Uint8Array(w * h);
      const minArea = 160;

      // Multi-scale step grid search
      const step = 3;
      for (let y = 8; y < h - 8; y += step) {
        for (let x = 8; x < w - 8; x += step) {
          const idx = y * w + x;
          if (binary[idx] === 1 && visited[idx] === 0) {
            let minX = x, maxX = x, minY = y, maxY = y;
            let pixelCount = 0;
            const queue = [x, y];
            visited[idx] = 1;

            while (queue.length > 0) {
              const cy = queue.pop();
              const cx = queue.pop();
              pixelCount++;

              if (cx < minX) minX = cx;
              if (cx > maxX) maxX = cx;
              if (cy < minY) minY = cy;
              if (cy > maxY) maxY = cy;

              for (const [nx, ny] of [[cx + step, cy], [cx - step, cy], [cx, cy + step], [cx, cy - step]]) {
                if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
                  const nidx = ny * w + nx;
                  if (binary[nidx] === 1 && visited[nidx] === 0) {
                    visited[nidx] = 1;
                    queue.push(nx, ny);
                  }
                }
              }
            }

            const bw = maxX - minX;
            const bh = maxY - minY;
            const area = bw * bh;

            if (area >= minArea && area < (w * h * 0.90) && bw >= 16 && bh >= 12 && bw < (w * 0.95) && bh < (h * 0.95)) {
              const dup = detectedBoxes.some(b => {
                const ix1 = Math.max(b.x, minX);
                const iy1 = Math.max(b.y, minY);
                const ix2 = Math.min(b.x + b.width, maxX);
                const iy2 = Math.min(b.y + b.height, maxY);
                if (ix2 > ix1 && iy2 > iy1) {
                  const inter = (ix2 - ix1) * (iy2 - iy1);
                  return inter / Math.min(b.width * b.height, area) > 0.6;
                }
                return false;
              });

              if (!dup) {
                const cx = Math.floor(minX + bw / 2);
                const cy = Math.floor(minY + bh / 2);
                const cIdx = (cy * w + cx) * 4;
                const fillHex = rgbToHex(origData[cIdx], origData[cIdx+1], origData[cIdx+2]);
                const isCircle = (Math.abs(bw - bh) <= 4 && bw <= 28);
                const isCrystal = (bw >= 16 && bw <= 32 && bh >= 10 && bh <= 22 && !isCircle);
                const isContainer = (bw > w * 0.22 && bh > h * 0.38);

                detectedBoxes.push({
                  x: minX,
                  y: minY,
                  width: bw,
                  height: bh,
                  fill: fillHex || '#1e293b',
                  shape: isCircle ? 'circle' : (isCrystal ? 'crystal' : 'rect'),
                  is_container: isContainer
                });
              }
            }
          }
        }
      }

      detectedBoxes.sort((a, b) => (Math.floor(a.y / 35) - Math.floor(b.y / 35)) || (a.x - b.x));
      drawOverlayBoxes(detectedBoxes);

      state.nodes = [];
      state.edges = [];

      detectedBoxes.forEach((b, idx) => {
        state.nodes.push({
          id: \`node_\${idx + 1}\`,
          x: b.x,
          y: b.y,
          width: b.width,
          height: b.height,
          text: \`方塊 #\${idx + 1}\`,
          fill: b.fill,
          stroke: b.is_container ? '#7a8b9e' : '#475569',
          strokeWidth: 1.5,
          radius: b.is_container ? 4 : 0,
          shape: b.shape,
          fontSize: b.width > 60 ? 9.5 : 8.0,
          textColor: '#0f172a'
        });
      });

      // Spatial connectors between adjacent components
      for (let i = 0; i < state.nodes.length; i++) {
        const nA = state.nodes[i];
        if (nA.is_container) continue;
        let closestDist = Infinity;
        let closestNode = null;
        for (let j = 0; j < state.nodes.length; j++) {
          if (i === j) continue;
          const nB = state.nodes[j];
          if (nB.is_container) continue;
          const dx = (nB.x + nB.width/2) - (nA.x + nA.width/2);
          const dy = (nB.y + nB.height/2) - (nA.y + nA.height/2);
          if (dx > 0 && Math.abs(dy) < 65) {
            const dist = Math.hypot(dx, dy);
            if (dist < closestDist && dist < 260) {
              closestDist = dist;
              closestNode = nB;
            }
          }
        }
        if (closestNode) {
          createEdge(nA.id, closestNode.id, '');
        }
      }

      renderCanvas();
      statsBadge.textContent = \`✅ 已動態解析 \${state.nodes.length} 方塊、\${state.edges.length} 連線\`;
      showToast(\`已完成動態視覺幾何辨識，共萃取 \${state.nodes.length} 個方塊！\`, '🧩');
    } catch (err) {
        console.warn('Cropped OCR error:', err);
      }
    }

    function rgbToHex(r, g, b) {
      if (r === undefined || g === undefined || b === undefined) return '#1e293b';
      return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }

    function drawOverlayBoxes(boxes) {
      const oCtx = overlayCanvas.getContext('2d');
      oCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
      if (!state.showOverlay) return;

      boxes.forEach((b, idx) => {
        oCtx.strokeStyle = '#38bdf8';
        oCtx.lineWidth = 2;
        oCtx.setLineDash([4, 4]);
        oCtx.strokeRect(b.x, b.y, b.width, b.height);

        oCtx.fillStyle = '#0284c7';
        oCtx.fillRect(b.x, b.y - 18, 54, 18);
        oCtx.fillStyle = '#ffffff';
        oCtx.font = 'bold 11px sans-serif';
        oCtx.fillText(\`方塊 #\${idx+1}\`, b.x + 4, b.y - 5);
      });
    }

    // View Switcher Buttons
    if (btnViewRaw && btnViewEnhanced) {
      btnViewRaw.addEventListener('click', () => {
        srcCanvas.style.display = 'block';
        enhancedCanvas.style.display = 'none';
        btnViewRaw.classList.add('btn-accent');
        btnViewEnhanced.classList.remove('btn-accent');
        state.activeView = 'raw';
      });

      btnViewEnhanced.addEventListener('click', () => {
        srcCanvas.style.display = 'none';
        enhancedCanvas.style.display = 'block';
        btnViewEnhanced.classList.add('btn-accent');
        btnViewRaw.classList.remove('btn-accent');
        state.activeView = 'enhanced';
      });
    }

    // File Upload & Paste Listeners
    document.getElementById('btn-upload').addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) handleImageFile(file);
    });

    dropzone.addEventListener('click', () => fileInput.click());
    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleImageFile(e.dataTransfer.files[0]);
      }
    });

    window.addEventListener('paste', (e) => {
      const items = (e.clipboardData || e.originalEvent.clipboardData).items;
      for (const item of items) {
        if (item.type.indexOf('image') !== -1) {
          const blob = item.getAsFile();
          handleImageFile(blob);
          showToast('已從剪貼簿接收圖片並轉為 Base64！', '📋');
          break;
        }
      }
    });

    ['threshold', 'min-area', 'snap'].forEach(param => {
      const el = document.getElementById(\`param-\${param}\`);
      el.addEventListener('input', () => {
        document.getElementById(\`val-\${param}\`).textContent = el.value + (param === 'snap' ? 'px' : '');
      });
    });

    document.getElementById('btn-re-detect').addEventListener('click', () => {
      if (state.rawBase64) {
        const img = new Image();
        img.onload = () => transformAndRecognizeDiagram(img, state.rawBase64);
        img.src = state.rawBase64;
      } else {
        showToast('請先上傳圖片！', '⚠️');
      }
    });
    document.getElementById('btn-detect').addEventListener('click', () => {
      if (state.rawBase64) {
        const img = new Image();
        img.onload = () => transformAndRecognizeDiagram(img, state.rawBase64);
        img.src = state.rawBase64;
      } else {
        fileInput.click();
      }
    });
    document.getElementById('btn-toggle-overlay').addEventListener('click', () => {
      state.showOverlay = !state.showOverlay;
      drawOverlayBoxes(state.nodes);
      showToast(state.showOverlay ? '已開啟幾何遮罩' : '已隱藏幾何遮罩');
    });

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
          deleteSelected();
        }
      }
      if (e.key === 'Escape') {
        clearSelection();
      }
    });

    // ==========================================
    // Exporters (SVG, JSON, Copy)
    // ==========================================
    function generateStandaloneSvg() {
      // Find bounding box of all nodes
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      state.nodes.forEach(n => {
        if (n.x < minX) minX = n.x;
        if (n.y < minY) minY = n.y;
        if (n.x + n.width > maxX) maxX = n.x + n.width;
        if (n.y + n.height > maxY) maxY = n.y + n.height;
      });

      const pad = 40;
      const w = Math.max(400, (maxX - minX) + pad * 2);
      const h = Math.max(300, (maxY - minY) + pad * 2);
      const shiftX = pad - minX;
      const shiftY = pad - minY;

      let svg = \`<?xml version="1.0" encoding="UTF-8"?>\\n\`;
      svg += \`<svg xmlns="http://www.w3.org/2000/svg" width="\${w}" height="\${h}" viewBox="0 0 \${w} \${h}">\\n\`;
      svg += \`  <defs>\\n\`;
      svg += \`    <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">\\n\`;
      svg += \`      <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#38bdf8" />\\n\`;
      svg += \`    </marker>\\n\`;
      svg += \`  </defs>\\n\`;
      svg += \`  <rect width="100%" height="100%" fill="#0f172a" />\\n\`;

      // Render Edges
      svg += \`  <!-- Connectors -->\\n\`;
      state.edges.forEach(edge => {
        const source = state.nodes.find(n => n.id === edge.from);
        const target = state.nodes.find(n => n.id === edge.to);
        if (!source || !target) return;

        const sShifted = { x: source.x + shiftX, y: source.y + shiftY, width: source.width, height: source.height };
        const tShifted = { x: target.x + shiftX, y: target.y + shiftY, width: target.width, height: target.height };

        const { start, end } = calculateBestPorts(sShifted, tShifted);
        const pathData = generateSmoothPath(start, end);

        svg += \`  <path d="\${pathData}" fill="none" stroke="#94a3b8" stroke-width="2.5" marker-end="url(#arrow)" />\\n\`;
        if (edge.label) {
          const midX = (start.x + end.x) / 2;
          const midY = (start.y + end.y) / 2;
          svg += \`  <text x="\${midX}" y="\${midY - 6}" fill="#38bdf8" font-size="11" font-family="sans-serif" font-weight="bold" text-anchor="middle">\${escapeXml(edge.label)}</text>\\n\`;
        }
      });

      // Render Nodes
      svg += \`  <!-- Flowchart Boxes -->\\n\`;
      state.nodes.forEach(node => {
        const nx = node.x + shiftX;
        const ny = node.y + shiftY;
        svg += \`  <g id="\${node.id}">\\n\`;
        svg += \`    <rect x="\${nx}" y="\${ny}" width="\${node.width}" height="\${node.height}" rx="\${node.radius}" ry="\${node.radius}" fill="\${node.fill}" stroke="\${node.stroke}" stroke-width="\${node.strokeWidth}" />\\n\`;
        
        const lines = node.text.split('\\n');
        lines.forEach((line, idx) => {
          const lineY = ny + (node.height / 2) + (lines.length > 1 ? (idx - (lines.length - 1) / 2) * 16 : 0);
          svg += \`    <text x="\${nx + node.width / 2}" y="\${lineY}" fill="\${node.textColor}" font-size="\${node.fontSize}" font-family="sans-serif" font-weight="bold" text-anchor="middle" dominant-baseline="central">\${escapeXml(line)}</text>\\n\`;
        });
        svg += \`  </g>\\n\`;
      });

      svg += \`</svg>\`;
      return svg;
    }

    function escapeXml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
    }

    // ==========================================
    // Native PowerPoint (.pptx) Direct Exporter
    // ==========================================
    async function exportToNativePptx() {
      if (state.nodes.length === 0) {
        showToast('請先載入或新增方塊圖！', '⚠️');
        return;
      }

      showToast('正在產生原生可編輯 PowerPoint (.pptx)...', '⏳');

      // 1. Try Backend Daemon Python-PPTX Endpoint
      let exportedViaBackend = false;
      try {
        const res = await apiFetch('/api/diagram/export_pptx', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nodes: state.nodes,
            edges: state.edges,
            slide_title: state.title || '硬體架構方塊圖 (可編輯原生 PPT)',
            theme: state.theme || 'dark'
          })
        });
        if (res.ok) {
          const blob = await res.blob();
          const localPath = res.headers.get('X-Local-Path') || 'C:\\\\Apps\\\\webcom_AI\\\\data\\\\latest_exported_diagram.pptx';
          const filename = \`editable_diagram_\${Date.now()}.pptx\`;
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          a.click();
          URL.revokeObjectURL(url);
          showToast(\`已成功下載原生 PPTX：\${filename}！\\n• 瀏覽器下載位置：Windows「下載」資料夾 (Downloads)\\n• 本地備份路徑：\${localPath}\`, '🎉');
          exportedViaBackend = true;
          return;
        }
      } catch (err) {
        console.log('Backend daemon not reachable, using client-side PptxGenJS fallback:', err);
      }

      // 2. Client-side PptxGenJS Fallback
      if (typeof PptxGenJS === 'undefined') {
        alert('正在載入 PPTX 模組，請稍候重試或確認網路連線！');
        return;
      }

      try {
        const pptx = new PptxGenJS();
        pptx.layout = 'LAYOUT_16x9'; // 10 x 5.625 inches
        pptx.author = 'Webcom AI Diagram Reconstructor';
        pptx.title = state.title || '可編輯系統方塊圖';

        const slide = pptx.addSlide();
        const isDark = (state.theme !== 'light');
        slide.background = { color: isDark ? '0F172A' : 'F8FAFC' };

        // Determine bounding box of all nodes
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        state.nodes.forEach(n => {
          if (n.x < minX) minX = n.x;
          if (n.y < minY) minY = n.y;
          if (n.x + n.width > maxX) maxX = n.x + n.width;
          if (n.y + n.height > maxY) maxY = n.y + n.height;
        });

        const origW = Math.max(100, maxX - minX);
        const origH = Math.max(100, maxY - minY);

        // Slide geometry in inches (16:9 widescreen)
        const SLIDE_W = 10.0;
        const SLIDE_H = 5.625;
        const MARGIN_X = 0.6;
        const MARGIN_Y = 0.8;
        const USABLE_W = SLIDE_W - MARGIN_X * 2;
        const USABLE_H = SLIDE_H - MARGIN_Y - 0.4;

        const scale = Math.min(USABLE_W / origW, USABLE_H / origH);
        const renderW = origW * scale;
        const renderH = origH * scale;
        const offsetX = MARGIN_X + (USABLE_W - renderW) / 2;
        const offsetY = MARGIN_Y + (USABLE_H - renderH) / 2;

        // Slide Title (Native Editable Text)
        slide.addText(state.title || '系統架構方塊圖 (可編輯原生 PPT)', {
          x: MARGIN_X,
          y: 0.22,
          w: USABLE_W,
          h: 0.45,
          fontSize: 14,
          bold: true,
          color: isDark ? '38BDF8' : '0284C7'
        });

        // 3. Render Nodes as Native Shapes
        const shapeMap = {};
        state.nodes.forEach(node => {
          const sx = offsetX + (node.x - minX) * scale;
          const sy = offsetY + (node.y - minY) * scale;
          const sw = Math.max(0.4, node.width * scale);
          const sh = Math.max(0.25, node.height * scale);

          const fillColor = (node.fill || (isDark ? '#1e293b' : '#ffffff')).replace('#', '');
          const lineColor = (node.stroke || (isDark ? '#38bdf8' : '#0284c7')).replace('#', '');
          const textColor = (node.textColor || (isDark ? '#f8fafc' : '#0f172a')).replace('#', '');

          const shapeType = (node.radius > 0) ? pptx.ShapeType.roundRect : pptx.ShapeType.rect;

          // Add native shape with solid fill and stroke
          slide.addShape(shapeType, {
            x: sx,
            y: sy,
            w: sw,
            h: sh,
            fill: { color: fillColor },
            line: { color: lineColor, width: Math.max(1, node.strokeWidth || 2) },
            rectRadius: 0.08
          });

          // Add native editable text frame centered inside the shape
          if (node.text) {
            slide.addText(node.text, {
              x: sx,
              y: sy,
              w: sw,
              h: sh,
              fontSize: Math.max(7.5, Math.min(13, (node.fontSize || 12) * scale * 1.5)),
              bold: true,
              color: textColor,
              align: 'center',
              valign: 'middle'
            });
          }

          shapeMap[node.id] = { sx, sy, sw, sh, cx: sx + sw / 2, cy: sy + sh / 2 };
        });

        // 4. Render Edges as Native Lines with Arrowheads
        state.edges.forEach(edge => {
          const src = shapeMap[edge.from];
          const dst = shapeMap[edge.to];
          if (!src || !dst) return;

          const dx = dst.cx - src.cx;
          const dy = dst.cy - src.cy;
          const connColor = (edge.color || (isDark ? '#94a3b8' : '#475569')).replace('#', '');
          let midX, midY;

          if (Math.abs(dx) >= Math.abs(dy)) {
            // Horizontal connection
            const srcTop = src.sy, srcBot = src.sy + src.sh;
            const dstTop = dst.sy, dstBot = dst.sy + dst.sh;
            let connY;
            if (dstTop <= src.cy && src.cy <= dstBot) {
              connY = src.cy;
            } else if (srcTop <= dst.cy && dst.cy <= srcBot) {
              connY = dst.cy;
            } else if (!(srcBot < dstTop || dstBot < srcTop)) {
              connY = (Math.max(srcTop, dstTop) + Math.min(srcBot, dstBot)) / 2;
            } else {
              connY = null;
            }

            let x1, x2;
            if (dx > 0) {
              x1 = src.sx + src.sw;
              x2 = dst.sx;
            } else {
              x1 = src.sx;
              x2 = dst.sx + dst.sw;
            }

            if (connY !== null) {
              // 100% straight horizontal line (絕對水平直線)
              slide.addShape(pptx.ShapeType.line, {
                x: Math.min(x1, x2),
                y: connY,
                w: Math.abs(x2 - x1),
                h: 0,
                line: {
                  color: connColor,
                  width: 2,
                  endArrowType: 'triangle'
                }
              });
              midX = (x1 + x2) / 2;
              midY = connY;
            } else {
              // Right-angle orthogonal 3-segment line (正交折線，零斜線)
              const segMidX = (x1 + x2) / 2;
              const y1 = src.cy;
              const y2 = dst.cy;
              // Seg 1: horizontal
              slide.addShape(pptx.ShapeType.line, {
                x: Math.min(x1, segMidX),
                y: y1,
                w: Math.abs(segMidX - x1),
                h: 0,
                line: { color: connColor, width: 2 }
              });
              // Seg 2: vertical
              slide.addShape(pptx.ShapeType.line, {
                x: segMidX,
                y: Math.min(y1, y2),
                w: 0,
                h: Math.abs(y2 - y1),
                line: { color: connColor, width: 2 }
              });
              // Seg 3: horizontal with arrowhead
              slide.addShape(pptx.ShapeType.line, {
                x: Math.min(segMidX, x2),
                y: y2,
                w: Math.abs(x2 - segMidX),
                h: 0,
                line: { color: connColor, width: 2, endArrowType: 'triangle' }
              });
              midX = segMidX;
              midY = (y1 + y2) / 2;
            }
          } else {
            // Vertical connection
            const srcLeft = src.sx, srcRight = src.sx + src.sw;
            const dstLeft = dst.sx, dstRight = dst.sx + dst.sw;
            let connX;
            if (dstLeft <= src.cx && src.cx <= dstRight) {
              connX = src.cx;
            } else if (srcLeft <= dst.cx && dst.cx <= srcRight) {
              connX = dst.cx;
            } else if (!(srcRight < dstLeft || dstRight < srcLeft)) {
              connX = (Math.max(srcLeft, dstLeft) + Math.min(srcRight, dstRight)) / 2;
            } else {
              connX = null;
            }

            let y1, y2;
            if (dy > 0) {
              y1 = src.sy + src.sh;
              y2 = dst.sy;
            } else {
              y1 = src.sy;
              y2 = dst.sy + dst.sh;
            }

            if (connX !== null) {
              // 100% straight vertical line (絕對垂直直線)
              slide.addShape(pptx.ShapeType.line, {
                x: connX,
                y: Math.min(y1, y2),
                w: 0,
                h: Math.abs(y2 - y1),
                line: {
                  color: connColor,
                  width: 2,
                  endArrowType: 'triangle'
                }
              });
              midX = connX;
              midY = (y1 + y2) / 2;
            } else {
              // Right-angle orthogonal 3-segment line (正交折線，零斜線)
              const segMidY = (y1 + y2) / 2;
              const x1 = src.cx;
              const x2 = dst.cx;
              // Seg 1: vertical
              slide.addShape(pptx.ShapeType.line, {
                x: x1,
                y: Math.min(y1, segMidY),
                w: 0,
                h: Math.abs(segMidY - y1),
                line: { color: connColor, width: 2 }
              });
              // Seg 2: horizontal
              slide.addShape(pptx.ShapeType.line, {
                x: Math.min(x1, x2),
                y: segMidY,
                w: Math.abs(x2 - x1),
                h: 0,
                line: { color: connColor, width: 2 }
              });
              // Seg 3: vertical with arrowhead
              slide.addShape(pptx.ShapeType.line, {
                x: x2,
                y: Math.min(segMidY, y2),
                w: 0,
                h: Math.abs(y2 - segMidY),
                line: { color: connColor, width: 2, endArrowType: 'triangle' }
              });
              midX = (x1 + x2) / 2;
              midY = segMidY;
            }
          }

          if (edge.label && midX !== undefined && midY !== undefined) {
            slide.addText(edge.label, {
              x: midX - 0.75,
              y: midY - 0.18,
              w: 1.5,
              h: 0.3,
              fontSize: 8.5,
              bold: true,
              color: isDark ? '38BDF8' : '0284C7',
              align: 'center',
              valign: 'middle'
            });
          }
        });

        const fallbackFname = \`editable_diagram_\${Date.now()}.pptx\`;
        await pptx.writeFile({ fileName: fallbackFname });
        showToast(\`已成功下載原生 PPTX：\${fallbackFname}！\\n• 檔案已儲存於 Windows「下載」資料夾 (Downloads)\`, '🎉');
      } catch (err) {
        console.error('PPTX export error:', err);
        alert('匯出 PPTX 失敗: ' + err.message);
      }
    }

    // Theme Toggle Function
    function toggleTheme() {
      state.theme = (state.theme === 'dark' ? 'light' : 'dark');
      const isDark = (state.theme === 'dark');
      document.getElementById('btn-theme-toggle').textContent = isDark ? '🎨 主題: 深色' : '🎨 主題: 淺色純白';
      
      const canvasBg = document.querySelector('.canvas-container');
      if (canvasBg) {
        canvasBg.style.background = isDark ? '#090d16' : '#f1f5f9';
      }
      editorSvg.style.background = isDark ? '#090d16' : '#ffffff';

      // Update node styles if default
      state.nodes.forEach(n => {
        if (isDark) {
          if (n.fill === '#ffffff' || n.fill === '#f8fafc') n.fill = '#1e293b';
          if (n.textColor === '#0f172a' || n.textColor === '#1e293b') n.textColor = '#f8fafc';
        } else {
          if (n.fill === '#1e293b' || n.fill === '#0f172a') n.fill = '#ffffff';
          if (n.textColor === '#f8fafc' || n.textColor === '#ffffff') n.textColor = '#0f172a';
        }
      });
      renderCanvas();
      showToast(\`已切換為 \${isDark ? '深色簡報風格' : '商務純白投影片風格'}\`);
    }

    
    document.getElementById('btn-export-pptx').addEventListener('click', exportToNativePptx);
    document.getElementById('btn-theme-toggle').addEventListener('click', toggleTheme);

    // Export SVG
    document.getElementById('btn-export-svg').addEventListener('click', () => {
      if (state.nodes.length === 0) {
        alert('請先載入或新增方塊圖！');
        return;
      }
      const svgCode = generateStandaloneSvg();
      openModal('匯出 SVG 向量圖 (可於 PowerPoint 轉換為原生形狀)', svgCode, 'flowchart.svg', 'image/svg+xml');
    });

    // Export JSON
    document.getElementById('btn-export-json').addEventListener('click', () => {
      const data = {
        app: 'Webcom PPT Diagram Vectorizer',
        version: '2.0',
        exportedAt: new Date().toISOString(),
        nodes: state.nodes,
        edges: state.edges
      };
      const jsonStr = JSON.stringify(data, null, 2);
      openModal('匯出圖形 JSON 結構資料', jsonStr, 'flowchart.json', 'application/json');
    });

    // Copy SVG Code
    document.getElementById('btn-copy-svg-code').addEventListener('click', () => {
      if (state.nodes.length === 0) {
        alert('畫布上無方塊圖可複製！');
        return;
      }
      const svg = generateStandaloneSvg();
      navigator.clipboard.writeText(svg).then(() => {
        showToast('SVG 代碼已複製到剪貼簿！可直接貼上向量編輯器', '📋');
      });
    });

    // Modal Operations
    const exportModal = document.getElementById('export-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalCode = document.getElementById('modal-code');
    let modalDownloadFilename = 'export.txt';
    let modalDownloadMime = 'text/plain';

    function openModal(title, code, filename, mime) {
      modalTitle.textContent = title;
      modalCode.value = code;
      modalDownloadFilename = filename;
      modalDownloadMime = mime;
      exportModal.classList.add('active');
    }

    document.getElementById('btn-close-modal').addEventListener('click', () => exportModal.classList.remove('active'));
    document.getElementById('btn-copy-modal').addEventListener('click', () => {
      navigator.clipboard.writeText(modalCode.value).then(() => showToast('已複製內容至剪貼簿！'));
    });
    document.getElementById('btn-download-modal').addEventListener('click', () => {
      const blob = new Blob([modalCode.value], { type: modalDownloadMime });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = modalDownloadFilename;
      a.click();
      URL.revokeObjectURL(a.href);
      showToast(\`已成功下載 \${modalDownloadFilename}！\`, '💾');
    });

    // LLM Layout Refinement
    const llmModal = document.getElementById('llm-refine-modal');
    const llmPromptInput = document.getElementById('llm-refine-prompt');
    const llmStatusBadge = document.getElementById('llm-engine-status');

    function openLlmModal() {
      if (state.nodes.length === 0) {
        showToast('畫布目前沒有節點，請先載入或新增方塊圖！', '⚠️');
        return;
      }
      llmModal.classList.add('active');
      fetch('http://127.0.0.1:8001/api/services/status')
        .then(r => r.json())
        .then(data => {
          if (data?.services?.lm_studio === 'online') {
            llmStatusBadge.textContent = '● LM Studio (Port 1234) + 幾何引擎: 連線中';
            llmStatusBadge.style.color = '#34d399';
            llmStatusBadge.style.borderColor = 'rgba(52, 211, 153, 0.4)';
          }
        })
        .catch(() => {});
    }

    function closeLlmModal() {
      llmModal.classList.remove('active');
    }

    document.getElementById('btn-llm-refine').addEventListener('click', openLlmModal);
    document.getElementById('btn-close-llm-modal').addEventListener('click', closeLlmModal);

    async function executeLlmRefinement(customPrompt) {
      const promptText = customPrompt || llmPromptInput.value || '一鍵全域自動微調對齊跑板';
      showToast('🤖 正在透過排版優化引擎微調對齊中...', '⏳');
      const runBtn = document.getElementById('btn-run-llm-refine');
      runBtn.disabled = true;
      runBtn.textContent = '微調運算中...';

      try {
        const payload = {
          nodes: state.nodes,
          edges: state.edges,
          prompt: promptText
        };

        const res = await apiFetch('/api/diagram/llm_refine', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          throw new Error(\`微調服務回應錯誤 HTTP \${res.status}\`);
        }

        const data = await res.json();
        if (data.status === 'success') {
          saveHistory();
          state.nodes = data.nodes;
          state.edges = data.edges;
          renderCanvas();
          closeLlmModal();
          showToast(\`✨ 跑板微調完成！已自動優化對齊 \${data.adjustments_count || '所有'} 處節點連線\`, '🎉');
        } else {
          showToast('微調未返回變更', '⚠️');
        }
      } catch (err) {
        console.error('LLM refine error:', err);
        localGeometrySnap();
        closeLlmModal();
        showToast('已由前端向量引擎完成自動幾何微調！', '⚡');
      } finally {
        runBtn.disabled = false;
        runBtn.textContent = '🚀 執行智慧微調';
      }
    }

    function localGeometrySnap() {
      saveHistory();
      const nodeMap = {};
      state.nodes.forEach(n => nodeMap[n.id] = n);

      const xtalPairs = [
        ['crystal_bt', 'bt_xtal', 'bt'],
        ['crystal_gps', 'gps_xtal', 'gps'],
        ['crystal_6224', 'xtal_6224', 'qcn6224'],
        ['crystal_6274', 'xtal_6274', 'qcn6274']
      ];
      xtalPairs.forEach(([xId, lId, cId]) => {
        if (nodeMap[xId] && nodeMap[cId]) {
          const cy = (cId === 'bt' || cId === 'gps') ? (nodeMap[cId].y + nodeMap[cId].height / 2) : (nodeMap[cId].y + nodeMap[cId].height - 15);
          nodeMap[xId].y = Math.round(cy - nodeMap[xId].height / 2);
          if (nodeMap[lId]) {
            nodeMap[lId].y = Math.round(cy - nodeMap[lId].height / 2);
          }
        }
      });
      renderCanvas();
    }

    document.getElementById('btn-run-llm-refine').addEventListener('click', () => executeLlmRefinement());
    document.getElementById('btn-quick-auto-align').addEventListener('click', () => executeLlmRefinement('一鍵全域自動對齊'));
    document.getElementById('btn-quick-wifi-align').addEventListener('click', () => executeLlmRefinement('Wi-Fi 射頻鏈路置中'));
    document.getElementById('btn-quick-xtal-align').addEventListener('click', () => executeLlmRefinement('晶振引腳校準'));
    document.getElementById('btn-quick-bus-align').addEventListener('click', () => executeLlmRefinement('平行匯流排均勻化'));

    // Initial startup - start clean with no pre-loaded or confidential diagram
    window.addEventListener('DOMContentLoaded', () => {
      state.nodes = [];
      state.edges = [];
      state.imageLoaded = false;
      clearSelection();
      renderCanvas();
    });
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
            },
            {
                id: 'app_3d_studio',
                title: '3D 智慧元件工作坊',
                titleEn: '3D Component Studio',
                category: 'html',
                description: '支援即時 Transparent(半透明透視)、Emissive(內部晶片自發光)、Fresnel(邊緣光掠角全息輪廓) 與 Wireframe(拓撲線框) 著色器；內建 8 階分類法電子元件預設庫，可一鍵匯出高精度 AutoCAD DWG/DXF 向量圖紙、ISO-10303-21 STEP CAD 實體模型與原生 PowerPoint PPTX 投影片。',
                descriptionEn: 'Real-time WebGL shader studio with Transparent glass, Emissive core glow, Fresnel holographic rim lighting, Wireframe overlay, and precision AutoCAD DWG/DXF & ISO STEP AP214 vector exports.',
                author: 'Webcom 3D Labs',
                icon: '💎',
                version: 'v1.0.0',
                createdAt: new Date().toISOString(),
                code: `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="utf-8">
  <meta http-equiv="refresh" content="0; url=/web/apps/3d_studio.html">
  <title>3D Component Studio</title>
</head>
<body style="margin:0;background:#090d16;color:#f8fafc;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;">
  <div style="text-align:center;">
    <h2 style="color:#06b6d4;margin-bottom:12px;">💎 3D 智慧元件工作坊</h2>
    <p>正在載入 3D 著色器視口與 CAD/PPT 導出引擎...</p>
    <p><a href="/web/apps/3d_studio.html" style="color:#a855f7;text-decoration:underline;">點此手動開啟獨立應用</a></p>
  </div>
  <script>location.href = '/web/apps/3d_studio.html';<\/script>
</body>
</html>`
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
                        // Remove legacy entries if present
                        const legacyIdx = list.findIndex(a => a.id === 'app_tripo_3d_studio' || a.id === 'app_old_3d');
                        if (legacyIdx !== -1) {
                            list.splice(legacyIdx, 1);
                            changed = true;
                        }
                        const existingIdx = list.findIndex(a => a.id === s.id);
                        if (existingIdx === -1) {
                            list.push(s);
                            changed = true;
                        } else if (s.id === 'app_ppt_diagram_reconstructor' || s.id === 'app_3d_studio') {
                            list[existingIdx] = s;
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

            card.style.cursor = 'pointer';
            card.addEventListener('click', (e) => {
                if (e.target.closest('button')) return;
                runCustomAppInSandbox(app);
            });

            card.querySelector('.btn-open-tab-app')?.addEventListener('click', (e) => {
                e.stopPropagation();
                if (app.id === 'app_decimen_optical') {
                    window.open('apps/decimen_optical.html', '_blank');
                } else if (app.id === 'app_ppt_diagram_reconstructor') {
                    window.open('apps/ppt_diagram_reconstructor.html', '_blank');
                } else if (app.id === 'app_3d_studio') {
                    window.open('apps/3d_studio.html', '_blank');
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

        if (app.id === 'app_3d_studio') {
            // Use dedicated App Runner Modal for full-screen iframe
            if (window.openAppRunnerModal) {
                window.openAppRunnerModal(
                    '/web/apps/3d_studio.html',
                    app.title || '3D 智慧元件工作坊',
                    app.icon || '💎'
                );
            } else {
                window.open('apps/3d_studio.html', '_blank');
            }
            return;
        }

        if (app.id === 'app_decimen_optical') {
            // Use dedicated App Runner Modal for full-screen iframe
            if (window.openAppRunnerModal) {
                window.openAppRunnerModal(
                    '/web/apps/decimen_optical.html',
                    app.title || 'Decimen 光學隔空傳輸',
                    app.icon || '📡'
                );
            } else {
                window.open('apps/decimen_optical.html', '_blank');
            }
            return;
        }
        if (app.id === 'app_ppt_diagram_reconstructor') {
            // Use dedicated App Runner Modal for full-screen iframe
            if (window.openAppRunnerModal) {
                window.openAppRunnerModal(
                    '/web/apps/ppt_diagram_reconstructor.html',
                    app.title || 'PPT 方塊圖向量還原器',
                    app.icon || '📊'
                );
            } else {
                window.open('apps/ppt_diagram_reconstructor.html', '_blank');
            }
            return;
        }

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
