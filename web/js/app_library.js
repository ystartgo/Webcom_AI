// ================================================================
// Webcom AI - App Library (Custom Apps & Sandbox) Module
// Author: startgo (startgo@yia.app) | License: GPLv3
// ================================================================

(function () {
    const APPS_STORAGE_KEY = 'webcom_custom_apps_v2';
    let currentFilterCat = 'all';
    let appToDeleteId = null;

    function getSampleCustomApps() {
        return [
            {
                id: 'app_pomodoro_timer',
                title: '番茄工作法極簡專注計時器',
                category: 'html',
                description: '具備 25 分鐘工作、5 分鐘短休息與客製時間切換，支援沙箱純本地運行。',
                author: 'Webcom Starter',
                createdAt: new Date().toISOString(),
                code: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Pomodoro</title>
<style>
body { font-family: sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
.card { background: #1e293b; padding: 2rem; border-radius: 1rem; text-align: center; border: 1px solid #334155; }
.time { font-size: 3.5rem; font-family: monospace; font-weight: bold; margin: 1rem 0; color: #a855f7; }
button { background: #9333ea; color: white; border: none; padding: 0.5rem 1.2rem; border-radius: 0.5rem; font-size: 1rem; cursor: pointer; margin: 0.2rem; }
button:hover { background: #a855f7; }
</style>
</head>
<body>
<div class="card">
  <h2>🍅 Pomodoro Focus Timer</h2>
  <div class="time" id="disp">25:00</div>
  <div>
    <button onclick="toggle()">開始 / 暫停</button>
    <button onclick="reset()">重設</button>
  </div>
</div>
<script>
let sec = 1500, timer = null;
function update() {
  const m = Math.floor(sec/60).toString().padStart(2,'0');
  const s = (sec%60).toString().padStart(2,'0');
  document.getElementById('disp').textContent = m + ':' + s;
}
function toggle() {
  if (timer) { clearInterval(timer); timer = null; }
  else { timer = setInterval(() => { if (sec>0) { sec--; update(); } else { clearInterval(timer); alert('Time up!'); } }, 1000); }
}
function reset() { if (timer) clearInterval(timer); timer = null; sec = 1500; update(); }
</script>
</body>
</html>`
            },
            {
                id: 'app_json_formatter',
                title: 'JSON 格式化與美化工具',
                category: 'html',
                description: '純前端無損解析、排版與驗證 JSON 字串，支援一鍵壓縮與複製。',
                author: 'Webcom Starter',
                createdAt: new Date().toISOString(),
                code: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>JSON Formatter</title>
<style>
body { font-family: monospace; background: #090d16; color: #e2e8f0; padding: 1.5rem; }
textarea { width: 100%; height: 200px; background: #111827; color: #38bdf8; border: 1px solid #374151; border-radius: 0.5rem; padding: 0.75rem; }
button { background: #0284c7; color: white; border: none; padding: 0.5rem 1rem; border-radius: 0.375rem; cursor: pointer; margin-right: 0.5rem; }
</style>
</head>
<body>
<h3>✨ JSON Formatter</h3>
<textarea id="inp" placeholder='Paste raw JSON here...'></textarea>
<div style="margin: 0.5rem 0;">
  <button onclick="format()">Beautify (2 Spaces)</button>
  <button onclick="minify()">Minify</button>
</div>
<script>
function format() {
  const el = document.getElementById('inp');
  try { el.value = JSON.stringify(JSON.parse(el.value), null, 2); }
  catch(e) { alert('Invalid JSON: ' + e.message); }
}
function minify() {
  const el = document.getElementById('inp');
  try { el.value = JSON.stringify(JSON.parse(el.value)); }
  catch(e) { alert('Invalid JSON: ' + e.message); }
}
</script>
</body>
</html>`
            },
            {
                id: 'app_py_fib',
                title: 'Python 數列生成與視覺化',
                category: 'py',
                description: '利用 Pyodide WASM 計算與展示數列前 50 項數值。',
                author: 'Webcom Starter',
                createdAt: new Date().toISOString(),
                code: `# Python Fibonacci Sequence Generator
def fib(n):
    a, b = 0, 1
    res = []
    for _ in range(n):
        res.append(a)
        a, b = b, a + b
    return res

nums = fib(25)
print("Fibonacci (First 25 items):")
for i, val in enumerate(nums, 1):
    print(f"[{i:02d}]: {val}")
`
            }
        ];
    }

    function loadCustomAppsFromStorage() {
        try {
            const raw = localStorage.getItem(APPS_STORAGE_KEY);
            if (raw) return JSON.parse(raw);
        } catch (e) {}
        const samples = getSampleCustomApps();
        saveCustomAppsToStorage(samples);
        return samples;
    }

    function saveCustomAppsToStorage(apps) {
        localStorage.setItem(APPS_STORAGE_KEY, JSON.stringify(apps));
    }

    function openAppLibraryModal() {
        const modal = document.getElementById('app-library-modal');
        renderAppLibraryGrid();
        if (modal) modal.classList.remove('hidden');
        if (window.lucide) lucide.createIcons();
    }

    function closeAppLibraryModal() {
        const modal = document.getElementById('app-library-modal');
        if (modal) modal.classList.add('hidden');
    }

    function filterAppLibraryCategory(cat, btnEl) {
        currentFilterCat = cat;
        document.querySelectorAll('.app-lib-filter-btn').forEach(b => {
            b.className = 'app-lib-filter-btn px-2.5 py-1 rounded-lg font-medium transition text-gray-400 hover:text-white hover:bg-gray-800';
        });
        if (btnEl) {
            btnEl.className = 'app-lib-filter-btn px-2.5 py-1 rounded-lg font-medium transition bg-violet-600 text-white';
        }
        renderAppLibraryGrid();
    }

    function renderAppLibraryGrid(searchQuery = '') {
        const grid = document.getElementById('app-lib-grid');
        const empty = document.getElementById('app-lib-empty');
        const badge = document.getElementById('app-lib-count-badge');
        if (!grid) return;

        let apps = loadCustomAppsFromStorage();
        const isEn = (window.currentLang === 'en');

        if (currentFilterCat !== 'all') {
            apps = apps.filter(a => (a.category || 'html') === currentFilterCat);
        }

        if (searchQuery && searchQuery.trim()) {
            const q = searchQuery.trim().toLowerCase();
            apps = apps.filter(a => (a.title && a.title.toLowerCase().includes(q)) || (a.description && a.description.toLowerCase().includes(q)));
        }

        if (badge) badge.textContent = isEn ? `${apps.length} apps` : `${apps.length} 個應用`;

        grid.innerHTML = '';
        if (apps.length === 0) {
            if (empty) empty.classList.remove('hidden');
            return;
        }
        if (empty) empty.classList.add('hidden');

        apps.forEach(app => {
            const card = document.createElement('div');
            card.className = "bg-gray-900 border border-gray-800 hover:border-violet-500/50 rounded-xl p-4 flex flex-col justify-between transition-all duration-200 shadow-md group";

            const catLabel = app.category ? app.category.toUpperCase() : 'APP';
            card.innerHTML = `
                <div>
                    <div class="flex items-center justify-between gap-2 mb-2">
                        <span class="text-xs font-bold text-violet-400 font-mono px-2 py-0.5 rounded bg-violet-950/70 border border-violet-800/40">${catLabel}</span>
                        <div class="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
                            <button type="button" class="btn-run-app px-2 py-0.5 rounded bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/50 text-[11px] font-bold flex items-center gap-1 cursor-pointer">
                                <span>▶</span> <span>${isEn ? 'Run' : '執行'}</span>
                            </button>
                            <button type="button" class="btn-edit-app p-1 rounded hover:bg-gray-800 text-gray-400 hover:text-white transition" title="${isEn ? 'Edit' : '編輯'}">
                                <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
                            </button>
                            <button type="button" class="btn-delete-app p-1 rounded hover:bg-gray-800 text-gray-400 hover:text-rose-400 transition" title="${isEn ? 'Delete' : '刪除'}">
                                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                            </button>
                        </div>
                    </div>
                    <h3 class="text-sm font-bold text-white group-hover:text-violet-300 transition truncate">${app.title}</h3>
                    <p class="text-xs text-gray-400 mt-1 line-clamp-2 leading-relaxed">${app.description || (isEn ? 'No description' : '無描述')}</p>
                </div>
                <div class="mt-3 pt-2.5 border-t border-gray-800/80 flex items-center justify-between text-[10px] text-gray-500 font-mono">
                    <span>${app.author || 'User'}</span>
                    <span>${(app.createdAt || '').slice(0, 10)}</span>
                </div>
            `;

            card.querySelector('.btn-run-app')?.addEventListener('click', () => runCustomAppInSandbox(app));
            card.querySelector('.btn-edit-app')?.addEventListener('click', () => openEditCustomAppModal(app));
            card.querySelector('.btn-delete-app')?.addEventListener('click', () => confirmDeleteAppAction(app.id));

            grid.appendChild(card);
        });

        if (window.lucide) lucide.createIcons();
    }

    function runCustomAppInSandbox(app) {
        if (app.category === 'py') {
            // Send to Pyodide terminal
            if (window.sendPyodideCode) {
                window.sendPyodideCode(app.code);
            } else {
                const termInput = document.getElementById('term-input');
                if (termInput) {
                    termInput.value = app.code;
                    document.getElementById('btn-term-send')?.click();
                }
            }
            closeAppLibraryModal();
            return;
        }

        // HTML App: open in sandbox window / artifact drawer
        if (window.openArtifactWithContent) {
            window.openArtifactWithContent(app.id, app.title, app.code);
            closeAppLibraryModal();
        } else {
            const blob = new Blob([app.code], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');
        }
    }

    function openEditCustomAppModal(app) {
        const modal = document.getElementById('app-edit-modal');
        const titleEl = document.getElementById('edit-app-title');
        const catEl = document.getElementById('edit-app-category');
        const descEl = document.getElementById('edit-app-desc');
        const codeEl = document.getElementById('edit-app-code');
        const idEl = document.getElementById('edit-app-id');

        if (app) {
            if (idEl) idEl.value = app.id;
            if (titleEl) titleEl.value = app.title;
            if (catEl) catEl.value = app.category || 'html';
            if (descEl) descEl.value = app.description || '';
            if (codeEl) codeEl.value = app.code || '';
        } else {
            if (idEl) idEl.value = '';
            if (titleEl) titleEl.value = '';
            if (catEl) catEl.value = 'html';
            if (descEl) descEl.value = '';
            if (codeEl) codeEl.value = '<!DOCTYPE html>\n<html>\n<head><meta charset="utf-8"></head>\n<body>\n  <h1>Hello App</h1>\n</body>\n</html>';
        }

        if (modal) modal.classList.remove('hidden');
    }

    function closeAppEditModal() {
        const modal = document.getElementById('app-edit-modal');
        if (modal) modal.classList.add('hidden');
    }

    function saveCustomAppFromModal() {
        const idEl = document.getElementById('edit-app-id');
        const titleEl = document.getElementById('edit-app-title');
        const catEl = document.getElementById('edit-app-category');
        const descEl = document.getElementById('edit-app-desc');
        const codeEl = document.getElementById('edit-app-code');

        const title = titleEl?.value.trim();
        const code = codeEl?.value.trim();
        if (!title || !code) {
            alert(window.currentLang === 'en' ? 'Please provide both title and code.' : '請填寫應用名稱與代碼內容！');
            return;
        }

        const apps = loadCustomAppsFromStorage();
        const existingId = idEl?.value.trim();

        if (existingId) {
            const idx = apps.findIndex(a => a.id === existingId);
            if (idx !== -1) {
                apps[idx].title = title;
                apps[idx].category = catEl?.value || 'html';
                apps[idx].description = descEl?.value || '';
                apps[idx].code = code;
                apps[idx].updatedAt = new Date().toISOString();
            }
        } else {
            apps.unshift({
                id: 'app_' + Date.now(),
                title: title,
                category: catEl?.value || 'html',
                description: descEl?.value || '',
                code: code,
                createdAt: new Date().toISOString()
            });
        }

        saveCustomAppsToStorage(apps);
        closeAppEditModal();
        renderAppLibraryGrid();
    }

    function confirmDeleteAppAction(id) {
        appToDeleteId = id;
        const modal = document.getElementById('app-delete-modal');
        if (modal) modal.classList.remove('hidden');
        else {
            if (confirm(window.currentLang === 'en' ? 'Delete this app?' : '確定刪除此應用？')) {
                executeDeleteApp();
            }
        }
    }

    function executeDeleteApp() {
        if (!appToDeleteId) return;
        const apps = loadCustomAppsFromStorage().filter(a => a.id !== appToDeleteId);
        saveCustomAppsToStorage(apps);
        appToDeleteId = null;
        closeAppDeleteModal();
        renderAppLibraryGrid();
    }

    function closeAppDeleteModal() {
        const modal = document.getElementById('app-delete-modal');
        if (modal) modal.classList.add('hidden');
        appToDeleteId = null;
    }

    function loadSampleAppsAction() {
        const samples = getSampleCustomApps();
        saveCustomAppsToStorage(samples);
        renderAppLibraryGrid();
        alert(window.currentLang === 'en' ? 'Sample apps restored!' : '範本應用已成功載入！');
    }

    function exportCustomAppsAction() {
        const apps = loadCustomAppsFromStorage();
        const blob = new Blob([JSON.stringify(apps, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `webcom_apps_backup_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function initAppLibraryEvents() {
        const btnOpen = document.getElementById('btn-open-app-lib');
        if (btnOpen) btnOpen.addEventListener('click', openAppLibraryModal);

        const btnClose = document.getElementById('btn-close-app-lib');
        if (btnClose) btnClose.addEventListener('click', closeAppLibraryModal);

        const searchInp = document.getElementById('app-lib-search-input');
        if (searchInp) {
            searchInp.addEventListener('input', (e) => {
                renderAppLibraryGrid(e.target.value);
            });
        }

        const modal = document.getElementById('app-library-modal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) closeAppLibraryModal();
            });
        }
    }

    document.addEventListener('DOMContentLoaded', initAppLibraryEvents);

    window.openAppLibraryModal = openAppLibraryModal;
    window.closeAppLibraryModal = closeAppLibraryModal;
    window.openEditCustomAppModal = openEditCustomAppModal;
    window.closeAppEditModal = closeAppEditModal;
    window.saveCustomAppFromModal = saveCustomAppFromModal;
    window.confirmDeleteAppAction = confirmDeleteAppAction;
    window.executeDeleteApp = executeDeleteApp;
    window.closeAppDeleteModal = closeAppDeleteModal;
    window.filterAppLibraryCategory = filterAppLibraryCategory;
    window.loadSampleAppsAction = loadSampleAppsAction;
    window.exportCustomAppsAction = exportCustomAppsAction;
    window.runCustomAppInSandbox = runCustomAppInSandbox;
})();
