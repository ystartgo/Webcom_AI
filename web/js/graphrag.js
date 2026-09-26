// ================================================================
// Webcom AI - GraphRAG (Knowledge Graph Enhanced RAG) Engine
// Author: startgo (startgo@yia.app) | License: GPLv3
//
// Capabilities:
// 1. In-Browser Knowledge Graph (Nodes, Edges, Communities)
// 2. Local & Global Multi-Hop Subgraph Traversal & Retrieval
// 3. Automated Entity & Relation Extraction from RAG Documents
// 4. Interactive HTML5 Canvas Force-Directed Knowledge Graph Visualizer
// 5. LLM Prompt Context Injection for Chat & Hermes Agent Dispatch
// ================================================================

(function () {
    const GRAPHRAG_STORAGE_KEY = 'webcom_graphrag_v1';

    // Entity Category Color Palette
    const ENTITY_TYPE_CONFIG = {
        'system': { labelZh: '核心系統', labelEn: 'System', color: '#38bdf8', icon: '💻' },
        'hardware': { labelZh: '硬體與晶片', labelEn: 'Hardware', color: '#fbbf24', icon: '⚡' },
        'protocol': { labelZh: '網路與協定', labelEn: 'Protocol', color: '#34d399', icon: '🌐' },
        'agent': { labelZh: 'AI Agent / 決策', labelEn: 'AI & Safety', color: '#c084fc', icon: '🤖' },
        'service': { labelZh: '常駐服務', labelEn: 'Service', color: '#fb7185', icon: '🔌' },
        'standard': { labelZh: '標準與格式', labelEn: 'Standard', color: '#fb923c', icon: '📋' }
    };

    function getSeedKnowledgeGraph() {
        return {
            nodes: [
                { id: 'webcom_ai', label: 'Webcom AI', type: 'system', desc: '雙引擎 AI 控制台，整合 Tier 1 WASM、Tier 2 HTTP 與 Tier 3 Host Daemon。' },
                { id: 'tier1_wasm', label: 'Tier 1: Pure WASM', type: 'system', desc: '純瀏覽器本機沙箱，包含 Pyodide、Web Serial 與 Jev Fast-Decision。' },
                { id: 'tier2_http', label: 'Tier 2: Direct HTTP', type: 'system', desc: '前端直連本機或雲端 LM Studio / OpenAI 相容 REST API。' },
                { id: 'tier3_daemon', label: 'Tier 3: Host Daemon', type: 'system', desc: '本機背景常駐服務 (Port 8001)，委派執行 Shell、WSL2 與 ComfyUI。' },
                { id: 'hermes_agent', label: 'Hermes Agent', type: 'agent', desc: '自主推理與工具排程代理，搭載 101 款核心工具契約。' },
                { id: 'jev_decision', label: 'Jev Fast-Decision', type: 'agent', desc: '微秒級決策分流引擎，專責 API 500 自動重試與工具死循環阻斷。' },
                { id: 'host_daemon', label: 'Host Daemon (8001)', type: 'service', desc: 'Python FastAPI 常駐服務，監聽 127.0.0.1:8001。' },
                { id: 'web_serial', label: 'Web Serial', type: 'hardware', desc: '瀏覽器原生硬體序列埠通訊，支援 9600 至 921600 鮑率。' },
                { id: 'baud_rates', label: '9600-921600 Baud', type: 'hardware', desc: '標準嵌入式硬體通訊傳輸速率範圍。' },
                { id: 'lm_studio', label: 'LM Studio (1234)', type: 'service', desc: '本機大型語言模型推論伺服器，監聽通訊埠 1234。' },
                { id: 'ollama', label: 'Ollama (11434)', type: 'service', desc: '本機開源模型運行環境，預設監聽通訊埠 11434。' },
                { id: 'comfyui', label: 'ComfyUI (5000)', type: 'service', desc: '節點式 AI 繪圖與生圖伺服器，預設監聽通訊埠 5000。' },
                { id: 'novnc_wsl', label: 'noVNC WSL2 (6080)', type: 'service', desc: '瀏覽器內嵌 Linux 遠端桌面視窗，監聽通訊埠 6080。' },
                { id: 'kokoro_tts', label: 'Kokoro TTS (8200)', type: 'service', desc: '本機輕量高速語音合成 (TTS) 服務，監聽通訊埠 8200。' },
                { id: 'pyodide_wasm', label: 'Pyodide WASM', type: 'system', desc: '純瀏覽器執行 Python 3.11 腳本與數值計算環境。' },
                { id: 'webgpu_engine', label: 'WebGPU Native', type: 'hardware', desc: '瀏覽器原生顯示卡硬體加速推論引擎 (Qwen2.5 等 MLC 模型)。' },
                { id: 'onnx_wasm', label: 'ONNX WASM', type: 'system', desc: '跨平台神經網路 CPU/GPU 混合推論架構。' },
                { id: 'artifact_drawer', label: 'Artifact 工坊', type: 'system', desc: '即時 HTML / SVG / 程式沙箱預覽與代碼抽屜。' },
                { id: 'app_library', label: '自建應用庫', type: 'system', desc: '單檔自訂工具與腳本管理庫，支援一鍵執行與 LLM 深度調用。' },
                { id: 'ragpack_spec', label: 'RagPack 規範', type: 'standard', desc: '主題知識包備份標準格式 (.ragpack JSON)。' },
                { id: 'graphrag_engine', label: 'GraphRAG 引擎', type: 'agent', desc: '結合實體關聯圖譜與向量分塊的多跳推理知識庫系統。' }
            ],
            edges: [
                { source: 'webcom_ai', target: 'tier1_wasm', relation: '具備架構層級', weight: 1.0 },
                { source: 'webcom_ai', target: 'tier2_http', relation: '具備架構層級', weight: 1.0 },
                { source: 'webcom_ai', target: 'tier3_daemon', relation: '具備架構層級', weight: 1.0 },
                { source: 'webcom_ai', target: 'hermes_agent', relation: '搭載核心大腦', weight: 1.0 },
                { source: 'webcom_ai', target: 'jev_decision', relation: '搭載安全守護', weight: 1.0 },
                { source: 'webcom_ai', target: 'graphrag_engine', relation: '整合知識大腦', weight: 1.0 },
                { source: 'tier1_wasm', target: 'pyodide_wasm', relation: '內建執行時', weight: 0.9 },
                { source: 'tier1_wasm', target: 'webgpu_engine', relation: '硬體顯卡加速', weight: 0.9 },
                { source: 'tier1_wasm', target: 'onnx_wasm', relation: '模型推論後端', weight: 0.8 },
                { source: 'tier1_wasm', target: 'web_serial', relation: '本機外設通訊', weight: 0.9 },
                { source: 'web_serial', target: 'baud_rates', relation: '支援通訊鮑率', weight: 0.9 },
                { source: 'tier2_http', target: 'lm_studio', relation: '直連推論節點', weight: 0.9 },
                { source: 'tier2_http', target: 'ollama', relation: '直連推論節點', weight: 0.9 },
                { source: 'tier3_daemon', target: 'host_daemon', relation: '常駐連線目標', weight: 1.0 },
                { source: 'host_daemon', target: 'novnc_wsl', relation: '反向代理轉發', weight: 0.8 },
                { source: 'host_daemon', target: 'comfyui', relation: '委派生圖任務', weight: 0.8 },
                { source: 'host_daemon', target: 'kokoro_tts', relation: '呼叫語音合成', weight: 0.8 },
                { source: 'hermes_agent', target: 'tier1_wasm', relation: '派發本機工具', weight: 0.9 },
                { source: 'hermes_agent', target: 'tier2_http', relation: '派發聯網工具', weight: 0.9 },
                { source: 'hermes_agent', target: 'tier3_daemon', relation: '派發宿主工具', weight: 0.9 },
                { source: 'jev_decision', target: 'hermes_agent', relation: '阻斷死循環', weight: 1.0 },
                { source: 'jev_decision', target: 'tier2_http', relation: '500錯誤重試評估', weight: 1.0 },
                { source: 'graphrag_engine', target: 'hermes_agent', relation: '注入實體三元組', weight: 1.0 },
                { source: 'graphrag_engine', target: 'ragpack_spec', relation: '知識包格式相容', weight: 0.8 },
                { source: 'webcom_ai', target: 'artifact_drawer', relation: '提供互動沙箱', weight: 0.8 },
                { source: 'webcom_ai', target: 'app_library', relation: '提供工具管理', weight: 0.8 }
            ]
        };
    }

    class WebcomGraphRAG {
        constructor() {
            this.nodes = [];
            this.edges = [];
            this.loadGraph();
            this.visualizer = null;
        }

        loadGraph() {
            try {
                const raw = localStorage.getItem(GRAPHRAG_STORAGE_KEY);
                if (raw) {
                    const parsed = JSON.parse(raw);
                    if (parsed && Array.isArray(parsed.nodes) && Array.isArray(parsed.edges)) {
                        this.nodes = parsed.nodes;
                        this.edges = parsed.edges;
                        return;
                    }
                }
            } catch (e) {
                console.warn('[GraphRAG] Failed to load from storage, initializing seed graph:', e);
            }
            const seed = getSeedKnowledgeGraph();
            this.nodes = seed.nodes;
            this.edges = seed.edges;
            this.saveGraph();
        }

        saveGraph() {
            try {
                localStorage.setItem(GRAPHRAG_STORAGE_KEY, JSON.stringify({
                    version: '1.0',
                    updatedAt: new Date().toISOString(),
                    nodes: this.nodes,
                    edges: this.edges
                }));
            } catch (e) {
                console.warn('[GraphRAG] Failed to persist graph to localStorage:', e);
            }
        }

        getStats() {
            return {
                nodeCount: this.nodes.length,
                edgeCount: this.edges.length,
                types: Array.from(new Set(this.nodes.map(n => n.type)))
            };
        }

        // ==========================================
        // Graph Traversal & GraphRAG Query Engine
        // ==========================================
        query(userQuery, options = {}) {
            if (!userQuery || !userQuery.trim()) {
                return { hasMatch: false, matchedEntities: [], triples: [], formattedPrompt: '' };
            }

            const qLower = userQuery.trim().toLowerCase();
            const maxHops = options.maxHops || 2;
            const limit = options.limit || 15;

            // 1. Identify Seed Nodes via Exact & Substring Match
            const matchedNodes = this.nodes.filter(node => {
                const labelMatch = node.label.toLowerCase().includes(qLower) || qLower.includes(node.label.toLowerCase());
                const descMatch = node.desc && (node.desc.toLowerCase().includes(qLower) || qLower.includes(node.desc.toLowerCase()));
                return labelMatch || descMatch;
            });

            // Also check individual query tokens (e.g. "serial", "daemon", "8001", "wsl", "baud")
            const tokens = qLower.split(/[\s,./;:_|\-+~!?，。、；：？！]+/).filter(t => t.length >= 2);
            this.nodes.forEach(node => {
                if (matchedNodes.some(m => m.id === node.id)) return;
                const nodeText = (node.label + ' ' + (node.desc || '')).toLowerCase();
                if (tokens.some(tok => nodeText.includes(tok))) {
                    matchedNodes.push(node);
                }
            });

            if (matchedNodes.length === 0) {
                return { hasMatch: false, matchedEntities: [], triples: [], formattedPrompt: '' };
            }

            // 2. Multi-Hop Graph Traversal (1-Hop & 2-Hop)
            const visitedNodeIds = new Set(matchedNodes.map(n => n.id));
            const relevantEdges = [];

            let currentFrontier = new Set(visitedNodeIds);
            for (let hop = 1; hop <= maxHops; hop++) {
                const nextFrontier = new Set();
                this.edges.forEach(edge => {
                    const srcIn = currentFrontier.has(edge.source);
                    const tgtIn = currentFrontier.has(edge.target);
                    if (srcIn || tgtIn) {
                        if (!relevantEdges.some(e => e.source === edge.source && e.target === edge.target && e.relation === edge.relation)) {
                            relevantEdges.push(edge);
                        }
                        if (srcIn && !visitedNodeIds.has(edge.target)) {
                            visitedNodeIds.add(edge.target);
                            nextFrontier.add(edge.target);
                        }
                        if (tgtIn && !visitedNodeIds.has(edge.source)) {
                            visitedNodeIds.add(edge.source);
                            nextFrontier.add(edge.source);
                        }
                    }
                });
                currentFrontier = nextFrontier;
            }

            // Retrieve all involved nodes
            const allInvolvedNodes = this.nodes.filter(n => visitedNodeIds.has(n.id));

            // Map edges to Human-Readable Triples
            const triples = relevantEdges.slice(0, limit).map(e => {
                const srcNode = this.nodes.find(n => n.id === e.source) || { label: e.source };
                const tgtNode = this.nodes.find(n => n.id === e.target) || { label: e.target };
                return {
                    source: srcNode.label,
                    relation: e.relation,
                    target: tgtNode.label,
                    text: `(${srcNode.label}) ──[${e.relation}]──> (${tgtNode.label})`
                };
            });

            // Retrieve Connected RAG Docs if available
            let docSnippets = [];
            if (typeof window.getStorageDocs === 'function') {
                const docs = window.getStorageDocs() || [];
                const matchedKeywords = Array.from(visitedNodeIds).map(id => {
                    const n = this.nodes.find(node => node.id === id);
                    return n ? n.label.toLowerCase() : id;
                });
                docSnippets = docs.filter(doc => {
                    const text = ((doc.title || '') + ' ' + (doc.content || '')).toLowerCase();
                    return matchedKeywords.some(kw => text.includes(kw));
                }).slice(0, 3).map(d => ({
                    title: d.title,
                    content: d.content.slice(0, 280)
                }));
            }

            // 3. Format Structured Graph Context for Prompt Injection
            const triplesBlock = triples.map(t => `• ${t.text}`).join('\n');
            const entityDescBlock = allInvolvedNodes.slice(0, 6).map(n => `• [${n.label}] (${ENTITY_TYPE_CONFIG[n.type]?.labelZh || n.type}): ${n.desc || '無描述'}`).join('\n');
            const docBlock = docSnippets.length > 0
                ? '\n▶ 關聯百科文檔參照 (Referenced Docs):\n' + docSnippets.map(d => `《${d.title}》: ${d.content}...`).join('\n')
                : '';

            const isZh = (typeof window !== 'undefined' && window.currentLang !== 'en');
            const header = isZh
                ? '【GraphRAG 知識圖譜多跳推理背景知識 (Knowledge Graph Context)】'
                : '[GraphRAG Multi-Hop Knowledge Graph Context]';

            const formattedPrompt = `${header}\n` +
                `▶ 核心實體關聯三元組 (Knowledge Graph Triples):\n${triplesBlock || '• 暫無特定邊關聯'}\n\n` +
                `▶ 關聯實體定義 (Entity Definitions):\n${entityDescBlock}\n` +
                docBlock;

            return {
                hasMatch: true,
                matchedEntities: matchedNodes.map(n => n.label),
                allNodes: allInvolvedNodes,
                triples: triples,
                triplesCount: triples.length,
                docSnippets: docSnippets,
                formattedPrompt: formattedPrompt
            };
        }

        // ==========================================
        // Automated Entity & Relation Extraction from Docs
        // ==========================================
        extractFromDocument(doc) {
            if (!doc || !doc.content) return { addedNodes: 0, addedEdges: 0 };
            const text = (doc.title || '') + '\n' + doc.content;
            let addedNodes = 0;
            let addedEdges = 0;

            // Pattern-based Entity Identification
            const patterns = [
                { regex: /Web\s*Serial/i, id: 'web_serial', label: 'Web Serial', type: 'hardware', desc: '瀏覽器原生硬體序列埠通訊。' },
                { regex: /Pyodide/i, id: 'pyodide_wasm', label: 'Pyodide WASM', type: 'system', desc: '瀏覽器內嵌 Python 執行時。' },
                { regex: /WebGPU/i, id: 'webgpu_engine', label: 'WebGPU Native', type: 'hardware', desc: '瀏覽器顯示卡原生加速架構。' },
                { regex: /Host\s*Daemon|8001/i, id: 'host_daemon', label: 'Host Daemon (8001)', type: 'service', desc: '本機守護進程，監聽 8001 埠。' },
                { regex: /LM\s*Studio|1234/i, id: 'lm_studio', label: 'LM Studio (1234)', type: 'service', desc: '本地推論服務，監聽 1234 埠。' },
                { regex: /Ollama|11434/i, id: 'ollama', label: 'Ollama (11434)', type: 'service', desc: '開源模型服務，監聽 11434 埠。' },
                { regex: /ComfyUI|5000/i, id: 'comfyui', label: 'ComfyUI (5000)', type: 'service', desc: '節點生圖服務，監聽 5000 埠。' },
                { regex: /noVNC|WSL2|6080/i, id: 'novnc_wsl', label: 'noVNC WSL2 (6080)', type: 'service', desc: 'Linux 遠端桌面，監聽 6080 埠。' },
                { regex: /Kokoro|8200/i, id: 'kokoro_tts', label: 'Kokoro TTS (8200)', type: 'service', desc: '語音合成服務，監聽 8200 埠。' },
                { regex: /MusicGen|9150/i, id: 'musicgen', label: 'MusicGen (9150)', type: 'service', desc: '音樂生成服務，監聽 9150 埠。' },
                { regex: /9600|115200|921600|鮑率|baud/i, id: 'baud_rates', label: '9600-921600 Baud', type: 'hardware', desc: '標準串列通訊鮑率。' },
                { regex: /Jev|500|重試/i, id: 'jev_decision', label: 'Jev Fast-Decision', type: 'agent', desc: '極速決策防護引擎。' },
                { regex: /Hermes/i, id: 'hermes_agent', label: 'Hermes Agent', type: 'agent', desc: '101 款工具自主調度大腦。' }
            ];

            const matchedPatternIds = [];
            patterns.forEach(p => {
                if (p.regex.test(text)) {
                    matchedPatternIds.push(p.id);
                    if (!this.nodes.some(n => n.id === p.id)) {
                        this.nodes.push({ id: p.id, label: p.label, type: p.type, desc: p.desc });
                        addedNodes++;
                    }
                }
            });

            // Create doc-node
            const docNodeId = 'doc_' + (doc.id || Math.random().toString(36).substring(2, 8));
            if (!this.nodes.some(n => n.id === docNodeId)) {
                this.nodes.push({
                    id: docNodeId,
                    label: doc.title || '百科文檔',
                    type: 'standard',
                    desc: doc.content.slice(0, 80) + '...'
                });
                addedNodes++;
            }

            // Link doc node to all matched entities in this doc
            matchedPatternIds.forEach(targetId => {
                if (!this.edges.some(e => e.source === docNodeId && e.target === targetId)) {
                    this.edges.push({
                        source: docNodeId,
                        target: targetId,
                        relation: '記載包含實體',
                        weight: 0.8
                    });
                    addedEdges++;
                }
            });

            this.saveGraph();
            return { addedNodes, addedEdges };
        }

        rebuildFromAllDocs() {
            const seed = getSeedKnowledgeGraph();
            this.nodes = [...seed.nodes];
            this.edges = [...seed.edges];

            let totalNodes = 0;
            let totalEdges = 0;

            if (typeof window.getStorageDocs === 'function') {
                const docs = window.getStorageDocs() || [];
                docs.forEach(doc => {
                    const res = this.extractFromDocument(doc);
                    totalNodes += res.addedNodes;
                    totalEdges += res.addedEdges;
                });
            }

            this.saveGraph();
            if (this.visualizer) this.visualizer.resetData(this.nodes, this.edges);
            return { totalNodes, totalEdges, totalCount: this.nodes.length, edgeCount: this.edges.length };
        }

        addTriple(sourceLabel, relation, targetLabel, type = 'concept', desc = '') {
            const srcId = sourceLabel.trim().toLowerCase().replace(/\s+/g, '_');
            const tgtId = targetLabel.trim().toLowerCase().replace(/\s+/g, '_');

            if (!this.nodes.some(n => n.id === srcId)) {
                this.nodes.push({ id: srcId, label: sourceLabel.trim(), type: type, desc: desc || sourceLabel.trim() });
            }
            if (!this.nodes.some(n => n.id === tgtId)) {
                this.nodes.push({ id: tgtId, label: targetLabel.trim(), type: 'standard', desc: targetLabel.trim() });
            }

            if (!this.edges.some(e => e.source === srcId && e.target === tgtId && e.relation === relation.trim())) {
                this.edges.push({
                    source: srcId,
                    target: tgtId,
                    relation: relation.trim(),
                    weight: 1.0
                });
            }

            this.saveGraph();
            if (this.visualizer) this.visualizer.resetData(this.nodes, this.edges);
        }
    }

    // ==========================================
    // Interactive Canvas Knowledge Graph Visualizer
    // ==========================================
    class GraphVisualizer {
        constructor(canvasId, containerId, graphEngine) {
            this.canvas = document.getElementById(canvasId);
            this.container = document.getElementById(containerId);
            this.engine = graphEngine;
            this.ctx = this.canvas ? this.canvas.getContext('2d') : null;

            this.nodes = [];
            this.edges = [];
            this.physicsNodes = [];
            this.isSimulating = true;

            this.transform = { x: 0, y: 0, k: 1 };
            this.isDragging = false;
            this.dragTargetNode = null;
            this.hoveredNode = null;
            this.selectedNode = null;
            this.lastMouse = { x: 0, y: 0 };
            this.activeFilter = 'all';

            if (this.canvas) {
                this.initEvents();
                this.resetData(graphEngine.nodes, graphEngine.edges);
            }
        }

        resetData(nodes, edges) {
            this.nodes = nodes || [];
            this.edges = edges || [];

            const width = this.canvas ? this.canvas.clientWidth : 700;
            const height = this.canvas ? this.canvas.clientHeight : 450;

            // Initialize 2D physics layout
            const count = this.nodes.length;
            this.physicsNodes = this.nodes.map((n, i) => {
                const angle = (i / Math.max(1, count)) * Math.PI * 2;
                const radius = 120 + Math.random() * 80;
                return {
                    ...n,
                    x: width / 2 + Math.cos(angle) * radius,
                    y: height / 2 + Math.sin(angle) * radius,
                    vx: 0,
                    vy: 0,
                    radius: n.id === 'webcom_ai' ? 24 : 16
                };
            });

            this.transform = { x: 0, y: 0, k: 1 };
            this.isSimulating = true;
            this.requestRender();
        }

        initEvents() {
            window.addEventListener('resize', () => this.resizeCanvas());
            this.resizeCanvas();

            this.canvas.addEventListener('mousedown', (e) => {
                const rect = this.canvas.getBoundingClientRect();
                const mouseX = (e.clientX - rect.left - this.transform.x) / this.transform.k;
                const mouseY = (e.clientY - rect.top - this.transform.y) / this.transform.k;

                const clicked = this.physicsNodes.find(n => {
                    const dist = Math.hypot(n.x - mouseX, n.y - mouseY);
                    return dist <= n.radius + 6;
                });

                if (clicked) {
                    this.dragTargetNode = clicked;
                    this.selectedNode = clicked;
                    this.onNodeSelected(clicked);
                } else {
                    this.isDragging = true;
                    this.dragTargetNode = null;
                }
                this.lastMouse = { x: e.clientX, y: e.clientY };
                this.requestRender();
            });

            window.addEventListener('mousemove', (e) => {
                const rect = this.canvas.getBoundingClientRect();
                if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) {
                    if (!this.dragTargetNode && !this.isDragging) return;
                }

                const dx = e.clientX - this.lastMouse.x;
                const dy = e.clientY - this.lastMouse.y;
                this.lastMouse = { x: e.clientX, y: e.clientY };

                if (this.dragTargetNode) {
                    this.dragTargetNode.x += dx / this.transform.k;
                    this.dragTargetNode.y += dy / this.transform.k;
                    this.isSimulating = true;
                    this.requestRender();
                } else if (this.isDragging) {
                    this.transform.x += dx;
                    this.transform.y += dy;
                    this.requestRender();
                } else {
                    // Hover check
                    const mouseX = (e.clientX - rect.left - this.transform.x) / this.transform.k;
                    const mouseY = (e.clientY - rect.top - this.transform.y) / this.transform.k;
                    const hovered = this.physicsNodes.find(n => {
                        return Math.hypot(n.x - mouseX, n.y - mouseY) <= n.radius + 4;
                    });
                    if (this.hoveredNode !== hovered) {
                        this.hoveredNode = hovered;
                        this.canvas.style.cursor = hovered ? 'pointer' : 'default';
                        this.requestRender();
                    }
                }
            });

            window.addEventListener('mouseup', () => {
                this.isDragging = false;
                this.dragTargetNode = null;
            });

            this.canvas.addEventListener('wheel', (e) => {
                e.preventDefault();
                const zoomFactor = e.deltaY < 0 ? 1.15 : 0.88;
                const newK = Math.max(0.3, Math.min(3.5, this.transform.k * zoomFactor));

                const rect = this.canvas.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                const mouseY = e.clientY - rect.top;

                this.transform.x = mouseX - (mouseX - this.transform.x) * (newK / this.transform.k);
                this.transform.y = mouseY - (mouseY - this.transform.y) * (newK / this.transform.k);
                this.transform.k = newK;
                this.requestRender();
            });
        }

        resizeCanvas() {
            if (!this.canvas || !this.container) return;
            const w = this.container.clientWidth || 700;
            const h = 420;
            this.canvas.width = w * window.devicePixelRatio || w;
            this.canvas.height = h * window.devicePixelRatio || h;
            this.canvas.style.width = w + 'px';
            this.canvas.style.height = h + 'px';
            if (this.ctx) {
                this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
            }
            this.requestRender();
        }

        onNodeSelected(node) {
            const detailEl = document.getElementById('graphrag-node-detail');
            if (!detailEl) return;
            const connectedEdges = this.edges.filter(e => e.source === node.id || e.target === node.id);
            const isZh = (window.currentLang !== 'en');

            detailEl.innerHTML = `
                <div class="p-3 bg-gray-950 border border-emerald-500/40 rounded-xl space-y-2 text-xs">
                    <div class="flex items-center justify-between border-b border-gray-800 pb-1.5">
                        <div class="flex items-center gap-1.5 font-bold text-white text-sm">
                            <span>${ENTITY_TYPE_CONFIG[node.type]?.icon || '📌'}</span>
                            <span class="text-emerald-300">${node.label}</span>
                        </div>
                        <span class="text-[10px] px-2 py-0.5 rounded-full font-mono bg-emerald-950 text-emerald-300 border border-emerald-800/40">
                            ${ENTITY_TYPE_CONFIG[node.type]?.labelZh || node.type}
                        </span>
                    </div>
                    <p class="text-gray-300 text-[11px] leading-relaxed">${node.desc || '無特定描述。'}</p>
                    <div class="pt-1 border-t border-gray-900">
                        <div class="text-[10px] text-gray-500 font-bold mb-1">${isZh ? '關聯實體路徑' : 'Connected Relations'} (${connectedEdges.length}):</div>
                        <div class="space-y-1 max-h-24 overflow-y-auto font-mono text-[10px] text-gray-400">
                            ${connectedEdges.map(e => {
                                const isSrc = e.source === node.id;
                                const other = this.nodes.find(n => n.id === (isSrc ? e.target : e.source));
                                return `<div>${isSrc ? '──[' + e.relation + ']──>' : '<──[' + e.relation + ']──'} <span class="text-emerald-400 font-bold">${other?.label || '未知'}</span></div>`;
                            }).join('')}
                        </div>
                    </div>
                </div>
            `;
        }

        stepPhysics() {
            if (!this.isSimulating) return;
            const width = this.canvas.clientWidth || 700;
            const height = this.canvas.clientHeight || 420;

            let totalMotion = 0;

            // 1. Repulsion between all nodes
            for (let i = 0; i < this.physicsNodes.length; i++) {
                for (let j = i + 1; j < this.physicsNodes.length; j++) {
                    const a = this.physicsNodes[i];
                    const b = this.physicsNodes[j];
                    const dx = b.x - a.x;
                    const dy = b.y - a.y;
                    const dist = Math.hypot(dx, dy) || 1;
                    if (dist < 260) {
                        const force = (260 - dist) / dist * 0.45;
                        a.vx -= dx * force;
                        a.vy -= dy * force;
                        b.vx += dx * force;
                        b.vy += dy * force;
                    }
                }
            }

            // 2. Spring attraction along edges
            this.edges.forEach(edge => {
                const src = this.physicsNodes.find(n => n.id === edge.source);
                const tgt = this.physicsNodes.find(n => n.id === edge.target);
                if (src && tgt) {
                    const dx = tgt.x - src.x;
                    const dy = tgt.y - src.y;
                    const dist = Math.hypot(dx, dy) || 1;
                    const targetDist = 90;
                    const force = (dist - targetDist) * 0.025;
                    src.vx += (dx / dist) * force;
                    src.vy += (dy / dist) * force;
                    tgt.vx -= (dx / dist) * force;
                    tgt.vy -= (dy / dist) * force;
                }
            });

            // 3. Center gravity & velocity damping
            this.physicsNodes.forEach(n => {
                if (n === this.dragTargetNode) return;
                const cdx = width / 2 - n.x;
                const cdy = height / 2 - n.y;
                n.vx += cdx * 0.003;
                n.vy += cdy * 0.003;

                n.vx *= 0.85;
                n.vy *= 0.85;

                n.x += n.vx;
                n.y += n.vy;

                totalMotion += Math.hypot(n.vx, n.vy);
            });

            if (totalMotion < 0.15 && !this.dragTargetNode) {
                this.isSimulating = false;
            }
        }

        render() {
            if (!this.ctx || !this.canvas) return;
            const w = this.canvas.clientWidth || 700;
            const h = this.canvas.clientHeight || 420;

            this.stepPhysics();

            this.ctx.clearRect(0, 0, w, h);
            this.ctx.save();
            this.ctx.translate(this.transform.x, this.transform.y);
            this.ctx.scale(this.transform.k, this.transform.k);

            // Draw Edges
            this.edges.forEach(edge => {
                const src = this.physicsNodes.find(n => n.id === edge.source);
                const tgt = this.physicsNodes.find(n => n.id === edge.target);
                if (!src || !tgt) return;

                const isConnectedToSelected = this.selectedNode && (src.id === this.selectedNode.id || tgt.id === this.selectedNode.id);
                const isHoveredEdge = this.hoveredNode && (src.id === this.hoveredNode.id || tgt.id === this.hoveredNode.id);

                this.ctx.beginPath();
                this.ctx.moveTo(src.x, src.y);
                this.ctx.lineTo(tgt.x, tgt.y);

                if (isConnectedToSelected || isHoveredEdge) {
                    this.ctx.strokeStyle = '#34d399';
                    this.ctx.lineWidth = 2.2;
                } else {
                    this.ctx.strokeStyle = 'rgba(75, 85, 99, 0.4)';
                    this.ctx.lineWidth = 1.0;
                }
                this.ctx.stroke();

                // Edge label at midpoint
                if (this.transform.k >= 0.75 || isConnectedToSelected) {
                    const midX = (src.x + tgt.x) / 2;
                    const midY = (src.y + tgt.y) / 2;
                    this.ctx.fillStyle = isConnectedToSelected ? '#6ee7b7' : '#9ca3af';
                    this.ctx.font = '9px monospace';
                    this.ctx.textAlign = 'center';
                    this.ctx.textBaseline = 'middle';
                    this.ctx.fillText(edge.relation, midX, midY - 4);
                }
            });

            // Draw Nodes
            this.physicsNodes.forEach(node => {
                const isSelected = this.selectedNode && this.selectedNode.id === node.id;
                const isHovered = this.hoveredNode && this.hoveredNode.id === node.id;
                const isConnected = this.selectedNode && this.edges.some(e =>
                    (e.source === this.selectedNode.id && e.target === node.id) ||
                    (e.target === this.selectedNode.id && e.source === node.id)
                );

                const typeCfg = ENTITY_TYPE_CONFIG[node.type] || { color: '#94a3b8' };

                // Outer halo for selected or hovered
                if (isSelected || isHovered) {
                    this.ctx.beginPath();
                    this.ctx.arc(node.x, node.y, node.radius + 6, 0, Math.PI * 2);
                    this.ctx.fillStyle = isSelected ? 'rgba(52, 211, 153, 0.3)' : 'rgba(255, 255, 255, 0.15)';
                    this.ctx.fill();
                }

                // Node circle
                this.ctx.beginPath();
                this.ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
                this.ctx.fillStyle = '#0f172a';
                this.ctx.fill();
                this.ctx.lineWidth = isSelected ? 3 : (isConnected ? 2 : 1.5);
                this.ctx.strokeStyle = isSelected ? '#10b981' : (isConnected ? '#34d399' : typeCfg.color);
                this.ctx.stroke();

                // Inner core
                this.ctx.beginPath();
                this.ctx.arc(node.x, node.y, node.radius * 0.45, 0, Math.PI * 2);
                this.ctx.fillStyle = typeCfg.color;
                this.ctx.fill();

                // Node Label
                this.ctx.fillStyle = (isSelected || isConnected) ? '#ffffff' : '#cbd5e1';
                this.ctx.font = isSelected ? 'bold 11px sans-serif' : '10px sans-serif';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'top';
                this.ctx.fillText(node.label, node.x, node.y + node.radius + 3);
            });

            this.ctx.restore();

            if (this.isSimulating) {
                requestAnimationFrame(() => this.render());
            }
        }

        requestRender() {
            requestAnimationFrame(() => this.render());
        }

        zoomIn() {
            this.transform.k = Math.min(3.5, this.transform.k * 1.25);
            this.requestRender();
        }

        zoomOut() {
            this.transform.k = Math.max(0.3, this.transform.k * 0.8);
            this.requestRender();
        }

        resetView() {
            const w = this.canvas.clientWidth || 700;
            const h = this.canvas.clientHeight || 420;
            this.transform = { x: 0, y: 0, k: 1 };
            this.requestRender();
        }
    }

    // Initialize Global GraphRAG Singleton
    const graphRagEngine = new WebcomGraphRAG();
    window.graphRagEngine = graphRagEngine;
    window.GraphVisualizer = GraphVisualizer;
})();
