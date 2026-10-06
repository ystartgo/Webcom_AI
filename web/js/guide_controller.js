// ================================================================
// Webcom AI - User Guide & Help Documentation Controller
// Author: startgo (startgo@yia.app) | License: GPLv3
// ================================================================

(function () {
    let currentGuideLang = 'zh-TW';

    function renderGuideLanguage(lang) {
        const targetLang = (lang === 'en') ? 'en' : 'zh-TW';
        currentGuideLang = targetLang;

        if (typeof window !== 'undefined' && window.GUIDE_TRANSLATIONS) {
            const tabDict = window.GUIDE_TRANSLATIONS[targetLang];
            if (tabDict) {
                Object.keys(tabDict).forEach(tabId => {
                    const pane = document.getElementById(tabId);
                    if (pane) {
                        pane.innerHTML = tabDict[tabId];
                    }
                });
            }
        }

        // Update modal title according to language if not already handled by i18n
        const titleEl = document.querySelector('#guide-modal [data-i18n="guideModalTitle"]');
        if (titleEl) {
            titleEl.textContent = (targetLang === 'en') 
                ? 'Dual-Engine AI Console · Operation & Troubleshooting Guide' 
                : '雙引擎 AI 控制台・系統操作與排障手冊';
        }

        // Update in-modal quick language toggle button
        const langLabel = document.getElementById('guide-lang-label');
        if (langLabel) {
            langLabel.textContent = (targetLang === 'en') ? '切換繁中' : 'Switch EN';
        }

        if (window.lucide) lucide.createIcons();
    }

    function openGuideModal() {
        const modal = document.getElementById('guide-modal');
        if (modal) {
            const activeLang = window.currentLang || localStorage.getItem('webcom_language') || 'zh-TW';
            renderGuideLanguage(activeLang);
            modal.classList.remove('hidden');
            if (window.lucide) lucide.createIcons();
        }
    }

    function closeGuideModal() {
        const modal = document.getElementById('guide-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    function switchGuideTab(targetTabId, clickedBtn) {
        document.querySelectorAll('.guide-tab-pane').forEach(el => el.classList.add('hidden'));
        document.querySelectorAll('.guide-tab-btn').forEach(btn => {
            btn.classList.remove('bg-indigo-600', 'text-white');
            btn.classList.add('bg-gray-800', 'text-gray-300');
        });

        const targetPane = document.getElementById(targetTabId);
        if (targetPane) targetPane.classList.remove('hidden');

        if (clickedBtn) {
            clickedBtn.classList.remove('bg-gray-800', 'text-gray-300');
            clickedBtn.classList.add('bg-indigo-600', 'text-white');
        }

        if (window.lucide) lucide.createIcons();
    }

    function initGuideEvents() {
        document.querySelectorAll('.guide-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tabId = btn.getAttribute('data-tab');
                if (tabId) switchGuideTab(tabId, btn);
            });
        });

        const btnOpen = document.getElementById('btn-open-guide');
        if (btnOpen) btnOpen.addEventListener('click', openGuideModal);

        const btnOpenMenu = document.getElementById('btn-open-guide-menu');
        if (btnOpenMenu) btnOpenMenu.addEventListener('click', openGuideModal);

        const btnClose = document.getElementById('btn-close-guide');
        if (btnClose) btnClose.addEventListener('click', closeGuideModal);

        const btnCloseFooter = document.getElementById('btn-close-guide-footer');
        if (btnCloseFooter) btnCloseFooter.addEventListener('click', closeGuideModal);

        // In-modal quick language toggle button
        const btnLangToggle = document.getElementById('btn-guide-lang-toggle');
        if (btnLangToggle) {
            btnLangToggle.addEventListener('click', () => {
                const nextLang = (currentGuideLang === 'en') ? 'zh-TW' : 'en';
                if (window.webcomApp && typeof window.webcomApp.setLanguage === 'function') {
                    window.webcomApp.setLanguage(nextLang);
                    const langSel = document.getElementById('select-language');
                    if (langSel) langSel.value = nextLang;
                } else {
                    renderGuideLanguage(nextLang);
                }
            });
        }

        // Click backdrop to close
        const modal = document.getElementById('guide-modal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) closeGuideModal();
            });
        }
    }

    document.addEventListener('DOMContentLoaded', initGuideEvents);

    window.openGuideModal = openGuideModal;
    window.closeGuideModal = closeGuideModal;
    window.switchGuideTab = switchGuideTab;
    window.setGuideLanguage = renderGuideLanguage;
})();
