# Web Search with RAG Integration - Enhanced Adapter

This documentation explains how to use the enhanced web search adapter with RAG integration.

## Features

✅ **Clickable Source Links**: Each result has a Markdown link: `[Title](URL)`
✅ **RAG Import Buttons**: One-click import with `[[Import to RAG]](javascript:importToRag(...))`
✅ **Markdown Formatting**: Results are formatted for easy reading
✅ **DuckDuckGo Compatibility**: Works with DuckDuckGo (default engine)
✅ **Error Handling**: Robust error handling and fallbacks

## Usage

### Basic Usage
```javascript
import { execute_web_search } from './hermes_bridge/adapters/web_search_rag_enhanced.js';

const results = await execute_web_search({
  query: 'RAG tutorial',
  max_results: 5
});

console.log(results.formatted_results);
```

### Advanced Usage
```javascript
const results = await execute_web_search({
  query: 'advanced RAG techniques',
  engine: 'duckduckgo', // or 'searxng', 'serper'
  max_results: 3,
  include_snippets: true
});
```

## Result Structure

The response includes:
- `status`: "success" or "error"
- `tool`: "web_search"
- `results`: Raw search results
- `formatted_results`: Formatted results with source links and RAG buttons
- `rag_enabled`: Boolean indicating RAG features are active
- `summary`: Summary of results

## Implementation Details

1. **Source Link Generation**: Creates Markdown links for each result
2. **RAG Button Creation**: Generates JavaScript buttons for one-click import
3. **JSON Serialization**: Properly encodes data for JavaScript execution
4. **Fallback Mechanism**: Uses mock data if original API fails

## Configuration

The adapter uses the existing `config/search_config.json` file:
- Default engine: DuckDuckGo
- Supports multiple engines: duckduckgo, searxng, serper
- No additional configuration needed

## Testing

To test the implementation:
```bash
node test/web_search_rag_test.js
```

## Next Steps

1. [ ] Replace `web_search.js` with this enhanced version
2. [ ] Update documentation
3. [ ] Test in production environment
4. [ ] Add monitoring and logging

---

**Note**: This is an enhanced version of the existing `web_search.js`. It maintains compatibility while adding RAG functionality.