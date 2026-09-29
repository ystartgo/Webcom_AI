// ================================================================
// Webcom AI - RAG & GraphRAG Knowledge Base Controller Module
// Author: startgo (startgo@yia.app) | License: GPLv3
// ================================================================

(function () {
    const ENCYCLOPEDIA_CATEGORIES = [
        { id: 'all', nameZh: '全部百科', nameEn: 'All Docs' },
        { id: 'hardware_pcb', nameZh: '⚡ 硬體與 PCB', nameEn: '⚡ Hardware & PCB' },
        { id: 'network_protocols', nameZh: '🌐 網通與協定', nameEn: '🌐 Net & Protocols' },
        { id: 'system_os_cli', nameZh: '💻 系統與 CLI', nameEn: '💻 System & CLI' },
        { id: 'standards_compliance', nameZh: '📋 安規與認證', nameEn: '📋 Standards' },
        { id: 'general_knowledge', nameZh: '📚 通用手冊', nameEn: '📚 General Manual' }
    ];

    let activeRagCategory = 'all';
    let currentRagTab = 'docs';

    function getCurrentLang() {
        return window.currentLang || (window.webcomApp && window.webcomApp.currentLang) || 'zh-TW';
    }

    function getStorageDocs() {
        try {
            const raw = localStorage.getItem('webcom_rag_docs');
            if (raw) return JSON.parse(raw);
        } catch (e) {}
        return [
            {
                id: 'doc_quick_start',
                title: 'Webcom AI 系統快速架構導覽',
                category: 'general_knowledge',
                content: 'Webcom AI 是由 startgo 開發之雙引擎 AI 控制台，底層具備 Tier 1 純 WASM、Tier 2 直連 API、以及 Tier 3 常駐背景守護行程 (Daemon: 8001)。內建 100+ 款工具鏈與 Hermes Agent，支援各類終端與硬體調試。'
            },
            {
                id: 'doc_serial_troubleshooting',
                title: 'Web Serial 序列埠連線與排障規範',
                category: 'hardware_pcb',
                content: '在 Windows 與 Linux 上，Web Serial 支援 9600 至 921600 鮑率。如在 Chrome 下出現 file:// 安全限制，請透過本機服務 http://127.0.0.1:8001 開啟，或切換為後端 Serial (8001 Daemon) 連線。'
            },
            {
                id: 'doc_network_ports',
                title: '生態系服務埠對照表',
                category: 'network_protocols',
                content: 'Webcom 常駐服務埠如下：Host Daemon (8001)、LM Studio (1234)、Ollama (11434)、ComfyUI (5000)、Kokoro TTS (8200)、MusicGen (9150)、noVNC WSL2 (6080)。'
            }
        ];
    }

    function saveStorageDocs(docs) {
        localStorage.setItem('webcom_rag_docs', JSON.stringify(docs));
    }

    function openRagModal() {
        const modal = document.getElementById('rag-modal');
        renderRagCategoryTabs();
        renderRagDocList();
        updateGraphStatsBadge();
        if (modal) modal.classList.remove('hidden');
        if (currentRagTab === 'graph') {
            setTimeout(() => initOrRefreshGraphCanvas(), 60);
        }
        if (window.lucide) lucide.createIcons();
    }

    function closeRagModal() {
        const modal = document.getElementById('rag-modal');
        if (modal) modal.classList.add('hidden');
        if (window.graphRagVisualizer) {
            window.graphRagVisualizer.stopSimulation();
        }
    }

    function switchRagTab(tabId, btnEl) {
        currentRagTab = tabId;
        const isEn = (getCurrentLang() === 'en');

        document.querySelectorAll('.rag-main-tab-btn').forEach(btn => {
            const isActive = btn.getAttribute('data-tab') === tabId;
            btn.className = `rag-main-tab-btn px-3 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                isActive
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`;
        });

        const pages = {
            'docs': document.getElementById('rag-tab-content-docs'),
            'graph': document.getElementById('rag-tab-content-graph'),
            'search': document.getElementById('rag-tab-content-search'),
            'dictionary': document.getElementById('rag-tab-content-dictionary')
        };

        Object.keys(pages).forEach(key => {
            if (pages[key]) {
                pages[key].classList.toggle('hidden', key !== tabId);
            }
        });

        if (tabId === 'graph') {
            setTimeout(() => initOrRefreshGraphCanvas(), 60);
        } else {
            if (window.graphRagVisualizer) {
                window.graphRagVisualizer.stopSimulation();
            }
            if (tabId === 'dictionary') {
                const resultsEl = document.getElementById('dict-search-results');
                if (resultsEl && (!resultsEl.children.length || resultsEl.textContent.includes('請輸入檢索詞'))) {
                    runDictionarySearch('破釜沉舟', 'all');
                }
            }
        }

        if (window.lucide) lucide.createIcons();
    }

    function updateGraphStatsBadge() {
        const badge = document.getElementById('graphrag-stats-badge');
        if (!badge || !window.graphRagEngine) return;
        const stats = window.graphRagEngine.getStats();
        const isEn = (getCurrentLang() === 'en');
        badge.textContent = isEn
            ? `${stats.nodeCount} Entities · ${stats.edgeCount} Relations`
            : `${stats.nodeCount} 實體 · ${stats.edgeCount} 關聯`;
    }

    function initOrRefreshGraphCanvas() {
        if (!window.graphRagEngine || !window.GraphVisualizer) return;
        if (!window.graphRagVisualizer) {
            window.graphRagVisualizer = new window.GraphVisualizer(
                'graphrag-canvas',
                'graphrag-canvas-container',
                window.graphRagEngine
            );
        } else {
            window.graphRagVisualizer.resizeCanvas();
            window.graphRagVisualizer.resetData(window.graphRagEngine.nodes, window.graphRagEngine.edges);
        }
        window.graphRagEngine.visualizer = window.graphRagVisualizer;
        updateGraphStatsBadge();
    }
    window.initOrRefreshGraphCanvas = initOrRefreshGraphCanvas;

    function renderRagCategoryTabs() {
        const tabsEl = document.getElementById('rag-category-tabs');
        if (!tabsEl) return;
        const docs = getStorageDocs();
        tabsEl.innerHTML = '';
        const isEn = (getCurrentLang() === 'en');

        ENCYCLOPEDIA_CATEGORIES.forEach(cat => {
            const count = cat.id === 'all'
                ? docs.length
                : docs.filter(d => (d.category || 'general_knowledge') === cat.id).length;
            const isActive = (activeRagCategory === cat.id);
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = `px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition font-medium shrink-0 cursor-pointer text-xs ${
                isActive
                    ? 'bg-emerald-600 text-white shadow-sm font-bold'
                    : 'bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700/60'
            }`;
            const name = isEn ? cat.nameEn : cat.nameZh;
            btn.innerHTML = `<span>${name}</span><span class="text-[10px] px-1.5 py-0.2 rounded-full ${isActive ? 'bg-black/40 text-emerald-200' : 'bg-gray-900 text-gray-400 font-mono'}">${count}</span>`;
            btn.onclick = () => {
                activeRagCategory = cat.id;
                renderRagCategoryTabs();
                renderRagDocList();
            };
            tabsEl.appendChild(btn);
        });
    }

    function renderRagDocList(searchQuery = '') {
        const listEl = document.getElementById('rag-doc-list') || document.getElementById('rag-docs-list');
        const countEl = document.getElementById('rag-docs-count') || document.getElementById('rag-total-chunks');
        if (!listEl) return;
        let docs = getStorageDocs();
        const isEn = (getCurrentLang() === 'en');

        if (activeRagCategory !== 'all') {
            docs = docs.filter(d => (d.category || 'general_knowledge') === activeRagCategory);
        }

        if (searchQuery && searchQuery.trim()) {
            const q = searchQuery.trim().toLowerCase();
            docs = docs.filter(d => (d.title && d.title.toLowerCase().includes(q)) || (d.content && d.content.toLowerCase().includes(q)));
        }

        if (countEl) countEl.textContent = isEn ? `${docs.length} docs` : `${docs.length} 篇文件`;

        listEl.innerHTML = '';
        if (docs.length === 0) {
            listEl.innerHTML = `<div class="text-xs text-gray-500 p-4 text-center font-mono">${isEn ? 'No documents found' : '尚無符合條件之知識文件'}</div>`;
            return;
        }

        const maxDisplay = 35;
        const displayDocs = docs.slice(0, maxDisplay);

        displayDocs.forEach(doc => {
            const div = document.createElement('div');
            div.className = "p-3 rounded-lg bg-black border border-gray-800 text-xs space-y-1";
            div.innerHTML = `
                <div class="flex items-center justify-between">
                    <span class="font-bold text-emerald-400 truncate flex-1">${doc.title}</span>
                    <div class="flex items-center gap-1.5 shrink-0 ml-2">
                        <span class="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/40">${doc.category || 'general'}</span>
                        <button type="button" class="btn-delete-doc text-gray-400 hover:text-rose-400 transition p-0.5" title="${isEn ? 'Delete Document' : '刪除文件'}">
                            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                        </button>
                    </div>
                </div>
                <div class="text-gray-400 line-clamp-2 text-[11px] leading-relaxed">${doc.content}</div>
            `;

            div.querySelector('.btn-delete-doc')?.addEventListener('click', () => {
                if (confirm(isEn ? `Delete document "${doc.title}"?` : `確定刪除文件「${doc.title}」？`)) {
                    const allDocs = getStorageDocs().filter(d => d.id !== doc.id);
                    saveStorageDocs(allDocs);
                    renderRagCategoryTabs();
                    renderRagDocList(searchQuery);
                    if (window.graphRagEngine) {
                        window.graphRagEngine.rebuildFromAllDocs();
                        updateGraphStatsBadge();
                    }
                }
            });

            listEl.appendChild(div);
        });

        if (docs.length > maxDisplay) {
            const moreDiv = document.createElement('div');
            moreDiv.className = "p-2.5 text-center text-[11px] text-gray-400 bg-gray-950/90 rounded-lg border border-gray-800 font-mono";
            moreDiv.textContent = isEn
                ? `Showing top ${maxDisplay} of ${docs.length} docs (use search bar above to filter).`
                : `已顯示前 ${maxDisplay} 篇 (共 ${docs.length} 篇)，可使用上方搜尋框精準搜尋。`;
            listEl.appendChild(moreDiv);
        }

        if (window.lucide) lucide.createIcons();
    }

    function addRagDocument() {
        const titleInput = document.getElementById('rag-doc-title');
        const contentInput = document.getElementById('rag-doc-content');
        const categorySelect = document.getElementById('rag-doc-category');

        const title = titleInput?.value.trim();
        const content = contentInput?.value.trim();
        const category = categorySelect?.value || 'general_knowledge';
        const isEn = (getCurrentLang() === 'en');

        if (!title || !content) {
            alert(isEn ? 'Please fill in both title and content.' : '請填寫文件標題與內容！');
            return;
        }

        const docs = getStorageDocs();
        const newDoc = {
            id: 'doc_' + Date.now(),
            title: title,
            category: category,
            content: content
        };
        docs.unshift(newDoc);

        saveStorageDocs(docs);
        if (titleInput) titleInput.value = '';
        if (contentInput) contentInput.value = '';

        // Auto-extract into GraphRAG Knowledge Graph
        if (window.graphRagEngine) {
            const ext = window.graphRagEngine.extractFromDocument(newDoc);
            updateGraphStatsBadge();
            if (window.graphRagVisualizer) {
                window.graphRagVisualizer.resetData(window.graphRagEngine.nodes, window.graphRagEngine.edges);
            }
        }

        renderRagCategoryTabs();
        renderRagDocList();

        const banner = document.getElementById('rag-saved-banner');
        if (banner) {
            banner.classList.remove('hidden');
            setTimeout(() => banner.classList.add('hidden'), 3000);
        }
    }

    function exportRagPack() {
        const docs = getStorageDocs();
        const targetDocs = activeRagCategory === 'all'
            ? docs
            : docs.filter(d => (d.category || 'general_knowledge') === activeRagCategory);

        const pack = {
            format: 'ragpack',
            version: '1.0',
            exportedAt: new Date().toISOString(),
            category: activeRagCategory,
            documents: targetDocs,
            graphData: window.graphRagEngine ? {
                nodes: window.graphRagEngine.nodes,
                edges: window.graphRagEngine.edges
            } : null
        };

        const blob = new Blob([JSON.stringify(pack, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `webcom_${activeRagCategory}_knowledge_pack.ragpack`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function importRagPackFromFile(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                const importedDocs = data.documents || (Array.isArray(data) ? data : []);
                if (!importedDocs.length) throw new Error("No documents found in pack");

                const currentDocs = getStorageDocs();
                let addedCount = 0;
                importedDocs.forEach(d => {
                    if (!d.id) d.id = 'doc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
                    if (!currentDocs.some(exist => exist.id === d.id)) {
                        currentDocs.push(d);
                        addedCount++;
                        if (window.graphRagEngine) {
                            window.graphRagEngine.extractFromDocument(d);
                        }
                    }
                });

                if (data.graphData && window.graphRagEngine) {
                    if (Array.isArray(data.graphData.nodes)) {
                        data.graphData.nodes.forEach(n => {
                            if (!window.graphRagEngine.nodes.some(ex => ex.id === n.id)) {
                                window.graphRagEngine.nodes.push(n);
                            }
                        });
                    }
                    if (Array.isArray(data.graphData.edges)) {
                        data.graphData.edges.forEach(ed => {
                            if (!window.graphRagEngine.edges.some(ex => ex.source === ed.source && ex.target === ed.target && ex.relation === ed.relation)) {
                                window.graphRagEngine.edges.push(ed);
                            }
                        });
                    }
                    window.graphRagEngine.saveGraph();
                    updateGraphStatsBadge();
                }

                saveStorageDocs(currentDocs);
                renderRagCategoryTabs();
                renderRagDocList();
                alert(getCurrentLang() === 'en'
                    ? `Successfully imported ${addedCount} document(s) & updated GraphRAG!`
                    : `成功匯入 ${addedCount} 篇知識文件並同步知識圖譜！`);
            } catch (err) {
                alert(`Import failed: ${err.message}`);
            }
        };
        reader.readAsText(file);
    }

    function handleFileUpload(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const titleInput = document.getElementById('rag-doc-title');
            const contentInput = document.getElementById('rag-doc-content');
            if (titleInput) titleInput.value = file.name.replace(/\.[^/.]+$/, "");
            if (contentInput) contentInput.value = e.target.result;
        };
        reader.readAsText(file);
    }

    // ==========================================
    // GraphRAG Toolbar Actions
    // ==========================================
    function rebuildGraphRAGAction() {
        if (!window.graphRagEngine) return;
        const res = window.graphRagEngine.rebuildFromAllDocs();
        updateGraphStatsBadge();
        const isEn = (getCurrentLang() === 'en');
        alert(isEn
            ? `GraphRAG Rebuilt! Indexed ${res.totalCount} entities and ${res.edgeCount} relationship edges.`
            : `知識圖譜重建完成！收錄 ${res.totalCount} 個實體節點與 ${res.edgeCount} 條關聯邊。`);
    }

    function openAddTriplePrompt() {
        const isEn = (getCurrentLang() === 'en');
        const src = prompt(isEn ? 'Enter Source Entity (e.g. Web Serial):' : '請輸入來源實體名稱 (例如: Web Serial):');
        if (!src) return;
        const rel = prompt(isEn ? 'Enter Relationship (e.g. connects_to):' : '請輸入關係名稱 (例如: 支援通訊鮑率 / connects_to):');
        if (!rel) return;
        const tgt = prompt(isEn ? 'Enter Target Entity (e.g. 9600-921600 Baud):' : '請輸入目標實體名稱 (例如: 9600-921600 Baud):');
        if (!tgt) return;

        if (window.graphRagEngine) {
            window.graphRagEngine.addTriple(src, rel, tgt);
            updateGraphStatsBadge();
            alert(isEn ? 'Relationship triple added to GraphRAG!' : '三元組已成功加入知識圖譜！');
        }
    }

    function exportGraphRAGAction() {
        if (!window.graphRagEngine) return;
        const data = {
            format: 'graphrag',
            version: '1.0',
            exportedAt: new Date().toISOString(),
            nodes: window.graphRagEngine.nodes,
            edges: window.graphRagEngine.edges
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `webcom_knowledge_graph_${new Date().toISOString().slice(0, 10)}.graphrag`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function triggerImportGraphRAG() {
        const inp = document.getElementById('file-import-graphrag');
        if (inp) {
            inp.value = '';
            inp.click();
        }
    }

    function runGraphRAGTestSearch() {
        const inp = document.getElementById('graphrag-test-query');
        const out = document.getElementById('graphrag-test-results');
        if (!inp || !out || !window.graphRagEngine) return;

        const query = inp.value.trim();
        const isEn = (getCurrentLang() === 'en');
        if (!query) {
            out.innerHTML = `<div class="text-xs text-gray-500 font-mono">${isEn ? 'Please enter a search query.' : '請輸入欲檢索之關鍵字。'}</div>`;
            return;
        }

        const modeSel = document.getElementById('graphrag-test-mode');
        const mode = modeSel ? modeSel.value : 'hybrid';
        const res = window.graphRagEngine.query(query, { mode });

        if (!res.hasMatch) {
            out.innerHTML = `
                <div class="p-3 bg-gray-950 border border-gray-800 rounded-lg text-xs text-gray-400 space-y-1">
                    <div class="text-amber-400 font-bold">${isEn ? 'No Knowledge Graph Entities Matched' : '未命中圖譜實體'}</div>
                    <p>${isEn ? 'Try terms like "Web Serial", "Host Daemon", "Pyodide", "Jev", "8001".' : '可嘗試搜尋「Web Serial」、「Host Daemon」、「Pyodide」、「Jev」、「8001」等關鍵字。'}</p>
                </div>
            `;
            return;
        }

        out.innerHTML = `
            <div class="space-y-2 text-xs">
                <div class="flex items-center gap-1.5 flex-wrap">
                    <span class="text-gray-400 font-bold">${isEn ? 'Matched Seed Entities:' : '命中核心實體:'}</span>
                    ${res.matchedEntities.map(m => `<span class="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700/60 font-mono text-[11px] font-bold">${m}</span>`).join(' ')}
                </div>

                <div class="space-y-1 border border-gray-800 bg-gray-950 p-2.5 rounded-lg max-h-36 overflow-y-auto font-mono text-[11px]">
                    <div class="text-emerald-400 font-bold mb-1">${isEn ? 'Multi-Hop Triples Retrieved:' : '多跳推理關聯路徑:'} (${res.triples.length})</div>
                    ${res.triples.map(t => `<div class="text-gray-300">↳ <span class="text-cyan-300 font-semibold">${t.source}</span> <span class="text-emerald-400">──[${t.relation}]──></span> <span class="text-purple-300 font-semibold">${t.target}</span></div>`).join('')}
                </div>

                <div class="border border-gray-800 bg-[#070b12] p-2.5 rounded-lg">
                    <div class="text-gray-400 font-bold mb-1 text-[10px] flex items-center justify-between">
                        <span>${isEn ? 'Prompt Context Injected to LLM:' : '即將注入 LLM System Prompt 之上下文結構:'}</span>
                        <span class="text-emerald-400 font-mono">${res.formattedPrompt.length} chars</span>
                    </div>
                    <pre class="text-gray-300 font-mono text-[10px] whitespace-pre-wrap max-h-32 overflow-y-auto leading-relaxed select-text">${res.formattedPrompt}</pre>
                </div>
            </div>
        `;
    }

    // ==========================================
    // MOE Chinese Dictionary RAG Controller (16.4萬條)
    // ==========================================
    let dictActiveCategory = 'all';

    function escapeHtml(text) {
        if (!text) return '';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    async function runDictionarySearch(query = '', category = null) {
        if (category) dictActiveCategory = category;
        const q = (query !== undefined && query !== null) ? query : (document.getElementById('dict-search-input')?.value || '');
        const resultsEl = document.getElementById('dict-search-results');
        const badgeEl = document.getElementById('dict-stats-badge');
        if (!resultsEl) return;

        resultsEl.innerHTML = `
            <div class="p-6 text-center text-xs text-amber-300 font-mono animate-pulse">
                ⚡ 正在即時檢索 16.4萬條詞典 (SQLite FTS5 引擎)...
            </div>
        `;

        try {
            const url = `http://127.0.0.1:8001/api/rag/dictionary/search?q=${encodeURIComponent(q)}&category=${encodeURIComponent(dictActiveCategory)}&limit=25`;
            const resp = await fetch(url);
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const data = await resp.json();

            if (badgeEl && data.latency_ms !== undefined) {
                badgeEl.textContent = `耗時: ${data.latency_ms}ms · 命中 ${data.count} 筆 (FTS5)`;
            }

            if (!data.results || data.results.length === 0) {
                resultsEl.innerHTML = `
                    <div class="p-6 text-center text-xs text-gray-500 font-mono bg-gray-950 rounded-xl border border-gray-800">
                        查無符合「${escapeHtml(q)}」之詞條 (分類: ${dictActiveCategory})。可嘗試搜尋「知足」、「天」、「水部」或切換為「全部」分類。
                    </div>
                `;
                return;
            }

            resultsEl.innerHTML = '';
            data.results.forEach(item => {
                const card = document.createElement('div');
                card.className = "p-3.5 bg-gray-950 rounded-xl border border-gray-800 hover:border-amber-500/40 transition space-y-2 text-xs";

                const catBadgeClass = item.category === 'idioms' 
                    ? 'bg-rose-950/80 text-rose-300 border-rose-800/40'
                    : item.category === 'single_chars'
                    ? 'bg-blue-950/80 text-blue-300 border-blue-800/40'
                    : item.category === 'semantic_network'
                    ? 'bg-purple-950/80 text-purple-300 border-purple-800/40'
                    : 'bg-amber-950/80 text-amber-300 border-amber-800/40';

                let synHtml = '';
                if (item.synonyms) {
                    const parts = item.synonyms.split(/[,、;\s]+/).filter(Boolean);
                    synHtml = `<div class="flex items-center gap-1.5 flex-wrap text-[11px]"><span class="text-emerald-400 font-bold">相似詞:</span>` +
                        parts.map(s => `<button type="button" class="btn-dict-jump px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/40 hover:bg-emerald-900 cursor-pointer" data-word="${escapeHtml(s)}">${escapeHtml(s)}</button>`).join('') +
                        `</div>`;
                }

                let antHtml = '';
                if (item.antonyms) {
                    const parts = item.antonyms.split(/[,、;\s]+/).filter(Boolean);
                    antHtml = `<div class="flex items-center gap-1.5 flex-wrap text-[11px]"><span class="text-rose-400 font-bold">相反詞:</span>` +
                        parts.map(a => `<button type="button" class="btn-dict-jump px-1.5 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-800/40 hover:bg-rose-900 cursor-pointer" data-word="${escapeHtml(a)}">${escapeHtml(a)}</button>`).join('') +
                        `</div>`;
                }

                // 繁簡對照與異體字標籤
                let simpBadge = '';
                if (item.simplified) {
                    const isDiff = item.simplified !== item.word;
                    simpBadge = `
                        <span class="text-[11px] px-2 py-0.5 rounded-md font-mono flex items-center gap-1.5 ${isDiff ? 'bg-amber-950/80 text-amber-200 border border-amber-600/50 shadow-sm' : 'bg-gray-800 text-gray-400 border border-gray-700/50'}" title="繁體與簡體中文對照">
                            <span class="text-gray-400 text-[10px]">簡體:</span>
                            <span class="font-bold ${isDiff ? 'text-amber-300 font-sans tracking-wide' : 'text-gray-300 font-sans'}">${escapeHtml(item.simplified)}</span>
                        </span>
                    `;
                }

                let varBadge = '';
                if (item.variant_chars) {
                    varBadge = `
                        <span class="text-[10.5px] px-2 py-0.5 rounded-md bg-purple-950/70 text-purple-200 border border-purple-800/40 font-mono flex items-center gap-1" title="異體字">
                            <span class="text-purple-400 text-[10px]">異體:</span>
                            <span class="font-bold">${escapeHtml(item.variant_chars)}</span>
                        </span>
                    `;
                }

                const defnText = item.definition ? escapeHtml(item.definition).replace(/\n/g, '<br>') : '';

                card.innerHTML = `
                    <div class="flex items-start justify-between gap-2">
                        <div>
                            <div class="flex items-center gap-2 flex-wrap">
                                <span class="text-base font-bold text-amber-300 font-serif tracking-wide">${escapeHtml(item.word)}</span>
                                <span class="text-[10px] px-2 py-0.5 rounded-full border ${catBadgeClass} font-mono font-medium">${escapeHtml(item.category_name || item.category)}</span>
                                ${simpBadge}
                                ${varBadge}
                                ${item.radical ? `<span class="text-[10.5px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-300 font-mono">部首: ${escapeHtml(item.radical)} (${item.total_strokes}畫)</span>` : ''}
                            </div>
                            <div class="text-[11px] text-gray-400 font-mono mt-1 flex items-center gap-3 flex-wrap">
                                ${item.zhuyin ? `<span class="text-cyan-300 font-medium">注音: ${escapeHtml(item.zhuyin)}</span>` : ''}
                                ${item.pinyin ? `<span class="text-gray-400">拼音: ${escapeHtml(item.pinyin)}</span>` : ''}
                                ${item.simplified ? `<span class="text-amber-200/90 font-sans text-[11px]">繁簡映射: <strong class="text-white">${escapeHtml(item.word)}</strong> ⇄ <strong class="text-amber-300 font-bold">${escapeHtml(item.simplified)}</strong></span>` : ''}
                            </div>
                        </div>
                        <div class="flex items-center gap-1.5 shrink-0">
                            <button type="button" class="btn-dict-inject text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 px-2 py-1 rounded text-[11px] flex items-center gap-1 transition cursor-pointer" title="將釋義填入對話輸入框">
                                <i data-lucide="message-square-plus" class="w-3.5 h-3.5 text-cyan-400"></i> 引用對話
                            </button>
                            <button type="button" class="btn-dict-to-graph text-emerald-300 hover:text-white bg-emerald-950 hover:bg-emerald-900 border border-emerald-700/50 px-2 py-1 rounded text-[11px] flex items-center gap-1 transition cursor-pointer" title="加入本機 GraphRAG 圖譜">
                                <i data-lucide="share-2" class="w-3.5 h-3.5"></i> 存入圖譜
                            </button>
                        </div>
                    </div>

                    <div class="text-gray-300 text-xs leading-relaxed bg-black/50 p-2.5 rounded-lg border border-gray-900 select-text font-serif">
                        ${defnText}
                    </div>

                    ${synHtml || antHtml ? `<div class="space-y-1 pt-1">${synHtml}${antHtml}</div>` : ''}
                `;

                card.querySelector('.btn-dict-inject')?.addEventListener('click', () => {
                    const chatInp = document.getElementById('chat-input') || document.getElementById('user-prompt');
                    const simpInfo = (item.simplified && item.simplified !== item.word) ? ` [簡體: ${item.simplified}]` : '';
                    const snippet = `【${item.word}】${simpInfo} (${item.zhuyin || ''}) ${item.definition || ''}`.slice(0, 300);
                    if (chatInp) {
                        chatInp.value = (chatInp.value ? chatInp.value + "\n" : "") + snippet;
                        chatInp.focus();
                    }
                    closeRagModal();
                });

                card.querySelector('.btn-dict-to-graph')?.addEventListener('click', () => {
                    if (window.graphRagEngine) {
                        window.graphRagEngine.addTriple(item.word, '辭條分類', item.category_name || item.category);
                        if (item.synonyms) {
                            item.synonyms.split(/[,、;\s]+/).filter(Boolean).forEach(s => {
                                window.graphRagEngine.addTriple(item.word, '相似詞', s);
                            });
                        }
                        if (item.antonyms) {
                            item.antonyms.split(/[,、;\s]+/).filter(Boolean).forEach(a => {
                                window.graphRagEngine.addTriple(item.word, '相反詞', a);
                            });
                        }
                        updateGraphStatsBadge();
                        alert(`已成功將「${item.word}」及關聯邊加入本機 GraphRAG 知識圖譜！`);
                    }
                });

                card.querySelectorAll('.btn-dict-jump').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const targetWord = btn.getAttribute('data-word');
                        const inp = document.getElementById('dict-search-input');
                        if (inp) inp.value = targetWord;
                        runDictionarySearch(targetWord, 'all');
                    });
                });

                resultsEl.appendChild(card);
            });

            if (window.lucide) lucide.createIcons();
        } catch (err) {
            resultsEl.innerHTML = `
                <div class="p-4 bg-rose-950/40 border border-rose-800/40 rounded-xl text-xs text-rose-300 font-mono">
                    ⚠️ 辭典伺服端連線失敗: ${err.message}。請確認 Host Daemon (8001) 是否運作中。
                </div>
            `;
        }
    }

    async function loadCuratedRagPack(filename) {
        if (!confirm(`即將載入「${filename}」精華包至瀏覽器知識庫，是否繼續？`)) return;
        try {
            const url = `http://127.0.0.1:8001/api/rag/dictionary/download/${encodeURIComponent(filename)}`;
            const resp = await fetch(url);
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const data = await resp.json();
            const docs = data.documents || [];
            if (!docs.length) throw new Error("精選包中未包含任何文件");

            const currentDocs = getStorageDocs();
            const existingIds = new Set(currentDocs.map(d => d.id));
            let addedCount = 0;
            const newDocs = [];
            docs.forEach(d => {
                if (!existingIds.has(d.id)) {
                    currentDocs.push(d);
                    newDocs.push(d);
                    existingIds.add(d.id);
                    addedCount++;
                }
            });

            // Extract only the top seed entities (up to 15) to keep GraphRAG visualizer nimble and smooth
            if (window.graphRagEngine && newDocs.length > 0) {
                newDocs.slice(0, 15).forEach(d => {
                    window.graphRagEngine.extractFromDocument(d, true);
                });
                window.graphRagEngine.saveGraph();
            }

            saveStorageDocs(currentDocs);
            renderRagCategoryTabs();
            renderRagDocList();
            updateGraphStatsBadge();
            alert(`🎉 成功匯入 ${addedCount} 條精選詞彙到前端知識庫，並已同步更新 GraphRAG！`);
        } catch (err) {
            alert(`載入精選包失敗: ${err.message}`);
        }
    }

    function initRagEvents() {
        document.getElementById('btn-open-rag')?.addEventListener('click', openRagModal);
        document.getElementById('btn-open-rag-menu')?.addEventListener('click', openRagModal);
        document.getElementById('btn-close-rag')?.addEventListener('click', closeRagModal);
        document.getElementById('btn-close-rag-footer')?.addEventListener('click', closeRagModal);
        document.getElementById('btn-add-rag-doc')?.addEventListener('click', addRagDocument);
        document.getElementById('btn-export-ragpack')?.addEventListener('click', exportRagPack);

        // File imports
        const fileImport = document.getElementById('file-import-ragpack');
        if (fileImport) {
            document.getElementById('btn-import-ragpack')?.addEventListener('click', () => fileImport.click());
            fileImport.addEventListener('change', (e) => {
                if (e.target.files && e.target.files[0]) {
                    importRagPackFromFile(e.target.files[0]);
                    e.target.value = '';
                }
            });
        }

        const fileUpload = document.getElementById('file-rag-upload');
        if (fileUpload) {
            document.getElementById('btn-upload-rag-file')?.addEventListener('click', () => fileUpload.click());
            fileUpload.addEventListener('change', (e) => {
                if (e.target.files && e.target.files[0]) {
                    handleFileUpload(e.target.files[0]);
                    e.target.value = '';
                }
            });
        }

        // GraphRAG Toolbar & Actions
        document.getElementById('btn-graphrag-rebuild')?.addEventListener('click', rebuildGraphRAGAction);
        document.getElementById('btn-graphrag-add-triple')?.addEventListener('click', openAddTriplePrompt);
        document.getElementById('btn-graphrag-export')?.addEventListener('click', exportGraphRAGAction);
        document.getElementById('btn-graphrag-import')?.addEventListener('click', triggerImportGraphRAG);

        const fileImportGraph = document.getElementById('file-import-graphrag');
        if (fileImportGraph) {
            fileImportGraph.addEventListener('change', (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (evt) => {
                    try {
                        const parsed = JSON.parse(evt.target.result);
                        if (parsed && Array.isArray(parsed.nodes) && Array.isArray(parsed.edges)) {
                            window.graphRagEngine.nodes = parsed.nodes;
                            window.graphRagEngine.edges = parsed.edges;
                            window.graphRagEngine.saveGraph();
                            updateGraphStatsBadge();
                            if (window.graphRagVisualizer) {
                                window.graphRagVisualizer.resetData(parsed.nodes, parsed.edges);
                            }
                            alert(getCurrentLang() === 'en' ? 'Knowledge graph imported successfully!' : '知識圖譜已成功匯入！');
                        }
                    } catch (err) {
                        alert('Import failed: ' + err.message);
                    }
                };
                reader.readAsText(file);
                e.target.value = '';
            });
        }

        // Canvas Zoom Controls
        document.getElementById('btn-graphrag-zoom-in')?.addEventListener('click', () => {
            window.graphRagVisualizer?.zoomIn();
        });
        document.getElementById('btn-graphrag-zoom-out')?.addEventListener('click', () => {
            window.graphRagVisualizer?.zoomOut();
        });
        document.getElementById('btn-graphrag-reset-zoom')?.addEventListener('click', () => {
            window.graphRagVisualizer?.resetView();
        });

        // GraphRAG Test Search
        document.getElementById('btn-graphrag-test-search')?.addEventListener('click', runGraphRAGTestSearch);
        document.getElementById('graphrag-test-query')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') runGraphRAGTestSearch();
        });

        // Dictionary Search Events
        document.getElementById('btn-dict-search')?.addEventListener('click', () => {
            const inp = document.getElementById('dict-search-input');
            runDictionarySearch(inp ? inp.value : '', dictActiveCategory);
        });
        document.getElementById('dict-search-input')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                runDictionarySearch(e.target.value, dictActiveCategory);
            }
        });

        // Dictionary Category Pills
        document.querySelectorAll('.dict-cat-pill').forEach(btn => {
            btn.addEventListener('click', () => {
                const cat = btn.getAttribute('data-cat') || 'all';
                dictActiveCategory = cat;
                document.querySelectorAll('.dict-cat-pill').forEach(b => {
                    const isSel = (b.getAttribute('data-cat') === cat);
                    b.className = isSel
                        ? "dict-cat-pill px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-600 text-white cursor-pointer transition shadow"
                        : "dict-cat-pill px-2.5 py-1 rounded-md text-[11px] font-medium bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 cursor-pointer transition";
                });
                const inp = document.getElementById('dict-search-input');
                runDictionarySearch(inp ? inp.value : '', cat);
            });
        });

        // Filter Type in Canvas
        const filterTypeSel = document.getElementById('graphrag-filter-type');
        if (filterTypeSel) {
            filterTypeSel.addEventListener('change', (e) => {
                const val = e.target.value;
                if (!window.graphRagEngine || !window.graphRagVisualizer) return;
                if (val === 'all') {
                    window.graphRagVisualizer.resetData(window.graphRagEngine.nodes, window.graphRagEngine.edges);
                } else {
                    const filteredNodes = window.graphRagEngine.nodes.filter(n => n.type === val);
                    const filteredNodeIds = new Set(filteredNodes.map(n => n.id));
                    const filteredEdges = window.graphRagEngine.edges.filter(ed => filteredNodeIds.has(ed.source) && filteredNodeIds.has(ed.target));
                    window.graphRagVisualizer.resetData(filteredNodes, filteredEdges);
                }
            });
        }

        // Document Search Input (Debounced)
        const searchInput = document.getElementById('rag-search-input');
        let searchDebounceTimer = null;
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchDebounceTimer);
                searchDebounceTimer = setTimeout(() => {
                    renderRagDocList(e.target.value);
                }, 120);
            });
        }

        // Backdrop click to close
        const modal = document.getElementById('rag-modal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) closeRagModal();
            });
        }
    }

    document.addEventListener('DOMContentLoaded', initRagEvents);

    window.openRagModal = openRagModal;
    window.closeRagModal = closeRagModal;
    window.switchRagTab = switchRagTab;
    window.getStorageDocs = getStorageDocs;
    window.renderRagDocList = renderRagDocList;
    window.renderRagCategoryTabs = renderRagCategoryTabs;
    window.rebuildGraphRAGAction = rebuildGraphRAGAction;
    window.openAddTriplePrompt = openAddTriplePrompt;
    window.exportGraphRAGAction = exportGraphRAGAction;
    window.triggerImportGraphRAG = triggerImportGraphRAG;
    window.runGraphRAGTestSearch = runGraphRAGTestSearch;
    window.runDictionarySearch = runDictionarySearch;
    window.loadCuratedRagPack = loadCuratedRagPack;
})();
