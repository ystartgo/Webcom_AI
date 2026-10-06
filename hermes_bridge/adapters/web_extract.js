/**
 * Adapter for Hermes Tool: 'web_extract'
 * Execution Tier: 3 (Tier 3: Delegated to Host Daemon for BeautifulSoup4 processing)
 * Updated to use backend web extraction with BeautifulSoup4
 */

export async function execute_web_extract(args = {}, context = {}) {
    // Tier 3 execution: forward to Webcom Host Daemon for web extraction
    console.log(`[Adapter] Delegating web_extract to Host Daemon...`, args);
    
    // Extract URL and selector
    const url = args.url || args.query || '';
    const selector = args.selector || args.css || '';
    
    if (!url) {
        return {
            status: "error",
            tool: "web_extract",
            error: "No URL provided for web extraction"
        };
    }
    
    const resp = await context.callDaemon("/api/hermes/execute_tool", {
        name: "web_extract",
        arguments: {
            url: url,
            selector: selector,
            ...args
        }
    });
    return resp;
}
