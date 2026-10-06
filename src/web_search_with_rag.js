/**
 * Complete Web Search with RAG Integration
 * Combines web search, source links, and RAG import functionality
 */

// Import required modules
import web_search from './web_search_rag_integration.js';
import importToRag from './rag_import_system.js';

// Configuration
const WEB_SEARCH_RAG_CONFIG = {
  // Maximum number of results to display
  MAX_RESULTS: 5,
  
  // Enable/disable features
  ENABLE_SOURCE_LINKS: true,
  ENABLE_RAG_IMPORT: true,
  
  // Default settings for RAG import
  DEFAULT_RAG_OPTIONS: {
    fetchFullContent: false,
    chunking: {
      strategy: 'semantic',
      maxSize: 512,
      overlap: 50
    },
    embedding: {
      model: 'text-embedding-3-small',
      provider: 'openai'
    }
  }
};

// Main function for web search with RAG integration
async function webSearchWithRag(queries, options = {}) {
  try {
    // Merge configuration
    const config = { ...WEB_SEARCH_RAG_CONFIG, ...options };
    
    // Execute web search
    const searchResult = await web_search(queries, {
      maxResults: config.MAX_RESULTS,
      includeSources: true
    });
    
    // Process results with RAG integration
    const processedResults = searchResult.sources.map((source, index) => {
      // Create formatted result
      const formattedResult = {
        id: `result-${index}`,
        title: source.title,
        url: source.url,
        snippet: source.snippet,
        sourceLink: config.ENABLE_SOURCE_LINKS ? 
          `[${source.title}](${source.url})` : 
          source.title,
        ragButton: config.ENABLE_RAG_IMPORT ? 
          `[[Import to RAG]](javascript:importToRag('${source.id}', ${JSON.stringify({
            query: queries[0],
            metadata: { source: 'web_search' }
          })})` : 
          '',
        formatted: `\n### ${source.title}\n\n${source.snippet}\n\n${source.sourceLink} ${source.ragButton}`
      };
      
      return formattedResult;
    });
    
    // Return complete result
    return {
      summary: searchResult.summary,
      totalResults: searchResult.totalResults,
      results: processedResults,
      config: config
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: `Web search with RAG failed: ${error.message}`
    };
  }
}

// Export the main function
export default webSearchWithRag;

// Export helper functions
export { importToRag };