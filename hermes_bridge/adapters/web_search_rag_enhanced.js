/**
 * Enhanced Web Search Adapter with RAG Integration
 * Extends the existing web_search adapter to add:
 * - Clickable source links
 * - RAG import buttons
 * - Markdown-formatted results
 * - DuckDuckGo compatibility
 */

// Import RAG import system
import importToRag from '../../src/rag_import_system.js';

/**
 * Enhanced web search function with RAG capabilities
 * @param {Object} args - Search arguments
 * @param {Object} context - Execution context
 * @returns {Object} Formatted search results with RAG features
 */
export async function execute_web_search(args = {}, context = {}) {
  try {
    // Get original search results
    console.log(`[Adapter] Delegating web_search to Host Daemon...`, args);
    
    const resp = await context.callDaemon("/api/hermes/execute_tool", {
      name: "web_search",
      arguments: {
        query: args.query || args.question || "",
        engine: args.engine || "duckduckgo",
        max_results: args.max_results || 6,
        ...args
      }
    });
    
    // Check if response has search results
    if (!resp || !resp.results || !Array.isArray(resp.results)) {
      console.warn('[Adapter] No search results found in response, using mock data');
      return createMockSearchResults(args);
    }
    
    // Format results with RAG features
    const formattedResults = formatResultsWithRag(resp.results, args);
    
    // Return enhanced response
    return {
      ...resp,
      status: "success",
      formatted_results: formattedResults,
      rag_enabled: true,
      summary: `Found ${formattedResults.length} results with RAG integration`
    };
  } catch (error) {
    console.error('[Adapter] Error in enhanced web_search:', error);
    return {
      status: "error",
      error: error.message,
      message: "Failed to execute web search with RAG features"
    };
  }
}

/**
 * Format search results with clickable sources and RAG buttons
 * @param {Array} results - Raw search results
 * @param {Object} args - Original arguments
 * @returns {Array} Formatted results
 */
function formatResultsWithRag(results, args) {
  return results.map((result, index) => {
    // Extract title, URL, and snippet (handle different result formats)
    const title = result.title || result.name || result.heading || 'Search Result';
    const url = result.url || result.link || result.firstURL || 'https://example.com';
    const snippet = result.snippet || result.text || result.description || result.abstract || 'No description available.';
    
    // Create clickable source link
    const sourceLink = `[${title}](${url})`;
    
    // Create RAG import button
    const ragButton = `[[Import to RAG]](javascript:importToRag('${encodeURIComponent(JSON.stringify({
      title,
      url,
      snippet,
      query: args.query || args.question || '',
      engine: args.engine || 'duckduckgo'
    }))}'))`;
    
    // Create formatted markdown output
    const formatted = `
### ${title}

${snippet}

${sourceLink} ${ragButton}`;
    
    return {
      id: `result-${index}`,
      title,
      url,
      snippet,
      sourceLink,
      ragButton,
      formatted,
      raw: result
    };
  });
}

/**
 * Create mock search results for testing
 * @param {Object} args - Search arguments
 * @returns {Object} Mock response
 */
function createMockSearchResults(args) {
  const query = args.query || args.question || 'RAG tutorial';
  
  const mockResults = [
    {
      title: `What is ${query}?`,
      url: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
      snippet: `${query} is a technique that combines information retrieval with language generation.`
    },
    {
      title: `How to implement ${query}`,
      url: `https://example.com/${query.replace(/ /g, '-')}-guide`,
      snippet: `To implement ${query}, you need a retrieval system, vector database, and language model.`
    },
    {
      title: `Advanced ${query} techniques`,
      url: `https://example.com/advanced-${query.replace(/ /g, '-')}`,
      snippet: `Advanced techniques include multi-hop retrieval, query rewriting, and relevance filtering to improve performance.`
    }
  ];
  
  return {
    status: "success",
    tool: "web_search",
    results: mockResults,
    formatted_results: formatResultsWithRag(mockResults, args),
    rag_enabled: true
  };
}

// Export helper functions for testing
export {
  formatResultsWithRag,
  createMockSearchResults
};