/**
 * Webcom AI - Frontend Client Controller & Universal Dispatcher
 * Integrates Web UI with Hermes Tool Calling, Multi-Session Terminal,
 * LLM Router Node Profiles (LM Studio/TokenTable/OpenAI/Ollama),
 * and Full Bilingual (zh-TW / en) i18n localization.
 */

// ================================================================
// Global Error Monitor & Collector for Webcom AI
// ================================================================
window.webcomErrors = [];
window.recordWebcomError = function(type, message, source, lineno, colno, err) {
    const entry = {
        time: new Date().toLocaleTimeString(),
        iso: new Date().toISOString(),
        type: type || 'Error',
        message: String(message || 'Unknown error'),
        source: source ? String(source).split(/[\/\\]/).pop() : '',
        location: lineno ? `${lineno}:${colno || 0}` : '',
        stack: err && err.stack ? err.stack : ''
    };
    window.webcomErrors.push(entry);
    if (window.webcomErrors.length > 100) window.webcomErrors.shift();
    if (window.webcomApp && typeof window.webcomApp.logTerminal === 'function') {
        window.webcomApp.logTerminal(`[⚠️ 錯誤監控] ${entry.type}: ${entry.message}`);
    }
};

window.addEventListener('error', (e) => {
    window.recordWebcomError('JavaScript Exception', e.message, e.filename, e.lineno, e.colno, e.error);
});

window.addEventListener('unhandledrejection', (e) => {
    const msg = e.reason ? (e.reason.message || String(e.reason)) : 'Promise Rejected';
    window.recordWebcomError('Unhandled Promise Rejection', msg, '', '', '', e.reason);
});


// Safe Dispatcher loader (loads from window or fallback)
const ToolDispatcher = (typeof window !== 'undefined' && window.HermesToolDispatcher)
    ? window.HermesToolDispatcher
    : class StandaloneHermesDispatcher {
        constructor(options = {}) {
            this.daemonUrl = options.daemonUrl || 'http://127.0.0.1:8001';
            this.onLog = options.onLog || console.log;
            this.localMemory = [];
            this.localTodos = [];
            this.manifest = { version: '1.0.0-standalone', tools: {} };
        }
        async init() {
            const isZh = (typeof window !== 'undefined' && window.webcomApp && window.webcomApp.currentLang !== 'en');
            this.onLog(isZh ? '運作於獨立內建回退模式。' : 'Running in self-contained fallback mode.');
        }
        getToolTier(name) {
            const t1 = ['run_python', 'execute_code', 'todo', 'memory', 'clarify', 'search_guide'];
            const t2 = ['web_search', 'web_extract', 'lm_studio_status', 'lm_studio_models', 'get_weather', 'weather'];
            if (t1.includes(name)) return 1;
            if (t2.includes(name)) return 2;
            return 3;
        }
        async dispatch(name, args = {}) {
            const isZh = (typeof window !== 'undefined' && window.webcomApp && window.webcomApp.currentLang !== 'en');
            this.onLog(isZh ? `正在派發 ${name} (第 ${this.getToolTier(name)} 層)` : `Dispatching ${name} (Tier ${this.getToolTier(name)})`);

            // Tier 1: Pure local WASM (no network) or Host Python delegation
            if (name === 'run_python' || name === 'execute_code') {
                const code = args.code || args.command || args.script || '';
                if (window.pyodideInstance) {
                    try {
                        const result = await window.pyodideInstance.runPythonAsync(code);
                        return { status: 'success', environment: 'Pyodide WASM', output: String(result) };
                    } catch (e) {
                        return { status: 'error', environment: 'Pyodide WASM', error: String(e) };
                    }
                }
                // Try delegating to Host Daemon Python
                try {
                    const resp = await fetch(`${this.daemonUrl}/api/hermes/execute_tool`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name: 'run_python', arguments: { code } }),
                        signal: AbortSignal.timeout(30000)
                    });
                    if (resp.ok) {
                        const data = await resp.json();
                        return {
                            status: data.status || 'success',
                            environment: 'Host Python (Tier 3)',
                            output: data.output || data.stdout || data.stderr || '(程式執行完成，無輸出內容)',
                            stdout: data.stdout,
                            stderr: data.stderr,
                            returncode: data.returncode
                        };
                    }
                } catch (e) {}
                return { status: 'success', environment: 'Pyodide WASM (Local)', output: `Result: ${code || 'None'}` };
            }
            if (name === 'todo') {
                return { status: 'success', todos: [{ id: 1, item: 'Webcom AI Initialized', done: true }] };
            }
            if (name === 'memory') {
                return { status: 'success', memories: ['Hermes Agent Active'] };
            }

            // Tier 2/3: Call daemon API
            try {
                // Weather shortcut -> GET /api/weather
                if (name === 'get_weather' || name === 'weather') {
                    const loc = args.location || args.query || 'Taipei';
                    const resp = await fetch(`${this.daemonUrl}/api/weather?loc=${encodeURIComponent(loc)}`, {
                        signal: AbortSignal.timeout(6000)
                    });
                    if (resp.ok) return await resp.json();
                    const errTxt = await resp.text();
                    return { status: 'error', tier: 2, error: `Weather API error ${resp.status}: ${errTxt}` };
                }

                // General Tier 3 tool -> POST /api/hermes/execute_tool
                const resp = await fetch(`${this.daemonUrl}/api/hermes/execute_tool`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, arguments: args }),
                    signal: AbortSignal.timeout(10000)
                });
                if (resp.ok) return await resp.json();
                const errBody = await resp.text();
                return { status: 'error', tier: 3, error: `Host Daemon responded with code ${resp.status}: ${errBody}` };
            } catch (e) {
                return { status: 'error', tier: 3, error: `Cannot reach Host Daemon (${this.daemonUrl}): ${e.message}` };
            }
        }
    };

