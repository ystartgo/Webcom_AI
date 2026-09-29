/**
 * Adapter for Hermes Tool: 'dictionary_lookup'
 * Execution Tier: 3 (Tier 3: Delegated to Host Daemon / Port 8001 / SQLite FTS5)
 * Webcom AI - 教育部國語辭典修訂本查詢 (16.4萬條)
 */

export async function execute_dictionary_lookup(args = {}, context = {}) {
    console.log(`[Adapter] Delegating dictionary_lookup to Host Daemon...`, args);
    const resp = await context.callDaemon("/api/hermes/execute_tool", {
        name: "dictionary_lookup",
        arguments: args
    });
    return resp;
}
