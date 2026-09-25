// ================================================================
// Webcom AI - App Library (Custom Apps & Sandbox) Module
// Author: startgo (startgo@yia.app) | License: GPLv3
// ================================================================

(function () {
    const APPS_STORAGE_KEY = 'webcom_custom_apps_v2';
    let currentFilterCat = 'all';
    let appToDeleteId = null;

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function getStarterTemplateForCategory(cat) {
        switch (cat) {
            case 'py':
                return `# Python Fibonacci Sequence Generator\ndef fib(n):\n    a, b = 0, 1\n    res = []\n    for _ in range(n):\n        res.append(a)\n        a, b = b, a + b\n    return res\n\nnums = fib(25)\nprint("Fibonacci (First 25 items):")\nfor i, val in enumerate(nums, 1):\n    print(f"[{i:02d}]: {val}")\n`;
            case 'sh':
                return `@echo off\necho ======================================\necho Webcom AI - Shell / Batch Runner\necho Current Directory: %CD%\necho ======================================\ndir /b\n`;
            case 'json':
                return `{\n  "appName": "示範資料集",\n  "version": "1.0.0",\n  "status": "active",\n  "records": [\n    { "id": 1, "title": "Data Record 1", "score": 98.5 },\n    { "id": 2, "title": "Data Record 2", "score": 92.0 }\n  ]\n}\n`;
            case 'prompt':
                return `你是一位專業的高級全端架構師與 Python 專家。\n請遵循精確、安全、高效與清晰的原則回答問題，提供具體可執行的程式範例與解法。\n`;
            case 'html':
            default:
                return `<!DOCTYPE html>\n<html>\n<head>\n  <meta charset="utf-8">\n  <title>自訂小工具</title>\n  <style>\n    body { font-family: sans-serif; background: #0f172a; color: white; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }\n    .card { background: #1e293b; padding: 2rem; border-radius: 1rem; text-align: center; border: 1px solid #334155; shadow: 0 10px 25px rgba(0,0,0,0.5); }\n    button { background: #6366f1; color: white; border: none; padding: 0.5rem 1.2rem; border-radius: 0.5rem; cursor: pointer; font-weight: bold; }\n    button:hover { background: #4f46e5; }\n  </style>\n</head>\n<body>\n  <div class="card">\n    <h2>⚡ 自建應用程式</h2>\n    <p>純前端沙箱執行成功！</p>\n    <button onclick="alert('點擊成功！')">測試互動</button>\n  </div>\n</body>\n</html>`;
        }
    }

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
                    <h3 class="text-sm font-bold text-white group-hover:text-violet-300 transition truncate">${escapeHtml(app.title)}</h3>
                    <p class="text-xs text-gray-400 mt-1 line-clamp-2 leading-relaxed">${escapeHtml(app.description || (isEn ? 'No description' : '無描述'))}</p>
                </div>
                <div class="mt-3 pt-2.5 border-t border-gray-800/80 flex items-center justify-between text-[10px] text-gray-500 font-mono">
                    <span>${escapeHtml(app.author || 'User')}</span>
                    <span>${escapeHtml((app.createdAt || '').slice(0, 10))}</span>
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
        if (!app) return;
        closeAppLibraryModal();

        if (app.category === 'py') {
            // Open in Artifact Drawer with live Python Sandbox Runner
            if (window.openArtifactWithContent) {
                window.openArtifactWithContent(app.id, app.title, app.code, 'py');
            }
            // And also log to terminal #3-PY session
            if (window.sendPyodideCode) {
                window.sendPyodideCode(app.code, app.title);
            }
            return;
        }

        // HTML App / Web App: open in sandbox window / artifact drawer
        if (window.openArtifactWithContent) {
            window.openArtifactWithContent(app.id, app.title, app.code, app.category || 'html');
        } else {
            const blob = new Blob([app.code], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');
        }
    }

    function updateCodeStats() {
        const codeEl = document.getElementById('app-edit-code') || document.getElementById('edit-app-code');
        const statsEl = document.getElementById('app-edit-code-stats');
        if (!codeEl || !statsEl) return;
        const text = codeEl.value || '';
        const lines = text ? text.split('\n').length : 0;
        const chars = text.length;
        const isZh = (window.currentLang !== 'en');
        statsEl.textContent = isZh ? `${lines} 行 · ${chars} 字` : `${lines} lines · ${chars} chars`;
    }

    function openEditCustomAppModal(app) {
        const modal = document.getElementById('app-edit-modal');
        const titleEl = document.getElementById('app-edit-name') || document.getElementById('edit-app-title');
        const catEl = document.getElementById('app-edit-category') || document.getElementById('edit-app-category');
        const descEl = document.getElementById('app-edit-desc') || document.getElementById('edit-app-desc');
        const codeEl = document.getElementById('app-edit-code') || document.getElementById('edit-app-code');
        const idEl = document.getElementById('app-edit-id') || document.getElementById('edit-app-id');
        const promptEl = document.getElementById('app-edit-prompt');
        const iconEl = document.getElementById('app-edit-icon');
        const verEl = document.getElementById('app-edit-version');
        const internalIdEl = document.getElementById('app-edit-internal-id');
        const modalTitleEl = document.getElementById('app-edit-modal-title');

        const isZh = (window.currentLang !== 'en');

        if (app) {
            if (internalIdEl) internalIdEl.value = app.id || '';
            if (idEl) {
                idEl.value = app.id || '';
                idEl.disabled = true;
            }
            if (titleEl) titleEl.value = app.title || '';
            if (catEl) catEl.value = app.category || 'html';
            if (descEl) descEl.value = app.description || '';
            if (codeEl) codeEl.value = app.code || '';
            if (promptEl) promptEl.value = app.prompt || '';
            if (iconEl) iconEl.value = app.icon || '⚡';
            if (verEl) verEl.value = app.version || 'v1.0';
            if (modalTitleEl) modalTitleEl.textContent = isZh ? '編輯自訂應用程式' : 'Edit Custom App';
        } else {
            const newId = 'app_' + Date.now();
            if (internalIdEl) internalIdEl.value = '';
            if (idEl) {
                idEl.value = newId;
                idEl.disabled = false;
            }
            if (titleEl) titleEl.value = '';
            if (catEl) catEl.value = 'html';
            if (descEl) descEl.value = '';
            if (codeEl) codeEl.value = getStarterTemplateForCategory('html');
            if (promptEl) promptEl.value = '';
            if (iconEl) iconEl.value = '⚡';
            if (verEl) verEl.value = 'v1.0';
            if (modalTitleEl) modalTitleEl.textContent = isZh ? '新建自訂應用程式' : 'New Custom App';
        }

        updateCodeStats();
        if (modal) modal.classList.remove('hidden');
        if (window.lucide) lucide.createIcons();
    }

    function closeAppEditModal() {
        const modal = document.getElementById('app-edit-modal');
        if (modal) modal.classList.add('hidden');
    }

    function previewCustomAppFromModal() {
        const titleEl = document.getElementById('app-edit-name') || document.getElementById('edit-app-title');
        const catEl = document.getElementById('app-edit-category') || document.getElementById('edit-app-category');
        const codeEl = document.getElementById('app-edit-code') || document.getElementById('edit-app-code');
        const idEl = document.getElementById('app-edit-id') || document.getElementById('edit-app-id');

        const title = titleEl?.value.trim() || '預覽自建應用';
        const code = codeEl?.value || '';
        const cat = catEl?.value || 'html';
        const id = idEl?.value.trim() || ('preview_' + Date.now());

        if (!code) {
            alert(window.currentLang === 'en' ? 'Please enter code before preview.' : '請輸入代碼後再進行預覽！');
            return;
        }

        if (window.openArtifactWithContent) {
            window.openArtifactWithContent(id, title, code, cat);
        }
    }

    function saveCustomAppFromModal() {
        const titleEl = document.getElementById('app-edit-name') || document.getElementById('edit-app-title');
        const catEl = document.getElementById('app-edit-category') || document.getElementById('edit-app-category');
        const descEl = document.getElementById('app-edit-desc') || document.getElementById('edit-app-desc');
        const codeEl = document.getElementById('app-edit-code') || document.getElementById('edit-app-code');
        const idEl = document.getElementById('app-edit-id') || document.getElementById('edit-app-id');
        const promptEl = document.getElementById('app-edit-prompt');
        const iconEl = document.getElementById('app-edit-icon');
        const verEl = document.getElementById('app-edit-version');
        const internalIdEl = document.getElementById('app-edit-internal-id');

        const title = titleEl?.value.trim();
        const code = codeEl?.value.trim();
        if (!title || !code) {
            alert(window.currentLang === 'en' ? 'Please provide both title and code.' : '請填寫應用名稱與代碼內容！');
            return;
        }

        const apps = loadCustomAppsFromStorage();
        const existingId = internalIdEl?.value.trim() || idEl?.value.trim();
        const appPayload = {
            id: existingId || ('app_' + Date.now()),
            title: title,
            category: catEl?.value || 'html',
            description: descEl?.value || '',
            code: code,
            prompt: promptEl?.value || '',
            icon: iconEl?.value || '⚡',
            version: verEl?.value || 'v1.0',
            updatedAt: new Date().toISOString()
        };

        const idx = apps.findIndex(a => a.id === appPayload.id);
        if (idx !== -1) {
            apps[idx] = { ...apps[idx], ...appPayload };
        } else {
            appPayload.createdAt = new Date().toISOString();
            apps.unshift(appPayload);
        }

        saveCustomAppsToStorage(apps);
        closeAppEditModal();
        renderAppLibraryGrid();
    }

    function confirmDeleteAppAction(id) {
        appToDeleteId = id;
        const apps = loadCustomAppsFromStorage();
        const app = apps.find(a => a.id === id);
        const targetEl = document.getElementById('app-delete-modal-target');
        if (targetEl && app) {
            targetEl.innerHTML = `
                <div class="font-bold text-white text-sm">${escapeHtml(app.title)}</div>
                <div class="text-gray-400 text-xs mt-1">ID: <span class="font-mono text-violet-300">${escapeHtml(app.id)}</span> · 類型: <span class="uppercase text-emerald-400 font-bold">${escapeHtml(app.category || 'html')}</span></div>
                <div class="text-gray-400 text-[11px] mt-1 line-clamp-2">${escapeHtml(app.description || '')}</div>
            `;
        }
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

    function triggerImportApps() {
        const fileInp = document.getElementById('file-import-apps');
        if (fileInp) {
            fileInp.value = '';
            fileInp.click();
        }
    }

    function initAppLibraryEvents() {
        // Modal toggles
        document.getElementById('btn-open-app-lib')?.addEventListener('click', openAppLibraryModal);
        document.getElementById('btn-close-app-lib')?.addEventListener('click', closeAppLibraryModal);
        document.getElementById('btn-close-app-lib-footer')?.addEventListener('click', closeAppLibraryModal);

        // Search input
        const searchInp = document.getElementById('app-lib-search-input');
        if (searchInp) {
            searchInp.addEventListener('input', (e) => {
                renderAppLibraryGrid(e.target.value);
            });
        }

        // App Library Backdrop Click
        const modal = document.getElementById('app-library-modal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) closeAppLibraryModal();
            });
        }

        // Edit Modal Events
        document.getElementById('btn-new-custom-app')?.addEventListener('click', () => openEditCustomAppModal(null));
        document.getElementById('btn-close-app-edit')?.addEventListener('click', closeAppEditModal);
        document.getElementById('btn-cancel-custom-app')?.addEventListener('click', closeAppEditModal);
        document.getElementById('btn-save-custom-app')?.addEventListener('click', saveCustomAppFromModal);
        document.getElementById('btn-preview-custom-app')?.addEventListener('click', previewCustomAppFromModal);

        // Delete Modal Events
        document.getElementById('btn-confirm-app-delete')?.addEventListener('click', executeDeleteApp);
        document.getElementById('btn-cancel-app-delete')?.addEventListener('click', closeAppDeleteModal);

        // Edit Modal Code Stats & Sample Snippets
        const codeArea = document.getElementById('app-edit-code') || document.getElementById('edit-app-code');
        if (codeArea) {
            codeArea.addEventListener('input', updateCodeStats);
        }

        const catSelect = document.getElementById('app-edit-category') || document.getElementById('edit-app-category');
        if (catSelect && codeArea) {
            catSelect.addEventListener('change', () => {
                if (!codeArea.value.trim() || codeArea.value.includes('自訂小工具') || codeArea.value.includes('Fibonacci') || codeArea.value.includes('=== Webcom AI')) {
                    codeArea.value = getStarterTemplateForCategory(catSelect.value);
                    updateCodeStats();
                }
            });
        }

        document.getElementById('btn-app-edit-sample-code')?.addEventListener('click', () => {
            if (codeArea && catSelect) {
                codeArea.value = getStarterTemplateForCategory(catSelect.value);
                updateCodeStats();
            }
        });

        document.getElementById('btn-app-edit-copy-code')?.addEventListener('click', () => {
            if (codeArea && codeArea.value) {
                navigator.clipboard?.writeText(codeArea.value);
                alert(window.currentLang === 'en' ? 'Code copied to clipboard!' : '代碼已複製至剪貼簿！');
            }
        });

        // Import Backup JSON File
        const fileImport = document.getElementById('file-import-apps');
        if (fileImport) {
            fileImport.addEventListener('change', (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (evt) => {
                    try {
                        const imported = JSON.parse(evt.target.result);
                        if (Array.isArray(imported)) {
                            const existing = loadCustomAppsFromStorage();
                            const map = new Map(existing.map(a => [a.id, a]));
                            imported.forEach(a => { if (a && a.id && a.title) map.set(a.id, a); });
                            const merged = Array.from(map.values());
                            saveCustomAppsToStorage(merged);
                            renderAppLibraryGrid();
                            alert(window.currentLang === 'en' ? `Successfully imported ${imported.length} apps!` : `成功匯入 ${imported.length} 個應用程式！`);
                        } else {
                            alert('JSON 格式錯誤：根項目必須為應用陣列 (Array)。');
                        }
                    } catch (err) {
                        alert('匯入失敗：無效的 JSON 檔案 - ' + err.message);
                    }
                };
                reader.readAsText(file);
            });
        }
    }

    document.addEventListener('DOMContentLoaded', initAppLibraryEvents);

    window.openAppLibraryModal = openAppLibraryModal;
    window.closeAppLibraryModal = closeAppLibraryModal;
    window.openEditCustomAppModal = openEditCustomAppModal;
    window.closeAppEditModal = closeAppEditModal;
    window.saveCustomAppFromModal = saveCustomAppFromModal;
    window.previewCustomAppFromModal = previewCustomAppFromModal;
    window.confirmDeleteAppAction = confirmDeleteAppAction;
    window.executeDeleteApp = executeDeleteApp;
    window.closeAppDeleteModal = closeAppDeleteModal;
    window.filterAppLibraryCategory = filterAppLibraryCategory;
    window.loadSampleAppsAction = loadSampleAppsAction;
    window.exportCustomAppsAction = exportCustomAppsAction;
    window.triggerImportApps = triggerImportApps;
    window.runCustomAppInSandbox = runCustomAppInSandbox;
})();
