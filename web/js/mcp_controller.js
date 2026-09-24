// ================================================================
// Webcom AI - MCP (Model Context Protocol) Controller Module
// Author: startgo (startgo@yia.app) | License: GPLv3
// ================================================================

(function () {
    let discoveredMcpTools = [];

    function openMcpModal() {
        const modal = document.getElementById('mcp-modal');
        const endpointInput = document.getElementById('cfg-mcp-endpoint');
        if (endpointInput && window.appSettings) {
            endpointInput.value = window.appSettings.mcpEndpoint || 'http://127.0.0.1:8001/mcp';
        }
        renderMcpToolsList();
        if (modal) modal.classList.remove('hidden');
        if (discoveredMcpTools.length === 0) {
            discoverMcpTools();
        }
    }

    function closeMcpModal() {
        const modal = document.getElementById('mcp-modal');
        if (modal) modal.classList.add('hidden');
    }

    async function discoverMcpTools(endpoint) {
        const ep = endpoint || document.getElementById('cfg-mcp-endpoint')?.value?.trim() || window.appSettings?.mcpEndpoint || 'http://127.0.0.1:8001/mcp';
        const statusEl = document.getElementById('mcp-discover-status');
        const isEn = (window.currentLang === 'en');

        if (statusEl) {
            statusEl.className = "text-xs text-amber-400";
            statusEl.textContent = isEn ? "Discovering tools from MCP server..." : "正在向 MCP 伺服器探索工具...";
        }

        try {
            // First try direct GET /tools/list
            let targetUrl = ep.endsWith('/') ? ep + 'tools/list' : ep + '/tools/list';
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 3500);

            let res;
            try {
                res = await fetch(targetUrl, { signal: controller.signal });
            } catch (err) {
                // If /tools/list fails, try root
                res = await fetch(ep, { signal: controller.signal });
            }
            clearTimeout(timer);

            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            const tools = data.tools || (Array.isArray(data) ? data : []);

            discoveredMcpTools = tools;
            if (statusEl) {
                statusEl.className = "text-xs text-emerald-400";
                statusEl.textContent = isEn
                    ? `Successfully discovered ${tools.length} tool(s)!`
                    : `成功探索到 ${tools.length} 款可用工具！`;
            }
            renderMcpToolsList();
        } catch (e) {
            if (statusEl) {
                statusEl.className = "text-xs text-rose-400";
                statusEl.textContent = isEn
                    ? `Tool discovery failed: ${e.message} (Is daemon running on ${ep}?)`
                    : `工具探索失敗: ${e.message} (請確認常駐服務或 MCP 伺服器已於 ${ep} 啟動)`;
            }
            renderMcpToolsList();
        }
    }

    function renderMcpToolsList() {
        const listEl = document.getElementById('mcp-tools-list');
        const countEl = document.getElementById('mcp-tools-count');
        if (!listEl) return;
        listEl.innerHTML = '';

        const isEn = (window.currentLang === 'en');

        if (!discoveredMcpTools || discoveredMcpTools.length === 0) {
            listEl.innerHTML = `<div class="text-xs text-gray-500 p-3 bg-black/40 rounded-lg text-center font-mono">${isEn ? 'No external MCP tools discovered yet' : '尚無探索到的 MCP 外部工具'}</div>`;
            if (countEl) countEl.textContent = isEn ? '0 tools' : '0 個工具';
            return;
        }

        if (countEl) countEl.textContent = isEn ? `${discoveredMcpTools.length} tools` : `${discoveredMcpTools.length} 個工具`;

        discoveredMcpTools.forEach(tool => {
            const div = document.createElement('div');
            div.className = "p-3 rounded-lg bg-black border border-gray-800 text-xs";
            div.innerHTML = `
                <div class="flex items-center justify-between">
                    <span class="font-bold text-amber-400 font-mono">${tool.name}</span>
                    <span class="text-[10px] bg-amber-950/60 text-amber-300 px-1.5 py-0.5 rounded border border-amber-800/40">MCP Tool</span>
                </div>
                <div class="text-gray-300 mt-1">${tool.description || (isEn ? 'No description' : '無描述')}</div>
                <div class="text-[11px] text-gray-500 font-mono mt-1">Schema: ${JSON.stringify(tool.inputSchema?.properties || tool.parameters?.properties || {})}</div>
            `;
            listEl.appendChild(div);
        });
    }

    function initMcpEvents() {
        const btnOpen = document.getElementById('btn-open-mcp');
        if (btnOpen) btnOpen.addEventListener('click', openMcpModal);

        const btnClose = document.getElementById('btn-close-mcp');
        if (btnClose) btnClose.addEventListener('click', closeMcpModal);

        const btnCloseFooter = document.getElementById('btn-close-mcp-footer');
        if (btnCloseFooter) btnCloseFooter.addEventListener('click', closeMcpModal);

        const btnDiscover = document.getElementById('btn-discover-mcp');
        if (btnDiscover) btnDiscover.addEventListener('click', () => discoverMcpTools());

        const modal = document.getElementById('mcp-modal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) closeMcpModal();
            });
        }
    }

    document.addEventListener('DOMContentLoaded', initMcpEvents);

    window.openMcpModal = openMcpModal;
    window.closeMcpModal = closeMcpModal;
    window.discoverMcpTools = discoverMcpTools;
    window.renderMcpToolsList = renderMcpToolsList;
})();
