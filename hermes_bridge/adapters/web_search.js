/**
 * Adapter for Hermes Tool: 'web_search'
 * Execution Tier: Six (Tier 3: Delegated to Host Daemon for multi-engine search)
 * Updated to support DuckDuckGo, SearXNG, and configurable search engines
 */

export async function execute_web_search(args = {}, context = {}) {
    // Tier 3 execution: forward to Webcom Host Daemon for multi-engine search
    console.log(`[Adapter] Delegating web_search to Host Daemon...`, args);
    
    const resp = await context.callDaemon("/api/hermes/execute_tool", {
        name: "web_search",
        arguments: {
            query: args.query || args.question || "",
            engine: args.engine || "duckduckgo", // Default to DuckDuckGo
            max_results: args.max_results || 6,
            ...args
        }
    });
    return resp;
}
