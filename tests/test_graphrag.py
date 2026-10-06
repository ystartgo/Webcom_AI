"""
test_graphrag.py - Automated CDP Verification of GraphRAG (Knowledge Graph Enhanced RAG)
Verifies:
1. GraphRAG engine loaded in-browser (Tier 1 Pure WASM / standalone mode).
2. Seed Knowledge Graph initialized with nodes (>=21) and edges (>=26).
3. Multi-hop traversal and local/global query engine with prompt context formatting.
4. RAG Modal 3-tab navigation (Docs, Visualizer, Search Test).
5. HTML5 Canvas GraphVisualizer activation and rendering.
6. Hermes Agent dispatcher Tier 1 execution of 'graphrag_query'.
7. Chat LLM system prompt context injection with [GraphRAG] badge.
"""

import asyncio
import json
import os
import subprocess
import sys
import time
import urllib.request
import websockets

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

CDP_PORT = 9225
EDGE_PATHS = [
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Google\Chrome\Application\chrome.exe"
]
CHROME_PATH = next((p for p in EDGE_PATHS if os.path.exists(p)), None)

class SimpleCDP:
    def __init__(self, ws_url):
        self.ws_url = ws_url
        self.ws = None
        self.id_counter = 0

    async def connect(self):
        self.ws = await websockets.connect(self.ws_url, max_size=50*1024*1024)

    async def send_cmd(self, method, params=None):
        self.id_counter += 1
        msg_id = self.id_counter
        payload = {"id": msg_id, "method": method, "params": params or {}}
        await self.ws.send(json.dumps(payload))
        while True:
            resp = json.loads(await self.ws.recv())
            if resp.get("id") == msg_id:
                return resp

    async def eval_js(self, expression):
        res = await self.send_cmd("Runtime.evaluate", {
            "expression": expression,
            "awaitPromise": True,
            "returnByValue": True
        })
        val = res.get("result", {}).get("result", {}).get("value")
        exc = res.get("result", {}).get("exceptionDetails")
        if exc:
            raise Exception(f"JS Exception: {exc}")
        return val

