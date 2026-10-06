/**
 * Dialogue Search Renderer
 * Renders web search results as clickable links in chat对话
 * Compatible with DuckDuckGo and other search engines
 */

/**
 * Render search results for dialogue display
 * @param {Array} formattedResults - Formatted results from web_search_rag_enhanced
 * @returns {string} HTML-safe rendered output
 */
export function renderSearchResultsForDialogue(formattedResults) {
  if (!Array.isArray(formattedResults) || formattedResults.length === 0) {
    return 'No search results found.';
  }
  
  // Create HTML-safe output with clickable links
  const htmlResults = formattedResults.map((result, index) => {
    // Escape HTML characters but preserve links
    const escapedTitle = escapeHtml(result.title);
    const escapedSnippet = escapeHtml(result.snippet);
    
    return `
<div class="search-result" data-index="${index}">
  <h4 class="result-title">
    <a href="${result.url}" target="_blank" rel="noopener noreferrer">
      ${escapedTitle}
    </a>
  </h4>
  <p class="result-snippet">${escapedSnippet}</p>
  <div class="result-meta">
    <a href="${result.url}" target="_blank" rel="noopener noreferrer" class="source-link">
      🔗 ${truncateUrl(result.url)}
    </a>
    <button class="rag-import-btn" data-result-id="${result.id}" data-result-data='${encodeURIComponent(JSON.stringify({
      title: result.title,
      url: result.url,
      snippet: result.snippet
    }))}'>
      📥 Import to RAG
    </button>
  </div>
</div>`;
  }).join('');
  
  return `<div class="search-results-container">${htmlResults}</div>`;
}

/**
 * Escape HTML special characters
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Truncate URL for display
 * @param {string} url - URL to truncate
 * @returns {string} Truncated URL
 */
function truncateUrl(url) {
  if (!url) return '';
  const maxLength = 50;
  if (url.length <= maxLength) return url;
  return url.substring(0, maxLength - 3) + '...';
}

/**
 * Generate plain text version for fallback
 * @param {Array} formattedResults - Formatted results
 * @returns {string} Plain text version
 */
export function renderSearchResultsPlainText(formattedResults) {
  if (!Array.isArray(formattedResults) || formattedResults.length === 0) {
    return 'No search results found.';
  }
  
  return formattedResults.map((result, index) => {
    return `\n${index + 1}. ${result.title}\n   ${result.snippet}\n   Source: ${result.url}`;
  }).join('');
}

// Export helper functions
export {
  escapeHtml,
  truncateUrl
};