/**
 * Auto Dialogue Integration
 * Automatically integrates web search results into chat dialogue
 */

// Import required modules
import { renderSearchResultsForDialogue } from './dialogue_search_renderer.js';
import { initRagImportListeners } from './rag_import_event_handler.js';

/**
 * Auto-integrate web search results into chat dialogue
 * @param {Array} formattedResults - Formatted search results from web_search_rag_enhanced.js
 * @param {string} containerSelector - CSS selector for the chat container
 * @param {Object} options - Optional configuration
 */
export function integrateSearchResults(formattedResults, containerSelector = '#chat-container', options = {}) {
  // Default options
  const config = {
    autoRender: true,
    showLoading: true,
    feedbackDelay: 2000,
    ...options
  };
  
  // Validate inputs
  if (!Array.isArray(formattedResults)) {
    console.error('Invalid formattedResults:', formattedResults);
    return;
  }
  
  if (!containerSelector) {
    console.error('Missing containerSelector');
    return;
  }
  
  // Get the container element
  const container = document.querySelector(containerSelector);
  if (!container) {
    console.error(`Container not found: ${containerSelector}`);
    return;
  }
  
  // Show loading state if requested
  if (config.showLoading) {
    showLoadingState(container);
  }
  
  // Render search results
  try {
    const htmlOutput = renderSearchResultsForDialogue(formattedResults);
    
    // Insert into container
    container.innerHTML = htmlOutput;
    
    // Initialize RAG import event listeners
    initRagImportListeners('.search-results-container');
    
    // Hide loading state
    if (config.showLoading) {
      hideLoadingState(container);
    }
    
    // Trigger success callback
    if (typeof options.onSuccess === 'function') {
      options.onSuccess(formattedResults);
    }
    
    console.log('Successfully integrated search results into dialogue');
  } catch (error) {
    console.error('Error integrating search results:', error);
    
    // Handle errors
    handleIntegrationError(container, error, config);
    
    // Trigger error callback
    if (typeof options.onError === 'function') {
      options.onError(error);
    }
  }
}

/**
 * Show loading state in container
 * @param {HTMLElement} container - The container element
 */
function showLoadingState(container) {
  const loadingHTML = `\n<div class="loading-indicator">
  <div class="spinner"></div>
  <p>Searching for relevant information...</p>
</div>`;
  
  container.innerHTML = loadingHTML;
}

/**
 * Hide loading state in container
 * @param {HTMLElement} container - The container element
 */
function hideLoadingState(container) {
  // Remove loading indicator
  const loadingIndicator = container.querySelector('.loading-indicator');
  if (loadingIndicator) {
    loadingIndicator.remove();
  }
}

/**
 * Handle integration error
 * @param {HTMLElement} container - The container element
 * @param {Error} error - The error object
 * @param {Object} config - Configuration object
 */
function handleIntegrationError(container, error, config) {
  // Create error message
  const errorMessage = `Failed to load search results: ${error.message || 'Unknown error'}\n\nPlease try again later.`;
  
  // Display error
  container.innerHTML = `\n<div class="error-message">
  <p>❌ Error:</p>
  <p>${errorMessage}</p>
  <button class="retry-button">Retry</button>
</div>`;
  
  // Add retry functionality
  const retryButton = container.querySelector('.retry-button');
  if (retryButton) {
    retryButton.addEventListener('click', () => {
      container.innerHTML = `\n<div class="loading-indicator">
  <div class="spinner"></div>
  <p>Retrying search...</p>
</div>`;
      
      // Retry logic would go here
      setTimeout(() => {
        // This is a placeholder - actual retry would depend on context
        console.log('Retry attempt triggered');
      }, 1000);
    });
  }
}

/**
 * Generate a unique ID for elements
 * @returns {string} Unique ID
 */
export function generateUniqueId() {
  return `element-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Export helper functions
export {
  showLoadingState,
  hideLoadingState,
  handleIntegrationError
};