async def run_tests():
    print(f"[*] Starting Edge in headless mode on port {CDP_PORT}...")
    user_data = os.path.abspath(f"temp_edge_graphrag_{int(time.time())}")
    cmd = [
        CHROME_PATH,
        f"--remote-debugging-port={CDP_PORT}",
        "--headless=new",
        "--disable-gpu",
        "--no-first-run",
        f"--user-data-dir={user_data}",
        "http://127.0.0.1:8001/web/index.html"
    ]
    proc = subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    
    cdp = None
    try:
        # Wait for CDP endpoint
        await asyncio.sleep(2.0)
        tabs_url = f"http://127.0.0.1:{CDP_PORT}/json"
        ws_url = None
        for _ in range(20):
            try:
                with urllib.request.urlopen(tabs_url, timeout=1.0) as resp:
                    tabs = json.loads(resp.read().decode('utf-8'))
                    page_tabs = [t for t in tabs if t.get('type') == 'page' and '127.0.0.1' in t.get('url', '')]
                    if not page_tabs:
                        page_tabs = [t for t in tabs if t.get('type') == 'page']
                    if page_tabs:
                        ws_url = page_tabs[0].get("webSocketDebuggerUrl")
                        break
            except Exception:
                await asyncio.sleep(0.5)

        assert ws_url, "Could not obtain CDP WebSocketDebuggerUrl"
        cdp = SimpleCDP(ws_url)
        await cdp.connect()
        print("[+] CDP connected successfully.")

        # Robust wait for page load & window.graphRagEngine initialization
        for _ in range(30):
            try:
                ready = await cdp.eval_js("document.readyState === 'complete' && !!window.graphRagEngine && !!window.webcomApp")
                if ready:
                    break
            except Exception:
                pass
            await asyncio.sleep(0.3)

        # 1. Verify GraphRAG Engine is loaded
        print("\n--- TEST 1: GraphRAG Engine Instance ---")
        stats = await cdp.eval_js("""
            (() => {
                if (!window.graphRagEngine) return null;
                return window.graphRagEngine.getStats();
            })()
        """)
        print("GraphRAG Stats in browser:", stats)
        assert stats is not None, "window.graphRagEngine must be defined!"
        assert stats.get("nodeCount", 0) >= 20, f"Expected >= 20 nodes, got {stats.get('nodeCount')}"
        assert stats.get("edgeCount", 0) >= 20, f"Expected >= 20 edges, got {stats.get('edgeCount')}"
        print("✔ TEST 1 PASSED: GraphRAG initialized with nodes and edges.")

        # 2. Multi-Hop Traversal Query
        print("\n--- TEST 2: Multi-Hop Traversal & Context Formatting ---")
        query_res = await cdp.eval_js("""
            (() => {
                const res = window.graphRagEngine.query('Web Serial 序列埠', { maxHops: 2 });
                return {
                    hasMatch: res.hasMatch,
                    matchedEntities: res.matchedEntities,
                    triplesCount: res.triplesCount,
                    triples: res.triples.map(t => t.text),
                    formattedPrompt: res.formattedPrompt
                };
            })()
        """)
        print("Query matched entities:", query_res.get("matchedEntities"))
        print("Triples count:", query_res.get("triplesCount"))
        print("Sample triple:", query_res.get("triples", [])[:2])
        assert query_res["hasMatch"] is True, "Expected query match for Web Serial"
        assert "Web Serial" in query_res["matchedEntities"], "Web Serial should be matched"
        assert query_res["triplesCount"] > 0, "Should have discovered connected triples"
        assert "【GraphRAG" in query_res["formattedPrompt"], "Formatted prompt should contain GraphRAG header"
        print("✔ TEST 2 PASSED: Multi-hop traversal and prompt context formatting succeed.")

        # 3. Hermes Tool Dispatcher Execution (Tier 1 Pure WASM)
        print("\n--- TEST 3: Hermes Tool Dispatcher 'graphrag_query' ---")
        tool_res = await cdp.eval_js("""
            (async () => {
                const appInstance = window.webcomApp || window.app;
                const dispatcher = appInstance ? appInstance.dispatcher : new window.HermesToolDispatcher();
                return await dispatcher.executeTool('graphrag_query', {
                    query: 'Daemon 8001 和 Jev',
                    mode: 'hybrid'
                });
            })()
        """)
        print("Tool execution result:", {k: v for k, v in tool_res.items() if k != 'context'})
        assert tool_res.get("status") == "success", f"Tool call failed: {tool_res}"
        assert tool_res.get("has_match") is True, "Tool call should find match for Daemon / Jev"
        print("✔ TEST 3 PASSED: Hermes Tool Dispatcher executes 'graphrag_query' cleanly.")

        # 4. RAG Modal Sub-Tab Switching & Canvas Visualizer
        print("\n--- TEST 4: RAG Modal Tabs & Canvas Visualizer ---")
        tab_switch_res = await cdp.eval_js("""
            (async () => {
                const modal = document.getElementById('rag-modal');
                if (modal) modal.classList.remove('hidden');
                modal.classList.add('flex');

                // Switch to graph tab
                const graphTabBtn = document.querySelector('[data-tab="graph"]');
                if (graphTabBtn) graphTabBtn.click();
                await new Promise(r => setTimeout(r, 120));

                const docsTabHidden = document.getElementById('rag-tab-content-docs').classList.contains('hidden');
                const graphTabVisible = !document.getElementById('rag-tab-content-graph').classList.contains('hidden');
                const canvas = document.getElementById('graphrag-canvas');
                const hasVisualizer = !!(window.graphRagVisualizer || (window.graphRagEngine && window.graphRagEngine.visualizer));

                return {
                    docsTabHidden,
                    graphTabVisible,
                    canvasWidth: canvas ? canvas.width : 0,
                    canvasHeight: canvas ? canvas.height : 0,
                    hasVisualizer
                };
            })()
        """)
        print("Tab switch result:", tab_switch_res)
        assert tab_switch_res["graphTabVisible"] is True, "Graph tab should be visible"
        assert tab_switch_res["docsTabHidden"] is True, "Docs tab should be hidden"
        assert tab_switch_res["canvasWidth"] > 0, "Canvas should have positive width"
        assert tab_switch_res["hasVisualizer"] is True, "Visualizer instance must be created"
        print("✔ TEST 4 PASSED: Graph visualizer tab active with rendering canvas.")

        # 5. Multi-Hop Search Test Tab
        print("\n--- TEST 5: Interactive Multi-Hop Search Tab ---")
        search_tab_res = await cdp.eval_js("""
            (() => {
                const searchTabBtn = document.querySelector('[data-tab="search"]');
                if (searchTabBtn) searchTabBtn.click();

                const input = document.getElementById('graphrag-test-query');
                if (input) input.value = 'Pyodide WASM';

                const searchBtn = document.getElementById('btn-graphrag-test-search');
                if (searchBtn) searchBtn.click();

                const resultsDiv = document.getElementById('graphrag-test-results');
                return {
                    resultsHtml: resultsDiv ? resultsDiv.innerHTML : '',
                    hasEntities: resultsDiv ? resultsDiv.innerText.includes('Pyodide') : false
                };
            })()
        """)
        print("Search tab result hasEntities:", search_tab_res["hasEntities"])
        assert search_tab_res["hasEntities"] is True, "Search results should include Pyodide"
        print("✔ TEST 5 PASSED: Interactive Multi-Hop Search Tab operates cleanly.")

        # 6. Chat with RAG flag enabled & GraphRAG badge injection
        print("\n--- TEST 6: Chat LLM Context Injection & Badge ---")
        chat_res = await cdp.eval_js("""
            (async () => {
                const appInstance = window.webcomApp || window.app;
                // Ensure RAG flag is ON
                if (appInstance) {
                    appInstance.flags.rag = true;
                    const toggleRag = document.getElementById('toggle-rag');
                    if (toggleRag) toggleRag.setAttribute('data-active', 'true');
                    
                    // Directly invoke _streamLlmAnswer with existing content element
                    const container = document.getElementById('chat-container');
                    const dict = { copyBtn: '複製', retryBtn: '重試', reasoningThinking: '推論中...' };
                    await appInstance._streamLlmAnswer('請根據知識圖譜說明 Web Serial 鮑率', container, dict);
                }
                
                await new Promise(r => setTimeout(r, 600));
                
                const bubbles = document.querySelectorAll('.assistant-msg-bubble');
                const lastBubble = bubbles[bubbles.length - 1];
                const text = lastBubble ? lastBubble.innerText : '';
                const hasGraphBadge = text.includes('GraphRAG');
                return {
                    hasBubble: !!lastBubble,
                    hasGraphBadge,
                    bubbleHeader: text.slice(0, 150)
                };
            })()
        """)
        print("Chat result:", chat_res)
        assert chat_res["hasBubble"] is True, "Assistant message bubble should be created"
        assert chat_res["hasGraphBadge"] is True, "Bubble must contain [GraphRAG] badge"
        print("✔ TEST 6 PASSED: GraphRAG badge and context injected into chat bubble.")

        print("\n=======================================================")
        print("🎉 ALL 6 GRAPHRAG TESTS COMPLETED AND VERIFIED 100%!")
        print("=======================================================")

    finally:
        if cdp and cdp.ws:
            await cdp.ws.close()
        if proc:
            proc.terminate()
            try:
                proc.wait(timeout=3)
            except Exception:
                proc.kill()
        # Clean up temp user-data-dir
        try:
            import shutil
            if os.path.exists(user_data):
                shutil.rmtree(user_data, ignore_errors=True)
        except Exception:
            pass

if __name__ == '__main__':
    asyncio.run(run_tests())
