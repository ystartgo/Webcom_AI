# Webcom AI 應用庫框架說明文件

> **版本**：v3.2.5 ｜ **儲存庫**：[github.com/ystartgo/Webcom_AI](https://github.com/ystartgo/Webcom_AI)  
> **主要檔案**：`web/js/app_library.js` · `web/js/artifact_drawer.js`

---

## 目錄

1. [框架概述](#1-框架概述)
2. [應用資料結構 App Schema](#2-應用資料結構-app-schema)
3. [應用類型 Category](#3-應用類型-category)
4. [開啟方式 Launch Mode](#4-開啟方式-launch-mode)
5. [內建應用 vs 使用者自建應用](#5-內建應用-vs-使用者自建應用)
6. [建立新應用逐步教學](#6-建立新應用逐步教學)
7. [程式碼撰寫規則](#7-程式碼撰寫規則)
8. [API 整合：呼叫平台 LLM 與後端](#8-api-整合呼叫平台-llm-與後端)
9. [Storage 儲存機制](#9-storage-儲存機制)
10. [公開 Window API](#10-公開-window-api)
11. [嵌入大型獨立 HTML 應用](#11-嵌入大型獨立-html-應用)
12. [多語系支援規則](#12-多語系支援規則)
13. [開發除錯技巧](#13-開發除錯技巧)
14. [完整範例模板](#14-完整範例模板)

---

## 1. 框架概述

```
┌─────────────────────────────────────────────────────────────────┐
│                        Webcom AI 主介面                          │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  應用庫 Modal (#app-library-modal)                          │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐     │ │
│  │  │ App Card │ │ App Card │ │ App Card │ │ + 新增   │     │ │
│  │  │ [執行]   │ │ [執行]   │ │ [執行]   │ │ App      │     │ │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘     │ │
│  └──────────────────────────┬───────────────────────────────┘ │
│                             │ runCustomAppInSandbox()          │
│  ┌──────────────────────────▼───────────────────────────────┐ │
│  │  Artifact Drawer (#artifact-drawer-modal)                 │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │  iframe srcdoc="..."  或  iframe src="/web/..."      │ │ │
│  │  │  App 在此沙箱中獨立運行，可呼叫 localhost:8001 API   │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  └──────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

應用庫是一個 **IIFE 模組**（立即執行函數，無全域污染），透過 `localStorage` 持久化儲存，並與 Artifact Drawer 整合，在不離開主介面的情況下執行任意 HTML / Python / Shell 應用。

---

## 2. 應用資料結構 App Schema

每個應用是一個 JavaScript 物件，包含以下欄位：

```javascript
{
  // ── 必填欄位 ───────────────────────────────────
  id:          'app_my_tool',          // 唯一識別符，建議格式：app_{snake_case}
  title:       '我的工具（繁中名稱）',   // 主要顯示名稱（中文）
  category:    'html',                  // 見「應用類型」章節
  code:        `<html>...</html>`,     // 應用程式內容（HTML/Python/Shell/JSON/Prompt）

  // ── 強烈建議填寫 ─────────────────────────────────
  description: '一句話描述此工具的功能，60 字以內最佳。',
  icon:        '🔧',                   // Emoji 圖示（顯示在卡片左上角）
  version:     'v1.0',                 // 版本號字串
  author:      'Your Name',            // 作者名稱

  // ── 選填欄位 ───────────────────────────────────
  titleEn:       'My Tool',            // 英文名稱（切換語言時顯示）
  descriptionEn: 'One-line description in English.',
  prompt:        '',                   // 專屬 System Prompt（供 LLM 使用）
  createdAt:     new Date().toISOString(),  // 建立時間 ISO 字串
  updatedAt:     new Date().toISOString(),  // 更新時間 ISO 字串
}
```

### 欄位規則

| 欄位 | 必填 | 限制 | 說明 |
|------|------|------|------|
| `id` | ✅ | 英數 + 底線，`app_` 前綴 | 必須全域唯一，重複會覆蓋舊版 |
| `title` | ✅ | ≤ 30 字 | 主要顯示文字，建議繁體中文 |
| `category` | ✅ | 見下表 | 決定執行方式與圖示 |
| `code` | ✅ | 無上限 | 完整的應用程式原始碼 |
| `icon` | — | 單一 Emoji | 卡片顯示圖示，預設 `⚡` |
| `version` | — | 字串格式 | 建議 `v1.0.0` 格式 |

---

## 3. 應用類型 Category

| category | 執行環境 | 說明 |
|----------|----------|------|
| `'html'` | Artifact Drawer iframe (srcdoc) | 最常用。完整 HTML 頁面在 iframe 中執行，可用所有瀏覽器 API |
| `'py'` | Pyodide WASM + Terminal #3 | 純前端 Python 沙箱（無需後端），輸出顯示在 Terminal 面板 |
| `'sh'` | Blob URL 新視窗 | Shell/Batch 腳本說明文件 |
| `'json'` | JSON Viewer | 資料集檢視與格式化 |
| `'prompt'` | 文字展示 | System Prompt 或 Prompt 範本 |
| `'url'` | Artifact Drawer iframe (src=URL) | **v3.2.5 新增**，大型獨立 HTML 檔案，code 存放 URL 路徑 |

> [!NOTE]
> `'url'` 類型的 `code` 欄位存放的是 `/web/apps/xxx.html` 路徑，而非 HTML 內容。
> Artifact Drawer 會用 `iframe.src = URL` 直接嵌入，適合超過 50KB 的大型應用。

---

## 4. 開啟方式 Launch Mode

```
使用者點擊 App Card
        │
        ▼
runCustomAppInSandbox(app)
        │
        ├─ app.id === 'app_decimen_optical'
        │   └─→ openArtifactWithContent(id, title, '/web/apps/decimen_optical.html', 'url')
        │
        ├─ app.id === 'app_ppt_diagram_reconstructor'
        │   └─→ openArtifactWithContent(id, title, '/web/apps/ppt_diagram_reconstructor.html', 'url')
        │
        ├─ app.category === 'py'
        │   └─→ openArtifactWithContent(id, title, code, 'py')
        │       + sendPyodideCode(code, title)
        │
        └─ 其他 HTML/JSON/prompt
            └─→ openArtifactWithContent(id, title, code, category)
                    │
                    ▼
            renderDrawerContent(art)
                    │
                    ├─ type='url'  → iframe.src = content (URL)
                    ├─ type='html' → iframe.srcdoc = content (HTML)
                    └─ type='py'  → Pyodide runner
```

---

## 5. 內建應用 vs 使用者自建應用

### 內建預設應用（Built-in Samples）

定義在 `getSampleCustomApps()` 函數中，每次載入時自動合入 localStorage：

| App ID | 名稱 | 類型 |
|--------|------|------|
| `app_decimen_optical` | Decimen 光學隔空傳輸 | `url` (外部 HTML) |
| `app_ppt_diagram_reconstructor` | PPT 方塊圖向量還原器 | `url` (外部 HTML) |
| `app_pomodoro_timer` | 番茄工作法計時器 | `html` (內嵌) |
| `app_json_formatter` | JSON 格式化工具 | `html` (內嵌) |
| `app_py_fib` | Python 數列生成 | `py` |

> [!IMPORTANT]
> `app_ppt_diagram_reconstructor` 每次載入都會從 `getSampleCustomApps()` 強制更新，
> 確保用戶端始終使用最新版本。若要固定版本，移除第 4008–4010 行的強制更新邏輯。

### 使用者自建應用

- 透過 UI「新增應用」按鈕建立
- 儲存在 `localStorage['webcom_custom_apps_v2']`
- 可匯出為 JSON 備份，並重新匯入

---

## 6. 建立新應用逐步教學

### 方法 A：透過 UI 介面（推薦給非開發者）

1. 點擊主介面頂部的 **「📦 應用庫」** 按鈕
2. 點擊右上角 **「＋ 新增應用」**
3. 填寫名稱、類型、說明，在 Code 區貼上 HTML
4. 點擊 **「💾 儲存」** 即建立完成

### 方法 B：加入 `getSampleCustomApps()` 成為內建應用

編輯 `web/js/app_library.js`，在 `getSampleCustomApps()` 的 `return [...]` 陣列中加入新物件：

```javascript
function getSampleCustomApps() {
    return [
        // ... 現有應用 ...
        {
            id: 'app_my_new_tool',
            title: '我的新工具',
            titleEn: 'My New Tool',
            category: 'html',
            description: '此工具的一句話說明。',
            descriptionEn: 'One-line description of this tool.',
            author: 'Your Name',
            icon: '🔧',
            version: 'v1.0',
            createdAt: new Date().toISOString(),
            code: `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="utf-8">
  <title>我的新工具</title>
</head>
<body>
  <h1>Hello World</h1>
  <script>
    console.log('App loaded!');
  <\/script>
</body>
</html>`
        }
    ];
}
```

> [!IMPORTANT]
> `code` 字串中所有的 `</script>` 都必須寫成 `<\/script>`，
> 否則會提前結束外層的 `<script>` 標籤，導致整頁 JS 崩潰！

### 方法 C：建立大型獨立 HTML 應用（url 類型）

當應用超過 50KB 或需要完整 DOM 環境時：

**Step 1**：將 HTML 放在 `web/apps/my_app.html`

**Step 2**：在 `runCustomAppInSandbox()` 函數中加入特殊路由（app_library.js 第 4140 行附近）：

```javascript
if (app.id === 'app_my_standalone') {
    if (window.openArtifactWithContent) {
        window.openArtifactWithContent(
            'app_my_standalone',
            app.title,
            '/web/apps/my_app.html',  // 後端 serve 的絕對路徑
            'url'
        );
    } else {
        window.open('apps/my_app.html', '_blank');
    }
    return;
}
```

**Step 3**：在 `getSampleCustomApps()` 加入 App 物件（`code` 欄位留空字串）

**Step 4**：更新 `index.html` 中的 `app_library.js?v=X.X.X` 版本號，強制瀏覽器重新載入

---

## 7. 程式碼撰寫規則

### HTML App 的沙箱安全規則

iframe 的 `sandbox` 屬性允許以下操作：
- ✅ `fetch()` 呼叫（包括 `http://127.0.0.1:8001/api/*`）
- ✅ `localStorage` / `sessionStorage`
- ✅ Canvas / WebGL / Web Audio API
- ✅ `alert()` / `confirm()`
- ✅ 檔案下載
- ❌ 存取父頁面 DOM（跨 origin 限制）

### 模板字面量嵌套規則（最常見的 Bug 來源）

若 App 的 `code` 是寫在 JS 的 backtick 模板字串中：

```javascript
// ❌ 錯誤：外層 backtick 中不能有未逸脫的 ${...}
code: `
  const msg = `Hello ${name}`;       // ← 語法錯誤！
  el.style.margin = `-${val}em`;     // ← 語法錯誤！
`

// ✅ 正確寫法 1：改用字串串接
code: `
  const msg = 'Hello ' + name;
  el.style.margin = '-' + val + 'em';
`

// ✅ 正確寫法 2：逸脫 $ 符號
code: `
  const msg = \`Hello \${name}\`;     // 在外層 backtick 中用 \\${ 逸脫
`

// ✅ 最佳做法：使用獨立 HTML 檔案（url 類型），完全避免問題
```

> [!CAUTION]
> 建議將超過 100 行的 App 移到獨立 HTML 檔案，以 `'url'` 類型引用，
> 完全避免模板字面量嵌套問題，也便於維護和 Git 版本追蹤。

---

## 8. API 整合：呼叫平台 LLM 與後端

### 建議的 apiFetch 工具函數

```javascript
async function apiFetch(endpoint, options = {}) {
    const candidates = [
        'http://127.0.0.1:8001' + endpoint,
        'http://localhost:8001' + endpoint
    ];
    for (const url of candidates) {
        try {
            const res = await fetch(url, options);
            if (res.ok) return res;
        } catch(e) {}
    }
    throw new Error('無法連線至後端 ' + endpoint);
}
```

### 主要可用 API 端點

| 端點 | 方法 | 功能 |
|------|------|------|
| `/api/status` | GET | 後端健康檢查 |
| `/api/chat` | POST | 主 LLM 對話（串流） |
| `/api/services/status` | GET | LM Studio / GPU 狀態 |
| `/api/diagram/recognize_base64` | POST | 圖片方塊圖辨識（OCR） |
| `/api/diagram/llm_refine` | POST | 幾何排版 LLM 微調 |
| `/api/diagram/export_geojson` | POST | 匯出 GeoJSON FeatureCollection |
| `/api/gpu_info` | GET | GPU VRAM 資訊 |

### 呼叫 LLM

```javascript
// 方法 1：使用 LM Studio（需在本機啟動，port 1234）
async function callLMStudio(prompt) {
    const res = await fetch('http://127.0.0.1:1234/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: 'local-model',
            messages: [
                { role: 'system', content: '你是一個精準的助理。' },
                { role: 'user', content: prompt }
            ],
            temperature: 0.1,
            stream: false
        })
    });
    const data = await res.json();
    return data.choices[0].message.content;
}
```

---

## 9. Storage 儲存機制

```
localStorage Key: 'webcom_custom_apps_v2'
Value: JSON Array of App Objects
```

### 載入優先級

```
loadCustomAppsFromStorage() 執行流程：

1. 讀取 localStorage['webcom_custom_apps_v2']
   ├─ 若為空 → 寫入並回傳 getSampleCustomApps()（預設 5 個內建應用）
   └─ 若有資料 → 解析 JSON 陣列
         │
         ▼
2. 合入 getSampleCustomApps()：
   ├─ localStorage 中不存在某個 sample.id → 追加
   └─ id === 'app_ppt_diagram_reconstructor' → 強制更新最新版
         │
         ▼
3. 回傳合併後的 App 陣列（使用者自建 + 內建）
```

### 匯出 / 匯入

```javascript
window.exportCustomAppsAction();  // 匯出所有 App 為 JSON 檔
window.triggerImportApps();       // 觸發 JSON 匯入
```

---

## 10. 公開 Window API

所有以下函數均掛載在 `window` 上，可從主頁面 JS 直接調用：

```javascript
// 應用庫 Modal 控制
window.openAppLibraryModal()
window.closeAppLibraryModal()

// App CRUD
window.openEditCustomAppModal(app)   // 傳 null 為新增
window.closeAppEditModal()
window.saveCustomAppFromModal()
window.previewCustomAppFromModal()
window.confirmDeleteAppAction(id)
window.executeDeleteApp()
window.closeAppDeleteModal()

// 篩選與渲染
window.filterAppLibraryCategory(cat, btnEl)
window.renderAppLibraryGrid(searchQuery)

// 執行
window.runCustomAppInSandbox(app)

// 資料管理
window.loadSampleAppsAction()        // 重設為出廠內建應用
window.exportCustomAppsAction()      // 匯出 JSON
window.triggerImportApps()           // 觸發匯入

// LLM 翻譯
window.translateCurrentAppWithLLMAction()
window.translateAllAppsWithLLMAction()
```

---

## 11. 嵌入大型獨立 HTML 應用

`artifact_drawer.js` 的 `type='url'` 機制（v3.2.5 新增）：

```javascript
// artifact_drawer.js renderDrawerContent() 中的邏輯
if (isUrl) {
    iframe.removeAttribute('srcdoc');
    iframe.src = content;   // content = '/web/apps/your_app.html'
}
```

**注意事項**：
- URL 必須是後端可以 serve 的絕對路徑（`/web/apps/xxx.html`）
- 獨立 HTML 中的資源引用應使用絕對路徑（如 `/web/js/vendor/xxx.js`）
- iframe 與父頁面同源，獨立 HTML 可讀取父頁面 `localStorage`

---

## 12. 多語系支援規則

應用庫支援 `zh-TW` 與 `en` 切換：

```javascript
// 在 getSampleCustomApps() 中加入雙語欄位
{
    title: '繁體中文名稱',
    titleEn: 'English Title',
    description: '中文說明',
    descriptionEn: 'English description',
}

// 或在 KNOWN_TRANSLATIONS 字典中加入對照（app_library.js 第 41 行附近）
const KNOWN_TRANSLATIONS = {
    '我的工具': {
        titleEn: 'My Tool',
        descriptionEn: 'Description in English.'
    }
}
```

---

## 13. 開發除錯技巧

### 常見問題排查

| 問題 | 原因 | 解法 |
|------|------|------|
| 應用庫按鈕沒反應 | JS 語法錯誤導致 IIFE 失敗 | F12 → Console 查看 SyntaxError |
| App 白屏 | `code` 中有無效 HTML / JS 錯誤 | Artifact Drawer 「程式碼」tab 看原始碼 |
| 按鈕 click 無效 | 模板字面量語法錯誤 `${...}` | 改用字串串接或逸脫 `\${}` |
| 應用開新分頁而非內嵌 | `openArtifactWithContent` 未找到 | 確認 `artifact_drawer.js` 已載入且版本正確 |
| 自建 App 消失 | localStorage 被清除 | 使用「匯出 JSON」定期備份 |

### 快速重設應用庫

瀏覽器 Console 執行：
```javascript
localStorage.removeItem('webcom_custom_apps_v2');
location.reload();
```

### 語法驗證

```powershell
# 在專案根目錄執行
node --check web/js/app_library.js
node --check web/js/artifact_drawer.js
```

---

## 14. 完整範例模板

### 範例 A：互動圖表（內嵌 srcdoc）

```javascript
{
    id: 'app_chart_viewer',
    title: '圖表檢視器',
    titleEn: 'Chart Viewer',
    category: 'html',
    description: '互動長條圖，支援隨機資料。',
    descriptionEn: 'Interactive bar chart with random data.',
    author: 'Your Name',
    icon: '📊',
    version: 'v1.0',
    createdAt: new Date().toISOString(),
    code: `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="utf-8">
  <title>圖表檢視器</title>
  <style>
    body { font-family: sans-serif; background: #0f172a; color: #f1f5f9; margin: 0; padding: 1rem; }
    h1 { color: #38bdf8; }
    #chart { display: flex; align-items: flex-end; gap: 8px; height: 200px; margin-top: 1rem; }
    .bar { background: #6366f1; border-radius: 4px 4px 0 0; min-width: 30px; transition: height 0.3s; }
    .bar:hover { background: #818cf8; }
    button { background: #6366f1; color: white; border: none; padding: 0.5rem 1rem;
             border-radius: 0.4rem; cursor: pointer; margin-top: 1rem; }
  </style>
</head>
<body>
  <h1>📊 互動圖表</h1>
  <div id="chart"></div>
  <button onclick="randomize()">🎲 隨機資料</button>
  <script>
    function render(d) {
      const max = Math.max(...d);
      document.getElementById('chart').innerHTML = d.map(v =>
        '<div class="bar" style="height:' + (v / max * 100) + '%" title="' + v + '"></div>'
      ).join('');
    }
    function randomize() {
      render(Array.from({length: 8}, () => Math.floor(Math.random() * 100) + 10));
    }
    render([65, 40, 80, 55, 90, 30, 70, 45]);
  <\/script>
</body>
</html>`
}
```

### 範例 B：Python 統計分析（Pyodide）

```javascript
{
    id: 'app_py_stats',
    title: 'Python 統計分析',
    titleEn: 'Python Stats Analyzer',
    category: 'py',
    description: '使用 Pyodide 在瀏覽器中執行 Python 基礎統計分析。',
    descriptionEn: 'Basic statistical analysis via Pyodide WASM.',
    author: 'Your Name',
    icon: '🐍',
    version: 'v1.0',
    createdAt: new Date().toISOString(),
    code: `# Python 統計分析
import statistics

data = [23, 45, 67, 12, 89, 34, 56, 78, 90, 11]
print("=== 基礎統計分析 ===")
print(f"資料集: {data}")
print(f"平均值: {statistics.mean(data):.2f}")
print(f"中位數: {statistics.median(data):.2f}")
print(f"標準差: {statistics.stdev(data):.2f}")
print(f"最大值: {max(data)} | 最小值: {min(data)}")`
}
```

### 範例 C：呼叫後端 API 的即時監控

```javascript
{
    id: 'app_gpu_monitor',
    title: 'GPU 即時監控',
    titleEn: 'GPU Live Monitor',
    category: 'html',
    description: '即時顯示 GPU VRAM 使用量，每 2 秒自動刷新。',
    descriptionEn: 'Live GPU VRAM monitor, auto-refresh every 2 seconds.',
    author: 'Your Name',
    icon: '🖥️',
    version: 'v1.0',
    createdAt: new Date().toISOString(),
    code: `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="utf-8">
  <title>GPU 監控</title>
  <style>
    body { font-family: monospace; background: #0f172a; color: #f1f5f9;
           display: flex; align-items: center; justify-content: center;
           height: 100vh; margin: 0; }
    .card { background: #1e293b; padding: 2rem; border-radius: 1rem;
            border: 1px solid #334155; text-align: center; min-width: 280px; }
    h2 { color: #22d3ee; margin: 0 0 1rem; }
    .value { font-size: 2rem; font-weight: bold; color: #34d399; }
    .sub { color: #94a3b8; font-size: 0.8rem; margin-top: 0.5rem; }
  </style>
</head>
<body>
  <div class="card">
    <h2>🖥️ GPU VRAM</h2>
    <div class="value" id="vram">載入中...</div>
    <div class="sub" id="detail"></div>
    <div class="sub" id="ts"></div>
  </div>
  <script>
    async function refresh() {
      try {
        const r = await fetch('http://127.0.0.1:8001/api/gpu_info');
        if (r.ok) {
          const d = await r.json();
          document.getElementById('vram').textContent =
            (d.used_mb || 0) + ' / ' + (d.total_mb || 0) + ' MB';
          document.getElementById('detail').textContent = 'GPU: ' + (d.name || '未知');
          document.getElementById('ts').textContent =
            '更新: ' + new Date().toLocaleTimeString();
        }
      } catch(e) {
        document.getElementById('vram').textContent = '連線失敗';
      }
    }
    refresh();
    setInterval(refresh, 2000);
  <\/script>
</body>
</html>`
}
```

---

## 附錄：核心檔案索引

| 檔案 | 說明 |
|------|------|
| `web/js/app_library.js` | 應用庫主模組（IIFE），包含所有 App 資料、UI 邏輯 |
| `web/js/artifact_drawer.js` | Artifact Drawer 面板，負責 iframe 渲染 |
| `web/apps/ppt_diagram_reconstructor.html` | PPT 方塊圖還原器獨立 HTML |
| `web/apps/decimen_optical.html` | 光學隔空傳輸獨立 HTML |
| `daemon/server.py` | 後端 FastAPI，提供所有 `/api/*` 端點 |
| `daemon/diagram_engine.py` | 圖像辨識引擎（OCR + 幾何 + GeoJSON） |
| `web/index.html` | 主頁面，含 Script 載入順序與版本快取號 |

---

*最後更新：2026-09-30 ｜ Commit：[42de49f](https://github.com/ystartgo/Webcom_AI/commit/42de49f)*
