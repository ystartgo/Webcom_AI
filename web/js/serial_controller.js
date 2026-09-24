// ================================================================
// Webcom AI - Serial & Web Serial Controller Module
// Author: startgo (startgo@yia.app) | License: GPLv3
// ================================================================

(function () {
    let webSerialPort = null;
    let webSerialReader = null;
    let keepReading = false;
    let webSerialHistoryText = '';
    let isSerialAutoScrollEnabled = true;

    function getTermScreen() {
        return document.getElementById('terminal-screen');
    }

    function printSerialOutput(text, isError = false) {
        const logs = document.getElementById('term-logs');
        if (!logs) return;
        const line = document.createElement('div');
        line.className = isError ? 'text-rose-400 font-mono text-xs' : 'text-yellow-300 font-mono text-xs';
        line.textContent = text;
        logs.appendChild(line);

        if (isSerialAutoScrollEnabled) {
            const screen = getTermScreen();
            if (screen) screen.scrollTop = screen.scrollHeight;
        }

        webSerialHistoryText += text;
        updateSerialLogStats();
        updateSerialLogModalIfOpen();
    }

    async function connectWebSerial(baudRate) {
        const isEn = (window.currentLang === 'en');
        if (!("serial" in navigator)) {
            const isFile = window.location.protocol === 'file:';
            if (isFile) {
                printSerialOutput(isEn
                    ? '[Web Serial] Chrome Security Policy disables Web Serial under file:// scheme. Please launch via http://127.0.0.1:8001 or install Chrome Extension.'
                    : '[Web Serial 限制] Chrome 安全政策禁止在 file:// 模式直接存取硬體序列埠。請透過 http://127.0.0.1:8001 開啟或安裝擴充功能。', true);
            } else {
                printSerialOutput(isEn
                    ? '[Web Serial] Your browser does not support Web Serial API. Please use Chrome or Edge.'
                    : '[Web Serial] 您的瀏覽器不支援 Web Serial API，請使用 Google Chrome 或 Edge。', true);
            }
            return;
        }

        try {
            let existingPorts = [];
            try { existingPorts = await navigator.serial.getPorts(); } catch (e) { }

            if (existingPorts && existingPorts.length > 0 && !webSerialPort) {
                webSerialPort = existingPorts[existingPorts.length - 1];
            } else {
                webSerialPort = await navigator.serial.requestPort();
            }

            const baud = parseInt(baudRate || document.getElementById('cfg-baud')?.value || '115200', 10);
            await webSerialPort.open({ baudRate: baud });
            keepReading = true;

            const connectBtn = document.getElementById('btn-connect-serial');
            const disconnectBtn = document.getElementById('btn-disconnect-serial');
            if (connectBtn) connectBtn.classList.add('hidden');
            if (disconnectBtn) disconnectBtn.classList.remove('hidden');

            const statusDot = document.getElementById('term-status-dot');
            const statusText = document.getElementById('term-status-text');
            if (statusDot) statusDot.className = 'w-2 h-2 rounded-full bg-yellow-400 animate-pulse';
            if (statusText) statusText.textContent = `Serial @ ${baud}`;

            printSerialOutput(isEn
                ? `[Web Serial] Connected @ ${baud} baud. Reading stream...`
                : `[Web Serial] 成功連線 @ ${baud} 鮑率，正在監聽序列埠輸出...`);

            readSerialLoop();
        } catch (err) {
            console.warn('[Web Serial Error]', err);
            printSerialOutput(isEn ? `[Web Serial] Connection failed: ${err.message}` : `[Web Serial] 連線失敗: ${err.message}`, true);
        }
    }

    async function readSerialLoop() {
        while (webSerialPort && webSerialPort.readable && keepReading) {
            try {
                const textDecoder = new TextDecoderStream();
                const readableStreamClosed = webSerialPort.readable.pipeTo(textDecoder.writable);
                const reader = textDecoder.readable.getReader();
                webSerialReader = reader;

                while (true) {
                    const { value, done } = await reader.read();
                    if (done) break;
                    if (value) {
                        printSerialOutput(value);
                    }
                }
            } catch (err) {
                if (keepReading) {
                    console.warn('[Serial Read Loop]', err);
                }
                break;
            }
        }
    }

    async function disconnectWebSerial() {
        keepReading = false;
        try {
            if (webSerialReader) {
                await webSerialReader.cancel();
                webSerialReader = null;
            }
            if (webSerialPort) {
                await webSerialPort.close();
                webSerialPort = null;
            }
        } catch (err) {
            console.warn('[Serial Disconnect Error]', err);
        }

        const connectBtn = document.getElementById('btn-connect-serial');
        const disconnectBtn = document.getElementById('btn-disconnect-serial');
        if (connectBtn) connectBtn.classList.remove('hidden');
        if (disconnectBtn) disconnectBtn.classList.add('hidden');

        const statusDot = document.getElementById('term-status-dot');
        const statusText = document.getElementById('term-status-text');
        if (statusDot) statusDot.className = 'w-2 h-2 rounded-full bg-emerald-400';
        if (statusText) statusText.textContent = (window.currentLang === 'en') ? 'Terminal Ready' : '終端機就緒';

        printSerialOutput((window.currentLang === 'en') ? '[Web Serial] Disconnected.' : '[Web Serial] 已中斷連線。');
    }

    async function sendSerialCommand(cmd) {
        if (!webSerialPort || !webSerialPort.writable) {
            printSerialOutput((window.currentLang === 'en') ? '[Web Serial] Port not open.' : '[Web Serial] 序列埠尚未連線。', true);
            return;
        }
        try {
            const encoder = new TextEncoder();
            const writer = webSerialPort.writable.getWriter();
            await writer.write(encoder.encode(cmd + '\r\n'));
            writer.releaseLock();
        } catch (err) {
            printSerialOutput(`[Web Serial Send Error] ${err.message}`, true);
        }
    }

    function toggleSerialAutoScroll() {
        isSerialAutoScrollEnabled = !isSerialAutoScrollEnabled;
        const btn = document.getElementById('btn-serial-autoscroll');
        const modalBtn = document.getElementById('btn-modal-serial-autoscroll');
        const lbl = document.getElementById('lbl-modal-serial-autoscroll');

        const isEn = (window.currentLang === 'en');
        const stateText = isSerialAutoScrollEnabled ? (isEn ? 'AutoScroll: ON' : '自動捲動: 開') : (isEn ? 'AutoScroll: OFF' : '自動捲動: 關');

        if (lbl) lbl.textContent = stateText;
        if (btn) {
            btn.className = `px-2 py-0.5 rounded text-xs font-mono transition cursor-pointer ${isSerialAutoScrollEnabled ? 'text-emerald-400 bg-emerald-950/40 border border-emerald-700/50' : 'text-slate-400 bg-slate-800 border border-slate-700'}`;
        }
        if (modalBtn) {
            modalBtn.className = `px-2.5 py-1 rounded-lg border font-medium flex items-center gap-1.5 transition ${isSerialAutoScrollEnabled ? 'bg-emerald-950/50 border-emerald-600/60 text-emerald-300' : 'bg-gray-800 border-gray-700 text-gray-400'}`;
        }
    }

    function updateSerialLogStats() {
        const stats = document.getElementById('serial-log-stats');
        if (!stats) return;
        const charCount = webSerialHistoryText.length;
        const lineCount = (webSerialHistoryText.match(/\n/g) || []).length;
        stats.textContent = `${charCount} 字元 • ${lineCount} 行`;
    }

    function openSerialLogModal() {
        const modal = document.getElementById('serial-log-modal');
        const textarea = document.getElementById('serial-log-textarea');
        if (textarea) textarea.value = webSerialHistoryText;
        updateSerialLogStats();
        if (modal) modal.classList.remove('hidden');
        if (textarea && isSerialAutoScrollEnabled) {
            textarea.scrollTop = textarea.scrollHeight;
        }
    }

    function closeSerialLogModal() {
        const modal = document.getElementById('serial-log-modal');
        if (modal) modal.classList.add('hidden');
    }

    function updateSerialLogModalIfOpen() {
        const modal = document.getElementById('serial-log-modal');
        if (modal && !modal.classList.contains('hidden')) {
            const textarea = document.getElementById('serial-log-textarea');
            if (textarea) {
                textarea.value = webSerialHistoryText;
                if (isSerialAutoScrollEnabled) textarea.scrollTop = textarea.scrollHeight;
            }
        }
    }

    function exportSerialLog() {
        const blob = new Blob([webSerialHistoryText], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `serial_log_${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function clearSerialLogHistory() {
        webSerialHistoryText = '';
        const textarea = document.getElementById('serial-log-textarea');
        if (textarea) textarea.value = '';
        updateSerialLogStats();
    }

    function copyAllSerialLog() {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(webSerialHistoryText).then(() => {
                alert((window.currentLang === 'en') ? 'Log copied to clipboard!' : '日誌已成功複製至剪貼簿！');
            });
        }
    }

    // Expose globals
    window.connectWebSerial = connectWebSerial;
    window.disconnectWebSerial = disconnectWebSerial;
    window.sendSerialCommand = sendSerialCommand;
    window.toggleSerialAutoScroll = toggleSerialAutoScroll;
    window.openSerialLogModal = openSerialLogModal;
    window.closeSerialLogModal = closeSerialLogModal;
    window.exportSerialLog = exportSerialLog;
    window.clearSerialLogHistory = clearSerialLogHistory;
    window.copyAllSerialLog = copyAllSerialLog;
})();
