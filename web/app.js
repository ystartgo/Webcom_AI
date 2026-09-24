/**
 * Webcom AI - Frontend Client Controller
 * Integrates Web UI with HermesToolDispatcher and Daemon APIs.
 */

import { HermesToolDispatcher } from '../hermes_bridge/hermes_tools.js';

class WebcomAIApp {
    constructor() {
        this.dispatcher = new HermesToolDispatcher({
            daemonUrl: 'http://127.0.0.1:8001',
            onLog: (msg, ...args) => this.logTerminal(`[Dispatcher] ${msg}`, ...args)
        });
        this.daemonOnline = false;
        this.init();
    }

    async init() {
        this.bindEvents();
        await this.dispatcher.init('../hermes_bridge/schema/hermes_tools_manifest.json');
        await this.probeDaemon();
        // Periodic daemon health probe every 10s
        setInterval(() => this.probeDaemon(), 10000);
    }

    bindEvents() {
        // Chat send
        const btnSend = document.getElementById('btn-send-chat');
        const chatInput = document.getElementById('chat-input');
        if (btnSend && chatInput) {
            btnSend.addEventListener('click', () => this.handleSendMessage());
            chatInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.handleSendMessage();
                }
            });
        }

        // Terminal send
        const btnTerm = document.getElementById('btn-term-send');
        const termInput = document.getElementById('term-input');
        if (btnTerm && termInput) {
            btnTerm.addEventListener('click', () => this.handleSendTerminal());
            termInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.handleSendTerminal();
                }
            });
        }

        // Upstream Sync Button
        const btnSync = document.getElementById('btn-sync');
        if (btnSync) {
            btnSync.addEventListener('click', () => this.showSyncModal());
        }

        // Self Diagnostics Button
        const btnDiag = document.getElementById('btn-diag');
        if (btnDiag) {
            btnDiag.addEventListener('click', () => this.showDiagModal());
        }

        // Modal Close
        const btnClose = document.getElementById('btn-close-modal');
        const btnCancel = document.getElementById('btn-modal-cancel');
        const backdrop = document.getElementById('modal-backdrop');
        [btnClose, btnCancel].forEach(b => {
            if (b) b.addEventListener('click', () => backdrop.classList.add('hidden'));
        });
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
                    badge.className = "text-xs px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-700/50 flex items-center space-x-1";
                }
                return;
            }
        } catch (e) {}

        this.daemonOnline = false;
        if (badge) {
            badge.innerHTML = `
                <span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                <span class="text-amber-300">純 WASM 沙盒 (離線)</span>
            `;
            badge.className = "text-xs px-2 py-0.5 rounded-full bg-amber-950/60 text-amber-300 border border-amber-700/50 flex items-center space-x-1";
        }
    }

    logTerminal(text) {
        const logs = document.getElementById('term-logs');
        if (!logs) return;
        const line = document.createElement('div');
        line.className = 'text-slate-400 leading-relaxed font-mono';
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

        this.logTerminal(`$ ${cmd}`);
        // Dispatch to terminal or Pyodide
        if (cmd.startsWith('python ') || cmd.startsWith('py ')) {
            const code = cmd.replace(/^py(thon)?\s+/, '');
            const res = await this.dispatcher.dispatch('run_python', { code });
            this.logTerminal(`Output: ${JSON.stringify(res.output || res)}`);
        } else {
            const res = await this.dispatcher.dispatch('terminal', { command: cmd });
            if (res.stdout) this.logTerminal(res.stdout);
            if (res.stderr) this.logTerminal(`[stderr] ${res.stderr}`);
            if (res.message) this.logTerminal(res.message);
        }
    }

    async handleSendMessage() {
        const input = document.getElementById('chat-input');
        if (!input || !input.value.trim()) return;
        const text = input.value.trim();
        input.value = '';

        // Add user bubble
        this.appendUserMessage(text);

        // Analyze user intent for tool calling
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
            <div class="w-8 h-8 rounded-full bg-sky-600 flex items-center justify-center text-white text-xs font-bold shrink-0">U</div>
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
            <div class="w-8 h-8 rounded-full bg-purple-700 flex items-center justify-center text-white text-xs font-bold shrink-0">H</div>
            <div class="bg-darkCard border border-darkBorder rounded-2xl rounded-tl-none p-3 text-xs text-slate-400 flex items-center space-x-2">
                <span class="w-2 h-2 rounded-full bg-purple-400 animate-ping"></span>
                <span>Hermes 正在思考工具調用策略...</span>
            </div>
        `;
        container.appendChild(thinkingDiv);
        container.scrollTop = container.scrollHeight;

        // Intent detection
        let targetTool = null;
        let toolArgs = {};

        if (query.includes('Python') || query.includes('計算') || query.includes('code')) {
            targetTool = 'run_python';
            toolArgs = { code: `# Generated by Hermes for query: ${query}\nresult = [x**2 for x in range(10)]\nprint(result)` };
        } else if (query.includes('GPU') || query.includes('顯卡') || query.includes('顯存')) {
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
        } else {
            targetTool = 'clarify';
            toolArgs = { question: `已收到任務: "${query}"。我能為你調用 Python WASM、終端機或本機 AI 服務，請確認下一步。` };
        }

        // Execute tool via dispatcher
        const toolResult = await this.dispatcher.dispatch(targetTool, toolArgs);
        thinkingDiv.remove();

        const tier = this.dispatcher.getToolTier(targetTool);
        const tierBadge = tier === 1 
            ? '<span class="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700/50">🟢 Tier 1: Pure WASM</span>'
            : tier === 2
            ? '<span class="text-[10px] px-1.5 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-700/50">🟡 Tier 2: Direct HTTP</span>'
            : '<span class="text-[10px] px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-700/50">🔴 Tier 3: Host Daemon</span>';

        // Render AI Answer Bubble with Tool execution card
        const aiDiv = document.createElement('div');
        aiDiv.className = 'flex items-start space-x-3';
        aiDiv.innerHTML = `
            <div class="w-8 h-8 rounded-full bg-purple-700 flex items-center justify-center text-white text-xs font-bold shrink-0">H</div>
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
                    工具 <code class="text-purple-300">${targetTool}</code> 已經在環境中成功響應。你可以繼續指示執行下一步，或至左側終端機檢視即時運作狀態。
                </div>
            </div>
        `;
        container.appendChild(aiDiv);
        container.scrollTop = container.scrollHeight;
    }

    async showSyncModal() {
        const backdrop = document.getElementById('modal-backdrop');
        const title = document.getElementById('modal-title');
        const body = document.getElementById('modal-body');
        const actionBtn = document.getElementById('btn-modal-action');

        title.innerHTML = `<span>🔄</span><span>Hermes Agent Upstream 原生同步工具</span>`;
        body.innerHTML = `
            <div class="space-y-3">
                <p class="text-slate-300">本工具將比對 Upstream (NousResearch / portable-hermes-agent) 的原生工具清單與 Webcom AI 的適配器：</p>
                <div class="bg-slate-950 p-2.5 rounded border border-slate-800">
                    <div class="text-slate-400">來源封包: <code class="text-sky-300">C:\\Apps\\portable-hermes-agent-main.zip</code></div>
                    <div class="text-slate-400">目標 Manifest: <code class="text-sky-300">hermes_bridge/schema/hermes_tools_manifest.json</code></div>
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
                    out.innerHTML = `<div class="text-red-400">同步失敗: Daemon 回應 ${resp.status}。請確認 Daemon 運行中。</div>`;
                }
            } catch (e) {
                out.innerHTML = `<div class="text-amber-400">無法連線至 Daemon: ${e.message}。請在命令列手動執行: python sync/sync_upstream_hermes.py</div>`;
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
        body.innerHTML = `<div class="text-slate-400 animate-pulse">正在探測本機連接埠與服務狀態...</div>`;
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
                                <span class="text-sky-300 font-mono text-[10px] float-right truncate max-w-[120px]" title="${data.gpu}">${data.gpu}</span>
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
                <p class="text-slate-400">在此模式下：</p>
                <ul class="list-disc list-inside text-slate-400 pl-2 space-y-1">
                    <li>Tier 1 工具 (Pyodide Python、Web Serial COM、記憶體) 正常可用。</li>
                    <li>Tier 2 工具 (LM Studio 直連、外部 Web 搜尋) 可透過瀏覽器直接發送。</li>
                    <li>Tier 3 本機工具 (Shell、實體硬碟讀寫、ComfyUI、TTS、Music) 將處於優雅降級模式。</li>
                </ul>
                <div class="mt-3 p-2 bg-slate-950 border border-slate-800 rounded text-slate-300">
                    若需啟用完整本機能力，請在專案目錄雙擊執行 <code class="text-sky-300">START.bat</code>。
                </div>
            </div>
        `;
    }
}

// Instantiate on DOM load
window.addEventListener('DOMContentLoaded', () => {
    window.webcomApp = new WebcomAIApp();
});
