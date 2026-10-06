/**
 * Force Search Example
 * Demonstrates how to explicitly trigger web search for specific queries
 */

// Import required modules
import forceWebSearch from '../tools/force_search_trigger.js';
import { formatSearchResultsForChat } from '../tools/force_search_trigger.js';

/**
 * Example usage of force search functionality
 */
export async function exampleUsage() {
  console.log('=== Force Search Example ===\n');
  
  // Example 1: Basic search
  console.log('Example 1: Basic search for MP1652F');
  try {
    const results = await forceWebSearch('MP1652F datasheet');
    console.log('Search results:', results);
    
    // Format for chat display
    const chatOutput = formatSearchResultsForChat(results);
    console.log('\nFormatted for chat:\n', chatOutput);
  } catch (error) {
    console.error('Search failed:', error);
  }
  
  // Example 2: Search with options
  console.log('\nExample 2: Search with options');
  try {
    const results = await forceWebSearch('MP1652F application notes', {
      engine: 'duckduckgo',
      maxResults: 3
    });
    
    const chatOutput = formatSearchResultsForChat(results);
    console.log('\nFormatted for chat:\n', chatOutput);
  } catch (error) {
    console.error('Search failed:', error);
  }
  
  // Example 3: Error handling
  console.log('\nExample 3: Error handling');
  try {
    const results = await forceWebSearch('non-existent product');
    console.log('Search results:', results);
  } catch (error) {
    console.error('Expected error:', error.message);
  }
}

// Run the example
exampleUsage();

// Export default
export default exampleUsage;