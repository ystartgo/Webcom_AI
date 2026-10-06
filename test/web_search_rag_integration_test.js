/*
 * Web Search RAG Integration Test
 * Tests the enhanced web_search adapter with RAG features
 */

// Mock context for testing
const mockContext = {
  callDaemon: async (endpoint, payload) => {
    console.log(`[Mock] Calling daemon at ${endpoint}`, payload);
    
    // Simulate different response formats based on engine
    if (payload.arguments.engine === 'duckduckgo') {
      return {
        status: 'success',
        tool: 'web_search',
        results: [
          {
            title: 'What is RAG?',
            url: 'https://example.com/rag-basics',
            snippet: 'RAG (Retrieval-Augmented Generation) combines retrieval and generation to improve AI responses.'
          },
          {
            title: 'RAG Implementation Guide',
            url: 'https://example.com/rag-implementation',
            snippet: 'To implement RAG, you need a retrieval system, vector database, and language model.'
          }
        ]
      };
    } else {
      return {
        status: 'success',
        tool: 'web_search',
        results: [
          {
            name: 'RAG Tutorial',
            link: 'https://example.com/tutorial',
            description: 'Complete guide to RAG implementation.'
          }
        ]
      };
    }
  }
};

// Import the enhanced function
import { execute_web_search } from '../hermes_bridge/adapters/web_search_rag_enhanced.js';

// Test function
async function testWebSearchRagIntegration() {
  console.log('=== Web Search RAG Integration Test ===\n');
  
  // Test 1: Basic DuckDuckGo search
  console.log('Test 1: DuckDuckGo search');
  const duckduckgoResult = await execute_web_search(
    { query: 'RAG tutorial', engine: 'duckduckgo' }, 
    mockContext
  );
  
  console.log('DuckDuckGo Result:', JSON.stringify(duckduckgoResult, null, 2));
  
  // Test 2: Generic search
  console.log('\nTest 2: Generic search');
  const genericResult = await execute_web_search(
    { query: 'advanced RAG' }, 
    mockContext
  );
  
  console.log('Generic Result:', JSON.stringify(genericResult, null, 2));
  
  // Verify RAG features
  if (duckduckgoResult.formatted_results && duckduckgoResult.formatted_results.length > 0) {
    const firstResult = duckduckgoResult.formatted_results[0];
    console.log('\n=== RAG Features Verification ===');
    console.log('✓ Clickable source link:', firstResult.sourceLink);
    console.log('✓ RAG import button:', firstResult.ragButton);
    console.log('✓ Formatted output:', firstResult.formatted.substring(0, 100) + '...');
    console.log('✓ RAG enabled:', duckduckgoResult.rag_enabled);
  }
  
  console.log('\n=== Test Complete ===');
}

// Run the test
testWebSearchRagIntegration();

// Export for module usage
export { testWebSearchRagIntegration };