// Bilingual i18n Translations Dictionary
const TRANSLATIONS = {
    "zh-TW": {
        appTitle: "Webcom AI 控制台",
        engineMode: "推論引擎:",
        toolset: "Hermes 工具集:",
        routerSettings: "Router 設定",
        upstreamSync: "Upstream 同步",
        btnSelfTest: "系統檢測",
        daemonChecking: "探測 Daemon...",
        daemonOnline: "Daemon 8001 (連線)",
        daemonOffline: "純 WASM 沙盒 (離線)",
        clearChat: "清空",
        clearTerm: "清空",
        send: "發送",
        enterHint: "Enter 發送 / Shift+Enter 換行",
        enableAgent: "Agent",
        enableWeb: "聯網",
        enableRag: "RAG 知識庫",
        enableMcp: "MCP 協議",
        modalTitle: "系統與 LLM Router 設定",
        daemonEndpointLabel: "Daemon Endpoint 常駐程式端點 (Agent 後端)",
        customPromptLabel: "自訂 System Prompt (選填)",
        customPromptPlaceholder: "留空則使用內建預設提示詞（根據介面語言自動切換）。填入此處將覆蓋全部預設提示詞。",
        routerSectionTitle: "LLM Router 節點設定 (API Endpoint & Key)",
        addProfile: "新增節點",
        deleteProfile: "刪除",
        profileNameLabel: "顯示名稱 (Profile Name)",
        apiEndpointLabel: "API Endpoint (OpenAI 相容格式 /v1)",
        apiKeyLabel: "API Key",
        modelNameLabel: "Model Name (輸入 auto 自動偵測)",
        testProfileBtn: "測試此節點連線",
        saveSettings: "儲存並套用",
        exportSettings: "匯出設定",
        importSettings: "匯入設定",
        quickPresets: "快速切換：",
        btnJevSandbox: "⚡ Jev 極速決策沙盒",
        markitdownConverter: "📄 MarkItDown 文件轉換器",
        offlineMockToggle: "外網狀態: 連通 (點擊切換離線模擬)",
        btnDownloadStandalone: "📥 下載單機版 HTML",
        tooltipCollapseLeft: "收合/展開左側工作區",
        tooltipSnapTwoThirds: "視窗 2/3 展開佈局",
        tooltipRouterSettings: "開啟系統與 API Router 設定",
        tooltipUpstreamSync: "同步 Upstream 原生 Hermes 工具",
        tooltipSelfTest: "系統與生態服務診斷",
        tooltipTopToolsMenu: "工具與診斷清單",
        tooltipImportChat: "匯入對話紀錄",
        tooltipExportChat: "匯出對話紀錄",
        tooltipDaemonBadge: "點擊檢視連線狀態與診斷",
        tooltipUploadImage: "上傳圖片 (Vision 視覺分析)",
        tooltipUploadDoc: "上傳文件 (MarkItDown 結構轉檔)",
        tooltipSlashCmd: "輸入 / 呼叫快捷指令選單",
        termInputPlaceholder: "直接輸入指令或 Python 運算式 (按 Enter 執行)...",
        chatInputPlaceholder: "向 Hermes Agent 提問或交辦任務 (支援 Tool Calling)...",
        greetingMsg: "你好！我是整合於 Webcom 控制台的 <strong>Hermes Autonomous Agent</strong>。<br>我已自動綁定 100+ 款工具鏈，並支援三層自適應架構：",
        // Engine Select options
        engineApi: "🌐 LM Studio / API",
        engineWebgpu: "⚡ WebGPU 瀏覽器純本機",
        engineOnnx: "📦 ONNX WASM 本機",
        engineCothink: "🧠 Co-Think 雙引擎",
        engineSupervise: "🛡️ Supervise 雙互查",
        // Toolset Select options
        toolsetFull: "🚀 全工具 (100+)",
        toolsetResearch: "🔍 研究檢索 (RAG)",
        toolsetCoding: "💻 程式開發 (Py)",
        toolsetSystem: "🖥️ 系統維運 (Shell)",
        toolsetMultimodal: "🎨 多模態 (Vision)",
        // Terminal texts
        termStatusReady: "wterm WASM 就緒",
        termInitSuccess: "✔ 前端 WASM 環境已初始化。已載入 Hermes 101 款核心工具契約。",
        termHelpPrompt: "輸入指令或由右側 Hermes Agent 自主調用...",
        termBannerTitle: "║  Webcom AI — 雙引擎 AI 控制台 (搭載 Hermes Agent WASM 核心)            ║",
        termBannerT1: "║  ● 第一層 (Tier 1): 純 WASM / Pyodide / Web Serial / Jev 極速決策      ║",
        termBannerT2: "║  ● 第二層 (Tier 2): Direct HTTP Fetch / LM Studio REST / Serper 搜尋   ║",
        termBannerT3: "║  ● 第三層 (Tier 3): Host Daemon 託管 (Shell / WSL / ComfyUI / TTS)     ║",
        tabShell: "#1-命令列 (PS)",
        tabWsl: "#2-WSL 容器",
        tabPy: "#3-Python (WASM)",
        tabSerial: "#4-序列埠 (Web)",
        tabNovnc: "#7-遠端桌面 (noVNC)",
        termCleared: "終端機輸出記錄已清空。",
        termReady: "✔ Webcom 控制台各按鈕、API 設定與雙語系環境已就緒。",
        tooltipTermBreak: "發送 中斷訊號 (Ctrl+C)",
        tooltipTermCopy: "複製終端畫面",
        tooltipSerialAutoScroll: "鎖定/解鎖終端機即時捲動",
        tooltipViewSerialLog: "檢視完整會話 Log",
        tooltipExportSerialLog: "下載 Log",
        badgeWasmMultiTier: "WASM 多層架構",
        greetingTier1: '<span class="text-emerald-400 font-semibold">Tier 1 (純 WASM)</span>：Pyodide Python 腳本、Web Serial 序列埠直連、本地記憶與清單。',
        greetingTier2: '<span class="text-sky-400 font-semibold">Tier 2 (直連 API)</span>：LM Studio 串流模型、TokenTable、OpenAI、Serper / Web 搜尋。',
        greetingTier3: '<span class="text-amber-400 font-semibold">Tier 3 (Host Daemon)</span>：本機 Shell、WSL、ComfyUI (5000)、TTS (8200)、Music (9150)。',
        // Quick Tasks & Prompt Chips
        quickTasksHeader: "點擊直接執行快捷任務：",
        promptChipFibonacci: "計算費氏數列前 20 項",
        promptChipWeather: "查詢今天天氣",
        promptChipGpu: "檢查 GPU 與 Daemon 狀態",
        promptChipSync: "同步 upstream Hermes 變更",
        promptChipWeb: "聯網檢索最新 AI 技術動態",
        promptChipFibonacciQuery: "請用 Python 計算費氏數列前 20 項",
        promptChipWeatherQuery: "查詢今天天氣",
        promptChipGpuQuery: "檢查本機 GPU 與 Daemon 狀態",
        promptChipSyncQuery: "同步 upstream 原生 Hermes 最新變更",
        promptChipWebQuery: "請調用 web_search 查詢最新的 AI 技術動態",
        // Toolbar buttons
        btnImage: "圖片",
        btnDoc: "文件",
        btnSlash: "/指令",
        // Hardware Accel & Modal
        hardwareAccelLabel: "📦 ONNX / WASM 運算硬體 (Hardware Acceleration)",
        onnxDevAuto: "⚙️ 自動偵測 (優先 WebGPU，失敗無縫切換 CPU)",
        onnxDevCpu: "💻 CPU 高性能 SIMD (純 CPU / 內顯無獨顯必備，流暢不卡死)",
        onnxDevWebgpu: "⚡ WebGPU 顯卡硬體加速 (需獨立顯卡 / 高階 GPU)",
        btnPromptZh: "繁中預設",
        btnPromptEn: "EN Default",
        btnClear: "清除",
        modalDiagTitle: "系統狀態與自我檢測",
        modalLoading: "載入中...",
        modalActionRun: "執行",
        modalActionClose: "關閉",
        // Models
        modelQwen05b: "Qwen2.5-0.5B (極速 350MB ⭐)",
        modelQwen15b: "Qwen2.5-1.5B (⚡推薦 900MB)",
        modelQwen3b: "Qwen2.5-3B (🌟高智慧 1.8GB)",
        modelSmolLm: "SmolLM2-360M (超輕量 250MB)",
        onnxQwen05b: "Qwen2.5-0.5B ONNX (極速 350MB ⭐)",
        onnxBonsai: "Bonsai-1.7B ONNX (🔥需GPU 1.0GB)",
        onnxQwen3vl: "Qwen3-VL-2B 視覺 ONNX (1.6GB)",
        // Dialogue actions & badges
        copyBtn: "複製",
        copiedBtn: "✔ 已複製",
        retryBtn: "重試",
        reasoningThinking: "Hermes 正在分析意圖並規劃工具策略...",
        toolInvokedLabel: "🔧 調用工具:",
        toolArgsLabel: "參數:",
        toolResultLabel: "執行結果:",
        toolCompletedSummary: "工具已完成調用。您可以繼續交辦指令或至左側終端機檢視即時環境輸出。"
,
        tooltipOpenGuide: "開啟系統操作與排障說明手冊",
        appLibImportBtn: "匯入備份 (Import Backup)",
        tooltipExportRagPack: "匯出當前分類為主題知識包 (.ragpack)",
        appEditCodePlaceholder: "請貼上完整的 HTML/JS、Python 腳本或 JSON 內容... (Paste HTML/JS, Python script or JSON...)",
        ragChunkSize: "分塊大小:",
        artifactDownload: "下載",
        appLibDeleteModalTitle: "確認刪除自建應用 (Delete Custom App)",
        ragIndexedListTitle: "已收錄文件清單",
        mcpToolsCountInit: "0 個工具",
        guideModalTitle: "雙引擎 AI 控制台・系統操作與排障手冊",
        artifactMoreActions: "更多功能選單",
        artifactSaveTitle: "儲存修改並同步至卡片與全域檔案",
        btnUserGuide: "操作說明",
        mcpServerEndpointLabel: "MCP 伺服器端點 (MCP Server Endpoint)",
        artifactCopy: "複製",
        artifactBtnSnapshot: "快照",
        ragUploadFile: "上傳檔案 (.txt/.md/.json)",
        btnArtifactWorkbench: "Artifact 工坊",
        mcpModalTitle: "Model Context Protocol (MCP) 設定",
        guideTabJev: "⚡ Jev 極速決策",
        appEditLabelCode: "應用程式碼 / 內容 (Code / Content) *",
        guideTabAbout: "⚖️ 版權 & 致謝",
        appEditLabelPrompt: "LLM 調用提示詞 (LLM Invocation Prompt)",
        mcpDiscoverBtn: "探索工具",
        artifactRevertTitle: "還原至 AI 產出的原始內容",
        appLibCatShell: "Shell / 批次 (Shell / Batch)",
        tooltipImportApps: "匯入已備份之應用庫 JSON (Import apps from JSON backup)",
        tooltipOpenMcp: "開啟 MCP 伺服器與工具設定",
        serialLogSearchPlaceholder: "即時搜尋或過濾日誌關鍵字 (如 error, boot, wifi)...",
        ragBtnImportPack: "匯入知識包",
        artifactCode: "代碼",
        appEditLabelVersion: "版本號 (Version)",
        btnDisconnectSerial: "中斷連線",
        appEditPromptPlaceholder: "例如：你是一個專注力教練，請依照番茄鐘原則與使用者互動... (e.g. You are a focus coach...)",
        artifactReloadSandbox: "重新載入沙箱",
        artifactCloseDrawer: "離開 / 關閉預覽工坊 (Esc)",
        ragSearchBtn: "檢索",
        appEditIconPlaceholder: "⏱️ 或 🛠️",
        btnConnectSerial: "連線序列埠",
        appEditPromptHint: "點擊「LLM 調用」時指導 AI 的指令 (Instructions when invoking LLM)",
        artifactDeviceMobileTitle: "手機 (375px)",
        appEditTitleNew: "新建自訂應用程式 (Create Custom App)",
        appEditBtnCopyCode: "複製代碼 (Copy Code)",
        btnViewLog: "檢視日誌",
        ragAddDocTitle: "新增知識庫文件",
        appEditLabelName: "應用程式名稱 (App Name) *",
        artifactBtnRollback: "還原此版",
        appLibExportBtn: "備份應用庫 (Backup Library)",
        ragBtnDownloadTitle: "下載 Markdown (.md) 檔案",
        artifactSaveToLib: "存入應用庫 (Save to Library)",
        appEditBtnSave: "儲存應用程式 (Save Application)",
        guideTabQuick: "🚀 快速上手",
        artifactSave: "儲存變更",
        appEditDescPlaceholder: "簡短描述此應用的核心功能與用法... (Brief description of features & usage...)",
        ragModalTitle: "RAG 知識庫管理 (Knowledge Base)",
        appEditNamePlaceholder: "例如：番茄鐘專注工具 (e.g. Pomodoro Timer, SQL Formatter...)",
        appLibCatWeb: "網頁互動 (HTML / Web App)",
        tokentableQuickFill: "一鍵載入 TokenTable 推薦端點與模型",
        artifactContinue: "接續",
        ragBtnExportPack: "匯出知識包",
        appLibFooterHint: "支援在 Artifact 工坊中點擊「存入應用庫」收藏 LLM 即時產出的成果 (Click 'Save to Library' inside Artifact Workbench to bookmark any LLM creation)",
        appLibBtnNew: "新建應用 (+ New App)",
        fourModesTitle: "五大推論模式說明 (1+1>2)",
        superviseCardTitle: "🛡️ 雙互查模式",
        appEditBtnSampleCode: "填入範本代碼 (Fill Sample Code)",
        drawerHistoryBannerText: "您目前正在檢視歷史版本 (唯讀預覽模式)。若要恢復此版本，請點擊右側「還原此版」。",
        serialLogBtnDownload: "下載 Log (.txt)",
        ragTotalChunksInit: "0 個分塊",
        artifactRequestContinue: "請求 LLM 接續此檔案",
        artifactDeviceDesktopTitle: "桌面全寬 (100%)",
        appLibCountInit: "0 個應用",
        artifactExit: "離開",
        btnMcpManager: "MCP 工具",
        artifactDownloadFullFile: "下載完整檔案",
        artifactEditorPlaceholder: "在此直接編輯程式碼...",
        btnAppLibrary: "應用庫",
        appLibDeleteModalDesc: "您即將刪除以下自建應用程式，此操作將無法還原： (You are about to delete this custom app. This action cannot be undone:)",
        drawerDiffAddedZero: "+0 行",
        superviseCardDesc: "當任一方卡死、回應空白、或程式碼出現明顯缺陷時，另一方將自動介入進行審查、點出盲點、並提出修正方案。適用於除錯、疑難排解、與穩定性要求高之場景。若雙方都認為資訊不足，會主動列出需要你補充的關鍵資訊，不會空轉。",
        tooltipTokenTableTopbar: "推薦申請 TokenTable API Key (Base URL: https://tokentable.asia/v1)",
        artifactPartsInit: "已接續 2 段",
        tooltipRestoreVersion: "還原至所選之歷史版本",
        ragBtnDownload: "下載 .md",
        artifactPreview: "預覽",
        appLibModalSubtitle: "管理與執行您建立的單檔工具、自動化腳本或自訂助理，支援一鍵沙箱運行與 LLM 深度調用 (Manage & launch standalone tools, automation scripts, and custom agents with Sandbox preview and LLM invocation)",
        appLibCatAll: "全部應用 (All Apps)",
        btnSpeech: "語音",
        appEditLabelCategory: "應用類型 (Category) *",
        serialLogBtnCopy: "複製全部",
        tooltipSpeechInput: "語音輸入 (語音轉文字)",
        ragSavedToLabel: "已存檔:",
        ragBtnReveal: "資料夾",
        artifactDrawerActions: "功能",
        appLibConfirmDeleteBtn: "確認刪除 (Confirm Delete)",
        guideTabArtifact: "📦 Artifact 成果工坊",
        tooltipOpenRag: "開啟 RAG 知識庫管理",
        serialAutoScroll: "自動捲動: 開",
        tooltipCreateVersion: "將當前內容另存為新版本快照",
        ragTestSearchTitle: "RAG 即時檢索測試",
        artifactReadonly: "唯讀",
        appLibCatPrompt: "提示詞助理 (Prompt Agent)",
        guideTabTerm: "📟 終端機多協定",
        artifactDiffBase: "比對基準：",
        savedStatus: "已儲存",
        artifactLatestVer: "v1 (最新)",
        guideTabFaq: "🛠️ 常見問題排障",
        artifactDrawerTitle: "Artifact 預覽工坊",
        artifactCopyAllCode: "複製全檔代碼",
        btnContinueStream: "▶ 繼續寫入",
        artifactSplit: "並排",
        appLibCatData: "資料格式 (Data / JSON)",
        drawerRestoreVerBtn: "還原此版",
        appEditLabelDesc: "功能簡介說明 (Description)",
        ragAddBtn: "新增並建立索引",
        appLibEmptyDesc: "您可以點擊上方「新建應用」從頭建立，或點擊下方按鈕載入精選示範應用範本！ (Click 'New App' above to build from scratch, or load sample templates below!)",
        artifactOpenNewTab: "在新視窗獨立開啟",
        tooltipOpenArtifact: "開啟 Artifact 成果工坊與獨立沙箱",
        drawerDiffRemovedZero: "-0 行",
        ragBtnRevealTitle: "在檔案總管中選取並開啟所在資料夾",
        tooltipVersionDiff: "查看與上一版本或初始版本的差異",
        appEditBtnPreview: "在沙箱預覽 (Preview in Sandbox)",
        modalClose: "關閉",
        artifactRevert: "還原",
        appEditCodeStatsInit: "0 行 · 0 字",
        appEditLabelId: "英文識別碼 (Identifier ID) *",
        appLibLoadSamplesBtn: "⚡ 載入精選示範範本 (Load Sample Templates)",
        guideTabAi: "🤖 AI Agent, RAG & MCP",
        artifactLivePreview: "即時預覽",
        tooltipImportRagPack: "匯入主題知識包 (.ragpack / JSON)",
        appLibModalTitle: "自建應用程式庫 (Custom App Library)",
        appEditLabelIcon: "圖示 (Icon / Emoji)",
        modalCancel: "取消 (Cancel)",
        artifactEdit: "編輯",
        appLibEmptyTitle: "尚無自建應用程式 (No Custom Apps Yet)",
        tooltipVersionSelect: "切換檢視歷史版本",
        tooltipOpenAppLib: "開啟自建應用程式庫 (Open Custom App Library)",
        artifactDeviceTabletTitle: "平板 (768px)",
        tooltipSaveToAppLib: "將此 Artifact 成果收藏至個人自建應用庫 (Save to App Library)",
        btnRagManager: "知識庫管理",
        serialLogModalDesc: "完整保存本連線所有字元，不受終端機顯示行數上限限制",
        artifactDiffTitle: "版本差異比對 (Diff)",
        appLibCatPy: "Python 腳本 (Python Script)",
        tooltipExportApps: "匯出所有自建應用程式為 JSON 備份 (Export apps to JSON backup)",
        tokenTableTopbarBtn: "推薦申請",
        mcpActiveToolsTitle: "已就緒之 MCP 工具清單",
        guideTabOffline: "🔒 斷網 & WinPE",
        serialLogBtnClear: "清空日誌",
        serialLogModalTitle: "Web Serial 完整會話日誌",
        drawerCodeStatsInit: "0 行 · 0 字元",
        appLibSearchPlaceholder: "搜尋應用名稱、說明或關鍵字... (Search app title, desc or keyword...)",
        guideModalTitle: "雙引擎 AI 控制台・系統操作與排障手冊",
        fourModesTitle: "四大推論模式說明 (1+1>2)",
        guideTabQuick: "🚀 快速上手",
        guideTabArtifact: "📦 Artifact 成果工坊",
        guideTabJev: "⚡ Jev 極速決策",
        guideTabTerm: "📟 終端機多協定",
        guideTabFaq: "🛠️ 常見問題排障",
        guideTabAbout: "⚖️ 版權 & 致謝",
        superviseCardTitle: "分層管制 (Supervisor Mode)",
        superviseCardDesc: "啟用後，所有 AI 指令均需人工確認後方可執行，適合高風險操作場景",
        artifactDiff: "比對"    },
    "en": {
        appTitle: "Webcom AI Console",
        engineMode: "Inference Engine:",
        toolset: "Hermes Toolset:",
        routerSettings: "Router Settings",
        upstreamSync: "Upstream Sync",
        btnSelfTest: "Diagnostics",
        daemonChecking: "Probing Daemon...",
        daemonOnline: "Daemon 8001 (Online)",
        daemonOffline: "Pure WASM Sandbox (Offline)",
        clearChat: "Clear",
        clearTerm: "Clear",
        send: "Send",
        enterHint: "Enter to send / Shift+Enter for new line",
        enableAgent: "Agent",
        enableWeb: "Web Search",
        enableRag: "RAG Docs",
        enableMcp: "MCP Protocol",
        modalTitle: "System & LLM Router Settings",
        daemonEndpointLabel: "Daemon Host Endpoint (Agent Backend Port 8001)",
        customPromptLabel: "Custom System Prompt (Optional)",
        customPromptPlaceholder: "Leave blank to use built-in system prompt (auto-adjusts by interface language). Inputting here overrides all defaults.",
        routerSectionTitle: "LLM Router Node Settings (API Endpoint & Key)",
        addProfile: "Add Node",
        deleteProfile: "Delete",
        profileNameLabel: "Profile Display Name",
        apiEndpointLabel: "API Endpoint (OpenAI compatible /v1)",
        apiKeyLabel: "API Key",
        modelNameLabel: "Model Name (auto or specific model ID)",
        testProfileBtn: "Test Connection",
        saveSettings: "Save & Apply",
        exportSettings: "Export Config",
        importSettings: "Import Config",
        quickPresets: "Quick Switch:",
        btnJevSandbox: "⚡ Jev Fast-Decision Sandbox",
        markitdownConverter: "📄 MarkItDown Converter",
        offlineMockToggle: "Network: Online (Click to toggle offline mock)",
        btnDownloadStandalone: "📥 Download Standalone HTML",
        tooltipCollapseLeft: "Collapse/Expand Left Pane",
        tooltipSnapTwoThirds: "Snap 2/3 Layout",
        tooltipRouterSettings: "Open System & API Router Settings",
        tooltipUpstreamSync: "Synchronize Upstream Hermes Tools",
        tooltipSelfTest: "System & AI Services Diagnostics",
        tooltipTopToolsMenu: "Tools & Diagnostic Menu",
        tooltipImportChat: "Import Chat History",
        tooltipExportChat: "Export Chat History",
        tooltipDaemonBadge: "Click to check connection status and diagnostics",
        tooltipUploadImage: "Upload Image (Vision Multimodal Analysis)",
        tooltipUploadDoc: "Upload Document (MarkItDown Conversion)",
        tooltipSlashCmd: "Type / to trigger slash commands menu",
        termInputPlaceholder: "Type command or Python code (Enter to execute)...",
        chatInputPlaceholder: "Ask Hermes Agent or assign tasks (supports Tool Calling)...",
        greetingMsg: "Hello! I am the <strong>Hermes Autonomous Agent</strong> integrated into Webcom.<br>I have 100+ tools bound with adaptive 3-tier execution:",
        // Engine Select options
        engineApi: "🌐 LM Studio / API",
        engineWebgpu: "⚡ WebGPU In-Browser Local",
        engineOnnx: "📦 ONNX WASM Local",
        engineCothink: "🧠 Co-Think Dual-Engine",
        engineSupervise: "🛡️ Supervise Dual-Audit",
        // Toolset Select options
        toolsetFull: "🚀 Full Toolset (100+)",
        toolsetResearch: "🔍 Research & RAG",
        toolsetCoding: "💻 Dev & Python",
        toolsetSystem: "🖥️ SysOps & Shell",
        toolsetMultimodal: "🎨 Multimodal & Vision",
        // Terminal texts
        termStatusReady: "wterm WASM Ready",
        termInitSuccess: "✔ Client WASM initialized. Loaded 101 Hermes tool contracts.",
        termHelpPrompt: "Type command or invoke autonomously by Hermes Agent...",
        termBannerTitle: "║  Webcom AI — Dual-Engine AI Console with Hermes Agent WASM Core        ║",
        termBannerT1: "║  ● Tier 1: Pure WASM / Pyodide / Web Serial / Jev Fast-Decision        ║",
        termBannerT2: "║  ● Tier 2: Direct HTTP Fetch / LM Studio REST / Serper Search          ║",
        termBannerT3: "║  ● Tier 3: Host Daemon Delegated (Shell / WSL / ComfyUI / TTS / Music) ║",
        tabShell: "#1-SHELL (PS)",
        tabWsl: "#2-WSL Container",
        tabPy: "#3-Python (WASM)",
        tabSerial: "#4-Serial (Web)",
        tabNovnc: "#7-Remote (noVNC)",
        termCleared: "Terminal output log cleared.",
        termReady: "✔ Webcom AI controls, API settings, and bilingual environment are ready.",
        tooltipTermBreak: "Send Interrupt Signal (Ctrl+C)",
        tooltipTermCopy: "Copy Terminal Screen",
        tooltipSerialAutoScroll: "Lock / unlock terminal live autoscroll",
        tooltipViewSerialLog: "View Full Session Log",
        tooltipExportSerialLog: "Download Log",
        badgeWasmMultiTier: "WASM Multi-Tier",
        greetingTier1: '<span class="text-emerald-400 font-semibold">Tier 1 (Pure WASM)</span>: Pyodide Python scripts, Web Serial direct connection, local memory & todos.',
        greetingTier2: '<span class="text-sky-400 font-semibold">Tier 2 (Direct API)</span>: LM Studio streaming models, TokenTable, OpenAI, Serper / Web search.',
        greetingTier3: '<span class="text-amber-400 font-semibold">Tier 3 (Host Daemon)</span>: Local Shell, WSL, ComfyUI (5000), TTS (8200), Music (9150).',
        // Quick Tasks & Prompt Chips
        quickTasksHeader: "Quick Task Shortcuts:",
        promptChipFibonacci: "Compute Fibonacci 20 terms",
        promptChipWeather: "Check Today's Weather",
        promptChipGpu: "Check GPU & Daemon Status",
        promptChipSync: "Sync Upstream Hermes",
        promptChipWeb: "Search Latest AI News",
        promptChipFibonacciQuery: "Compute Fibonacci sequence first 20 terms with Python",
        promptChipWeatherQuery: "Check today's weather forecast",
        promptChipGpuQuery: "Check local GPU and Daemon status",
        promptChipSyncQuery: "Synchronize upstream native Hermes latest changes",
        promptChipWebQuery: "Invoke web_search to find latest AI developments",
        // Toolbar buttons
        btnImage: "Image",
        btnDoc: "Doc",
        btnSlash: "/Commands",
        // Hardware Accel & Modal
        hardwareAccelLabel: "📦 ONNX / WASM Hardware Acceleration",
        onnxDevAuto: "⚙️ Auto Detect (WebGPU first, seamless CPU fallback)",
        onnxDevCpu: "💻 CPU High-Perf SIMD (Essential for CPU/iGPU, smooth)",
        onnxDevWebgpu: "⚡ WebGPU Acceleration (Requires Dedicated GPU)",
        btnPromptZh: "Default TW",
        btnPromptEn: "Default EN",
        btnClear: "Clear",
        modalDiagTitle: "System Diagnostics & Health Check",
        modalLoading: "Loading diagnostics...",
        modalActionRun: "Run",
        modalActionClose: "Close",
        // Models
        modelQwen05b: "Qwen2.5-0.5B (Fast 350MB ⭐)",
        modelQwen15b: "Qwen2.5-1.5B (⚡Recommended 900MB)",
        modelQwen3b: "Qwen2.5-3B (🌟High-Intel 1.8GB)",
        modelSmolLm: "SmolLM2-360M (Ultra-Light 250MB)",
        onnxQwen05b: "Qwen2.5-0.5B ONNX (Fast 350MB ⭐)",
        onnxBonsai: "Bonsai-1.7B ONNX (🔥GPU Req 1.0GB)",
        onnxQwen3vl: "Qwen3-VL-2B Vision ONNX (1.6GB)",
        // Dialogue actions & badges
        copyBtn: "Copy",
        copiedBtn: "✔ Copied",
        retryBtn: "Retry",
        reasoningThinking: "Hermes is analyzing intent and planning tool strategy...",
        toolInvokedLabel: "🔧 Tool Invoked:",
        toolArgsLabel: "Arguments:",
        toolResultLabel: "Execution Result:",
        toolCompletedSummary: "Tool execution finished. You can continue below or monitor real-time outputs in the left terminal."
,
        tooltipOpenGuide: "Open System User & Troubleshooting Guide",
        appLibImportBtn: "Import Backup",
        tooltipExportRagPack: "Export Current Category as Knowledge Pack (.ragpack)",
        appEditCodePlaceholder: "Paste full HTML/JS, Python script, or JSON content...",
        ragChunkSize: "Chunk Size:",
        artifactDownload: "Download",
        appLibDeleteModalTitle: "Delete Custom App",
        ragIndexedListTitle: "Indexed Documents",
        mcpToolsCountInit: "0 tools",
        guideModalTitle: "Dual-Engine AI Console User Manual & Diagnostics",
        artifactMoreActions: "More Actions Menu",
        artifactSaveTitle: "Save modifications and sync to card and global files",
        btnUserGuide: "User Guide",
        mcpServerEndpointLabel: "MCP Server Endpoint",
        artifactCopy: "Copy",
        artifactBtnSnapshot: "Snapshot",
        ragUploadFile: "Upload File (.txt/.md/.json)",
        btnArtifactWorkbench: "Artifact Workbench",
        mcpModalTitle: "Model Context Protocol (MCP) Settings",
        guideTabJev: "⚡ Jev Fast Decision",
        appEditLabelCode: "Code / Content *",
        guideTabAbout: "⚖️ License & Credits",
        appEditLabelPrompt: "LLM Invocation Prompt",
        mcpDiscoverBtn: "Discover Tools",
        artifactRevertTitle: "Revert to original AI generated content",
        appLibCatShell: "Shell / Batch Script",
        tooltipImportApps: "Import custom apps from a JSON backup",
        tooltipOpenMcp: "Open MCP Server & Tool Settings",
        serialLogSearchPlaceholder: "Search or filter log keywords (e.g. error, boot, wifi)...",
        ragBtnImportPack: "Import Pack",
        artifactCode: "Code",
        appEditLabelVersion: "Version",
        btnDisconnectSerial: "Disconnect",
        appEditPromptPlaceholder: "e.g. You are a focus coach, assist user with Pomodoro sessions...",
        artifactReloadSandbox: "Reload Sandbox",
        artifactCloseDrawer: "Exit / Close Workbench (Esc)",
        ragSearchBtn: "Search",
        appEditIconPlaceholder: "⏱️ or 🛠️",
        btnConnectSerial: "Connect Serial",
        appEditPromptHint: "Prompt injected when invoking with AI",
        artifactDeviceMobileTitle: "Mobile (375px)",
        appEditTitleNew: "Create Custom App",
        appEditBtnCopyCode: "Copy Code",
        btnViewLog: "View Log",
        ragAddDocTitle: "Add Knowledge Document",
        appEditLabelName: "Application Name *",
        artifactBtnRollback: "Restore",
        appLibExportBtn: "Backup Library",
        ragBtnDownloadTitle: "Download Markdown (.md) file",
        artifactSaveToLib: "Save to Library",
        appEditBtnSave: "Save Application",
        guideTabQuick: "🚀 Quick Start",
        artifactSave: "Save Changes",
        appEditDescPlaceholder: "Brief description of features & usage...",
        ragModalTitle: "RAG Knowledge Base Manager",
        appEditNamePlaceholder: "e.g. Pomodoro Timer, SQL Formatter...",
        appLibCatWeb: "Web App (HTML / Web)",
        tokentableQuickFill: "Quick Fill TokenTable Endpoint & Models",
        artifactContinue: "Continue",
        ragBtnExportPack: "Export Pack",
        appLibFooterHint: "Click 'Save to Library' inside Artifact Workbench to bookmark any LLM creation",
        appLibBtnNew: "+ New App",
        fourModesTitle: "Five Inference Modes (1+1 > 2)",
        superviseCardTitle: "🛡️ Dual Cross-Review Mode",
        appEditBtnSampleCode: "Fill Sample Code",
        drawerHistoryBannerText: "You are viewing a historical version (read-only preview). To restore this version, click 'Restore Version' on the right.",
        serialLogBtnDownload: "Download Log (.txt)",
        ragTotalChunksInit: "0 chunks",
        artifactRequestContinue: "Request LLM to Continue File",
        artifactDeviceDesktopTitle: "Desktop Full Width (100%)",
        appLibCountInit: "0 apps",
        artifactExit: "Exit",
        btnMcpManager: "MCP Tools",
        artifactDownloadFullFile: "Download Complete File",
        artifactEditorPlaceholder: "Edit code directly here...",
        btnAppLibrary: "App Library",
        appLibDeleteModalDesc: "You are about to delete the following application. This action cannot be undone:",
        drawerDiffAddedZero: "+0 lines",
        superviseCardDesc: "If either engine gets stuck, returns empty, or contains obvious code defects, the other engine automatically steps in to review, point out blind spots, and propose a corrected fix. When both sides agree the information is insufficient, they explicitly ask the user for the next missing data points instead of spinning idle.",
        tooltipTokenTableTopbar: "Apply for TokenTable API Key (Base URL: https://tokentable.asia/v1)",
        artifactPartsInit: "Joined 2 parts",
        tooltipRestoreVersion: "Rollback to the selected historical version",
        ragBtnDownload: "Download .md",
        artifactPreview: "Preview",
        appLibModalSubtitle: "Manage and launch standalone tools, automation scripts, and custom agents with Sandbox preview and LLM invocation",
        appLibCatAll: "All Apps",
        btnSpeech: "Voice",
        appEditLabelCategory: "Category *",
        serialLogBtnCopy: "Copy All",
        tooltipSpeechInput: "Speech-to-Text Input",
        ragSavedToLabel: "Saved:",
        ragBtnReveal: "Folder",
        artifactDrawerActions: "Actions",
        appLibConfirmDeleteBtn: "Confirm Delete",
        guideTabArtifact: "📦 Artifact Workbench",
        tooltipOpenRag: "Open RAG Knowledge Base Manager",
        serialAutoScroll: "AutoScroll: ON",
        tooltipCreateVersion: "Save current content as a new version snapshot",
        ragTestSearchTitle: "RAG Real-time Search Test",
        artifactReadonly: "Read-only",
        appLibCatPrompt: "Prompt Agent",
        guideTabTerm: "📟 Terminal Protocols",
        artifactDiffBase: "Compare with:",
        savedStatus: "Saved",
        artifactLatestVer: "v1 (Latest)",
        guideTabFaq: "🛠️ FAQ & Diagnostics",
        artifactDrawerTitle: "Artifact Workbench",
        artifactCopyAllCode: "Copy Complete Code",
        btnContinueStream: "▶ Continue Writing",
        artifactSplit: "Split",
        appLibCatData: "Data / JSON",
        drawerRestoreVerBtn: "Restore Version",
        appEditLabelDesc: "Description",
        ragAddBtn: "Add & Index",
        appLibEmptyDesc: "Click '+ New App' above to build from scratch, or load sample templates below!",
        artifactOpenNewTab: "Open in New Tab",
        tooltipOpenArtifact: "Open Artifact Workbench & Sandbox",
        drawerDiffRemovedZero: "-0 lines",
        ragBtnRevealTitle: "Select and reveal file in File Explorer",
        tooltipVersionDiff: "Inspect line-by-line changes against previous version",
        appEditBtnPreview: "Preview in Sandbox",
        modalClose: "Close",
        artifactRevert: "Revert",
        appEditCodeStatsInit: "0 lines · 0 chars",
        appEditLabelId: "Identifier (ID) *",
        appLibLoadSamplesBtn: "⚡ Load Sample Templates",
        guideTabAi: "🤖 AI Agent, RAG & MCP",
        artifactLivePreview: "Live Preview",
        tooltipImportRagPack: "Import Topic Knowledge Pack (.ragpack / JSON)",
        appLibModalTitle: "Custom App Library",
        appEditLabelIcon: "Icon / Emoji",
        modalCancel: "Cancel",
        artifactEdit: "Edit",
        appLibEmptyTitle: "No Custom Apps Yet",
        tooltipVersionSelect: "Switch and inspect version history",
        tooltipOpenAppLib: "Open Custom App Library",
        artifactDeviceTabletTitle: "Tablet (768px)",
        tooltipSaveToAppLib: "Save this Artifact into your personal App Library",
        btnRagManager: "RAG Base",
        serialLogModalDesc: "Captures and preserves all stream characters without terminal line limits",
        artifactDiffTitle: "Version Line Diff",
        appLibCatPy: "Python Script",
        tooltipExportApps: "Export all custom apps to a JSON backup",
        tokenTableTopbarBtn: "Get API Key",
        mcpActiveToolsTitle: "Active MCP Tools",
        guideTabOffline: "🔒 Offline & WinPE",
        serialLogBtnClear: "Clear Log",
        serialLogModalTitle: "Web Serial Complete Session Log",
        drawerCodeStatsInit: "0 lines · 0 chars",
        appLibSearchPlaceholder: "Search app title, description or keyword...",
        guideModalTitle: "Dual-Engine AI Console · Operation & Troubleshooting Guide",
        fourModesTitle: "Four Inference Modes (1+1>2)",
        guideTabQuick: "🚀 Quick Start",
        guideTabArtifact: "📦 Artifact Workbench",
        guideTabJev: "⚡ Jev Decision Engine",
        guideTabTerm: "📟 Terminal Protocols",
        guideTabFaq: "🛠️ Troubleshooting FAQ",
        guideTabAbout: "⚖️ License & Credits",
        superviseCardTitle: "Layered Control (Supervisor Mode)",
        superviseCardDesc: "When enabled, all AI commands require human confirmation before execution — ideal for high-risk operations",
        artifactDiff: "Diff"    }
};

