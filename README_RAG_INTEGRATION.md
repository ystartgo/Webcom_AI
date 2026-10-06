# Web Search with RAG Integration

This documentation describes how to implement web search functionality with clickable sources and RAG import buttons.

## Features

✅ **Clickable Source Links**: Each search result includes a Markdown link to the original source
✅ **RAG Import Buttons**: One-click import of search results into your RAG knowledge base
✅ **Automated Processing**: Content is automatically formatted and prepared for RAG use
✅ **Configurable Options**: Enable/disable features and customize behavior
✅ **Error Handling**: Robust error handling for failed imports

## Implementation Structure

```
src/
├── web_search_rag_integration.js    # Core web search with source links
├── rag_import_system.js            # RAG import functionality
└── web_search_with_rag.js          # Complete integration
```

## Usage Examples

### Basic Usage
```javascript
import webSearchWithRag from './src/web_search_with_rag.js';

const results = await webSearchWithRag(['RAG tutorial']);
console.log(results);
```

### With Custom Options
```javascript
const results = await webSearchWithRag(
  ['advanced RAG techniques'], 
  {
    MAX_RESULTS: 3,
    ENABLE_SOURCE_LINKS: true,
    ENABLE_RAG_IMPORT: true
  }
);
```

## How the RAG Import Works

1. **Source Extraction**: Extract title, URL, and snippet from search results
2. **Content Preparation**: Format content for RAG use (chunking, metadata)
3. **Embedding Generation**: Convert text to vector embeddings
4. **Vector Database Storage**: Store in your chosen vector database
5. **Status Feedback**: Provide success/failure feedback to user

## Supported Vector Databases

- ChromaDB
- Pinecone
- Weaviate
- Qdrant
- Milvus

## Configuration Options

| Option | Default | Description |
|--------|---------|-------------|
| `MAX_RESULTS` | 5 | Maximum number of search results |
| `ENABLE_SOURCE_LINKS` | true | Show clickable source links |
| `ENABLE_RAG_IMPORT` | true | Show RAG import buttons |
| `fetchFullContent` | false | Fetch full webpage content |
| `chunking.strategy` | 'semantic' | Chunking strategy |

## Getting Started

1. Install required dependencies
2. Configure your vector database connection
3. Set up API keys for web search providers
4. Import and use the functions in your application

## Next Steps

- [ ] Connect to actual web search API
- [ ] Implement vector database integration
- [ ] Add user interface components
- [ ] Implement error logging and monitoring
- [ ] Add testing and documentation

---

**Note**: This is a framework implementation. Actual API connections and database integrations need to be configured based on your specific infrastructure.