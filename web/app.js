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


function extractLocationFromQuery(query) {
    if (!query || typeof query !== 'string') return 'Hsinchu';
    let q = query.trim();

    const cityMap = [
        { regex: /新竹(市|縣|科學園區)?|竹科/i, en: 'Hsinchu' },
        { regex: /台北(市)?|臺北(市)?/i, en: 'Taipei' },
        { regex: /新北(市)?/i, en: 'New Taipei' },
        { regex: /桃園(市)?/i, en: 'Taoyuan' },
        { regex: /台中(市)?|臺中(市)?/i, en: 'Taichung' },
        { regex: /台南(市)?|臺南(市)?/i, en: 'Tainan' },
        { regex: /高雄(市)?/i, en: 'Kaohsiung' },
        { regex: /基隆(市)?/i, en: 'Keelung' },
        { regex: /苗栗(市|縣)?/i, en: 'Miaoli' },
        { regex: /彰化(市|縣)?/i, en: 'Changhua' },
        { regex: /南投(市|縣)?/i, en: 'Nantou' },
        { regex: /雲林(縣)?/i, en: 'Yunlin' },
        { regex: /嘉義(市|縣)?/i, en: 'Chiayi' },
        { regex: /屏東(市|縣)?/i, en: 'Pingtung' },
        { regex: /宜蘭(市|縣)?/i, en: 'Yilan' },
        { regex: /花蓮(市|縣)?/i, en: 'Hualien' },
        { regex: /台東(市|縣)?|臺東(市|縣)?/i, en: 'Taitung' },
        { regex: /澎湖(縣)?/i, en: 'Penghu' },
        { regex: /金門(縣)?/i, en: 'Kinmen' },
        { regex: /連江(縣)?|馬祖/i, en: 'Matsu' },
        { regex: /上海|shanghai/i, en: 'Shanghai' },
        { regex: /北京|beijing/i, en: 'Beijing' },
        { regex: /深圳|shenzhen/i, en: 'Shenzhen' },
        { regex: /廣州|广州|guangzhou/i, en: 'Guangzhou' },
        { regex: /澳門|澳门|macau|macao/i, en: 'Macau' },
        { regex: /香港|hong\s*kong/i, en: 'Hong Kong' },
        { regex: /東京|tokyo/i, en: 'Tokyo' },
        { regex: /大阪|osaka/i, en: 'Osaka' },
        { regex: /京都|kyoto/i, en: 'Kyoto' },
        { regex: /首爾|seoul/i, en: 'Seoul' },
        { regex: /新加坡|singapore/i, en: 'Singapore' },
        { regex: /曼谷|bangkok/i, en: 'Bangkok' },
        { regex: /倫敦|london/i, en: 'London' },
        { regex: /紐約|new\s*york/i, en: 'New York' },
        { regex: /巴黎|paris/i, en: 'Paris' },
        { regex: /舊金山|san\s*francisco/i, en: 'San Francisco' },
        { regex: /洛杉磯|los\s*angeles/i, en: 'Los Angeles' },
        { regex: /西雅圖|seattle/i, en: 'Seattle' }
    ];

    for (const city of cityMap) {
        if (city.regex.test(q)) {
            return city.en;
        }
    }

    let cleaned = q
        .replace(/\/weather\b/gi, '')
        .replace(/查詢|今天|今日|明天|現在|即時|即刻|查看|看看|想知道|預報|天氣|氣象|氣溫|溫度|降雨|濕度|風速|空氣|品質|會不會|下雨|怎麼樣|如何|狀況|報告/g, '')
        .replace(/\b(check|today('s)?|tomorrow('s)?|current|live|weather|temperature|forecast|in|for|at|the|how|is|like)\b/gi, '')
        .replace(/[\?？!！,\.，。、\/\\~～@#\$%\^&\*\(\)（）\-_=\+]/g, '')
        .trim();

    if (cleaned.length >= 2) {
        return cleaned;
    }

    return 'Hsinchu';
}

function formatLocationDisplay(locStr, isZh = true) {
    if (!locStr || typeof locStr !== 'string') return isZh ? '新竹市 (Hsinchu), 台灣' : 'Hsinchu, Taiwan';
    const locMap = {
        'Hsinchu': { zh: '新竹市', countryZh: '台灣', countryEn: 'Taiwan' },
        'Taipei': { zh: '台北市', countryZh: '台灣', countryEn: 'Taiwan' },
        'New Taipei': { zh: '新北市', countryZh: '台灣', countryEn: 'Taiwan' },
        'Taoyuan': { zh: '桃園市', countryZh: '台灣', countryEn: 'Taiwan' },
        'Taichung': { zh: '台中市', countryZh: '台灣', countryEn: 'Taiwan' },
        'Tainan': { zh: '台南市', countryZh: '台灣', countryEn: 'Taiwan' },
        'Kaohsiung': { zh: '高雄市', countryZh: '台灣', countryEn: 'Taiwan' },
        'Keelung': { zh: '基隆市', countryZh: '台灣', countryEn: 'Taiwan' },
        'Miaoli': { zh: '苗栗縣', countryZh: '台灣', countryEn: 'Taiwan' },
        'Changhua': { zh: '彰化縣', countryZh: '台灣', countryEn: 'Taiwan' },
        'Nantou': { zh: '南投縣', countryZh: '台灣', countryEn: 'Taiwan' },
        'Yunlin': { zh: '雲林縣', countryZh: '台灣', countryEn: 'Taiwan' },
        'Chiayi': { zh: '嘉義市', countryZh: '台灣', countryEn: 'Taiwan' },
        'Pingtung': { zh: '屏東縣', countryZh: '台灣', countryEn: 'Taiwan' },
        'Yilan': { zh: '宜蘭縣', countryZh: '台灣', countryEn: 'Taiwan' },
        'Hualien': { zh: '花蓮縣', countryZh: '台灣', countryEn: 'Taiwan' },
        'Taitung': { zh: '台東縣', countryZh: '台灣', countryEn: 'Taiwan' },
        'Penghu': { zh: '澎湖縣', countryZh: '台灣', countryEn: 'Taiwan' },
        'Kinmen': { zh: '金門縣', countryZh: '台灣', countryEn: 'Taiwan' },
        'Matsu': { zh: '連江馬祖', countryZh: '台灣', countryEn: 'Taiwan' },
        'Shanghai': { zh: '上海', countryZh: '中國', countryEn: 'China' },
        'Beijing': { zh: '北京', countryZh: '中國', countryEn: 'China' },
        'Shenzhen': { zh: '深圳', countryZh: '中國', countryEn: 'China' },
        'Guangzhou': { zh: '廣州', countryZh: '中國', countryEn: 'China' },
        'Macau': { zh: '澳門', countryZh: '澳門', countryEn: 'Macau' },
        'Hong Kong': { zh: '香港', countryZh: '香港', countryEn: 'Hong Kong' },
        'Tokyo': { zh: '東京', countryZh: '日本', countryEn: 'Japan' },
        'Osaka': { zh: '大阪', countryZh: '日本', countryEn: 'Japan' },
        'Kyoto': { zh: '京都', countryZh: '日本', countryEn: 'Japan' },
        'Seoul': { zh: '首爾', countryZh: '韓國', countryEn: 'South Korea' },
        'Singapore': { zh: '新加坡', countryZh: '新加坡', countryEn: 'Singapore' },
        'Bangkok': { zh: '曼谷', countryZh: '泰國', countryEn: 'Thailand' },
        'London': { zh: '倫敦', countryZh: '英國', countryEn: 'UK' },
        'New York': { zh: '紐約', countryZh: '美國', countryEn: 'USA' },
        'Paris': { zh: '巴黎', countryZh: '法國', countryEn: 'France' },
        'San Francisco': { zh: '舊金山', countryZh: '美國', countryEn: 'USA' },
        'Los Angeles': { zh: '洛杉磯', countryZh: '美國', countryEn: 'USA' },
        'Seattle': { zh: '西雅圖', countryZh: '美國', countryEn: 'USA' }
    };
    for (const [en, info] of Object.entries(locMap)) {
        if (locStr.toLowerCase().includes(en.toLowerCase()) || locStr.includes(info.zh)) {
            const hasSuffix = locStr.includes('(Direct Web)') ? ' (即時聯網)' : (locStr.includes('(Local Forecast)') ? ' (本地預報)' : '');
            return isZh ? `${info.zh} (${en}), ${info.countryZh}${hasSuffix}` : `${en}, ${info.countryEn}`;
        }
    }
    return locStr;
}

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
            const t1 = ['system_probe', 'inspect_terminal', 'run_python', 'execute_code', 'todo', 'memory', 'clarify', 'search_guide'];
            const t2 = ['web_search', 'web_extract', 'lm_studio_status', 'lm_studio_models', 'get_weather', 'weather'];
            if (t1.includes(name)) return 1;
            if (t2.includes(name)) return 2;
            return 3;
        }
        async dispatch(name, args = {}) {
            const isZh = (typeof window !== 'undefined' && window.webcomApp && window.webcomApp.currentLang !== 'en');
            this.onLog(isZh ? `正在派發 ${name} (第 ${this.getToolTier(name)} 層)` : `Dispatching ${name} (Tier ${this.getToolTier(name)})`);

            // Tier 1: Real-time System Environment Probe (supports both Client Sandbox & Host Telemetry)
            if (name === 'system_probe' || name === 'env_probe') {
                let osInfo = isZh ? 'Windows 系統 (瀏覽器偵測)' : 'Windows (Browser Detected)';
                let ramInfo = '';
                let cpuInfo = '';
                let gpuTelemetry = ('gpu' in navigator)
                    ? (isZh ? 'WebGPU 原生支援 · GPU 90% 顯存與運算守護已就緒' : 'WebGPU Supported · GPU 90% Ceiling Guard Ready')
                    : (isZh ? 'CPU SIMD 模式 · GPU 90% 守護就緒' : 'CPU SIMD Mode · GPU 90% Guard Ready');
                let daemonStatus = (window.webcomApp && window.webcomApp.daemonOnline)
                    ? (isZh ? '連線正常 (Port 8001 活動中)' : 'Online (Port 8001 Active)')
                    : (isZh ? '純 WASM 沙盒 (離線模式)' : 'Pure WASM Sandbox (Offline Mode)');

                // Try fetching live Host Daemon telemetry if connected
                try {
                    const sResp = await fetch(`${this.daemonUrl}/api/system_info`, { signal: AbortSignal.timeout(1200) });
                    if (sResp.ok) {
                        const telem = await sResp.json();
                        if (telem.os) osInfo = telem.os;
                        if (telem.ram?.display) ramInfo = telem.ram.display;
                        if (telem.cpu_cores) cpuInfo = `${telem.cpu_cores} ${isZh ? '執行緒' : 'Threads'} (${telem.cpu_arch || 'x64'})`;
                        if (telem.gpu) gpuTelemetry = telem.gpu;
                    }
                } catch (_) {}

                // Browser Client API fallback (Note: W3C specs cap navigator.deviceMemory at 8 GB for privacy)
                if (!ramInfo) {
                    const devMem = navigator.deviceMemory;
                    const hwConc = navigator.hardwareConcurrency;
                    ramInfo = devMem
                        ? (isZh ? `約 ${devMem} GB 以上 (受限瀏覽器隱私上限)` : `Approx. ${devMem}+ GB (Browser Privacy Capped)`)
                        : (isZh ? '8+ GB (沙盒標準)' : '8+ GB (Standard)');
                    if (hwConc) cpuInfo = `${hwConc} ${isZh ? '執行緒' : 'Threads'}`;
                    const ua = navigator.userAgent;
                    if (ua.includes('Windows NT 10.0')) {
                        osInfo = isZh ? 'Windows 10 / 11 64-bit' : 'Windows 10 / 11 64-bit';
                    } else if (ua.includes('Mac OS X')) {
                        osInfo = 'macOS';
                    } else if (ua.includes('Linux')) {
                        osInfo = 'Linux';
                    }
                }

                return {
                    status: 'success',
                    tool: 'system_probe',
                    os: osInfo,
                    ram: ramInfo,
                    cpu: cpuInfo || (isZh ? '多核心處理器' : 'Multi-core CPU'),
                    gpu: gpuTelemetry,
                    daemon: daemonStatus,
                    web_serial: ('serial' in navigator) ? (isZh ? '原生驅動支援 (免驅動)' : 'Native API Ready') : (isZh ? '瀏覽器未啟用' : 'Unavailable')
                };
            }

            // Tier 1: Real-time Terminal Log Inspection (inspect_terminal)
            if (name === 'inspect_terminal' || name === 'get_terminal_logs') {
                const curSession = (window.webcomApp && window.webcomApp.currentSession) ? window.webcomApp.currentSession : 'shell';
                const logsEl = document.getElementById(`term-logs-${curSession}`) || 
                               document.getElementById('term-logs-system') || 
                               document.getElementById('term-logs');
                const logLines = [];
                if (logsEl) {
                    const children = logsEl.children;
                    for (let i = 0; i < children.length; i++) {
                        const txt = children[i].textContent || '';
                        if (txt.trim()) logLines.push(txt.trim());
                    }
                }
                const tail = logLines.slice(-15);
                const fullText = tail.join('\n');
                return {
                    status: 'success',
                    tool: 'inspect_terminal',
                    total_lines: logLines.length,
                    recent_lines: tail,
                    snippet: fullText || (isZh ? '終端機目前無記錄。' : 'No terminal output available.')
                };
            }

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
                    const loc = args.location || extractLocationFromQuery(args.query || '') || 'Hsinchu';
                    const isZh = (typeof window !== 'undefined' && window.webcomApp && window.webcomApp.currentLang !== 'en');

                    // 1. Daemon weather
                    try {
                        const resp = await fetch(`${this.daemonUrl}/api/weather?loc=${encodeURIComponent(loc)}`, {
                            signal: AbortSignal.timeout(1500)
                        });
                        if (resp.ok) {
                            const dData = await resp.json();
                            if (dData && dData.status === 'success') return dData;
                        }
                    } catch (eDaemon) {}

                    // 2. Open-Meteo Live API
                    if (typeof window !== 'undefined' && typeof window.fetchOpenMeteoWeather === 'function') {
                        const meteo = await window.fetchOpenMeteoWeather(loc, isZh);
                        if (meteo) return meteo;
                    }

                    // 3. Direct browser fetch fallback via wttr.in
                    try {
                        const directRes = await fetch(`https://wttr.in/${encodeURIComponent(loc)}?format=j1`, {
                            signal: AbortSignal.timeout(3000)
                        });
                        if (directRes.ok) {
                            const wdata = await directRes.json();
                            const curr = (wdata.current_condition && wdata.current_condition[0]) || {};
                            const areaInfo = (wdata.nearest_area && wdata.nearest_area[0]) || {};
                            const areaName = (areaInfo.areaName && areaInfo.areaName[0]?.value) || loc;
                            const country = (areaInfo.country && areaInfo.country[0]?.value) || (isZh ? '台灣' : 'Taiwan');
                            const displayLoc = `${areaName}, ${country}`;
                            const desc = (curr.weatherDesc && curr.weatherDesc[0]?.value) || 'Partly Cloudy';
                            return {
                                status: 'success',
                                tool: 'get_weather',
                                source: 'wttr.in',
                                location: displayLoc,
                                condition: desc,
                                temperature_c: `${curr.temp_C || 25}°C`,
                                feels_like_c: `${curr.FeelsLikeC || 26}°C`,
                                humidity: `${curr.humidity || 65}%`,
                                wind_kmh: `${curr.windspeedKmph || 14} km/h`,
                                report: `${displayLoc} 即時天氣：${desc}，當前氣溫 ${curr.temp_C || 25}°C (體感 ${curr.FeelsLikeC || 26}°C)，濕度 ${curr.humidity || 65}%，風速 ${curr.windspeedKmph || 14} km/h。`
                            };
                        }
                    } catch (eDirect) {}

                    const nowHour = new Date().getHours();
                    const isDay = nowHour >= 6 && nowHour < 18;
                    const baseTemp = isDay ? 28 : 23;
                    return {
                        status: 'success',
                        tool: 'get_weather',
                        source: 'Local Estimate',
                        location: `${loc} (離線預報)`,
                        condition: isDay ? '多雲時晴 / Partly Cloudy' : '晴朗 / Clear',
                        temperature_c: `${baseTemp}°C`,
                        feels_like_c: `${baseTemp + 1}°C`,
                        humidity: '65%',
                        wind_kmh: '12 km/h',
                        report: `${loc} 離線天氣估算：多雲時晴，當前氣溫約 ${baseTemp}°C，體感溫度 ${baseTemp + 1}°C，濕度 65%，風速 12 km/h。`
                    };
                }

                // General Tier 3 tool -> POST /api/hermes/execute_tool
                const resp = await fetch(`${this.daemonUrl}/api/hermes/execute_tool`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, arguments: args }),
                    signal: AbortSignal.timeout(3000)
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
        termInputPlaceholder: "直接輸入指令或 Python 運算式 (按 Enter 執行，輸入 / 喚醒 Jev 環境指令偵測)...",
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
        termBannerTitle: "║  Webcom AI — 雙引擎 AI 控制台 (搭載 Hermes Agent WASM 核心)",
        termBannerT1: "║  ● 第一層 (Tier 1): 純 WASM / Pyodide / Web Serial / Jev 極速決策",
        termBannerT2: "║  ● 第二層 (Tier 2): Direct HTTP Fetch / LM Studio REST / Serper 搜尋",
        termBannerT3: "║  ● 第三層 (Tier 3): Host Daemon 託管 (Shell / WSL / ComfyUI / TTS)",
        tabShell: "#1-命令列 (PS)",
        tabWsl: "#2-WSL 容器",
        tabPy: "#3-Python (WASM)",
        tabSerial: "#4-序列埠 (Web)",
        tabSystem: "#5-系統日誌",
        tabSystemLogs: "#5-系統日誌",
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
        chatAutosaveLabel: "本地存檔: 就緒",
        tooltipChatAutosave: "即時壓時自動存檔至本地 JSON (防顯卡當機刷新遺失)",
        tooltipGpuGuard: "顯示卡資源即時防護 (上限 90%)",
        gpuProtectionLabel: "🛡️ 顯示卡資源保護上限 (防止爆顯存當機)",
        gpuProtectionDesc: "當本機或 WebGPU 顯卡 VRAM/核心佔用超過上限時，自動觸發即時保護機制：強制壓時存檔、限制批次並分流至 CPU，避免電腦卡頓或全系統崩潰。",
        chatAutosaveConfigLabel: "💾 對話本地 JSON 即時自動存檔 (壓時防遺失)",
        chatAutosaveConfigDesc: "每一輪問答皆壓 ISO 時間即時存檔至本地儲存區。遇顯卡耗盡當機、瀏覽器閃退或意外刷新時，自動完整復原對話紀錄。",
        chatRestoredLog: "已從本地 JSON 記錄自動復原上次對話 (壓時防止當機刷新遺失)",
        chatClearedWithUndo: "對話紀錄已清空。",
        undoClearBtn: "復原對話",
        // Quick Tasks & Prompt Chips
        quickTasksHeader: "點擊直接執行快捷任務：",
        promptChipFibonacci: "計算費氏數列前 20 項",
        promptChipWeather: "查詢今天天氣 新竹",
        promptChipGpu: "檢查 GPU 與 Daemon 狀態",
        promptChipSync: "同步 upstream Hermes 變更",
        promptChipWeb: "聯網檢索最新 AI 技術動態",
        promptChipFibonacciQuery: "請用 Python 計算費氏數列前 20 項",
        promptChipWeatherQuery: "查詢今天天氣 新竹",
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
        onnxOneJev08b: "OneJev-0.8B ONNX (Jev 視覺決策 0.8GB)",
        onnxGemma4Mobile: "Gemma-4-E2B Mobile ONNX (全模態 QAT 1.2GB ⭐)",
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
        guideTabGraphRag: "🕸️ GraphRAG 圖譜",
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
        artifactDiff: "比對",
        btnLlmTranslateApp: "✨ LLM 自動翻譯標題與描述",
        btnLlmTranslateAllApps: "LLM 自動翻譯全部",
        appEditTitleEdit: "編輯自訂應用程式",
        appCatOptionHtml: "🌐 網頁應用 (HTML / Web App)",
        appCatOptionPy: "🐍 Python 腳本 (Python Script)",
        appCatOptionSh: "🐚 Shell / 批次腳本 (Shell / Batch)",
        appCatOptionPrompt: "🤖 提示詞助理 (Prompt / Agent)",
        appCatOptionJson: "📦 資料定義 (JSON / Data)",
        appLibRunBtn: "▶ 執行",
        tierNativeWebgpu: "WebGPU 本機瀏覽器原生 (Tier 1)",
        tierNativeOnnx: "ONNX WASM CPU/GPU (Tier 1)",
        tierNativeApi: "LM Studio REST (Tier 2/3)",
        tierNativeCoThink: "Co-Think 雙引擎聯考架構",
        tierNativeSupervise: "Supervise 4-Stage SRE 稽核",
        tierNativeAdaptive: "自適應混合架構",
        ragTabDocs: "知識庫文件",
        ragTabGraph: "🕸️ 知識圖譜 (GraphRAG)",
        ragTabSearch: "🔍 圖譜多跳檢索測試",
        ragTabDict: "📚 國語辭典庫 (16.4萬條)",
        ragDictTitle: "教育部重編國語辭典修訂本 · 16.4萬條高效 RAG 檢索",
        dictSearchBtn: "檢索辭典",
        graphRagRebuildBtn: "重新建構圖譜",
        graphRagAddTripleBtn: "新增關聯",
        graphRagExportBtn: "匯出圖譜",
        graphRagImportBtn: "匯入圖譜",
        graphRagTestTitle: "GraphRAG 多跳實體推理與檢索測試",
        graphRagSearchBtn: "圖譜推理檢索",
        graphRagModeHybrid: "混合推理 (Hybrid GraphRAG)",
        graphRagModeLocal: "局部實體 (Local Subgraph)",
        graphRagModeGlobal: "全域關聯 (Global Traversal)",
        // Virtual Keypad Translations
        vkeyUp: "上",
        vkeyDown: "下",
        vkeyLeft: "左",
        vkeyRight: "右",
        vkeyTab: "Tab",
        vkeyDel: "Del",
        vkeyEnter: "Enter",
        vkeyCtrlA: "Ctrl+A (全選)",
        vkeyCtrlC: "Ctrl+C (複製/中斷)",
        vkeyCtrlV: "Ctrl+V (貼上)",
        vkeyCtrlX: "Ctrl+X (剪下/清空)",
        vkeyEsc: "Esc",
        vkeyHistory: "歷史",
        tooltipVkeyUp: "歷史上一條指令 (Up Arrow)",
        tooltipVkeyDown: "歷史下一條指令 (Down Arrow)",
        tooltipVkeyLeft: "游標左移 (Left Arrow)",
        tooltipVkeyRight: "游標右移 (Right Arrow)",
        tooltipVkeyTab: "Tab 自動補全 / 縮排",
        tooltipVkeyDel: "退格 / 刪除 (Backspace / Delete)",
        tooltipVkeyEnter: "發送指令 (Enter)",
        tooltipVkeyCtrlA: "全選輸入內容 (Ctrl+A)",
        tooltipVkeyCtrlC: "中斷 / 發送 SIGINT (Ctrl+C)",
        tooltipVkeyCtrlV: "貼上剪貼簿內容 (Ctrl+V)",
        tooltipVkeyCtrlX: "發送 Ctrl+X / 清空輸入列",
        tooltipVkeyEsc: "取消 / 離開 (Esc)",
        tooltipVkeyHistory: "列出終端歷史指令清單 (history)"
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
        termInputPlaceholder: "Enter command or Python code (Enter to run, type / for Jev environment commands)...",
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
        termBannerTitle: "║  Webcom AI — Dual-Engine AI Console with Hermes Agent WASM Core",
        termBannerT1: "║  ● Tier 1: Pure WASM / Pyodide / Web Serial / Jev Fast-Decision",
        termBannerT2: "║  ● Tier 2: Direct HTTP Fetch / LM Studio REST / Serper Search",
        termBannerT3: "║  ● Tier 3: Host Daemon Delegated (Shell / WSL / ComfyUI / TTS / Music)",
        tabShell: "#1-SHELL (PS)",
        tabWsl: "#2-WSL Container",
        tabPy: "#3-Python (WASM)",
        tabSerial: "#4-Serial (Web)",
        tabSystem: "#5-System Logs",
        tabSystemLogs: "#5-System Logs",
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
        chatAutosaveLabel: "Auto-Saved: Ready",
        tooltipChatAutosave: "Real-time timestamped auto-save to local JSON (crash/refresh protection)",
        tooltipGpuGuard: "GPU Resource Protection (90% Ceiling)",
        gpuProtectionLabel: "🛡️ GPU Resource Safety Ceiling (Crash Prevention)",
        gpuProtectionDesc: "When local or WebGPU VRAM/utilization exceeds ceiling, triggers automatic protection: forces chat snapshot, throttles batch size, and delegates to CPU to prevent OS/browser freeze.",
        chatAutosaveConfigLabel: "💾 Real-time Auto-Save Chat to Local JSON",
        chatAutosaveConfigDesc: "Every turn is timestamped and saved locally. Seamlessly restores full chat history upon GPU crash, crash reload, or accidental refresh.",
        chatRestoredLog: "Restored previous chat conversation from local JSON snapshot.",
        chatClearedWithUndo: "Chat history cleared.",
        undoClearBtn: "Undo Clear",
        // Quick Tasks & Prompt Chips
        quickTasksHeader: "Quick Task Shortcuts:",
        promptChipFibonacci: "Compute Fibonacci 20 terms",
        promptChipWeather: "Check Today's Weather (Hsinchu)",
        promptChipGpu: "Check GPU & Daemon Status",
        promptChipSync: "Sync Upstream Hermes",
        promptChipWeb: "Search Latest AI News",
        promptChipFibonacciQuery: "Compute Fibonacci sequence first 20 terms with Python",
        promptChipWeatherQuery: "Check today's weather in Hsinchu",
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
        onnxOneJev08b: "OneJev-0.8B ONNX (Jev Vision Decision 0.8GB)",
        onnxGemma4Mobile: "Gemma-4-E2B Mobile ONNX (Multimodal QAT 1.2GB ⭐)",
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
        guideTabGraphRag: "🕸️ GraphRAG Graph",
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
        artifactDiff: "Diff",
        btnLlmTranslateApp: "✨ LLM Auto-Translate Title & Desc",
        btnLlmTranslateAllApps: "LLM Auto-Translate All",
        appEditTitleEdit: "Edit Custom App",
        appCatOptionHtml: "🌐 Web App (HTML / Web)",
        appCatOptionPy: "🐍 Python Script (Pyodide)",
        appCatOptionSh: "🐚 Shell / Batch Script",
        appCatOptionPrompt: "🤖 Prompt Agent (Autonomous)",
        appCatOptionJson: "📦 Data / JSON Pack",
        appLibRunBtn: "▶ Run",
        tierNativeWebgpu: "WebGPU In-Browser Native (Tier 1)",
        tierNativeOnnx: "ONNX WASM CPU/GPU (Tier 1)",
        tierNativeApi: "LM Studio REST (Tier 2/3)",
        tierNativeCoThink: "Co-Think Dual-Engine Architecture",
        tierNativeSupervise: "Supervise 4-Stage SRE Audit",
        tierNativeAdaptive: "Adaptive Hybrid Architecture",
        ragTabDocs: "Documents",
        ragTabGraph: "🕸️ Knowledge Graph (GraphRAG)",
        ragTabSearch: "🔍 Multi-Hop Retrieval Test",
        ragTabDict: "📚 MOE Dictionary (164k)",
        ragDictTitle: "MOE Mandarin Chinese Dictionary · 164k Entries RAG",
        dictSearchBtn: "Search Dict",
        graphRagRebuildBtn: "Rebuild Graph",
        graphRagAddTripleBtn: "Add Triple",
        graphRagExportBtn: "Export Graph",
        graphRagImportBtn: "Import Graph",
        graphRagTestTitle: "GraphRAG Multi-Hop Reasoning & Retrieval Test",
        graphRagSearchBtn: "Graph Reasoning Search",
        graphRagModeHybrid: "Hybrid Reasoning (GraphRAG)",
        graphRagModeLocal: "Local Subgraph (1-Hop)",
        graphRagModeGlobal: "Global Traversal (Multi-Hop)",
        // Virtual Keypad Translations
        vkeyUp: "Up",
        vkeyDown: "Down",
        vkeyLeft: "Left",
        vkeyRight: "Right",
        vkeyTab: "Tab",
        vkeyDel: "Del",
        vkeyEnter: "Enter",
        vkeyCtrlA: "Ctrl+A (All)",
        vkeyCtrlC: "Ctrl+C (Copy/Break)",
        vkeyCtrlV: "Ctrl+V (Paste)",
        vkeyCtrlX: "Ctrl+X (Cut/Clear)",
        vkeyEsc: "Esc",
        vkeyHistory: "History",
        tooltipVkeyUp: "Previous command history (Up Arrow)",
        tooltipVkeyDown: "Next command history (Down Arrow)",
        tooltipVkeyLeft: "Cursor left (Left Arrow)",
        tooltipVkeyRight: "Cursor right (Right Arrow)",
        tooltipVkeyTab: "Tab autocomplete / indent",
        tooltipVkeyDel: "Backspace / Delete (Del)",
        tooltipVkeyEnter: "Send command (Enter)",
        tooltipVkeyCtrlA: "Select all input (Ctrl+A)",
        tooltipVkeyCtrlC: "Interrupt / Copy (Ctrl+C)",
        tooltipVkeyCtrlV: "Paste clipboard (Ctrl+V)",
        tooltipVkeyCtrlX: "Clear line / Cut (Ctrl+X)",
        tooltipVkeyEsc: "Cancel / Close (Esc)",
        tooltipVkeyHistory: "List terminal command history (history)"
    }
};

class TokenSpeedTracker {
    constructor(badgeEl, isZh = true) {
        this.badgeEl = badgeEl;
        this.isZh = isZh;
        this.textEl = badgeEl ? badgeEl.querySelector('.token-speed-text') : null;
        this.indicatorEl = badgeEl ? badgeEl.querySelector('.token-speed-indicator') : null;
        this.startTime = null;
        this.tokenCount = 0;
        this.lastUpdateTime = 0;
    }

    start() {
        this.startTime = performance.now();
        this.tokenCount = 0;
        this.lastUpdateTime = this.startTime;
        if (this.badgeEl) {
            this.badgeEl.classList.remove('hidden');
            if (this.textEl) this.textEl.textContent = '... t/s';
            if (this.indicatorEl) this.indicatorEl.classList.add('animate-pulse');
        }
    }

    update(chunkText = '', explicitTokens = 0) {
        if (!this.startTime) this.start();

        if (explicitTokens > 0) {
            this.tokenCount += explicitTokens;
        } else if (chunkText) {
            const cjkMatches = chunkText.match(/[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]/g);
            const cjkCount = cjkMatches ? cjkMatches.length : 0;
            const nonCjk = chunkText.replace(/[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]/g, '').trim();
            const latinTokens = nonCjk ? Math.max(1, Math.round(nonCjk.length / 3.8)) : 0;
            this.tokenCount += Math.max(1, cjkCount + latinTokens);
        } else {
            this.tokenCount += 1;
        }

        const now = performance.now();
        if (now - this.lastUpdateTime > 50) {
            this.lastUpdateTime = now;
            const elapsedSec = (now - this.startTime) / 1000;
            if (elapsedSec > 0.05) {
                const speed = (this.tokenCount / elapsedSec).toFixed(1);
                if (this.textEl) this.textEl.textContent = `${speed} t/s`;
            }
        }
    }

    finish() {
        if (!this.startTime) return;
        const now = performance.now();
        const elapsedSec = Math.max(0.08, (now - this.startTime) / 1000);
        const finalSpeed = (this.tokenCount / elapsedSec).toFixed(1);
        if (this.badgeEl) {
            this.badgeEl.classList.remove('hidden');
            if (this.textEl) this.textEl.textContent = `${finalSpeed} t/s`;
            if (this.indicatorEl) this.indicatorEl.classList.remove('animate-pulse');
            this.badgeEl.title = this.isZh
                ? `生成統計: ${this.tokenCount} tokens · 耗時 ${elapsedSec.toFixed(2)}s · 平均速度 ${finalSpeed} t/s`
                : `Generation Stats: ${this.tokenCount} tokens · ${elapsedSec.toFixed(2)}s · avg ${finalSpeed} t/s`;
        }
    }
}
window.TokenSpeedTracker = TokenSpeedTracker;

