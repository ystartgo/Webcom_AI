/**
 * Complete Integration Example
 * Demonstrates how all RAG search features work together
 */

// Import all required modules
import { execute_web_search } from '../hermes_bridge/adapters/web_search_rag_enhanced.js';
import { integrateSearchResults } from '../src/auto_dialogue_integration.js';
import { showToast, showSearchResultFeedback, showRagImportFeedback } from '../src/user_feedback_system.js';
import { initRagImportListeners } from '../src/rag_import_event_handler.js';

/**
 * Complete RAG Search Integration Example
 * Shows the full workflow from search to RAG import
 */
export class RAGSearchIntegration {
  constructor(options = {}) {
    this.options = {
      chatContainer: '#chat-container',
      searchEngine: 'duckduckgo',
      maxResults: 5,
      ...options
    };
    
    // Initialize feedback system
    this.initFeedbackSystem();
  }
  
  /**
   * Initialize feedback system
   */
  initFeedbackSystem() {
    // Add toast styles to head
    const style = document.createElement('style');
    style.textContent = `\n@keyframes slideIn {\n  from {\n    transform: translateX(100%);\n    opacity: 0;\n  }\n  to {\n    transform: translateX(0);\n    opacity: 1;\n  }\n}\n\n@keyframes slideOut {\n  from {\n    transform: translateX(0);\n    opacity: 1;\n  }\n  to {\n    transform: translateX(100%);\n    opacity: 0;\n  }\n}\n\n.toast {\n  position: fixed;\n  top: 20px;\n  right: 20px;\n  max-width: 400px;\n  padding: 12px 16px;\n  border-radius: 8px;\n  background: #666;\n  color: white;\n  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;\n  font-size: 14px;\n  box-shadow: 0 4px 12px rgba(0,0,0,0.15);\n  z-index: 9999;\n  animation: slideIn 0.3s ease-out;\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n}\n\n.toast-content {\n  flex: 1;\n  margin-right: 12px;\n}\n\n.toast-close {\n  cursor: pointer;\n  font-size: 18px;\n  line-height: 1;\n}\n\n.loading-feedback {\n  position: fixed;\n  top: 50%;\n  left: 50%;\n  transform: translate(-50%, -50%);\n  background: rgba(0,0,0,0.7);\n  color: white;\n  padding: 20px 30px;\n  border-radius: 8px;\n  z-index: 9999;\n  text-align: center;\n}\n\n.spinner {\n  width: 20px;\n  height: 20px;\n  border: 2px solid rgba(255,255,255,0.3);\n  border-radius: 50%;\n  border-top-color: white;\n  animation: spin 1s ease-in-out infinite;\n}\n\n@keyframes spin {\n  to { transform: rotate(360deg); }\n}\n`;
    
    document.head.appendChild(style);
  }
  
  /**
   * Execute web search and integrate results
   * @param {string} query - Search query
   * @param {Object} options - Search options
   */
  async searchAndIntegrate(query, options = {}) {
    try {
      // Show loading feedback
      showToast('🔍 Searching for relevant information...', 'info', 5000);
      
      // Execute search
      const searchResult = await execute_web_search({
        query,
        engine: options.engine || this.options.searchEngine,
        max_results: options.maxResults || this.options.maxResults
      });
      
      // Check if search was successful
      if (!searchResult || !searchResult.formatted_results) {
        throw new Error('Search failed or returned no results');
      }
      
      // Show search result feedback
      showSearchResultFeedback(searchResult.formatted_results);
      
      // Integrate into dialogue
      integrateSearchResults(
        searchResult.formatted_results,
        this.options.chatContainer,
        {
          onSuccess: (results) => {
            console.log('Search results integrated successfully');
          },
          onError: (error) => {
            console.error('Error integrating search results:', error);
            showToast(`❌ Failed to display results: ${error.message}`, 'error');
          }
        }
      );
      
      return searchResult;
      
    } catch (error) {
      console.error('Search integration error:', error);
      showToast(`❌ Search failed: ${error.message}`, 'error');
      throw error;
    }
  }
  
  /**
   * Initialize RAG import listeners
   */
  initRagImport() {
    initRagImportListeners('.search-results-container');
    console.log('RAG import listeners initialized');
  }
  
  /**
   * Handle RAG import success/failure
   * @param {Object} result - Import result
   */
  handleRagImportResult(result) {
    showRagImportFeedback(result);
  }
}

// Export helper functions for direct use
export function createRAGSearchInstance(options = {}) {
  return new RAGSearchIntegration(options);
}

// Example usage
export function exampleUsage() {
  // Create instance
  const ragSearch = createRAGSearchInstance({
    chatContainer: '#chat-container',
    searchEngine: 'duckduckgo'
  });
  
  // Initialize RAG import listeners
  ragSearch.initRagImport();
  
  // Example search
  ragSearch.searchAndIntegrate('RAG tutorial')
    .then(result => {
      console.log('Search completed:', result);
    })
    .catch(error => {
      console.error('Search failed:', error);
    });
}

// Auto-initialize if in browser environment
if (typeof window !== 'undefined' && window.document) {
  // Export global function for easy access
  window.RAGSearch = RAGSearchIntegration;
  window.createRAGSearch = createRAGSearchInstance;
}

// Export default
export default RAGSearchIntegration;