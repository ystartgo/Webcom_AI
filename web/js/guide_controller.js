// ================================================================
// Webcom AI - User Guide & Help Documentation Controller
// Author: startgo (startgo@yia.app) | License: GPLv3
// ================================================================

(function () {
    function openGuideModal() {
        const modal = document.getElementById('guide-modal');
        if (modal) {
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

        const btnClose = document.getElementById('btn-close-guide');
        if (btnClose) btnClose.addEventListener('click', closeGuideModal);

        const btnCloseFooter = document.getElementById('btn-close-guide-footer');
        if (btnCloseFooter) btnCloseFooter.addEventListener('click', closeGuideModal);

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
})();