class WebcomAIApp {
    constructor() {
        this.currentLang = this.storageGet('webcom_language', 'zh-TW');
        this.tabConfigs = [
            { id: 'tab-shell', session: 'shell', prompt: 'PS>', status: 'PowerShell / Shell WASM', statusEn: 'PowerShell / Shell WASM' },
            { id: 'tab-wsl', session: 'wsl', prompt: 'wsl$', status: 'WSL2 Linux 容器代理', statusEn: 'WSL2 Linux Container Proxy' },
            { id: 'tab-py', session: 'py', prompt: '>>>', status: 'Pyodide WASM (Python 3.11)', statusEn: 'Pyodide WASM (Python 3.11)' },
            { id: 'tab-serial', session: 'serial', prompt: 'COM>', status: 'Web Serial API (115200 8N1)', statusEn: 'Web Serial API (115200 8N1)' },
            { id: 'tab-novnc', session: 'novnc', prompt: 'vnc>', status: 'noVNC RFB 遠端桌面 (5900)', statusEn: 'noVNC RFB Remote Desktop (5900)' }
        ];

        this.dispatcher = new ToolDispatcher({
            daemonUrl: 'http://127.0.0.1:8001',
            lang: this.currentLang,
            onLog: (msg, ...args) => {
                const prefix = (this.currentLang === 'zh-TW') ? '[工具派發器]' : '[Dispatcher]';
                let cleanMsg = typeof msg === 'string' ? msg.replace(/^\[(HermesToolDispatcher|Dispatcher)\]\s*/, '') : msg;
                this.logTerminal(`${prefix} ${cleanMsg}`, ...args);
            }
        });

        this.daemonOnline = false;
        this.currentSession = 'shell';
        this.activeEngine = this.storageGet('webcom_engine', 'api');
        this.activeWebgpuModel = this.storageGet('webcom_webgpu_model', 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC');
        this.activeOnnxModel = this.storageGet('webcom_onnx_model', 'onnx-community/Qwen2.5-0.5B-Instruct');
        this.activeToolset = 'full_stack';
        this.isLeftCollapsed = false;
        this.isOfflineMock = false;

        // Feature Toggles State (Agent, Web, RAG, MCP)
        this.flags = {
            agent: this.storageGet('webcom_flag_agent', 'true') === 'true',
            web: this.storageGet('webcom_flag_web', 'false') === 'true',
            rag: this.storageGet('webcom_flag_rag', 'false') === 'true',
            mcp: this.storageGet('webcom_flag_mcp', 'false') === 'true'
        };

        // Default API Profiles
        this.defaultProfiles = {
            'local': {
                id: 'local',
                name: 'Local LM Studio',
                endpoint: 'http://127.0.0.1:1234/v1',
                apiKey: 'lm-studio',
                model: 'auto'
            },
            'tokentable': {
                id: 'tokentable',
                name: 'TokenTable (推薦)',
                endpoint: 'https://tokentable.asia/v1',
                apiKey: '',
                model: 'qwen3.8-flash'
            },
            'openai': {
                id: 'openai',
                name: 'OpenAI (API)',
                endpoint: 'https://api.openai.com/v1',
                apiKey: '',
                model: 'gpt-4o'
            },
            'ollama': {
                id: 'ollama',
                name: 'Ollama (Local)',
                endpoint: 'http://127.0.0.1:11434/v1',
                apiKey: 'ollama',
                model: 'llama3.2'
            }
        };

        this.profiles = this.storageGetJSON('webcom_profiles', this.defaultProfiles);
        this.activeProfileId = this.storageGet('webcom_active_profile', 'local');
        if (!this.profiles[this.activeProfileId]) {
            this.activeProfileId = Object.keys(this.profiles)[0] || 'local';
        }

        this.init();
    }

    storageGet(key, def) {
        try { return localStorage.getItem(key) || def; } catch (e) { return def; }
    }
    storageSet(key, val) {
        try { localStorage.setItem(key, val); } catch (e) {}
    }
    storageGetJSON(key, def) {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : def;
        } catch (e) { return def; }
    }
    storageSetJSON(key, val) {
        try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
    }

    async init() {
        this.bindEvents();
        this.bindFeatureToggles();
        this.bindPromptChips();
        this.setupSlashMenu();
        this.renderProfileSelects();
        this.updateEngineUI(this.activeEngine);
        this.setLanguage(this.currentLang);
        await this.dispatcher.init('hermes_tools.js');
        await this.probeDaemon();
        // Fast retries to connect immediately when daemon finishes startup
        setTimeout(() => { if (!this.daemonOnline) this.probeDaemon(); }, 800);
        setTimeout(() => { if (!this.daemonOnline) this.probeDaemon(); }, 2000);
        setTimeout(() => { if (!this.daemonOnline) this.probeDaemon(); }, 4000);
        setInterval(() => this.probeDaemon(), 10000);
        this.logTerminal(this.currentLang === 'zh-TW' 
            ? "✔ Webcom 控制台各按鈕、API 設定與雙語系環境已就緒。" 
            : "✔ Webcom AI controls, API settings, and bilingual environment are ready.");
        if (window.lucide) lucide.createIcons();
    }

