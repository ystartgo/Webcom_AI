/**
 * User Feedback System
 * Provides success/error feedback for RAG operations and search results
 */

/**
 * Show toast notification
 * @param {string} message - Message to display
 * @param {string} type - 'success', 'error', or 'info'
 * @param {number} duration - Duration in milliseconds (default: 3000)
 */
export function showToast(message, type = 'info', duration = 3000) {
  // Create toast element
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  // Set content
  toast.innerHTML = `\n  <div class="toast-content">${message}</div>\n  <div class="toast-close">&times;</div>`;
  
  // Style the toast
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    max-width: 400px;
    padding: 12px 16px;
    border-radius: 8px;
    background: ${getToastBackgroundColor(type)};
    color: white;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 9999;
    animation: slideIn 0.3s ease-out;
    display: flex;
    align-items: center;
    justify-content: space-between;
  `;
  
  // Add close button event
  const closeButton = toast.querySelector('.toast-close');
  if (closeButton) {
    closeButton.addEventListener('click', () => {
      hideToast(toast);
    });
  }
  
  // Add to body
  document.body.appendChild(toast);
  
  // Auto-hide after duration
  setTimeout(() => {
    hideToast(toast);
  }, duration);
}

/**
 * Get toast background color based on type
 * @param {string} type - Toast type
 * @returns {string} Background color
 */
function getToastBackgroundColor(type) {
  switch (type) {
    case 'success':
      return '#4CAF50';
    case 'error':
      return '#f44336';
    case 'info':
      return '#2196F3';
    default:
      return '#666';
  }
}

/**
 * Hide toast notification
 * @param {HTMLElement} toast - Toast element to hide
 */
function hideToast(toast) {
  if (toast && toast.parentNode) {
    toast.style.animation = 'slideOut 0.3s ease-in';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }
}

/**
 * Show search result feedback
 * @param {Array} results - Search results
 * @param {Object} options - Options
 */
export function showSearchResultFeedback(results, options = {}) {
  const count = results.length;
  const message = count > 0 
    ? `Found ${count} relevant results` 
    : 'No results found';
  
  showToast(message, count > 0 ? 'success' : 'info', options.duration || 2000);
}

/**
 * Show RAG import feedback
 * @param {Object} result - Import result
 * @param {Object} options - Options
 */
export function showRagImportFeedback(result, options = {}) {
  if (result.success) {
    showToast(`✅ Successfully imported to RAG: ${result.message}`, 'success', options.duration || 2500);
  } else {
    showToast(`❌ Failed to import to RAG: ${result.error || result.message}`, 'error', options.duration || 3000);
  }
}

/**
 * Show loading feedback
 * @param {string} message - Loading message
 * @param {Object} options - Options
 */
export function showLoadingFeedback(message = 'Processing...', options = {}) {
  // Create loading indicator
  const loading = document.createElement('div');
  loading.className = 'loading-feedback';
  loading.innerHTML = `\n  <div class="spinner"></div>\n  <p>${message}</p>\n`;
  
  loading.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(0,0,0,0.7);
    color: white;
    padding: 20px 30px;
    border-radius: 8px;
    z-index: 9999;
    text-align: center;
  `;
  
  document.body.appendChild(loading);
  
  // Return cleanup function
  return () => {
    if (loading.parentNode) {
      loading.parentNode.removeChild(loading);
    }
  };
}

// Export CSS styles for toast animations
export const toastStyles = `\n@keyframes slideIn {\n  from {\n    transform: translateX(100%);\n    opacity: 0;\n  }\n  to {\n    transform: translateX(0);\n    opacity: 1;\n  }\n}\n\n@keyframes slideOut {\n  from {\n    transform: translateX(0);\n    opacity: 1;\n  }\n  to {\n    transform: translateX(100%);\n    opacity: 0;\n  }\n}\n\n.toast {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  margin-bottom: 8px;\n}\n\n.toast-content {\n  flex: 1;\n  margin-right: 12px;\n}\n\n.toast-close {\n  cursor: pointer;\n  font-size: 18px;\n  line-height: 1;\n}\n\n.loading-feedback {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n}\n\n.spinner {\n  width: 20px;\n  height: 20px;\n  border: 2px solid rgba(255,255,255,0.3);\n  border-radius: 50%;\n  border-top-color: white;\n  animation: spin 1s ease-in-out infinite;\n}\n\n@keyframes spin {\n  to { transform: rotate(360deg); }\n}\n`;