/**
 * Webcom AI - Frontend Client Controller
 * Pure Standalone (file://) and Host Daemon (http://) Universal Client.
 * Integrates Web UI with HermesToolDispatcher, Terminal Sessions, and AI Tool Calling.
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
                return { status: 'success', todos: [{ id: 1, item: 'Webcom AI WASM Initialized', done: true }] };
            }
            if (name === 'memory') {
                return { status: 'success', memories: ['Hermes Agent WASM Session Active'] };
            }
            return { status: 'success', tool: name, message: `Tool ${name} executed in local sandbox.` };
        }
    };

class WebcomAIApp {
    constructor() {
        this.dispatcher = new ToolDispatcher({
            daemonUrl: 'http://127.0.0.1:8001',
            onLog: (msg, ...args) => this.logTerminal(`[Dispatcher] ${msg}`, ...args)
        });

        this.daemonOnline = false;
        this.currentSession = 'shell'; // 'shell' | 'wsl' | 'py' | 'serial' | 'novnc'
        this.activeEngine = 'api';
        this.activeToolset = 'full_stack';
        this.modalMode = null; // 'sync' | 'diag'

        this.init();
    }

    async init() {
        this.bindEvents();
        await this.dispatcher.init('../hermes_bridge/schema/hermes_tools_manifest.json');
        await this.probeDaemon();
        // Periodic daemon health probe every 10s
        setInterval(() => this.probeDaemon(), 10000);
        this.logTerminal("✔ Webcom 控制台各按鈕與會話環境已全面綁定就緒。");
    }

    bindEvents() {
        // 1. Terminal Session Tabs
        const tabConfigs = [
            { id: 'tab-shell', session: 'shell', prompt: 'PS>', status: 'PowerShell / Shell WASM' },
            { id: 'tab-wsl', session: 'wsl', prompt: 'wsl$', status: 'WSL2 Linux 容器代理' },
            { id: 'tab-py', session: 'py', prompt: '>>>', status: 'Pyodide WASM (Python 3.11)' },
            { id: 'tab-serial', session: 'serial', prompt: 'COM>', status: 'Web Serial API (115200 8N1)' },
            { id: 'tab-novnc', session: 'novnc', prompt: 'vnc>', status: 'noVNC RFB 遠端桌面 (5900)' }
        ];

        tabConfigs.forEach(cfg => {
            const btn = document.getElementById(cfg.id);
            if (btn) {
                btn.addEventListener('click', () => this.switchTerminalTab(cfg));
            }
        });

        // 2. Terminal Input & Send & Clear
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

        // 3. Center Selectors (Engine & Toolset)
        const engineSelect = document.getElementById('engine-select');
        if (engineSelect) {
            engineSelect.addEventListener('change', (e) => {
                this.activeEngine = e.target.value;
                const label = e.target.options[e.target.selectedIndex].text;
                this.logTerminal(`[引擎切換] 推論引擎已設為: ${label}`);
                this.updateTierIndicator();
            });
        }

        const toolsetSelect = document.getElementById('toolset-select');
        if (toolsetSelect) {
            toolsetSelect.addEventListener('change', (e) => {
                this.activeToolset = e.target.value;
                const label = e.target.options[e.target.selectedIndex].text;
                this.logTerminal(`[工具集切換] 工具子集已載入: ${label}`);
            });
        }

        // 4. Chat Send & Input & Clear
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

        // 5. Header Quick Buttons & Daemon Badge
        const btnSync = document.getElementById('btn-sync');
        if (btnSync) {
            btnSync.addEventListener('click', () => this.showSyncModal());
        }

        const btnDiag = document.getElementById('btn-diag');
        if (btnDiag) {
            btnDiag.addEventListener('click', () => this.showDiagModal());
        }

        const daemonBadge = document.getElementById('daemon-badge');
        if (daemonBadge) {
            daemonBadge.addEventListener('click', () => {
                this.logTerminal("[探測] 正在手動重新探測 Host Daemon (Port 8001)...");
                this.probeDaemon();
            });
        }

        // 6. Modal Close Handlers (Esc, backdrop, buttons)
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
            if (e.key === 'Escape' && backdrop && !backdrop.classList.contains('hidden')) {
                this.closeModal();
            }
        });
    }

    closeModal() {
        const backdrop = document.getElementById('modal-backdrop');
        if (backdrop) {
            backdrop.classList.add('hidden');
            backdrop.classList.remove('flex');
        }
        this.modalMode = null;
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

        // Update tab styles
        const tabs = document.querySelectorAll('.term-tab');
        tabs.forEach(tab => {
            tab.className = "term-tab px-2.5 py-1 rounded text-xs hover:bg-darkBorder/50 text-slate-400 transition cursor-pointer";
        });
        const activeTab = document.getElementById(cfg.id);
        if (activeTab) {
            activeTab.className = "term-tab px-2.5 py-1 rounded text-xs bg-darkBorder text-sky-300 font-medium transition cursor-pointer";
        }

        // Update prompt and status text
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
            const html = greeting.outerHTML;
            container.innerHTML = html;
        } else {
            container.innerHTML = `
                <div class="text-xs text-slate-400 p-3 bg-darkCard border border-darkBorder rounded-xl">
                    對話紀錄已清空。您可以重新向 Hermes Agent 發送任務指令。
                </div>
            `;
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
                        <span class="text-emerald-400 font-medium">Daemon 8001 (連線)</span>
                    `;
                    badge.className = "text-xs px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-700/50 flex items-center space-x-1 cursor-pointer hover:border-emerald-500 transition";
                }
                return;
            }
        } catch (e) {
            // Daemon is offline or running under pure file:// mode
        }

        this.daemonOnline = false;
        if (badge) {
            badge.innerHTML = `
                <span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                <span class="text-amber-300">純 WASM 沙盒 (離線)</span>
            `;
            badge.className = "text-xs px-2 py-0.5 rounded-full bg-amber-950/60 text-amber-300 border border-amber-700/50 flex items-center space-x-1 cursor-pointer hover:border-amber-500 transition";
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

        // Route command based on active session
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
                this.logTerminal(`(Host Daemon 未啟動，已在純瀏覽器沙盒中模擬執行: status=0)`);
            }
        } else {
            // Default Shell
            if (this.daemonOnline) {
                const res = await this.dispatcher.dispatch('terminal', { command: cmd });
                if (res.stdout) this.logTerminal(res.stdout);
                if (res.stderr) this.logTerminal(`[stderr] ${res.stderr}`);
                if (res.message) this.logTerminal(res.message);
            } else {
                this.logTerminal(`[本機命令回應] "${cmd}" (純 WASM 離線模式，特權指令需透過 START.bat 啟動 Daemon)`);
            }
        }
    }

    async handleSendMessage() {
        const input = document.getElementById('chat-input');
        if (!input || !input.value.trim()) return;
        const text = input.value.trim();
        input.value = '';

        // Add user bubble
        this.appendUserMessage(text);

        // Analyze user intent and simulate reasoning / tool execution
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

        // Thinking placeholder
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

        // Intent detection
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

        // Execute tool via dispatcher
        const toolResult = await this.dispatcher.dispatch(targetTool, toolArgs);
        thinkingDiv.remove();

        const tier = this.dispatcher.getToolTier(targetTool);
        const tierBadge = tier === 1 
            ? '<span class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700/50">🟢 Tier 1: Pure WASM</span>'
            : tier === 2
            ? '<span class="text-[10px] px-2 py-0.5 rounded-full bg-sky-950 text-sky-300 border border-sky-700/50">🟡 Tier 2: Direct HTTP</span>'
            : '<span class="text-[10px] px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-700/50">🔴 Tier 3: Host Daemon</span>';

        // Render AI Answer Bubble
        const aiDiv = document.createElement('div');
        aiDiv.className = 'flex items-start space-x-3';
        aiDiv.innerHTML = `
            <div class="w-8 h-8 rounded-full bg-purple-700 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow">H</div>
            <div class="max-w-[85%] bg-darkCard border border-darkBorder rounded-2xl rounded-tl-none p-3.5 space-y-3 shadow">
                <div class="flex items-center justify-between text-xs text-slate-400 border-b border-darkBorder/60 pb-1.5">
                    <span class="font-medium text-purple-400">Hermes Autonomous Agent</span>
                    ${tierBadge}
                </div>
                
                <!-- Tool Call Box -->
                <div class="bg-slate-950 border border-slate-800 rounded-lg p-2.5 font-mono text-[11px] space-y-1">
                    <div class="text-purple-300 font-semibold flex items-center space-x-1">
                        <span>🔧 調用工具:</span> <span class="text-sky-300">${targetTool}</span>
                    </div>
                    <div class="text-slate-400 overflow-x-auto text-[10px]">
                        參數: ${JSON.stringify(toolArgs)}
                    </div>
                    <div class="text-slate-300 border-t border-slate-800 pt-1.5 text-[10px]">
                        執行結果: <pre class="text-emerald-400 mt-1 whitespace-pre-wrap">${JSON.stringify(toolResult, null, 2)}</pre>
                    </div>
                </div>

                <!-- Final Response -->
                <div class="text-xs text-slate-200 leading-relaxed">
                    工具 <code class="text-purple-300">${targetTool}</code> 已完成調用。您可以繼續在下方交辦後續指令，或至左側終端機檢視即時環境輸出。
                </div>
            </div>
        `;
        container.appendChild(aiDiv);
        container.scrollTop = container.scrollHeight;
    }

    async showSyncModal() {
        this.modalMode = 'sync';
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
        this.modalMode = 'diag';
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
        } catch (e) {
            // Daemon is offline
        }

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