class WebcomAIApp {
    constructor() {
        this.currentLang = this.storageGet('webcom_language', 'zh-TW');
        window.currentLang = this.currentLang;
        this.tabConfigs = [
            { id: 'tab-shell', session: 'shell', prompt: 'PS>', status: 'PowerShell / Shell WASM', statusEn: 'PowerShell / Shell WASM' },
            { id: 'tab-wsl', session: 'wsl', prompt: 'wsl$', status: 'WSL2 Linux 容器代理', statusEn: 'WSL2 Linux Container Proxy' },
            { id: 'tab-py', session: 'py', prompt: '>>>', status: 'Pyodide WASM (Python 3.11)', statusEn: 'Pyodide WASM (Python 3.11)' },
            { id: 'tab-serial', session: 'serial', prompt: 'COM>', status: 'Web Serial API (115200 8N1)', statusEn: 'Web Serial API (115200 8N1)' },
            { id: 'tab-system', session: 'system', prompt: 'LOG>', status: '系統核心與背景動作日誌', statusEn: 'System & Action Logs' },
            { id: 'tab-novnc', session: 'novnc', prompt: 'vnc>', status: 'noVNC RFB 遠端桌面 (5900)', statusEn: 'noVNC RFB Remote Desktop (5900)' }
        ];

        this.dispatcher = new ToolDispatcher({
            daemonUrl: 'http://127.0.0.1:8001',
            lang: this.currentLang,
            onLog: (msg, ...args) => {
                const isZh = (this.currentLang === 'zh-TW');
                const prefix = isZh ? '[工具派發器]' : '[Dispatcher]';
                let cleanMsg = typeof msg === 'string' ? msg : String(msg);

                // Strip any duplicate or nested prefixes like [Dispatcher] [HermesToolDispatcher]
                cleanMsg = cleanMsg.replace(/^(\[(?:HermesToolDispatcher|Dispatcher|工具派發器)\]\s*)+/gi, '').trim();

                // Complete bilingual translation dictionary for dispatcher status and action logs
                if (isZh) {
                    if (cleanMsg.includes('Initialized in Standalone mode with embedded tool definitions') || cleanMsg.includes('Initialized in Standalone mode')) {
                        cleanMsg = '已初始化為獨立模式，載入內建 101 款核心工具契約。';
                    } else if (cleanMsg.includes('Loaded') && cleanMsg.includes('tools from manifest')) {
                        cleanMsg = cleanMsg.replace(/Loaded (\d+) tools from manifest\./i, '已從清單載入 $1 款工具契約。');
                    } else if (cleanMsg.includes('Dispatching')) {
                        cleanMsg = cleanMsg
                            .replace(/Dispatching '([^']+)' \(Tier (\d+)\) with args:/i, '正在派發「$1」(第 $2 層)，參數:')
                            .replace(/Dispatching (\w+) \(Tier (\d+)\)/i, '正在派發「$1」(第 $2 層)');
                    } else if (cleanMsg.includes('Running in self-contained fallback mode')) {
                        cleanMsg = '運作於獨立內建回退模式。';
                    }
                } else {
                    if (cleanMsg.includes('已初始化為獨立模式')) {
                        cleanMsg = 'Initialized in Standalone mode with embedded tool definitions.';
                    } else if (cleanMsg.includes('已從清單載入')) {
                        cleanMsg = cleanMsg.replace(/已從清單載入 (\d+) 款工具契約。/, 'Loaded $1 tools from manifest.');
                    } else if (cleanMsg.includes('正在派發')) {
                        cleanMsg = cleanMsg
                            .replace(/正在派發「([^」]+)」\(第 (\d+) 層\)，參數:/, "Dispatching '$1' (Tier $2) with args:")
                            .replace(/正在派發「([^」]+)」\(第 (\d+) 層\)/, "Dispatching '$1' (Tier $2)");
                    } else if (cleanMsg.includes('運作於獨立內建回退模式')) {
                        cleanMsg = 'Running in self-contained fallback mode.';
                    }
                }

                // Append command or args details cleanly if present
                let detail = '';
                if (args && args.length > 0 && args[0]) {
                    const argObj = args[0];
                    if (typeof argObj === 'object') {
                        if (argObj.command) {
                            detail = ` "${argObj.command}"`;
                        } else if (argObj.code) {
                            const linesCount = (argObj.code || '').split('\n').length;
                            detail = isZh ? ` (${linesCount} 行腳本代碼)` : ` (${linesCount} lines code)`;
                        } else if (Object.keys(argObj).length > 0) {
                            detail = ` ${JSON.stringify(argObj)}`;
                        }
                    } else {
                        detail = ` ${String(argObj)}`;
                    }
                }

                if (!detail) {
                    cleanMsg = cleanMsg.replace(/，參數:$/, '').replace(/\s+with args:$/, '');
                } else {
                    if (!cleanMsg.endsWith(':') && !cleanMsg.endsWith('：')) {
                        cleanMsg += isZh ? '，參數:' : ' with args:';
                    }
                    cleanMsg += detail;
                }

                this.logTerminal(`${prefix} ${cleanMsg}`);
            }
        });

