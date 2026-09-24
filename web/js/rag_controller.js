// ================================================================
// Webcom AI - RAG Knowledge Base Controller Module
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
        if (modal) modal.classList.remove('hidden');
    }

    function closeRagModal() {
        const modal = document.getElementById('rag-modal');
        if (modal) modal.classList.add('hidden');
    }

    function renderRagCategoryTabs() {
        const tabsEl = document.getElementById('rag-category-tabs');
        if (!tabsEl) return;
        const docs = getStorageDocs();
        tabsEl.innerHTML = '';
        const isEn = (window.currentLang === 'en');

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
        const isEn = (window.currentLang === 'en');

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

        const isEn = (window.currentLang === 'en');

        if (!title || !content) {
            alert(isEn ? 'Please fill in both title and content.' : '請填寫文件標題與內容！');
            return;
        }

        const docs = getStorageDocs();
        docs.unshift({
            id: 'doc_' + Date.now(),
            title: title,
            category: category,
            content: content
        });

        saveStorageDocs(docs);
        if (titleInput) titleInput.value = '';
        if (contentInput) contentInput.value = '';

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
        const isEn = (window.currentLang === 'en');
        const targetDocs = activeRagCategory === 'all'
            ? docs
            : docs.filter(d => (d.category || 'general_knowledge') === activeRagCategory);

        const pack = {
            format: 'ragpack',
            version: '1.0',
            exportedAt: new Date().toISOString(),
            category: activeRagCategory,
            documents: targetDocs
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
                    }
                });

                saveStorageDocs(currentDocs);
                renderRagCategoryTabs();
                renderRagDocList();
                alert(window.currentLang === 'en'
                    ? `Successfully imported ${addedCount} document(s)!`
                    : `成功匯入 ${addedCount} 篇知識文件！`);
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

    function initRagEvents() {
        const btnOpen = document.getElementById('btn-open-rag');
        if (btnOpen) btnOpen.addEventListener('click', openRagModal);

        const btnClose = document.getElementById('btn-close-rag');
        if (btnClose) btnClose.addEventListener('click', closeRagModal);

        const btnAdd = document.getElementById('btn-add-rag-doc');
        if (btnAdd) btnAdd.addEventListener('click', addRagDocument);

        const btnExport = document.getElementById('btn-export-ragpack');
        if (btnExport) btnExport.addEventListener('click', exportRagPack);

        const btnImport = document.getElementById('btn-import-ragpack');
        const fileImport = document.getElementById('file-import-ragpack');
        if (btnImport && fileImport) {
            btnImport.addEventListener('click', () => fileImport.click());
            fileImport.addEventListener('change', (e) => {
                if (e.target.files && e.target.files[0]) {
                    importRagPackFromFile(e.target.files[0]);
                    e.target.value = '';
                }
            });
        }

        const btnUpload = document.getElementById('btn-upload-rag-file');
        const fileUpload = document.getElementById('file-rag-upload');
        if (btnUpload && fileUpload) {
            btnUpload.addEventListener('click', () => fileUpload.click());
            fileUpload.addEventListener('change', (e) => {
                if (e.target.files && e.target.files[0]) {
                    handleFileUpload(e.target.files[0]);
                    e.target.value = '';
                }
            });
        }

        const searchInput = document.getElementById('rag-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                renderRagDocList(e.target.value);
            });
        }

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
    window.getStorageDocs = getStorageDocs;
    window.renderRagDocList = renderRagDocList;
    window.renderRagCategoryTabs = renderRagCategoryTabs;
})();
