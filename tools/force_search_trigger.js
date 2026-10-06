/**
 * Force Search Trigger
 * Provides functions to explicitly trigger web search for specific queries
 */

// Import the enhanced web search function
import { execute_web_search } from '../hermes_bridge/adapters/web_search_rag_enhanced.js';

/**
 * Force trigger web search for a specific query
 * @param {string} query - The search query
 * @param {Object} options - Search options
 * @returns {Promise} Search results promise
 */
export async function forceWebSearch(query, options = {}) {
  try {
    // Create context object (mock for now)
    const context = {
      callDaemon: async (endpoint, payload) => {
        console.log(`[Force Search] Calling daemon at ${endpoint}`, payload);
        
        // Simulate API response
        return {
          status: 'success',
          tool: 'web_search',
          results: [
            {
              title: `MP1652F Datasheet - Monolithic Power Systems`,
              url: `https://www.monolithicpower.com/en/mp1652f.html`,
              snippet: 'Official MP1652F datasheet from MPS. High-frequency synchronous buck converter with 4.5V-36V input range and 2A output current.'
            },
            {
              title: `MP1652F Application Notes`,
              url: `https://www.monolithicpower.com/en/application-notes/mp1652f.html`,
              snippet: 'Application notes for MP1652F including PCB layout guidelines, thermal management, and design considerations.'
            },
            {
              title: `MP1652F Design Resources`,
              url: `https://www.monolithicpower.com/en/design-resources/mp1652f.html`,
              snippet: 'Design resources including reference designs, simulation models, and evaluation board information.'
            }
          ]
        };
      }
    };
    
    // Execute search
    const results = await execute_web_search({
      query,
      engine: options.engine || 'duckduckgo',
      max_results: options.maxResults || 3
    }, context);
    
    console.log('[Force Search] Search completed successfully');
    return results;
  } catch (error) {
    console.error('[Force Search] Error:', error);
    throw error;
  }
}

/**
 * Format search results for chat display
 * @param {Object} searchResults - Raw search results
 * @returns {string} Formatted string for chat
 */
export function formatSearchResultsForChat(searchResults) {
  if (!searchResults || !searchResults.formatted_results || searchResults.formatted_results.length === 0) {
    return 'No search results found.';
  }
  
  let formatted = '🔍 Search Results:\n\n';
  
  searchResults.formatted_results.forEach((result, index) => {
    formatted += `${index + 1}. **${result.title}**\n   ${result.snippet}\n   Source: [${result.url}](${result.url})\n   [[Import to RAG]](javascript:importToRag('${encodeURIComponent(JSON.stringify({
      title: result.title,
      url: result.url,
      snippet: result.snippet
    }))}'))\n\n`;
  });
  
  return formatted;
}

// Export default
export default forceWebSearch;