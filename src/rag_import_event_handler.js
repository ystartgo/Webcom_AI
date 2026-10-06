/**
 * RAG Import Event Handler
 * Handles click events on RAG import buttons in dialogue
 */

// Import RAG import system
import importToRag from './rag_import_system.js';

/**
 * Initialize RAG import event listeners
 * @param {string} containerSelector - CSS selector for the container containing search results
 */
export function initRagImportListeners(containerSelector = '.search-results-container') {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setupEventListeners(containerSelector);
    });
  } else {
    setupEventListeners(containerSelector);
  }
}

/**
 * Setup event listeners for RAG import buttons
 * @param {string} containerSelector - CSS selector for the container
 */
function setupEventListeners(containerSelector) {
  // Add event delegation for RAG import buttons
  document.addEventListener('click', function(event) {
    // Check if clicked element is a RAG import button
    const button = event.target.closest('.rag-import-btn');
    
    if (button) {
      event.preventDefault();
      
      try {
        // Get the result data from data attribute
        const resultDataStr = button.dataset.resultData;
        if (!resultDataStr) {
          throw new Error('Missing result data');
        }
        
        const resultData = JSON.parse(decodeURIComponent(resultDataStr));
        
        // Show loading state
        showLoadingState(button);
        
        // Import to RAG
        importToRag(resultData)
          .then(result => {
            if (result.success) {
              showSuccessFeedback(button, result.message);
              console.log('RAG import successful:', result);
            } else {
              showErrorFeedback(button, result.error || result.message);
              console.error('RAG import failed:', result);
            }
          })
          .catch(error => {
            showErrorFeedback(button, error.message || 'Failed to import to RAG');
            console.error('RAG import error:', error);
          });
      } catch (error) {
        showErrorFeedback(button, error.message || 'Invalid result data');
        console.error('RAG import setup error:', error);
      }
    }
  });
}

/**
 * Show loading state for button
 * @param {HTMLElement} button - The button element
 */
function showLoadingState(button) {
  const originalText = button.textContent;
  button.textContent = '⏳ Importing...';
  button.disabled = true;
  button.style.opacity = '0.7';
  
  // Store original text for later restoration
  button.dataset.originalText = originalText;
}

/**
 * Show success feedback
 * @param {HTMLElement} button - The button element
 * @param {string} message - Success message
 */
function showSuccessFeedback(button, message) {
  const originalText = button.dataset.originalText || '📥 Import to RAG';
  
  button.textContent = '✅ Imported!';
  button.style.backgroundColor = '#4CAF50';
  button.style.color = 'white';
  
  // Reset after delay
  setTimeout(() => {
    button.textContent = originalText;
    button.style.backgroundColor = '';
    button.style.color = '';
    button.disabled = false;
    button.style.opacity = '1';
  }, 2000);
}

/**
 * Show error feedback
 * @param {HTMLElement} button - The button element
 * @param {string} message - Error message
 */
function showErrorFeedback(button, message) {
  const originalText = button.dataset.originalText || '📥 Import to RAG';
  
  button.textContent = '❌ Failed';
  button.style.backgroundColor = '#f44336';
  button.style.color = 'white';
  
  // Show error tooltip
  const tooltip = document.createElement('div');
  tooltip.className = 'rag-import-tooltip';
  tooltip.textContent = message;
  tooltip.style.cssText = `
    position: absolute;
    background: #333;
    color: white;
    padding: 8px 12px;
    border-radius: 4px;
    font-size: 12px;
    z-index: 1000;
    white-space: nowrap;
  `;
  
  const rect = button.getBoundingClientRect();
  tooltip.style.left = `${rect.left}px`;
  tooltip.style.top = `${rect.bottom + 5}px`;
  
  document.body.appendChild(tooltip);
  
  // Remove tooltip after delay
  setTimeout(() => {
    if (tooltip.parentNode) {
      tooltip.parentNode.removeChild(tooltip);
    }
  }, 3000);
  
  // Reset button after delay
  setTimeout(() => {
    button.textContent = originalText;
    button.style.backgroundColor = '';
    button.style.color = '';
    button.disabled = false;
    button.style.opacity = '1';
  }, 2000);
}

// Export helper functions
export {
  showLoadingState,
  showSuccessFeedback,
  showErrorFeedback
};