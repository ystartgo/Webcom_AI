// ================================================================
// Webcom AI - Artifact Workbench Drawer & Diff Controller Module
// Author: startgo (startgo@yia.app) | License: GPLv3
// ================================================================

(function () {
    const globalArtifactStore = new Map();
    let lastActiveArtifactId = null;
    let currentDrawerLayoutMode = 'preview'; // 'preview' | 'split' | 'code' | 'diff'
    let currentDeviceWidth = '100%';

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function ensureArtifactVersions(art) {
        if (!art.versions || !Array.isArray(art.versions) || art.versions.length === 0) {
            art.versions = [{
                version: 1,
                content: art.fullContent || '',
                author: 'ai',
                actionType: 'init',
                summary: 'Initial Generation',
                timestamp: art.createdAt || Date.now(),
                lines: (art.fullContent || '').split('\n').length,
                chars: (art.fullContent || '').length
            }];
            art.activeVersion = 1;
        }
    }

    function computeLineDiff(oldText, newText) {
        const a = oldText ? oldText.split('\n') : [];
        const b = newText ? newText.split('\n') : [];
        const n = a.length;
        const m = b.length;

        if (oldText === newText) {
            return {
                added: 0,
                removed: 0,
                lines: a.map((l, i) => ({ type: 'same', text: l, lineA: i + 1, lineB: i + 1 }))
            };
        }

        const dp = Array.from({ length: Math.min(n + 1, 500) }, () => new Int32Array(Math.min(m + 1, 500)));
        const maxN = Math.min(n, 499);
        const maxM = Math.min(m, 499);

        for (let i = 0; i < maxN; i++) {
            for (let j = 0; j < maxM; j++) {
                if (a[i] === b[j]) dp[i + 1][j + 1] = dp[i][j] + 1;
                else dp[i + 1][j + 1] = Math.max(dp[i + 1][j], dp[i][j + 1]);
            }
        }

        let i = maxN, j = maxM;
        const diff = [];
        let added = 0, removed = 0;

        while (i > 0 || j > 0) {
            if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
                diff.unshift({ type: 'same', text: a[i - 1], lineA: i, lineB: j });
                i--; j--;
            } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
                diff.unshift({ type: 'add', text: b[j - 1], lineB: j });
                added++; j--;
            } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
                diff.unshift({ type: 'del', text: a[i - 1], lineA: i });
                removed++; i--;
            }
        }

        return { added, removed, lines: diff };
    }

    function renderDrawerContent(art) {
        if (!art) return;
        ensureArtifactVersions(art);

        const curVerObj = art.versions.find(v => v.version === (art.activeVersion || art.versions.length)) || art.versions[art.versions.length - 1];
        const content = curVerObj.content || art.fullContent || '';

        // 1. Update Preview iframe
        const iframe = document.getElementById('drawer-artifact-iframe');
        const nonHtmlBox = document.getElementById('drawer-artifact-nonhtml');
        const nonHtmlText = document.getElementById('drawer-artifact-nonhtml-text');

        if (art.type === 'html' || art.language === 'html' || content.includes('<html') || content.includes('<!DOCTYPE')) {
            if (iframe) {
                iframe.classList.remove('hidden');
                iframe.srcdoc = content;
            }
            if (nonHtmlBox) nonHtmlBox.classList.add('hidden');
        } else {
            if (iframe) iframe.classList.add('hidden');
            if (nonHtmlBox) {
                nonHtmlBox.classList.remove('hidden');
                if (nonHtmlText) nonHtmlText.textContent = content;
            }
        }

        // 2. Update Code textarea / display
        const codeTextarea = document.getElementById('drawer-code-textarea');
        if (codeTextarea) {
            codeTextarea.value = content;
        }

        // 3. Update Diff view
        updateArtifactDiffView(art);

        // 4. Update Version select
        updateVersionSelectUI(art);
    }

    function updateArtifactDiffView(art) {
        const diffContent = document.getElementById('drawer-diff-content');
        if (!diffContent) return;

        const baseSel = document.getElementById('drawer-diff-base-select');
        const baseVerNum = baseSel ? parseInt(baseSel.value, 10) : 1;
        const baseVerObj = art.versions.find(v => v.version === baseVerNum) || art.versions[0];
        const curVerObj = art.versions.find(v => v.version === (art.activeVersion || art.versions.length)) || art.versions[art.versions.length - 1];

        const oldText = baseVerObj ? baseVerObj.content : '';
        const newText = curVerObj ? curVerObj.content : '';

        const diffObj = computeLineDiff(oldText, newText);

        const statsBadge = document.getElementById('drawer-diff-stats');
        if (statsBadge) {
            statsBadge.textContent = `+${diffObj.added} / -${diffObj.removed}`;
        }

        if (diffObj.lines.length === 0) {
            diffContent.innerHTML = `<div class="p-8 text-center text-gray-500 font-mono">No differences detected.</div>`;
            return;
        }

        diffContent.innerHTML = diffObj.lines.map(item => {
            if (item.type === 'add') {
                return `<div class="flex items-stretch bg-emerald-950/40 text-emerald-300 border-l-4 border-emerald-500">
                    <span class="w-10 text-right pr-2 text-emerald-500/80 select-none py-0.5 font-mono text-[11px] shrink-0 border-r border-emerald-900/40">+${item.lineB}</span>
                    <span class="px-3 py-0.5 whitespace-pre overflow-x-auto flex-1 font-mono">${escapeHtml(item.text) || ' '}</span>
                </div>`;
            } else if (item.type === 'del') {
                return `<div class="flex items-stretch bg-rose-950/40 text-rose-300 border-l-4 border-rose-500 opacity-80">
                    <span class="w-10 text-right pr-2 text-rose-500/80 select-none py-0.5 font-mono text-[11px] shrink-0 border-r border-rose-900/40">-${item.lineA}</span>
                    <span class="px-3 py-0.5 whitespace-pre overflow-x-auto flex-1 font-mono line-through text-rose-400/80">${escapeHtml(item.text) || ' '}</span>
                </div>`;
            } else {
                return `<div class="flex items-stretch text-gray-400 hover:bg-gray-900/40">
                    <span class="w-10 text-right pr-2 text-gray-600 select-none py-0.5 font-mono text-[11px] shrink-0 border-r border-gray-800">${item.lineB || item.lineA}</span>
                    <span class="px-3 py-0.5 whitespace-pre overflow-x-auto flex-1 text-gray-300 font-mono">${escapeHtml(item.text) || ' '}</span>
                </div>`;
            }
        }).join('');
    }

    function updateVersionSelectUI(art) {
        const verSel = document.getElementById('drawer-version-select');
        const baseSel = document.getElementById('drawer-diff-base-select');
        if (!verSel || !art || !art.versions) return;

        verSel.innerHTML = '';
        if (baseSel) baseSel.innerHTML = '';

        art.versions.forEach(v => {
            const opt = document.createElement('option');
            opt.value = v.version;
            const isLatest = (v.version === art.versions.length);
            opt.textContent = `v${v.version}${isLatest ? ' (Latest)' : ''} · ${v.summary || 'Snapshot'} · ${v.lines}L`;
            if (v.version === (art.activeVersion || art.versions.length)) {
                opt.selected = true;
            }
            verSel.appendChild(opt);

            if (baseSel) {
                const bOpt = document.createElement('option');
                bOpt.value = v.version;
                bOpt.textContent = `v${v.version} · ${v.summary || 'Snapshot'}`;
                baseSel.appendChild(bOpt);
            }
        });
    }

    function setDrawerLayoutMode(mode) {
        currentDrawerLayoutMode = mode;
        const previewPane = document.getElementById('drawer-pane-preview') || document.getElementById('drawer-preview-pane');
        const codePane = document.getElementById('drawer-pane-code') || document.getElementById('drawer-code-pane');
        const diffPane = document.getElementById('drawer-pane-diff') || document.getElementById('drawer-diff-pane');

        // Reset tab buttons
        ['preview', 'split', 'code', 'diff'].forEach(m => {
            const btn = document.getElementById(`drawer-tab-${m}`);
            if (btn) {
                if (m === mode) {
                    btn.className = "px-2.5 py-1 rounded font-medium bg-indigo-600 text-white transition flex items-center gap-1 cursor-pointer";
                } else {
                    btn.className = "px-2.5 py-1 rounded font-medium text-gray-400 hover:text-white transition flex items-center gap-1 cursor-pointer";
                }
            }
        });

        if (mode === 'preview') {
            if (previewPane) { previewPane.classList.remove('hidden'); previewPane.style.width = '100%'; }
            if (codePane) codePane.classList.add('hidden');
            if (diffPane) diffPane.classList.add('hidden');
        } else if (mode === 'split') {
            if (previewPane) { previewPane.classList.remove('hidden'); previewPane.style.width = '50%'; }
            if (codePane) { codePane.classList.remove('hidden'); codePane.style.width = '50%'; }
            if (diffPane) diffPane.classList.add('hidden');
        } else if (mode === 'code') {
            if (previewPane) previewPane.classList.add('hidden');
            if (codePane) { codePane.classList.remove('hidden'); codePane.style.width = '100%'; }
            if (diffPane) diffPane.classList.add('hidden');
        } else if (mode === 'diff') {
            if (previewPane) previewPane.classList.add('hidden');
            if (codePane) codePane.classList.add('hidden');
            if (diffPane) diffPane.classList.remove('hidden');
        }
    }

    function setDeviceWidth(width) {
        currentDeviceWidth = width;
        const container = document.getElementById('drawer-frame-wrapper') || document.getElementById('drawer-preview-container');
        if (container) {
            container.style.maxWidth = width;
            container.style.width = width;
        }
        document.querySelectorAll('.drawer-device-btn').forEach(btn => {
            if (btn.getAttribute('data-device') === width) {
                btn.classList.add('text-white', 'bg-indigo-600/30', 'font-bold');
                btn.classList.remove('text-gray-400');
            } else {
                btn.classList.remove('text-white', 'bg-indigo-600/30', 'font-bold');
                btn.classList.add('text-gray-400');
            }
        });
    }

    function toggleDrawerMoreDropdown(e) {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        const dd = document.getElementById('dropdown-drawer-more');
        if (!dd) return;
        dd.classList.toggle('hidden');
        if (window.lucide) lucide.createIcons();
    }

    function closeDrawerMoreDropdown() {
        const dd = document.getElementById('dropdown-drawer-more');
        if (dd && !dd.classList.contains('hidden')) {
            dd.classList.add('hidden');
        }
    }

    function openArtifactDrawer(id) {
        const art = globalArtifactStore.get(id);
        if (!art) return;
        lastActiveArtifactId = id;

        const modal = document.getElementById('artifact-drawer-modal');
        if (!modal) return;

        const titleEl = document.getElementById('drawer-artifact-title');
        const idEl = document.getElementById('drawer-artifact-id');
        const langEl = document.getElementById('drawer-artifact-lang');

        if (titleEl) titleEl.textContent = art.title || 'Artifact 成果展示';
        if (idEl) idEl.textContent = `ID: ${art.id}`;
        if (langEl) langEl.textContent = (art.language || art.type || 'HTML').toUpperCase();

        renderDrawerContent(art);
        setDrawerLayoutMode(currentDrawerLayoutMode);
        modal.classList.remove('hidden');

        if (window.lucide) lucide.createIcons();
    }

    function closeArtifactDrawer() {
        const modal = document.getElementById('artifact-drawer-modal');
        if (modal) modal.classList.add('hidden');
    }

    function openArtifactWithContent(id, title, content, type = 'html') {
        const art = {
            id: id || ('art_' + Date.now()),
            title: title || '自建互動應用',
            type: type,
            language: type,
            fullContent: content,
            createdAt: Date.now(),
            versions: [{
                version: 1,
                content: content,
                author: 'user',
                actionType: 'init',
                summary: 'Custom App Creation',
                timestamp: Date.now(),
                lines: content.split('\n').length,
                chars: content.length
            }],
            activeVersion: 1
        };

        globalArtifactStore.set(art.id, art);
        openArtifactDrawer(art.id);
    }

    function createVersionSnapshot() {
        if (!lastActiveArtifactId) return;
        const art = globalArtifactStore.get(lastActiveArtifactId);
        if (!art) return;

        const codeArea = document.getElementById('drawer-code-textarea');
        const newContent = codeArea ? codeArea.value : art.fullContent;

        ensureArtifactVersions(art);
        const newVer = art.versions.length + 1;
        art.versions.push({
            version: newVer,
            content: newContent,
            author: 'user',
            actionType: 'user_edit',
            summary: `User Snapshot v${newVer}`,
            timestamp: Date.now(),
            lines: newContent.split('\n').length,
            chars: newContent.length
        });
        art.activeVersion = newVer;
        art.fullContent = newContent;

        renderDrawerContent(art);
        alert(window.currentLang === 'en' ? `Created snapshot v${newVer}!` : `成功建立版本快照 v${newVer}！`);
    }

    function saveActiveArtifactToAppLibrary() {
        if (!lastActiveArtifactId) return;
        const art = globalArtifactStore.get(lastActiveArtifactId);
        if (!art) return;

        const codeArea = document.getElementById('drawer-code-textarea');
        const code = codeArea ? codeArea.value : art.fullContent;

        if (window.openEditCustomAppModal) {
            window.openEditCustomAppModal({
                id: 'app_' + Date.now(),
                title: art.title || '從 Artifact 轉存應用',
                category: art.type || 'html',
                description: `由 Artifact [${art.id}] 儲存至個人應用程式庫`,
                code: code
            });
            closeArtifactDrawer();
        }
    }

    function downloadArtifactFile() {
        if (!lastActiveArtifactId) return;
        const art = globalArtifactStore.get(lastActiveArtifactId);
        if (!art) return;

        const codeArea = document.getElementById('drawer-code-textarea');
        const content = codeArea ? codeArea.value : art.fullContent;
        const ext = (art.type === 'py' || art.language === 'python') ? '.py' : (art.type === 'sh' ? '.sh' : '.html');

        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${art.id || 'artifact'}${ext}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function copyArtifactCode() {
        const codeArea = document.getElementById('drawer-code-textarea');
        if (codeArea && navigator.clipboard) {
            navigator.clipboard.writeText(codeArea.value).then(() => {
                alert(window.currentLang === 'en' ? 'Code copied to clipboard!' : '程式碼已成功複製至剪貼簿！');
            });
        }
    }

    function initArtifactEvents() {
        // Tab buttons
        document.getElementById('drawer-tab-preview')?.addEventListener('click', () => setDrawerLayoutMode('preview'));
        document.getElementById('drawer-tab-split')?.addEventListener('click', () => setDrawerLayoutMode('split'));
        document.getElementById('drawer-tab-code')?.addEventListener('click', () => setDrawerLayoutMode('code'));
        document.getElementById('drawer-tab-diff')?.addEventListener('click', () => setDrawerLayoutMode('diff'));

        // Device widths
        document.querySelectorAll('.drawer-device-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const w = btn.getAttribute('data-device');
                if (w) setDeviceWidth(w);
            });
        });

        // Close buttons
        (document.getElementById('btn-close-artifact-drawer') || document.getElementById('drawer-btn-close'))?.addEventListener('click', closeArtifactDrawer);
        document.getElementById('drawer-btn-download')?.addEventListener('click', downloadArtifactFile);
        document.getElementById('drawer-btn-copy')?.addEventListener('click', copyArtifactCode);
        document.getElementById('drawer-btn-create-version')?.addEventListener('click', createVersionSnapshot);
        (document.getElementById('drawer-btn-save-to-lib') || document.getElementById('drawer-btn-save-to-app-lib'))?.addEventListener('click', () => {
            closeDrawerMoreDropdown();
            saveActiveArtifactToAppLibrary();
        });

        // More dropdown actions
        document.getElementById('drawer-btn-refresh')?.addEventListener('click', () => {
            closeDrawerMoreDropdown();
            if (!lastActiveArtifactId) return;
            const art = globalArtifactStore.get(lastActiveArtifactId);
            if (art) renderDrawerContent(art);
        });

        document.getElementById('drawer-btn-open-tab')?.addEventListener('click', () => {
            closeDrawerMoreDropdown();
            if (!lastActiveArtifactId) return;
            const art = globalArtifactStore.get(lastActiveArtifactId);
            if (!art) return;
            const ver = art.versions.find(v => v.version === art.activeVersion) || art.versions[art.versions.length - 1];
            const content = ver ? ver.content : '';
            const blob = new Blob([content], { type: 'text/html;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');
        });

        document.getElementById('drawer-btn-continue')?.addEventListener('click', () => {
            closeDrawerMoreDropdown();
            closeArtifactDrawer();
            const input = document.getElementById('chat-input');
            if (input) {
                input.value = `請接續優化與擴充目前的 Artifact 成果 (ID: ${lastActiveArtifactId || 'app'})：`;
                input.focus();
            }
        });

        // Outside click handler to close dropdown
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#drawer-btn-more-menu') && !e.target.closest('#dropdown-drawer-more')) {
                closeDrawerMoreDropdown();
            }
        });

        // Open Artifact default demo button
        document.getElementById('btn-open-artifact')?.addEventListener('click', () => {
            if (globalArtifactStore.size > 0) {
                const targetId = lastActiveArtifactId && globalArtifactStore.has(lastActiveArtifactId)
                    ? lastActiveArtifactId
                    : Array.from(globalArtifactStore.keys()).pop();
                openArtifactDrawer(targetId);
            } else {
                openArtifactWithContent(
                    'demo_dashboard',
                    '示範互動式儀表板',
                    `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
body { font-family: sans-serif; background: #0b0f19; color: #f1f5f9; padding: 2rem; }
.card { background: #1e293b; padding: 1.5rem; border-radius: 1rem; border: 1px solid #334155; }
h1 { color: #38bdf8; }
.btn { background: #6366f1; color: white; border: none; padding: 0.6rem 1.2rem; border-radius: 0.5rem; cursor: pointer; }
</style>
</head>
<body>
<div class="card">
  <h1>🚀 Webcom AI Artifact 工坊</h1>
  <p>這是一個即時渲染的獨立 HTML/JS 成果預覽沙箱！支援並排編輯、版本快照、與一鍵轉存自建應用庫。</p>
  <button class="btn" onclick="alert('Artifact 沙箱運作正常！')">測試按鈕</button>
</div>
</body>
</html>`
                );
            }
        });

        // Version dropdown changes
        document.getElementById('drawer-version-select')?.addEventListener('change', (e) => {
            if (!lastActiveArtifactId) return;
            const art = globalArtifactStore.get(lastActiveArtifactId);
            if (!art) return;
            art.activeVersion = parseInt(e.target.value, 10);
            renderDrawerContent(art);
        });

        document.getElementById('drawer-diff-base-select')?.addEventListener('change', () => {
            if (!lastActiveArtifactId) return;
            const art = globalArtifactStore.get(lastActiveArtifactId);
            if (!art) return;
            updateArtifactDiffView(art);
        });
    }

    document.addEventListener('DOMContentLoaded', initArtifactEvents);

    window.globalArtifactStore = globalArtifactStore;
    window.openArtifactDrawer = openArtifactDrawer;
    window.closeArtifactDrawer = closeArtifactDrawer;
    window.openArtifactWithContent = openArtifactWithContent;
    window.setDrawerLayoutMode = setDrawerLayoutMode;
    window.setDeviceWidth = setDeviceWidth;
    window.toggleDrawerMoreDropdown = toggleDrawerMoreDropdown;
    window.closeDrawerMoreDropdown = closeDrawerMoreDropdown;
})();
