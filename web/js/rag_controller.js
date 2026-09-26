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
            'search': document.getElementById('rag-tab-content-search')
        };

        Object.keys(pages).forEach(key => {
            if (pages[key]) {
                pages[key].classList.toggle('hidden', key !== tabId);
            }
        });

        if (tabId === 'graph') {
            setTimeout(() => initOrRefreshGraphCanvas(), 60);
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

        docs.forEach(doc => {
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

        // Document Search Input
        const searchInput = document.getElementById('rag-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => renderRagDocList(e.target.value));
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
})();