    setLanguage(lang) {
        this.currentLang = lang;
        this.storageSet('webcom_language', lang);
        if (this.dispatcher) this.dispatcher.lang = lang;

        const dict = TRANSLATIONS[lang] || TRANSLATIONS["zh-TW"];

        // Translate text content & select options
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (dict[key]) {
                if (el.tagName === 'OPTION') {
                    el.text = dict[key];
                } else {
                    el.innerHTML = dict[key];
                }
            }
        });

        // Translate placeholders
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            if (dict[key]) el.setAttribute('placeholder', dict[key]);
        });

        // Translate titles / tooltips
        document.querySelectorAll('[data-i18n-title]').forEach(el => {
            const key = el.getAttribute('data-i18n-title');
            if (dict[key]) el.setAttribute('title', dict[key]);
        });

        // Update active terminal tab status text
        const statusText = document.getElementById('term-status-text');
        if (statusText && this.tabConfigs) {
            const curCfg = this.tabConfigs.find(c => c.session === this.currentSession);
            if (curCfg) {
                statusText.innerText = (lang === 'zh-TW') ? curCfg.status : (curCfg.statusEn || curCfg.status);
            }
        }

        // Update Prompt Chips data-prompt
        const chipFib = document.querySelector('.btn-prompt-chip:has([data-i18n="promptChipFibonacci"])') || document.querySelectorAll('.btn-prompt-chip')[0];
        const chipWeather = document.querySelector('.btn-prompt-chip:has([data-i18n="promptChipWeather"])') || document.querySelectorAll('.btn-prompt-chip')[1];
        const chipGpu = document.querySelector('.btn-prompt-chip:has([data-i18n="promptChipGpu"])') || document.querySelectorAll('.btn-prompt-chip')[2];
        const chipSync = document.querySelector('.btn-prompt-chip:has([data-i18n="promptChipSync"])') || document.querySelectorAll('.btn-prompt-chip')[3];
        if (chipFib && dict.promptChipFibonacciQuery) chipFib.setAttribute('data-prompt', dict.promptChipFibonacciQuery);
        if (chipWeather && dict.promptChipWeatherQuery) chipWeather.setAttribute('data-prompt', dict.promptChipWeatherQuery);
        if (chipGpu && dict.promptChipGpuQuery) chipGpu.setAttribute('data-prompt', dict.promptChipGpuQuery);
        if (chipSync && dict.promptChipSyncQuery) chipSync.setAttribute('data-prompt', dict.promptChipSyncQuery);

        // Update any existing copy / retry buttons
        document.querySelectorAll('.btn-copy-msg .copy-label').forEach(el => el.innerText = dict.copyBtn || '複製');
        document.querySelectorAll('.btn-retry-msg .retry-label').forEach(el => el.innerText = dict.retryBtn || '重試');

        // Update Daemon Badge text according to daemon status & new language
        const badge = document.getElementById('daemon-badge');
        if (badge) {
            if (this.daemonOnline) {
                badge.innerHTML = `
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    <span class="text-emerald-400 font-medium">${dict.daemonOnline || 'Daemon 8001 (Online)'}</span>
                `;
            } else {
                badge.innerHTML = `
                    <span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                    <span class="text-amber-300">${dict.daemonOffline || 'Pure WASM Sandbox (Offline)'}</span>
                `;
            }
        }

        // Sync dropdown
        const langSelect = document.getElementById('lang-select');
        if (langSelect && langSelect.value !== lang) {
            langSelect.value = lang;
        }

        this.updateTierIndicator();
        if (window.lucide) lucide.createIcons();
    }

    renderProfileSelects() {
        // Main bar select
        const mainSel = document.getElementById('main-profile-select');
        const modalSel = document.getElementById('modal-profile-select');

        if (mainSel) {
            mainSel.innerHTML = '';
            Object.values(this.profiles).forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.id;
                opt.className = 'bg-darkCard text-white';
                opt.innerText = p.name;
                mainSel.appendChild(opt);
            });
            mainSel.value = this.activeProfileId;
        }

        if (modalSel) {
            modalSel.innerHTML = '';
            Object.values(this.profiles).forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.id;
                opt.className = 'bg-darkCard text-white';
                opt.innerText = `${p.name} (${p.endpoint})`;
                modalSel.appendChild(opt);
            });
            modalSel.value = this.activeProfileId;
        }

        this.loadProfileIntoForm(this.activeProfileId);
    }

    loadProfileIntoForm(profileId) {
        const p = this.profiles[profileId];
        if (!p) return;
        const nameIn = document.getElementById('cfg-prof-name');
        const endIn = document.getElementById('cfg-prof-endpoint');
        const keyIn = document.getElementById('cfg-prof-key');
        const modIn = document.getElementById('cfg-prof-model');
        const statusEl = document.getElementById('test-conn-status');

        if (nameIn) nameIn.value = p.name || '';
        if (endIn) endIn.value = p.endpoint || '';
        if (keyIn) keyIn.value = p.apiKey || '';
        if (modIn) modIn.value = p.model || 'auto';
        if (statusEl) statusEl.innerHTML = '';
    }

    bindEvents() {
        // 1. Language Select
        const langSelect = document.getElementById('lang-select');
        if (langSelect) {
            langSelect.addEventListener('change', (e) => this.setLanguage(e.target.value));
        }

        // 2. Panel Collapse & Snap Layout
        const btnCollapse = document.getElementById('btn-collapse-left');
        if (btnCollapse) {
            btnCollapse.addEventListener('click', () => {
                this.isLeftCollapsed = !this.isLeftCollapsed;
                document.body.classList.toggle('panel-collapsed-left', this.isLeftCollapsed);
            });
        }

        const btnSnap = document.getElementById('btn-snap-23');
        if (btnSnap) {
            btnSnap.addEventListener('click', () => {
                const left = document.getElementById('left-pane');
                const right = document.getElementById('right-pane');
                if (left && right) {
                    if (left.style.width === '33%') {
                        left.style.width = '50%';
                        right.style.width = '50%';
                        this.logTerminal("[版面] 已重設為 1:1 對等雙欄佈局。");
                    } else {
                        left.style.width = '33%';
                        right.style.width = '67%';
                        this.logTerminal("[版面] 已套用 2/3 AI 寬螢幕展開佈局。");
                    }
                }
            });
        }

        // 3. API Settings Modal
        const btnOpenSettings = document.getElementById('btn-open-settings');
        const btnCloseSettings = document.getElementById('btn-close-settings');
        const settingsModal = document.getElementById('settings-modal');
        if (btnOpenSettings && settingsModal) {
            btnOpenSettings.addEventListener('click', () => {
                this.renderProfileSelects();
                settingsModal.classList.remove('hidden');
                settingsModal.classList.add('flex');
            });
        }
        if (btnCloseSettings && settingsModal) {
            btnCloseSettings.addEventListener('click', () => {
                settingsModal.classList.add('hidden');
                settingsModal.classList.remove('flex');
            });
        }

        // Main Profile Select change
        const mainProfSel = document.getElementById('main-profile-select');
        if (mainProfSel) {
            mainProfSel.addEventListener('change', (e) => {
                this.activeProfileId = e.target.value;
                this.storageSet('webcom_active_profile', this.activeProfileId);
                const p = this.profiles[this.activeProfileId];
                this.logTerminal(`[API 切換] 已選擇節點: ${p ? p.name : this.activeProfileId}`);
            });
        }

        // Modal Profile Select change
        const modalProfSel = document.getElementById('modal-profile-select');
        if (modalProfSel) {
            modalProfSel.addEventListener('change', (e) => {
                this.loadProfileIntoForm(e.target.value);
            });
        }

        // Quick Preset Buttons in Settings
        document.querySelectorAll('.btn-preset-profile').forEach(btn => {
            btn.addEventListener('click', () => {
                const preset = btn.getAttribute('data-preset');
                if (this.defaultProfiles[preset]) {
                    const p = this.defaultProfiles[preset];
                    document.getElementById('cfg-prof-name').value = p.name;
                    document.getElementById('cfg-prof-endpoint').value = p.endpoint;
                    document.getElementById('cfg-prof-key').value = p.apiKey;
                    document.getElementById('cfg-prof-model').value = p.model;
                }
            });
        });

        // Test Connection Button
        const btnTestConn = document.getElementById('btn-test-conn');
        if (btnTestConn) {
            btnTestConn.addEventListener('click', () => this.testActiveConnection());
        }

        // Add Profile Button
        const btnAddProf = document.getElementById('btn-add-profile');
        if (btnAddProf) {
            btnAddProf.addEventListener('click', () => {
                const newId = 'custom_' + Date.now();
                this.profiles[newId] = {
                    id: newId,
                    name: 'New API Node',
                    endpoint: 'https://api.openai.com/v1',
                    apiKey: '',
                    model: 'gpt-4o'
                };
                this.activeProfileId = newId;
                this.renderProfileSelects();
            });
        }

        // Delete Profile Button
        const btnDelProf = document.getElementById('btn-del-profile');
        if (btnDelProf) {
            btnDelProf.addEventListener('click', () => {
                const modalSel = document.getElementById('modal-profile-select');
                const idToDelete = modalSel ? modalSel.value : this.activeProfileId;
                if (Object.keys(this.profiles).length <= 1) {
                    alert("至少需保留一個節點！");
                    return;
                }
                delete this.profiles[idToDelete];
                this.activeProfileId = Object.keys(this.profiles)[0];
                this.renderProfileSelects();
            });
        }

        // Save Settings Button
        const btnSaveSettings = document.getElementById('btn-save-settings');
        if (btnSaveSettings) {
            btnSaveSettings.addEventListener('click', () => {
                const modalSel = document.getElementById('modal-profile-select');
                const curId = modalSel ? modalSel.value : this.activeProfileId;
                if (this.profiles[curId]) {
                    this.profiles[curId].name = document.getElementById('cfg-prof-name').value;
                    this.profiles[curId].endpoint = document.getElementById('cfg-prof-endpoint').value;
                    this.profiles[curId].apiKey = document.getElementById('cfg-prof-key').value;
                    this.profiles[curId].model = document.getElementById('cfg-prof-model').value;
                }
                this.activeProfileId = curId;
                this.storageSetJSON('webcom_profiles', this.profiles);
                this.storageSet('webcom_active_profile', this.activeProfileId);
                this.renderProfileSelects();
                settingsModal.classList.add('hidden');
                settingsModal.classList.remove('flex');
                this.logTerminal(`[設定儲存] 成功套用節點: ${this.profiles[curId]?.name}`);
            });
        }

        // Export Settings
        const btnExportSettings = document.getElementById('btn-export-settings');
        if (btnExportSettings) {
            btnExportSettings.addEventListener('click', () => {
                const data = JSON.stringify({
                    profiles: this.profiles,
                    active: this.activeProfileId,
                    customPrompt: document.getElementById('cfg-custom-prompt')?.value || ''
                }, null, 2);
                const blob = new Blob([data], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `webcom_settings_${new Date().toISOString().slice(0, 10)}.json`;
                a.click();
            });
        }

        // Import Settings
        const btnImportSettings = document.getElementById('btn-import-settings');
        const fileImportSettings = document.getElementById('file-import-settings');
        if (btnImportSettings && fileImportSettings) {
            btnImportSettings.addEventListener('click', () => fileImportSettings.click());
            fileImportSettings.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (evt) => {
                    try {
                        const parsed = JSON.parse(evt.target.result);
                        if (parsed.profiles) {
                            this.profiles = parsed.profiles;
                            if (parsed.active) this.activeProfileId = parsed.active;
                            this.storageSetJSON('webcom_profiles', this.profiles);
                            this.renderProfileSelects();
                            alert("設定匯入成功！");
                        }
                    } catch (err) { alert("無效的 JSON 設定檔"); }
                };
                reader.readAsText(file);
            });
        }

        // 4. Top Tools Menu Dropdown
        const btnTopTools = document.getElementById('btn-top-tools-menu');
        const dropTopTools = document.getElementById('dropdown-top-tools');
        if (btnTopTools && dropTopTools) {
            btnTopTools.addEventListener('click', (e) => {
                e.stopPropagation();
                dropTopTools.classList.toggle('hidden');
            });
            document.addEventListener('click', () => dropTopTools.classList.add('hidden'));
        }

        // Offline Mock Toggle
        const btnOfflineMock = document.getElementById('btn-toggle-offline-mock');
        if (btnOfflineMock) {
            btnOfflineMock.addEventListener('click', () => {
                this.isOfflineMock = !this.isOfflineMock;
                const label = document.getElementById('label-offline-mock');
                if (label) {
                    label.innerText = this.isOfflineMock
                        ? "外網狀態: 純斷網模擬 (嚴格本地)"
                        : "外網狀態: 連通 (點擊切換離線模擬)";
                }
                this.logTerminal(`[外網開關] 斷網模擬狀態: ${this.isOfflineMock ? '開啟 (模擬純本地離線)' : '關閉 (允許外網連線)'}`);
            });
        }

        // Download Standalone HTML Button
        const btnDownloadStandalone = document.getElementById('btn-download-standalone');
        if (btnDownloadStandalone) {
            btnDownloadStandalone.addEventListener('click', () => {
                const a = document.createElement('a');
                a.href = 'index.html';
                a.download = 'webcom_standalone.html';
                a.click();
            });
        }

        // Jev Sandbox Button
        const btnOpenJev = document.getElementById('btn-open-jev');
        if (btnOpenJev) {
            btnOpenJev.addEventListener('click', () => this.showJevModal());
        }

        // 5. Terminal Tabs
        this.tabConfigs.forEach(cfg => {
            const btn = document.getElementById(cfg.id);
            if (btn) btn.addEventListener('click', () => this.switchTerminalTab(cfg));
        });

        // 6. Terminal Send & Clear
        const btnTermSend = document.getElementById('btn-term-send');
        const termInput = document.getElementById('term-input');
        if (btnTermSend && termInput) {
            btnTermSend.addEventListener('click', () => this.handleSendTerminal());
            termInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.handleSendTerminal();
                }
            });
        }

        const btnTermClear = document.getElementById('btn-term-clear');
        if (btnTermClear) {
            btnTermClear.addEventListener('click', () => this.clearTerminal());
        }

        // 7. Center Selectors & Engine Switcher
        const engineSelect = document.getElementById('engine-select');
        if (engineSelect) {
            engineSelect.addEventListener('change', (e) => {
                const engine = e.target.value;
                this.storageSet('webcom_engine', engine);
                this.updateEngineUI(engine);
                this.logTerminal(`[引擎切換] 推論引擎已設為: ${e.target.options[e.target.selectedIndex].text}`);
            });
        }

        const webgpuModelSelect = document.getElementById('webgpu-model-select');
        if (webgpuModelSelect) {
            webgpuModelSelect.addEventListener('change', (e) => {
                this.activeWebgpuModel = e.target.value;
                this.storageSet('webcom_webgpu_model', this.activeWebgpuModel);
                this.logTerminal(`[WebGPU 模型] 已選擇模型: ${e.target.options[e.target.selectedIndex].text}`);
            });
        }

        const onnxModelSelect = document.getElementById('onnx-model-select');
        if (onnxModelSelect) {
            onnxModelSelect.addEventListener('change', (e) => {
                this.activeOnnxModel = e.target.value;
                this.storageSet('webcom_onnx_model', this.activeOnnxModel);
                this.logTerminal(`[ONNX 模型] 已選擇模型: ${e.target.options[e.target.selectedIndex].text}`);
            });
        }

        const toolsetSelect = document.getElementById('toolset-select');
        if (toolsetSelect) {
            toolsetSelect.addEventListener('change', (e) => {
                this.activeToolset = e.target.value;
                this.logTerminal(`[工具集切換] 工具子集已載入: ${e.target.options[e.target.selectedIndex].text}`);
            });
        }

        // 8. Chat Send & Input & Clear
        const btnChatSend = document.getElementById('btn-send-chat');
        const chatInput = document.getElementById('chat-input');
        if (btnChatSend && chatInput) {
            btnChatSend.addEventListener('click', () => this.handleSendMessage());
            chatInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.handleSendMessage();
                }
            });
        }

        const btnClearChat = document.getElementById('btn-clear-chat');
        if (btnClearChat) {
            btnClearChat.addEventListener('click', () => this.clearChat());
        }

        // Chat Export & Import
        const btnExportChat = document.getElementById('btn-export-chat');
        if (btnExportChat) {
            btnExportChat.addEventListener('click', () => {
                const logs = document.getElementById('chat-container')?.innerHTML || '';
                const blob = new Blob([JSON.stringify({ date: new Date().toISOString(), html: logs }, null, 2)], { type: 'application/json' });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = `webcom_chat_${new Date().toISOString().slice(0, 10)}.json`;
                a.click();
            });
        }

        const btnImportChat = document.getElementById('btn-import-chat');
        const fileImportChat = document.getElementById('file-import-chat');
        if (btnImportChat && fileImportChat) {
            btnImportChat.addEventListener('click', () => fileImportChat.click());
            fileImportChat.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const r = new FileReader();
                r.onload = (evt) => {
                    try {
                        const parsed = JSON.parse(evt.target.result);
                        if (parsed.html) {
                            document.getElementById('chat-container').innerHTML = parsed.html;
                            alert("對話紀錄已成功載入！");
                        }
                    } catch (err) { alert("無效的對話 JSON 檔案"); }
                };
                r.readAsText(file);
            });
        }

        // Quick Slash Command Button (/)
        const btnQuickSlash = document.getElementById('btn-quick-slash');
        if (btnQuickSlash) {
            btnQuickSlash.addEventListener('click', () => {
                const input = document.getElementById('chat-input');
                if (input) {
                    input.value = '/';
                    input.focus();
                    input.dispatchEvent(new Event('input'));
                }
            });
        }

        // Greeting Copy Button
        const btnCopyGreeting = document.getElementById('btn-copy-greeting');
        if (btnCopyGreeting) {
            btnCopyGreeting.addEventListener('click', () => {
                const bubble = document.getElementById('greeting-bubble');
                if (bubble) this.copyToClipboard(bubble.innerText, btnCopyGreeting);
            });
        }

        // Image & Document File Upload Attachments
        const fileUploadImg = document.getElementById('file-upload-image');
        if (fileUploadImg) {
            fileUploadImg.addEventListener('change', (e) => {
                const f = e.target.files[0];
                if (f) {
                    this.logTerminal(`[圖片附加] 已載入視覺檔案: ${f.name} (${Math.round(f.size/1024)} KB)`);
                    const input = document.getElementById('chat-input');
                    if (input) {
                        input.value = `請分析此圖片/截圖內容：「${f.name}」`;
                        input.focus();
                    }
                }
            });
        }

        const fileUploadDoc = document.getElementById('file-upload-doc');
        if (fileUploadDoc) {
            fileUploadDoc.addEventListener('change', (e) => {
                const f = e.target.files[0];
                if (f) {
                    this.logTerminal(`[文件附加] 已選取檔案: ${f.name} (${Math.round(f.size/1024)} KB)，正在調用 MarkItDown 轉檔...`);
                    const input = document.getElementById('chat-input');
                    if (input) {
                        input.value = `請使用 Microsoft MarkItDown 解析並總結此文件：「${f.name}」`;
                        input.focus();
                    }
                }
            });
        }

        // 9. Upstream Sync & Diagnostics Modal
        const btnSync = document.getElementById('btn-sync');
        if (btnSync) btnSync.addEventListener('click', () => this.showSyncModal());

        const btnDiag = document.getElementById('btn-diag');
        if (btnDiag) btnDiag.addEventListener('click', () => this.showDiagModal());

        const daemonBadge = document.getElementById('daemon-badge');
        if (daemonBadge) {
            daemonBadge.addEventListener('click', () => {
                this.logTerminal("[探測] 正在手動重新探測 Host Daemon (Port 8001)...");
                this.probeDaemon();
            });
        }

        // 10. Generic Modal Close Handlers
        const btnClose = document.getElementById('btn-close-modal');
        const btnCancel = document.getElementById('btn-modal-cancel');
        const backdrop = document.getElementById('modal-backdrop');
        [btnClose, btnCancel].forEach(b => {
            if (b) b.addEventListener('click', () => this.closeModal());
        });

        if (backdrop) {
            backdrop.addEventListener('click', (e) => {
                if (e.target === backdrop) this.closeModal();
            });
        }

        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
                if (settingsModal) {
                    settingsModal.classList.add('hidden');
                    settingsModal.classList.remove('flex');
                }
            }
        });
    }

    async testActiveConnection() {
        const statusEl = document.getElementById('test-conn-status');
        const endpoint = document.getElementById('cfg-prof-endpoint')?.value?.trim();
        const apiKey = document.getElementById('cfg-prof-key')?.value?.trim();

        if (!endpoint) {
            if (statusEl) statusEl.innerHTML = '<span class="text-red-400">請先輸入 API Endpoint</span>';
            return;
        }

        if (statusEl) statusEl.innerHTML = '<span class="text-purple-400 animate-pulse">正在連線測試...</span>';

        const testUrl = endpoint.replace(/\/+$/, '') + '/models';
        const headers = { 'Content-Type': 'application/json' };
        if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

        try {
            const resp = await fetch(testUrl, { method: 'GET', headers });
            if (resp.ok) {
                const data = await resp.json();
                const modelCount = (data.data && Array.isArray(data.data)) ? data.data.length : 'OK';
                if (statusEl) {
                    statusEl.innerHTML = `<span class="text-emerald-400 font-bold">🟢 連線成功！(${resp.status}) 偵測到模型數: ${modelCount}</span>`;
                }
            } else {
                if (statusEl) {
                    statusEl.innerHTML = `<span class="text-amber-400">⚠️ 伺服器回應 ${resp.status}: ${resp.statusText}</span>`;
                }
            }
        } catch (e) {
            if (statusEl) {
                statusEl.innerHTML = `<span class="text-red-400">🔴 連線失敗: ${e.message} (請確認本機伺服器已啟動並開啟 CORS)</span>`;
            }
        }
    }

    closeModal() {
        const backdrop = document.getElementById('modal-backdrop');
        if (backdrop) {
            backdrop.classList.add('hidden');
            backdrop.classList.remove('flex');
        }
    }

    updateEngineUI(engine) {
        this.activeEngine = engine || 'api';
        const wrapProfile = document.getElementById('wrapper-profile-select');
        const wrapWebgpu = document.getElementById('wrapper-webgpu-select');
        const wrapOnnx = document.getElementById('wrapper-onnx-select');

        // Hide all model selectors first
        if (wrapProfile) wrapProfile.classList.add('hidden');
        if (wrapWebgpu) wrapWebgpu.classList.add('hidden');
        if (wrapOnnx) wrapOnnx.classList.add('hidden');

        // Display active selector(s) based on engine mode
        if (this.activeEngine === 'api') {
            if (wrapProfile) wrapProfile.classList.remove('hidden');
        } else if (this.activeEngine === 'webgpu') {
            if (wrapWebgpu) wrapWebgpu.classList.remove('hidden');
        } else if (this.activeEngine === 'onnx') {
            if (wrapOnnx) wrapOnnx.classList.remove('hidden');
        } else if (this.activeEngine === 'cothink') {
            // Dual engine: WebGPU (Local) + API (Remote)
            if (wrapWebgpu) wrapWebgpu.classList.remove('hidden');
            if (wrapProfile) wrapProfile.classList.remove('hidden');
        } else if (this.activeEngine === 'supervise') {
            // Dual engine: ONNX (Validator) + API (Generator)
            if (wrapOnnx) wrapOnnx.classList.remove('hidden');
            if (wrapProfile) wrapProfile.classList.remove('hidden');
        }

        // Synchronize dropdown controls if needed
        const engineSelect = document.getElementById('engine-select');
        if (engineSelect && engineSelect.value !== this.activeEngine) {
            engineSelect.value = this.activeEngine;
        }

        const webgpuSel = document.getElementById('webgpu-model-select');
        if (webgpuSel && this.activeWebgpuModel) {
            webgpuSel.value = this.activeWebgpuModel;
        }

        const onnxSel = document.getElementById('onnx-model-select');
        if (onnxSel && this.activeOnnxModel) {
            onnxSel.value = this.activeOnnxModel;
        }

        this.updateTierIndicator();
    }

    updateTierIndicator() {
        const ind = document.getElementById('current-tier-indicator');
        if (!ind) return;
        const labels = {
            'api': 'LM Studio REST (Tier 2/3)',
            'webgpu': 'WebGPU 本機瀏覽器原生 (Tier 1)',
            'onnx': 'ONNX WASM CPU/GPU (Tier 1)',
            'cothink': 'Co-Think 雙引擎聯考架構',
            'supervise': 'Supervise 4-Stage SRE 稽核'
        };
        ind.innerText = labels[this.activeEngine] || '自適應混合架構';
    }

    switchTerminalTab(cfg) {
        this.currentSession = cfg.session;

        const tabs = document.querySelectorAll('.term-tab');
        tabs.forEach(tab => {
            tab.className = "term-tab px-2.5 py-1 rounded text-xs hover:bg-darkBorder/50 text-slate-400 transition cursor-pointer";
        });
        const activeTab = document.getElementById(cfg.id);
        if (activeTab) {
            activeTab.className = "term-tab px-2.5 py-1 rounded text-xs bg-darkBorder text-sky-300 font-medium transition cursor-pointer";
        }

        const promptEl = document.getElementById('term-prompt-indicator');
        if (promptEl) promptEl.innerText = cfg.prompt;

        const isZh = this.currentLang !== 'en';
        const displayStatus = isZh ? cfg.status : (cfg.statusEn || cfg.status);
        const statusText = document.getElementById('term-status-text');
        if (statusText) statusText.innerText = displayStatus;

        this.logTerminal(isZh ? `[環境切換] 已切換至 ${displayStatus} 會話環境。` : `[Environment Switch] Switched to ${displayStatus} session.`);
    }

    clearTerminal() {
        const logs = document.getElementById('term-logs');
        if (logs) logs.innerHTML = '';
        this.logTerminal(this.currentLang === 'zh-TW' ? "終端機輸出記錄已清空。" : "Terminal output log cleared.");
    }

    bindFeatureToggles() {
        const toggleConfigs = [
            { id: 'toggle-agent', key: 'agent', name: 'Agent 自主調用', activeClass: 'bg-purple-900/70 text-purple-200 border-purple-500/60 hover:bg-purple-800' },
            { id: 'toggle-web', key: 'web', name: 'Web 聯網檢索', activeClass: 'bg-sky-900/70 text-sky-200 border-sky-500/60 hover:bg-sky-800' },
            { id: 'toggle-rag', key: 'rag', name: 'RAG 知識庫', activeClass: 'bg-emerald-900/70 text-emerald-200 border-emerald-500/60 hover:bg-emerald-800' },
            { id: 'toggle-mcp', key: 'mcp', name: 'MCP 協議', activeClass: 'bg-amber-900/70 text-amber-200 border-amber-500/60 hover:bg-amber-800' }
        ];

        const inactiveClass = 'bg-slate-800 text-slate-400 hover:text-slate-200 border-slate-700';

        toggleConfigs.forEach(cfg => {
            const btn = document.getElementById(cfg.id);
            if (!btn) return;

            const updateStyle = (isActive) => {
                btn.setAttribute('data-active', isActive ? 'true' : 'false');
                btn.className = `px-1.5 py-0.5 rounded font-medium transition cursor-pointer shrink-0 border ${isActive ? cfg.activeClass : inactiveClass}`;
            };

            // Initialize style from current flag
            updateStyle(this.flags[cfg.key]);

            btn.onclick = (e) => {
                e.stopPropagation();
                this.flags[cfg.key] = !this.flags[cfg.key];
                this.storageSet(`webcom_flag_${cfg.key}`, this.flags[cfg.key]);
                updateStyle(this.flags[cfg.key]);
                this.logTerminal(`[功能開關] ${cfg.name}: ${this.flags[cfg.key] ? '已開啟' : '已關閉'}`);
            };
        });
    }

    bindPromptChips() {
        document.querySelectorAll('.btn-prompt-chip').forEach(btn => {
            btn.onclick = (e) => {
                e.preventDefault();
                const prompt = btn.getAttribute('data-prompt');
                if (prompt) {
                    const input = document.getElementById('chat-input');
                    if (input) {
                        input.value = prompt;
                        this.handleSendMessage();
                    }
                }
            };
        });
    }

    clearChat() {
        const container = document.getElementById('chat-container');
        if (!container) return;
        const greeting = document.getElementById('greeting-bubble');
        if (greeting) {
            container.innerHTML = greeting.outerHTML;
            this.bindPromptChips();
            const btnCopyGreeting = document.getElementById('btn-copy-greeting');
            if (btnCopyGreeting) {
                btnCopyGreeting.addEventListener('click', () => {
                    const bubble = document.getElementById('greeting-bubble');
                    if (bubble) this.copyToClipboard(bubble.innerText, btnCopyGreeting);
                });
            }
            if (window.lucide) lucide.createIcons();
        } else {
            container.innerHTML = '<div class="text-xs text-slate-400 p-3 select-text">對話已重置。</div>';
        }
    }

    async probeDaemon() {
        const badge = document.getElementById('daemon-badge');
        const candidates = [];
        if (typeof window !== 'undefined' && window.location.protocol.startsWith('http') && window.location.port === '8001') {
            candidates.push(window.location.origin);
        }
        if (this.dispatcher && this.dispatcher.daemonUrl) {
            candidates.push(this.dispatcher.daemonUrl);
        }
        candidates.push('http://127.0.0.1:8001');
        candidates.push('http://localhost:8001');

        const uniqueCandidates = Array.from(new Set(candidates));
        let lastErr = null;

        for (const base of uniqueCandidates) {
            try {
                const ctrl = new AbortController();
                const timer = setTimeout(() => ctrl.abort(), 1800);
                const resp = await fetch(`${base}/api/status`, { method: 'GET', signal: ctrl.signal });
                clearTimeout(timer);
                if (resp.ok) {
                    this.daemonOnline = true;
                    this.activeDaemonUrl = base;
                    if (this.dispatcher) this.dispatcher.daemonUrl = base;
                    window.lastDaemonError = null;
                    if (badge) {
                        badge.innerHTML = `
                            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                            <span class="text-emerald-400 font-medium">${TRANSLATIONS[this.currentLang]?.daemonOnline || 'Daemon 8001 (連線)'}</span>
                        `;
                        badge.className = "text-[11px] px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-700/50 flex items-center space-x-1 cursor-pointer hover:border-emerald-500 transition select-none truncate";
                    }
                    return true;
                }
            } catch (e) {
                lastErr = e;
            }
        }

        this.daemonOnline = false;
        window.lastDaemonError = lastErr ? (lastErr.message || String(lastErr)) : '無法連線至 Port 8001';
        if (badge) {
            badge.innerHTML = `
                <span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                <span class="text-amber-300">${TRANSLATIONS[this.currentLang]?.daemonOffline || '純 WASM 沙盒 (離線)'}</span>
            `;
            badge.className = "text-[11px] px-2 py-0.5 rounded-full bg-amber-950/60 text-amber-300 border border-amber-700/50 flex items-center space-x-1 cursor-pointer hover:border-amber-500 transition select-none truncate";
        }
        return false;
    }

    logTerminal(text) {
        const logs = document.getElementById('term-logs');
        if (!logs) return;
        const line = document.createElement('div');
        line.className = 'text-slate-300 leading-relaxed font-mono';
        line.innerText = `[${new Date().toLocaleTimeString()}] ${text}`;
        logs.appendChild(line);
        const screen = document.getElementById('terminal-screen');
        if (screen) screen.scrollTop = screen.scrollHeight;
    }

    async handleSendTerminal() {
        const input = document.getElementById('term-input');
        if (!input || !input.value.trim()) return;
        const cmd = input.value.trim();
        input.value = '';

        const prompt = document.getElementById('term-prompt-indicator')?.innerText || '>';
        this.logTerminal(`${prompt} ${cmd}`);

        const isZh = this.currentLang !== 'en';
        if (this.currentSession === 'py' || cmd.startsWith('python ') || cmd.startsWith('py ')) {
            const code = cmd.replace(/^py(thon)?\s+/, '');
            const res = await this.dispatcher.dispatch('run_python', { code });
            this.logTerminal(isZh ? `[Python 輸出] ${res.output || JSON.stringify(res)}` : `[Python Output] ${res.output || JSON.stringify(res)}`);
        } else if (this.currentSession === 'serial') {
            this.logTerminal(isZh ? `[Web Serial TX] -> "${cmd}" (模擬序列埠發送, Baud: 115200)` : `[Web Serial TX] -> "${cmd}" (Simulated serial send, Baud: 115200)`);
            this.logTerminal(`[Web Serial RX] <- "ACK: ${cmd}"`);
        } else if (this.currentSession === 'novnc') {
            this.logTerminal(isZh ? `[noVNC RFB] 遠端輸入事件已轉發至 DISPLAY :0: "${cmd}"` : `[noVNC RFB] Remote input forwarded to DISPLAY :0: "${cmd}"`);
        } else if (this.currentSession === 'wsl') {
            if (this.daemonOnline) {
                const res = await this.dispatcher.dispatch('terminal', { command: `wsl -e ${cmd}` });
                if (res.stdout) this.logTerminal(res.stdout);
                if (res.stderr) this.logTerminal(`[wsl stderr] ${res.stderr}`);
            } else {
                this.logTerminal(isZh ? `[WSL WASM 模擬] user@webcom-wsl:~$ ${cmd}` : `[WSL WASM Emulation] user@webcom-wsl:~$ ${cmd}`);
            }
        } else {
            if (this.daemonOnline) {
                const res = await this.dispatcher.dispatch('terminal', { command: cmd });
                if (res.stdout) {
                    this.logTerminal(res.stdout);
                } else if (res.output) {
                    this.logTerminal(res.output);
                } else if (!res.stderr && res.status === 'success') {
                    this.logTerminal(isZh ? '(命令已執行完成，無輸出內容)' : '(Command executed successfully with no output)');
                }
                if (res.stderr) this.logTerminal(`[stderr] ${res.stderr}`);
                if (res.message) this.logTerminal(res.message);
                if (res.error) this.logTerminal(`[error] ${res.error}`);
            } else {
                this.logTerminal(isZh ? `[本機命令回應] "${cmd}" (純 WASM 離線模式)` : `[Local Command Response] "${cmd}" (Pure WASM Offline Mode)`);
            }
        }
    }

    async sendPyodideCode(code, title = '') {
        const tabPy = { id: 'tab-py', session: 'py', prompt: '>>>', status: 'Pyodide WASM (Python 3.11)' };
        this.switchTerminalTab(tabPy);
        const header = title ? `[執行 Python 應用: ${title}]` : '[執行 Python 腳本]';
        const lineCount = (code || '').split('\n').length;
        this.logTerminal(`${header}\n>>> (已載入 ${lineCount} 行腳本代碼，執行中...)`);

        try {
            const res = await this.dispatcher.dispatch('run_python', { code });
            const output = res.output || res.stdout || (res.status === 'success' ? '(程式執行完成，無輸出內容)' : JSON.stringify(res));
            this.logTerminal(`[Python 輸出]\n${output.trim()}`);
            if (res.stderr && res.stderr.trim()) {
                this.logTerminal(`[Python stderr]\n${res.stderr.trim()}`);
            }
            return res;
        } catch (err) {
            this.logTerminal(`[Python 執行失敗] ${err.message || err}`);
            return { status: 'error', error: String(err) };
        }
    }

    getSlashCommands() {
        const isZh = this.currentLang === 'zh-TW';
        return [
            { cmd: '/weather', title: isZh ? '/weather 查詢即時天氣' : '/weather Check Weather Forecast', desc: isZh ? '透過聯網或氣象適配器查詢即時氣溫與天氣' : 'Query real-time weather and temperature via tools' },
            { cmd: '/python', title: isZh ? '/python 執行 Python 腳本' : '/python Execute Python Script', desc: isZh ? '在瀏覽器內使用 Pyodide WASM 執行數值計算' : 'Run Python code in browser via Pyodide WASM' },
            { cmd: '/gpu', title: isZh ? '/gpu 檢測硬體加速狀態' : '/gpu Check GPU & Accelerators', desc: isZh ? '檢視 NVIDIA GPU 顯存與 Host Daemon 狀態' : 'Check NVIDIA GPU VRAM and Host Daemon status' },
            { cmd: '/clear', title: isZh ? '/clear 清空對話記錄' : '/clear Clear Chat History', desc: isZh ? '重設右側對話容器與快捷提示卡片' : 'Reset chat container and shortcut chips' },
            { cmd: '/diag', title: isZh ? '/diag 系統自我檢測' : '/diag System Diagnostics', desc: isZh ? '探測本機服務 Port 8001/1234/5000 運行狀態' : 'Probe ports 8001/1234/5000 service health' },
            { cmd: '/sync', title: isZh ? '/sync 同步 Upstream 工具' : '/sync Sync Upstream Tools', desc: isZh ? '比對原生 Hermes 工具契約與適配器' : 'Synchronize upstream Hermes tool contracts' },
            { cmd: '/jev', title: isZh ? '/jev 極速決策沙盒' : '/jev Jev Fast-Decision Sandbox', desc: isZh ? '以 ~15ms Cross-Encoder 單次前向傳播評估決策' : 'Single-pass ~15ms cross-encoder decision ranking' },
            { cmd: '/settings', title: isZh ? '/settings 系統與 API 設定' : '/settings Router Settings', desc: isZh ? '配置 API Endpoint、金鑰與自訂提示詞' : 'Configure API endpoints, keys and prompt' },
            { cmd: '/help', title: isZh ? '/help 顯示指令與工具說明' : '/help Display Help & Guides', desc: isZh ? '瀏覽 Hermes 101 款核心工具支援與架構' : 'Browse Hermes 101 tools architecture guide' }
        ];
    }

    setupSlashMenu() {
        const input = document.getElementById('chat-input');
        const menu = document.getElementById('slash-menu');
        const btnSlash = document.getElementById('btn-quick-slash');
        if (!input || !menu) return;

        this.slashSelectedIndex = 0;
        this.activeSlashFiltered = [];

        const renderMenu = (filterText) => {
            const commands = this.getSlashCommands();
            const term = filterText.toLowerCase();
            this.activeSlashFiltered = commands.filter(c => c.cmd.toLowerCase().includes(term) || c.title.toLowerCase().includes(term) || c.desc.toLowerCase().includes(term));

            if (this.activeSlashFiltered.length === 0) {
                menu.classList.remove('active');
                return;
            }

            if (this.slashSelectedIndex >= this.activeSlashFiltered.length) {
                this.slashSelectedIndex = 0;
            }

            menu.innerHTML = '';
            this.activeSlashFiltered.forEach((c, idx) => {
                const item = document.createElement('div');
                item.className = `slash-item ${idx === this.slashSelectedIndex ? 'selected' : ''}`;
                item.innerHTML = `
                    <div>
                        <div class="slash-item-title">${c.title}</div>
                        <div class="slash-item-desc">${c.desc}</div>
                    </div>
                    <span class="text-[10px] text-slate-500 font-mono">↵ 執行</span>
                `;
                item.addEventListener('mouseenter', () => {
                    this.slashSelectedIndex = idx;
                    menu.querySelectorAll('.slash-item').forEach((el, i) => {
                        el.classList.toggle('selected', i === idx);
                    });
                });
                item.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.executeSlashCommand(c.cmd);
                });
                menu.appendChild(item);
            });

            menu.classList.add('active');
        };

        input.addEventListener('input', () => {
            const val = input.value;
            if (val.startsWith('/')) {
                renderMenu(val.trim());
            } else {
                menu.classList.remove('active');
            }
        });

        input.addEventListener('keydown', (e) => {
            if (menu.classList.contains('active') && this.activeSlashFiltered.length > 0) {
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    this.slashSelectedIndex = (this.slashSelectedIndex + 1) % this.activeSlashFiltered.length;
                    menu.querySelectorAll('.slash-item').forEach((el, i) => {
                        el.classList.toggle('selected', i === this.slashSelectedIndex);
                    });
                    const selEl = menu.querySelectorAll('.slash-item')[this.slashSelectedIndex];
                    if (selEl) selEl.scrollIntoView({ block: 'nearest' });
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    this.slashSelectedIndex = (this.slashSelectedIndex - 1 + this.activeSlashFiltered.length) % this.activeSlashFiltered.length;
                    menu.querySelectorAll('.slash-item').forEach((el, i) => {
                        el.classList.toggle('selected', i === this.slashSelectedIndex);
                    });
                    const selEl = menu.querySelectorAll('.slash-item')[this.slashSelectedIndex];
                    if (selEl) selEl.scrollIntoView({ block: 'nearest' });
                } else if (e.key === 'Enter' || e.key === 'Tab') {
                    e.preventDefault();
                    const chosen = this.activeSlashFiltered[this.slashSelectedIndex];
                    if (chosen) {
                        this.executeSlashCommand(chosen.cmd);
                    }
                } else if (e.key === 'Escape') {
                    menu.classList.remove('active');
                }
            }
        });

        if (btnSlash) {
            btnSlash.addEventListener('click', () => {
                input.value = '/';
                input.focus();
                renderMenu('/');
            });
        }

        document.addEventListener('click', (e) => {
            if (!menu.contains(e.target) && e.target !== input && e.target !== btnSlash) {
                menu.classList.remove('active');
            }
        });
    }

    executeSlashCommand(cmd) {
        const input = document.getElementById('chat-input');
        const menu = document.getElementById('slash-menu');
        if (menu) menu.classList.remove('active');
        if (!input) return;

        input.value = '';
        if (cmd === '/clear') {
            this.clearChat();
        } else if (cmd === '/diag') {
            this.showDiagModal();
        } else if (cmd === '/sync') {
            this.showSyncModal();
        } else if (cmd === '/jev') {
            this.showJevModal();
        } else if (cmd === '/settings') {
            const btn = document.getElementById('btn-open-settings');
            if (btn) btn.click();
        } else if (cmd === '/weather') {
            input.value = this.currentLang === 'zh-TW' ? '查詢今天天氣' : "Check today's weather";
            this.handleSendMessage();
        } else if (cmd === '/python') {
            input.value = this.currentLang === 'zh-TW' ? '請用 Python 計算費氏數列前 20 項' : 'Compute Fibonacci sequence first 20 terms with Python';
            this.handleSendMessage();
        } else if (cmd === '/gpu') {
            input.value = this.currentLang === 'zh-TW' ? '檢查本機 GPU 與 Daemon 狀態' : 'Check local GPU and Daemon status';
            this.handleSendMessage();
        } else if (cmd === '/help') {
            input.value = this.currentLang === 'zh-TW' ? '請說明 Hermes Agent 的 3-tier 架構與可用工具清單' : 'Explain Hermes Agent 3-tier architecture and available tools';
            this.handleSendMessage();
        }
    }

    copyToClipboard(text, btnElement) {
        if (!text) return;
        const doSuccess = () => {
            if (btnElement) {
                const orig = btnElement.innerHTML;
                const copiedLabel = TRANSLATIONS[this.currentLang]?.copiedBtn || '✔ 已複製';
                btnElement.innerHTML = `<span>✔</span> <span>${copiedLabel}</span>`;
                btnElement.classList.add('text-emerald-400');
                setTimeout(() => {
                    btnElement.innerHTML = orig;
                    btnElement.classList.remove('text-emerald-400');
                }, 1500);
            }
        };

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(doSuccess).catch(() => {
                this.fallbackCopyText(text);
                doSuccess();
            });
        } else {
            this.fallbackCopyText(text);
            doSuccess();
        }
    }

    fallbackCopyText(text) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        textarea.style.top = '-9999px';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        try {
            document.execCommand('copy');
        } catch (err) {}
        document.body.removeChild(textarea);
    }

    async handleSendMessage() {
        const input = document.getElementById('chat-input');
        if (!input || !input.value.trim()) return;
        const text = input.value.trim();
        input.value = '';

        this.appendUserMessage(text);
        await this.simulateHermesReasoning(text);
    }

    appendUserMessage(content) {
        const container = document.getElementById('chat-container');
        if (!container) return;
        const dict = TRANSLATIONS[this.currentLang] || TRANSLATIONS["zh-TW"];
        const div = document.createElement('div');
        div.className = 'flex items-start justify-end space-x-2 group';
        div.innerHTML = `
            <div class="flex flex-col items-end max-w-[85%] space-y-1">
                <div class="bg-sky-900/40 border border-sky-600/40 rounded-2xl rounded-tr-none p-3.5 shadow-sm text-xs text-sky-100 leading-relaxed select-text user-msg-content">
                    ${content.replace(/\n/g, '<br>')}
                </div>
                <div class="flex items-center space-x-1 opacity-70 group-hover:opacity-100 transition text-[10px] text-slate-400">
                    <button type="button" class="btn-copy-msg hover:text-sky-300 flex items-center space-x-1 cursor-pointer transition px-1.5 py-0.5 rounded hover:bg-sky-950/80 border border-slate-700/60" title="複製內容">
                        <i data-lucide="copy" class="w-3 h-3 text-sky-400"></i>
                        <span class="copy-label">${dict.copyBtn || '複製'}</span>
                    </button>
                    <span class="text-slate-500 font-mono">${new Date().toLocaleTimeString()}</span>
                </div>
            </div>
            <div class="w-8 h-8 rounded-full bg-sky-600 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow">U</div>
        `;
        const copyBtn = div.querySelector('.btn-copy-msg');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => {
                const textEl = div.querySelector('.user-msg-content');
                this.copyToClipboard(textEl ? textEl.innerText : content, copyBtn);
            });
        }
        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
        if (window.lucide) lucide.createIcons();
    }

    async simulateHermesReasoning(query) {
        const container = document.getElementById('chat-container');
        if (!container) return;
        const dict = TRANSLATIONS[this.currentLang] || TRANSLATIONS["zh-TW"];

        const thinkingDiv = document.createElement('div');
        thinkingDiv.className = 'flex items-start space-x-3';
        thinkingDiv.innerHTML = `
            <div class="w-8 h-8 rounded-full bg-purple-700 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow">H</div>
            <div class="bg-darkCard border border-darkBorder rounded-2xl rounded-tl-none p-3 text-xs text-slate-400 flex items-center space-x-2">
                <span class="w-2 h-2 rounded-full bg-purple-400 animate-ping"></span>
                <span>${dict.reasoningThinking || 'Hermes 正在分析意圖並規劃工具策略...'}</span>
            </div>
        `;
        container.appendChild(thinkingDiv);
        container.scrollTop = container.scrollHeight;

        let targetTool = 'clarify';
        let toolArgs = {};
        const queryLower = query.toLowerCase();

        if (queryLower.includes('天氣') || queryLower.includes('weather') || queryLower.includes('氣溫') || queryLower.includes('溫度') || queryLower.includes('氣象') || queryLower.includes('降雨')) {
            targetTool = 'get_weather';
            toolArgs = { location: 'Taipei', query: query };
        } else if (queryLower.includes('python') || queryLower.includes('計算') || queryLower.includes('code') || queryLower.includes('數列') || queryLower.includes('fibonacci')) {
            targetTool = 'run_python';
            toolArgs = { code: `# Generated by Hermes for query: ${query}\nresult = [x**2 for x in range(10)]\nprint('Computed result:', result)` };
        } else if ((queryLower.includes('gpu') || queryLower.includes('顯卡') || queryLower.includes('顯存') || queryLower.includes('vram')) && !queryLower.includes('介紹') && !queryLower.includes('功能')) {
            targetTool = 'gpu_info';
            toolArgs = {};
        } else if ((queryLower.includes('daemon') || queryLower.includes('狀態')) && !queryLower.includes('介紹') && !queryLower.includes('功能') && !queryLower.includes('自己')) {
            targetTool = 'gpu_info';
            toolArgs = {};
        } else if (queryLower.includes('同步') || queryLower.includes('upstream') || queryLower.includes('sync')) {
            targetTool = 'check_hermes_updates';
            toolArgs = {};
        } else if (queryLower.includes('todo') || queryLower.includes('清單') || queryLower.includes('待辦')) {
            targetTool = 'todo';
            toolArgs = { action: 'list' };
        } else if (queryLower.includes('檔案') || queryLower.includes('目錄') || queryLower.includes('ls') || queryLower.includes('dir')) {
            targetTool = 'search_files';
            toolArgs = { directory: '.', pattern: '*' };
        } else if (queryLower.includes('搜尋') || queryLower.includes('search')) {
            targetTool = 'web_search';
            toolArgs = { query };
        } else if (queryLower.includes('.dxf') || queryLower.includes('dxf') || (queryLower.includes('geo') && queryLower.includes('json'))) {
            const fileMatch = query.match(/[\w\-_\.]+\.dxf/i);
            const dxfFile = fileMatch ? fileMatch[0] : '8WAPBE05_1A1G-1DOT-DXF-250704.dxf';
            targetTool = 'parse_dxf';
            toolArgs = { filepath: dxfFile };
        } else {
            targetTool = 'llm_direct';
        }

        // No tool matched → stream real LLM answer
        if (targetTool === 'llm_direct') {
            thinkingDiv.remove();
            await this._streamLlmAnswer(query, container, dict);
            return;
        }

        // Check for Agent Tool-Calling Hallucination Loop
        if (!this.toolExecutionHistory) this.toolExecutionHistory = [];
        const callSig = `${targetTool}::${JSON.stringify(toolArgs)}`;
        this.toolExecutionHistory.push({ tool: targetTool, sig: callSig, time: Date.now() });
        if (this.toolExecutionHistory.length > 10) this.toolExecutionHistory.shift();

        const last3 = this.toolExecutionHistory.slice(-3);
        const isToolLoop = (last3.length === 3 && last3.every(c => c.sig === callSig));

        if (isToolLoop) {
            thinkingDiv.remove();
            const jevRes = await this.evalJevDecision(
                `Agent trapped in tool-calling loop: repeated tool '${targetTool}' with identical arguments 3 times. Break loop and advise user.`,
                [
                    "中斷工具循環並向使用者求助 (break_loop_ask_user)",
                    "強制切換替代工具 (switch_alternative_tool)",
                    "重設 Agent 狀態 (reset_agent_state)"
                ],
                0.35
            );
            this.logTerminal(`[Jev Agent防護] 攔截工具調用死循環 (${targetTool}) -> 決策: ${jevRes.best_option} (信心度: ${jevRes.confidence}%)`);

            const isZh = (this.currentLang !== 'en');
            const loopDiv = document.createElement('div');
            loopDiv.className = 'flex items-start space-x-3';
            loopDiv.innerHTML = `
                <div class="w-8 h-8 rounded-full bg-purple-700 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow">H</div>
                <div class="max-w-[85%] bg-darkCard border border-darkBorder rounded-2xl rounded-tl-none p-3.5 space-y-3 shadow select-text assistant-msg-bubble">
                    <div class="flex flex-wrap items-center justify-between text-xs text-slate-400 border-b border-darkBorder/60 pb-1.5 gap-1.5">
                        <div class="flex items-center space-x-1.5 flex-wrap">
                            <span class="font-medium text-purple-400">Hermes Autonomous Agent</span>
                            <span class="text-[10px] px-2 py-0.5 rounded-full bg-purple-950/90 text-purple-300 border border-purple-700/60 font-mono">[推論: Jev Guard]</span>
                        </div>
                        <div><span class="text-[10px] px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-700/50">⚡ Tier 1: Jev Fast-Decision</span></div>
                    </div>
                    <div id="jev-tool-loop-card" class="space-y-2 p-3 rounded-xl bg-amber-950/40 border border-amber-600/50 text-xs select-text">
                        <div class="flex items-center gap-2 text-amber-300 font-bold">
                            <span class="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                            <span>⚠️ ${isZh ? '偵測到 Agent 工具調用死循環 (Tool-Calling Loop)' : 'Agent Tool-Calling Loop Detected'}</span>
                        </div>
                        <p class="text-slate-300 leading-relaxed">
                            Agent 嘗試連續 3 次以相同參數重複調用工具 <code class="text-purple-300 font-mono">${targetTool}</code>，未能產生新進展。<br>
                            <strong>Jev Fast-Decision</strong> 研判為工具循環，已主動中斷：<strong class="text-amber-300">${jevRes.best_option}</strong>。
                        </p>
                        <div class="text-slate-400 text-[11px] pt-1 border-t border-amber-900/40">
                            ${isZh ? '建議：請提供更具體的指令或參數，協助 Hermes 跳出工具調用迴圈。' : 'Tip: Please provide more specific instructions or parameters to assist Hermes.'}
                        </div>
                    </div>
                </div>
            `;
            container.appendChild(loopDiv);
            container.scrollTop = container.scrollHeight;
            return;
        }

        const toolResult = await this.dispatcher.dispatch(targetTool, toolArgs);
        thinkingDiv.remove();

        const tier = this.dispatcher.getToolTier(targetTool);
        const tierBadge = tier === 1
            ? '<span class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700/50">\u{1F7E2} Tier 1: Pure WASM</span>'
            : tier === 2
            ? '<span class="text-[10px] px-2 py-0.5 rounded-full bg-sky-950 text-sky-300 border border-sky-700/50">\u{1F7E1} Tier 2: Direct HTTP</span>'
            : '<span class="text-[10px] px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-700/50">\u{1F534} Tier 3: Host Daemon</span>';

        let engineBadge = '';
        if (this.activeEngine === 'onnx') {
            engineBadge = `\u{1F4E6} ONNX WASM (${this.activeOnnxModel || 'Qwen2.5-0.5B'})`;
        } else if (this.activeEngine === 'webgpu') {
            engineBadge = `\u26A1 WebGPU (${this.activeWebgpuModel || 'Qwen2.5-0.5B'})`;
        } else if (this.activeEngine === 'cothink') {
            engineBadge = `\u{1F9E0} Co-Think (${this.activeWebgpuModel || 'WebGPU'} + API)`;
        } else if (this.activeEngine === 'supervise') {
            engineBadge = `\u{1F6E1} Supervise (${this.activeOnnxModel || 'ONNX'} + API)`;
        } else {
            engineBadge = `\u{1F310} API Router (${this.profiles[this.activeProfileId]?.name || 'REST'})`;
        }

        let answerSummary = '';
        const toolFailed = toolResult && (toolResult.status === 'error' || toolResult.error);

        if (toolFailed) {
            const errMsg = toolResult.error || toolResult.detail || JSON.stringify(toolResult);
            const isNotFound = errMsg.includes('404') || errMsg.includes('Not Found');
            let suggestion = '';
            if (isNotFound) {
                suggestion = this.currentLang === 'zh-TW'
                    ? `Host Daemon (Port 8001) 尚未實作 <code class="font-mono text-purple-300">${targetTool}</code> 端點。您可切換至純 WASM 模式使用，或確認 daemon/server.py 是否已加入此工具。`
                    : `Host Daemon (Port 8001) has no <code class="font-mono text-purple-300">${targetTool}</code> endpoint. Use WASM-only chat or add this tool to daemon/server.py.`;
            } else {
                suggestion = this.currentLang === 'zh-TW'
                    ? '後端 Daemon 未運行或無法連線。請執行 <code class="font-mono text-emerald-300">START.bat</code>，或切換至純 WASM 模式。'
                    : 'Host Daemon offline. Run <code class="font-mono text-emerald-300">START.bat</code> or use pure WASM mode.';
            }
            answerSummary = `<div class="space-y-2 select-text">
                    <div class="flex items-center gap-1.5 text-xs font-semibold text-red-400">
                        <i data-lucide="alert-circle" class="w-3.5 h-3.5 shrink-0"></i>
                        <span>${this.currentLang === 'zh-TW' ? '工具調用失敗 — 請見下方說明' : 'Tool call failed — see details below'}</span>
                    </div>
                    <div class="text-xs text-slate-300 leading-relaxed bg-red-950/20 border border-red-800/30 rounded-lg p-2.5">${suggestion}</div>
                </div>`;
        } else if (targetTool === 'get_weather' || targetTool === 'weather') {
            const loc = toolResult.location || 'Taipei, Taiwan';
            const cond = toolResult.condition || 'Partly Cloudy';
            const temp = toolResult.temperature_c || '25\u00B0C';
            const feels = toolResult.feels_like_c || temp;
            const hum = toolResult.humidity || '65%';
            const wind = toolResult.wind_kmh || '12 km/h';
            const rep = toolResult.report || `${loc}: ${cond}, ${temp} (feels ${feels}), humidity ${hum}, wind ${wind}.`;
            answerSummary = `<div class="space-y-2 select-text">
                    <div class="text-xs font-bold text-sky-300 flex items-center gap-1.5">
                        <i data-lucide="sun-medium" class="w-4 h-4 text-amber-400"></i>
                        <span>${loc} ${this.currentLang === 'zh-TW' ? '\u5373\u6642\u6c23\u8c61' : 'Live Weather'}</span>
                    </div>
                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[11px] font-mono">
                        <div class="bg-slate-950 p-2 rounded-lg border border-slate-800"><span class="text-slate-400 block text-[10px]">${this.currentLang === 'zh-TW' ? '\u5929\u6c23' : 'Condition'}</span><span class="text-amber-300 font-bold">${cond}</span></div>
                        <div class="bg-slate-950 p-2 rounded-lg border border-slate-800"><span class="text-slate-400 block text-[10px]">${this.currentLang === 'zh-TW' ? '\u6c23\u6eab' : 'Temperature'}</span><span class="text-emerald-400 font-bold">${temp}</span></div>
                        <div class="bg-slate-950 p-2 rounded-lg border border-slate-800"><span class="text-slate-400 block text-[10px]">${this.currentLang === 'zh-TW' ? '\u9ad4\u611f' : 'Feels Like'}</span><span class="text-sky-300 font-bold">${feels}</span></div>
                        <div class="bg-slate-950 p-2 rounded-lg border border-slate-800"><span class="text-slate-400 block text-[10px]">${this.currentLang === 'zh-TW' ? '\u6fd5\u5ea6/\u98a8\u901f' : 'Hum/Wind'}</span><span class="text-purple-300 font-bold">${hum}/${wind}</span></div>
                    </div>
                    <div class="text-slate-200 text-xs bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">${rep}</div>
                </div>`;
        } else if (targetTool === 'gpu_info') {
            if (toolResult.gpu_available === false) {
                answerSummary = `<div class="space-y-2 select-text">
                    <div class="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                        <i data-lucide="cpu" class="w-4 h-4 text-sky-400"></i>
                        <span>${this.currentLang === 'zh-TW' ? '系統與服務狀態' : 'System & Service Status'}</span>
                    </div>
                    <div class="grid grid-cols-3 gap-1.5 text-[11px] font-mono">
                        <div class="bg-slate-950 p-2 rounded-lg border border-slate-800"><span class="text-slate-400 block text-[10px]">Daemon :8001</span><span class="text-emerald-400 font-bold">Online</span></div>
                        <div class="bg-slate-950 p-2 rounded-lg border border-slate-800"><span class="text-slate-400 block text-[10px]">LM Studio :1234</span><span class="${toolResult.lm_studio === 'online' ? 'text-emerald-400' : 'text-red-400'} font-bold">${toolResult.lm_studio || '?'}</span></div>
                        <div class="bg-slate-950 p-2 rounded-lg border border-slate-800"><span class="text-slate-400 block text-[10px]">ComfyUI :5000</span><span class="${toolResult.comfyui === 'online' ? 'text-emerald-400' : 'text-slate-500'} font-bold">${toolResult.comfyui || '?'}</span></div>
                    </div>
                    <div class="text-xs text-slate-400 bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">${toolResult.gpu_message || 'No NVIDIA GPU found.'}</div>
                </div>`;
            } else if (toolResult.gpus && toolResult.gpus.length > 0) {
                const gpuCards = toolResult.gpus.map(g => `
                    <div class="bg-slate-950 p-2.5 rounded-lg border border-slate-800 space-y-1.5">
                        <div class="text-emerald-300 font-bold text-xs">${g.name}</div>
                        <div class="grid grid-cols-3 gap-1 text-[10px] font-mono">
                            <div><span class="text-slate-400 block">VRAM Total</span><span class="text-sky-300">${g.vram_total_mb} MB</span></div>
                            <div><span class="text-slate-400 block">VRAM Used</span><span class="text-amber-300">${g.vram_used_mb} MB</span></div>
                            <div><span class="text-slate-400 block">GPU Util</span><span class="text-purple-300">${g.gpu_util_pct}%</span></div>
                            <div><span class="text-slate-400 block">VRAM Free</span><span class="text-emerald-400">${g.vram_free_mb} MB</span></div>
                            <div><span class="text-slate-400 block">Temp</span><span class="${parseInt(g.temp_c) > 80 ? 'text-red-400' : 'text-yellow-300'}">${g.temp_c}\u00B0C</span></div>
                        </div>
                    </div>`).join('');
                answerSummary = `<div class="space-y-2 select-text">
                    <div class="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                        <i data-lucide="cpu" class="w-4 h-4 text-emerald-400"></i>
                        <span>GPU / ${this.currentLang === 'zh-TW' ? '服務狀態' : 'Service Status'}</span>
                    </div>${gpuCards}
                    <div class="grid grid-cols-2 gap-1.5 text-[11px] font-mono">
                        <div class="bg-slate-950 p-2 rounded-lg border border-slate-800"><span class="text-slate-400 block text-[10px]">LM Studio :1234</span><span class="${toolResult.lm_studio === 'online' ? 'text-emerald-400' : 'text-red-400'} font-bold">${toolResult.lm_studio || '?'}</span></div>
                        <div class="bg-slate-950 p-2 rounded-lg border border-slate-800"><span class="text-slate-400 block text-[10px]">ComfyUI :5000</span><span class="${toolResult.comfyui === 'online' ? 'text-emerald-400' : 'text-slate-500'} font-bold">${toolResult.comfyui || '?'}</span></div>
                    </div>
                </div>`;
            } else {
                answerSummary = `<div class="text-xs text-slate-200">&#x1F4BB; ${this.currentLang === 'zh-TW' ? 'GPU 資訊取得完成，請見上方工具回傳結果。' : 'GPU info retrieved. See tool result above.'}</div>`;
            }
        } else if (targetTool === 'parse_dxf') {
            if (toolResult && toolResult.status === 'success') {
                const meta = toolResult.metadata || {};
                const layers = meta.layers ? Object.keys(meta.layers).join(', ') : '預設圖層';
                answerSummary = `<div class="space-y-2.5 select-text">
                    <div class="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                        <i data-lucide="layers" class="w-4 h-4 text-sky-400"></i>
                        <span>DXF -> GeoJSON 解析統計報告 (${meta.source_file || 'CAD'})</span>
                    </div>
                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[11px] font-mono">
                        <div class="bg-slate-950 p-2 rounded-lg border border-slate-800"><span class="text-slate-400 block text-[10px]">幾何總數</span><span class="text-emerald-400 font-bold">${meta.total_entities || 0} 個</span></div>
                        <div class="bg-slate-950 p-2 rounded-lg border border-slate-800"><span class="text-slate-400 block text-[10px]">邊界寬度</span><span class="text-sky-300 font-bold">${meta.width || 0}</span></div>
                        <div class="bg-slate-950 p-2 rounded-lg border border-slate-800"><span class="text-slate-400 block text-[10px]">邊界高度</span><span class="text-amber-300 font-bold">${meta.height || 0}</span></div>
                        <div class="bg-slate-950 p-2 rounded-lg border border-slate-800"><span class="text-slate-400 block text-[10px]">DXF 版本</span><span class="text-purple-300 font-bold">${meta.dxf_version || 'AutoCAD'}</span></div>
                    </div>
                    <div class="text-xs text-slate-300 bg-slate-950/60 p-2 rounded-lg border border-slate-800/80 space-y-1">
                        <div><strong>包含圖層：</strong><code class="text-purple-300">${layers}</code></div>
                        <div><strong>外包矩形 (BBox)：</strong><code class="text-emerald-400">${JSON.stringify(toolResult.bbox || [])}</code></div>
                        <div>${toolResult.summary || '已成功轉換為標準 GeoJSON FeatureCollection 格式。'}</div>
                    </div>
                </div>`;
            } else {
                answerSummary = `<div class="space-y-2 select-text">
                    <div class="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                        <i data-lucide="alert-circle" class="w-4 h-4"></i>
                        <span>DXF 檔案解析說明</span>
                    </div>
                    <div class="text-xs text-slate-300 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800 space-y-1.5">
                        <p>${toolResult?.error || '找不到指定的 DXF 檔案。'}</p>
                        <p class="text-slate-400 text-[11px]">💡 <strong>如何解析此 DXF 文件：</strong><br>
                        1. 本機環境已安裝 <code class="text-emerald-300 font-mono">ezdxf 1.4.4</code> 解析引擎。<br>
                        2. 請確認檔案已放置於 Webcom AI 目錄中，或在終端機執行：<br>
                        <code class="text-sky-300 font-mono">python tools/dxf_to_geojson.py "${toolArgs.filepath || '8WAPBE05_1A1G-1DOT-DXF-250704.dxf'}"</code>
                        </p>
                    </div>
                </div>`;
            }
        } else {
            answerSummary = `<div class="text-xs text-slate-200 leading-relaxed select-text">
                    ${dict.toolInvokedLabel || '\u{1F527} \u8abf\u7528\u5de5\u5177:'} <code class="text-purple-300 font-mono">${targetTool}</code> ${dict.toolCompletedSummary || '\u5df2\u5b8c\u6210\u8abf\u7528\u3002'}
                </div>`;
        }

        const aiDiv = document.createElement('div');
        aiDiv.className = 'flex items-start space-x-3';
        aiDiv.innerHTML = `
            <div class="w-8 h-8 rounded-full bg-purple-700 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow">H</div>
            <div class="max-w-[85%] bg-darkCard border border-darkBorder rounded-2xl rounded-tl-none p-3.5 space-y-3 shadow select-text assistant-msg-bubble">
                <div class="flex flex-wrap items-center justify-between text-xs text-slate-400 border-b border-darkBorder/60 pb-1.5 gap-1.5">
                    <div class="flex items-center space-x-1.5 flex-wrap">
                        <span class="font-medium text-purple-400">Hermes Autonomous Agent</span>
                        <span class="text-[10px] px-2 py-0.5 rounded-full bg-purple-950/90 text-purple-300 border border-purple-700/60 font-mono">[\u63a8\u8ad6: ${engineBadge}]</span>
                    </div>
                    <div>${tierBadge}</div>
                </div>
                <div class="bg-slate-950 border border-slate-800 rounded-lg p-2.5 font-mono text-[11px] space-y-1 select-text">
                    <div class="text-purple-300 font-semibold flex items-center space-x-1">
                        <span>${dict.toolInvokedLabel || '\u{1F527} \u8abf\u7528\u5de5\u5177:'}</span> <span class="text-sky-300">${targetTool}</span>
                    </div>
                    <div class="text-slate-400 overflow-x-auto text-[10px]">${dict.toolArgsLabel || '\u53c3\u6578:'} ${JSON.stringify(toolArgs)}</div>
                    <div class="text-slate-300 border-t border-slate-800 pt-1.5 text-[10px]">
                        ${dict.toolResultLabel || '\u57f7\u884c\u7d50\u679c:'} <pre class="${toolFailed ? 'text-red-400' : 'text-emerald-400'} mt-1 whitespace-pre-wrap select-text font-mono">${JSON.stringify(toolResult, null, 2)}</pre>
                    </div>
                </div>
                <div class="assistant-content-text select-text">${answerSummary}</div>
                <div class="flex items-center justify-between pt-1 border-t border-darkBorder/50 text-[11px] text-slate-400 select-none">
                    <div class="flex items-center space-x-2">
                        <button type="button" class="btn-copy-msg hover:text-purple-300 flex items-center space-x-1 cursor-pointer transition px-2 py-0.5 rounded bg-slate-900/80 border border-slate-700 hover:border-purple-500/60">
                            <i data-lucide="copy" class="w-3 h-3 text-purple-400"></i>
                            <span class="copy-label">${dict.copyBtn || '\u8907\u88fd'}</span>
                        </button>
                        <button type="button" class="btn-retry-msg hover:text-sky-300 flex items-center space-x-1 cursor-pointer transition px-2 py-0.5 rounded bg-slate-900/80 border border-slate-700 hover:border-sky-500/60" data-query="${encodeURIComponent(query)}">
                            <i data-lucide="rotate-ccw" class="w-3 h-3 text-sky-400"></i>
                            <span class="retry-label">${dict.retryBtn || '\u91cd\u8a66'}</span>
                        </button>
                    </div>
                    <span class="text-[10px] text-slate-500 font-mono">${new Date().toLocaleTimeString()}</span>
                </div>
            </div>
        `;

        const copyBtn = aiDiv.querySelector('.btn-copy-msg');
        if (copyBtn) copyBtn.addEventListener('click', () => {
            const bubble = aiDiv.querySelector('.assistant-msg-bubble');
            this.copyToClipboard(bubble ? bubble.innerText : JSON.stringify(toolResult), copyBtn);
        });
        const retryBtn = aiDiv.querySelector('.btn-retry-msg');
        if (retryBtn) retryBtn.addEventListener('click', () => {
            const rawQuery = decodeURIComponent(retryBtn.getAttribute('data-query') || query);
            this.appendUserMessage(rawQuery);
            this.simulateHermesReasoning(rawQuery);
        });

        container.appendChild(aiDiv);
        container.scrollTop = container.scrollHeight;
        if (window.lucide) lucide.createIcons();
    }

    // Fast Jev Cross-Encoder Decision Evaluator (Supports both Daemon API and client-side WASM)
    async evalJevDecision(state, options, temperature = 0.4) {
        const t0 = performance.now();
        const daemonUrl = this.activeDaemonUrl || this.dispatcher?.daemonUrl || 'http://127.0.0.1:8001';

        // 1. Try Host Daemon Jev API first if reachable
        try {
            const resp = await fetch(`${daemonUrl}/api/jev/decide`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ state, options, temperature }),
                signal: AbortSignal.timeout(2000)
            });
            if (resp.ok) {
                const data = await resp.json();
                return data;
            }
        } catch (e) {}

        // 2. Pure in-browser WASM / Heuristic Jev Fast Decider (~2ms)
        const stateLower = (state || '').toLowerCase();
        const extractTerms = (text) => {
            const terms = new Set();
            for (const w of (text.match(/[a-zA-Z0-9_\-]+/g) || [])) terms.add(w.toLowerCase());
            const cn = text.match(/[\u4e00-\u9fff]/g) || [];
            for (const c of cn) terms.add(c);
            for (let i = 0; i < cn.length - 1; i++) terms.add(cn[i] + cn[i + 1]);
            return terms;
        };

        const stateTerms = extractTerms(stateLower);
        const domainAssociations = {
            "500": ["retry", "重試", "5s", "5秒", "delay", "自動重試", "暫態", "backoff"],
            "err500": ["retry", "重試", "5s", "5秒", "delay", "自動重試"],
            "internal server error": ["retry", "重試", "5s", "5秒", "自動重試"],
            "timeout": ["retry", "重試", "5s", "5秒", "delay"],
            "429": ["retry", "重試", "delay", "5s", "5秒", "rate limit"],
            "overloaded": ["retry", "重試", "5s", "5秒", "delay"],
            "401": ["key", "auth", "金鑰", "token", "settings"],
            "403": ["key", "auth", "權限", "settings"],
            "404": ["model", "endpoint", "端點", "not found"],
            "hallucination": ["truncate", "截斷", "warn", "loop", "循環", "修剪", "降溫", "lower_temp", "break", "跳出循環"],
            "loop": ["truncate", "截斷", "warn", "loop", "循環", "修剪", "降溫", "lower_temp", "break", "跳出循環"],
            "repetition": ["truncate", "截斷", "warn", "重複", "循環", "修剪", "降溫", "lower_temp"],
            "repetitive": ["truncate", "截斷", "warn", "重複", "循環", "修剪", "降溫", "lower_temp"],
            "degenerative": ["truncate", "截斷", "warn", "重複", "循環", "修剪", "降溫", "lower_temp"],
            "幻覺": ["truncate", "截斷", "warn", "重複", "循環", "修剪", "降溫", "lower_temp", "跳出循環"],
            "重複": ["truncate", "截斷", "warn", "重複", "循環", "修剪", "降溫", "lower_temp", "跳出循環"],
            "死循環": ["truncate", "截斷", "warn", "重複", "循環", "修剪", "降溫", "lower_temp", "跳出循環"],
            "tool_loop": ["break", "跳出循環", "詢問", "clarify", "替代工具", "終止", "求助"]
        };
        for (const [trigger, assocs] of Object.entries(domainAssociations)) {
            if (stateLower.includes(trigger)) {
                for (const a of assocs) stateTerms.add(a.toLowerCase());
            }
        }

        const scores = [];
        for (const opt of options) {
            const optLower = opt.toLowerCase();
            const optTerms = extractTerms(optLower);
            let overlap = 0;
            for (const t of optTerms) {
                if (stateTerms.has(t)) overlap++;
            }
            let directBonus = 0.0;
            for (const t of optTerms) {
                if (t.length >= 2 && (stateLower.includes(t) || stateTerms.has(t))) {
                    directBonus += 2.0;
                }
            }
            const lenPenalty = Math.log(Math.max(2, optTerms.size + 1));
            const rawScore = (overlap * 1.5 + directBonus) / lenPenalty;
            scores.push(rawScore);
        }

        const maxS = scores.length ? Math.max(...scores) : 0;
        const temp = Math.max(0.1, temperature);
        const expScores = scores.map(s => Math.exp((s - maxS) / temp));
        const sumExp = expScores.reduce((a, b) => a + b, 0) || 1.0;
        const probs = expScores.map(e => Math.round((e / sumExp) * 10000) / 100);

        const decisions = options.map((opt, i) => ({
            option: opt,
            score: Math.round(scores[i] * 1000) / 1000,
            prob: probs[i]
        })).sort((a, b) => b.prob - a.prob);

        const latencyMs = Math.round((performance.now() - t0) * 100) / 100;
        return {
            status: 'success',
            model: 'Jev-FastDecision-SFP (Tier 1)',
            best_option: decisions[0]?.option || options[0],
            confidence: decisions[0]?.prob || 0,
            decisions,
            latency_ms: latencyMs
        };
    }

    detectHallucinationLoop(text) {
        if (!text || text.length < 20) return null;

        // 1. Stutter repetition (single character or short token of 1~3 chars repeated >= 10 times at tail)
        const stutterMatch = text.match(/(.{1,3})\1{9,}$/);
        if (stutterMatch) {
            const token = stutterMatch[1];
            const fullMatch = stutterMatch[0];
            const count = Math.floor(fullMatch.length / token.length);
            const cleanText = text.slice(0, -fullMatch.length + token.length).trimEnd();
            return {
                type: '字元停滯重複 (Stutter Degeneration)',
                pattern: token,
                count,
                cleanText
            };
        }

        // 2. Periodic cyclic pattern repetition (catches periodic phrase loops of length 4 to 120 chars repeated >= 3 times at tail)
        const maxPeriod = Math.min(120, Math.floor(text.length / 3));
        for (let L = 4; L <= maxPeriod; L++) {
            const pattern = text.slice(-L);
            const p2 = text.slice(-2 * L, -L);
            const p3 = text.slice(-3 * L, -2 * L);
            if (pattern === p2 && pattern === p3) {
                let count = 3;
                while (text.length >= (count + 1) * L && text.slice(-(count + 1) * L, -count * L) === pattern) {
                    count++;
                }
                const cleanText = text.slice(0, text.length - (count - 1) * L).trimEnd();
                return {
                    type: '週期循環 (Cycle Pattern)',
                    pattern: pattern.trim(),
                    count,
                    period: L,
                    cleanText
                };
            }
        }

        // 3. Sentence-level repetition (sentences repeated >= 3 times consecutively)
        const rawParts = text.split(/([。\n!?；;]+)/);
        const sentences = [];
        for (let i = 0; i < rawParts.length; i += 2) {
            const s = (rawParts[i] || '').trim();
            const p = rawParts[i + 1] || '';
            if (s.length >= 6) {
                sentences.push(s + p);
            }
        }
        if (sentences.length >= 3) {
            const last = sentences[sentences.length - 1];
            const prev1 = sentences[sentences.length - 2];
            const prev2 = sentences[sentences.length - 3];
            if (last === prev1 && last === prev2) {
                let count = 3;
                for (let i = sentences.length - 4; i >= 0; i--) {
                    if (sentences[i] === last) count++;
                    else break;
                }
                const firstIdx = text.indexOf(last);
                const cleanText = firstIdx !== -1 ? text.slice(0, firstIdx + last.length).trimEnd() : text;
                return {
                    type: '連續重複句 (Repeating Sentence)',
                    pattern: last.trim(),
                    count,
                    cleanText
                };
            }
        }

        return null;
    }

    _renderHallucinationGuardCard({ query, container, dict, contentEl, loopInfo, jevRes, fullText }) {
        if (!contentEl) return;
        const isZh = (this.currentLang !== 'en');
        const cardDiv = document.createElement('div');
        cardDiv.id = 'jev-hallucination-card';
        cardDiv.className = 'mt-3 space-y-2.5 p-3 rounded-xl bg-purple-950/40 border border-purple-500/50 text-xs font-sans shadow-md select-text';

        const previewPat = (loopInfo.pattern || '').replace(/[<>&]/g, '').slice(0, 45);
        cardDiv.innerHTML = `
            <div class="flex items-center justify-between border-b border-purple-800/40 pb-1.5">
                <div class="flex items-center gap-1.5 font-bold text-purple-300">
                    <span class="w-2 h-2 rounded-full bg-purple-400 animate-ping"></span>
                    <span>🛡️ Jev 幻覺循環攔截防護 (~${jevRes.latency_ms}ms, 信心度: ${jevRes.confidence}%)</span>
                </div>
                <span class="px-2 py-0.5 rounded bg-purple-900/60 text-purple-200 border border-purple-700/50 text-[10px] font-mono">
                    重複 ${loopInfo.count} 次已截斷
                </span>
            </div>

            <p class="text-slate-300 leading-relaxed">
                偵測到模型輸出陷入退化性重複循環 (<code class="bg-black/50 px-1.5 py-0.5 rounded text-amber-300 font-mono">${previewPat}...</code>)。<br>
                <strong>Jev Fast-Decision</strong> 研判為生成幻覺死循環，首選決策為【<strong class="text-amber-300">${jevRes.best_option}</strong>】，已即時截斷串流以保護 Context 空間與避免 Token 浪費。
            </p>

            <div class="flex items-center justify-between pt-1">
                <div class="flex items-center gap-2">
                    <button type="button" id="btn-jev-lower-temp" class="px-3 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold transition flex items-center gap-1 shadow cursor-pointer text-xs">
                        <span>❄️ ${isZh ? '降溫重新推論 (Temp: 0.2)' : 'Retry with Lower Temp (0.2)'}</span>
                    </button>
                    <button type="button" id="btn-jev-accept-truncated" class="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer text-xs">
                        <span>✓ ${isZh ? '保留修剪後內容' : 'Accept Truncated'}</span>
                    </button>
                </div>
                <span class="text-[10px] text-slate-400 font-mono">Loop Guard: active</span>
            </div>
        `;

        contentEl.appendChild(cardDiv);
        container.scrollTop = container.scrollHeight;

        const btnLowerTemp = cardDiv.querySelector('#btn-jev-lower-temp');
        if (btnLowerTemp) {
            btnLowerTemp.addEventListener('click', () => {
                cardDiv.remove();
                if (contentEl) {
                    contentEl.innerHTML = `
                        <div class="flex items-center space-x-2 text-xs text-purple-300 font-mono py-1">
                            <span class="w-2 h-2 rounded-full bg-purple-400 animate-ping"></span>
                            <span>[Jev 降溫自癒] 正在以確定性參數 (Temperature 0.2) 重新推論...</span>
                        </div>
                    `;
                }
                this._streamLlmAnswer(query, container, dict, 0, contentEl, { temperature: 0.2 });
            });
        }

        const btnAccept = cardDiv.querySelector('#btn-jev-accept-truncated');
        if (btnAccept) {
            btnAccept.addEventListener('click', () => {
                cardDiv.innerHTML = `
                    <div class="text-[11px] text-slate-400 italic">
                        ✓ 已採納修剪後內容，幻覺循環防護解除。
                    </div>
                `;
            });
        }
    }

    _handleJevRetryCountdown({ query, container, dict, retryCount, status, errTxt, contentEl, jevRes, delaySeconds = 5 }) {
        let remaining = delaySeconds;
        let timerId = null;
        let isCancelled = false;
        const isZh = (this.currentLang !== 'en');

        const executeRetry = () => {
            if (isCancelled) return;
            if (contentEl) {
                contentEl.innerHTML = `
                    <div class="flex items-center space-x-2 text-xs text-amber-300 font-mono py-1">
                        <span class="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                        <span>[Jev 5秒重試啟動] 正在重新向 API 發送請求 (嘗試 ${retryCount + 1}/3)...</span>
                    </div>
                `;
            }
            this._streamLlmAnswer(query, container, dict, retryCount + 1, contentEl);
        };

        const renderCard = (sec) => {
            if (!contentEl) return;
            contentEl.innerHTML = `
                <div id="jev-retry-card" class="space-y-2.5 p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/50 text-xs font-sans shadow-md select-text">
                    <div class="flex items-center justify-between border-b border-amber-800/40 pb-2">
                        <div class="flex items-center gap-1.5 font-bold text-amber-300">
                            <span class="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                            <span>⚡ Jev 極速決策分流 (~${jevRes.latency_ms}ms, 信心度: ${jevRes.confidence}%)</span>
                        </div>
                        <span class="px-2 py-0.5 rounded bg-amber-900/60 text-amber-200 border border-amber-700/50 text-[10px] font-mono">
                            HTTP ${status} 暫態伺服器錯誤
                        </span>
                    </div>

                    <p class="text-slate-200 leading-relaxed">
                        API 伺服器回傳暫態錯誤 <code class="bg-black/50 px-1 py-0.5 rounded text-amber-400 font-mono">HTTP ${status} (${(errTxt ? errTxt.slice(0, 100) : 'Internal Server Error').replace(/[<>&]/g, '')})</code>。<br>
                        <strong>Jev Fast-Decision</strong> 研判為服務暫態異常，決策首選為【<strong>5 秒後自動重試</strong>】：
                    </p>

                    <div class="flex items-center justify-between bg-black/50 px-3 py-2 rounded-lg border border-amber-900/50">
                        <div class="flex items-center gap-2">
                            <span class="text-slate-400">${isZh ? '倒數重試計時：' : 'Next retry in:'}</span>
                            <span id="jev-countdown-num" class="text-amber-400 font-mono text-base font-bold animate-pulse">${sec}s</span>
                        </div>
                        <span class="text-slate-500 text-[11px] font-mono">(${isZh ? '第' : 'Attempt'} ${retryCount + 1}/3 ${isZh ? '次嘗試' : ''})</span>
                    </div>

                    <div class="flex items-center justify-between pt-1">
                        <div class="flex items-center gap-2">
                            <button type="button" id="btn-jev-retry-now" class="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold transition flex items-center gap-1 shadow cursor-pointer text-xs">
                                <span>↻ ${isZh ? '立即重試' : 'Retry Now'}</span>
                            </button>
                            <button type="button" id="btn-jev-cancel-retry" class="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer text-xs">
                                ${isZh ? '取消重試' : 'Cancel'}
                            </button>
                        </div>
                        <span class="text-[10px] text-slate-500 font-mono">${new Date().toLocaleTimeString()}</span>
                    </div>
                </div>
            `;

            contentEl.querySelector('#btn-jev-retry-now')?.addEventListener('click', () => {
                if (timerId) clearInterval(timerId);
                executeRetry();
            });

            contentEl.querySelector('#btn-jev-cancel-retry')?.addEventListener('click', () => {
                if (timerId) clearInterval(timerId);
                isCancelled = true;
                contentEl.innerHTML = `<span class="text-slate-400">${isZh ? '已取消重試。若持續遭遇 500 錯誤，請前往「設定」檢查 API 伺服器狀態。' : 'Retry cancelled. Check API server settings if 500 persists.'}</span>`;
            });
        };

        renderCard(remaining);

        timerId = setInterval(() => {
            remaining--;
            if (remaining > 0) {
                const numEl = contentEl.querySelector('#jev-countdown-num');
                if (numEl) numEl.textContent = `${remaining}s`;
            } else {
                clearInterval(timerId);
                executeRetry();
            }
        }, 1000);
    }

    // Real LLM API streaming answer with Jev 500 Transient Fault Recovery & Hallucination Loop Guard
    async _streamLlmAnswer(query, container, dict, retryCount = 0, existingContentEl = null, options = {}) {
        const profile = this.profiles[this.activeProfileId] || {};
        const endpoint = (profile.endpoint || 'http://127.0.0.1:1234/v1').replace(/\/$/, '');
        const apiKey = profile.apiKey || 'lm-studio';
        const model = profile.model && profile.model !== 'auto' ? profile.model : undefined;

        let contentEl = existingContentEl;

        if (!contentEl) {
            let engineBadge = '';
            if (this.activeEngine === 'onnx') {
                engineBadge = `📦 ONNX WASM (${this.activeOnnxModel || 'Qwen2.5-0.5B'})`;
            } else if (this.activeEngine === 'webgpu') {
                engineBadge = `⚡ WebGPU (${this.activeWebgpuModel || 'Qwen2.5-0.5B'})`;
            } else {
                engineBadge = `🌐 API Router (${profile.name || 'REST'})`;
            }

            const aiDiv = document.createElement('div');
            aiDiv.className = 'flex items-start space-x-3';
            const contentId = 'llm-stream-' + Date.now();
            aiDiv.innerHTML = `
                <div class="w-8 h-8 rounded-full bg-purple-700 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow">H</div>
                <div class="max-w-[85%] bg-darkCard border border-darkBorder rounded-2xl rounded-tl-none p-3.5 space-y-3 shadow select-text assistant-msg-bubble">
                    <div class="flex flex-wrap items-center justify-between text-xs text-slate-400 border-b border-darkBorder/60 pb-1.5 gap-1.5">
                        <div class="flex items-center space-x-1.5 flex-wrap">
                            <span class="font-medium text-purple-400">Hermes Autonomous Agent</span>
                            <span class="text-[10px] px-2 py-0.5 rounded-full bg-purple-950/90 text-purple-300 border border-purple-700/60 font-mono">[推論: ${engineBadge}]</span>
                        </div>
                        <div><span class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700/50">🟢 Tier 2: API Direct</span></div>
                    </div>
                    <div id="${contentId}" class="assistant-content-text text-xs text-slate-200 leading-relaxed select-text whitespace-pre-wrap">
                        <span class="text-slate-500 animate-pulse">${dict.reasoningThinking || '正在推論中...'}</span>
                    </div>
                    <div class="flex items-center justify-between pt-1 border-t border-darkBorder/50 text-[11px] text-slate-400 select-none">
                        <div class="flex items-center space-x-2">
                            <button type="button" class="btn-copy-msg hover:text-purple-300 flex items-center space-x-1 cursor-pointer transition px-2 py-0.5 rounded bg-slate-900/80 border border-slate-700 hover:border-purple-500/60">
                                <i data-lucide="copy" class="w-3 h-3 text-purple-400"></i>
                                <span class="copy-label">${dict.copyBtn || '複製'}</span>
                            </button>
                            <button type="button" class="btn-retry-msg hover:text-sky-300 flex items-center space-x-1 cursor-pointer transition px-2 py-0.5 rounded bg-slate-900/80 border border-slate-700 hover:border-sky-500/60" data-query="${encodeURIComponent(query)}">
                                <i data-lucide="rotate-ccw" class="w-3 h-3 text-sky-400"></i>
                                <span class="retry-label">${dict.retryBtn || '重試'}</span>
                            </button>
                        </div>
                        <span class="text-[10px] text-slate-500 font-mono">${new Date().toLocaleTimeString()}</span>
                    </div>
                </div>
            `;

            container.appendChild(aiDiv);
            container.scrollTop = container.scrollHeight;
            if (window.lucide) lucide.createIcons();

            contentEl = document.getElementById(contentId);
            const copyBtn2 = aiDiv.querySelector('.btn-copy-msg');
            if (copyBtn2) copyBtn2.addEventListener('click', () => this.copyToClipboard(contentEl ? contentEl.innerText : query, copyBtn2));
            const retryBtn2 = aiDiv.querySelector('.btn-retry-msg');
            if (retryBtn2) retryBtn2.addEventListener('click', () => {
                const q = decodeURIComponent(retryBtn2.getAttribute('data-query') || query);
                this.appendUserMessage(q);
                this.simulateHermesReasoning(q);
            });
        }

        const sysPrompt = this.currentLang === 'zh-TW'
            ? 'You are Hermes, a powerful autonomous AI agent integrated into Webcom AI Console. Answer in Traditional Chinese (zh-TW). Be concise, helpful, and accurate.'
            : 'You are Hermes, a powerful autonomous AI agent integrated into Webcom AI Console. Answer in English. Be concise, helpful, and accurate.';

        const reqTemp = (options && typeof options.temperature === 'number') ? options.temperature : 0.7;
        const body = {
            model: model || 'auto',
            messages: [{ role: 'system', content: sysPrompt }, { role: 'user', content: query }],
            stream: true,
            max_tokens: 1024,
            temperature: reqTemp
        };

        try {
            const resp = await fetch(`${endpoint}/chat/completions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
                body: JSON.stringify(body)
            });

            if (!resp.ok) {
                const errTxt = await resp.text();
                const status = resp.status;

                // User Requirement: API 有可能發生 err500 透過jev 判斷 5秒後重試
                if ((status >= 500 && status <= 504) || status === 429) {
                    if (retryCount < 3) {
                        const jevRes = await this.evalJevDecision(
                            `API returned HTTP ${status} Internal Server Error (${errTxt.slice(0, 100)}). Server temporary failure detected. Evaluate retry recovery.`,
                            [
                                "5秒後自動重試 (retry_after_5s)",
                                "立即終止並顯示錯誤 (abort_immediately)",
                                "切換本機離線推論 (offline_fallback)"
                            ],
                            0.35
                        );

                        this.logTerminal(`[Jev 決策分流] 遭遇 HTTP ${status} 暫態錯誤 -> 決策: ${jevRes.best_option} (信心度: ${jevRes.confidence}%, 耗時: ${jevRes.latency_ms}ms)`);

                        return this._handleJevRetryCountdown({
                            query, container, dict, retryCount,
                            status, errTxt, contentEl, jevRes,
                            delaySeconds: 5
                        });
                    } else {
                        const finalJev = await this.evalJevDecision(
                            `API 500 error repeated ${retryCount} times. System should abort and advise checking router or falling back.`,
                            ["立即終止並顯示錯誤 (abort_immediately)", "切換本機離線推論 (offline_fallback)"]
                        );
                        if (contentEl) {
                            contentEl.innerHTML = `
                                <div class="space-y-2 p-3 rounded-xl bg-rose-950/40 border border-rose-600/50 text-xs select-text">
                                    <div class="flex items-center gap-2 text-rose-300 font-bold">
                                        <span>⚠️ API 伺服器錯誤 (HTTP ${status}) - 已重試 ${retryCount} 次仍未恢復</span>
                                    </div>
                                    <p class="text-slate-300 leading-relaxed">
                                        ⚡ Jev 終止決策: <strong class="text-amber-300">${finalJev.best_option}</strong>。<br>
                                        伺服器持續回傳 500 內部錯誤。請點擊上方「設定」切換 API 端點或確認模型名稱。
                                    </p>
                                </div>
                            `;
                        }
                        return;
                    }
                }

                if (contentEl) contentEl.innerHTML = `<span class="text-red-400">⚠️ API 錯誤 (${resp.status})：${errTxt.slice(0, 200)}<br>${this.currentLang === 'zh-TW' ? '請在「Router 設定」確認 API Endpoint 與金鑰是否正確。' : 'Check your API Endpoint and Key in Router Settings.'}</span>`;
                return;
            }

            const reader = resp.body.getReader();
            const decoder = new TextDecoder();
            let fullText = '';
            if (contentEl) contentEl.textContent = '';
            let isLoopIntercepted = false;

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true });
                for (const line of chunk.split('\n')) {
                    if (!line.startsWith('data:')) continue;
                    const data = line.slice(5).trim();
                    if (data === '[DONE]') break;
                    try {
                        const delta = JSON.parse(data)?.choices?.[0]?.delta?.content || '';
                        if (delta) {
                            fullText += delta;
                            if (contentEl) {
                                contentEl.textContent = fullText;
                                container.scrollTop = container.scrollHeight;
                            }

                            // Hallucination Loop Guard Check
                            if (fullText.length >= 35) {
                                const loopInfo = this.detectHallucinationLoop(fullText);
                                if (loopInfo) {
                                    isLoopIntercepted = true;
                                    try { await reader.cancel(); } catch (_) {}

                                    // Cleanly truncate repeating tail
                                    fullText = loopInfo.cleanText;
                                    if (contentEl) contentEl.textContent = fullText;

                                    const jevRes = await this.evalJevDecision(
                                        `LLM generation entered repetitive hallucination loop (${loopInfo.type}: "${loopInfo.pattern.slice(0, 30)}...", repeat count: ${loopInfo.count}). Intervene to prevent degenerative runaway.`,
                                        [
                                            "中斷生成並修剪循環 (truncate_and_warn)",
                                            "降低溫度重新推論 (retry_lower_temp)",
                                            "切換備用模型重試 (switch_model_fallback)"
                                        ],
                                        0.35
                                    );

                                    this.logTerminal(`[Jev 幻覺防護] 攔截重複生成死循環 (${loopInfo.type}: "${loopInfo.pattern.slice(0, 25)}...", 次數: ${loopInfo.count}) -> 決策: ${jevRes.best_option} (信心度: ${jevRes.confidence}%, 耗時: ${jevRes.latency_ms}ms)`);

                                    this._renderHallucinationGuardCard({
                                        query, container, dict, contentEl, loopInfo, jevRes, fullText
                                    });
                                    break;
                                }
                            }
                        }
                    } catch (_) {}
                }
                if (isLoopIntercepted) break;
            }

            if (!fullText && !isLoopIntercepted && contentEl) {
                contentEl.innerHTML = `<span class="text-slate-400">${this.currentLang === 'zh-TW' ? '推論完成，但 API 未回傳內容。請確認模型已載入或更換 API 端點。' : 'Inference complete, but no content returned. Ensure model is loaded or change the API endpoint.'}</span>`;
            }
        } catch (err) {
            const is500 = err.message && (err.message.includes('500') || err.message.includes('Internal Server Error'));
            if (is500 && retryCount < 3) {
                const jevRes = await this.evalJevDecision(
                    `API network error 500: ${err.message}`,
                    [
                        "5秒後自動重試 (retry_after_5s)",
                        "立即終止並顯示錯誤 (abort_immediately)",
                        "切換本機離線推論 (offline_fallback)"
                    ],
                    0.35
                );
                return this._handleJevRetryCountdown({
                    query, container, dict, retryCount,
                    status: 500, errTxt: err.message, contentEl, jevRes,
                    delaySeconds: 5
                });
            }
            if (contentEl) contentEl.innerHTML = `<span class="text-red-400">⚠️ 無法連線至 API (${endpoint})：${err.message}<br>${this.currentLang === 'zh-TW' ? '請確認 API 服務已啟動，或切換至其他推論節點。' : 'Check if the API service is running, or switch to another inference node.'}</span>`;
        }
    }

    showJevModal() {
        const backdrop = document.getElementById('modal-backdrop');
        const title = document.getElementById('modal-title');
        const body = document.getElementById('modal-body');
        const actionBtn = document.getElementById('btn-modal-action');

        title.innerHTML = `<span>⚡</span><span>Jev 單次傳播極速決策沙盒 (~15ms Cross-Encoder)</span>`;
        body.innerHTML = `
            <div class="space-y-3.5 text-xs">
                <p class="text-slate-300">Jev 利用極輕量 Cross-Encoder 模型 (如 BGE-Reranker-Base 或 MiniLM)，以 <strong>單次前向傳播 (Single-Pass)</strong> 在 10~15ms 內對候選行動給出確定性排序，完全跳過大模型的多 Token 自回歸延遲：</p>

                <div class="flex items-center gap-2 flex-wrap">
                    <span class="text-slate-400 font-bold">測試情境：</span>
                    <button type="button" id="btn-jev-scen-route" class="px-2.5 py-1 rounded bg-purple-600 text-white font-bold transition text-xs cursor-pointer">1. 任務與工具路由</button>
                    <button type="button" id="btn-jev-scen-err500" class="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition text-xs cursor-pointer">2. API 500 錯誤自癒重試 (5秒)</button>
                    <button type="button" id="btn-jev-scen-loop" class="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition text-xs cursor-pointer">3. 幻覺循環攔截 (Loop Guard)</button>
                </div>

                <div id="jev-scenario-desc" class="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5 font-mono">
                    <div class="text-slate-400">當前任務狀態: <code class="text-sky-300">"User requested Fibonacci series computation"</code></div>
                    <div class="text-slate-400">決策選項:</div>
                    <ul class="list-disc list-inside text-slate-300 pl-2 space-y-0.5">
                        <li>Option 1: run_python (Pyodide in-browser WASM)</li>
                        <li>Option 2: terminal (host shell via daemon)</li>
                        <li>Option 3: clarify (ask for more details)</li>
                    </ul>
                </div>

                <div id="jev-output" class="text-emerald-400 font-mono bg-black/50 p-3 rounded-xl border border-slate-800/80 min-h-[60px] flex items-center">點擊「執行快速決策」進行評估...</div>
            </div>
        `;

        let currentScenario = 'route';
        const scenDesc = body.querySelector('#jev-scenario-desc');
        const btnRoute = body.querySelector('#btn-jev-scen-route');
        const btnErr500 = body.querySelector('#btn-jev-scen-err500');
        const btnLoop = body.querySelector('#btn-jev-scen-loop');

        const resetBtnClasses = () => {
            btnRoute.className = "px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition text-xs cursor-pointer";
            btnErr500.className = "px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition text-xs cursor-pointer";
            btnLoop.className = "px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition text-xs cursor-pointer";
        };

        btnRoute?.addEventListener('click', () => {
            currentScenario = 'route';
            resetBtnClasses();
            btnRoute.className = "px-2.5 py-1 rounded bg-purple-600 text-white font-bold transition text-xs cursor-pointer";
            scenDesc.innerHTML = `
                <div class="text-slate-400">當前任務狀態: <code class="text-sky-300">"User requested Fibonacci series computation"</code></div>
                <div class="text-slate-400">決策選項:</div>
                <ul class="list-disc list-inside text-slate-300 pl-2 space-y-0.5">
                    <li>Option 1: run_python (Pyodide in-browser WASM)</li>
                    <li>Option 2: terminal (host shell via daemon)</li>
                    <li>Option 3: clarify (ask for more details)</li>
                </ul>
            `;
        });

        btnErr500?.addEventListener('click', () => {
            currentScenario = 'err500';
            resetBtnClasses();
            btnErr500.className = "px-2.5 py-1 rounded bg-amber-600 text-white font-bold transition text-xs cursor-pointer";
            scenDesc.innerHTML = `
                <div class="text-slate-400">當前錯誤狀態: <code class="text-amber-300">"API returned HTTP 500 Internal Server Error (Server transient failure)"</code></div>
                <div class="text-slate-400">決策選項:</div>
                <ul class="list-disc list-inside text-slate-300 pl-2 space-y-0.5">
                    <li>Option 1: 5秒後自動重試 (retry_after_5s)</li>
                    <li>Option 2: 立即終止並顯示錯誤 (abort_immediately)</li>
                    <li>Option 3: 切換本機離線推論 (offline_fallback)</li>
                </ul>
            `;
        });

        btnLoop?.addEventListener('click', () => {
            currentScenario = 'loop';
            resetBtnClasses();
            btnLoop.className = "px-2.5 py-1 rounded bg-rose-600 text-white font-bold transition text-xs cursor-pointer";
            scenDesc.innerHTML = `
                <div class="text-slate-400">當前異常狀態: <code class="text-rose-300">"LLM generation entered repetitive hallucination loop (repeating phrase 4 times)"</code></div>
                <div class="text-slate-400">決策選項:</div>
                <ul class="list-disc list-inside text-slate-300 pl-2 space-y-0.5">
                    <li>Option 1: 中斷生成並修剪循環 (truncate_and_warn)</li>
                    <li>Option 2: 降低溫度重新推論 (retry_lower_temp)</li>
                    <li>Option 3: 切換備用模型重試 (switch_model_fallback)</li>
                </ul>
            `;
        });

        actionBtn.innerText = "執行快速決策";
        actionBtn.onclick = async () => {
            const out = document.getElementById('jev-output');
            out.innerHTML = '<span class="text-purple-400 animate-pulse">Jev Cross-Encoder 正在進行單次傳播計算...</span>';

            let state = "User requested Fibonacci series computation";
            let options = ["run_python (Pyodide in-browser WASM)", "terminal (host shell via daemon)", "clarify (ask for more details)"];

            if (currentScenario === 'err500') {
                state = "API returned HTTP 500 Internal Server Error: transient server overload. Evaluate recovery.";
                options = ["5秒後自動重試 (retry_after_5s)", "立即終止並顯示錯誤 (abort_immediately)", "切換本機離線推論 (offline_fallback)"];
            } else if (currentScenario === 'loop') {
                state = "LLM generation entered repetitive hallucination loop (repeating sentence: '請確認以下系統安全配置項目' 4 times). Prevent degenerative loop.";
                options = ["中斷生成並修剪循環 (truncate_and_warn)", "降低溫度重新推論 (retry_lower_temp)", "切換備用模型重試 (switch_model_fallback)"];
            }

            const res = await this.evalJevDecision(state, options, 0.35);

            out.innerHTML = `
                <div class="w-full">
                    <div class="font-bold flex items-center justify-between text-white">
                        <span>✔ Jev 決策完成 (${res.model || 'Single-Pass'})</span>
                        <span class="text-slate-400 text-[10px] font-mono">耗時: ${res.latency_ms} ms</span>
                    </div>
                    <div class="mt-1 text-slate-200">
                        首選動作: <code class="text-amber-300 font-bold bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-700/50">${res.best_option}</code>
                        <span class="text-emerald-400 font-bold ml-2 font-mono">(${res.confidence}%)</span>
                    </div>
                    <div class="text-slate-400 text-[10px] mt-1.5 flex flex-wrap gap-2 border-t border-slate-800 pt-1">
                        ${(res.decisions || []).slice(1).map(d => `<span>次選: ${d.option} (${d.prob}%)</span>`).join(' | ')}
                    </div>
                </div>
            `;
        };

        backdrop.classList.remove('hidden');
        backdrop.classList.add('flex');
    }


    async showSyncModal() {
        const backdrop = document.getElementById('modal-backdrop');
        const title = document.getElementById('modal-title');
        const body = document.getElementById('modal-body');
        const actionBtn = document.getElementById('btn-modal-action');

        title.innerHTML = `<span>🔄</span><span>Hermes Agent Upstream 原生同步工具</span>`;
        body.innerHTML = `
            <div class="space-y-3 text-xs">
                <p class="text-slate-300">本工具將比對 Upstream (NousResearch / portable-hermes-agent) 的原生工具清單與 Webcom AI 的適配器：</p>
                <div class="bg-slate-950 p-2.5 rounded border border-slate-800 space-y-1">
                    <div class="text-slate-400">來源封包: <code class="text-sky-300">C:\\Apps\\portable-hermes-agent-main.zip</code></div>
                    <div class="text-slate-400">目標 Manifest: <code class="text-purple-300">hermes_bridge/schema/hermes_tools_manifest.json</code></div>
                    <div class="text-slate-400">適配器目錄: <code class="text-emerald-300">hermes_bridge/adapters/*.js (101 款)</code></div>
                </div>
                <div id="sync-output" class="text-slate-400">點擊下方「開始執行差異分析」以同步最新變更...</div>
            </div>
        `;
        actionBtn.innerText = "開始執行差異分析";
        actionBtn.onclick = async () => {
            const out = document.getElementById('sync-output');
            out.innerHTML = `<span class="text-purple-400 animate-pulse">正在掃描與同步 Upstream 工具...</span>`;
            try {
                const resp = await fetch('http://127.0.0.1:8001/api/hermes/sync', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ upstream_path: "C:\\Apps\\portable-hermes-agent-main.zip" })
                });
                if (resp.ok) {
                    const data = await resp.json();
                    out.innerHTML = `
                        <div class="text-emerald-400 font-bold mb-1">✔ 同步完成！</div>
                        <pre class="bg-black/40 p-2 rounded max-h-60 overflow-y-auto text-[10px] text-slate-300">${data.report || data.stdout}</pre>
                    `;
                } else {
                    out.innerHTML = `<div class="text-red-400">同步失敗: Daemon 回應 ${resp.status}。</div>`;
                }
            } catch (e) {
                out.innerHTML = `
                    <div class="space-y-1">
                        <div class="text-amber-400 font-medium">⚠️ 純 index 離線模式：無法連線至 Host Daemon (8001)</div>
                        <div class="text-slate-400 text-[11px]">
                            目前已啟用靜態工具契約清單 (共 101 款核心適配器已內建)。<br>
                            若需執行完整的實體檔案解壓縮與重新產生適配器，請至專案目錄執行：<br>
                            <code class="text-sky-300">python sync/sync_upstream_hermes.py</code> 或執行 <code class="text-sky-300">SYNC_UPSTREAM.bat</code>
                        </div>
                    </div>
                `;
            }
        };

        backdrop.classList.remove('hidden');
        backdrop.classList.add('flex');
    }

    async showDiagModal() {
        const backdrop = document.getElementById('modal-backdrop');
        const title = document.getElementById('modal-title');
        const body = document.getElementById('modal-body');
        const actionBtn = document.getElementById('btn-modal-action');

        title.innerHTML = `<span>🩺</span><span>${this.currentLang === 'en' ? 'System Diagnostics & Error Monitor' : '系統自我檢測與錯誤監控中心'}</span>`;
        body.innerHTML = `<div class="text-slate-400 animate-pulse text-xs">${this.currentLang === 'en' ? 'Probing ports, daemon and service matrix...' : '正在探測本機連接埠與 AI 服務狀態...'}</div>`;
        actionBtn.innerText = this.currentLang === 'en' ? "Re-diagnose" : "重新檢測";
        actionBtn.onclick = () => this.showDiagModal();

        backdrop.classList.remove('hidden');
        backdrop.classList.add('flex');

        const daemonBase = this.activeDaemonUrl || this.dispatcher?.daemonUrl || 'http://127.0.0.1:8001';
        let diagData = null;
        let daemonErrorDetail = null;

        try {
            const resp = await fetch(`${daemonBase}/api/hermes/status`, { signal: AbortSignal.timeout(3000) });
            if (resp.ok) {
                diagData = await resp.json();
            } else {
                daemonErrorDetail = `HTTP ${resp.status} - ${await resp.text()}`;
            }
        } catch (e) {
            daemonErrorDetail = e.message || String(e);
        }

        // Collect caught runtime errors
        const caughtErrors = window.webcomErrors || [];
        const hasErrors = caughtErrors.length > 0;

        let errorLogHtml = '';
        if (hasErrors) {
            errorLogHtml = caughtErrors.slice(-5).reverse().map(err => `
                <div class="bg-red-950/30 border border-red-800/40 rounded p-2 text-[11px] font-mono space-y-0.5 select-text">
                    <div class="flex items-center justify-between text-red-300 font-bold">
                        <span>[${err.time}] ${err.type}</span>
                        <span class="text-slate-400 text-[10px]">${err.source || 'inline'}${err.location ? ':' + err.location : ''}</span>
                    </div>
                    <div class="text-slate-200 select-text break-all">${err.message}</div>
                </div>
            `).join('');
        } else {
            errorLogHtml = `
                <div class="bg-emerald-950/20 border border-emerald-800/30 rounded p-2 text-xs text-emerald-400 flex items-center gap-1.5">
                    <i data-lucide="check-circle" class="w-3.5 h-3.5 shrink-0"></i>
                    <span>${this.currentLang === 'en' ? 'Zero runtime exceptions caught in current session.' : '目前工作階段無任何未捕捉之執行時例外錯誤 (0 Errors)。'}</span>
                </div>
            `;
        }

        let daemonHtml = '';
        if (diagData) {
            daemonHtml = `
                <div class="space-y-2">
                    <div class="flex items-center justify-between text-xs font-bold text-slate-300">
                        <span>${this.currentLang === 'en' ? 'Host Companion Services Matrix' : '本機生態服務連線矩陣'}</span>
                        <span class="text-emerald-400 font-mono text-[11px]">Daemon Online (${daemonBase})</span>
                    </div>
                    <div class="grid grid-cols-2 gap-2 text-xs font-mono">
                        <div class="bg-slate-950 p-2 rounded border border-slate-800">
                            <span class="text-slate-400">Host Daemon (8001):</span>
                            <span class="text-emerald-400 font-bold float-right">${diagData.services?.host_daemon?.status || 'online'}</span>
                        </div>
                        <div class="bg-slate-950 p-2 rounded border border-slate-800">
                            <span class="text-slate-400">LM Studio (1234):</span>
                            <span class="${diagData.services?.lm_studio?.status === 'online' ? 'text-emerald-400' : 'text-slate-500'} font-bold float-right">${diagData.services?.lm_studio?.status || 'offline'}</span>
                        </div>
                        <div class="bg-slate-950 p-2 rounded border border-slate-800">
                            <span class="text-slate-400">ComfyUI (5000):</span>
                            <span class="${diagData.services?.comfyui?.status === 'online' ? 'text-emerald-400' : 'text-slate-500'} font-bold float-right">${diagData.services?.comfyui?.status || 'offline'}</span>
                        </div>
                        <div class="bg-slate-950 p-2 rounded border border-slate-800">
                            <span class="text-slate-400">TTS Server (8200):</span>
                            <span class="${diagData.services?.tts_server?.status === 'online' ? 'text-emerald-400' : 'text-slate-500'} font-bold float-right">${diagData.services?.tts_server?.status || 'offline'}</span>
                        </div>
                        <div class="bg-slate-950 p-2 rounded border border-slate-800">
                            <span class="text-slate-400">Music Server (9150):</span>
                            <span class="${diagData.services?.music_server?.status === 'online' ? 'text-emerald-400' : 'text-slate-500'} font-bold float-right">${diagData.services?.music_server?.status || 'offline'}</span>
                        </div>
                        <div class="bg-slate-950 p-2 rounded border border-slate-800">
                            <span class="text-slate-400">NVIDIA GPU:</span>
                            <span class="text-sky-300 font-mono text-[10px] float-right truncate max-w-[130px]" title="${diagData.gpu || ''}">${diagData.gpu || 'None/CPU'}</span>
                        </div>
                    </div>
                </div>
            `;
        } else {
            daemonHtml = `
                <div class="space-y-2 bg-amber-950/20 border border-amber-800/40 rounded-xl p-3 text-xs">
                    <div class="text-amber-400 font-bold flex items-center gap-1.5">
                        <i data-lucide="alert-triangle" class="w-4 h-4 shrink-0 text-amber-400"></i>
                        <span>${this.currentLang === 'en' ? 'Host Daemon (Port 8001) Offline' : 'Host Daemon (Port 8001) 未連線'}</span>
                    </div>
                    <div class="text-slate-300 text-[11px] leading-relaxed">
                        探測端點：<code class="text-sky-300 font-mono">${daemonBase}</code><br>
                        失敗詳情：<code class="text-rose-300 font-mono">${daemonErrorDetail || window.lastDaemonError || 'Connection Refused'}</code>
                    </div>
                    <div class="pt-1 text-slate-400 text-[11px]">
                        💡 <strong>排障指引</strong>：<br>
                        1. 若透過 <code class="text-emerald-300">START.bat</code> 啟動，請確認命令提示字元視窗是否仍開啟中，且無 Python 拋錯。<br>
                        2. 若由瀏覽器開啟 <code class="text-sky-300">file://</code> 協議，請改至網址列輸入 <code class="text-emerald-300 font-bold">http://127.0.0.1:8001/</code> 開啟，可享有零跨域限制之完整體驗。<br>
                        3. 純 WASM 離線模式下，Pyodide 本地 Python、Web Serial 序列埠直連、ONNX 本地模型仍 100% 正常可用！
                    </div>
                </div>
            `;
        }

        body.innerHTML = `
            <div class="space-y-3.5 select-text">
                ${daemonHtml}
                <hr class="border-slate-800">
                <div class="space-y-2">
                    <div class="flex items-center justify-between text-xs font-bold text-slate-300">
                        <span class="flex items-center gap-1.5">
                            <i data-lucide="bug" class="w-3.5 h-3.5 text-rose-400"></i>
                            <span>${this.currentLang === 'en' ? 'Runtime Exception & Error Log Console' : '即時例外錯誤記錄 (Error Monitor)'}</span>
                        </span>
                        <span class="text-[10px] px-2 py-0.5 rounded-full ${hasErrors ? 'bg-red-950 text-red-300 border border-red-700/50' : 'bg-emerald-950 text-emerald-300 border border-emerald-700/50'} font-mono">${caughtErrors.length} captured</span>
                    </div>
                    <div class="space-y-1.5 max-h-40 overflow-y-auto">
                        ${errorLogHtml}
                    </div>
                </div>
                <div class="pt-1 flex items-center justify-between gap-2 border-t border-slate-800/80">
                    <button id="btn-copy-diag-report" type="button" class="text-xs bg-purple-900/60 hover:bg-purple-800 text-purple-200 px-3 py-1.5 rounded-lg border border-purple-600/50 flex items-center gap-1.5 font-semibold transition cursor-pointer">
                        <i data-lucide="copy" class="w-3.5 h-3.5 text-purple-300"></i>
                        <span>${this.currentLang === 'en' ? 'Copy Full Diagnostic Report' : '📋 複製完整排障報告'}</span>
                    </button>
                    <button id="btn-clear-error-logs" type="button" class="text-[11px] text-slate-400 hover:text-slate-200 transition underline cursor-pointer">
                        ${this.currentLang === 'en' ? 'Clear error logs' : '清空錯誤記錄'}
                    </button>
                </div>
            </div>
        `;

        if (window.lucide) lucide.createIcons();

        // Wire Copy Full Diagnostic Report
        const btnCopyReport = document.getElementById('btn-copy-diag-report');
        if (btnCopyReport) {
            btnCopyReport.addEventListener('click', () => {
                const report = [
                    '# Webcom AI 系統自我檢測與排障報告',
                    `- 時間: ${new Date().toISOString()}`,
                    `- URL 協定: ${window.location.protocol} (${window.location.href})`,
                    `- 使用者瀏覽器: ${navigator.userAgent}`,
                    `- 視窗解析度: ${window.innerWidth} x ${window.innerHeight}`,
                    `- 語系: ${this.currentLang}`,
                    `- 主推論引擎: ${this.activeEngine}`,
                    `- 作用中 Profile: ${this.activeProfileId} (${this.profiles[this.activeProfileId]?.endpoint || 'none'})`,
                    `- Host Daemon 連線: ${this.daemonOnline ? 'ONLINE (' + daemonBase + ')' : 'OFFLINE'}`,
                    `- 最近 Daemon 連線錯誤: ${window.lastDaemonError || 'None'}`,
                    '',
                    '## 生態服務矩陣',
                    diagData ? JSON.stringify(diagData.services, null, 2) : '無 (Daemon 離線)',
                    '',
                    '## 本機 GPU 狀態',
                    diagData ? diagData.gpu : '未知',
                    '',
                    hasErrors ? caughtErrors.map((e, idx) => `${idx + 1}. [${e.time}] ${e.type}: ${e.message}\n   來源: ${e.source} (${e.location})\n   堆疊: ${e.stack || '無'}`).join('\n\n') : '無任何例外錯誤 (Clean)'
                ].join('\n');

                if (navigator.clipboard) {
                    navigator.clipboard.writeText(report).then(() => {
                        const lbl = btnCopyReport.querySelector('span');
                        if (lbl) {
                            const orig = lbl.innerText;
                            lbl.innerText = this.currentLang === 'en' ? '✔ Report Copied!' : '✔ 報告已複製至剪貼簿！';
                            setTimeout(() => { lbl.innerText = orig; }, 2000);
                        }
                    });
                }
            });
        }

        // Wire Clear Error Logs
        const btnClearErrors = document.getElementById('btn-clear-error-logs');
        if (btnClearErrors) {
            btnClearErrors.addEventListener('click', () => {
                window.webcomErrors = [];
                this.showDiagModal();
            });
        }
    }
}

// Universal bootstrap: supports both DOMContentLoaded and already-interactive state
function startWebcomApp() {
    if (!window.webcomApp) {
        window.webcomApp = new WebcomAIApp();
    }
    window.sendPyodideCode = (code, title) => window.webcomApp?.sendPyodideCode(code, title);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startWebcomApp);
} else {
    startWebcomApp();
}

// ================================================================
// Enhanced Features: TokenTable Quick Fill & Serial Bar Toggle & Long Code Stream
// ================================================================
document.addEventListener('DOMContentLoaded', () => {
    // 1. TokenTable Quick Fill
    const btnQuickFillTokenTable = document.getElementById('btn-quick-fill-tokentable');
    if (btnQuickFillTokenTable) {
        btnQuickFillTokenTable.addEventListener('click', () => {
            const apiEndpointInput = document.getElementById('cfg-prof-endpoint') || document.getElementById('cfg-api-endpoint');
            const apiModelInput = document.getElementById('cfg-prof-model') || document.getElementById('cfg-api-model');
            if (apiEndpointInput) apiEndpointInput.value = 'https://tokentable.asia/v1';
            if (apiModelInput) apiModelInput.value = 'qwen3.8-flash';
            
            // Switch main profile selector to tokentable
            const profileSel = document.getElementById('main-profile-select');
            if (profileSel) profileSel.value = 'tokentable';
            const modalProfSel = document.getElementById('modal-profile-select');
            if (modalProfSel) modalProfSel.value = 'tokentable';
            
            if (window.app) {
                if (window.app.profiles && window.app.profiles['tokentable']) {
                    window.app.profiles['tokentable'].endpoint = 'https://tokentable.asia/v1';
                    window.app.profiles['tokentable'].model = 'qwen3.8-flash';
                    window.app.activeProfileId = 'tokentable';
                }
                if (window.app.saveSettings) window.app.saveSettings();
            }
            if (typeof alert === 'function') {
                try {
                    alert((window.app && window.app.currentLang === 'en') ? 'TokenTable recommended endpoint & model applied!' : '已成功載入 TokenTable 推薦端點與模型！');
                } catch (_) {}
            }
        });
    }

    // 2. Serial Controls Bar Tab Switching
    const serialBar = document.getElementById('serial-controls-bar');
    const allTermTabs = document.querySelectorAll('.term-tab');

    allTermTabs.forEach(t => {
        t.addEventListener('click', () => {
            if (t.id === 'tab-serial') {
                if (serialBar) serialBar.classList.remove('hidden');
            } else {
                if (serialBar) serialBar.classList.add('hidden');
            }
        });
    });

    // 3. Terminal Quick Actions
    document.getElementById('btn-term-clear-top')?.addEventListener('click', () => {
        document.getElementById('btn-term-clear')?.click();
    });

    document.getElementById('btn-term-copy-top')?.addEventListener('click', () => {
        const text = document.getElementById('terminal-screen')?.innerText || '';
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(() => {
                alert((window.app && window.app.currentLang === 'en') ? 'Terminal screen copied!' : '終端機畫面已複製至剪貼簿！');
            });
        }
    });

    document.getElementById('btn-term-break')?.addEventListener('click', () => {
        const logs = document.getElementById('term-logs');
        if (logs) {
            const d = document.createElement('div');
            d.className = 'text-rose-400 font-mono text-xs';
            d.textContent = '^C [SIGINT - Process Interrupted]';
            logs.appendChild(d);
        }
    });

    // 4. Dropdown Top Tools shortcuts
    document.getElementById('btn-open-artifact-menu')?.addEventListener('click', () => {
        document.getElementById('btn-open-artifact')?.click();
        document.getElementById('dropdown-top-tools')?.classList.add('hidden');
    });
    document.getElementById('btn-open-app-lib-menu')?.addEventListener('click', () => {
        document.getElementById('btn-open-app-lib')?.click();
        document.getElementById('dropdown-top-tools')?.classList.add('hidden');
    });
    document.getElementById('btn-open-guide-menu')?.addEventListener('click', () => {
        document.getElementById('btn-open-guide')?.click();
        document.getElementById('dropdown-top-tools')?.classList.add('hidden');
    });
    document.getElementById('btn-open-rag-menu')?.addEventListener('click', () => {
        document.getElementById('btn-open-rag')?.click();
        document.getElementById('dropdown-top-tools')?.classList.add('hidden');
    });
    document.getElementById('btn-open-mcp-menu')?.addEventListener('click', () => {
        document.getElementById('btn-open-mcp')?.click();
        document.getElementById('dropdown-top-tools')?.classList.add('hidden');
    });
});