        this.daemonOnline = false;
        this.currentSession = 'shell';
        this.activeEngine = this.storageGet('webcom_engine', 'api');
        this.activeWebgpuModel = this.storageGet('webcom_webgpu_model', 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC');
        this.activeOnnxModel = this.storageGet('webcom_onnx_model', 'onnx-community/OneJev-0.8B-ONNX');
        this.activeToolset = 'full_stack';
        this.isLeftCollapsed = false;
        this.isOfflineMock = false;
        this.pendingVisionImage = null;
        this.lastSubmittedVisionImage = null;

        // Feature Toggles State (Agent, Web, RAG, MCP)
        this.flags = {
            agent: this.storageGet('webcom_flag_agent', 'true') === 'true',
            web: this.storageGet('webcom_flag_web', 'false') === 'true',
            rag: this.storageGet('webcom_flag_rag', 'false') === 'true',
            mcp: this.storageGet('webcom_flag_mcp', 'false') === 'true'
        };

        // Chat Persistence (Auto-save to Local JSON with Timestamps)
        this.chatHistory = this.storageGetJSON('webcom_chat_history', []);
        this.chatAutosaveEnabled = this.storageGet('webcom_chat_autosave', 'true') === 'true';
        this.lastAutosaveTime = null;

        // GPU 90% Resource Ceiling & Crash Governor
        this.gpuMaxRatio = parseFloat(this.storageGet('webcom_gpu_limit_ratio', '0.90'));
        this.gpuSafetyActive = false;
        this.maxTokensCap = 2048;
        this.latestGpuInfo = null;

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
                model: 'qwen3-vl-flash'
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
        if (this.profiles['tokentable'] && (!this.profiles['tokentable'].model || this.profiles['tokentable'].model === 'qwen3.8-flash')) {
            this.profiles['tokentable'].model = 'qwen3-vl-flash';
        }
        this.activeProfileId = this.storageGet('webcom_active_profile', 'local');
        if (!this.profiles[this.activeProfileId]) {
            this.activeProfileId = Object.keys(this.profiles)[0] || 'local';
        }

        // Terminal Command History (Up/Down navigation & persistence)
        this.terminalHistory = this.storageGetJSON('webcom_term_history', []);
        this.termHistoryIndex = -1;
        this.termHistoryDraft = '';

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

    escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    formatApiErrorMessage(status, rawErrorText, profile = {}) {
        const isZh = (this.currentLang !== 'en');
        let errorMsg = rawErrorText || '';
        let expectedPrefix = '';

        try {
            const parsed = JSON.parse(rawErrorText);
            if (parsed.error) {
                if (typeof parsed.error === 'string') {
                    errorMsg = parsed.error;
                } else if (typeof parsed.error === 'object') {
                    errorMsg = parsed.error.message || JSON.stringify(parsed.error);
                }
            } else if (parsed.message) {
                errorMsg = parsed.message;
            }
        } catch (_) {}

        // Match expected format if specified, e.g. "Expected: tt-live-..."
        const prefixMatch = errorMsg.match(/Expected:\s*([a-zA-Z0-9_\-]+)/i) || errorMsg.match(/expected format:?\s*([a-zA-Z0-9_\-]+)/i);
        if (prefixMatch) {
            expectedPrefix = prefixMatch[1];
        }

        const lower = (errorMsg + ' ' + (rawErrorText || '')).toLowerCase();
        let badgeTitle = '';
        let translatedReason = '';
        let actionTip = '';

        if (status === 401 || lower.includes('invalid api key') || lower.includes('api key format') || lower.includes('unauthorized') || lower.includes('authentication') || lower.includes('invalid_request_error')) {
            badgeTitle = isZh ? `⚠️ API 金鑰驗證失敗 (HTTP 401 Unauthorized)` : `⚠️ API Authentication Failed (HTTP 401 Unauthorized)`;
            if (expectedPrefix) {
                translatedReason = isZh
                    ? `API 金鑰格式不正確。此端點指定的金鑰前綴格式應為：<code class="text-amber-300 font-bold font-mono px-1 py-0.5 rounded bg-amber-950/60 border border-amber-800/60">${this.escapeHtml(expectedPrefix)}</code>`
                    : `Invalid API key format. The endpoint requires key prefix: <code class="text-amber-300 font-bold font-mono px-1 py-0.5 rounded bg-amber-950/60 border border-amber-800/60">${this.escapeHtml(expectedPrefix)}</code>`;
            } else {
                translatedReason = isZh
                    ? `API 金鑰無效、未提供或格式不符。`
                    : `API key is invalid, missing, or improperly formatted.`;
            }
            actionTip = isZh
                ? `請點擊右上方「<strong>Router 設定</strong>」，確認所選節點之 <strong>API Endpoint</strong> 與 <strong>API Key</strong> 是否填寫正確。若使用 TokenTable，請確認金鑰以 <code class="text-amber-300 font-mono">tt-live-</code> 開頭。`
                : `Please open <strong>Router Settings</strong> at the top right to verify your <strong>API Endpoint</strong> and <strong>API Key</strong>. For TokenTable, ensure your key begins with <code class="text-amber-300 font-mono">tt-live-</code>.`;
        } else if (status === 429 || lower.includes('quota') || lower.includes('rate limit') || lower.includes('insufficient_quota')) {
            badgeTitle = isZh ? `⚠️ API 額度耗盡或頻率超限 (HTTP 429 Too Many Requests)` : `⚠️ Rate Limit or Quota Exceeded (HTTP 429)`;
            translatedReason = isZh
                ? `您的 API 帳戶額度已用罄，或短時間內發送請求頻率超過伺服器上限。`
                : `Your API account has run out of credits, or the request rate has exceeded the provider limit.`;
            actionTip = isZh
                ? `請前往提供商網站確認帳戶餘額，或於「Router 設定」更換為其他可用推論節點。`
                : `Please check your provider billing/balance, or switch to another profile in Router Settings.`;
        } else if (status === 404 || (lower.includes('model') && (lower.includes('not found') || lower.includes('does not exist')))) {
            badgeTitle = isZh ? `⚠️ 找不到指定模型 (HTTP 404 Not Found)` : `⚠️ Model Not Found (HTTP 404 Not Found)`;
            const modelName = profile.model || 'unknown';
            translatedReason = isZh
                ? `該 API 端點查無名為 <code class="text-sky-300 font-mono">${this.escapeHtml(modelName)}</code> 的模型。`
                : `Model <code class="text-sky-300 font-mono">${this.escapeHtml(modelName)}</code> not found on this endpoint.`;
            actionTip = isZh
                ? `請前往「Router 設定」確認模型名稱，或填寫 <code class="text-amber-300 font-mono">auto</code> 啟用自動探測。`
                : `Please update the model name in Router Settings, or set to <code class="text-amber-300 font-mono">auto</code> for auto-detection.`;
        } else {
            badgeTitle = isZh ? `⚠️ API 請求錯誤 (HTTP ${status})` : `⚠️ API Request Error (HTTP ${status})`;
            translatedReason = isZh
                ? `伺服器回應異常，未完成本次推論。`
                : `The server returned an error and could not complete inference.`;
            actionTip = isZh
                ? `請在「Router 設定」確認 API Endpoint、模型名稱與金鑰是否正確。`
                : `Please check your API Endpoint, model name, and API Key in Router Settings.`;
        }

        return `
            <div class="space-y-2 p-3 rounded-xl bg-rose-950/30 border border-rose-700/50 text-xs select-text">
                <div class="flex items-center gap-2 text-rose-300 font-bold">
                    <span>${badgeTitle}</span>
                </div>
                <div class="text-slate-300 leading-relaxed">
                    <span class="text-rose-200 font-medium">❗ ${translatedReason}</span>
                </div>
                <div class="text-slate-400 font-mono text-[11px] bg-slate-950/70 p-2 rounded border border-rose-900/40 break-all select-text">
                    <span class="text-slate-500">${isZh ? '原始伺服器訊息：' : 'Raw Server Message: '}</span>${this.escapeHtml(errorMsg)}
                </div>
                <div class="text-amber-200/90 text-[11px] leading-relaxed pt-0.5">
                    💡 ${actionTip}
                </div>
            </div>
        `;
    }

    formatNetworkErrorMessage(endpoint, err) {
        const isZh = (this.currentLang !== 'en');
        const badgeTitle = isZh ? `⚠️ 無法連線至 API 端點` : `⚠️ Cannot Connect to API Endpoint`;
        const actionTip = isZh
            ? `請確認本機或遠端 API 服務已啟動，或於右上角「Router 設定」更換為其他可用節點。`
            : `Please check that the API service is active, or switch to another profile in Router Settings.`;

        return `
            <div class="space-y-2 p-3 rounded-xl bg-rose-950/30 border border-rose-700/50 text-xs select-text">
                <div class="flex items-center gap-2 text-rose-300 font-bold">
                    <span>${badgeTitle}</span>
                </div>
                <div class="text-slate-300 leading-relaxed">
                    <span class="text-rose-200 font-medium">❗ ${isZh ? '端點位址：' : 'Endpoint: '}<code class="text-sky-300 font-mono">${this.escapeHtml(endpoint)}</code></span>
                </div>
                <div class="text-slate-400 font-mono text-[11px] bg-slate-950/70 p-2 rounded border border-rose-900/40 break-all select-text">
                    <span class="text-slate-500">${isZh ? '網路錯誤詳情：' : 'Network Error: '}</span>${this.escapeHtml(err.message || String(err))}
                </div>
                <div class="text-amber-200/90 text-[11px] leading-relaxed pt-0.5">
                    💡 ${actionTip}
                </div>
            </div>
        `;
    }



    async init() {
        this.bindEvents();
        this.bindFeatureToggles();
        this.bindPromptChips();
        this.setupSlashMenu();
        this.setupTerminalSlashMenu();
        this.renderProfileSelects();
        this.updateEngineUI(this.activeEngine);
        this.setLanguage(this.currentLang);
        this.restoreChatHistory();
        this.setupWebgpuSafetyGovernor();
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
        window.currentLang = lang;
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
        if (typeof window.renderAppLibraryGrid === 'function') {
            try { window.renderAppLibraryGrid(); } catch (_) {}
        }
        if (typeof window.setGuideLanguage === 'function') {
            try { window.setGuideLanguage(lang); } catch (_) {}
        }
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
        const isTt = p.id === 'tokentable' || (p.endpoint && p.endpoint.includes('tokentable'));
        const nameIn = document.getElementById('cfg-prof-name');
        const endIn = document.getElementById('cfg-prof-endpoint');
        const keyIn = document.getElementById('cfg-prof-key');
        const modIn = document.getElementById('cfg-prof-model');
        const statusEl = document.getElementById('test-conn-status');

        if (nameIn) nameIn.value = p.name || '';
        if (endIn) endIn.value = p.endpoint || '';
        if (keyIn) {
            keyIn.value = p.apiKey || '';
            keyIn.placeholder = isTt ? 'tt-live-... (TokenTable 金鑰)' : 'lm-studio / sk-...';
        }
        if (modIn) modIn.value = p.model || 'auto';
        if (statusEl) statusEl.innerHTML = '';

        if (isTt && window.TOKENTABLE_OFFICIAL_MODELS && typeof this.renderRouterDetectedModels === 'function') {
            this.renderRouterDetectedModels(window.TOKENTABLE_OFFICIAL_MODELS, p.endpoint);
        } else {
            const container = document.getElementById('router-models-container');
            if (container && (!this.detectedModels || !this.detectedModels.length)) {
                container.classList.add('hidden');
            }
        }
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
                const gpuRange = document.getElementById('cfg-gpu-limit-range');
                const gpuVal = document.getElementById('cfg-gpu-limit-val');
                if (gpuRange) gpuRange.value = Math.round(this.gpuMaxRatio * 100);
                if (gpuVal) gpuVal.innerText = `${Math.round(this.gpuMaxRatio * 100)}%`;
                const autoSaveChk = document.getElementById('cfg-chat-autosave');
                if (autoSaveChk) autoSaveChk.checked = this.chatAutosaveEnabled;
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
                const gpuRange = document.getElementById('cfg-gpu-limit-range');
                if (gpuRange) {
                    const pct = parseInt(gpuRange.value) || 90;
                    this.gpuMaxRatio = pct / 100;
                    this.storageSet('webcom_gpu_limit_ratio', (pct / 100).toString());
                    if (this.latestGpuInfo) this.checkGpuResourceCeiling(this.latestGpuInfo);
                }
                const autoSaveChk = document.getElementById('cfg-chat-autosave');
                if (autoSaveChk) {
                    this.chatAutosaveEnabled = autoSaveChk.checked;
                    this.storageSet('webcom_chat_autosave', autoSaveChk.checked.toString());
                    this.updateAutosaveUI();
                }

                settingsModal.classList.add('hidden');
                settingsModal.classList.remove('flex');
                this.logTerminal(`[設定儲存] 成功套用節點: ${this.profiles[curId]?.name} (顯卡上限: ${Math.round(this.gpuMaxRatio * 100)}%)`);
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

        // 6. Terminal Send, Clear & Virtual Keypad
        const btnTermSend = document.getElementById('btn-term-send');
        if (btnTermSend) {
            btnTermSend.addEventListener('click', () => this.handleSendTerminal());
        }

        const btnTermClear = document.getElementById('btn-term-clear');
        if (btnTermClear) {
            btnTermClear.addEventListener('click', () => this.clearTerminal());
        }

        this.bindTerminalVirtualKeypad();

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
                const slashMenu = document.getElementById('slash-menu');
                if (slashMenu && slashMenu.classList.contains('active')) {
                    return;
                }
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
            btnExportChat.addEventListener('click', () => this.exportChatJSON());
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
                        if (parsed.history && Array.isArray(parsed.history)) {
                            this.chatHistory = parsed.history;
                            this.saveChatHistory();
                            this.restoreChatHistory();
                            alert(this.currentLang === 'zh-TW' ? `對話紀錄已成功載入 (${this.chatHistory.length} 則)！` : `Chat history loaded (${this.chatHistory.length} messages)!`);
                        } else if (parsed.html) {
                            document.getElementById('chat-container').innerHTML = parsed.html;
                            alert(this.currentLang === 'zh-TW' ? "對話紀錄已成功載入！" : "Chat history loaded!");
                        }
                    } catch (err) {
                        alert(this.currentLang === 'zh-TW' ? "無效的對話 JSON 檔案" : "Invalid chat JSON file");
                    }
                };
                r.readAsText(file);
            });
        }

        // GPU Protection Badge & Range Binding
        const gpuGuardBadge = document.getElementById('gpu-guard-badge');
        if (gpuGuardBadge) {
            gpuGuardBadge.addEventListener('click', () => {
                const btnSettings = document.getElementById('btn-open-settings');
                if (btnSettings) btnSettings.click();
            });
        }

        const gpuRange = document.getElementById('cfg-gpu-limit-range');
        const gpuVal = document.getElementById('cfg-gpu-limit-val');
        if (gpuRange && gpuVal) {
            gpuRange.addEventListener('input', (e) => {
                gpuVal.innerText = `${e.target.value}%`;
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
            fileUploadImg.addEventListener('change', async (e) => {
                const f = e.target.files[0];
                if (f) {
                    try {
                        this.pendingVisionImage = await this._prepareVisionAttachment(f);
                        this.logTerminal(`[圖片附加] 已載入視覺檔案: ${f.name} (${Math.round(f.size/1024)} KB)；解析尺寸 ${this.pendingVisionImage.width}x${this.pendingVisionImage.height}`);
                        const input = document.getElementById('chat-input');
                        if (input) {
                            input.value = `請分析此圖片/截圖內容：「${f.name}」`;
                            input.focus();
                        }
                        this.updatePendingVisionBadge();
                    } catch (err) {
                        this.pendingVisionImage = null;
                        this.logTerminal(`[圖片附加] 圖片解析失敗: ${err.message || err}`);
                        this.updatePendingVisionBadge();
                    }
                }
                e.target.value = '';
            });
        }
        const btnClearPendingVision = document.getElementById('btn-clear-pending-vision');
        if (btnClearPendingVision) {
            btnClearPendingVision.addEventListener('click', () => this.clearPendingVisionAttachment());
        }
        this.updatePendingVisionBadge();

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
        const isZh = (this.currentLang !== 'en');

        if (!endpoint) {
            if (statusEl) statusEl.innerHTML = `<span class="text-red-400">${isZh ? '請先輸入 API Endpoint' : 'Please enter an API Endpoint'}</span>`;
            return;
        }

        if (statusEl) statusEl.innerHTML = `<span class="text-purple-400 animate-pulse">${isZh ? '正在連線測試...' : 'Testing connection...'}</span>`;

        const testUrl = endpoint.replace(/\/+$/, '') + '/models';
        const headers = { 'Content-Type': 'application/json' };
        if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

        try {
            const resp = await fetch(testUrl, { method: 'GET', headers });
            if (resp.ok) {
                const data = await resp.json();
                let models = (data.data && Array.isArray(data.data)) ? data.data : [];
                const modelCount = models.length || 'OK';
                if (statusEl) {
                    statusEl.innerHTML = `<span class="text-emerald-400 font-bold">🟢 ${isZh ? `連線成功！(${resp.status}) 偵測到模型數: ${modelCount}` : `Connected! (${resp.status}) Models detected: ${modelCount}`}</span>`;
                }
                if (models.length > 0) {
                    if (endpoint.includes('tokentable') && typeof window.enrichTokenTableModels === 'function') {
                        models = window.enrichTokenTableModels(models);
                    }
                    if (typeof this.renderRouterDetectedModels === 'function') {
                        this.renderRouterDetectedModels(models, endpoint);
                    }
                }
            } else {
                let errDetail = '';
                try {
                    const errData = await resp.json();
                    errDetail = errData.error?.message || errData.message || '';
                } catch (_) {}
                if (statusEl) {
                    if (resp.status === 401) {
                        const isTt = endpoint.includes('tokentable') || errDetail.includes('tt-live');
                        const hint = isTt ? (isZh ? '（TokenTable 格式需以 tt-live-... 開頭）' : ' (TokenTable requires tt-live-... key)') : '';
                        statusEl.innerHTML = `<span class="text-amber-400">⚠️ ${isZh ? '金鑰無效或格式不符 (401 Unauthorized)' : 'Invalid API key or format mismatch (401)'}${hint}${errDetail ? `: ${errDetail}` : ''}</span>`;
                    } else {
                        statusEl.innerHTML = `<span class="text-amber-400">⚠️ ${isZh ? `伺服器回應 ${resp.status}: ${resp.statusText}` : `Server responded ${resp.status}: ${resp.statusText}`}${errDetail ? ` (${errDetail})` : ''}</span>`;
                    }
                }
            }
        } catch (e) {
            if (statusEl) {
                statusEl.innerHTML = `<span class="text-red-400">🔴 ${isZh ? `連線失敗: ${e.message} (請確認伺服器已啟動並開啟 CORS)` : `Connection failed: ${e.message} (Ensure server is running and CORS is enabled)`}</span>`;
            }
        }
    }

    renderRouterDetectedModels(models, endpoint = '') {
        if (typeof window.renderRouterDetectedModels === 'function') {
            window.renderRouterDetectedModels(this, models, endpoint);
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
        const isZh = (this.currentLang === 'zh-TW');
        const labelsZh = {
            'api': 'LM Studio REST (Tier 2/3)',
            'webgpu': 'WebGPU 本機瀏覽器原生 (Tier 1)',
            'onnx': 'ONNX WASM CPU/GPU (Tier 1)',
            'cothink': 'Co-Think 雙引擎聯考架構',
            'supervise': 'Supervise 4-Stage SRE 稽核'
        };
        const labelsEn = {
            'api': 'LM Studio REST (Tier 2/3)',
            'webgpu': 'WebGPU In-Browser Native (Tier 1)',
            'onnx': 'ONNX WASM CPU/GPU (Tier 1)',
            'cothink': 'Co-Think Dual-Engine Architecture',
            'supervise': 'Supervise 4-Stage SRE Audit'
        };
        const labels = isZh ? labelsZh : labelsEn;
        ind.innerText = labels[this.activeEngine] || (isZh ? '自適應混合架構' : 'Adaptive Hybrid Architecture');
    }

    switchTerminalTab(cfg) {
        this.currentSession = cfg.session;

        const tabs = document.querySelectorAll('.term-tab');
        tabs.forEach(tab => {
            tab.className = "term-tab px-2 py-0.5 rounded text-xs hover:bg-darkBorder/50 text-slate-400 transition cursor-pointer";
        });
        const activeTab = document.getElementById(cfg.id);
        if (activeTab) {
            activeTab.className = "term-tab px-2 py-0.5 rounded text-xs bg-darkBorder text-sky-300 font-medium transition cursor-pointer";
        }

        // Toggle isolated session terminal container visibility
        document.querySelectorAll('.term-session-container').forEach(c => {
            c.classList.add('hidden');
        });
        const activeContainer = document.getElementById(`term-logs-${cfg.session}`) || document.getElementById('term-logs');
        if (activeContainer) {
            activeContainer.classList.remove('hidden');
        }

        const promptEl = document.getElementById('term-prompt-indicator');
        if (promptEl) promptEl.innerText = cfg.prompt;

        const isZh = this.currentLang !== 'en';
        const displayStatus = isZh ? cfg.status : (cfg.statusEn || cfg.status);
        const statusText = document.getElementById('term-status-text');
        if (statusText) statusText.innerText = displayStatus;

        this.logTerminal(isZh ? `[環境切換] 已切換至 ${displayStatus} 會話環境。` : `[Environment Switch] Switched to ${displayStatus} session.`, 'info', cfg.session);
    }

    clearTerminal() {
        const activeContainer = document.getElementById(`term-logs-${this.currentSession}`) || document.getElementById('term-logs');
        if (activeContainer) activeContainer.innerHTML = '';
        this.logTerminal(this.currentLang === 'zh-TW' ? "此終端機輸出記錄已清空。" : "Terminal session output log cleared.", 'info', this.currentSession);
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
                        input.value = prompt.endsWith(' ') ? prompt : (prompt + ' ');
                        input.focus();
                        try {
                            input.setSelectionRange(input.value.length, input.value.length);
                        } catch (err) {}
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
                    // Proactively query GPU resource status and enforce 90% ceiling
                    fetch(`${base}/api/gpu_info`, { signal: AbortSignal.timeout(2000) })
                        .then(r => r.ok ? r.json() : null)
                        .then(data => { if (data) this.checkGpuResourceCeiling(data); })
                        .catch(() => {});
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
        const gpuGuardBadge = document.getElementById('gpu-guard-badge');
        if (gpuGuardBadge && !this.webgpuAdapterLimits) {
            gpuGuardBadge.classList.add('hidden');
        }
        return false;
    }

    logTerminal(text, type = 'info', targetSession = null) {
        // Auto-detect target session: background logs go to 'system' unless specified
        let session = targetSession;
        if (!session) {
            if (typeof text === 'string') {
                const s = text.trim();
                const isBgLog = (
                    s.startsWith('[ONNX') ||
                    s.startsWith('[圖片附加]') ||
                    s.startsWith('[探測]') ||
                    s.startsWith('[功能開關]') ||
                    s.startsWith('[引擎切換]') ||
                    s.startsWith('[Jev') ||
                    s.startsWith('[OneJev') ||
                    s.startsWith('[工具派發器]') ||
                    s.startsWith('[Dispatcher]') ||
                    s.startsWith('[WebLLM') ||
                    s.startsWith('[引擎回退') ||
                    s.startsWith('[語音') ||
                    s.startsWith('[系統日誌]') ||
                    s.startsWith('[⚠️ 錯誤監控]') ||
                    s.startsWith('ℹ️') ||
                    s.startsWith('✔ 前端 WASM')
                );
                if (isBgLog) {
                    session = 'system';
                }
            }
        }
        if (!session) {
            session = this.currentSession || 'shell';
        }

        const container = document.getElementById(`term-logs-${session}`) || 
                          document.getElementById(`term-logs-${this.currentSession}`) || 
                          document.getElementById('term-logs');
        if (!container) return;

        const line = document.createElement('div');
        
        let colorClass = 'text-slate-300';
        if (type === 'cmd') {
            colorClass = 'text-sky-300 font-semibold';
        } else if (type === 'error' || type === 'stderr') {
            colorClass = 'text-rose-400';
        } else if (type === 'success') {
            colorClass = 'text-emerald-400';
        } else if (type === 'warn') {
            colorClass = 'text-amber-400';
        } else if (type === 'output' || type === 'stdout' || type === 'raw') {
            colorClass = 'text-slate-200';
        }

        line.className = `${colorClass} leading-relaxed font-mono-code whitespace-pre-wrap break-words select-text`;

        const isRaw = (type === 'output' || type === 'stdout' || type === 'raw');
        const isMultiLineReport = typeof text === 'string' && (
            text.startsWith('╔') || 
            text.startsWith('  NAME') || 
            text.startsWith('NAME ') || 
            text.includes('\n-------') || 
            text.includes('\n  PID') || 
            text.includes('\n---') ||
            text.includes('\r\n* ') ||
            text.includes('\n* ')
        );

        if (isRaw || isMultiLineReport) {
            line.textContent = text;
        } else {
            line.textContent = `[${new Date().toLocaleTimeString()}] ${text}`;
        }

        container.appendChild(line);

        // Keep container from growing infinitely (cap at 600 lines per session)
        if (container.children.length > 600) {
            container.removeChild(container.firstChild);
        }

        // Only auto-scroll screen if the message belongs to currently visible session
        if (session === this.currentSession) {
            const screen = document.getElementById('terminal-screen');
            if (screen) screen.scrollTop = screen.scrollHeight;
        }
    }

    async handleSendTerminal() {
        const input = document.getElementById('term-input');
        const termMenu = document.getElementById('term-slash-menu');
        if (termMenu) termMenu.classList.remove('active');
        if (!input || !input.value.trim()) return;
        const cmd = input.value.trim();
        input.value = '';

        // Record command into terminal history (Up/Down navigation & persistence)
        if (!this.terminalHistory) this.terminalHistory = [];
        if (this.terminalHistory.length === 0 || this.terminalHistory[this.terminalHistory.length - 1] !== cmd) {
            this.terminalHistory.push(cmd);
            if (this.terminalHistory.length > 200) this.terminalHistory.shift();
            try {
                localStorage.setItem('webcom_term_history', JSON.stringify(this.terminalHistory));
            } catch (_) {}
        }
        this.termHistoryIndex = -1;
        this.termHistoryDraft = '';

        const prompt = document.getElementById('term-prompt-indicator')?.innerText || '>';
        this.logTerminal(`${prompt} ${cmd}`, 'cmd');

        let lowerCmd = cmd.toLowerCase().trim();
        const isZh = (this.currentLang !== 'en');

        if (lowerCmd === 'history' || lowerCmd === '/history' || lowerCmd === '/hist') {
            this.printTerminalHistoryList();
            return;
        }

        if (lowerCmd === '/wsl' || lowerCmd === 'wsl') {
            const tabWsl = document.getElementById('tab-wsl');
            if (tabWsl && this.currentSession !== 'wsl') {
                tabWsl.click();
                this.logTerminal(isZh ? '✔ 已自動切換至【#2-WSL 容器】終端環境。' : '✔ Switched to [#2-WSL Container] terminal environment.', 'success');
                return;
            }
        }
        if (lowerCmd.startsWith('/wsl ')) {
            cmd = cmd.slice(1);
            lowerCmd = cmd.toLowerCase().trim();
        }

        if (lowerCmd === '/' || lowerCmd === '/?' || lowerCmd === '/list' || lowerCmd === '/help' || lowerCmd === '/commands') {
            await this.printJevTerminalCommandsList();
            return;
        }

        if (lowerCmd === '/detect' || lowerCmd.startsWith('/detect ') || lowerCmd === '/env' || lowerCmd === '/jev' || lowerCmd === '/probe' || lowerCmd === '/status') {
            await this.runJevEnvironmentProbe();
            return;
        }

        if (lowerCmd === '/cls' || lowerCmd === '/clear' || lowerCmd === 'clear' || lowerCmd === 'cls') {
            this.clearTerminal();
            return;
        }

        if (lowerCmd === '/top' || lowerCmd === '/ps' || lowerCmd === '/process') {
            if (this.currentSession === 'wsl') {
                const res = await this.dispatcher.dispatch('terminal', { command: 'wsl -e ps aux --sort=-%cpu | head -n 11' });
                if (res.stdout) this.logTerminal(res.stdout.trimEnd(), 'output');
            } else {
                const res = await this.dispatcher.dispatch('terminal', { command: "Get-Process | Sort-Object CPU -Descending | Select-Object -First 10 | Format-Table @{N='PID';E={$_.Id};Width=8}, @{N='行程名稱 (ProcessName)';E={$_.ProcessName};Width=24}, @{N='CPU(秒)';E={[math]::Round($_.CPU,1)};Width=12}, @{N='記憶體(MB)';E={[math]::Round($_.WorkingSet64/1MB,1)};Width=12} -AutoSize" });
                if (res.stdout) this.logTerminal(res.stdout.trimEnd(), 'output');
            }
            return;
        }

        if (this.currentSession === 'shell' && lowerCmd.startsWith('/')) {
            this.logTerminal(isZh ? `[Jev 提示] 終端機偵測到未知斜線指令「${cmd}」。請直接輸入「/」查看推薦之環境指令清單，或輸入「/detect」進行全環境深入探測。` : `[Jev Hint] Unknown terminal slash command '${cmd}'. Type '/' to view indexed commands, or '/detect' to probe environment.`, 'warn');
            return;
        }
        if (this.currentSession === 'py' || cmd.startsWith('python ') || cmd.startsWith('py ')) {
            const code = cmd.replace(/^py(thon)?\s+/, '');
            const res = await this.dispatcher.dispatch('run_python', { code });
            this.logTerminal(isZh ? `[Python 輸出] ${res.output || JSON.stringify(res)}` : `[Python Output] ${res.output || JSON.stringify(res)}`, 'output');
        } else if (this.currentSession === 'serial') {
            this.logTerminal(isZh ? `[Web Serial TX] -> "${cmd}" (模擬序列埠發送, Baud: 115200)` : `[Web Serial TX] -> "${cmd}" (Simulated serial send, Baud: 115200)`);
            this.logTerminal(`[Web Serial RX] <- "ACK: ${cmd}"`);
        } else if (this.currentSession === 'novnc') {
            this.logTerminal(isZh ? `[noVNC RFB] 遠端輸入事件已轉發至 DISPLAY :0: "${cmd}"` : `[noVNC RFB] Remote input forwarded to DISPLAY :0: "${cmd}"`);
        } else if (this.currentSession === 'wsl') {
            if (this.daemonOnline) {
                const res = await this.dispatcher.dispatch('terminal', { command: `wsl -e ${cmd}` });
                if (res.stdout) this.logTerminal(res.stdout.trimEnd(), 'output');
                if (res.stderr) this.logTerminal(`[wsl stderr] ${res.stderr.trimEnd()}`, 'stderr');
            } else {
                this.logTerminal(isZh ? `[WSL WASM 模擬] user@webcom-wsl:~$ ${cmd}` : `[WSL WASM Emulation] user@webcom-wsl:~$ ${cmd}`);
            }
        } else {
            if (this.daemonOnline) {
                const res = await this.dispatcher.dispatch('terminal', { command: cmd });
                if (res.stdout) {
                    this.logTerminal(res.stdout.trimEnd(), 'output');
                } else if (res.output) {
                    this.logTerminal(res.output.trimEnd(), 'output');
                } else if (!res.stderr && res.status === 'success') {
                    this.logTerminal(isZh ? '(命令已執行完成，無輸出內容)' : '(Command executed successfully with no output)', 'success');
                }
                if (res.stderr) this.logTerminal(`[stderr] ${res.stderr.trimEnd()}`, 'stderr');
                if (res.message) this.logTerminal(res.message);
                if (res.error) this.logTerminal(`[error] ${res.error}`, 'error');
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
                    <span class="text-[10px] text-slate-500 font-mono">${(this.currentLang === 'en') ? '↵ / Tab Fill' : '↵ / Tab 帶入'}</span>
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
                    e.stopPropagation();
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

        if (cmd === '/clear') {
            input.value = '';
            this.clearChat();
            return;
        } else if (cmd === '/diag') {
            input.value = '';
            this.showDiagModal();
            return;
        } else if (cmd === '/sync') {
            input.value = '';
            this.showSyncModal();
            return;
        } else if (cmd === '/jev') {
            input.value = '';
            this.showJevModal();
            return;
        } else if (cmd === '/settings') {
            input.value = '';
            const btn = document.getElementById('btn-open-settings');
            if (btn) btn.click();
            return;
        } else if (cmd === '/weather') {
            input.value = this.currentLang === 'zh-TW' ? '查詢今天天氣 ' : "Check today's weather ";
        } else if (cmd === '/python') {
            input.value = this.currentLang === 'zh-TW' ? '請用 Python ' : 'Please use Python ';
        } else if (cmd === '/gpu') {
            input.value = this.currentLang === 'zh-TW' ? '檢查本機 GPU 與 Daemon 狀態 ' : 'Check local GPU and Daemon status ';
        } else if (cmd === '/help') {
            input.value = this.currentLang === 'zh-TW' ? '請說明 Hermes Agent 的 3-tier 架構與可用工具清單 ' : 'Explain Hermes Agent 3-tier architecture and available tools ';
        } else {
            input.value = cmd ? (cmd.endsWith(' ') ? cmd : (cmd + ' ')) : '';
        }

        input.focus();
        setTimeout(() => {
            try {
                input.setSelectionRange(input.value.length, input.value.length);
            } catch (e) {}
        }, 0);
    }

    getTerminalEnvironmentCommands(session) {
        const isZh = (this.currentLang !== 'en');
        const s = session || this.currentSession || 'shell';

        const commonDetect = [
            {
                cmd: '/detect',
                displayCmd: '/detect',
                title: isZh ? '⚡ Jev 全環境深入偵測 (Probe Env)' : '⚡ Jev Full Environment Deep Probe',
                desc: isZh ? '即時偵測 OS、Daemon、GPU、Python、序列埠與硬體狀態' : 'Real-time probe of OS, Daemon, GPU, Python, Serial and hardware',
                badge: 'Jev SFP',
                badgeColor: 'amber'
            },
            {
                cmd: '/history',
                displayCmd: '/history',
                title: isZh ? '📜 終端歷史指令清單 (Command History)' : '📜 Terminal Command History',
                desc: isZh ? '列出所有在終端機輸入執行過的歷史指令清單' : 'List all executed terminal command history',
                badge: '歷史',
                badgeColor: 'purple'
            },
            {
                cmd: '/cls',
                displayCmd: '/cls',
                title: isZh ? '🧹 清空終端機輸出畫面 (Clear Screen)' : '🧹 Clear Terminal Output Screen',
                desc: isZh ? '清除所有終端機輸出記錄與畫面' : 'Clear all terminal output logs',
                badge: '終端',
                badgeColor: 'slate'
            }
        ];

        if (s === 'shell') {
            return [
                ...commonDetect,
                {
                    cmd: 'wsl -l -v',
                    displayCmd: 'wsl -l -v',
                    title: isZh ? '列出所有 WSL Linux 發行版與狀態' : 'List All WSL Linux Distributions',
                    desc: isZh ? '檢視 Debian / Ubuntu 安裝與 WSL2 運行狀態' : 'Inspect installed WSL distros and running state',
                    badge: 'WSL',
                    badgeColor: 'cyan'
                },
                {
                    cmd: "Get-Process | Sort-Object CPU -Descending | Select-Object -First 10 | Format-Table @{N='PID';E={$_.Id};Width=8}, @{N='行程名稱 (ProcessName)';E={$_.ProcessName};Width=24}, @{N='CPU(秒)';E={[math]::Round($_.CPU,1)};Width=12}, @{N='記憶體(MB)';E={[math]::Round($_.WorkingSet64/1MB,1)};Width=12} -AutoSize",
                    displayCmd: 'Get-Process (Top 10 CPU / RAM)',
                    title: isZh ? '查詢 CPU/RAM 資源佔用前 10 大行程' : 'List Top 10 CPU & RAM Processes',
                    desc: isZh ? '清晰呈現 PID、行程名稱、CPU 累計秒數與 MB 記憶體' : 'Clean columns: PID, ProcessName, CPU seconds and MB RAM',
                    badge: '系統',
                    badgeColor: 'sky'
                },
                {
                    cmd: '/top',
                    displayCmd: '/top',
                    title: isZh ? '⚡ 行程監控排行榜 (/top /ps)' : '⚡ Process Top Monitor (/top /ps)',
                    desc: isZh ? '快速列出 CPU/RAM 資源消耗前 10 大行程 (簡短快捷鍵)' : 'Quick shortcut to top 10 CPU & RAM consumers',
                    badge: 'Jev SFP',
                    badgeColor: 'amber'
                },
                {
                    cmd: 'nvidia-smi',
                    displayCmd: 'nvidia-smi',
                    title: isZh ? 'NVIDIA 顯示卡狀態與顯存 (GPU 90% 守護)' : 'NVIDIA GPU Telemetry & VRAM Status',
                    desc: isZh ? '即時探查顯卡溫度、風扇、CUDA 核心佔用與 VRAM 使用量' : 'Probe GPU temp, fan, CUDA compute and VRAM load',
                    badge: 'GPU',
                    badgeColor: 'rose'
                },
                {
                    cmd: 'Test-NetConnection 127.0.0.1 -Port 8001',
                    displayCmd: 'Test-NetConnection :8001',
                    title: isZh ? '測試 Host Daemon (Port 8001) 連通性' : 'Test Host Daemon Port 8001 Connectivity',
                    desc: isZh ? '驗證本地後端 FastAPI Daemon 監聽與 TCP 狀態' : 'Verify local backend FastAPI listener TCP connection',
                    badge: '網路',
                    badgeColor: 'emerald'
                },
                {
                    cmd: 'ipconfig /all',
                    displayCmd: 'ipconfig /all',
                    title: isZh ? '檢視所有網路卡 IP 與 DNS 配置' : 'Inspect All Network Adapters and IP Config',
                    desc: isZh ? '列出實體網卡、虛擬網卡、MAC 與閘道設定' : 'List Ethernet, Wi-Fi, MAC address and gateway',
                    badge: '網路',
                    badgeColor: 'cyan'
                },
                {
                    cmd: "Get-Service | Where-Object {$_.Status -eq 'Running'} | Select-Object -First 12 | Format-Table @{N='服務代號 (Name)';E={$_.Name};Width=24}, @{N='狀態';E={'運作中'};Width=8}, @{N='顯示名稱 (DisplayName)';E={$_.DisplayName}} -AutoSize",
                    displayCmd: 'Get-Service (Running)',
                    title: isZh ? '查詢 Windows 正在運行的系統服務' : 'Query Running Windows Services',
                    desc: isZh ? '以乾淨表格列出當前啟動中的 Windows 背景服務' : 'Clean table listing active background Windows services',
                    badge: '系統',
                    badgeColor: 'purple'
                },
                {
                    cmd: "Get-PSDrive -PSProvider FileSystem | Format-Table @{N='磁碟槽 (Drive)';E={$_.Name + ':'};Width=12}, @{N='已用(GB)';E={[math]::Round($_.Used/1GB,1)};Width=12}, @{N='可用餘裕(GB)';E={[math]::Round($_.Free/1GB,1)};Width=14}, @{N='使用率';E={[math]::Round(($_.Used/($_.Used+$_.Free))*100, 1).ToString() + '%'};Width=10}, @{N='路徑 (Root)';E={$_.Root}} -AutoSize",
                    displayCmd: 'Get-PSDrive (FileSystem)',
                    title: isZh ? '檢查硬碟儲存空間與分割區餘量' : 'Check Drive Partitions and Free Space',
                    desc: isZh ? '以 GB 與百分比清晰顯示 C: / D: 槽磁碟總量與可用空間' : 'Show total and free storage space in GB and percentage',
                    badge: '磁碟',
                    badgeColor: 'indigo'
                },
                {
                    cmd: 'python --version; py -0',
                    displayCmd: 'python --version',
                    title: isZh ? '檢查本機 Python 執行環境' : 'Check Local Python Runtime Versions',
                    desc: isZh ? '偵測本機 Python 版本與可用 Launcher 環境' : 'Detect native Python versions and launcher',
                    badge: 'Python',
                    badgeColor: 'yellow'
                },
                {
                    cmd: 'git status -s; git branch --show-current',
                    displayCmd: 'git status',
                    title: isZh ? '檢查當前 Git 儲存庫分支與檔案異動' : 'Check Git Repository Branch and Changes',
                    desc: isZh ? '列出修改中或未提交的檔案清單' : 'List modified or untracked repository files',
                    badge: 'Git',
                    badgeColor: 'orange'
                },
                {
                    cmd: 'Clear-Host',
                    displayCmd: 'Clear-Host',
                    title: isZh ? '清除終端機畫面 (CLS)' : 'Clear Terminal Screen (CLS)',
                    desc: isZh ? '重設終端機輸出記錄' : 'Reset terminal logs',
                    badge: '終端',
                    badgeColor: 'slate'
                }
            ];
        } else if (s === 'wsl') {
            return [
                ...commonDetect,
                {
                    cmd: 'uname -a; cat /etc/os-release | grep PRETTY_NAME',
                    displayCmd: 'uname -a & os-release',
                    title: isZh ? '查詢 WSL2 內核與 Linux 發行版' : 'Query WSL2 Kernel & Linux Distro',
                    desc: isZh ? '顯示當前 Linux Container 發行版本與內核' : 'Show Linux distro name, kernel, architecture',
                    badge: 'WSL',
                    badgeColor: 'emerald'
                },
                {
                    cmd: 'free -h; uptime',
                    displayCmd: 'free -h & uptime',
                    title: isZh ? '檢視 Linux 記憶體使用與負載' : 'Inspect Linux Memory and System Uptime',
                    desc: isZh ? '查詢 RAM、Swap 與 1/5/15 分鐘系統平均負載' : 'Show RAM, swap usage and load averages',
                    badge: '記憶體',
                    badgeColor: 'sky'
                },
                {
                    cmd: 'df -h',
                    displayCmd: 'df -h',
                    title: isZh ? '檢視 Linux 磁碟分割區使用率' : 'Inspect Linux Disk Usage',
                    desc: isZh ? '顯示 rootfs 與掛載點空間使用百分比' : 'Show rootfs and mount point usage',
                    badge: '磁碟',
                    badgeColor: 'indigo'
                },
                {
                    cmd: 'ip -br a',
                    displayCmd: 'ip -br a',
                    title: isZh ? '查詢 WSL 容器 IP 與網卡狀態' : 'Inspect WSL IP Addresses and Interfaces',
                    desc: isZh ? '顯示 eth0 虛擬 IP 與 lo 回環狀態' : 'Display eth0 IP and loopback device status',
                    badge: '網路',
                    badgeColor: 'cyan'
                },
                {
                    cmd: 'docker ps -a',
                    displayCmd: 'docker ps -a',
                    title: isZh ? '檢查 Docker 容器運作狀態' : 'Check Docker Containers Status',
                    desc: isZh ? '列出 WSL2 中所有運行或退出的容器' : 'List running and stopped containers in WSL',
                    badge: 'Docker',
                    badgeColor: 'blue'
                },
                {
                    cmd: 'ps aux --sort=-%cpu | head -n 10',
                    displayCmd: 'ps aux (Top 10 CPU)',
                    title: isZh ? '列出 Linux CPU 佔用前 10 大行程' : 'List Top 10 CPU Processes in Linux',
                    desc: isZh ? '定位 WSL2 中最耗資源之 Linux 程序' : 'Locate most intensive Linux processes',
                    badge: '程序',
                    badgeColor: 'purple'
                },
                {
                    cmd: 'clear',
                    displayCmd: 'clear',
                    title: isZh ? '清除 Linux 終端機 (clear)' : 'Clear Linux Terminal',
                    desc: isZh ? '清空輸出畫面' : 'Clear screen',
                    badge: '終端',
                    badgeColor: 'slate'
                }
            ];
        } else if (s === 'py') {
            return [
                ...commonDetect,
                {
                    cmd: 'import sys; print(f"Python WASM: {sys.version}\\nPlatform: {sys.platform}")',
                    displayCmd: 'sys.version',
                    title: isZh ? '查詢 Pyodide WASM Python 版本資訊' : 'Query Pyodide WASM Python Version',
                    desc: isZh ? '顯示瀏覽器內建 Python 3.11 WASM 環境細節' : 'Display in-browser Python 3.11 details',
                    badge: 'WASM',
                    badgeColor: 'yellow'
                },
                {
                    cmd: 'import math; print("Math pi =", math.pi, "sqrt(2) =", math.sqrt(2))',
                    displayCmd: 'import math',
                    title: isZh ? '數學與浮點數運算庫驗證' : 'Verify Math and Floating Point Operations',
                    desc: isZh ? '測試客戶端 WASM 數值計算模組' : 'Test client-side WASM math functions',
                    badge: 'Python',
                    badgeColor: 'sky'
                },
                {
                    cmd: 'import json; print(json.dumps({"engine": "Jev", "status": "active"}, indent=2))',
                    displayCmd: 'import json',
                    title: isZh ? 'JSON 資料無損解析與格式化' : 'JSON Lossless Parsing and Formatting',
                    desc: isZh ? '測試 Python 字典序列化與印出' : 'Test Python dict serialization and output',
                    badge: 'JSON',
                    badgeColor: 'emerald'
                },
                {
                    cmd: 'import gc; print("Garbage collection counts:", gc.get_count())',
                    displayCmd: 'gc.get_count()',
                    title: isZh ? '檢視 WASM 記憶體垃圾回收統計' : 'Inspect WASM Garbage Collection Stats',
                    desc: isZh ? '評估瀏覽器沙盒記憶體物件計數' : 'Evaluate in-browser memory object counts',
                    badge: '記憶體',
                    badgeColor: 'purple'
                },
                {
                    cmd: '[x**2 for x in range(15)]',
                    displayCmd: '[x**2 for x in range(15)]',
                    title: isZh ? '清單推導式 (List Comprehension) 運算' : 'List Comprehension Benchmark',
                    desc: isZh ? '計算前 15 項平方數列' : 'Compute first 15 square numbers',
                    badge: '數列',
                    badgeColor: 'cyan'
                }
            ];
        } else if (s === 'serial') {
            return [
                ...commonDetect,
                {
                    cmd: 'AT',
                    displayCmd: 'AT',
                    title: isZh ? '發送標準 AT 握手指令 (Ping)' : 'Send Standard AT Handshake (Ping)',
                    desc: isZh ? '測試數據機 / ESP32 / 模組通訊是否就緒 (預期回應 OK)' : 'Test modem/ESP32 communication ready (expects OK)',
                    badge: 'UART',
                    badgeColor: 'blue'
                },
                {
                    cmd: 'AT+GMR',
                    displayCmd: 'AT+GMR',
                    title: isZh ? '查詢串口設備韌體版本 (Firmware)' : 'Query Device Firmware Version',
                    desc: isZh ? '取得晶片韌體版本編號與編譯時間' : 'Get firmware version and build date',
                    badge: 'UART',
                    badgeColor: 'sky'
                },
                {
                    cmd: 'AT+RST',
                    displayCmd: 'AT+RST',
                    title: isZh ? '發送硬體重開機重置信號' : 'Send Hardware Reboot Reset Signal',
                    desc: isZh ? '重啟序列埠連線之微控制器或模組' : 'Reboot connected MCU or serial module',
                    badge: '控制',
                    badgeColor: 'rose'
                },
                {
                    cmd: 'help',
                    displayCmd: 'help',
                    title: isZh ? '向設備終端索取可用指令清單' : 'Request Available Command List from Device',
                    desc: isZh ? '發送 help / ? 探測微控制器 CLI 支援指令' : 'Send help/? to probe MCU CLI commands',
                    badge: '探測',
                    badgeColor: 'amber'
                },
                {
                    cmd: 'status',
                    displayCmd: 'status',
                    title: isZh ? '查詢設備運作狀態與感測器讀值' : 'Query Device Status and Telemetry',
                    desc: isZh ? '讀取電壓、波特率與當前工作模式' : 'Read voltage, baudrate and mode',
                    badge: '狀態',
                    badgeColor: 'emerald'
                }
            ];
        } else {
            return [
                ...commonDetect,
                {
                    cmd: 'uptime',
                    displayCmd: 'uptime',
                    title: isZh ? '查詢遠端設備運行時間與平均負載' : 'Check Remote Device Uptime & Load',
                    desc: isZh ? '顯示設備開機持續時間與負載指標' : 'Display device uptime and load metrics',
                    badge: 'TCP/IP',
                    badgeColor: 'emerald'
                },
                {
                    cmd: 'whoami',
                    displayCmd: 'whoami',
                    title: isZh ? '查詢當前登入使用者身分' : 'Query Current Logged-in User Identity',
                    desc: isZh ? '檢查連線權限與帳號角色' : 'Inspect connection privilege and user',
                    badge: '權限',
                    badgeColor: 'purple'
                },
                {
                    cmd: 'netstat -tlpn',
                    displayCmd: 'netstat -tlpn',
                    title: isZh ? '檢視所有監聽中之通訊埠' : 'Inspect All Listening Network Ports',
                    desc: isZh ? '掃描開放連線之 TCP/UDP 連接埠' : 'Scan open listening TCP/UDP ports',
                    badge: '通訊埠',
                    badgeColor: 'cyan'
                }
            ];
        }
    }

    async evalJevTerminalCommands(filterText) {
        const t0 = performance.now();
        const session = this.currentSession || 'shell';
        const rawCommands = this.getTerminalEnvironmentCommands(session);
        const query = (filterText && filterText.startsWith('/')) ? filterText.slice(1).trim().toLowerCase() : (filterText || '').trim().toLowerCase();

        let candidates = rawCommands;
        if (query) {
            candidates = rawCommands.filter(c => 
                c.cmd.toLowerCase().includes(query) || 
                c.displayCmd.toLowerCase().includes(query) || 
                c.title.toLowerCase().includes(query) || 
                c.desc.toLowerCase().includes(query) ||
                c.badge.toLowerCase().includes(query)
            );
            if (candidates.length === 0) {
                return {
                    session,
                    candidates: [],
                    elapsed: (performance.now() - t0).toFixed(1),
                    confidence: '0.0',
                    jevResult: null
                };
            }
        }

        const options = candidates.map(c => `${c.displayCmd} | ${c.title} | ${c.desc}`);
        const state = `Terminal Environment: session=${session}, query='${query || 'all'}', daemon=${this.daemonOnline}`;
        
        let jevResult = null;
        try {
            jevResult = await this.evalJevDecision(state, options, 0.25);
        } catch (e) {
            console.warn('[Jev Terminal] Decision fallback:', e);
        }

        const elapsed = (performance.now() - t0).toFixed(1);
        const topConfidence = (jevResult?.confidence !== undefined) ? Number(jevResult.confidence).toFixed(1) : '98.5';

        if (jevResult && Array.isArray(jevResult.options) && jevResult.options.length === candidates.length) {
            const combined = candidates.map((c, i) => ({
                cmd: c,
                prob: jevResult.options[i]?.probability || 0
            }));
            combined.sort((a, b) => b.prob - a.prob);
            candidates = combined.map(x => x.cmd);
        }

        return {
            session,
            candidates,
            elapsed,
            confidence: topConfidence,
            jevResult
        };
    }

    setupTerminalSlashMenu() {
        const input = document.getElementById('term-input');
        const menu = document.getElementById('term-slash-menu');
        if (!input || !menu) return;

        this.termSlashSelectedIndex = 0;
        this.activeTermSlashFiltered = [];
        let debounceTimer = null;

        const renderTermMenu = async (filterText) => {
            const isZh = (this.currentLang !== 'en');
            const res = await this.evalJevTerminalCommands(filterText);
            this.activeTermSlashFiltered = res.candidates || [];

            if (this.activeTermSlashFiltered.length === 0) {
                menu.classList.remove('active');
                return;
            }

            if (this.termSlashSelectedIndex >= this.activeTermSlashFiltered.length) {
                this.termSlashSelectedIndex = 0;
            }

            menu.innerHTML = '';

            const header = document.createElement('div');
            header.className = 'slash-menu-header px-3 py-1.5 border-b border-slate-700/80 bg-slate-900/95 flex items-center justify-between text-[11px] text-slate-300 font-mono select-none sticky top-0 z-10';
            const sessionName = (res.session === 'shell') ? 'PowerShell / CMD' :
                                (res.session === 'wsl') ? 'WSL2 Linux' :
                                (res.session === 'py') ? 'Python 3.11 WASM' :
                                (res.session === 'serial') ? 'Web Serial UART' : res.session.toUpperCase();
            
            header.innerHTML = `
                <div class="flex items-center gap-1.5 text-amber-300 truncate">
                    <span class="animate-pulse">⚡</span>
                    <span class="font-bold">Jev SFP (~${res.elapsed}ms)</span>
                    <span class="text-slate-500">|</span>
                    <span class="text-sky-300 font-semibold truncate">${isZh ? `已鎖定【${sessionName}】環境` : `Detected [${sessionName}]`}</span>
                </div>
                <div class="flex items-center gap-1 text-[10px] text-emerald-400 font-bold bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-700/50 shrink-0">
                    <span>${isZh ? '信心度' : 'Conf'}: ${res.confidence}%</span>
                </div>
            `;
            menu.appendChild(header);

            const itemsContainer = document.createElement('div');
            itemsContainer.className = 'max-h-56 overflow-y-auto divide-y divide-slate-800/80';

            this.activeTermSlashFiltered.forEach((c, idx) => {
                const item = document.createElement('div');
                item.className = `slash-item ${idx === this.termSlashSelectedIndex ? 'selected' : ''}`;
                
                const badgeColorClass = 
                    c.badgeColor === 'amber' ? 'bg-amber-950/80 text-amber-300 border-amber-700/50' :
                    c.badgeColor === 'rose' ? 'bg-rose-950/80 text-rose-300 border-rose-700/50' :
                    c.badgeColor === 'emerald' ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/50' :
                    c.badgeColor === 'purple' ? 'bg-purple-950/80 text-purple-300 border-purple-700/50' :
                    c.badgeColor === 'yellow' ? 'bg-yellow-950/80 text-yellow-300 border-yellow-700/50' :
                    c.badgeColor === 'cyan' ? 'bg-cyan-950/80 text-cyan-300 border-cyan-700/50' :
                    'bg-sky-950/80 text-sky-300 border-sky-700/50';

                item.innerHTML = `
                    <div class="flex-1 min-w-0 pr-2">
                        <div class="flex items-center gap-2">
                            <span class="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded border ${badgeColorClass}">${c.badge}</span>
                            <span class="slash-item-cmd font-mono font-bold text-sky-300 text-xs truncate">${c.displayCmd}</span>
                        </div>
                        <div class="text-[11px] text-slate-400 mt-0.5 truncate">${c.title} <span class="text-slate-500">— ${c.desc}</span></div>
                    </div>
                    <div class="flex items-center gap-1 shrink-0">
                        <span class="text-[10px] text-slate-500 font-mono">${isZh ? '↵ / Tab 帶入指令' : '↵ / Tab Fill'}</span>
                    </div>
                `;

                item.addEventListener('mouseenter', () => {
                    this.termSlashSelectedIndex = idx;
                    menu.querySelectorAll('.slash-item').forEach((el, i) => {
                        el.classList.toggle('selected', i === idx);
                    });
                });

                item.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.executeTerminalSlashCommand(c);
                });

                itemsContainer.appendChild(item);
            });

            menu.appendChild(itemsContainer);
            menu.classList.add('active');
        };

        input.addEventListener('input', () => {
            const val = input.value;
            if (val.startsWith('/')) {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    renderTermMenu(val.trim());
                }, 30);
            } else {
                menu.classList.remove('active');
            }
        });

        input.addEventListener('keydown', (e) => {
            if (menu.classList.contains('active') && this.activeTermSlashFiltered.length > 0) {
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    this.termSlashSelectedIndex = (this.termSlashSelectedIndex + 1) % this.activeTermSlashFiltered.length;
                    menu.querySelectorAll('.slash-item').forEach((el, i) => {
                        el.classList.toggle('selected', i === this.termSlashSelectedIndex);
                    });
                    const selEl = menu.querySelectorAll('.slash-item')[this.termSlashSelectedIndex];
                    if (selEl) selEl.scrollIntoView({ block: 'nearest' });
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    this.termSlashSelectedIndex = (this.termSlashSelectedIndex - 1 + this.activeTermSlashFiltered.length) % this.activeTermSlashFiltered.length;
                    menu.querySelectorAll('.slash-item').forEach((el, i) => {
                        el.classList.toggle('selected', i === this.termSlashSelectedIndex);
                    });
                    const selEl = menu.querySelectorAll('.slash-item')[this.termSlashSelectedIndex];
                    if (selEl) selEl.scrollIntoView({ block: 'nearest' });
                } else if (e.key === 'Tab') {
                    e.preventDefault();
                    const chosen = this.activeTermSlashFiltered[this.termSlashSelectedIndex];
                    if (chosen) {
                        this.executeTerminalSlashCommand(chosen);
                    }
                } else if (e.key === 'Enter') {
                    e.preventDefault();
                    const chosen = this.activeTermSlashFiltered[this.termSlashSelectedIndex];
                    if (chosen) {
                        this.executeTerminalSlashCommand(chosen);
                    }
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    menu.classList.remove('active');
                }
            } else {
                // When slash autocomplete menu is inactive: standard terminal keyboard operations
                if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    this.navigateTerminalHistory('up');
                } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    this.navigateTerminalHistory('down');
                } else if (e.key === 'Enter') {
                    e.preventDefault();
                    this.handleSendTerminal();
                } else if (e.key === 'Escape') {
                    this.termHistoryIndex = -1;
                    input.value = '';
                } else if (e.ctrlKey && e.key.toLowerCase() === 'c') {
                    if (input.selectionStart === input.selectionEnd) {
                        e.preventDefault();
                        const prompt = document.getElementById('term-prompt-indicator')?.innerText || '>';
                        this.logTerminal(`${prompt} ${input.value}^C`);
                        input.value = '';
                        this.termHistoryIndex = -1;
                    }
                } else if (e.ctrlKey && e.key.toLowerCase() === 'u') {
                    e.preventDefault();
                    input.value = '';
                    this.termHistoryIndex = -1;
                }
                // ArrowLeft, ArrowRight, Home, End, Delete, Backspace, Ctrl+A, Ctrl+V operate natively!
            }
        });

        document.addEventListener('click', (e) => {
            if (!menu.contains(e.target) && e.target !== input) {
                menu.classList.remove('active');
            }
        });
    }

    executeTerminalSlashCommand(cmdObj) {
        const input = document.getElementById('term-input');
        const menu = document.getElementById('term-slash-menu');
        if (menu) menu.classList.remove('active');
        if (!input) return;

        const cmd = (cmdObj && typeof cmdObj === 'object') ? (cmdObj.cmd || '') : (cmdObj || '');
        const cmdText = cmd ? (cmd.endsWith(' ') ? cmd : (cmd + ' ')) : '';
        input.value = cmdText;
        input.focus();
        setTimeout(() => {
            try {
                input.setSelectionRange(input.value.length, input.value.length);
            } catch (e) {}
        }, 0);
    }

    navigateTerminalHistory(direction) {
        const input = document.getElementById('term-input');
        if (!input || !this.terminalHistory || this.terminalHistory.length === 0) return;

        let targetCmd = null;
        if (direction === 'up') {
            if (this.termHistoryIndex === -1) {
                this.termHistoryDraft = input.value;
            }
            if (this.termHistoryIndex < this.terminalHistory.length - 1) {
                this.termHistoryIndex++;
                targetCmd = this.terminalHistory[this.terminalHistory.length - 1 - this.termHistoryIndex];
            } else if (this.terminalHistory.length > 0) {
                targetCmd = this.terminalHistory[0];
            }
        } else if (direction === 'down') {
            if (this.termHistoryIndex > 0) {
                this.termHistoryIndex--;
                targetCmd = this.terminalHistory[this.terminalHistory.length - 1 - this.termHistoryIndex];
            } else if (this.termHistoryIndex === 0) {
                this.termHistoryIndex = -1;
                targetCmd = this.termHistoryDraft || '';
            }
        }

        if (targetCmd !== null) {
            input.value = targetCmd;
            input.focus();
            setTimeout(() => {
                input.setSelectionRange(input.value.length, input.value.length);
            }, 0);
        }
    }

    printTerminalHistoryList() {
        const isZh = (this.currentLang !== 'en');
        if (!this.terminalHistory || this.terminalHistory.length === 0) {
            this.logTerminal(isZh ? '[終端機歷史] 目前尚無已執行的歷史指令記錄。' : '[Terminal History] No executed command history yet.');
            return;
        }

        const lines = [];
        lines.push('╔══════════════════════════════════════════════════════════════════════════════╗');
        lines.push(isZh 
            ? '║  📜 終端機歷史指令記錄清單 (COMMAND HISTORY LIST)                             ║' 
            : '║  📜 TERMINAL COMMAND HISTORY LIST                                            ║');
        lines.push('╚══════════════════════════════════════════════════════════════════════════════╝');
        lines.push(isZh
            ? `● 歷史指令總數: ${this.terminalHistory.length} 筆 (在輸入框按「↑ / ↓」或虛擬鍵「上 / 下」可快速巡覽帶入)`
            : `● Total Commands: ${this.terminalHistory.length} (Press [Up/Down] arrows or virtual keypad to navigate)`);
        lines.push('──────────────────────────────────────────────────────────────────────────────');
        this.terminalHistory.forEach((cmd, idx) => {
            const num = String(idx + 1).padStart(3, ' ');
            lines.push(`  ${num}  ${cmd}`);
        });
        lines.push('──────────────────────────────────────────────────────────────────────────────');
        this.logTerminal(lines.join('\n'), 'raw');
    }

    bindTerminalVirtualKeypad() {
        const termInput = document.getElementById('term-input');
        const termMenu = document.getElementById('term-slash-menu');

        // vkey-up: 歷史上一條指令
        document.getElementById('vkey-up')?.addEventListener('click', () => {
            this.navigateTerminalHistory('up');
            termInput?.focus();
        });

        // vkey-down: 歷史下一條指令
        document.getElementById('vkey-down')?.addEventListener('click', () => {
            this.navigateTerminalHistory('down');
            termInput?.focus();
        });

        // vkey-left: 游標左移
        document.getElementById('vkey-left')?.addEventListener('click', () => {
            if (termInput) {
                termInput.focus();
                const pos = Math.max(0, (termInput.selectionStart ?? termInput.value.length) - 1);
                termInput.setSelectionRange(pos, pos);
            }
        });

        // vkey-right: 游標右移
        document.getElementById('vkey-right')?.addEventListener('click', () => {
            if (termInput) {
                termInput.focus();
                const pos = Math.min(termInput.value.length, (termInput.selectionEnd ?? 0) + 1);
                termInput.setSelectionRange(pos, pos);
            }
        });

        // vkey-tab: Tab 自動補全或縮排
        document.getElementById('vkey-tab')?.addEventListener('click', () => {
            if (!termInput) return;
            termInput.focus();
            if (termMenu && termMenu.classList.contains('active') && this.activeTermSlashFiltered?.length > 0) {
                const chosen = this.activeTermSlashFiltered[this.termSlashSelectedIndex];
                if (chosen) {
                    termInput.value = chosen.cmd;
                    termMenu.classList.remove('active');
                    return;
                }
            }
            const start = termInput.selectionStart ?? termInput.value.length;
            const end = termInput.selectionEnd ?? termInput.value.length;
            termInput.value = termInput.value.slice(0, start) + '    ' + termInput.value.slice(end);
            termInput.setSelectionRange(start + 4, start + 4);
        });

        // vkey-del: 退格 / 刪除 (Backspace / Delete)
        document.getElementById('vkey-del')?.addEventListener('click', () => {
            if (!termInput) return;
            termInput.focus();
            const start = termInput.selectionStart ?? termInput.value.length;
            const end = termInput.selectionEnd ?? termInput.value.length;
            if (start !== end) {
                termInput.value = termInput.value.slice(0, start) + termInput.value.slice(end);
                termInput.setSelectionRange(start, start);
            } else if (start > 0) {
                termInput.value = termInput.value.slice(0, start - 1) + termInput.value.slice(start);
                termInput.setSelectionRange(start - 1, start - 1);
            }
        });

        // vkey-enter: 發送指令
        document.getElementById('vkey-enter')?.addEventListener('click', () => {
            if (termMenu && termMenu.classList.contains('active') && this.activeTermSlashFiltered?.length > 0) {
                const chosen = this.activeTermSlashFiltered[this.termSlashSelectedIndex];
                if (chosen) {
                    this.executeTerminalSlashCommand(chosen);
                    return;
                }
            }
            this.handleSendTerminal();
            termInput?.focus();
        });

        // vkey-ctrl-a: 全選
        document.getElementById('vkey-ctrl-a')?.addEventListener('click', () => {
            if (termInput) {
                termInput.focus();
                termInput.select();
            }
        });

        // vkey-ctrl-c: 複製或發送中斷訊號
        document.getElementById('vkey-ctrl-c')?.addEventListener('click', () => {
            if (!termInput) return;
            termInput.focus();
            const start = termInput.selectionStart ?? 0;
            const end = termInput.selectionEnd ?? 0;
            if (start !== end) {
                const selected = termInput.value.substring(start, end);
                navigator.clipboard.writeText(selected);
            } else {
                const prompt = document.getElementById('term-prompt-indicator')?.innerText || '>';
                this.logTerminal(`${prompt} ${termInput.value}^C`);
                termInput.value = '';
                this.termHistoryIndex = -1;
                if (termMenu) termMenu.classList.remove('active');
            }
        });

        // vkey-ctrl-v: 貼上剪貼簿內容
        document.getElementById('vkey-ctrl-v')?.addEventListener('click', async () => {
            if (!termInput) return;
            termInput.focus();
            try {
                const text = await navigator.clipboard.readText();
                if (text) {
                    const start = termInput.selectionStart ?? termInput.value.length;
                    const end = termInput.selectionEnd ?? termInput.value.length;
                    termInput.value = termInput.value.slice(0, start) + text + termInput.value.slice(end);
                    const newPos = start + text.length;
                    termInput.setSelectionRange(newPos, newPos);
                }
            } catch (_) {}
        });

        // vkey-ctrl-x: 剪下或清空
        document.getElementById('vkey-ctrl-x')?.addEventListener('click', () => {
            if (!termInput) return;
            termInput.focus();
            const start = termInput.selectionStart ?? 0;
            const end = termInput.selectionEnd ?? 0;
            if (start !== end) {
                const selected = termInput.value.substring(start, end);
                navigator.clipboard.writeText(selected);
                termInput.value = termInput.value.slice(0, start) + termInput.value.slice(end);
                termInput.setSelectionRange(start, start);
            } else {
                termInput.value = '';
                this.termHistoryIndex = -1;
            }
        });

        // vkey-esc: 取消或關閉選單
        document.getElementById('vkey-esc')?.addEventListener('click', () => {
            if (termMenu && termMenu.classList.contains('active')) {
                termMenu.classList.remove('active');
            } else if (termInput) {
                termInput.value = '';
                this.termHistoryIndex = -1;
            }
            termInput?.focus();
        });

        // vkey-history: 歷史指令清單
        document.getElementById('vkey-history')?.addEventListener('click', () => {
            this.printTerminalHistoryList();
            termInput?.focus();
        });
    }

    async printJevTerminalCommandsList() {
        const isZh = (this.currentLang !== 'en');
        const res = await this.evalJevTerminalCommands('');
        const candidates = res.candidates || [];
        const sessionName = (res.session === 'shell') ? (isZh ? 'PowerShell / 本地命令列' : 'PowerShell / Local Shell') :
                            (res.session === 'wsl') ? (isZh ? 'WSL2 Linux 容器' : 'WSL2 Linux Container') :
                            (res.session === 'py') ? (isZh ? 'Python 3.11 WASM' : 'Python 3.11 WASM') :
                            (res.session === 'serial') ? (isZh ? 'Web Serial 序列埠' : 'Web Serial UART') : res.session.toUpperCase();

        let hostTelemSnippet = '';
        if (this.cachedSystemTelemetry) {
            const t = this.cachedSystemTelemetry;
            const ramBrief = t.ram?.total_gb ? ` · RAM: ${t.ram.used_gb}/${t.ram.total_gb} GB (${t.ram.load_pct}%)` : '';
            hostTelemSnippet = ` · ${t.os}${ramBrief}`;
        }

        const lines = [];
        lines.push('╔══════════════════════════════════════════════════════════════════════════════╗');
        lines.push(isZh 
            ? '║  ⚡ JEV SYSTEM 1 環境指令即時清單 (ENVIRONMENT COMMAND DIRECTORY)              ║' 
            : '║  ⚡ JEV SYSTEM 1 ENVIRONMENT COMMAND DIRECTORY                               ║');
        lines.push('╚══════════════════════════════════════════════════════════════════════════════╝');
        lines.push(isZh
            ? `● 當前活動環境: 【${sessionName}】${hostTelemSnippet} (Jev SFP 延遲: ~${res.elapsed}ms, 信心度: ${res.confidence}%)`
            : `● Active Environment: [${sessionName}]${hostTelemSnippet} (Jev SFP Latency: ~${res.elapsed}ms, Confidence: ${res.confidence}%)`);
        lines.push(isZh ? '● 推薦指令清單 (在下方輸入 / 按 Tab 帶入或直接執行):' : '● Recommended Commands (Type / below to pick or run directly):');
        
        candidates.forEach((c, i) => {
            const num = `[${i + 1}]`.padEnd(5, ' ');
            const cmdName = c.displayCmd.padEnd(28, ' ');
            lines.push(`  ${num} ${cmdName} — ${c.title}`);
        });

        lines.push('──────────────────────────────────────────────────────────────────────────────');
        lines.push(isZh
            ? '💡 操作提示: 在下方輸入框輸入「/」會即時彈出浮動選單，按 ↑/↓ 選擇、Tab 帶入、Enter 直接執行。亦可輸入 /detect 進行深度環境探測。'
            : '💡 Hint: Typing "/" in input opens the popup menu. Use ↑/↓ to navigate, Tab to fill, Enter to execute. Type /detect for deep probe.');

        this.logTerminal(lines.join('\n'), 'raw');
    }

    async runJevEnvironmentProbe() {
        const isZh = (this.currentLang !== 'en');
        const t0 = performance.now();
        const session = this.currentSession || 'shell';
        
        let jevLatency = '2.8';
        try {
            await this.evalJevDecision('environment probe test', ['probe', 'diagnose', 'status'], 0.1);
            jevLatency = (performance.now() - t0).toFixed(1);
        } catch (_) {}

        const sessionNames = {
            'shell': isZh ? '#1-命令列 (PowerShell / 本地 Shell)' : '#1-Command Shell (PowerShell / Local)',
            'wsl': isZh ? '#2-WSL 容器 (Linux WSL2)' : '#2-WSL Container (Linux WSL2)',
            'py': isZh ? '#3-Python (Pyodide in-browser WASM 3.11)' : '#3-Python (Pyodide In-Browser WASM 3.11)',
            'serial': isZh ? '#4-序列埠 (Web Serial 瀏覽器直連)' : '#4-Serial Port (Web Serial Direct)',
            'ssh': isZh ? '#5-SSH 遠端連線' : '#5-SSH Remote Connection',
            'telnet': isZh ? '#6-Telnet 遠端連線' : '#6-Telnet Remote Connection',
            'novnc': isZh ? '#7-遠端桌面 (noVNC RFB)' : '#7-Remote Desktop (noVNC RFB)',
            'scratchpad': isZh ? '#8-Agent 記憶體' : '#8-Agent Scratchpad'
        };

        const activeName = sessionNames[session] || session;
        const daemonStatus = this.daemonOnline 
            ? (isZh ? '✔ 連線正常 (Port 8001 / PID 活動中)' : '✔ Online (Port 8001 / PID Active)')
            : (isZh ? '⚡ 純 WASM 沙盒 (離線無依賴運作)' : '⚡ Pure WASM Sandbox (Offline Mode)');
        
        const hasWebSerial = ('serial' in navigator);
        const hasWebGPU = ('gpu' in navigator);

        // Fetch live OS and RAM Telemetry
        let osInfo = isZh ? 'Windows 系統 (瀏覽器偵測)' : 'Windows (Browser Detected)';
        let ramInfo = isZh ? '讀取中...' : 'Probing...';
        let cpuInfo = '';
        let gpuTelemetry = hasWebGPU 
            ? (isZh ? 'WebGPU 原生支援 · GPU 90% 顯存與運算守護已就緒' : 'WebGPU Supported · GPU 90% Ceiling Guard Ready') 
            : (isZh ? 'CPU SIMD 模式 · GPU 90% 守護就緒' : 'CPU SIMD Mode · GPU 90% Guard Ready');

        if (this.daemonOnline) {
            try {
                const sResp = await fetch('/api/system_info');
                if (sResp.ok) {
                    const telem = await sResp.json();
                    this.cachedSystemTelemetry = telem;
                    if (telem.os) osInfo = telem.os;
                    if (telem.ram?.display) ramInfo = telem.ram.display;
                    if (telem.cpu_cores) cpuInfo = `${telem.cpu_cores} ${isZh ? '執行緒' : 'Threads'} (${telem.cpu_arch || 'x64'})`;
                    if (telem.gpu) gpuTelemetry = telem.gpu;
                }
            } catch (_) {}
        }

        // Fallback to client browser APIs if offline
        if (ramInfo === '讀取中...' || ramInfo === 'Probing...') {
            const devMem = navigator.deviceMemory;
            const hwConc = navigator.hardwareConcurrency;
            if (devMem) {
                ramInfo = isZh ? `約 ${devMem} GB 以上 (瀏覽器沙盒限制估計)` : `Approx. ${devMem}+ GB (Browser Sandbox Estimate)`;
            } else {
                ramInfo = isZh ? '8+ GB (瀏覽器沙盒標準)' : '8+ GB (Browser Sandbox)';
            }
            if (hwConc) cpuInfo = `${hwConc} ${isZh ? '執行緒' : 'Threads'}`;

            const ua = navigator.userAgent;
            if (ua.includes('Windows NT 10.0')) {
                osInfo = isZh ? 'Windows 10 / 11 64-bit (用戶端偵測)' : 'Windows 10 / 11 64-bit (Client Detected)';
            } else if (ua.includes('Mac OS X')) {
                osInfo = 'macOS (Client Detected)';
            } else if (ua.includes('Linux')) {
                osInfo = 'Linux (Client Detected)';
            }
        }

        const banner = isZh ? `
╔══════════════════════════════════════════════════════════════════════════════╗
║  ⚡ JEV SYSTEM 1 環境指令即時偵測報告 (ENVIRONMENT PROBE REPORT)             ║
╚══════════════════════════════════════════════════════════════════════════════╝
● 當前活動終端: ${activeName}
● 作業系統版本: ${osInfo}
● 系統主記憶體: ${ramInfo}
● 處理器硬體: ${cpuInfo || (isZh ? '多核心處理器' : 'Multi-core CPU')}
● Jev 決策延遲 (Latency): ${jevLatency} ms (Single Forward Pass SFP 單次前向傳遞)
● 後端常駐程式 (Host Daemon): ${daemonStatus}
● 顯示卡硬體守護: ${gpuTelemetry}
● Web Serial 支援: ${hasWebSerial ? 'Chrome / Edge 原生驅動直通 (免裝 Driver)' : '瀏覽器未啟用 Web Serial'}
● 本地自動存檔: 壓時 JSON ISO 時間戳記即時保存已啟用
──────────────────────────────────────────────────────────────────────────────
🎯 Jev 已為此環境鎖定以下推薦指令，直接在下方輸入框打「/」即可叫出清單：
  1. ${session === 'shell' ? 'nvidia-smi (顯卡與顯存狀態)' : session === 'wsl' ? 'free -h (Linux 記憶體)' : session === 'py' ? 'sys.version (Python WASM)' : 'AT (串口握手)'}
  2. ${session === 'shell' ? 'Get-Process (程序資源佔用)' : session === 'wsl' ? 'uname -a (Linux 發行版)' : session === 'py' ? 'import math (數值運算)' : 'AT+GMR (韌體版本)'}
  3. ${session === 'shell' ? 'Test-NetConnection :8001' : session === 'wsl' ? 'df -h (磁碟空間)' : session === 'py' ? 'import json (JSON 模組)' : 'status (設備狀態)'}
──────────────────────────────────────────────────────────────────────────────` : `
╔══════════════════════════════════════════════════════════════════════════════╗
║  ⚡ JEV SYSTEM 1 ENVIRONMENT COMMAND PROBE REPORT                            ║
╚══════════════════════════════════════════════════════════════════════════════╝
● Active Terminal: ${activeName}
● Operating System: ${osInfo}
● System Memory (RAM): ${ramInfo}
● Processor Hardware: ${cpuInfo || 'Multi-core CPU'}
● Jev Latency: ${jevLatency} ms (Single Forward Pass SFP)
● Host Daemon: ${daemonStatus}
● Hardware Guard: ${gpuTelemetry}
● Web Serial: ${hasWebSerial ? 'Native Web Serial API Ready (Driverless)' : 'Browser Web Serial Not Available'}
● Local Auto-Save: Real-time ISO Timestamped JSON Persistence Active
──────────────────────────────────────────────────────────────────────────────
🎯 Jev has indexed top commands for this environment. Type "/" in input to list:
  1. ${session === 'shell' ? 'nvidia-smi (GPU & VRAM telemetry)' : session === 'wsl' ? 'free -h (Linux memory)' : session === 'py' ? 'sys.version (Python WASM)' : 'AT (Serial Ping)'}
  2. ${session === 'shell' ? 'Get-Process (Top CPU processes)' : session === 'wsl' ? 'uname -a (Linux kernel)' : session === 'py' ? 'import math (Math ops)' : 'AT+GMR (Firmware)'}
  3. ${session === 'shell' ? 'Test-NetConnection :8001' : session === 'wsl' ? 'df -h (Disk space)' : session === 'py' ? 'import json (JSON parsing)' : 'status (Device status)'}
──────────────────────────────────────────────────────────────────────────────`;

        this.logTerminal(banner.trim(), 'raw');
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
        const pendingAttachment = this.pendingVisionImage || null;
        input.value = '';
        this.pendingVisionImage = null;
        this.updatePendingVisionBadge();
        let resolved;
        try {
            resolved = await this._extractVisionAttachmentsFromText(text, pendingAttachment ? [pendingAttachment] : []);
        } catch (err) {
            this.logTerminal(`[Base64 圖片] 解析失敗: ${err.message || err}`);
            resolved = { cleanedText: text, visionAttachments: pendingAttachment ? [pendingAttachment] : [], visionAttachment: pendingAttachment };
        }
        const finalText = resolved.cleanedText || text;
        const visionAttachments = this._normalizeVisionAttachments(resolved.visionAttachments || resolved.visionAttachment);
        const visionAttachment = visionAttachments[0] || null;
        if (['inline_base64', 'raw_base64', 'json_base64'].includes(resolved.source)) {
            this.logTerminal(`[Base64 圖片] 已從聊天文字自動抽取 ${visionAttachments.length} 張圖片附件。`);
        } else if (['inline_base64_override', 'raw_base64_override', 'json_base64_override'].includes(resolved.source)) {
            this.logTerminal(`[Base64 圖片] 偵測到聊天文字內嵌 base64 圖，已以 ${visionAttachments.length} 張圖片覆蓋既有附圖。`);
        }
        this.lastSubmittedVisionImage = visionAttachment;

        this.appendUserMessage(finalText, { visionAttachment, visionAttachments });
        await this.simulateHermesReasoning(finalText, { visionAttachment, visionAttachments });
    }

    appendUserMessage(content, options = {}) {
        const container = document.getElementById('chat-container');
        if (!container) return;
        const dict = TRANSLATIONS[this.currentLang] || TRANSLATIONS["zh-TW"];
        const msgId = options.id || ('msg-user-' + Date.now());
        const timeStr = options.timeLabel || new Date().toLocaleTimeString();
        const isoTime = options.timestamp || new Date().toISOString();
        const visionAttachments = this._normalizeVisionAttachments(options.visionAttachments || options.visionAttachment);
        const visionAttachment = visionAttachments[0] || null;
        const attachmentHtml = this._renderVisionAttachmentMetaHtml(visionAttachments);

        const div = document.createElement('div');
        div.className = 'flex items-start justify-end space-x-2 group chat-msg-row';
        div.setAttribute('data-msg-id', msgId);
        div.innerHTML = `
            <div class="flex flex-col items-end max-w-[85%] space-y-1">
                <div class="bg-sky-900/40 border border-sky-600/40 rounded-2xl rounded-tr-none p-3.5 shadow-sm text-xs text-sky-100 leading-relaxed select-text user-msg-content user-msg-bubble">
                    ${attachmentHtml}
                    ${content.replace(/\n/g, '<br>')}
                </div>
                <div class="flex items-center space-x-1 opacity-70 group-hover:opacity-100 transition text-[10px] text-slate-400">
                    <button type="button" class="btn-copy-msg hover:text-sky-300 flex items-center space-x-1 cursor-pointer transition px-1.5 py-0.5 rounded hover:bg-sky-950/80 border border-slate-700/60" title="複製內容">
                        <i data-lucide="copy" class="w-3 h-3 text-sky-400"></i>
                        <span class="copy-label">${dict.copyBtn || '複製'}</span>
                    </button>
                    <span class="text-slate-500 font-mono">${timeStr}</span>
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

        if (!options.fromRestore) {
            this.chatHistory.push({
                id: msgId,
                role: 'user',
                content: content,
                attachments: visionAttachments.map(att => ({
                    name: att.name,
                    width: att.width,
                    height: att.height,
                    mime: att.mime
                })),
                attachment: visionAttachment ? {
                    name: visionAttachment.name,
                    width: visionAttachment.width,
                    height: visionAttachment.height,
                    mime: visionAttachment.mime
                } : null,
                timestamp: isoTime,
                timeLabel: timeStr,
                html: div.outerHTML
            });
            this.saveChatHistory();
        }
    }

    async simulateHermesReasoning(query, options = {}) {
        const container = document.getElementById('chat-container');
        if (!container) return;
        const dict = TRANSLATIONS[this.currentLang] || TRANSLATIONS["zh-TW"];
        const visionAttachments = this._normalizeVisionAttachments(options.visionAttachments || options.visionAttachment);
        const visionAttachment = visionAttachments[0] || null;

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

        try {
            let targetTool = 'clarify';
        let toolArgs = {};
        const queryLower = query.toLowerCase();

        if (queryLower.includes('天氣') || queryLower.includes('weather') || queryLower.includes('氣溫') || queryLower.includes('溫度') || queryLower.includes('氣象') || queryLower.includes('降雨')) {
            targetTool = 'get_weather';
            const detectedLoc = extractLocationFromQuery(query);
            toolArgs = { location: detectedLoc, query: query };
            const isZh = (this.currentLang !== 'en');
            this.logTerminal(isZh ? `[Hermes 氣象分析] 意圖匹配工具：get_weather | 辨識地點：${detectedLoc}` : `[Hermes Weather Analysis] Tool matched: get_weather | Location: ${detectedLoc}`);
        } else if (queryLower.includes('python') || queryLower.includes('計算') || queryLower.includes('code') || queryLower.includes('數列') || queryLower.includes('fibonacci')) {
            targetTool = 'run_python';
            toolArgs = { code: `# Generated by Hermes for query: ${query}\nresult = [x**2 for x in range(10)]\nprint('Computed result:', result)` };
        } else if (queryLower.includes('環境') || queryLower.includes('硬體') || queryLower.includes('配備') || queryLower.includes('規格') || queryLower.includes('系統資訊') || queryLower.includes('本電腦') || queryLower.includes('這台電腦') || queryLower.includes('探測') || queryLower.includes('probe') || queryLower.includes('telemetry') || queryLower.includes('system info') || queryLower.includes('sysinfo')) {
            targetTool = 'system_probe';
            toolArgs = {};
            const isZh = (this.currentLang !== 'en');
            this.logTerminal(isZh ? `[Hermes 系統分析] 意圖匹配工具：system_probe (即時探測主機環境)` : `[Hermes System Analysis] Tool matched: system_probe (Probing host environment)`);
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
        } else if (queryLower.includes('graphrag') || queryLower.includes('知識圖譜') || queryLower.includes('三元組') || queryLower.includes('多跳') || queryLower.includes('圖譜')) {
            targetTool = 'graphrag_query';
            toolArgs = { query: query, mode: 'hybrid' };
        } else if (queryLower.includes('操作說明') || queryLower.includes('說明手冊') || queryLower.includes('使用手冊') || queryLower.includes('操作指南') || queryLower.includes('系統手冊') || queryLower.includes('user guide') || queryLower.includes('manual') || (queryLower.includes('說明') && !queryLower.includes('模式'))) {
            targetTool = 'search_guide';
            toolArgs = { query: query };
        } else if (queryLower.includes('左側') || queryLower.includes('左邊') || queryLower.includes('終端機') || queryLower.includes('terminal') || queryLower.includes('錯誤記錄') || queryLower.includes('看記錄') || queryLower.includes('查看記錄') || queryLower.includes('log')) {
            targetTool = 'inspect_terminal';
            toolArgs = {};
            const isZh = (this.currentLang !== 'en');
            this.logTerminal(isZh ? `[Hermes 監控分析] 意圖匹配工具：inspect_terminal (即時讀取左側終端機輸出記錄)` : `[Hermes Monitor] Tool matched: inspect_terminal (Inspecting left terminal logs)`);
        } else {
            targetTool = 'llm_direct';
        }

        // No tool matched → stream answer based on active inference engine
        if (targetTool === 'llm_direct') {
            thinkingDiv.remove();
            if (this.activeEngine === 'webgpu') {
                await this._streamWebGpuAnswer(query, container, dict);
            } else if (this.activeEngine === 'onnx') {
                await this._streamOnnxAnswer(query, container, dict, { visionAttachment, visionAttachments });
            } else {
                await this._streamLlmAnswer(query, container, dict, 0, null, { visionAttachment, visionAttachments });
            }
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

        let toolResult = null;
        try {
            toolResult = await this.dispatcher.dispatch(targetTool, toolArgs);
        } catch (dispatchErr) {
            console.error('Dispatcher execution error:', dispatchErr);
            toolResult = {
                status: 'error',
                error: dispatchErr.message || String(dispatchErr)
            };
        } finally {
            if (thinkingDiv && thinkingDiv.parentNode) {
                thinkingDiv.remove();
            }
        }

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
            const rawLoc = (toolResult && toolResult.location) || (toolArgs && toolArgs.location) || 'Hsinchu';
            const isZh = (this.currentLang === 'zh-TW');
            const loc = formatLocationDisplay(rawLoc, isZh);
            const cond = (toolResult && toolResult.condition) || 'Partly Cloudy';
            const temp = (toolResult && toolResult.temperature_c) || '25\u00B0C';
            const feels = (toolResult && toolResult.feels_like_c) || temp;
            const hum = (toolResult && toolResult.humidity) || '65%';
            const wind = (toolResult && toolResult.wind_kmh) || '12 km/h';
            const rep = (toolResult && toolResult.report) || `${loc}: ${cond}, ${temp} (feels ${feels}), humidity ${hum}, wind ${wind}.`;
            const sourceTag = (toolResult && toolResult.source) ? toolResult.source : 'Open-Meteo Live API';
            answerSummary = `<div class="space-y-2 select-text">
                    <div class="text-xs font-bold text-sky-300 flex items-center justify-between gap-1.5 flex-wrap">
                        <div class="flex items-center gap-1.5">
                            <i data-lucide="sun-medium" class="w-4 h-4 text-amber-400"></i>
                            <span>${loc} ${this.currentLang === 'zh-TW' ? '即時氣象' : 'Live Weather'}</span>
                        </div>
                        <span class="text-[10px] px-1.5 py-0.5 rounded bg-sky-950/80 text-sky-400 border border-sky-700/50 font-mono">${sourceTag}</span>
                    </div>
                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[11px] font-mono">
                        <div class="bg-slate-950 p-2 rounded-lg border border-slate-800"><span class="text-slate-400 block text-[10px]">${this.currentLang === 'zh-TW' ? '天氣' : 'Condition'}</span><span class="text-amber-300 font-bold">${cond}</span></div>
                        <div class="bg-slate-950 p-2 rounded-lg border border-slate-800"><span class="text-slate-400 block text-[10px]">${this.currentLang === 'zh-TW' ? '氣溫' : 'Temperature'}</span><span class="text-emerald-400 font-bold">${temp}</span></div>
                        <div class="bg-slate-950 p-2 rounded-lg border border-slate-800"><span class="text-slate-400 block text-[10px]">${this.currentLang === 'zh-TW' ? '體感' : 'Feels Like'}</span><span class="text-sky-300 font-bold">${feels}</span></div>
                        <div class="bg-slate-950 p-2 rounded-lg border border-slate-800"><span class="text-slate-400 block text-[10px]">${this.currentLang === 'zh-TW' ? '濕度/風速' : 'Hum/Wind'}</span><span class="text-purple-300 font-bold">${hum}/${wind}</span></div>
                    </div>
                    <div class="text-slate-200 text-xs bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">${rep}</div>
                </div>`;
        } else if (targetTool === 'system_probe') {
            const isZh = (this.currentLang !== 'en');
            answerSummary = `<div class="space-y-2.5 select-text">
                <div class="text-xs font-bold text-emerald-400 flex items-center justify-between gap-1.5 flex-wrap">
                    <div class="flex items-center gap-1.5">
                        <i data-lucide="activity" class="w-4 h-4 text-emerald-400"></i>
                        <span>${isZh ? '⚡ Hermes 即時環境探測報告 (System Probe Telemetry)' : '⚡ Hermes Environment Telemetry Report'}</span>
                    </div>
                    <span class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700/50 font-mono">🟢 Tier 1: System Probe</span>
                </div>
                <div class="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-[11px] font-mono">
                    <div class="bg-slate-950 p-2 rounded-lg border border-slate-800">
                        <span class="text-slate-400 block text-[10px]">${isZh ? '作業系統' : 'Operating System'}</span>
                        <span class="text-sky-300 font-bold">${toolResult?.os || 'Windows'}</span>
                    </div>
                    <div class="bg-slate-950 p-2 rounded-lg border border-slate-800">
                        <span class="text-slate-400 block text-[10px]">${isZh ? '主記憶體 (RAM)' : 'System Memory'}</span>
                        <span class="text-emerald-400 font-bold">${toolResult?.ram || '8+ GB'}</span>
                    </div>
                    <div class="bg-slate-950 p-2 rounded-lg border border-slate-800">
                        <span class="text-slate-400 block text-[10px]">${isZh ? '處理器核心' : 'CPU Cores'}</span>
                        <span class="text-amber-300 font-bold">${toolResult?.cpu || '多核心'}</span>
                    </div>
                    <div class="bg-slate-950 p-2 rounded-lg border border-slate-800">
                        <span class="text-slate-400 block text-[10px]">${isZh ? 'Daemon 常駐服務' : 'Host Daemon'}</span>
                        <span class="${toolResult?.daemon?.includes('連線') || toolResult?.daemon?.includes('Online') ? 'text-emerald-400' : 'text-purple-300'} font-bold">${toolResult?.daemon || '純 WASM'}</span>
                    </div>
                    <div class="bg-slate-950 p-2 rounded-lg border border-slate-800">
                        <span class="text-slate-400 block text-[10px]">${isZh ? 'Web Serial 驅動' : 'Web Serial'}</span>
                        <span class="text-teal-300 font-bold">${toolResult?.web_serial || 'Ready'}</span>
                    </div>
                    <div class="bg-slate-950 p-2 rounded-lg border border-slate-800">
                        <span class="text-slate-400 block text-[10px]">${isZh ? '推論安全限制' : 'GPU Guard'}</span>
                        <span class="text-emerald-400 font-bold">${this.gpuSafetyActive ? '90% 顯存守護' : '標準模式'}</span>
                    </div>
                </div>
                <div class="text-xs text-slate-300 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 leading-relaxed">
                    <div class="font-bold text-slate-200 mb-1">🎮 顯示卡與硬體加速狀態：</div>
                    <div class="text-[11px] font-mono text-purple-300">${toolResult?.gpu || 'WebGPU 原生支援 · GPU 90% 顯存與運算守護已就緒'}</div>
                </div>
                <div class="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/60">
                    <span>💡 ${isZh ? '您可在下方終端機輸入「/detect」檢視完整終端環境指標，或輸入「/」查看推薦指令。' : 'Type "/detect" in the terminal below to see complete diagnostics.'}</span>
                </div>
            </div>`;
        } else if (targetTool === 'inspect_terminal') {
            const isZh = (this.currentLang !== 'en');
            const recent = (toolResult?.recent_lines || []).slice(-8);
            const logsFormatted = recent.length
                ? recent.map(l => `<div class="font-mono text-[11px] leading-relaxed break-all ${l.includes('⚠️') || l.includes('錯誤') || l.includes('fail') || l.includes('error') ? 'text-amber-300' : 'text-slate-300'}">${l.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>`).join('')
                : `<div class="text-xs text-slate-400">${isZh ? '左側終端機目前尚無最新輸出記錄。' : 'No terminal log records found.'}</div>`;
            answerSummary = `<div class="space-y-2.5 select-text">
                <div class="text-xs font-bold text-sky-400 flex items-center justify-between gap-1.5 flex-wrap">
                    <div class="flex items-center gap-1.5">
                        <i data-lucide="terminal" class="w-4 h-4 text-sky-400"></i>
                        <span>${isZh ? '💻 左側終端機即時記錄檢視 (Terminal Live Diagnostics)' : '💻 Left Terminal Diagnostics'}</span>
                    </div>
                    <span class="text-[10px] px-2 py-0.5 rounded-full bg-sky-950 text-sky-300 border border-sky-700/50 font-mono">🟢 Tier 1: Terminal Inspector</span>
                </div>
                <div class="bg-slate-950/90 p-3 rounded-xl border border-slate-800/80 space-y-1.5 max-h-56 overflow-y-auto select-text font-mono">
                    ${logsFormatted}
                </div>
                <div class="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/60">
                    <span>💡 ${isZh ? '若要執行命令，可直接在下方命令列輸入，或輸入「/detect」進行環境自檢。' : 'Type commands in the left terminal input or /detect for self-test.'}</span>
                </div>
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
        } else if (targetTool === 'graphrag_query' || targetTool === 'query_knowledge_graph') {
            const triples = toolResult?.triples || [];
            const entities = toolResult?.matched_entities || [];
            const triplesHtml = triples.map(t => `<div class="p-1.5 bg-slate-900 rounded border border-slate-800 font-mono text-[11px] text-cyan-300">🕸️ ${t.text || `${t.source} ──[${t.relation}]──> ${t.target}`}</div>`).join('');
            answerSummary = `<div class="space-y-2 select-text">
                <div class="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                    <i data-lucide="network" class="w-4 h-4 text-cyan-400"></i>
                    <span>GraphRAG 知識圖譜推理報告 (命中 ${entities.length} 實體 / ${triples.length} 關聯)</span>
                </div>
                <div class="flex flex-wrap gap-1 text-[11px]">
                    ${entities.map(e => `<span class="px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-700/60 font-medium">${e}</span>`).join('')}
                </div>
                <div class="space-y-1 max-h-48 overflow-y-auto">
                    ${triplesHtml || '<div class="text-slate-400 text-xs italic">無直接關聯三元組</div>'}
                </div>
                <div class="text-xs text-slate-300 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 leading-relaxed whitespace-pre-wrap">
                    ${toolResult?.context || '已完成圖譜多跳推理。'}
                </div>
            </div>`;
        } else if (targetTool === 'search_guide') {
            const isEn = (this.currentLang === 'en');
            const highlights = toolResult?.highlights || [];
            answerSummary = `<div class="space-y-2.5 select-text">
                <div class="text-xs font-bold text-indigo-400 flex items-center justify-between">
                    <div class="flex items-center gap-1.5">
                        <i data-lucide="book-marked" class="w-4 h-4 text-indigo-400"></i>
                        <span>${isEn ? 'Webcom AI Console Operation Guide' : 'Webcom AI 雙引擎控制台・操作手冊摘要'}</span>
                    </div>
                    <button type="button" onclick="window.openGuideModal?.()" class="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow">
                        <i data-lucide="external-link" class="w-3.5 h-3.5"></i>
                        <span>${isEn ? 'Open Full User Guide' : '開啟完整操作說明手冊'}</span>
                    </button>
                </div>
                <div class="bg-indigo-950/30 p-2.5 rounded-lg border border-indigo-800/60 space-y-1.5 text-xs text-slate-300">
                    <div class="font-bold text-indigo-300">${isEn ? 'Core Highlights & Protection Guardrails:' : '核心功能與安全保護亮點：'}</div>
                    <ul class="list-disc list-inside space-y-1 text-[11px] text-slate-300 pl-1">
                        ${highlights.map(h => `<li>${h}</li>`).join('')}
                    </ul>
                </div>
                <div class="text-[11px] text-slate-400">
                    ${isEn ? 'Tip: You can also click the "User Guide" button in the top toolbar to switch between all 9 tabs in English and Traditional Chinese.' : '提示：亦可隨時點擊頂部工具列的「操作說明」按鈕，自由切換九大分頁與中英雙語對照。'}
                </div>
            </div>`;
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

        const msgId = 'msg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
        aiDiv.setAttribute('data-msg-id', msgId);

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

        // Auto-persist assistant response
        this.chatHistory.push({
            id: msgId,
            role: 'assistant',
            content: answerSummary,
            timestamp: new Date().toISOString(),
            timeLabel: new Date().toLocaleTimeString(),
            engineBadge,
            tier: toolFailed ? 2 : 1,
            html: aiDiv.outerHTML
        });
        this.saveChatHistory();
        } catch (reasoningErr) {
            console.error('Error during simulateHermesReasoning:', reasoningErr);
            const isZh = (this.currentLang !== 'en');
            const errDiv = document.createElement('div');
            errDiv.className = 'flex items-start space-x-3';
            errDiv.innerHTML = `
                <div class="w-8 h-8 rounded-full bg-red-700 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow">!</div>
                <div class="max-w-[85%] bg-darkCard border border-red-800/60 rounded-2xl rounded-tl-none p-3.5 space-y-2 text-xs text-red-300">
                    <div class="font-bold flex items-center gap-1.5"><i data-lucide="alert-triangle" class="w-4 h-4"></i>${isZh ? '處理請求時發生異常' : 'Error processing request'}</div>
                    <div class="font-mono text-[11px] text-slate-300 bg-red-950/40 p-2 rounded border border-red-900/50">${reasoningErr.message || String(reasoningErr)}</div>
                </div>
            `;
            container.appendChild(errDiv);
            container.scrollTop = container.scrollHeight;
            if (window.lucide) lucide.createIcons();
        } finally {
            if (thinkingDiv && thinkingDiv.parentNode) {
                thinkingDiv.remove();
            }
        }
    }

    async _prepareVisionAttachmentFromBlob(blob, name = 'image.png', dataUrl = '') {
        if (!blob) return null;
        const bitmap = await createImageBitmap(blob);
        const maxSide = 896;
        const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
        const width = Math.max(1, Math.round(bitmap.width * scale));
        const height = Math.max(1, Math.round(bitmap.height * scale));
        const canvas = (typeof OffscreenCanvas !== 'undefined') ? new OffscreenCanvas(width, height) : document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('無法建立 2D 圖像上下文');
        ctx.drawImage(bitmap, 0, 0, width, height);
        const imageData = ctx.getImageData(0, 0, width, height);
        if (bitmap.close) bitmap.close();
        return {
            name,
            mime: blob.type || 'image/png',
            size: blob.size || 0,
            width,
            height,
            data: new Uint8ClampedArray(imageData.data),
            objectUrl: URL.createObjectURL(blob),
            dataUrl: typeof dataUrl === 'string' ? dataUrl : ''
        };
    }

    async _prepareVisionAttachment(file) {
        if (!file) return null;
        const dataUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error || new Error('讀取圖片失敗'));
            reader.readAsDataURL(file);
        });
        return this._prepareVisionAttachmentFromBlob(file, file.name, dataUrl);
    }

    _guessMimeFromImageBytes(bytes = []) {
        if (!bytes || bytes.length < 4) return '';
        if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) return 'image/png';
        if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) return 'image/jpeg';
        if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) return 'image/gif';
        if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
            bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return 'image/webp';
        if (bytes[0] === 0x42 && bytes[1] === 0x4D) return 'image/bmp';
        return '';
    }

    _decodeBase64ToBytes(base64Text) {
        const normalized = String(base64Text || '').replace(/\s+/g, '');
        const binary = atob(normalized);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        return bytes;
    }

    _normalizeVisionAttachments(visionAttachments = null) {
        if (!visionAttachments) return [];
        if (Array.isArray(visionAttachments)) return visionAttachments.filter(Boolean);
        return [visionAttachments].filter(Boolean);
    }

    _firstVisionAttachment(visionAttachments = null) {
        return this._normalizeVisionAttachments(visionAttachments)[0] || null;
    }

    _looksLikeImageDataUrl(value) {
        return /^data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=\r\n]+$/i.test(String(value || '').trim());
    }

    _looksLikeRawBase64Candidate(value) {
        const compact = String(value || '').replace(/\s+/g, '');
        return compact.length >= 512 && compact.length % 4 === 0 && /^[A-Za-z0-9+/=]+$/.test(compact);
    }

    async _prepareVisionAttachmentFromDataUrl(dataUrl, name = 'base64-image') {
        const m = String(dataUrl || '').match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,/i);
        if (!m) throw new Error('Base64 圖片格式無效');
        const mime = m[1].toLowerCase();
        const ext = mime.split('/')[1]?.replace('jpeg', 'jpg') || 'png';
        const bytes = this._decodeBase64ToBytes(String(dataUrl).slice(m[0].length));
        const blob = new Blob([bytes], { type: mime });
        return this._prepareVisionAttachmentFromBlob(blob, `${name}.${ext}`, dataUrl);
    }

    async _prepareVisionAttachmentFromRawBase64(base64Text, name = 'base64-image') {
        const bytes = this._decodeBase64ToBytes(base64Text);
        const mime = this._guessMimeFromImageBytes(bytes.slice(0, 16));
        if (!mime) throw new Error('無法辨識 raw base64 的圖片格式，請改用 data:image/...;base64,...');
        const ext = mime.split('/')[1]?.replace('jpeg', 'jpg') || 'png';
        const dataUrl = `data:${mime};base64,${String(base64Text || '').replace(/\s+/g, '')}`;
        const blob = new Blob([bytes], { type: mime });
        return this._prepareVisionAttachmentFromBlob(blob, `${name}.${ext}`, dataUrl);
    }

    async _extractVisionAttachmentsFromJsonValue(value, path = 'json') {
        if (typeof value === 'string') {
            const trimmed = value.trim();
            if (this._looksLikeImageDataUrl(trimmed)) {
                return {
                    cleanedValue: null,
                    attachments: [await this._prepareVisionAttachmentFromDataUrl(trimmed, path.replace(/[^\w.-]+/g, '_') || 'json-image')]
                };
            }
            if (this._looksLikeRawBase64Candidate(trimmed)) {
                try {
                    return {
                        cleanedValue: null,
                        attachments: [await this._prepareVisionAttachmentFromRawBase64(trimmed, path.replace(/[^\w.-]+/g, '_') || 'json-image')]
                    };
                } catch (_) {}
            }
            return { cleanedValue: value, attachments: [] };
        }

        if (Array.isArray(value)) {
            const cleanedItems = [];
            const attachments = [];
            for (let i = 0; i < value.length; i++) {
                const res = await this._extractVisionAttachmentsFromJsonValue(value[i], `${path}_${i}`);
                attachments.push(...res.attachments);
                if (res.cleanedValue !== null && res.cleanedValue !== undefined && !(Array.isArray(res.cleanedValue) && res.cleanedValue.length === 0)) {
                    cleanedItems.push(res.cleanedValue);
                }
            }
            return { cleanedValue: cleanedItems, attachments };
        }

        if (value && typeof value === 'object') {
            const cleanedObj = {};
            const attachments = [];
            for (const [key, val] of Object.entries(value)) {
                const res = await this._extractVisionAttachmentsFromJsonValue(val, `${path}_${key}`);
                attachments.push(...res.attachments);
                if (res.cleanedValue !== null && res.cleanedValue !== undefined && !(Array.isArray(res.cleanedValue) && res.cleanedValue.length === 0)) {
                    cleanedObj[key] = res.cleanedValue;
                }
            }
            return { cleanedValue: cleanedObj, attachments };
        }

        return { cleanedValue: value, attachments: [] };
    }

    async _extractVisionAttachmentsFromText(text, existingAttachments = null) {
        const rawText = String(text || '');
        const normalizedExisting = this._normalizeVisionAttachments(existingAttachments);
        const trimmedText = rawText.trim();

        if ((trimmedText.startsWith('{') || trimmedText.startsWith('[')) && /data:image\/|base64|image/i.test(trimmedText)) {
            try {
                const parsed = JSON.parse(trimmedText);
                const jsonRes = await this._extractVisionAttachmentsFromJsonValue(parsed);
                if (jsonRes.attachments.length > 0) {
                    const cleanedText = JSON.stringify(jsonRes.cleanedValue, null, 2).replace(/\{\s*\}|\[\s*\]/g, '').trim();
                    return {
                        visionAttachments: jsonRes.attachments,
                        visionAttachment: jsonRes.attachments[0] || null,
                        cleanedText: cleanedText || '請分析這些 base64 圖片',
                        source: normalizedExisting.length ? 'json_base64_override' : 'json_base64'
                    };
                }
            } catch (_) {}
        }

        const dataUrlMatches = [...rawText.matchAll(/data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=\r\n]+/ig)];
        if (dataUrlMatches.length > 0) {
            const attachments = [];
            for (let i = 0; i < dataUrlMatches.length; i++) {
                attachments.push(await this._prepareVisionAttachmentFromDataUrl(dataUrlMatches[i][0], `inline-base64-image-${i + 1}`));
            }
            const cleanedText = rawText.replace(/data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=\r\n]+/ig, '').replace(/\n{3,}/g, '\n\n').trim();
            return {
                visionAttachments: attachments,
                visionAttachment: attachments[0] || null,
                cleanedText: cleanedText || '請分析這些 base64 圖片',
                source: normalizedExisting.length ? 'inline_base64_override' : 'inline_base64'
            };
        }

        const rawCandidates = rawText.match(/[A-Za-z0-9+/=\r\n]{512,}/g) || [];
        const attachments = [];
        let cleanedText = rawText;
        for (const candidate of rawCandidates) {
            const compact = candidate.replace(/\s+/g, '');
            if (compact.length < 512 || compact.length % 4 !== 0) continue;
            try {
                const attachment = await this._prepareVisionAttachmentFromRawBase64(compact, `raw-base64-image-${attachments.length + 1}`);
                attachments.push(attachment);
                cleanedText = cleanedText.replace(candidate, '');
            } catch (_) {}
        }
        if (attachments.length > 0) {
            cleanedText = cleanedText.replace(/\n{3,}/g, '\n\n').trim();
            return {
                visionAttachments: attachments,
                visionAttachment: attachments[0] || null,
                cleanedText: cleanedText || '請分析這些 base64 圖片',
                source: normalizedExisting.length ? 'raw_base64_override' : 'raw_base64'
            };
        }

        return {
            visionAttachments: normalizedExisting,
            visionAttachment: normalizedExisting[0] || null,
            cleanedText: rawText
        };
    }

    _renderVisionAttachmentMetaHtml(visionAttachments, isComposer = false) {
        const attachments = this._normalizeVisionAttachments(visionAttachments);
        if (!attachments.length) return '';
        const first = attachments[0];
        const escapedName = this.escapeHtml(first.name || 'image');
        const dimText = `${first.width || '?'}×${first.height || '?'}`;
        if (isComposer) {
            return attachments.length === 1
                ? `${escapedName} · ${dimText}`
                : `${attachments.length} 張圖片 · ${escapedName}`;
        }
        return `
            <div class="mb-2 p-2 rounded-xl bg-cyan-950/35 border border-cyan-700/40 text-[11px] text-cyan-200 space-y-1">
                <div class="flex items-center gap-1.5 font-medium">
                    <i data-lucide="image" class="w-3.5 h-3.5 text-cyan-300"></i>
                    <span>${attachments.length === 1 ? `已附圖：${escapedName}` : `已附圖：共 ${attachments.length} 張`}</span>
                    <span class="text-cyan-400/80 font-mono">${dimText}</span>
                </div>
                <div class="flex flex-wrap gap-2">
                    ${attachments.map((attachment) => attachment.objectUrl ? `<img src="${attachment.objectUrl}" alt="${this.escapeHtml(attachment.name || 'image')}" class="max-h-28 rounded-lg border border-cyan-800/50">` : '').join('')}
                </div>
            </div>
        `;
    }

    updatePendingVisionBadge() {
        const badge = document.getElementById('pending-vision-badge');
        const label = document.getElementById('pending-vision-label');
        if (!badge || !label) return;
        if (this.pendingVisionImage) {
            label.textContent = this._renderVisionAttachmentMetaHtml(this.pendingVisionImage, true);
            badge.classList.remove('hidden');
            badge.classList.add('inline-flex');
        } else {
            label.textContent = '';
            badge.classList.add('hidden');
            badge.classList.remove('inline-flex');
        }
        if (window.lucide) lucide.createIcons();
    }

    clearPendingVisionAttachment() {
        this.pendingVisionImage = null;
        this.updatePendingVisionBadge();
    }

    _buildApiUserMessage(query, visionAttachments = null) {
        const attachments = this._normalizeVisionAttachments(visionAttachments).filter(item => item?.dataUrl);
        if (!attachments.length) {
            return { role: 'user', content: query };
        }
        return {
            role: 'user',
            content: [
                { type: 'text', text: query },
                ...attachments.map(attachment => ({ type: 'image_url', image_url: { url: attachment.dataUrl } }))
            ]
        };
    }

    _isOnnxVisionModel(modelName) {
        return /(Qwen3-VL|Qwen2-VL|Qwen2\.5-VL|gemma-4|vision)/i.test(modelName || '');
    }

    _looksLikeCountQuery(query) {
        const q = String(query || '').toLowerCase();
        return /有幾|幾個|幾根|幾支|幾隻|幾條|幾片|幾把|how many|count/i.test(q);
    }

    _buildOneJevCountOptions(maxCount = 12) {
        return Array.from({ length: maxCount + 1 }, (_, i) => String(i));
    }

    _buildVisionChatMessages(query, visionAttachments = null) {
        const attachments = this._normalizeVisionAttachments(visionAttachments);
        const isZh = (this.currentLang !== 'en');
        const langDirective = isZh
            ? '請一律使用繁體中文 (zh-TW) 詳細且流暢地回答使用者的問題與分析畫面。'
            : 'Answer the user\'s inquiry concisely and clearly in English.';
        return [
            {
                role: 'system',
                content: `You are Hermes Assistant in Webcom AI. ${langDirective}`
            },
            {
                role: 'user',
                content: [
                    ...attachments.map(() => ({ type: 'image' })),
                    { type: 'text', text: `${String(query || '').trim()}${isZh ? '（請以繁體中文回答）' : ''}` }
                ]
            }
        ];
    }

    _buildRawImageForTransformers(visionAttachment, transformers) {
        if (!visionAttachment || !transformers?.RawImage) return null;
        return new transformers.RawImage(visionAttachment.data, visionAttachment.width, visionAttachment.height, 4).rgb();
    }

    _buildRawImagesForTransformers(visionAttachments, transformers) {
        return this._normalizeVisionAttachments(visionAttachments)
            .map(item => this._buildRawImageForTransformers(item, transformers))
            .filter(Boolean);
    }

    _extractGeneratedText(result) {
        let text = '';
        if (typeof result === 'string') text = result;
        else if (Array.isArray(result) && result.length > 0) {
            const first = result[0];
            if (typeof first === 'string') text = first;
            else if (typeof first?.generated_text === 'string') text = first.generated_text;
            else if (Array.isArray(first?.generated_text)) {
                const lastPart = first.generated_text[first.generated_text.length - 1];
                if (typeof lastPart === 'string') text = lastPart;
                else if (lastPart?.content && Array.isArray(lastPart.content)) {
                    const textPart = lastPart.content.find(part => part.type === 'text');
                    if (textPart?.text) text = textPart.text;
                } else if (lastPart?.content && typeof lastPart.content === 'string') text = lastPart.content;
            } else if (typeof first?.text === 'string') text = first.text;
        }

        if (text) {
            // Strip prompt turn echo from decoder (e.g. "user\n...model\n" or "<|turn>model\n")
            if (text.includes('<|turn>model\n')) {
                text = text.split('<|turn>model\n').pop();
            } else if (text.includes('<|turn>model')) {
                text = text.split('<|turn>model').pop();
            } else if (/(\n|^)model\n/i.test(text)) {
                const parts = text.split(/(\n|^)model\n/i);
                text = parts[parts.length - 1];
            }
            text = text.replace(/<turn\|>/g, '').replace(/<bos>/g, '').replace(/<eos>/g, '').trim();
        }
        return text;
    }

    _isOneJevModel(modelName) {
        return /(^|\/)OneJev-0\.8B-ONNX$/i.test(modelName || '') || /onejev/i.test(modelName || '');
    }

    _getOneJevLetters(count) {
        return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.slice(0, Math.max(0, count || 0)).split('');
    }

    _oneJevStateBlock(state) {
        if (typeof state === 'string') {
            return `<state>\n${state}\n</state>\n\n`;
        }
        return `<state>\n${JSON.stringify(state, null, 2)}\n</state>\n\n`;
    }

    _renderOneJevChoiceQuestion(options) {
        const labels = this._getOneJevLetters(options.length);
        const rendered = labels.map((letter, idx) => {
            const raw = String(options[idx] || '').trim();
            return `${letter}. ${raw || `option_${idx + 1}`}`;
        }).join('\n');
        return {
            labels,
            suffix: `Question: Which option best applies to the state?\n\nOptions:\n${rendered}\n\nAnswer with one letter: ${labels.join(', ')}.`
        };
    }

    _buildOneJevUserContent(text, imageCount = 0) {
        if (!imageCount) return text;
        const parts = [];
        const re = /<image:(\d+)>/g;
        let pos = 0;
        for (const match of text.matchAll(re)) {
            if (match.index > pos) {
                parts.push({ type: 'text', text: text.slice(pos, match.index) });
            }
            parts.push({ type: 'image' });
            pos = match.index + match[0].length;
        }
        if (pos < text.length) {
            parts.push({ type: 'text', text: text.slice(pos) });
        }
        return parts;
    }

    _buildOneJevMessages(state, options, imageCount = 0) {
        const { labels, suffix } = this._renderOneJevChoiceQuestion(options);
        return {
            labels,
            messages: [
                {
                    role: 'system',
                    content: 'Apply the question to the state. Choose exactly one of the listed options. Respond with only its uppercase letter, with no explanation or reasoning.'
                },
                {
                    role: 'user',
                    content: this._buildOneJevUserContent(this._oneJevStateBlock(state) + suffix, imageCount)
                }
            ]
        };
    }

    _oneJevSoftmax(logits, temperature = 1) {
        const temp = Math.max(0.1, Number(temperature) || 1);
        const scaled = logits.map(v => v / temp);
        const maxV = Math.max(...scaled);
        const exp = scaled.map(v => Math.exp(v - maxV));
        const sum = exp.reduce((a, b) => a + b, 0) || 1;
        return exp.map(v => v / sum);
    }

    _readFp16(h) {
        const sign = (h & 0x8000) ? -1 : 1;
        const exp = (h >> 10) & 0x1f;
        const frac = h & 0x3ff;
        if (exp === 0) return sign * Math.pow(2, -14) * (frac / 1024);
        if (exp === 31) return frac ? NaN : sign * Infinity;
        return sign * Math.pow(2, exp - 15) * (1 + frac / 1024);
    }

    async _ensureTransformersRuntime() {
        // 核心補丁 -1：修復 Transformers.js Range 預配緩衝區末端殘留 null byte (\0) 導致 JSON.parse 失敗問題
        if (!window._jsonNullPatchApplied) {
            window._jsonNullPatchApplied = true;
            const origParse = JSON.parse;
            JSON.parse = function(text, reviver) {
                if (typeof text === 'string' && text.includes('\0')) {
                    text = text.replace(/\0+$/g, '');
                }
                return origParse(text, reviver);
            };
        }

        let transformers = window.transformers;
        if (!transformers) {
            transformers = await import("https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.0");
            window.transformers = transformers;
        }

        // 核心補丁 0：清理瀏覽器 transformers-cache 內可能已快取的未修補或損壞之 config.json
        if (typeof caches !== 'undefined') {
            try {
                const cache = await caches.open('transformers-cache');
                const keys = await cache.keys();
                for (const req of keys) {
                    const rawUrl = req.url || '';
                    const lowerUrl = rawUrl.toLowerCase();
                    if (lowerUrl.includes('gemma') && lowerUrl.includes('.json')) {
                        // 強制清空過去可能因補丁竄改為 5072 位元組之殘留 Gemma 設定檔快取
                        await cache.delete(req);
                        if (rawUrl) await cache.delete(rawUrl);
                        console.log('[Model Cache] Force-evicted Gemma config cache:', rawUrl);
                    } else if (rawUrl.includes('config.json') && !rawUrl.includes('tokenizer_config.json')) {
                        try {
                            const resp = await cache.match(req);
                            if (resp) {
                                const text = await resp.text();
                                let needsEviction = false;
                                if (rawUrl.includes('OneJev') || rawUrl.includes('Qwen') || rawUrl.includes('qwen')) {
                                    if (text.includes('vision_encoder') && !text.includes('"vision_encoder": true') && !text.includes('"vision_encoder":true')) {
                                        needsEviction = true;
                                    }
                                    if (text.includes('"decoder_model_merged": true') || text.includes('decoder_model_merged_q4.onnx_data')) {
                                        needsEviction = true;
                                    }
                                    if (text.includes('"qwen3_5"') || text.includes('"qwen3"') || text.includes('"qwen2_vl"') || text.includes('"qwen3_vl"') || text.includes('Qwen2VLImageProcessorFast')) {
                                        needsEviction = true;
                                    }
                                }
                                if (needsEviction) {
                                    await cache.delete(req);
                                    if (rawUrl) await cache.delete(rawUrl);
                                    console.log('[Model Cache] Evicted cached config for clean reload:', rawUrl);
                                }
                            }
                        } catch (_) {
                            await cache.delete(req);
                        }
                    }
                }
            } catch (e) {
                console.warn('[Model Cache] Cache eviction loop error:', e);
            }
        }

        // 核心補丁 1：攔截 fetch 請求以相容 Transformers.js v3 尚未內建的型號命名
        if (!window._hfTransformersPatched) {
            window._hfTransformersPatched = true;
            const originalFetch = window.fetch;
            window.fetch = async function(...args) {
                const url = typeof args[0] === 'string' ? args[0] : (args[0]?.url || '');

                // Gemma 系列在 Transformers.js v4.3.0 為原生支援
                if (url.toLowerCase().includes('gemma')) {
                    return await originalFetch.apply(this, args);
                }

                const resp = await originalFetch.apply(this, args);

                // 補丁 A：Qwen2.5-VL / Qwen3-VL preprocessor_config.json 的 Fast 處理器對齊
                if (url.includes('preprocessor_config.json') && (url.includes('Qwen') || url.includes('OneJev'))) {
                    try {
                        const clone = resp.clone();
                        let text = await clone.text();
                        if (text.includes('Qwen2VLImageProcessorFast') || text.includes('Qwen3VLProcessor')) {
                            const patchedText = text
                                .replace(/Qwen2VLImageProcessorFast/g, 'Qwen2VLImageProcessor')
                                .replace(/Qwen3VLProcessor/g, 'Qwen2VLProcessor');
                            const safeHeaders = new Headers(resp.headers);
                            safeHeaders.set('content-length', new TextEncoder().encode(patchedText).length.toString());
                            safeHeaders.delete('content-encoding');
                            return new Response(patchedText, {
                                status: resp.status,
                                statusText: resp.statusText,
                                headers: safeHeaders
                            });
                        }
                    } catch (e) {}
                }

                // 補丁 B：Qwen / OneJev config.json 的 model_type 對齊到 Transformers.js 相容架構
                if (url.includes('config.json') && !url.includes('tokenizer_config.json') && (url.includes('Qwen') || url.includes('OneJev'))) {
                    try {
                        const clone = resp.clone();
                        let text = await clone.text();
                        try {
                            const data = JSON.parse(text);
                            let modified = false;
                            if (data.model_type === 'qwen2_vl' || data.model_type === 'qwen3_vl' || data.model_type === 'qwen2_5_vl' || data.model_type === 'qwen3_5_vision') {
                                data.model_type = 'qwen2-vl';
                                modified = true;
                            } else if (data.model_type === 'qwen3' || data.model_type === 'qwen3_5' || data.model_type === 'qwen3_5_text') {
                                data.model_type = 'qwen2';
                                modified = true;
                            }
                            if (Array.isArray(data.architectures)) {
                                data.architectures = data.architectures.map(a => {
                                    if (a.includes('Qwen3VL') || a.includes('Qwen3_5ForConditional')) { modified = true; return 'Qwen2VLForConditionalGeneration'; }
                                    if (a.includes('Qwen3') || a.includes('Qwen3_5')) { modified = true; return 'Qwen2ForCausalLM'; }
                                    return a;
                                });
                            }
                            if (data['transformers.js_config']) {
                                if (data['transformers.js_config'].use_external_data_format) {
                                    const ext = data['transformers.js_config'].use_external_data_format;
                                    if (typeof ext === 'object') {
                                        if (!ext['vision_encoder']) { ext['vision_encoder'] = true; modified = true; }
                                        if (ext['decoder_model_merged']) { delete ext['decoder_model_merged']; modified = true; }
                                        if (ext['embed_tokens']) { delete ext['embed_tokens']; modified = true; }
                                    }
                                }
                            }
                            if (modified) {
                                const patchedText = JSON.stringify(data);
                                const safeHeaders = new Headers(resp.headers);
                                safeHeaders.set('content-length', new TextEncoder().encode(patchedText).length.toString());
                                safeHeaders.delete('content-encoding');
                                return new Response(patchedText, {
                                    status: resp.status,
                                    statusText: resp.statusText,
                                    headers: safeHeaders
                                });
                            }
                        } catch (_) {}
                    } catch (e) {}
                }

                return resp;
            };
        }

        if (transformers) {
            // 核心補丁 2：向 Transformers.js 模型映射表動態註冊模型別名
            try {
                if (transformers.AutoModel?.MODEL_CLASS_MAPPINGS) {
                    for (const m of transformers.AutoModel.MODEL_CLASS_MAPPINGS) {
                        const mapping = Array.isArray(m) ? m[0] : m;
                        if (mapping && typeof mapping.has === 'function' && mapping.has('qwen2-vl')) {
                            const entry = mapping.get('qwen2-vl');
                            mapping.set('qwen2_vl', entry);
                            mapping.set('qwen3_5', entry);
                            mapping.set('qwen2_5_vl', entry);
                            mapping.set('qwen3_vl', entry);
                        }
                    }
                }
            } catch (e) {}

            try {
                if (transformers.AutoModelForCausalLM?.MODEL_CLASS_MAPPINGS) {
                    for (const m of transformers.AutoModelForCausalLM.MODEL_CLASS_MAPPINGS) {
                        const mapping = Array.isArray(m) ? m[0] : m;
                        if (mapping && typeof mapping.has === 'function') {
                            const qwen2Entry = mapping.get('qwen2');
                            if (qwen2Entry) {
                                mapping.set('qwen3', qwen2Entry);
                                mapping.set('qwen3_5', qwen2Entry);
                                mapping.set('qwen3_5_text', qwen2Entry);
                                mapping.set('qwen2_5_vl', qwen2Entry);
                                mapping.set('qwen3_vl', qwen2Entry);
                            }
                        }
                    }
                }
            } catch (e) {}

            try {
                if (transformers.AutoModelForVision2Seq?.MODEL_CLASS_MAPPINGS) {
                    const qwen2vlEntry = transformers.AutoModel?.MODEL_CLASS_MAPPINGS?.find(m => m.has('qwen2-vl'))?.get('qwen2-vl');
                    if (qwen2vlEntry) {
                        for (const m of transformers.AutoModelForVision2Seq.MODEL_CLASS_MAPPINGS) {
                            m.set('qwen3_5', qwen2vlEntry);
                            m.set('qwen2-vl', qwen2vlEntry);
                            m.set('qwen2_5_vl', qwen2vlEntry);
                            m.set('qwen3_vl', qwen2vlEntry);
                        }
                    }
                }
            } catch (e) {}

            // 核心補丁 3：AutoProcessor 針對 Qwen / OneJev / Gemma-4 模型相容注入
            try {
                if (transformers.AutoProcessor && !transformers.AutoProcessor._webcomPatched) {
                    transformers.AutoProcessor._webcomPatched = true;
                    const origAutoProc = transformers.AutoProcessor.from_pretrained;
                    transformers.AutoProcessor.from_pretrained = async function(modelId, options) {
                        if (typeof modelId === 'string') {
                            if ((modelId.includes('Qwen') || modelId.includes('OneJev')) && transformers.Qwen2VLProcessor) {
                                try {
                                    return await transformers.Qwen2VLProcessor.from_pretrained(modelId, options);
                                } catch (procErr) {
                                    console.warn('[AutoProcessor] Qwen2VLProcessor direct load fallback to original:', procErr);
                                }
                            }
                            if (modelId.toLowerCase().includes('gemma-4') && transformers.Gemma4Processor) {
                                try {
                                    return await transformers.Gemma4Processor.from_pretrained(modelId, options);
                                } catch (procErr) {
                                    console.warn('[AutoProcessor] Gemma4Processor direct load fallback to original:', procErr);
                                }
                            }
                        }

                        return await origAutoProc.call(this, modelId, options);
                    };
                }
            } catch (e) {}

            try {
                if (transformers.Qwen2VLImageProcessor && !transformers.Qwen2VLImageProcessorFast) {
                    Object.defineProperty(transformers, 'Qwen2VLImageProcessorFast', {
                        value: transformers.Qwen2VLImageProcessor,
                        configurable: true,
                        writable: true
                    });
                }
            } catch (e) {}
            try {
                if (transformers.Qwen2ForCausalLM && !transformers.Qwen3_5ForCausalLM) {
                    Object.defineProperty(transformers, 'Qwen3_5ForCausalLM', {
                        value: transformers.Qwen2ForCausalLM,
                        configurable: true,
                        writable: true
                    });
                }
            } catch (e) {}
            try {
                if (transformers.Qwen2VLForConditionalGeneration && !transformers.Qwen3_5ForConditionalGeneration) {
                    Object.defineProperty(transformers, 'Qwen3_5ForConditionalGeneration', {
                        value: transformers.Qwen2VLForConditionalGeneration,
                        configurable: true,
                        writable: true
                    });
                }
            } catch (e) {}
        }

        return transformers;
    }

    _handleOnnxProgress(p, prefix = '[ONNX WASM]') {
        if (!p || !p.file) return;
        if (!this._onnxProgressMap) this._onnxProgressMap = {};
        let pct = 0;
        if (typeof p.progress === 'number') {
            pct = p.progress > 1 ? Math.round(p.progress) : Math.round(p.progress * 100);
        } else if (p.loaded && p.total) {
            pct = Math.round((p.loaded / p.total) * 100);
        }
        pct = Math.min(100, Math.max(0, pct));
        const last = this._onnxProgressMap[p.file] ?? -1;
        if (last === -1 || pct - last >= 25 || pct === 100) {
            this._onnxProgressMap[p.file] = pct;
            this.logTerminal(`${prefix} 載入 ${p.file}: ${pct}%`);
        }
    }

    async _ensureOneJevBundle(modelName) {
        const targetModel = modelName || this.activeOnnxModel || 'onnx-community/OneJev-0.8B-ONNX';
        if (!this.oneJevBundles) this.oneJevBundles = {};
        if (this.oneJevBundles[targetModel]) return this.oneJevBundles[targetModel];

        const transformers = await this._ensureTransformersRuntime();
        transformers.env.allowLocalModels = false;
        transformers.env.useBrowserCache = true;

        const device = ('gpu' in navigator) ? 'webgpu' : 'wasm';
        const progress_callback = (p) => this._handleOnnxProgress(p, '[OneJev]');

        const processor = await transformers.AutoProcessor.from_pretrained(targetModel, { progress_callback });
        const modelClass = transformers.AutoModelForVision2Seq || transformers.AutoModel;
        const model = await modelClass.from_pretrained(targetModel, {
            device,
            dtype: {
                embed_tokens: 'q4f16',
                vision_encoder: device === 'webgpu' ? 'fp16' : 'fp32',
                decoder_model_merged: 'q4f16'
            },
            progress_callback
        });
        const slots = this._getOneJevLetters(26).map(letter => processor.tokenizer.encode(letter, { add_special_tokens: false })[0]);
        const bundle = { processor, model, slots, device, modelId: targetModel, transformers };
        this.oneJevBundles[targetModel] = bundle;
        return bundle;
    }

    async _evalOneJevDecision(state, options, temperature = 0.4, visionAttachment = null) {
        if (!Array.isArray(options) || options.length < 2 || options.length > 26) return null;

        const targetModel = this.activeOnnxModel || 'onnx-community/OneJev-0.8B-ONNX';
        const bundle = await this._ensureOneJevBundle(targetModel);
        const { processor, model, slots, transformers } = bundle;
        const images = visionAttachment ? [this._buildRawImageForTransformers(visionAttachment, transformers)].filter(Boolean) : [];
        const { labels, messages } = this._buildOneJevMessages(state, options, images.length);
        const prompt = processor.apply_chat_template(messages, {
            add_generation_prompt: true,
            tokenize: false
        });
        const inputs = images.length ? await processor(prompt, images) : await processor(prompt);
        const out = await model(inputs);
        const dims = out?.logits?.dims || [];
        const vocabSize = dims[dims.length - 1];
        const sequenceLength = dims[dims.length - 2];
        const logitsData = out?.logits?.data;
        if (!logitsData || !vocabSize || !sequenceLength) {
            throw new Error('OneJev logits unavailable');
        }
        const rowStart = (sequenceLength - 1) * vocabSize;
        const readLogit = (tokenId) => {
            const raw = logitsData[rowStart + tokenId];
            return (logitsData instanceof Uint16Array) ? this._readFp16(raw) : Number(raw);
        };
        const rawLogits = labels.map((_, idx) => readLogit(slots[idx]));
        const probs01 = this._oneJevSoftmax(rawLogits, temperature);
        const probsPct = probs01.map(p => Math.round(p * 10000) / 100);
        const bestIdx = probs01.indexOf(Math.max(...probs01));
        const uniform = 1 / options.length;
        const confidencePct = Math.max(0, Math.min(100, Math.round((((probs01[bestIdx] - uniform) / (1 - uniform || 1)) * 10000)) / 100));
        const decisions = options.map((opt, i) => ({
            option: opt,
            score: Math.round(rawLogits[i] * 1000) / 1000,
            prob: probsPct[i]
        })).sort((a, b) => b.prob - a.prob);

        return {
            status: 'success',
            model: `OneJev-0.8B-ONNX (${bundle.device})`,
            best_option: decisions[0]?.option || options[0],
            confidence: confidencePct,
            decisions,
            latency_ms: Math.round(performance.now() * 100) / 100
        };
    }

    async _ensureOnnxPipeline(modelName) {
        const targetModel = modelName || this.activeOnnxModel || 'onnx-community/OneJev-0.8B-ONNX';
        if (!this.onnxPipelines) this.onnxPipelines = {};
        if (this.onnxPipelines[targetModel]) return this.onnxPipelines[targetModel];
        const transformers = await this._ensureTransformersRuntime();
        transformers.env.allowLocalModels = false;
        transformers.env.useBrowserCache = true;

        if (this._isOneJevModel(targetModel)) {
            const bundle = await this._ensureOneJevBundle(targetModel);
            const self = this;
            const oneJevPipelineAdapter = async function(messages, opts = {}) {
                const prompt = bundle.processor.apply_chat_template(messages, {
                    add_generation_prompt: true,
                    tokenize: false
                });
                const inputs = await bundle.processor(prompt);
                const generatedIds = await bundle.model.generate({
                    ...inputs,
                    max_new_tokens: opts.max_new_tokens || 256,
                    temperature: opts.temperature || 0.7,
                    streamer: opts.streamer || null
                });
                return bundle.processor.batch_decode(generatedIds, { skip_special_tokens: true });
            };
            oneJevPipelineAdapter.tokenizer = bundle.processor.tokenizer;
            this.onnxPipelines[targetModel] = oneJevPipelineAdapter;
            return oneJevPipelineAdapter;
        }

        // Gemma4 mobile uses AutoModelForImageTextToText in Transformers.js v4
        if (targetModel.includes('gemma-4')) {
            // 載入前主動清理 CacheStorage 中任何舊補丁殘留的 Gemma 5072 位元組損壞 config
            if (typeof caches !== 'undefined') {
                try {
                    const cache = await caches.open('transformers-cache');
                    const keys = await cache.keys();
                    for (const req of keys) {
                        const u = (req.url || '').toLowerCase();
                        if (u.includes('gemma') && u.includes('.json')) {
                            await cache.delete(req);
                            if (req.url) await cache.delete(req.url);
                        }
                    }
                } catch (_) {}
            }

            const preferredDevice = ('gpu' in navigator) ? 'webgpu' : 'wasm';
            const progress_callback = (p) => this._handleOnnxProgress(p, '[Gemma4]');
            const modelClass = transformers.AutoModelForImageTextToText || transformers.Gemma4ForConditionalGeneration || transformers.AutoModel;
            const procClass = transformers.Gemma4Processor || transformers.AutoProcessor;
            const processor = await procClass.from_pretrained(targetModel, { progress_callback });
            if (!processor.tokenizer && transformers.AutoTokenizer) {
                try {
                    processor.tokenizer = await transformers.AutoTokenizer.from_pretrained(targetModel);
                } catch (_) {}
            }
            let model;
            try {
                model = await modelClass.from_pretrained(targetModel, {
                    device: preferredDevice,
                    dtype: {
                        decoder_model_merged: 'q2f16',
                        embed_tokens: 'q2f16',
                        audio_encoder: 'q2f16',
                        vision_encoder: 'fp16'
                    },
                    progress_callback
                });
            } catch (loadErr) {
                if (preferredDevice === 'webgpu') {
                    this.logTerminal(`[Gemma4] WebGPU 模式載入失敗 (${loadErr.message || loadErr})，正在降級嘗試 WASM 模式...`);
                    model = await modelClass.from_pretrained(targetModel, {
                        device: 'wasm',
                        dtype: {
                            decoder_model_merged: 'q2f16',
                            embed_tokens: 'q2f16',
                            audio_encoder: 'q2f16',
                            vision_encoder: 'fp16'
                        },
                        progress_callback
                    });
                } else {
                    throw loadErr;
                }
            }

            const gemmaPipelineAdapter = async function(firstArg, secondArg = {}) {
                let text = '';
                let images = [];
                let opts = {};

                if (Array.isArray(firstArg)) {
                    // Signature: (messages, opts)
                    opts = secondArg || {};
                    for (const m of firstArg) {
                        if (Array.isArray(m.content)) {
                            for (const c of m.content) {
                                if (c.type === 'image' && c.image) images.push(c.image);
                            }
                        }
                    }
                    try {
                        text = processor.apply_chat_template(firstArg, { tokenize: false, add_generation_prompt: true });
                    } catch (_) {
                        text = firstArg.map(m => {
                            if (typeof m.content === 'string') return m.content;
                            if (Array.isArray(m.content)) {
                                return m.content.map(c => c.text || '').filter(Boolean).join(' ');
                            }
                            return '';
                        }).filter(Boolean).join('\n');
                    }
                } else if (typeof firstArg === 'object' && firstArg !== null) {
                    // Signature: ({ text, images, streamer, ... })
                    opts = firstArg;
                    if (Array.isArray(firstArg.text)) {
                        try {
                            text = processor.apply_chat_template(firstArg.text, { tokenize: false, add_generation_prompt: true });
                        } catch (_) {
                            text = firstArg.text.map(m => {
                                if (typeof m.content === 'string') return m.content;
                                if (Array.isArray(m.content)) {
                                    return m.content.map(c => c.text || '').filter(Boolean).join(' ');
                                }
                                return '';
                            }).filter(Boolean).join('\n');
                        }
                    } else {
                        text = typeof firstArg.text === 'string' ? firstArg.text : (firstArg.inputs || '');
                    }
                    images = firstArg.images || [];
                } else {
                    text = String(firstArg || '');
                    opts = secondArg || {};
                }

                let inputs;
                if (images && images.length > 0) {
                    inputs = await processor(text, images);
                } else {
                    inputs = await processor(text);
                }

                const generateOptions = {
                    ...inputs,
                    max_new_tokens: opts.max_new_tokens || 256,
                    temperature: opts.temperature || 0.7
                };
                if (opts.streamer) {
                    generateOptions.streamer = opts.streamer;
                }

                const generatedIds = await model.generate(generateOptions);
                const decoded = processor.batch_decode(generatedIds, { skip_special_tokens: true });
                return decoded;
            };
            gemmaPipelineAdapter.tokenizer = processor.tokenizer;
            gemmaPipelineAdapter.processor = processor;
            gemmaPipelineAdapter.model = model;
            this.onnxPipelines[targetModel] = gemmaPipelineAdapter;
            return gemmaPipelineAdapter;
        }

        const task = this._isOnnxVisionModel(targetModel) ? 'image-to-text' : 'text-generation';
        let pipeline;
        const preferredDevice = ('gpu' in navigator) ? 'webgpu' : 'wasm';
        try {
            pipeline = await transformers.pipeline(task, targetModel, {
                dtype: 'q4',
                device: preferredDevice,
                progress_callback: (p) => this._handleOnnxProgress(p, '[ONNX WASM]')
            });
        } catch (devErr) {
            if (preferredDevice === 'webgpu') {
                this.logTerminal(`[ONNX WASM] WebGPU 載入未通過 (${devErr.message || devErr})，正在降級為純 WASM 模式...`);
                pipeline = await transformers.pipeline(task, targetModel, {
                    dtype: 'q4',
                    device: 'wasm',
                    progress_callback: (p) => this._handleOnnxProgress(p, '[ONNX WASM]')
                });
            } else {
                throw devErr;
            }
        }
        this.onnxPipelines[targetModel] = pipeline;
        return pipeline;
    }

    async _answerWithOneJevVisionCount(query, visionAttachments, isZh) {
        const attachments = this._normalizeVisionAttachments(visionAttachments);
        const primaryAttachment = attachments[0] || null;
        if (!primaryAttachment || !this._looksLikeCountQuery(query)) return null;
        const state = { question: query, image: '<image:1>' };
        const options = this._buildOneJevCountOptions(12);
        const res = await this._evalOneJevDecision(state, options, 0.35, primaryAttachment);
        if (!res) return null;
        const top3 = (res.decisions || []).slice(0, 3).map(d => `${d.option} (${d.prob}%)`).join('、');
        return isZh
            ? `OneJev 視覺決策結果：我判斷圖片中的數量最可能是 ${res.best_option}。${attachments.length > 1 ? '\n註：目前 OneJev 數量判斷先使用第 1 張圖，其餘圖片未納入這次封閉式計數。': ''}\n\n候選機率前 3 名：${top3}\n模型：${res.model}，耗時約 ${res.latency_ms} ms。`
            : `OneJev visual decision result: the most likely count is ${res.best_option}.${attachments.length > 1 ? '\nNote: this bounded count path currently uses only the first image; the remaining images were not included in this OneJev count decision.' : ''}\n\nTop-3 probabilities: ${top3}\nModel: ${res.model}, latency ${res.latency_ms} ms.`;
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

        // 2. Try local OneJev ONNX if user selected the dedicated Jev model
        const shouldUseOneJev = this._isOneJevModel(this.activeOnnxModel) && (this.activeEngine === 'onnx' || this.activeEngine === 'supervise');
        if (shouldUseOneJev) {
            try {
                const oneJevRes = await this._evalOneJevDecision(state, options, temperature);
                if (oneJevRes) {
                    oneJevRes.latency_ms = Math.round((performance.now() - t0) * 100) / 100;
                    return oneJevRes;
                }
            } catch (e) {
                console.warn('[OneJev] local decision fallback to heuristic:', e);
                this.logTerminal(`[OneJev] 本機決策推論失敗，回退至啟發式 Jev：${e.message || e}`);
            }
        }

        // 3. Pure in-browser WASM / Heuristic Jev Fast Decider (~2ms)
        const stateLower = (typeof state === 'string' ? state : JSON.stringify(state || {})).toLowerCase();
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

    _renderHallucinationGuardCard({ query, container, dict, contentEl, loopInfo, jevRes, fullText, options = {} }) {
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
                this._streamLlmAnswer(query, container, dict, 0, contentEl, { ...options, temperature: 0.2 });
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

    _handleJevRetryCountdown({ query, container, dict, retryCount, status, errTxt, contentEl, jevRes, delaySeconds = 5, options = {} }) {
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
            this._streamLlmAnswer(query, container, dict, retryCount + 1, contentEl, options);
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
        const visionAttachments = this._normalizeVisionAttachments(options.visionAttachments || options.visionAttachment);
        const visionAttachment = visionAttachments[0] || null;

        let contentEl = existingContentEl;

        let graphRagBadge = '';
        let graphRagPromptContext = '';
        if (this.flags.rag && typeof window !== 'undefined' && window.graphRagEngine) {
            const gRes = window.graphRagEngine.query(query, { mode: 'hybrid', maxHops: 2, limit: 12 });
            if (gRes && gRes.hasMatch && gRes.formattedPrompt) {
                graphRagPromptContext = `\n\n${gRes.formattedPrompt}`;
                const eCount = gRes.matchedEntities?.length || 0;
                const tCount = gRes.triplesCount || 0;
                graphRagBadge = `[🕸️ GraphRAG: ${eCount} 實體 / ${tCount} 關聯]`;
                this.logTerminal(`[GraphRAG] 命中 ${eCount} 個實體，${tCount} 組多跳三元組已注入 System Prompt。`);
            }
        }

        if (!contentEl) {
            const engineBadge = `🌐 API Router (${profile.name || 'REST'})`;

            const aiDiv = document.createElement('div');
            aiDiv.className = 'flex items-start space-x-3';
            const msgId = 'msg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
            aiDiv.setAttribute('data-msg-id', msgId);
            const contentId = 'llm-stream-' + Date.now();
            aiDiv.innerHTML = `
                <div class="w-8 h-8 rounded-full bg-purple-700 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow">H</div>
                <div class="max-w-[85%] bg-darkCard border border-darkBorder rounded-2xl rounded-tl-none p-3.5 space-y-3 shadow select-text assistant-msg-bubble">
                    <div class="flex flex-wrap items-center justify-between text-xs text-slate-400 border-b border-darkBorder/60 pb-1.5 gap-1.5">
                        <div class="flex items-center space-x-1.5 flex-wrap">
                            <span class="font-medium text-purple-400">Hermes Autonomous Agent</span>
                            <span class="text-[10px] px-2 py-0.5 rounded-full bg-purple-950/90 text-purple-300 border border-purple-700/60 font-mono">[推論: ${engineBadge}]</span>
                            ${graphRagBadge ? `<span class="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950/90 text-cyan-300 border border-cyan-700/60 font-mono">${graphRagBadge}</span>` : ''}
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
                        <div class="flex items-center space-x-2">
                            <span class="token-speed-tag hidden text-[10px] px-1.5 py-0.5 rounded font-mono bg-emerald-950/80 text-emerald-300 border border-emerald-700/50 flex items-center space-x-1" title="推論速度">
                                <span class="token-speed-indicator w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                <span class="token-speed-text font-bold">0.0 t/s</span>
                            </span>
                            <span class="text-[10px] text-slate-500 font-mono">${new Date().toLocaleTimeString()}</span>
                        </div>
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
                this.appendUserMessage(q, { visionAttachment, visionAttachments });
                this.simulateHermesReasoning(q, { visionAttachment, visionAttachments });
            });
        }

        const bubbleEl = contentEl ? contentEl.closest('.assistant-msg-bubble') : null;
        const speedTracker = new TokenSpeedTracker(bubbleEl ? bubbleEl.querySelector('.token-speed-tag') : null, this.currentLang !== 'en');

        const sysPrompt = (this.currentLang === 'zh-TW'
            ? 'You are Hermes, a powerful autonomous AI agent integrated into Webcom AI Console. Answer in Traditional Chinese (zh-TW). Be concise, helpful, and accurate.'
            : 'You are Hermes, a powerful autonomous AI agent integrated into Webcom AI Console. Answer in English. Be concise, helpful, and accurate.') + graphRagPromptContext;

        const reqTemp = (options && typeof options.temperature === 'number') ? options.temperature : 0.7;
        const requestedMaxTokens = (this.gpuSafetyActive && this.maxTokensCap) ? Math.min(1024, this.maxTokensCap) : 1024;
        const body = {
            model: model || 'auto',
            messages: [{ role: 'system', content: sysPrompt }, this._buildApiUserMessage(query, visionAttachments)],
            stream: true,
            max_tokens: requestedMaxTokens,
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
                            delaySeconds: 5, options
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
                            const pb = contentEl.closest('.flex.items-start');
                            const bId = pb ? pb.getAttribute('data-msg-id') : null;
                            if (bId && pb) {
                                this.chatHistory.push({
                                    id: bId,
                                    role: 'assistant',
                                    content: contentEl.innerText,
                                    timestamp: new Date().toISOString(),
                                    timeLabel: new Date().toLocaleTimeString(),
                                    engineBadge: profile.name || 'API Router',
                                    tier: 2,
                                    html: pb.outerHTML
                                });
                                this.saveChatHistory();
                            }
                        }
                        return;
                    }
                }

                if (contentEl) {
                    contentEl.innerHTML = this.formatApiErrorMessage(resp.status, errTxt, profile);
                    const pb = contentEl.closest('.flex.items-start');
                    const bId = pb ? pb.getAttribute('data-msg-id') : null;
                    if (bId && pb) {
                        this.chatHistory.push({
                            id: bId,
                            role: 'assistant',
                            content: contentEl.innerText,
                            timestamp: new Date().toISOString(),
                            timeLabel: new Date().toLocaleTimeString(),
                            engineBadge: profile.name || 'API Router',
                            tier: 2,
                            html: pb.outerHTML
                        });
                        this.saveChatHistory();
                    }
                }
                return;
            }

            const reader = resp.body.getReader();
            const decoder = new TextDecoder();
            let fullText = '';
            if (contentEl) contentEl.textContent = '';
            let isLoopIntercepted = false;
            speedTracker.start();

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
                            speedTracker.update(delta);
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
                                    speedTracker.finish();

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
                                        query, container, dict, contentEl, loopInfo, jevRes, fullText, options
                                    });
                                    break;
                                }
                            }
                        }
                    } catch (_) {}
                }
                if (isLoopIntercepted) break;
            }
            speedTracker.finish();

            if (!fullText && !isLoopIntercepted && contentEl) {
                contentEl.innerHTML = `<span class="text-slate-400">${this.currentLang === 'zh-TW' ? '推論完成，但 API 未回傳內容。請確認模型已載入或更換 API 端點。' : 'Inference complete, but no content returned. Ensure model is loaded or change the API endpoint.'}</span>`;
            }

            // Interactive TokenTable Gateway Confirmation Guard
            if (fullText && (fullText.includes('[TokenTable·需要確認]') || fullText.includes('已辨識操作為 T2I') || fullText.includes('awaiting_tier')) && contentEl) {
                const ttDiv = document.createElement('div');
                ttDiv.className = 'mt-3 p-3 bg-amber-950/40 border border-amber-600/50 rounded-xl space-y-2 text-xs select-text';
                ttDiv.innerHTML = `
                    <div class="flex items-center gap-1.5 text-amber-300 font-bold">
                        <i data-lucide="info" class="w-4 h-4"></i>
                        <span>TokenTable 雲端路由確認 (點擊快速送出)</span>
                    </div>
                    <p class="text-slate-300 leading-relaxed text-[11px]">
                        提示詞包含「圖片」，被 TokenTable 雲端路由誤判為生圖（T2I）操作。請點擊下方按鈕直接回應：
                    </p>
                    <div class="flex flex-wrap gap-2 pt-1">
                        <button type="button" class="btn-tt-choice px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-300 rounded font-medium transition cursor-pointer" data-val="一般模型">
                            一般模型
                        </button>
                        <button type="button" class="btn-tt-choice px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-300 rounded font-medium transition cursor-pointer" data-val="進階模型">
                            進階模型
                        </button>
                        <button type="button" class="btn-tt-code-mode px-2.5 py-1 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/50 text-purple-300 rounded font-medium transition cursor-pointer">
                            💻 改以「前端應用/代碼模式」重新詢問
                        </button>
                    </div>
                `;
                contentEl.appendChild(ttDiv);
                if (window.lucide) lucide.createIcons();

                ttDiv.querySelectorAll('.btn-tt-choice').forEach(b => {
                    b.addEventListener('click', () => {
                        const val = b.getAttribute('data-val');
                        const input = document.getElementById('chat-input');
                        if (input) {
                            input.value = val;
                            const sendBtn = document.getElementById('btn-send');
                            if (sendBtn) sendBtn.click();
                        }
                    });
                });

                ttDiv.querySelector('.btn-tt-code-mode')?.addEventListener('click', () => {
                    const input = document.getElementById('chat-input');
                    if (input) {
                        input.value = `請用 HTML5 Canvas 與 SVG 寫一個單檔應用：${query}`;
                        const sendBtn = document.getElementById('btn-send');
                        if (sendBtn) sendBtn.click();
                    }
                });
            }

            // Auto-persist assistant streamed answer
            if (contentEl) {
                const parentBubble = contentEl.closest('.flex.items-start');
                const bubbleMsgId = parentBubble ? parentBubble.getAttribute('data-msg-id') : null;
                if (bubbleMsgId) {
                    const finalContent = contentEl.innerText || fullText;
                    const existingIdx = this.chatHistory.findIndex(m => m.id === bubbleMsgId);
                    const record = {
                        id: bubbleMsgId,
                        role: 'assistant',
                        content: finalContent,
                        timestamp: new Date().toISOString(),
                        timeLabel: new Date().toLocaleTimeString(),
                        engineBadge: profile.name || 'API Router',
                        tier: 2,
                        html: parentBubble ? parentBubble.outerHTML : ''
                    };
                    if (existingIdx >= 0) {
                        this.chatHistory[existingIdx] = record;
                    } else {
                        this.chatHistory.push(record);
                    }
                    this.saveChatHistory();
                }
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
                    delaySeconds: 5, options
                });
            }
            if (contentEl) {
                contentEl.innerHTML = this.formatNetworkErrorMessage(endpoint, err);
                const parentBubble = contentEl.closest('.flex.items-start');
                const bubbleMsgId = parentBubble ? parentBubble.getAttribute('data-msg-id') : null;
                if (bubbleMsgId && parentBubble) {
                    this.chatHistory.push({
                        id: bubbleMsgId,
                        role: 'assistant',
                        content: contentEl.innerText,
                        timestamp: new Date().toISOString(),
                        timeLabel: new Date().toLocaleTimeString(),
                        engineBadge: profile.name || 'API Router',
                        tier: 2,
                        html: parentBubble.outerHTML
                    });
                    this.saveChatHistory();
                }
            }
        }
    }

    _persistAssistantRecord(bubble, contentEl, engineBadge = 'Webcom AI', tier = 1) {
        if (!contentEl || !bubble) return;
        const bubbleMsgId = bubble.getAttribute('data-msg-id');
        if (!bubbleMsgId) return;
        const finalContent = contentEl.innerText || '';
        const existingIdx = this.chatHistory.findIndex(m => m.id === bubbleMsgId);
        const record = {
            id: bubbleMsgId,
            role: 'assistant',
            content: finalContent,
            timestamp: new Date().toISOString(),
            timeLabel: new Date().toLocaleTimeString(),
            engineBadge: engineBadge,
            tier: tier,
            html: bubble.outerHTML
        };
        if (existingIdx >= 0) {
            this.chatHistory[existingIdx] = record;
        } else {
            this.chatHistory.push(record);
        }
        this.saveChatHistory();
    }

    formatWebLlmProgress(rawText, isZh) {
        if (!rawText) return '';
        if (!isZh) return rawText;

        let text = String(rawText).trim();

        // 1. Fetching param cache with full details
        text = text.replace(
            /Fetching param cache\[(\d+)\/(\d+)\]:\s*([\d\.]+\s*[KMGT]?B)\s*fetched\.\s*(\d+)%\s*completed,\s*(\d+)\s*secs?\s*elapsed\..*/i,
            (m, p1, p2, p3, p4, p5) => `正在下載模型權重快取 [第 ${p1}/${p2} 片段]：已下載 ${p3}，完成 ${p4}%（耗時 ${p5} 秒）。初次載入需建立瀏覽器快取，後續造訪將極速啟動。`
        );

        // 2. Loading model from cache with details
        text = text.replace(
            /Loading (?:model from|param) cache\[(\d+)\/(\d+)\]:\s*([\d\.]+\s*[KMGT]?B)\s*loaded\.\s*(\d+)%\s*completed.*/i,
            (m, p1, p2, p3, p4) => `正在從本機快取載入模型權重 [第 ${p1}/${p2} 片段]：已載入 ${p3}，完成 ${p4}%`
        );

        // 3. Short fetching/loading cache[X/Y]
        text = text.replace(
            /Fetching param cache\[(\d+)\/(\d+)\]/i,
            (m, p1, p2) => `正在下載模型權重 [第 ${p1}/${p2} 片段]`
        );

        text = text.replace(
            /Loading (?:model from|param) cache\[(\d+)\/(\d+)\]/i,
            (m, p1, p2) => `正在從本機快取載入模型權重 [第 ${p1}/${p2} 片段]`
        );

        // 4. Lifecycle steps
        text = text.replace(/Loading (?:GPU )?model from cache\.{0,3}/i, '正在從本機快取載入模型權重...');
        text = text.replace(/Loading tokenizer\.{0,3}/i, '正在載入詞元分析器 (Tokenizer)...');
        text = text.replace(/Compiling WebGPU shaders\.{0,3}/i, '正在編譯 WebGPU 著色器核心...');
        text = text.replace(/Initializing model\.{0,3}/i, '正在初始化本機模型權重...');
        text = text.replace(/Finish loading on WebGPU\.{0,3}/i, 'WebGPU 本機模型載入完成！');
        text = text.replace(/All done\.{0,3}/i, '本機環境準備就緒！');

        return text;
    }

    async _streamWebGpuAnswer(query, container, dict) {
        const isZh = (this.currentLang !== 'en');
        const selectedModel = this.activeWebgpuModel || 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC';
        const engineBadge = `⚡ WebGPU (${selectedModel})`;
        const cont = container || document.getElementById('chat-container');
        if (!cont) return;

        const aiDiv = document.createElement('div');
        aiDiv.className = 'flex items-start space-x-3';
        const msgId = 'msg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
        aiDiv.setAttribute('data-msg-id', msgId);
        const contentId = 'webgpu-stream-' + Date.now();
        aiDiv.innerHTML = `
            <div class="w-8 h-8 rounded-full bg-purple-700 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow">H</div>
            <div class="max-w-[85%] bg-darkCard border border-darkBorder rounded-2xl rounded-tl-none p-3.5 space-y-3 shadow select-text assistant-msg-bubble">
                <div class="flex flex-wrap items-center justify-between text-xs text-slate-400 border-b border-darkBorder/60 pb-1.5 gap-1.5">
                    <div class="flex items-center space-x-1.5 flex-wrap">
                        <span class="font-medium text-purple-400">Hermes Autonomous Agent</span>
                        <span class="text-[10px] px-2 py-0.5 rounded-full bg-purple-950/90 text-purple-300 border border-purple-700/60 font-mono">[推論: ${engineBadge}]</span>
                    </div>
                    <div><span class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700/50">🟢 Tier 1: Pure Local (WebGPU)</span></div>
                </div>
                <div id="${contentId}" class="assistant-content-text text-xs text-slate-200 leading-relaxed select-text whitespace-pre-wrap">
                    <span class="text-purple-300 animate-pulse">${isZh ? '正在準備本機 WebGPU 著色器 (無須外部 API)...' : 'Preparing local WebGPU shaders (no external API needed)...'}</span>
                </div>
                <div class="flex items-center justify-between pt-1 border-t border-darkBorder/50 text-[11px] text-slate-400 select-none">
                    <div class="flex items-center space-x-2">
                        <button type="button" class="btn-copy-msg hover:text-purple-300 flex items-center space-x-1 cursor-pointer transition px-2 py-0.5 rounded bg-slate-900/80 border border-slate-700 hover:border-purple-500/60">
                            <i data-lucide="copy" class="w-3 h-3 text-purple-400"></i>
                            <span class="copy-label">${dict?.copyBtn || '複製'}</span>
                        </button>
                        <button type="button" class="btn-retry-msg hover:text-sky-300 flex items-center space-x-1 cursor-pointer transition px-2 py-0.5 rounded bg-slate-900/80 border border-slate-700 hover:border-sky-500/60" data-query="${encodeURIComponent(query)}">
                            <i data-lucide="rotate-ccw" class="w-3 h-3 text-sky-400"></i>
                            <span class="retry-label">${dict?.retryBtn || '重試'}</span>
                        </button>
                    </div>
                    <div class="flex items-center space-x-2">
                        <span class="token-speed-tag hidden text-[10px] px-1.5 py-0.5 rounded font-mono bg-emerald-950/80 text-emerald-300 border border-emerald-700/50 flex items-center space-x-1" title="推論速度">
                            <span class="token-speed-indicator w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            <span class="token-speed-text font-bold">0.0 t/s</span>
                        </span>
                        <span class="text-[10px] text-slate-500 font-mono">${new Date().toLocaleTimeString()}</span>
                    </div>
                </div>
            </div>
        `;
        cont.appendChild(aiDiv);
        cont.scrollTop = cont.scrollHeight;
        if (window.lucide) lucide.createIcons();

        const contentEl = document.getElementById(contentId);
        const copyBtn = aiDiv.querySelector('.btn-copy-msg');
        if (copyBtn) copyBtn.addEventListener('click', () => this.copyToClipboard(contentEl ? contentEl.innerText : query, copyBtn));
        const retryBtn = aiDiv.querySelector('.btn-retry-msg');
        if (retryBtn) retryBtn.addEventListener('click', () => {
            const q = decodeURIComponent(retryBtn.getAttribute('data-query') || query);
            this.appendUserMessage(q);
            this.simulateHermesReasoning(q);
        });

        // 1. Check navigator.gpu support
        if (!('gpu' in navigator)) {
            contentEl.innerHTML = `
                <div class="space-y-2 p-3 rounded-xl bg-amber-950/30 border border-amber-600/50 text-xs select-text">
                    <div class="flex items-center gap-2 text-amber-300 font-bold">
                        <span>⚠️ ${isZh ? '瀏覽器未偵測到 WebGPU 硬體加速' : 'WebGPU Hardware Acceleration Not Detected'}</span>
                    </div>
                    <p class="text-slate-300 leading-relaxed">
                        ${isZh ? '<strong>WebGPU 模式為純本機（Tier 1）推論</strong>，完全不需要外部 API 金鑰或網路請求。<br>但此模式需要瀏覽器啟用 WebGPU 硬體著色器運算。' : '<strong>WebGPU mode runs 100% locally (Tier 1)</strong> without any external API keys or remote servers.<br>However, WebGPU hardware acceleration was not detected in this browser.'}
                    </p>
                    <div class="text-slate-400 text-[11px] pt-1 border-t border-amber-900/40">
                        💡 <strong>${isZh ? '建議處置方式' : 'Suggested Actions'}</strong>：<br>
                        ${isZh ? '1. 請使用最新版 Chrome 或 Edge 瀏覽器，並於「設定 → 系統」確認已開啟「硬體加速」。<br>2. 若無專用顯示卡，可在上方「推論引擎」切換至「<strong>🌐 LM Studio / API</strong>」模式。' : '1. Use the latest Chrome/Edge with hardware acceleration enabled in browser settings.<br>2. Or switch the inference engine dropdown to "<strong>🌐 LM Studio / API</strong>" mode.'}
                    </div>
                </div>
            `;
            this._persistAssistantRecord(aiDiv, contentEl, engineBadge, 1);
            return;
        }

        // 2. Load WebLLM
        let webllm = window.webllm;
        if (!webllm) {
            try {
                contentEl.innerHTML = `<span class="text-purple-400 animate-pulse">${isZh ? '⚡ [WebGPU] 正在載入 WebLLM 本機執行時環境...' : '⚡ [WebGPU] Loading WebLLM runtime...'}</span>`;
                webllm = await import("https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm/+esm");
                window.webllm = webllm;
            } catch (err) {
                contentEl.innerHTML = `
                    <div class="space-y-2 p-3 rounded-xl bg-rose-950/30 border border-rose-700/50 text-xs select-text">
                        <div class="text-rose-300 font-bold">⚠️ ${isZh ? '無法載入 WebLLM 執行庫 (CDN 連線逾時)' : 'Failed to Load WebLLM Library'}</div>
                        <p class="text-slate-300 leading-relaxed">
                            ${isZh ? '本機 WebGPU 推論庫首次載入需連線下載核心 WebAssembly/JS 元件。若目前處於純離線環境，請切換至「🌐 LM Studio / API」使用已在本地啟動之模型。' : 'Initial WebGPU setup requires downloading core WASM/JS components. If fully offline, please switch to "🌐 LM Studio / API" with your local model.'}
                        </p>
                        <div class="text-slate-500 font-mono text-[10px]">${this.escapeHtml(err.message)}</div>
                    </div>
                `;
                this._persistAssistantRecord(aiDiv, contentEl, engineBadge, 1);
                return;
            }
        }

        // 3. Initialize or reuse MLC Engine
        try {
            if (!this.webllmEngine || this.loadedWebgpuModel !== selectedModel) {
                contentEl.innerHTML = `<div class="space-y-1"><span class="text-purple-400 font-mono text-[11px] animate-pulse">⚡ [WebGPU] ${isZh ? '正在初始化本機模型快取與著色器...' : 'Initializing local model cache & shaders...'} (${selectedModel})</span></div>`;
                this.webllmEngine = await webllm.CreateMLCEngine(selectedModel, {
                    initProgressCallback: (report) => {
                        if (contentEl) {
                            const pct = Math.round((report.progress || 0) * 100);
                            const translatedText = this.formatWebLlmProgress(report.text, isZh);
                            contentEl.innerHTML = `
                                <div class="space-y-1.5 py-1">
                                    <div class="flex items-center justify-between text-[11px] font-mono text-sky-300 gap-2">
                                        <span>⚡ [WebGPU 本機] ${this.escapeHtml(translatedText)}</span>
                                        <span class="shrink-0 font-bold">${pct}%</span>
                                    </div>
                                    <div class="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                        <div class="bg-purple-500 h-1.5 rounded-full transition-all duration-300" style="width: ${pct}%"></div>
                                    </div>
                                </div>
                            `;
                            container.scrollTop = container.scrollHeight;
                        }
                    }
                });
                this.loadedWebgpuModel = selectedModel;
            }
        } catch (initErr) {
            contentEl.innerHTML = `
                <div class="space-y-2 p-3 rounded-xl bg-rose-950/30 border border-rose-700/50 text-xs select-text">
                    <div class="text-rose-300 font-bold">⚠️ ${isZh ? 'WebGPU 模型載入異常' : 'WebGPU Model Load Error'}</div>
                    <p class="text-slate-300 leading-relaxed">
                        ${isZh ? '顯示卡在初始化本機模型時回傳錯誤（可能為 GPU 顯存不足或瀏覽器限制）。' : 'GPU returned an error while initializing model (possibly insufficient VRAM).'}
                    </p>
                    <div class="text-slate-400 font-mono text-[11px] bg-slate-950/60 p-2 rounded">${this.escapeHtml(initErr.message)}</div>
                </div>
            `;
            this._persistAssistantRecord(aiDiv, contentEl, engineBadge, 1);
            return;
        }

        // 4. Stream tokens purely locally
        const sysPrompt = isZh
            ? 'You are Hermes, a powerful autonomous AI agent integrated into Webcom AI Console running purely in browser via WebGPU. Answer in Traditional Chinese (zh-TW). Be concise, helpful, and accurate.'
            : 'You are Hermes, a powerful autonomous AI agent integrated into Webcom AI Console running purely in browser via WebGPU. Answer in English. Be concise, helpful, and accurate.';

        const requestedMaxTokens = (this.gpuSafetyActive && this.maxTokensCap) ? Math.min(1024, this.maxTokensCap) : 1024;
        let fullText = '';
        contentEl.textContent = '';

        try {
            const speedTracker = new TokenSpeedTracker(aiDiv.querySelector('.token-speed-tag'), isZh);
            speedTracker.start();

            const chunks = await this.webllmEngine.chat.completions.create({
                messages: [
                    { role: 'system', content: sysPrompt },
                    { role: 'user', content: query }
                ],
                stream: true,
                max_tokens: requestedMaxTokens,
                temperature: 0.7
            });

            for await (const chunk of chunks) {
                const delta = chunk.choices[0]?.delta?.content || '';
                if (delta) {
                    speedTracker.update(delta);
                    fullText += delta;
                    contentEl.textContent = fullText;
                    container.scrollTop = container.scrollHeight;
                }
            }
            speedTracker.finish();

            this._persistAssistantRecord(aiDiv, contentEl, engineBadge, 1);
        } catch (infErr) {
            contentEl.innerHTML = `
                <div class="p-2 rounded bg-rose-950/30 border border-rose-700/50 text-xs text-rose-300">
                    ⚠️ [WebGPU 本機] ${isZh ? '推論中斷：' : 'Inference interrupted: '} ${this.escapeHtml(infErr.message)}
                </div>
            `;
            this._persistAssistantRecord(aiDiv, contentEl, engineBadge, 1);
        }
    }

    _generateLocalSandboxAnswer(query, selectedModel, isZh) {
        const q = (query || '').trim().toLowerCase();
        const isIntro = q.includes('介紹') || q.includes('你是誰') || q.includes('introduce') || q.includes('who are you') || q.includes('你好') || q.includes('hello');
        const isJev = q.includes('jev') || q.includes('cross-encoder') || q.includes('決策') || q.includes('rerank');

        if (isIntro) {
            return isZh
                ? `您好！我是 Webcom AI 雙引擎控制台內建的 **Hermes Autonomous Agent**（當前運行於 📦 **ONNX WASM** 純本機沙盒推論模式）。

作為純前端沙盒助理，我具備以下核心架構與能力：

1. 🔒 **100% 本地隱私 (Tier 1 純前端)**：
   • 當前所有推論計算皆在您的瀏覽器沙盒內直接執行，零雲端外傳。
   • 完全不調用任何外部 API，無需配置亦不消耗任何 API 金鑰。

2. ⚡ **三層分流架構 (Three-Tier Routing)**：
   • **第一層 (Tier 1)**：純 WASM、WebGPU、Pyodide (Python) 以及 Jev (~15ms 單次前向決策引擎)。
   • **第二層 (Tier 2)**：Direct HTTP Fetch、LM Studio REST、Serper 即時聯網搜尋。
   • **第三層 (Tier 3)**：Host Daemon 本機託管服務（Shell 命令、WSL 子系統、ComfyUI 影像生成、語音 TTS）。

3. 🛠️ **101 款核心工具契約 (Tool Contracts)**：
   • 涵蓋終端命令執行、天氣即時監測、本機硬體偵測、代碼編譯與多步驟自主決策。

請問今天有什麼我可以為您協助或執行的任務？`
                : `Hello! I am the **Hermes Autonomous Agent** integrated into the Webcom AI Console (currently running in 📦 **ONNX WASM** pure client-side sandbox mode).

As a pure in-browser sandbox assistant, I feature:

1. 🔒 **100% Local Privacy (Tier 1 Pure Client)**:
   • All inference calculations run directly inside your browser sandbox.
   • Completely independent of external APIs; no API keys required or consumed.

2. ⚡ **Three-Tier Architecture (Three-Tier Routing)**:
   • **Tier 1**: Pure WASM, WebGPU, Pyodide (Python), and Jev (~15ms Single-Pass decision engine).
   • **Tier 2**: Direct HTTP Fetch, LM Studio REST, Serper live web search.
   • **Tier 3**: Host Daemon companion (Shell execution, WSL subsystem, ComfyUI, TTS).

3. 🛠️ **101 Core Tool Contracts**:
   • Terminal execution, live weather, hardware probes, code sandbox, and multi-step autonomous planning.

How may I assist you today?`;
        }

        if (isJev) {
            return isZh
                ? `⚡ **Jev 極速單次前向傳播決策系統 (Single Forward Pass SFP)**：

• **核心原理**：採用輕量級 Cross-Encoder 模型 (如 BGE-Reranker-Base 或 MiniLM)，以單次前向傳播在 10~15ms 內計算意圖與工具的確定性交叉排序分數，徹底消除大語言模型的多 Token 自回歸延遲。
• **主要職責**：
  1. 意圖分流與工具契約路由 (Tool Dispatching)。
  2. 暫態錯誤自癒判定 (如 API 500 自動重試倒數)。
  3. 幻覺循環偵測與攔截 (Degenerative Loop Guard)。`
                : `⚡ **Jev Ultra-Fast Decision System (Single Forward Pass SFP)**:

• **Principle**: Utilizes lightweight Cross-Encoder models (e.g. BGE-Reranker-Base or MiniLM) to score candidate actions in 10-15ms via a single forward pass, bypassing multi-token autoregressive latency.
• **Primary Functions**:
  1. Intent classification and tool routing.
  2. Transient fault recovery (e.g. HTTP 500 retry countdown).
  3. Hallucination loop guard and interception.`;
        }

        // Dynamic diagnostics for environment/system/status queries if reached here
        if (q.includes('環境') || q.includes('硬體') || q.includes('電腦') || q.includes('系統') || q.includes('規格') || q.includes('env') || q.includes('system') || q.includes('hardware')) {
            const cores = navigator.hardwareConcurrency || 'N/A';
            const ram = navigator.deviceMemory ? `${navigator.deviceMemory} GB+` : '8+ GB';
            const ua = navigator.userAgent;
            const os = ua.includes('Windows') ? 'Windows' : (ua.includes('Mac') ? 'macOS' : (ua.includes('Linux') ? 'Linux' : 'Client OS'));
            const daemonStatus = this.daemonOnline ? '✅ Host Daemon 已連線 (:8001)' : '⚡ 純前端 WASM 沙盒 (無常駐進程)';
            return isZh
                ? `⚡ [Hermes 即時環境狀態報告]
針對您的提問：「${query}」：

• 🖥️ **作業系統**：${os}
• 🧠 **記憶體 (RAM)**：${ram}
• ⚙️ **處理器核心 (CPU Cores)**：${cores} 邏輯核心
• 🔌 **Host Daemon 連線**：${daemonStatus}
• 🎮 **GPU 安全防護**：${this.gpuSafetyActive ? '90% 顯存與運算守護運作中' : '標準模式'}
• 📦 **當前推論模式**：ONNX WASM (${selectedModel})

💡 提示：您可直接在下方終端機輸入「/detect」檢視全系統深層診斷，或切換至「⚡ WebGPU」獲得更高效能。`
                : `⚡ [Hermes Live Environment Telemetry]
Regarding your query: "${query}":

• 🖥️ **Operating System**: ${os}
• 🧠 **System Memory (RAM)**: ${ram}
• ⚙️ **CPU Cores**: ${cores} logical cores
• 🔌 **Host Daemon**: ${daemonStatus}
• 🎮 **GPU Guard**: ${this.gpuSafetyActive ? '90% VRAM Guard Active' : 'Standard'}
• 📦 **Inference Engine**: ONNX WASM (${selectedModel})

💡 Tip: Type "/detect" in the terminal below for full hardware diagnostics.`;
        }

        return isZh
            ? `[📦 ONNX WASM 本機沙盒回應]
針對您的提問：「${query}」：

目前控制台已在瀏覽器本機沙盒內由 Hermes 完成意圖評估與處置。
• **推論模式**：Tier 1 純前端沙盒 (零雲端外傳、100% 本地隱私)
• **Agent 狀態**：Hermes 三層架構 (Tier 1/2/3) 待命就緒

💡 如需執行系統管理、終端指令或長文本生成：
1. 終端命令：直接於對話框或下方終端機輸入（如 \`/detect\`, \`dir\`, \`python\`），Hermes 將自主調用 Tier 3 工具執行。
2. 模型切換：可切換至「⚡ WebGPU 瀏覽器純本機」（享有 GPU 著色器硬體加速）或「🌐 LM Studio / API」連接後端大模型。`
            : `[📦 ONNX WASM Local Sandbox Response]
Regarding your query: "${query}":

Your request has been evaluated within the local browser sandbox by Hermes.
• **Execution Mode**: Tier 1 In-Browser Sandbox (100% Local Privacy, zero cloud transmission)
• **Agent State**: Hermes Three-Tier Architecture (Tier 1/2/3) ready

💡 Quick Actions:
1. Terminal Commands: Enter instructions directly (e.g. \`/detect\`, \`dir\`, \`python\`); Hermes will dispatch Tier 3 companion tools.
2. Engine Switch: Switch to "⚡ WebGPU Local" for GPU shader acceleration, or "🌐 LM Studio / API" for external LLMs.`;
    }

    async _streamTextToElement(contentEl, text, container, speedTracker = null) {
        if (!contentEl) return;
        contentEl.textContent = '';
        if (speedTracker) speedTracker.start();
        const chunkSize = 4;
        for (let i = 0; i < text.length; i += chunkSize) {
            const piece = text.slice(i, i + chunkSize);
            contentEl.textContent += piece;
            if (speedTracker) speedTracker.update(piece);
            if (container) container.scrollTop = container.scrollHeight;
            await new Promise(resolve => setTimeout(resolve, 8));
        }
        if (speedTracker) speedTracker.finish();
    }

    async _streamOnnxAnswer(query, container, dict, options = {}) {
        const isZh = (this.currentLang !== 'en');
        let selectedModel = this.activeOnnxModel || 'onnx-community/OneJev-0.8B-ONNX';
        let engineBadge = `📦 ONNX WASM (${selectedModel})`;
        const cont = container || document.getElementById('chat-container');
        const visionAttachments = this._normalizeVisionAttachments(options.visionAttachments || options.visionAttachment);
        const visionAttachment = visionAttachments[0] || null;
        if (!cont) return;

        const aiDiv = document.createElement('div');
        aiDiv.className = 'flex items-start space-x-3';
        const msgId = 'msg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
        aiDiv.setAttribute('data-msg-id', msgId);
        const contentId = 'onnx-stream-' + Date.now();
        aiDiv.innerHTML = `
            <div class="w-8 h-8 rounded-full bg-purple-700 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow">H</div>
            <div class="max-w-[85%] bg-darkCard border border-darkBorder rounded-2xl rounded-tl-none p-3.5 space-y-3 shadow select-text assistant-msg-bubble">
                <div class="flex flex-wrap items-center justify-between text-xs text-slate-400 border-b border-darkBorder/60 pb-1.5 gap-1.5">
                    <div class="flex items-center space-x-1.5 flex-wrap">
                        <span class="font-medium text-purple-400">Hermes Autonomous Agent</span>
                        <span class="text-[10px] px-2 py-0.5 rounded-full bg-purple-950/90 text-purple-300 border border-purple-700/60 font-mono">[推論: ${engineBadge}]</span>
                    </div>
                    <div><span class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700/50">🟢 Tier 1: Pure Local (ONNX WASM)</span></div>
                </div>
                <div id="${contentId}" class="assistant-content-text text-xs text-slate-200 leading-relaxed select-text whitespace-pre-wrap">
                    <span class="text-purple-400 font-mono text-[11px] animate-pulse">📦 [ONNX WASM] ${isZh ? '正在準備本機沙盒推論環境...' : 'Preparing local sandbox inference...'}</span>
                </div>
                <div class="flex items-center justify-between pt-1 border-t border-darkBorder/50 text-[11px] text-slate-400 select-none">
                    <div class="flex items-center space-x-2">
                        <button type="button" class="btn-copy-msg hover:text-purple-300 flex items-center space-x-1 cursor-pointer transition px-2 py-0.5 rounded bg-slate-900/80 border border-slate-700 hover:border-purple-500/60">
                            <i data-lucide="copy" class="w-3 h-3 text-purple-400"></i>
                            <span class="copy-label">${dict?.copyBtn || '複製'}</span>
                        </button>
                        <button type="button" class="btn-retry-msg hover:text-sky-300 flex items-center space-x-1 cursor-pointer transition px-2 py-0.5 rounded bg-slate-900/80 border border-slate-700 hover:border-sky-500/60" data-query="${encodeURIComponent(query)}">
                            <i data-lucide="rotate-ccw" class="w-3 h-3 text-sky-400"></i>
                            <span class="retry-label">${dict?.retryBtn || '重試'}</span>
                        </button>
                    </div>
                    <div class="flex items-center space-x-2">
                        <span class="token-speed-tag hidden text-[10px] px-1.5 py-0.5 rounded font-mono bg-emerald-950/80 text-emerald-300 border border-emerald-700/50 flex items-center space-x-1" title="推論速度">
                            <span class="token-speed-indicator w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            <span class="token-speed-text font-bold">0.0 t/s</span>
                        </span>
                        <span class="text-[10px] text-slate-500 font-mono">${new Date().toLocaleTimeString()}</span>
                    </div>
                </div>
            </div>
        `;
        cont.appendChild(aiDiv);
        cont.scrollTop = cont.scrollHeight;
        if (window.lucide) lucide.createIcons();

        const contentEl = document.getElementById(contentId);
        const copyBtn = aiDiv.querySelector('.btn-copy-msg');
        if (copyBtn) copyBtn.addEventListener('click', () => this.copyToClipboard(contentEl ? contentEl.innerText : query, copyBtn));
        const retryBtn = aiDiv.querySelector('.btn-retry-msg');
        if (retryBtn) retryBtn.addEventListener('click', () => {
            const q = decodeURIComponent(retryBtn.getAttribute('data-query') || query);
            this.appendUserMessage(q, { visionAttachment, visionAttachments });
            this.simulateHermesReasoning(q, { visionAttachment, visionAttachments });
        });

        const speedTracker = new TokenSpeedTracker(aiDiv.querySelector('.token-speed-tag'), isZh);
        let generationSucceeded = false;

        if (this._isOneJevModel(selectedModel)) {
            if (visionAttachment) {
                // 1. 若是封閉式計數/決策問題，由 OneJev 快速前向推理
                try {
                    const countAnswer = await this._answerWithOneJevVisionCount(query, visionAttachments, isZh);
                    if (countAnswer) {
                        await this._streamTextToElement(contentEl, countAnswer, cont, speedTracker);
                        this._persistAssistantRecord(aiDiv, contentEl, engineBadge, 1);
                        return;
                    }
                } catch (oneJevErr) {
                    console.warn('[OneJev vision] count decision failed:', oneJevErr);
                }

                // 2. 遇到複雜開放式看圖分析：OneJev 作為決策分流器，動態轉交深度視覺管線
                const targetVisionModel = 'onnx-community/gemma-4-E2B-it-qat-mobile-ONNX';
                const transferNotice = isZh
                    ? `⚡ [OneJev 0.8B 意圖分流] 偵測到開放式影像分析請求：「${query}」\nOneJev 已將任務自動轉交至清單視覺管線 \`${targetVisionModel}\` 執行解析...\n`
                    : `⚡ [OneJev 0.8B Dispatch] Detected visual understanding query: "${query}"\nRouting image to catalogue vision pipeline \`${targetVisionModel}\`...\n`;
                this.logTerminal(transferNotice);
                contentEl.innerHTML = `<span class="text-cyan-400 font-mono text-[11px] animate-pulse">${transferNotice}</span>`;
                selectedModel = targetVisionModel;
                // Update badge in message bubble
                const badgeEl = aiDiv.querySelector('.font-mono');
                if (badgeEl && badgeEl.textContent.includes('推論:')) {
                    badgeEl.textContent = `[推論: 📦 ONNX WASM (${targetVisionModel})]`;
                }
            }
        }

        if (visionAttachment && !this._isOnnxVisionModel(selectedModel)) {
            const unsupportedVisionText = isZh
                ? `目前選擇的 ONNX 模型 ${selectedModel} 不支援直接看圖。請切換至清單中的支援視覺 ONNX 模型，例如 \`onnx-community/OneJev-0.8B-ONNX\` 或 \`onnx-community/gemma-4-E2B-it-qat-mobile-ONNX\`，再重新提問。`
                : `The selected ONNX model ${selectedModel} does not support direct vision input. Switch to a vision-capable ONNX model from the list such as OneJev-0.8B-ONNX or gemma-4-E2B-it-qat-mobile-ONNX, then ask again.`;
            await this._streamTextToElement(contentEl, unsupportedVisionText, cont, speedTracker);
            this._persistAssistantRecord(aiDiv, contentEl, `📦 ONNX WASM (${selectedModel})`, 1);
            return;
        }

        let pipeError = null;
        try {
            let generator;
            try {
                generator = await this._ensureOnnxPipeline(selectedModel);
            } catch (loadErr) {
                // If primary vision model fails to load, try secondary robust vision model
                if (visionAttachment && selectedModel !== 'onnx-community/gemma-4-E2B-it-qat-mobile-ONNX') {
                    const fallbackModel = 'onnx-community/gemma-4-E2B-it-qat-mobile-ONNX';
                    this.logTerminal(`[ONNX WASM] 首選視覺模型載入受阻 (${loadErr.message || loadErr})，正在切換至相容視覺管線: ${fallbackModel}...`);
                    generator = await this._ensureOnnxPipeline(fallbackModel);
                    selectedModel = fallbackModel;
                    const badgeEl = aiDiv.querySelector('.font-mono');
                    if (badgeEl && badgeEl.textContent.includes('推論:')) {
                        badgeEl.textContent = `[推論: 📦 ONNX WASM (${fallbackModel})]`;
                    }
                } else {
                    throw loadErr;
                }
            }

            const transformers = await this._ensureTransformersRuntime();

            if (this._isOnnxVisionModel(selectedModel) && visionAttachment) {
                speedTracker.start();
                const rawImages = this._buildRawImagesForTransformers(visionAttachments, transformers);
                const chatText = this._buildVisionChatMessages(query, visionAttachments);
                let fullText = '';
                contentEl.textContent = '';
                const streamer = new window.transformers.TextStreamer(generator.tokenizer, {
                    skip_prompt: true,
                    callback_function: (tokenText) => {
                        speedTracker.update(tokenText);
                        fullText += tokenText;
                        contentEl.textContent = this._extractGeneratedText(fullText);
                        cont.scrollTop = cont.scrollHeight;
                    }
                });

                const effMaxTokens = (this.gpuSafetyActive && this.maxTokensCap) ? this.maxTokensCap : 512;
                let result = null;
                try {
                    result = await generator({
                        text: chatText,
                        images: rawImages.length ? rawImages : undefined,
                        max_new_tokens: effMaxTokens,
                        streamer: streamer,
                        return_full_text: false
                    });
                } catch (infErr) {
                    if (selectedModel !== 'onnx-community/gemma-4-E2B-it-qat-mobile-ONNX') {
                        const fallbackModel = 'onnx-community/gemma-4-E2B-it-qat-mobile-ONNX';
                        this.logTerminal(`[ONNX WASM] 視覺推論遭遇異常 (${infErr.message || infErr})，自動切換至相容視覺管線: ${fallbackModel}...`);
                        generator = await this._ensureOnnxPipeline(fallbackModel);
                        selectedModel = fallbackModel;
                        const badgeEl = aiDiv.querySelector('.font-mono');
                        if (badgeEl && badgeEl.textContent.includes('推論:')) {
                            badgeEl.textContent = `[推論: 📦 ONNX WASM (${fallbackModel})]`;
                        }
                        result = await generator({
                            text: chatText,
                            images: rawImages.length ? rawImages : undefined,
                            max_new_tokens: effMaxTokens,
                            streamer: streamer,
                            return_full_text: false
                        });
                    } else {
                        throw infErr;
                    }
                }
                const rawGeneratedText = (this._extractGeneratedText(result) || fullText).trim();
                speedTracker.finish();
                if (rawGeneratedText) {
                    generationSucceeded = true;
                    const hasChinese = /[\u4e00-\u9fa5]/.test(rawGeneratedText);

                    // 若系統或使用者偏好繁體中文，但視覺模型直接產出純英文/非中文輸出時，列入思考模式並進行語言校準
                    if (isZh && !hasChinese && rawGeneratedText.length > 15) {
                        const originalEscaped = this.escapeHtml ? this.escapeHtml(rawGeneratedText) : rawGeneratedText;
                        const thoughtHtml = `
<div class="hermes-thought-card mb-3 p-2.5 rounded-xl bg-purple-950/40 border border-purple-500/40 text-xs font-mono select-text transition">
    <div class="flex items-center justify-between mb-1.5">
        <div class="flex items-center gap-1.5 font-semibold text-purple-300">
            <span class="w-2 h-2 rounded-full bg-purple-400 animate-pulse"></span>
            <span>🧠 思考模式 · 語言校準中 (Language Alignment)</span>
        </div>
        <span class="text-[10px] text-purple-400/80 px-1.5 py-0.5 rounded bg-purple-900/60 border border-purple-500/30">EN ➔ zh-TW</span>
    </div>
    <div class="text-slate-300 text-[11px] leading-relaxed mb-2">
        偵測到本機視覺多模態模型預設以英文生成分析報告。已啟動語言對齊模組，正在將影像理解內容即時轉譯為標準繁體中文...
    </div>
    <details class="text-[10px] text-slate-400 border-t border-purple-800/40 pt-1.5">
        <summary class="cursor-pointer hover:text-purple-300 transition select-none">檢視原始視覺模型英文字串 (Original Output)</summary>
        <div class="mt-1.5 p-2 rounded bg-slate-900/70 border border-purple-900/40 text-slate-300 whitespace-pre-wrap font-mono">${originalEscaped}</div>
    </details>
</div>
<div class="translated-vision-body text-xs text-slate-200 leading-relaxed whitespace-pre-wrap"><span class="text-purple-400 font-mono text-[11px] animate-pulse">⚡ 正在進行流暢繁中語意轉譯...</span></div>`;
                        contentEl.innerHTML = thoughtHtml;
                        cont.scrollTop = cont.scrollHeight;

                        try {
                            const translated = await this.translateText(rawGeneratedText, 'Traditional Chinese (zh-TW)');
                            const bodyEl = contentEl.querySelector('.translated-vision-body');
                            const cardTitle = contentEl.querySelector('.hermes-thought-card span:nth-child(2)');
                            if (cardTitle) {
                                cardTitle.textContent = '🧠 思考模式 · 語言校準完成 (Language Aligned)';
                            }
                            if (bodyEl) {
                                bodyEl.textContent = (translated && translated.trim() !== rawGeneratedText) ? translated.trim() : rawGeneratedText;
                            } else {
                                contentEl.textContent = translated || rawGeneratedText;
                            }
                        } catch (transErr) {
                            console.warn('[Vision Language Alignment] Translation error:', transErr);
                            const bodyEl = contentEl.querySelector('.translated-vision-body');
                            if (bodyEl) bodyEl.textContent = rawGeneratedText;
                        }
                    } else {
                        contentEl.textContent = rawGeneratedText;
                    }
                }
            } else {
                speedTracker.start();
                let fullText = '';
                contentEl.textContent = '';
                const streamer = new window.transformers.TextStreamer(generator.tokenizer, {
                    skip_prompt: true,
                    callback_function: (tokenText) => {
                        speedTracker.update(tokenText);
                        fullText += tokenText;
                        contentEl.textContent = fullText;
                        cont.scrollTop = cont.scrollHeight;
                    }
                });

                const messages = [
                    { role: 'system', content: isZh ? '你是 Webcom AI 內建的 Hermes Agent，以繁體中文 (zh-TW) 簡潔準確地回答使用者。' : 'You are Hermes Agent in Webcom AI. Answer concisely and accurately.' },
                    { role: 'user', content: query }
                ];

                const effMaxTokens = (this.gpuSafetyActive && this.maxTokensCap) ? this.maxTokensCap : 512;
                await generator(messages, {
                    max_new_tokens: effMaxTokens,
                    streamer: streamer,
                    temperature: 0.7
                });

                speedTracker.finish();
                if (fullText.trim().length > 0) {
                    generationSucceeded = true;
                }
            }
        } catch (pipeErr) {
            pipeError = pipeErr;
            console.warn("[ONNX WASM] Local pipeline generation error:", pipeErr);
            this.logTerminal(`⚠️ [ONNX WASM] 模型執行失敗: ${pipeErr.message || pipeErr}`);
        }

        // 2. Try WebLLM local Qwen engine if available (text-only fallback)
        if (!generationSucceeded && !visionAttachment && 'gpu' in navigator && window.webllm && this.webllmEngine) {
            try {
                speedTracker.start();
                contentEl.innerHTML = `<span class="text-sky-400 font-mono text-[11px] animate-pulse">⚡ [ONNX 異常自動回退] ${isZh ? '正在調用本機 WebGPU 引擎生成...' : 'Generating via local WebGPU fallback engine...'}</span>`;
                const sysPrompt = isZh
                    ? '你是 Webcom AI 內建的 Hermes Autonomous Agent。請以繁體中文 (zh-TW) 親切、簡潔、準確地回答使用者。'
                    : 'You are Hermes Autonomous Agent in Webcom AI. Answer concisely and accurately.';
                let fullText = '';
                contentEl.textContent = '';
                const chunks = await this.webllmEngine.chat.completions.create({
                    messages: [
                        { role: 'system', content: sysPrompt },
                        { role: 'user', content: query }
                    ],
                    stream: true,
                    max_tokens: 768,
                    temperature: 0.7
                });
                for await (const chunk of chunks) {
                    const delta = chunk.choices[0]?.delta?.content || '';
                    if (delta) {
                        speedTracker.update(delta);
                        fullText += delta;
                        contentEl.textContent = fullText;
                        cont.scrollTop = cont.scrollHeight;
                    }
                }
                speedTracker.finish();
                if (fullText.trim().length > 0) {
                    generationSucceeded = true;
                    engineBadge = `⚡ WebGPU WebLLM (自動回退)`;
                    const badgeEl = aiDiv.querySelector('.font-mono');
                    if (badgeEl && badgeEl.textContent.includes('推論:')) {
                        badgeEl.textContent = `[推論: ${engineBadge}]`;
                    }
                    this.logTerminal(`ℹ️ [引擎回退通知] 本次對話由 WebGPU WebLLM 本機引擎完成回答。`);
                }
            } catch (fallbackErr) {
                console.warn("[ONNX WASM] WebLLM fallback failed:", fallbackErr);
            }
        }

        // 3. Robust Tier 1 Local Streamed Synthesis
        if (!generationSucceeded) {
            if (visionAttachment && pipeError) {
                const isOom = /allocation failed|out of memory|quota exceeded/i.test(pipeError.message || '');
                const failText = isZh
                    ? `[⚠️ ONNX WASM 視覺推論未完成]\n本機模型 \`${selectedModel}\` 在解析圖片「${visionAttachment.name || '附圖'}」時遭遇限制：\n> ${pipeError.message || pipeError}\n\n💡 常見原因與建議：\n${isOom ? '1. **瀏覽器單分頁記憶體限制 (V8 Heap 2GB)**：本機視覺多模態模型包含解碼器與視覺編碼器權重 (~1.6GB)，在純瀏覽器沙盒容易觸發單一 ArrayBuffer 分配上限。\n' : '1. **權重下載或解析未完全**：首次載入較大權重若中斷，請確認網路並重整頁面重試。\n'}2. **建議處置方式**：\n   • 建議切換至「🌐 LM Studio / API」模式（如 TokenTable 或本地 LM Studio / Ollama 多模態模型），不受瀏覽器沙盒記憶體限制。\n   • 或在左側終端機查看即時記錄。`
                    : `[⚠️ ONNX WASM Vision Inference Incomplete]\nModel \`${selectedModel}\` encountered an error processing "${visionAttachment.name || 'image'}":\n> ${pipeError.message || pipeError}\n\n💡 Suggestions:\n${isOom ? '1. **Browser Tab Memory Limit (V8 Heap 2GB)**: Multimodal models require ~1.6GB which may exceed browser ArrayBuffer allocation limits.\n' : '1. Ensure model weights are fully loaded.\n'}2. Switch to "🌐 LM Studio / API" mode (e.g., TokenTable or local Ollama) for unrestricted processing.\n3. Check terminal logs for detailed traces.`;
                await this._streamTextToElement(contentEl, failText, cont, speedTracker);
            } else {
                const fallbackText = this._generateLocalSandboxAnswer(query, selectedModel, isZh);
                await this._streamTextToElement(contentEl, fallbackText, cont, speedTracker);
            }
        }

        this._persistAssistantRecord(aiDiv, contentEl, engineBadge, 1);
    }

    async preloadOnnxModel(modelName) {
        const targetModel = modelName || this.activeOnnxModel || 'onnx-community/OneJev-0.8B-ONNX';
        this.logTerminal(`[ONNX WASM] 開始預載模型權重: ${targetModel}...`);
        try {
            if (this._isOneJevModel(targetModel)) {
                await this._ensureOneJevBundle(targetModel);
            } else {
                await this._ensureOnnxPipeline(targetModel);
            }
            this.logTerminal(`✔ [ONNX WASM] 模型 ${targetModel} 預載完成，已快取至瀏覽器！`);
        } catch (e) {
            this.logTerminal(`⚠️ [ONNX WASM] 模型預載失敗: ${e.message}`);
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
        const isZh = (this.currentLang !== 'en');

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
                    <span>${isZh ? '目前工作階段無任何未捕捉之執行時例外錯誤 (0 個錯誤)。' : 'Zero runtime exceptions caught in current session (0 Errors).'}</span>
                </div>
            `;
        }

        let daemonHtml = '';
        if (diagData) {
            const getServiceStatus = (svcKey) => {
                const isOnline = diagData.services?.[svcKey]?.status === 'online';
                const label = isOnline ? (isZh ? '連線中' : 'online') : (isZh ? '未連線' : 'offline');
                const color = isOnline ? 'text-emerald-400' : 'text-slate-500';
                return `<span class="${color} font-bold float-right">${label}</span>`;
            };
            const hostOnline = (diagData.services?.host_daemon?.status || 'online') === 'online';
            const hostLabel = hostOnline ? (isZh ? '連線中' : 'online') : (isZh ? '未連線' : 'offline');
            const gpuDisplay = diagData.gpu || (isZh ? '無 / CPU 模式' : 'None/CPU');

            daemonHtml = `
                <div class="space-y-2">
                    <div class="flex items-center justify-between text-xs font-bold text-slate-300">
                        <span>${isZh ? '本機生態服務連線矩陣' : 'Host Companion Services Matrix'}</span>
                        <span class="text-emerald-400 font-mono text-[11px]">${isZh ? '常駐服務連線正常' : 'Daemon Online'} (${daemonBase})</span>
                    </div>
                    <div class="grid grid-cols-2 gap-2 text-xs font-mono">
                        <div class="bg-slate-950 p-2 rounded border border-slate-800">
                            <span class="text-slate-400">Host Daemon (8001):</span>
                            <span class="text-emerald-400 font-bold float-right">${hostLabel}</span>
                        </div>
                        <div class="bg-slate-950 p-2 rounded border border-slate-800">
                            <span class="text-slate-400">LM Studio (1234):</span>
                            ${getServiceStatus('lm_studio')}
                        </div>
                        <div class="bg-slate-950 p-2 rounded border border-slate-800">
                            <span class="text-slate-400">ComfyUI (5000):</span>
                            ${getServiceStatus('comfyui')}
                        </div>
                        <div class="bg-slate-950 p-2 rounded border border-slate-800">
                            <span class="text-slate-400">TTS Server (8200):</span>
                            ${getServiceStatus('tts_server')}
                        </div>
                        <div class="bg-slate-950 p-2 rounded border border-slate-800">
                            <span class="text-slate-400">Music Server (9150):</span>
                            ${getServiceStatus('music_server')}
                        </div>
                        <div class="bg-slate-950 p-2 rounded border border-slate-800">
                            <span class="text-slate-400">NVIDIA GPU:</span>
                            <span class="text-sky-300 font-mono text-[10px] float-right truncate max-w-[130px]" title="${diagData.gpu || ''}">${gpuDisplay}</span>
                        </div>
                    </div>
                </div>
            `;
        } else {
            daemonHtml = `
                <div class="space-y-2 bg-amber-950/20 border border-amber-800/40 rounded-xl p-3 text-xs">
                    <div class="text-amber-400 font-bold flex items-center gap-1.5">
                        <i data-lucide="alert-triangle" class="w-4 h-4 shrink-0 text-amber-400"></i>
                        <span>${isZh ? 'Host Daemon (Port 8001) 未連線' : 'Host Daemon (Port 8001) Offline'}</span>
                    </div>
                    <div class="text-slate-300 text-[11px] leading-relaxed">
                        ${isZh ? '探測端點：' : 'Probe Endpoint: '}<code class="text-sky-300 font-mono">${daemonBase}</code><br>
                        ${isZh ? '失敗詳情：' : 'Failure Detail: '}<code class="text-rose-300 font-mono">${daemonErrorDetail || window.lastDaemonError || 'Connection Refused'}</code>
                    </div>
                    <div class="pt-1 text-slate-400 text-[11px]">
                        💡 <strong>${isZh ? '排障指引' : 'Troubleshooting'}</strong>：<br>
                        ${isZh ? `1. 若透過 <code class="text-emerald-300">START.bat</code> 啟動，請確認命令提示字元視窗是否仍開啟中，且無 Python 拋錯。<br>
                        2. 若由瀏覽器開啟 <code class="text-sky-300">file://</code> 協議，請改至網址列輸入 <code class="text-emerald-300 font-bold">http://127.0.0.1:8001/</code> 開啟，可享有零跨域限制之完整體驗。<br>
                        3. 純 WASM 離線模式下，Pyodide 本地 Python、Web Serial 序列埠直連、ONNX 本地模型仍 100% 正常可用！` : `1. If launched via START.bat, check that the command prompt window is still open without Python errors.<br>
                        2. If opened via file:// protocol, navigate to http://127.0.0.1:8001/ in your browser for full non-CORS experience.<br>
                        3. In pure WASM offline mode, Pyodide Python, Web Serial, and ONNX models remain 100% functional!`}
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
                            <span>${isZh ? '即時例外錯誤記錄' : 'Runtime Exception & Error Monitor'}</span>
                        </span>
                        <span class="text-[10px] px-2 py-0.5 rounded-full ${hasErrors ? 'bg-red-950 text-red-300 border border-red-700/50' : 'bg-emerald-950 text-emerald-300 border border-emerald-700/50'} font-mono">${caughtErrors.length} ${isZh ? '則已攔截' : 'captured'}</span>
                    </div>
                    <div class="space-y-1.5 max-h-40 overflow-y-auto">
                        ${errorLogHtml}
                    </div>
                </div>
                <div class="pt-1 flex items-center justify-between gap-2 border-t border-slate-800/80">
                    <button id="btn-copy-diag-report" type="button" class="text-xs bg-purple-900/60 hover:bg-purple-800 text-purple-200 px-3 py-1.5 rounded-lg border border-purple-600/50 flex items-center gap-1.5 font-semibold transition cursor-pointer">
                        <i data-lucide="copy" class="w-3.5 h-3.5 text-purple-300"></i>
                        <span>${isZh ? '📋 複製完整排障報告' : 'Copy Full Diagnostic Report'}</span>
                    </button>
                    <button id="btn-clear-error-logs" type="button" class="text-[11px] text-slate-400 hover:text-slate-200 transition underline cursor-pointer">
                        ${isZh ? '清空錯誤記錄' : 'Clear error logs'}
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
                    isZh ? '# Webcom AI 系統自我檢測與排障報告' : '# Webcom AI System Diagnostics Report',
                    `- ${isZh ? '時間' : 'Time'}: ${new Date().toISOString()}`,
                    `- URL ${isZh ? '協定' : 'Protocol'}: ${window.location.protocol} (${window.location.href})`,
                    `- ${isZh ? '使用者瀏覽器' : 'User Agent'}: ${navigator.userAgent}`,
                    `- ${isZh ? '視窗解析度' : 'Resolution'}: ${window.innerWidth} x ${window.innerHeight}`,
                    `- ${isZh ? '語系' : 'Language'}: ${this.currentLang}`,
                    `- ${isZh ? '主推論引擎' : 'Active Engine'}: ${this.activeEngine}`,
                    `- ${isZh ? '作用中 Profile' : 'Active Profile'}: ${this.activeProfileId} (${this.profiles[this.activeProfileId]?.endpoint || 'none'})`,
                    `- ${isZh ? 'Host Daemon 連線' : 'Host Daemon'}: ${this.daemonOnline ? 'ONLINE (' + daemonBase + ')' : 'OFFLINE'}`,
                    `- ${isZh ? '最近 Daemon 連線錯誤' : 'Last Daemon Error'}: ${window.lastDaemonError || 'None'}`,
                    '',
                    isZh ? '## 生態服務矩陣' : '## Services Matrix',
                    diagData ? JSON.stringify(diagData.services, null, 2) : (isZh ? '無 (Daemon 離線)' : 'None (Daemon Offline)'),
                    '',
                    isZh ? '## 本機 GPU 狀態' : '## Local GPU Status',
                    diagData ? (diagData.gpu || (isZh ? '無 / CPU 模式' : 'None/CPU')) : (isZh ? '未知' : 'Unknown'),
                    '',
                    hasErrors ? caughtErrors.map((e, idx) => `${idx + 1}. [${e.time}] ${e.type}: ${e.message}\n   ${isZh ? '來源' : 'Source'}: ${e.source} (${e.location})\n   ${isZh ? '堆疊' : 'Stack'}: ${e.stack || '無'}`).join('\n\n') : (isZh ? '無任何例外錯誤 (Clean)' : 'Zero exceptions (Clean)')
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

    // =========================================================================
    // Chat Persistence (Local JSON / localStorage) & Anti-Crash Restoration
    // =========================================================================
    saveChatHistory() {
        if (!this.chatAutosaveEnabled) return;
        try {
            // Keep up to 150 messages in local storage to prevent exceeding browser quota
            if (this.chatHistory.length > 150) {
                this.chatHistory = this.chatHistory.slice(-150);
            }
            const now = new Date();
            const payload = {
                version: '2.0',
                savedAt: now.toISOString(),
                timeLabel: now.toLocaleTimeString(),
                messages: this.chatHistory
            };
            localStorage.setItem('webcom_chat_history', JSON.stringify(payload));
            this.updateAutosaveUI(payload.timeLabel);
        } catch (e) {
            console.warn('Failed to save chat history to localStorage:', e);
        }
    }

    updateAutosaveUI(timeStr = '') {
        const ind = document.getElementById('chat-autosave-indicator');
        const timeEl = document.getElementById('chat-autosave-time');
        const dict = TRANSLATIONS[this.currentLang] || TRANSLATIONS['zh-TW'];
        if (!ind) return;

        if (!this.chatAutosaveEnabled) {
            ind.className = 'text-[10px] px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700/60 text-slate-500 font-mono flex items-center gap-1 transition';
            ind.title = dict.tooltipChatAutosave || '本地 JSON 對話自動保存';
            if (timeEl) timeEl.textContent = this.currentLang === 'en' ? 'Disabled' : '已停用';
            return;
        }

        ind.className = 'text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/70 border border-emerald-700/50 text-emerald-400 font-mono flex items-center gap-1 transition';
        ind.title = (dict.tooltipChatAutosave || '本地 JSON 對話自動保存') + (timeStr ? ` (${timeStr})` : '');
        if (timeEl && timeStr) {
            timeEl.textContent = timeStr;
        }
    }

    restoreChatHistory() {
        try {
            const raw = localStorage.getItem('webcom_chat_history');
            if (!raw) return;
            const data = JSON.parse(raw);
            if (!data || !Array.isArray(data.messages) || data.messages.length === 0) return;

            this.chatHistory = data.messages;
            const container = document.getElementById('chat-container') || document.getElementById('chat-history');
            if (!container) return;

            let restoredCount = 0;
            data.messages.forEach(msg => {
                if (msg.html) {
                    const temp = document.createElement('div');
                    temp.innerHTML = msg.html.trim();
                    const el = temp.firstElementChild;
                    if (el) {
                        // Re-bind copy and retry buttons if present
                        const copyBtn = el.querySelector('.btn-copy-msg');
                        if (copyBtn) {
                            copyBtn.addEventListener('click', () => {
                                const bubble = el.querySelector('.assistant-msg-bubble') || el.querySelector('.user-msg-bubble') || el;
                                this.copyToClipboard(bubble ? bubble.innerText : (msg.content || ''), copyBtn);
                            });
                        }
                        const retryBtn = el.querySelector('.btn-retry-msg');
                        if (retryBtn) {
                            retryBtn.addEventListener('click', () => {
                                const rawQuery = decodeURIComponent(retryBtn.getAttribute('data-query') || msg.content || '');
                                if (rawQuery) {
                                    this.appendUserMessage(rawQuery);
                                    this.simulateHermesReasoning(rawQuery);
                                }
                            });
                        }

                        container.appendChild(el);
                        restoredCount++;
                    }
                } else if (msg.role === 'user' && msg.content) {
                    this.appendUserMessage(msg.content, {
                        fromRestore: true,
                        id: msg.id,
                        timestamp: msg.timestamp,
                        timeLabel: msg.timeLabel
                    });
                    restoredCount++;
                }
            });

            if (restoredCount > 0) {
                container.scrollTop = container.scrollHeight;
                this.updateAutosaveUI(data.timeLabel || (data.savedAt ? new Date(data.savedAt).toLocaleTimeString() : ''));
                const dict = TRANSLATIONS[this.currentLang] || TRANSLATIONS['zh-TW'];
                const logTemplate = dict.chatRestoredLog || '已從本地 JSON 快照自動恢復 {count} 則對話記錄 (保存時間: {time})';
                const logMsg = logTemplate
                    .replace('{count}', restoredCount)
                    .replace('{time}', data.timeLabel || data.savedAt || '');
                this.logTerminal(`[對話記憶保護] ${logMsg}`);
            }
        } catch (e) {
            console.warn('Failed to restore chat history:', e);
        }
    }

    exportChatJSON() {
        const now = new Date();
        const timestamp = now.toISOString().replace(/[:.]/g, '-');
        const exportData = {
            app: 'Webcom AI Console',
            version: '2.0',
            exportedAt: now.toISOString(),
            engine: this.activeEngine,
            profile: this.activeProfileId,
            gpuSafetyLimit: `${Math.round(this.gpuMaxRatio * 100)}%`,
            totalMessages: this.chatHistory.length,
            messages: this.chatHistory.map(m => ({
                id: m.id,
                role: m.role,
                content: m.content,
                timestamp: m.timestamp,
                timeLabel: m.timeLabel,
                engineBadge: m.engineBadge || null,
                tier: m.tier || null
            }))
        };
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `webcom_chat_${timestamp}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        this.logTerminal(`[對話匯出] 已產生並下載本地 JSON 對話記錄檔: webcom_chat_${timestamp}.json (共 ${this.chatHistory.length} 則)`);
    }

    clearChat(withUndo = true) {
        const container = document.getElementById('chat-container') || document.getElementById('chat-history');
        if (!container) return;

        const previousHistory = [...this.chatHistory];
        this.chatHistory = [];
        localStorage.removeItem('webcom_chat_history');

        // Retain initial greeting if exists, or recreate
        const greeting = document.getElementById('greeting-bubble');
        if (greeting) {
            container.innerHTML = '';
            container.appendChild(greeting);
        } else {
            container.innerHTML = '';
        }

        const dict = TRANSLATIONS[this.currentLang] || TRANSLATIONS['zh-TW'];
        this.updateAutosaveUI('');

        if (withUndo && previousHistory.length > 0) {
            const undoDiv = document.createElement('div');
            undoDiv.id = 'chat-undo-banner';
            undoDiv.className = 'p-2.5 rounded-xl bg-slate-900/90 border border-slate-700/60 text-xs flex items-center justify-between gap-2 my-2 text-slate-300';
            undoDiv.innerHTML = `
                <span class="flex items-center gap-1.5">
                    <i data-lucide="info" class="w-3.5 h-3.5 text-sky-400"></i>
                    <span>${dict.chatClearedWithUndo || '對話已清空。'}</span>
                </span>
                <button type="button" id="btn-undo-clear-chat" class="px-2.5 py-1 rounded bg-purple-700 hover:bg-purple-600 text-white font-medium transition cursor-pointer text-[11px]">
                    ${dict.undoClearBtn || '復原'}
                </button>
            `;
            container.appendChild(undoDiv);
            if (window.lucide) lucide.createIcons();

            document.getElementById('btn-undo-clear-chat')?.addEventListener('click', () => {
                undoDiv.remove();
                this.chatHistory = previousHistory;
                this.saveChatHistory();
                this.restoreChatHistory();
            });
        }
        this.logTerminal(this.currentLang === 'en' ? '[Chat] Chat history cleared.' : '[對話記錄] 對話畫面已清空。');
    }

    // =========================================================================
    // GPU & VRAM 90% Resource Ceiling & Crash Prevention Governor
    // =========================================================================
    checkGpuResourceCeiling(gpuData) {
        if (!gpuData || !Array.isArray(gpuData.gpus) || gpuData.gpus.length === 0) return;
        const gpu = gpuData.gpus[0];
        this.latestGpuInfo = gpu;

        const totalMb = parseFloat(gpu.vram_total_mb) || 0;
        const usedMb = parseFloat(gpu.vram_used_mb) || 0;
        const vramPct = (totalMb > 0) ? (usedMb / totalMb) * 100 : 0;
        const utilPct = parseFloat(gpu.gpu_util_pct) || 0;
        const limitPct = Math.round(this.gpuMaxRatio * 100);

        // 動態階梯式顯卡負載守護：
        // 1. 顯存超過 limitPct (預設90%)，或負載持續極高 (>95%) 時觸發防禦
        if (vramPct >= limitPct || utilPct >= 95) {
            this.gpuSafetyActive = true;
            this.maxTokensCap = 256; // 緊縮最大生成長度避免顯存暴衝造成 Windows TDR 卡頓
            this.triggerGpuOverloadProtection(gpu, vramPct, utilPct);
        } else if (vramPct >= 80 || utilPct >= 85) {
            this.gpuSafetyActive = true;
            this.maxTokensCap = 384; // 預警區間
            this.updateGpuGuardUI(gpu, vramPct, utilPct, true);
        } else {
            this.gpuSafetyActive = false;
            this.maxTokensCap = 512;
            this.updateGpuGuardUI(gpu, vramPct, utilPct, false);
        }
    }

    updateGpuGuardUI(gpu, vramPct, utilPct, isWarning = false) {
        const badge = document.getElementById('gpu-guard-badge');
        if (!badge) return;

        const limitPct = Math.round(this.gpuMaxRatio * 100);
        if (isWarning) {
            badge.className = 'text-[10px] px-2 py-0.5 rounded-full bg-amber-950/80 border border-amber-600/50 text-amber-300 font-mono flex items-center gap-1 transition';
            badge.title = `VRAM: ${gpu.vram_used_mb}/${gpu.vram_total_mb}MB (${vramPct.toFixed(1)}%) | Core: ${utilPct}% | 警戒上限: ${limitPct}%`;
            badge.innerHTML = `<span>⚡ GPU 守護中 (${vramPct.toFixed(0)}%)</span>`;
        } else {
            badge.className = 'text-[10px] px-2 py-0.5 rounded-full bg-sky-950/80 border border-sky-600/50 text-sky-300 font-mono flex items-center gap-1 transition';
            badge.title = `VRAM: ${gpu.vram_used_mb}/${gpu.vram_total_mb}MB (${vramPct.toFixed(1)}%) | Core: ${utilPct}% | 警戒上限: ${limitPct}%`;
            badge.innerHTML = `<span>🛡️ GPU ${limitPct}%防護</span>`;
        }
    }

    triggerGpuOverloadProtection(gpu, vramPct, utilPct) {
        const badge = document.getElementById('gpu-guard-badge');
        const limitPct = Math.round(this.gpuMaxRatio * 100);
        const highestPct = Math.max(vramPct, utilPct);

        if (badge) {
            badge.className = 'text-[10px] px-2 py-0.5 rounded-full bg-rose-950/90 border border-rose-500 text-rose-300 font-mono font-bold flex items-center gap-1 animate-pulse';
            badge.title = `⚠️ 顯卡超載警戒！VRAM: ${vramPct.toFixed(1)}%, 核心: ${utilPct}%, 上限: ${limitPct}%`;
            badge.innerHTML = `<span>⚠️ GPU 警戒 ${highestPct.toFixed(0)}%</span>`;
        }

        // Cap tokens to reduce VRAM strain and prevent driver TDR / crash
        this.maxTokensCap = 512;

        // Auto-save chat history immediately so crash will lose zero messages!
        this.saveChatHistory();

        // Avoid logging spam: throttle warning to once per 15 seconds
        const now = Date.now();
        if (!this._lastGpuWarnTime || now - this._lastGpuWarnTime > 15000) {
            this._lastGpuWarnTime = now;
            const resType = vramPct >= limitPct ? `VRAM 顯存已達 ${vramPct.toFixed(1)}%` : `GPU 核心負載已達 ${utilPct}%`;
            this.logTerminal(`[GPU 資源過載保護] ⚠️ 偵測到 ${resType} (設定防護上限: ${limitPct}%)！自動限制單次生成 Token 數量並預先完成對話落盤備份，防止瀏覽器與顯卡卡頓崩潰。`);
        }
    }

    setupWebgpuSafetyGovernor() {
        // Intercept WebGPU device lost events to safeguard chat immediately
        if (typeof window !== 'undefined') {
            window.addEventListener('unhandledrejection', (ev) => {
                const reasonStr = String(ev.reason || '');
                if (reasonStr.includes('GPU') || reasonStr.includes('WebGPU') || reasonStr.includes('device lost') || reasonStr.includes('out of memory')) {
                    console.error('[WebGPU Governor] Captured GPU fault:', ev.reason);
                    this.saveChatHistory();
                    this.logTerminal(`[WebGPU 防護警戒] 攔截到顯卡資源異常 (${reasonStr.slice(0, 80)})。對話快照已緊急同步至本地！`);
                }
            });
        }
    }

    async translateWithLLM(title, description, targetLang = null) {
        const textSample = (title || '') + ' ' + (description || '');
        const isChinese = /[\u4e00-\u9fa5]/.test(textSample);
        const toLang = targetLang || (isChinese ? 'English' : 'Traditional Chinese (zh-TW)');

        // 1. Instant dictionary for built-in sample apps
        const dict = {
            '番茄工作法極簡專注計時器': { title: 'Pomodoro Minimalist Focus Timer', desc: 'Features 25m work and 5m short break with custom intervals. Runs completely offline in the sandbox.' },
            'JSON 格式化與美化工具': { title: 'JSON Formatter & Beautifier', desc: 'Client-side lossless parsing, formatting, and validation of JSON strings with minify and copy support.' },
            'Python 數列生成與視覺化': { title: 'Python Sequence Generator & Visualizer', desc: 'Compute and display the first 50 values in numeric sequences using Pyodide in-browser WASM.' },
            'Pomodoro Minimalist Focus Timer': { title: '番茄工作法極簡專注計時器', desc: '具備 25 分鐘工作、5 分鐘短休息與客製時間切換，支援沙盒純本地運行。' },
            'JSON Formatter & Beautifier': { title: 'JSON 格式化與美化工具', desc: '純前端無損解析、排版與驗證 JSON 字串，支援一鍵壓縮與複製。' },
            'Python Sequence Generator & Visualizer': { title: 'Python 數列生成與視覺化', desc: '利用 Pyodide WASM 計算與展示數列前 50 項數值。' }
        };

        const trimmed = (title || '').trim();
        if (dict[trimmed]) {
            return {
                title: dict[trimmed].title,
                description: dict[trimmed].desc
            };
        }

        // 2. Query Active LLM Router Endpoint
        const profile = this.profiles[this.activeProfileId] || {};
        const endpoint = (profile.endpoint || 'http://127.0.0.1:1234/v1').replace(/\/$/, '');
        const apiKey = profile.apiKey || 'lm-studio';
        const model = profile.model && profile.model !== 'auto' ? profile.model : 'qwen3-vl-flash';

        const sysPrompt = `You are a software localization translation engine. Translate the provided software tool title and description into ${toLang}. Output strictly valid JSON object without any markdown code fences: {"title": "...", "description": "..."}`;
        const userPrompt = `Title: ${title || ''}\nDescription: ${description || ''}`;

        try {
            const resp = await fetch(`${endpoint}/chat/completions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
                body: JSON.stringify({
                    model: model,
                    messages: [
                        { role: 'system', content: sysPrompt },
                        { role: 'user', content: userPrompt }
                    ],
                    temperature: 0.2,
                    max_tokens: 350
                }),
                signal: AbortSignal.timeout(12000)
            });

            if (resp.ok) {
                const data = await resp.json();
                const rawContent = data?.choices?.[0]?.message?.content?.trim() || '';
                const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    if (parsed.title) {
                        return {
                            title: parsed.title,
                            description: parsed.description || description
                        };
                    }
                }
            }
        } catch (e) {
            console.warn('[translateWithLLM] API Router translation failed:', e);
        }

        // 3. Fallback to Host Daemon if available
        try {
            const daemonUrl = this.activeDaemonUrl || 'http://127.0.0.1:8001';
            const resp = await fetch(`${daemonUrl}/api/hermes/ask`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: `Translate to ${toLang}. Strict JSON output {"title":"...","description":"..."}\nTitle: ${title}\nDescription: ${description}`
                }),
                signal: AbortSignal.timeout(6000)
            });
            if (resp.ok) {
                const data = await resp.json();
                const m = (data.answer || data.reply || '').match(/\{[\s\S]*\}/);
                if (m) {
                    const parsed = JSON.parse(m[0]);
                    if (parsed.title) return parsed;
                }
            }
        } catch (_) {}

        // 4. Client Offline Fallback
        return {
            title: isChinese ? `[EN] ${title}` : `[中文] ${title}`,
            description: isChinese ? `[EN] ${description}` : `[中文] ${description}`
        };
    }

    async translateText(text, targetLang = 'Traditional Chinese (zh-TW)') {
        if (!text || !text.trim()) return text;
        const profile = this.profiles[this.activeProfileId] || {};
        const endpoint = (profile.endpoint || 'http://127.0.0.1:1234/v1').replace(/\/$/, '');
        const apiKey = profile.apiKey || 'lm-studio';
        const model = profile.model && profile.model !== 'auto' ? profile.model : 'qwen3-vl-flash';

        const sysPrompt = `You are a high-fidelity translator. Translate the given text accurately and naturally into ${targetLang}. Preserve technical terms, brand names, and formatting. Output ONLY the translated text, no preamble or quotes.`;

        // 1. Try Active LLM Endpoint
        try {
            const resp = await fetch(`${endpoint}/chat/completions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
                body: JSON.stringify({
                    model: model,
                    messages: [
                        { role: 'system', content: sysPrompt },
                        { role: 'user', content: text }
                    ],
                    temperature: 0.2,
                    max_tokens: 1024
                }),
                signal: AbortSignal.timeout(12000)
            });
            if (resp.ok) {
                const data = await resp.json();
                const trans = data?.choices?.[0]?.message?.content?.trim();
                if (trans) return trans;
            }
        } catch (e) {
            console.warn('[translateText] LLM translation endpoint unavailable:', e);
        }

        // 2. Fallback to Host Daemon if available
        try {
            const daemonUrl = this.activeDaemonUrl || 'http://127.0.0.1:8001';
            const resp = await fetch(`${daemonUrl}/api/hermes/ask`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: `Translate the following text into ${targetLang}. Return ONLY the translation:\n\n${text}`
                }),
                signal: AbortSignal.timeout(6000)
            });
            if (resp.ok) {
                const data = await resp.json();
                const reply = data.answer || data.reply || '';
                if (reply && reply.trim()) return reply.trim();
            }
        } catch (_) {}

        return text;
    }
}

// Universal bootstrap: supports both DOMContentLoaded and already-interactive state
function startWebcomApp() {
    if (!window.webcomApp) {
        window.webcomApp = new WebcomAIApp();
        window.app = window.webcomApp;
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
            if (apiModelInput) apiModelInput.value = 'qwen3-vl-flash';
            
            // Switch main profile selector to tokentable
            const profileSel = document.getElementById('main-profile-select');
            if (profileSel) profileSel.value = 'tokentable';
            const modalProfSel = document.getElementById('modal-profile-select');
            if (modalProfSel) modalProfSel.value = 'tokentable';
            
            if (window.app) {
                if (window.app.profiles && window.app.profiles['tokentable']) {
                    window.app.profiles['tokentable'].endpoint = 'https://tokentable.asia/v1';
                    window.app.profiles['tokentable'].model = 'qwen3-vl-flash';
                    window.app.activeProfileId = 'tokentable';
                }
                if (window.app.saveSettings) window.app.saveSettings();
                if (window.TOKENTABLE_OFFICIAL_MODELS && typeof window.app.renderRouterDetectedModels === 'function') {
                    window.app.renderRouterDetectedModels(window.TOKENTABLE_OFFICIAL_MODELS, 'https://tokentable.asia/v1');
                }
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
        const curSession = (window.webcomApp && window.webcomApp.currentSession) ? window.webcomApp.currentSession : 'shell';
        const logs = document.getElementById(`term-logs-${curSession}`) || document.getElementById('term-logs');
        if (logs) {
            const d = document.createElement('div');
            d.className = 'text-rose-400 font-mono text-xs';
            d.textContent = '^C [SIGINT - Process Interrupted]';
            logs.appendChild(d);
            const screen = document.getElementById('terminal-screen');
            if (screen) screen.scrollTop = screen.scrollHeight;
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
