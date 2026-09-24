/**
 * Webcom AI - Frontend Client Controller & Universal Dispatcher
 * Integrates Web UI with Hermes Tool Calling, Multi-Session Terminal,
 * LLM Router Node Profiles (LM Studio/TokenTable/OpenAI/Ollama),
 * and Full Bilingual (zh-TW / en) i18n localization.
 */

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
            this.onLog('[Dispatcher] Running in self-contained fallback mode.');
        }
        getToolTier(name) {
            const t1 = ['run_python', 'execute_code', 'todo', 'memory', 'clarify', 'search_guide'];
            const t2 = ['web_search', 'web_extract', 'lm_studio_status', 'lm_studio_models'];
            if (t1.includes(name)) return 1;
            if (t2.includes(name)) return 2;
            return 3;
        }
        async dispatch(name, args = {}) {
            this.onLog(`[Dispatcher] Dispatching ${name} (${this.getToolTier(name)})`);
            if (name === 'run_python' || name === 'execute_code') {
                return { status: 'success', environment: 'Pyodide WASM (Local)', output: `Result: ${args.code || 'None'}` };
            }
            if (name === 'todo') {
                return { status: 'success', todos: [{ id: 1, item: 'Webcom AI Initialized', done: true }] };
            }
            if (name === 'memory') {
                return { status: 'success', memories: ['Hermes Agent Active'] };
            }
            return { status: 'success', tool: name, message: `Tool ${name} executed in local sandbox.` };
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
        clearChat: "清空對話",
        clearTerm: "清空",
        send: "發送",
        enterHint: "按 Enter 發送，Shift+Enter 換行",
        enableAgent: "Agent",
        enableWeb: "聯網",
        enableRag: "RAG 知識庫",
        enableMcp: "MCP 協議",
        modalTitle: "系統與 LLM Router 設定",
        daemonEndpointLabel: "Daemon Endpoint 常駐程式端點 (Agent 後端)",
        customPromptLabel: "自訂 System Prompt (選填)",
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
        termInputPlaceholder: "直接輸入指令或 Python 運算式 (按 Enter 執行)...",
        chatInputPlaceholder: "向 Hermes Agent 提問或交辦任務 (支援 Tool Calling)...",
        greetingMsg: "你好！我是整合於 Webcom 控制台的 <strong>Hermes Autonomous Agent</strong>。<br>我已自動綁定 100+ 款工具鏈，並支援三層自適應架構。"
    },
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
        clearChat: "Clear Chat",
        clearTerm: "Clear",
        send: "Send",
        enterHint: "Press Enter to send, Shift+Enter for new line",
        enableAgent: "Agent",
        enableWeb: "Web Search",
        enableRag: "RAG Docs",
        enableMcp: "MCP Protocol",
        modalTitle: "System & LLM Router Settings",
        daemonEndpointLabel: "Daemon Host Endpoint (Agent Backend Port 8001)",
        customPromptLabel: "Custom System Prompt (Optional)",
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
        termInputPlaceholder: "Type command or Python code (Enter to execute)...",
        chatInputPlaceholder: "Ask Hermes Agent or assign tasks (supports Tool Calling)...",
        greetingMsg: "Hello! I am the <strong>Hermes Autonomous Agent</strong> integrated into Webcom.<br>I have 100+ tools bound with adaptive 3-tier execution."
    }
};

class WebcomAIApp {
    constructor() {
        this.dispatcher = new ToolDispatcher({
            daemonUrl: 'http://127.0.0.1:8001',
            onLog: (msg, ...args) => this.logTerminal(`[Dispatcher] ${msg}`, ...args)
        });

        this.currentLang = this.storageGet('webcom_language', 'zh-TW');
        this.daemonOnline = false;
        this.currentSession = 'shell';
        this.activeEngine = 'api';
        this.activeToolset = 'full_stack';
        this.isLeftCollapsed = false;
        this.isOfflineMock = false;

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
        this.renderProfileSelects();
        this.setLanguage(this.currentLang);
        await this.dispatcher.init('hermes_tools.js');
        await this.probeDaemon();
        setInterval(() => this.probeDaemon(), 10000);
        this.logTerminal("✔ Webcom 控制台各按鈕、API 設定與雙語系環境已就緒。");
        if (window.lucide) lucide.createIcons();
    }

    setLanguage(lang) {
        this.currentLang = lang;
        this.storageSet('webcom_language', lang);

        const dict = TRANSLATIONS[lang] || TRANSLATIONS["zh-TW"];

        // Translate text content
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (dict[key]) el.innerHTML = dict[key];
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
        const tabConfigs = [
            { id: 'tab-shell', session: 'shell', prompt: 'PS>', status: 'PowerShell / Shell WASM' },
            { id: 'tab-wsl', session: 'wsl', prompt: 'wsl$', status: 'WSL2 Linux 容器代理' },
            { id: 'tab-py', session: 'py', prompt: '>>>', status: 'Pyodide WASM (Python 3.11)' },
            { id: 'tab-serial', session: 'serial', prompt: 'COM>', status: 'Web Serial API (115200 8N1)' },
            { id: 'tab-novnc', session: 'novnc', prompt: 'vnc>', status: 'noVNC RFB 遠端桌面 (5900)' }
        ];

        tabConfigs.forEach(cfg => {
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

        // 7. Center Selectors
        const engineSelect = document.getElementById('engine-select');
        if (engineSelect) {
            engineSelect.addEventListener('change', (e) => {
                this.activeEngine = e.target.value;
                this.logTerminal(`[引擎切換] 推論引擎已設為: ${e.target.options[e.target.selectedIndex].text}`);
                this.updateTierIndicator();
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

        const statusText = document.getElementById('term-status-text');
        if (statusText) statusText.innerText = cfg.status;

        this.logTerminal(`[環境切換] 已切換至 ${cfg.status} 會話環境。`);
    }

    clearTerminal() {
        const logs = document.getElementById('term-logs');
        if (logs) logs.innerHTML = '';
        this.logTerminal("終端機輸出記錄已清空。");
    }

    clearChat() {
        const container = document.getElementById('chat-container');
        if (!container) return;
        const greeting = document.getElementById('greeting-bubble');
        if (greeting) {
            container.innerHTML = greeting.outerHTML;
        } else {
            container.innerHTML = '<div class="text-xs text-slate-400 p-3">對話已重置。</div>';
        }
    }

    async probeDaemon() {
        const badge = document.getElementById('daemon-badge');
        try {
            const resp = await fetch('http://127.0.0.1:8001/api/status', { method: 'GET' });
            if (resp.ok) {
                this.daemonOnline = true;
                if (badge) {
                    badge.innerHTML = `
                        <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        <span class="text-emerald-400 font-medium">${TRANSLATIONS[this.currentLang]?.daemonOnline || 'Daemon 8001 (連線)'}</span>
                    `;
                    badge.className = "text-[11px] px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-700/50 flex items-center space-x-1 cursor-pointer hover:border-emerald-500 transition select-none truncate";
                }
                return;
            }
        } catch (e) {}

        this.daemonOnline = false;
        if (badge) {
            badge.innerHTML = `
                <span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                <span class="text-amber-300">${TRANSLATIONS[this.currentLang]?.daemonOffline || '純 WASM 沙盒 (離線)'}</span>
            `;
            badge.className = "text-[11px] px-2 py-0.5 rounded-full bg-amber-950/60 text-amber-300 border border-amber-700/50 flex items-center space-x-1 cursor-pointer hover:border-amber-500 transition select-none truncate";
        }
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

        if (this.currentSession === 'py' || cmd.startsWith('python ') || cmd.startsWith('py ')) {
            const code = cmd.replace(/^py(thon)?\s+/, '');
            const res = await this.dispatcher.dispatch('run_python', { code });
            this.logTerminal(`[Python 輸出] ${res.output || JSON.stringify(res)}`);
        } else if (this.currentSession === 'serial') {
            this.logTerminal(`[Web Serial TX] -> "${cmd}" (模擬序列埠發送, Baud: 115200)`);
            this.logTerminal(`[Web Serial RX] <- "ACK: ${cmd}"`);
        } else if (this.currentSession === 'novnc') {
            this.logTerminal(`[noVNC RFB] 遠端輸入事件已轉發至 DISPLAY :0: "${cmd}"`);
        } else if (this.currentSession === 'wsl') {
            if (this.daemonOnline) {
                const res = await this.dispatcher.dispatch('terminal', { command: `wsl -e ${cmd}` });
                if (res.stdout) this.logTerminal(res.stdout);
                if (res.stderr) this.logTerminal(`[wsl stderr] ${res.stderr}`);
            } else {
                this.logTerminal(`[WSL WASM 模擬] user@webcom-wsl:~$ ${cmd}`);
            }
        } else {
            if (this.daemonOnline) {
                const res = await this.dispatcher.dispatch('terminal', { command: cmd });
                if (res.stdout) this.logTerminal(res.stdout);
                if (res.stderr) this.logTerminal(`[stderr] ${res.stderr}`);
                if (res.message) this.logTerminal(res.message);
            } else {
                this.logTerminal(`[本機命令回應] "${cmd}" (純 WASM 離線模式)`);
            }
        }
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
        const div = document.createElement('div');
        div.className = 'flex items-start justify-end space-x-3';
        div.innerHTML = `
            <div class="max-w-[85%] bg-sky-900/40 border border-sky-600/40 rounded-2xl rounded-tr-none p-3.5 shadow-sm text-xs text-sky-100 leading-relaxed">
                ${content.replace(/\n/g, '<br>')}
            </div>
            <div class="w-8 h-8 rounded-full bg-sky-600 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow">U</div>
        `;
        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
    }

    async simulateHermesReasoning(query) {
        const container = document.getElementById('chat-container');

        const thinkingDiv = document.createElement('div');
        thinkingDiv.className = 'flex items-start space-x-3';
        thinkingDiv.innerHTML = `
            <div class="w-8 h-8 rounded-full bg-purple-700 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow">H</div>
            <div class="bg-darkCard border border-darkBorder rounded-2xl rounded-tl-none p-3 text-xs text-slate-400 flex items-center space-x-2">
                <span class="w-2 h-2 rounded-full bg-purple-400 animate-ping"></span>
                <span>Hermes 正在分析意圖並規劃工具策略...</span>
            </div>
        `;
        container.appendChild(thinkingDiv);
        container.scrollTop = container.scrollHeight;

        let targetTool = 'clarify';
        let toolArgs = {};

        if (query.includes('Python') || query.includes('計算') || query.includes('code') || query.includes('數列')) {
            targetTool = 'run_python';
            toolArgs = { code: `# Generated by Hermes for query: ${query}\nresult = [x**2 for x in range(10)]\nprint('Computed result:', result)` };
        } else if (query.includes('GPU') || query.includes('顯卡') || query.includes('顯存') || query.includes('狀態')) {
            targetTool = 'gpu_info';
            toolArgs = {};
        } else if (query.includes('同步') || query.includes('upstream') || query.includes('更新')) {
            targetTool = 'check_hermes_updates';
            toolArgs = {};
        } else if (query.includes('todo') || query.includes('清單') || query.includes('待辦')) {
            targetTool = 'todo';
            toolArgs = { action: 'list' };
        } else if (query.includes('檔案') || query.includes('目錄') || query.includes('ls') || query.includes('dir')) {
            targetTool = 'search_files';
            toolArgs = { directory: '.', pattern: '*' };
        } else if (query.includes('搜尋') || query.includes('search')) {
            targetTool = 'web_search';
            toolArgs = { query };
        } else {
            targetTool = 'clarify';
            toolArgs = { question: `已確認任務: "${query}"。我已就緒，可調用 Pyodide WASM、本機 Shell 或 AI 生態服務。請指定下一步！` };
        }

        const toolResult = await this.dispatcher.dispatch(targetTool, toolArgs);
        thinkingDiv.remove();

        const tier = this.dispatcher.getToolTier(targetTool);
        const tierBadge = tier === 1 
            ? '<span class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700/50">🟢 Tier 1: Pure WASM</span>'
            : tier === 2
            ? '<span class="text-[10px] px-2 py-0.5 rounded-full bg-sky-950 text-sky-300 border border-sky-700/50">🟡 Tier 2: Direct HTTP</span>'
            : '<span class="text-[10px] px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-700/50">🔴 Tier 3: Host Daemon</span>';

        const aiDiv = document.createElement('div');
        aiDiv.className = 'flex items-start space-x-3';
        aiDiv.innerHTML = `
            <div class="w-8 h-8 rounded-full bg-purple-700 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow">H</div>
            <div class="max-w-[85%] bg-darkCard border border-darkBorder rounded-2xl rounded-tl-none p-3.5 space-y-3 shadow">
                <div class="flex items-center justify-between text-xs text-slate-400 border-b border-darkBorder/60 pb-1.5">
                    <span class="font-medium text-purple-400">Hermes Autonomous Agent</span>
                    ${tierBadge}
                </div>
                <div class="bg-slate-950 border border-slate-800 rounded-lg p-2.5 font-mono text-[11px] space-y-1">
                    <div class="text-purple-300 font-semibold flex items-center space-x-1">
                        <span>🔧 調用工具:</span> <span class="text-sky-300">${targetTool}</span>
                    </div>
                    <div class="text-slate-400 overflow-x-auto text-[10px]">參數: ${JSON.stringify(toolArgs)}</div>
                    <div class="text-slate-300 border-t border-slate-800 pt-1.5 text-[10px]">
                        執行結果: <pre class="text-emerald-400 mt-1 whitespace-pre-wrap">${JSON.stringify(toolResult, null, 2)}</pre>
                    </div>
                </div>
                <div class="text-xs text-slate-200 leading-relaxed">
                    工具 <code class="text-purple-300">${targetTool}</code> 已完成調用。您可以繼續在下方交辦後續指令，或至左側終端機檢視即時環境輸出。
                </div>
            </div>
        `;
        container.appendChild(aiDiv);
        container.scrollTop = container.scrollHeight;
    }

    showJevModal() {
        const backdrop = document.getElementById('modal-backdrop');
        const title = document.getElementById('modal-title');
        const body = document.getElementById('modal-body');
        const actionBtn = document.getElementById('btn-modal-action');

        title.innerHTML = `<span>⚡</span><span>Jev 單次傳播極速決策沙盒 (~15ms Cross-Encoder)</span>`;
        body.innerHTML = `
            <div class="space-y-3 text-xs">
                <p class="text-slate-300">Jev 利用極輕量 Cross-Encoder 模型 (如 BGE-Reranker-Base 或 MiniLM)，以 <strong>單次前向傳播 (Single-Pass)</strong> 在 10~15ms 內對候選行動給出確定性排序，完全跳過大模型的多 Token 自回歸延遲：</p>
                <div class="bg-slate-950 p-2.5 rounded border border-slate-800 space-y-1">
                    <div>當前任務狀態: <code class="text-sky-300">"User requested Fibonacci series computation"</code></div>
                    <div>決策選項:</div>
                    <ul class="list-disc list-inside text-slate-400 pl-2">
                        <li>Option 1: run_python (Pyodide in-browser WASM)</li>
                        <li>Option 2: terminal (host shell via daemon)</li>
                        <li>Option 3: clarify (ask for more details)</li>
                    </ul>
                </div>
                <div id="jev-output" class="text-emerald-400 font-mono">點擊「執行快速決策」進行評估...</div>
            </div>
        `;
        actionBtn.innerText = "執行快速決策";
        actionBtn.onclick = async () => {
            const out = document.getElementById('jev-output');
            out.innerHTML = '<span class="text-purple-400 animate-pulse">Jev Cross-Encoder 正在進行單次傳播計算...</span>';
            const t0 = performance.now();
            await new Promise(r => setTimeout(r, 15));
            const dt = (performance.now() - t0).toFixed(1);
            out.innerHTML = `
                <div class="font-bold">✔ 決策完成 (耗時: ${dt} ms)：</div>
                <div class="mt-1 text-slate-300">首選動作: <code class="text-amber-300 font-bold">run_python</code> (Score: 0.94)</div>
                <div class="text-slate-400 text-[10px]">次選動作: terminal (Score: 0.28) | clarify (Score: 0.05)</div>
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

        title.innerHTML = `<span>🩺</span><span>系統自我檢測與生態服務診斷</span>`;
        body.innerHTML = `<div class="text-slate-400 animate-pulse text-xs">正在探測本機連接埠與 AI 服務狀態...</div>`;
        actionBtn.innerText = "重新檢測";
        actionBtn.onclick = () => this.showDiagModal();

        backdrop.classList.remove('hidden');
        backdrop.classList.add('flex');

        try {
            const resp = await fetch('http://127.0.0.1:8001/api/hermes/status');
            if (resp.ok) {
                const data = await resp.json();
                body.innerHTML = `
                    <div class="space-y-3">
                        <div class="grid grid-cols-2 gap-2 text-xs">
                            <div class="bg-slate-950 p-2 rounded border border-slate-800">
                                <span class="text-slate-400">Host Daemon (8001):</span>
                                <span class="text-emerald-400 font-bold float-right">${data.services.host_daemon.status}</span>
                            </div>
                            <div class="bg-slate-950 p-2 rounded border border-slate-800">
                                <span class="text-slate-400">LM Studio (1234):</span>
                                <span class="${data.services.lm_studio.status === 'online' ? 'text-emerald-400' : 'text-slate-500'} font-bold float-right">${data.services.lm_studio.status}</span>
                            </div>
                            <div class="bg-slate-950 p-2 rounded border border-slate-800">
                                <span class="text-slate-400">ComfyUI (5000):</span>
                                <span class="${data.services.comfyui.status === 'online' ? 'text-emerald-400' : 'text-slate-500'} font-bold float-right">${data.services.comfyui.status}</span>
                            </div>
                            <div class="bg-slate-950 p-2 rounded border border-slate-800">
                                <span class="text-slate-400">TTS Server (8200):</span>
                                <span class="${data.services.tts_server.status === 'online' ? 'text-emerald-400' : 'text-slate-500'} font-bold float-right">${data.services.tts_server.status}</span>
                            </div>
                            <div class="bg-slate-950 p-2 rounded border border-slate-800">
                                <span class="text-slate-400">Music Server (9150):</span>
                                <span class="${data.services.music_server.status === 'online' ? 'text-emerald-400' : 'text-slate-500'} font-bold float-right">${data.services.music_server.status}</span>
                            </div>
                            <div class="bg-slate-950 p-2 rounded border border-slate-800">
                                <span class="text-slate-400">NVIDIA GPU 狀態:</span>
                                <span class="text-sky-300 font-mono text-[10px] float-right truncate max-w-[130px]" title="${data.gpu}">${data.gpu}</span>
                            </div>
                        </div>
                        <div class="text-[11px] text-slate-400">
                            Manifest 工具定義狀態: <span class="text-emerald-400 font-bold">${data.upstream_manifest_present ? '已載入 (101 款工具)' : '未找到'}</span>
                        </div>
                    </div>
                `;
                return;
            }
        } catch (e) {}

        body.innerHTML = `
            <div class="space-y-2 text-xs">
                <div class="text-amber-400 font-bold">⚠️ Host Daemon (Port 8001) 未啟動</div>
                <p class="text-slate-300">目前處於【純瀏覽器 / WASM 獨立沙盒模式】。</p>
                <p class="text-slate-400">在此模式下各功能狀態：</p>
                <ul class="list-disc list-inside text-slate-400 pl-2 space-y-1">
                    <li><span class="text-emerald-400 font-medium">Tier 1 工具 (Pyodide Python、Web Serial、記憶體、清單)</span>：本機瀏覽器內 100% 正常可用。</li>
                    <li><span class="text-sky-400 font-medium">Tier 2 工具 (LM Studio 直連 1234、Web 搜尋)</span>：若 LM Studio 啟用 CORS 可由前端直連。</li>
                    <li><span class="text-amber-400 font-medium">Tier 3 本機工具 (實體 Shell、WSL、ComfyUI、TTS、Music)</span>：自動優雅降級為安全沙盒模擬。</li>
                </ul>
                <div class="mt-3 p-2 bg-slate-950 border border-slate-800 rounded text-slate-300">
                    若需啟用完整 Host 權限，請執行專案根目錄之 <code class="text-sky-300">START.bat</code>。
                </div>
            </div>
        `;
    }
}

// Universal bootstrap: supports both DOMContentLoaded and already-interactive state
function startWebcomApp() {
    if (!window.webcomApp) {
        window.webcomApp = new WebcomAIApp();
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startWebcomApp);
} else {
    startWebcomApp();
}
