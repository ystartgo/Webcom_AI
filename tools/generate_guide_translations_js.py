import json
import re

with open('web/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

start_idx = html.find('id="guide-modal"')
end_idx = html.find('id="btn-close-guide-footer"', start_idx)
guide_html = html[start_idx:end_idx]

tab_matches = list(re.finditer(r'<div id="(guide-tab-[^"]+)" class="guide-tab-pane[^"]*">', guide_html))
tab_contents_zh = {}

for i, m in enumerate(tab_matches):
    tid = m.group(1)
    content_start = m.end()
    if i + 1 < len(tab_matches):
        next_m = tab_matches[i + 1]
        raw = guide_html[content_start:next_m.start()]
        idx_last_div = raw.rfind('</div>')
        tab_contents_zh[tid] = raw[:idx_last_div].strip()
    else:
        raw = guide_html[content_start:]
        idx_last_div = raw.rfind('</div>')
        tab_contents_zh[tid] = raw[:idx_last_div].strip()

# Now define the full, polished, high quality English counterparts
tab_contents_en = {
    'guide-tab-quick': """
                    <div class="p-4 bg-indigo-950/20 border border-indigo-800/40 rounded-xl space-y-2">
                        <h3 class="font-bold text-sm text-indigo-300 flex items-center gap-1.5">
                            <i data-lucide="sparkles" class="w-4 h-4"></i> Five Inference Modes (1+1 > 2)
                        </h3>
                        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 mt-2">
                            <div class="p-3 bg-gray-900/90 rounded-lg border border-gray-800">
                                <div class="font-bold text-cyan-300 text-xs mb-1">🖥️ LM Studio / API Mode</div>
                                <p class="text-[11px] text-gray-400">Connect to local LM Studio (Port 1234) or cloud APIs (OpenAI/Claude) with top-tier code reasoning and complex tool orchestration.</p>
                            </div>
                            <div class="p-3 bg-gray-900/90 rounded-lg border border-gray-800">
                                <div class="font-bold text-yellow-300 text-xs mb-1">⚡ WebGPU In-Browser Local</div>
                                <p class="text-[11px] text-gray-400">Zero backend install required. Model weights run directly on browser WebGPU/VRAM with 0 network latency and 100% offline privacy.</p>
                            </div>
                            <div class="p-3 bg-gray-900/90 rounded-lg border border-purple-800/50 bg-purple-950/20">
                                <div class="font-bold text-purple-300 text-xs mb-1">🧠 Dual-Engine Co-Thinking</div>
                                <p class="text-[11px] text-gray-400"><strong>Stage 1</strong> WebGPU rapidly decomposes intent and hypotheses; <strong>Stage 2</strong> primary model performs deep critique, verification, and execution!</p>
                            </div>
                            <div class="p-3 bg-gray-900/90 rounded-lg border border-rose-800/50 bg-rose-950/10">
                                <div class="font-bold text-rose-300 text-xs mb-1">🛡️ Dual Cross-Review Mode</div>
                                <p class="text-[11px] text-gray-400">When either engine stalls, returns empty, or contains code defects, the other engine steps in to review, point out blind spots, and propose fixes.</p>
                            </div>
                        </div>
                    </div>

                    <div class="p-4 bg-gray-950 rounded-xl border border-gray-800 space-y-2">
                        <h3 class="font-bold text-sm text-white flex items-center gap-1.5">
                            <i data-lucide="play-circle" class="w-4 h-4 text-green-400"></i> Host Daemon (Port 8001 Daemon) Startup
                        </h3>
                        <p>Click top <strong>`[▶ Start Daemon]`</strong> ➔ <strong>`[Confirm Restart / Enable]`</strong>. The system automatically launches the backend. Upon successful connection, this window closes automatically, granting AI control over native terminals and hardware.</p>
                    </div>

                    <div class="p-4 bg-red-950/20 border border-red-800/40 rounded-xl space-y-2">
                        <h3 class="font-bold text-sm text-red-300 flex items-center gap-1.5">
                            <i data-lucide="wifi-off" class="w-4 h-4"></i> Network Air-Gap Simulation Switch ⭐ New Feature
                        </h3>
                        <p>Top toolbar features the <strong class="text-red-300">`[External Net: Connected]`</strong> toggle. Click to immediately switch to <strong class="text-red-400">`[Air-Gap Simulation: Active]`</strong> (red warning). The frontend blocks all external outbound requests outside <code>127.0.0.1</code> / <code>localhost</code>, allowing instant validation of 100% offline / WinPE environments without pulling cables.</p>
                    </div>

                    <div class="p-4 bg-yellow-950/20 border border-yellow-800/40 rounded-xl space-y-2">
                        <h3 class="font-bold text-sm text-yellow-300 flex items-center gap-1.5">
                            <i data-lucide="zap" class="w-4 h-4"></i> ⚡ WebGPU Models — Permanent Client Cache
                        </h3>
                        <p>When selecting a WebGPU model (e.g. <code>Qwen2.5-0.5B</code> ~350 MB) for the first time, weights are cached <strong>permanently in browser storage</strong>. Subsequent launches load in <strong>0 seconds</strong> directly on GPU without redownload!</p>
                    </div>

                    <div class="p-4 bg-indigo-950/20 border border-indigo-800/40 rounded-xl space-y-2">
                        <h3 class="font-bold text-sm text-indigo-300 flex items-center gap-1.5">
                            <i data-lucide="file-spreadsheet" class="w-4 h-4 text-indigo-400"></i> 📑 Webcom for Office Smart Office Add-in ⭐ New Feature
                        </h3>
                        <p class="text-[11px] text-gray-300 leading-relaxed">
                            Webcom includes a dedicated Microsoft Office embedded add-in supporting <strong>Word, Excel, PowerPoint</strong> sidebar conversation. Read document selections, rewrite text, populate Excel spreadsheets, and generate charts directly.
                        </p>
                        <p class="text-[11px] text-gray-400 leading-relaxed">
                            <strong>Bidirectional Sync</strong>: Export conversations from Office add-in to Webcom with 1 click; run <code>office-addin\\install_addin.bat</code> for sideloading.
                        </p>
                    </div>

                    <!-- GPU 90% Ceiling Guard & Auto-save -->
                    <div class="p-4 bg-amber-950/20 border border-amber-800/40 rounded-xl space-y-2">
                        <h3 class="font-bold text-sm text-amber-300 flex items-center gap-1.5">
                            <i data-lucide="shield-alert" class="w-4 h-4 text-amber-400"></i> 🛡️ GPU Resource Protection (90% Ceiling Guard) & Auto-Save ⭐ New Feature
                        </h3>
                        <p class="text-[11px] text-gray-300 leading-relaxed">
                            <strong>GPU Ceiling Guard</strong>: When NVIDIA GPU VRAM or compute load reaches 90%, the system triggers pacing control: throttles generation, limits output length, and offloads tasks to CPU, completely eliminating system freezes and driver crashes.<br>
                            <strong>Timestamped Local JSON Auto-Save</strong>: Every dialogue turn is automatically stamped with an ISO timestamp and saved to client storage. Restores your complete conversation immediately upon unexpected crash, browser restart, or refresh.
                        </p>
                    </div>

                    <!-- Jev 500 Retry & Tool Loop Guard -->
                    <div class="p-4 bg-purple-950/20 border border-purple-800/40 rounded-xl space-y-2">
                        <h3 class="font-bold text-sm text-purple-300 flex items-center gap-1.5">
                            <i data-lucide="refresh-cw" class="w-4 h-4 text-purple-400"></i> ⚡ Jev 500 Auto-Retry & Agent Hallucination Loop Guard ⭐ New Feature
                        </h3>
                        <p class="text-[11px] text-gray-300 leading-relaxed">
                            <strong>HTTP 500 / 429 Transient Retry</strong>: When APIs encounter server overload, Jev initiates a 5-second countdown retry card automatically.<br>
                            <strong>Tool Call Loop Breaker</strong>: If an agent calls the same tool with identical arguments 3 times, Jev breaks the loop to stop hallucination and prompts the user for guidance.
                        </p>
                    </div>
    """.strip(),

    'guide-tab-graphrag': """
                    <div class="p-4 bg-emerald-950/20 border border-emerald-800/40 rounded-xl space-y-2">
                        <div class="flex items-center justify-between">
                            <h3 class="font-bold text-sm text-emerald-300 flex items-center gap-1.5">
                                <i data-lucide="network" class="w-4 h-4 text-emerald-400"></i> What is GraphRAG? (Knowledge Graph Enhanced RAG)
                            </h3>
                            <span class="px-2 py-0.5 text-[10px] font-mono rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Multi-Hop Traversal</span>
                        </div>
                        <p class="text-[11px] text-gray-300 leading-relaxed">
                            Traditional vector or keyword RAG only retrieves isolated text chunks by surface similarity, struggling with cross-entity and multi-tiered relationships. <strong>GraphRAG (Knowledge Graph Enhanced RAG)</strong> builds an entity topology web (composed of entities and relationship triples, e.g. <code>(Web Serial) ──[Baudrate]──> (9600-921600 Baud)</code>), achieving <strong>Multi-Hop Traversal</strong> across nodes and eliminating semantic hallucinations.
                        </p>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div class="p-3.5 bg-gray-950 rounded-xl border border-gray-800 space-y-1.5">
                            <div class="font-bold text-cyan-400 text-xs flex items-center gap-1.5">
                                <i data-lucide="git-merge" class="w-4 h-4"></i> 1. Multi-Hop Subgraph Expansion
                            </div>
                            <p class="text-[11px] text-gray-400 leading-relaxed">
                                When asking "How are Daemon 8001 and Jev connected?", the engine locates root entities, expands 1-2 hop neighbors, and dynamically injects structured triple knowledge into the LLM prompt.
                            </p>
                        </div>
                        <div class="p-3.5 bg-gray-950 rounded-xl border border-gray-800 space-y-1.5">
                            <div class="font-bold text-amber-400 text-xs flex items-center gap-1.5">
                                <i data-lucide="orbit" class="w-4 h-4"></i> 2. Force-Directed Physical Canvas Visualizer
                            </div>
                            <p class="text-[11px] text-gray-400 leading-relaxed">
                                Built-in HTML5 Canvas physical simulation with node repulsion, spring tension, and damping. Supports node dragging, stepless zoom (0.3x ~ 3.5x), and real-time node inspection.
                            </p>
                        </div>
                        <div class="p-3.5 bg-gray-950 rounded-xl border border-gray-800 space-y-1.5">
                            <div class="font-bold text-purple-400 text-xs flex items-center gap-1.5">
                                <i data-lucide="bot" class="w-4 h-4"></i> 3. Hermes Agent Autonomous Tool Calling
                            </div>
                            <p class="text-[11px] text-gray-400 leading-relaxed">
                                Registered in Tier 1 WASM tool contracts as <code>graphrag_query</code>, Hermes Agent can independently execute graph traversals inside the browser sandbox.
                            </p>
                        </div>
                        <div class="p-3.5 bg-gray-950 rounded-xl border border-gray-800 space-y-1.5">
                            <div class="font-bold text-emerald-400 text-xs flex items-center gap-1.5">
                                <i data-lucide="save" class="w-4 h-4"></i> 4. Triples CRUD & .graphrag Backup
                            </div>
                            <p class="text-[11px] text-gray-400 leading-relaxed">
                                Add entity relationships manually, extract entities automatically from ingested docs, rebuild graphs, and export/import knowledge graphs in standard <code>.graphrag</code> (JSON) format.
                            </p>
                        </div>
                    </div>

                    <div class="p-4 bg-gray-950 rounded-xl border border-gray-800 space-y-2.5">
                        <h3 class="font-bold text-sm text-white flex items-center gap-1.5">
                            <i data-lucide="compass" class="w-4 h-4 text-emerald-400"></i> How to Use GraphRAG in Webcom AI
                        </h3>
                        <ol class="list-decimal list-inside space-y-1.5 text-[11px] text-gray-300 pl-1">
                            <li><strong>Open Knowledge Base</strong>: Click the <strong>`[Knowledge Base]`</strong> button in the top bar or right-side toolbar.</li>
                            <li><strong>Switch to "🕸️ Knowledge Graph" Tab</strong>: View the balanced graph visualizer; use category filters (System, Hardware, Protocols, Agents, Services).</li>
                            <li><strong>Probe Entities</strong>: Click any circle node to inspect its description, outgoing/incoming relationships, and associated encyclopedia docs.</li>
                            <li><strong>Multi-Hop Retrieval Test</strong>: Switch to "🔍 Multi-Hop Test", input keywords (e.g. <code>Web Serial 9600</code>), select mode (Hybrid/Local/Global), and preview context.</li>
                            <li><strong>Dialogue Enhancement</strong>: Toggle the <strong class="text-emerald-400">[RAG Knowledge Base]</strong> switch in the chat input bar. Answers will light up with the <code>[🕸️ GraphRAG: X Entities / Y Relations]</code> badge.</li>
                        </ol>
                    </div>
    """.strip(),

    'guide-tab-artifact': """
                    <div class="p-4 bg-indigo-950/20 border border-indigo-800/40 rounded-xl space-y-2">
                        <h3 class="font-bold text-sm text-indigo-300 flex items-center gap-1.5">
                            <i data-lucide="layout" class="w-4 h-4 text-indigo-400"></i> What is Artifact? Isolated Preview Sandbox
                        </h3>
                        <p class="text-[11px] text-gray-300 leading-relaxed">
                            When asking AI to produce standalone web apps (HTML/CSS/JS), SVG vector graphics, Markdown reports, or scripts, AI wraps output in <code>&lt;artifact&gt;</code> tags. The system renders an interactive card with a secure iframe sandbox that runs locally without deployment or server!
                        </p>
                    </div>

                    <div class="p-4 bg-purple-950/20 border border-purple-800/40 rounded-xl space-y-2">
                        <h3 class="font-bold text-sm text-purple-300 flex items-center gap-1.5">
                            <i data-lucide="git-merge" class="w-4 h-4 text-purple-400"></i> Multi-Part Smart Continuation & Seamless De-duplication
                        </h3>
                        <p class="text-[11px] text-gray-300 leading-relaxed">
                            Long code files (500+ lines) often get interrupted due to LLM token output limits. Webcom provides <strong>automatic overlapping deduplication and stitching</strong>:
                        </p>
                        <ul class="list-disc list-inside space-y-1 text-[11px] text-gray-400 pl-1">
                            <li><strong>Identifier Matching</strong>: When subsequent output carries the same <code>identifier</code> and <code>mode="continue"</code>, the system locates the target file.</li>
                            <li><strong>Smart De-duplication</strong>: Compares the tail of part 1 and head of part 2 across 1-25 lines, sliding to remove duplicates and stitch seamlessly.</li>
                            <li><strong>Compact Continuation Card</strong>: Shows "Merged into [Title] (+X lines, Y total lines)" without flooding the screen.</li>
                            <li><strong>One-Click Continue Button</strong>: If unfinished, click "▶️ Continue Generation" to guide AI through the next segment.</li>
                        </ul>
                    </div>

                    <div class="p-4 bg-purple-950/20 border border-purple-800/40 rounded-xl space-y-2">
                        <h3 class="font-bold text-sm text-purple-300 flex items-center gap-1.5">
                            <i data-lucide="git-branch" class="w-4 h-4 text-purple-400"></i> Version Control & Line-Level Diff
                        </h3>
                        <p class="text-[11px] text-gray-300 leading-relaxed">
                            The workbench features complete Git-like version history and rollback:
                        </p>
                        <ul class="list-disc list-inside space-y-1 text-[11px] text-gray-400 pl-1">
                            <li><strong>Auto Versioning</strong>: Initial output is <code>v1</code>, continuations create <code>v2</code>, <code>v3</code>, and user edits generate new versions.</li>
                            <li><strong>Version Switching</strong>: View any previous version's code and live sandbox via the version dropdown.</li>
                            <li><strong>One-Click Rollback</strong>: Click "Rollback to this version" to restore files losslessly.</li>
                            <li><strong>Custom Snapshots</strong>: Click "📸 Snapshot" to checkpoint current code with notes.</li>
                            <li><strong>Visual Line Diff</strong>: Click "Diff" to see additions (<code class="text-emerald-400">+</code>) in green and deletions (<code class="text-rose-400">-</code>) in red.</li>
                        </ul>
                    </div>

                    <div class="p-4 bg-emerald-950/20 border border-emerald-800/40 rounded-xl space-y-2">
                        <h3 class="font-bold text-sm text-emerald-300 flex items-center gap-1.5">
                            <i data-lucide="edit-3" class="w-4 h-4 text-emerald-400"></i> Online Live Editing & Debounced Live Preview
                        </h3>
                        <ul class="list-disc list-inside space-y-1 text-[11px] text-gray-300 pl-1">
                            <li><strong>Inline Card Editing</strong>: Click "✏️ Edit" in the card header to open an editor with 2-space Tab indent.</li>
                            <li><strong>Split Workbench Live Preview</strong>: Open workbench in "Split" mode; iframe re-renders with 180ms debounce as you type.</li>
                            <li><strong>Safe Save & Revert</strong>: Click "💾 Save" to sync changes; click "🔄 Revert" to restore AI original.</li>
                        </ul>
                    </div>

                    <div class="p-4 bg-gray-950 rounded-xl border border-gray-800 space-y-2">
                        <h3 class="font-bold text-sm text-white flex items-center gap-1.5">
                            <i data-lucide="monitor" class="w-4 h-4 text-cyan-400"></i> Large Drawer & Multi-Device RWD Testing
                        </h3>
                        <p class="text-[11px] text-gray-300 leading-relaxed">
                            Toggle between 🖥️ Desktop (100%), 📱 Tablet (768px), and 📱 Mobile (375px). Easily "Open in New Window", "Download Full File", or "Copy Full Code".
                        </p>
                    </div>

                    <div class="p-4 bg-cyan-950/20 border border-cyan-800/40 rounded-xl space-y-1.5">
                        <div class="font-bold text-xs text-cyan-300 flex items-center gap-1.5">
                            <i data-lucide="sparkles" class="w-4 h-4"></i> Shortcut Commands
                        </div>
                        <p class="text-[11px] text-gray-400">
                            Type <code class="text-purple-300 bg-gray-900 px-1.5 py-0.5 rounded font-mono">/create-artifact</code> into the chat box to prompt AI to generate a complete standalone web application!
                        </p>
                    </div>
    """.strip(),

    'guide-tab-jev': """
                    <div class="p-4 bg-amber-950/20 border border-amber-800/40 rounded-xl space-y-2">
                        <div class="flex items-center justify-between">
                            <h3 class="font-bold text-sm text-amber-300 flex items-center gap-1.5">
                                <i data-lucide="zap" class="w-4 h-4 text-amber-400"></i> What is Jev? (System 1 Non-Generative Fast Decision)
                            </h3>
                            <span class="px-2 py-0.5 text-[10px] font-mono rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">Single Forward Pass</span>
                        </div>
                        <p class="text-[11px] text-gray-300 leading-relaxed">
                            <strong>Jev</strong> is a System 1 cross-encoder decision engine built specifically for <strong>intent classification, tool routing, guardrails, and fault dispatching</strong>.
                            Traditional generative LLMs (GPT, Claude, Qwen) rely on <strong>autoregressive token generation loops</strong>, requiring hundreds of milliseconds to decode even a single category name; Jev uses a <strong>Single Forward Pass (SFP)</strong>, calculating interactive attention across input text and all candidate options in constant time complexity.
                        </p>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div class="p-3.5 bg-gray-950 rounded-xl border border-gray-800 space-y-1.5">
                            <div class="font-bold text-emerald-400 text-xs flex items-center gap-1.5">
                                <i data-lucide="gauge" class="w-4 h-4"></i> 1. ~15ms Ultra-Low Latency (100-200x Faster)
                            </div>
                            <p class="text-[11px] text-gray-400 leading-relaxed">
                                Achieves 15ms~30ms inference on standard laptop CPUs or integrated graphics, 100x to 200x faster than generative LLMs with zero perceptible waiting.
                            </p>
                        </div>
                        <div class="p-3.5 bg-gray-950 rounded-xl border border-gray-800 space-y-1.5">
                            <div class="font-bold text-cyan-400 text-xs flex items-center gap-1.5">
                                <i data-lucide="shield-check" class="w-4 h-4"></i> 2. 100% Strictly Closed Probability Space (Zero Hallucinations)
                            </div>
                            <p class="text-[11px] text-gray-400 leading-relaxed">
                                Candidate outputs are strictly normalized via Softmax (&Sigma; P<sub>i</sub> = 100%). Results always land on predefined options, with zero JSON errors or hallucinations.
                            </p>
                        </div>
                        <div class="p-3.5 bg-gray-950 rounded-xl border border-gray-800 space-y-1.5">
                            <div class="font-bold text-purple-400 text-xs flex items-center gap-1.5">
                                <i data-lucide="sliders" class="w-4 h-4"></i> 3. Dynamic Temperature Control (T &in; [0.1, 2.0])
                            </div>
                            <p class="text-[11px] text-gray-400 leading-relaxed">
                                Supports dynamic temperature: low temp (T=0.2) yields sharp deterministic decisions; high temp (T=1.5) explores edge intents, with Entropy as confidence metric.
                            </p>
                        </div>
                        <div class="p-3.5 bg-gray-950 rounded-xl border border-gray-800 space-y-1.5">
                            <div class="font-bold text-blue-400 text-xs flex items-center gap-1.5">
                                <i data-lucide="cpu" class="w-4 h-4"></i> 4. Ultra-Lightweight Resource Footprint (22MB ~ 140MB)
                            </div>
                            <p class="text-[11px] text-gray-400 leading-relaxed">
                                Model size is just 22MB~140MB, consuming under 200MB RAM. Requires no discrete GPU, running smoothly in WinPE offline rescue environments.
                            </p>
                        </div>
                    </div>

                    <div class="p-4 bg-gray-950 rounded-xl border border-gray-800 space-y-2.5">
                        <h3 class="font-bold text-sm text-white flex items-center gap-1.5">
                            <i data-lucide="git-compare" class="w-4 h-4 text-indigo-400"></i> When to Use? Jev vs Generative LLM Decision Matrix
                        </h3>
                        <div class="overflow-x-auto">
                            <table class="w-full text-[11px] border-collapse border border-gray-800 text-left">
                                <thead>
                                    <tr class="bg-gray-900/80 text-gray-300">
                                        <th class="p-2 border border-gray-800">Use Case / Task Type</th>
                                        <th class="p-2 border border-gray-800 text-amber-400">⚡ Jev Engine (System 1)</th>
                                        <th class="p-2 border border-gray-800 text-purple-400">🤖 Generative LLM (System 2)</th>
                                        <th class="p-2 border border-gray-800">Architecture Recommendation</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-gray-800/60 text-gray-400">
                                    <tr>
                                        <td class="p-2 border border-gray-800 font-medium text-gray-200">Agent Tool Routing</td>
                                        <td class="p-2 border border-gray-800 text-emerald-400 font-bold">✅ Highly Recommended (15ms instant)</td>
                                        <td class="p-2 border border-gray-800 text-rose-400">❌ High Latency (500ms+ wasted compute)</td>
                                        <td class="p-2 border border-gray-800 text-cyan-300">Jev acts as frontend router</td>
                                    </tr>
                                    <tr>
                                        <td class="p-2 border border-gray-800 font-medium text-gray-200">Security Guardrails & Anti-Injection</td>
                                        <td class="p-2 border border-gray-800 text-emerald-400 font-bold">✅ Highly Recommended (Millisecond intercept)</td>
                                        <td class="p-2 border border-gray-800 text-rose-400">⚠️ Vulnerable to prompt jailbreaks</td>
                                        <td class="p-2 border border-gray-800 text-cyan-300">Jev acts as first-line gatekeeper</td>
                                    </tr>
                                    <tr>
                                        <td class="p-2 border border-gray-800 font-medium text-gray-200">IT Fault Triage (P0~P3)</td>
                                        <td class="p-2 border border-gray-800 text-emerald-400 font-bold">✅ Highly Recommended (Deterministic confidence)</td>
                                        <td class="p-2 border border-gray-800 text-yellow-400">⚠️ Occasional formatting variation</td>
                                        <td class="p-2 border border-gray-800 text-cyan-300">Jev classifies priority</td>
                                    </tr>
                                    <tr>
                                        <td class="p-2 border border-gray-800 font-medium text-gray-200">Shell / Environment Detection</td>
                                        <td class="p-2 border border-gray-800 text-emerald-400 font-bold">✅ Highly Recommended (PS/Bash/Python)</td>
                                        <td class="p-2 border border-gray-800 text-yellow-400">⚠️ Overkill for generative model</td>
                                        <td class="p-2 border border-gray-800 text-cyan-300">Jev routes target runtime</td>
                                    </tr>
                                    <tr>
                                        <td class="p-2 border border-gray-800 font-medium text-gray-200">Essay Writing & Creative Output</td>
                                        <td class="p-2 border border-gray-800 text-rose-400">❌ Unsupported (Non-generative)</td>
                                        <td class="p-2 border border-gray-800 text-emerald-400 font-bold">✅ Highly Recommended (Rich generation)</td>
                                        <td class="p-2 border border-gray-800 text-purple-300">Delegate to Generative LLM</td>
                                    </tr>
                                    <tr>
                                        <td class="p-2 border border-gray-800 font-medium text-gray-200">Complex Coding & Architecture Refactor</td>
                                        <td class="p-2 border border-gray-800 text-rose-400">❌ Unsupported (Non-generative)</td>
                                        <td class="p-2 border border-gray-800 text-emerald-400 font-bold">✅ Highly Recommended (Logic synthesis)</td>
                                        <td class="p-2 border border-gray-800 text-purple-300">Delegate to Generative LLM</td>
                                    </tr>
                                    <tr>
                                        <td class="p-2 border border-gray-800 font-medium text-gray-200">Chain-of-Thought (CoT Deduction)</td>
                                        <td class="p-2 border border-gray-800 text-rose-400">❌ Unsupported (Single-step scoring)</td>
                                        <td class="p-2 border border-gray-800 text-emerald-400 font-bold">✅ Highly Recommended (Multi-step search)</td>
                                        <td class="p-2 border border-gray-800 text-purple-300">Delegate to Generative LLM</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div class="p-4 bg-indigo-950/20 border border-indigo-800/40 rounded-xl space-y-2">
                        <h3 class="font-bold text-sm text-indigo-300 flex items-center gap-1.5">
                            <i data-lucide="layers" class="w-4 h-4"></i> Best Practice: 1+1 Synergy Architecture (Fast + Slow Thinking)
                        </h3>
                        <p class="text-[11px] text-gray-300 leading-relaxed">
                            Webcom recommends: "<strong>Jev handles 15ms fast screening; LLM handles deep reasoning</strong>":
                        </p>
                        <ol class="list-decimal list-inside space-y-1 text-[11px] text-gray-300 pl-1">
                            <li><strong>Frontend Filter</strong>: User input passes through Jev for 15ms intent and safety evaluation.</li>
                            <li><strong>Fast Bypass</strong>: Terminal commands (<code class="text-emerald-400 bg-gray-900 px-1 py-0.5 rounded">dir</code>, <code class="text-emerald-400 bg-gray-900 px-1 py-0.5 rounded">ls</code>) or serial operations execute directly without waking heavy models.</li>
                            <li><strong>Deep Delegation</strong>: Only requests requiring text synthesis or logic awaken backend LLMs, saving compute and accelerating responsiveness!</li>
                        </ol>
                    </div>

                    <div class="p-4 bg-amber-950/20 border border-amber-800/40 rounded-xl flex items-center justify-between gap-3">
                        <div class="space-y-1">
                            <div class="font-bold text-xs text-amber-300 flex items-center gap-1.5">
                                <i data-lucide="play" class="w-4 h-4"></i> How to Try the Jev Sandbox Right Now?
                            </div>
                            <p class="text-[11px] text-gray-400">
                                Click the <strong class="text-amber-300 bg-gray-900 px-2 py-0.5 rounded border border-amber-500/30">⚡ Jev Engine</strong> button in the top toolbar to launch the interactive testing sandbox!
                            </p>
                        </div>
                    </div>
    """.strip(),

    'guide-tab-term': """
                    <div class="space-y-3">
                        <div class="p-3.5 bg-gray-950 rounded-xl border border-gray-800">
                            <div class="font-bold text-green-400 text-xs mb-1 flex items-center gap-1.5">
                                <i data-lucide="terminal" class="w-4 h-4"></i> 1. Local Shell (Local Shell / WSL / WinPE CMD)
                            </div>
                            <p class="text-[11px] text-gray-300">Execute native command-line instructions. Automatically invokes `cmd.exe` or `powershell` on Windows / WinPE, and `bash` under Linux/WSL.</p>
                        </div>

                        <div class="p-3.5 bg-gray-950 rounded-xl border border-blue-900/40 bg-blue-950/10">
                            <div class="font-bold text-blue-300 text-xs mb-1 flex items-center gap-1.5">
                                <i data-lucide="cpu" class="w-4 h-4"></i> 2. Web Serial (Direct Browser Serial Port) ⭐ Recommended
                            </div>
                            <p class="text-[11px] text-gray-300">Directly control USB-to-Serial devices (COM Port / UART) via Chrome / Edge Web Serial API. <strong>No 8001 Daemon or drivers needed!</strong> Click "Connect Device" to start streaming.</p>
                        </div>

                        <div class="p-3.5 bg-gray-950 rounded-xl border border-gray-800">
                            <div class="font-bold text-amber-300 text-xs mb-1 flex items-center gap-1.5">
                                <i data-lucide="network" class="w-4 h-4"></i> 3. TCP/IP: SSH & Telnet Remote Connections
                            </div>
                            <p class="text-[11px] text-gray-300">Configure remote server/router IP, Port, and credentials, then click "Apply Connection". AI Agent can dispatch SSH / Telnet commands via Host Daemon for remote maintenance.</p>
                        </div>
                    </div>
    """.strip(),

    'guide-tab-ai': """
                    <div class="p-4 bg-emerald-950/20 border border-emerald-800/40 rounded-xl space-y-2">
                        <h3 class="font-bold text-sm text-emerald-300 flex items-center gap-1.5">
                            <i data-lucide="command" class="w-4 h-4"></i> Slash Command Menu (Type / to Summon)
                        </h3>
                        <p>Type <kbd class="bg-gray-800 px-1.5 py-0.5 rounded text-white font-mono">/</kbd> in the chat box to invoke the shortcut command menu with keyboard navigation:</p>
                        <ul class="list-disc list-inside space-y-1 text-[11px] text-gray-300 mt-1 pl-1">
                            <li><code class="text-purple-300">/inspect-terminal</code>: Read and analyze logs and returns from the left terminal pane.</li>
                            <li><code class="text-purple-300">/probe-device</code>: Automatically query serial or terminal help and parse command lists.</li>
                            <li><code class="text-purple-300">/troubleshoot-windows</code>: Query RAG knowledge base to diagnose network adapters, services, and ports.</li>
                            <li><code class="text-purple-300">/troubleshoot-openwrt</code>: Diagnose UCI networking, dnsmasq, and Failsafe recovery.</li>
                            <li><code class="text-purple-300">/troubleshoot-uboot</code>: Troubleshoot embedded bootargs, TFTP loading, and serial anomalies.</li>
                        </ul>
                    </div>

                    <div class="p-4 bg-gray-950 rounded-xl border border-gray-800 space-y-2">
                        <h3 class="font-bold text-sm text-white flex items-center gap-1.5">
                            <i data-lucide="book-open" class="w-4 h-4 text-emerald-400"></i> Local RAG Knowledge Base Ingestion
                        </h3>
                        <p>Click top <strong>`[Knowledge Base]`</strong> to upload <code>.txt</code> / <code>.md</code> / <code>.json</code> manuals. The system segments text and indexes it locally. AI will retrieve and cite relevant documents during inference!</p>
                    </div>
    """.strip(),

    'guide-tab-offline': """
                    <div class="p-4 bg-purple-950/20 border border-purple-800/40 rounded-xl space-y-2">
                        <h3 class="font-bold text-sm text-purple-300 flex items-center gap-1.5">
                            <i data-lucide="wifi-off" class="w-4 h-4"></i> 100% Air-Gapped Offline Execution Mechanism
                        </h3>
                        <p>All CSS (TailwindCSS), icons (Lucide), and Markdown parsers are stored locally in the <code>./assets/</code> directory. <strong>Launches in 0 seconds with network cables unplugged!</strong></p>
                    </div>

                    <div class="p-4 bg-gray-950 rounded-xl border border-gray-800 space-y-2">
                        <h3 class="font-bold text-sm text-white flex items-center gap-1.5">
                            <i data-lucide="hard-drive" class="w-4 h-4 text-yellow-400"></i> WinPE Maintenance USB Drive Transfer & Autorun
                        </h3>
                        <ol class="list-decimal list-inside space-y-1.5 text-[11px] text-gray-300 pl-1">
                            <li>Copy the <code>Webcom</code> folder (or unzip <code>Webcom_WinPE_Portable.zip</code>) to your WinPE USB drive.</li>
                            <li>Boot into WinPE and double-click <strong>`WinPE_Autorun.bat`</strong>.</li>
                            <li>The system starts the Daemon using embedded portable <code>.\\python\\</code> and opens the Web console in browser, plug-and-play!</li>
                        </ol>
                    </div>
    """.strip(),

    'guide-tab-faq': tab_contents_zh.get('guide-tab-faq', ''),  # will generate translated version below
    'guide-tab-license': tab_contents_zh.get('guide-tab-license', '')
}

# Polish English FAQ
tab_contents_en['guide-tab-faq'] = """
                    <div class="p-3.5 bg-gray-950 rounded-xl border border-gray-800 space-y-1.5">
                        <div class="font-bold text-amber-300 text-xs flex items-center gap-1.5">
                            <i data-lucide="alert-triangle" class="w-4 h-4"></i> Q1: LM Studio shows Failed to fetch / CORS error?
                        </div>
                        <p class="text-[11px] text-gray-400 leading-relaxed">
                            A: LM Studio requires CORS permissions. Start via terminal: <code>lms server start --cors --port 1234</code>, or enable "CORS" in LM Studio Settings under Server configurations.
                        </p>
                    </div>

                    <div class="p-3.5 bg-gray-950 rounded-xl border border-gray-800 space-y-1.5">
                        <div class="font-bold text-amber-300 text-xs flex items-center gap-1.5">
                            <i data-lucide="alert-triangle" class="w-4 h-4"></i> Q2: WebGPU model fails to load or browser crashes?
                        </div>
                        <p class="text-[11px] text-gray-400 leading-relaxed">
                            A: Ensure hardware acceleration is enabled in Chrome/Edge (<code>chrome://settings/system</code>). WebGPU requires DirectX 12, Vulkan, or Metal support. For integrated graphics with limited VRAM, select <code>Qwen2.5-0.5B</code> (~350MB) or ONNX CPU mode.
                        </p>
                    </div>

                    <div class="p-3.5 bg-gray-950 rounded-xl border border-gray-800 space-y-1.5">
                        <div class="font-bold text-amber-300 text-xs flex items-center gap-1.5">
                            <i data-lucide="alert-triangle" class="w-4 h-4"></i> Q3: Web Serial cannot find or open COM ports?
                        </div>
                        <p class="text-[11px] text-gray-400 leading-relaxed">
                            A: 1. Ensure other serial software (e.g. PuTTY, Arduino IDE) has closed the port. 2. Verify USB cable data connectivity and CH340 / CP2102 driver status in Windows Device Manager.
                        </p>
                    </div>

                    <div class="p-3.5 bg-gray-950 rounded-xl border border-gray-800 space-y-1.5">
                        <div class="font-bold text-amber-300 text-xs flex items-center gap-1.5">
                            <i data-lucide="alert-triangle" class="w-4 h-4"></i> Q4: How does GPU 90% Guard prevent system freeze?
                        </div>
                        <p class="text-[11px] text-gray-400 leading-relaxed">
                            A: When VRAM or GPU compute load reaches 90%, Webcom throttles streaming generation speed and immediately writes conversations with ISO timestamps to client Local Storage. If the GPU runs out of memory, conversation state is preserved and restored without loss upon reload.
                        </p>
                    </div>

                    <div class="p-3.5 bg-gray-950 rounded-xl border border-gray-800 space-y-1.5">
                        <div class="font-bold text-amber-300 text-xs flex items-center gap-1.5">
                            <i data-lucide="alert-triangle" class="w-4 h-4"></i> Q5: How to rebuild or backup the GraphRAG Knowledge Graph?
                        </div>
                        <p class="text-[11px] text-gray-400 leading-relaxed">
                            A: Open "Knowledge Base" ➔ "🕸️ Knowledge Graph" tab. Click "Add Triple" to add custom edges, or click "Export Graph" to download a standard <code>.graphrag</code> (JSON) backup. Click "Import Graph" to restore on any client.
                        </p>
                    </div>
""".strip()

# Polish English License & Acknowledgements
tab_contents_en['guide-tab-license'] = """
                    <!-- Copyright Notice -->
                    <div class="p-4 bg-gray-950 rounded-xl border border-gray-800 space-y-3">
                        <div class="flex items-center justify-between border-b border-gray-800 pb-2.5">
                            <div class="flex items-center gap-2">
                                <i data-lucide="scale" class="w-5 h-5 text-indigo-400"></i>
                                <span class="font-bold text-white text-sm">Copyright Notice & Open-Source License</span>
                            </div>
                            <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-green-950 text-green-400 border border-green-800">
                                GNU GPL v3.0
                            </span>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] text-gray-400">
                            <div class="space-y-1">
                                <div class="flex items-center gap-2">
                                    <i data-lucide="tag" class="w-3.5 h-3.5 text-indigo-400 shrink-0"></i>
                                    <span><strong class="text-gray-200">Software Name:</strong> Webcom Dual-Engine Console</span>
                                </div>
                                <div class="flex items-center gap-2">
                                    <i data-lucide="git-commit" class="w-3.5 h-3.5 text-indigo-400 shrink-0"></i>
                                    <span><strong class="text-gray-200">Version:</strong> <code class="text-indigo-300">v2.2.0-Hermes-GraphRAG-Jev-WebGPU-MultiTier</code></span>
                                </div>
                                <div class="flex items-center gap-2">
                                    <i data-lucide="calendar" class="w-3.5 h-3.5 text-indigo-400 shrink-0"></i>
                                    <span><strong class="text-gray-200">Release Date:</strong> 2026-09-27 03:50:00</span>
                                </div>
                            </div>
                            <div class="space-y-1">
                                <div class="flex items-center gap-2">
                                    <i data-lucide="user" class="w-3.5 h-3.5 text-indigo-400 shrink-0"></i>
                                    <span><strong class="text-gray-200">Author:</strong> startgo</span>
                                </div>
                                <div class="flex items-center gap-2">
                                    <i data-lucide="mail" class="w-3.5 h-3.5 text-indigo-400 shrink-0"></i>
                                    <span><strong class="text-gray-200">Contact:</strong> <a href="mailto:startgo@yia.app" class="text-indigo-400 underline hover:text-indigo-300">startgo@yia.app</a></span>
                                </div>
                                <div class="flex items-center gap-2">
                                    <i data-lucide="code-2" class="w-3.5 h-3.5 text-indigo-400 shrink-0"></i>
                                    <span><strong class="text-gray-200">Project Type:</strong> Open-source, modifiable, retain copyright notices</span>
                                </div>
                            </div>
                        </div>
                        <p class="text-[10px] text-gray-500 leading-relaxed border-t border-gray-800 pt-2">
                            This software is licensed under the <strong class="text-gray-400">GNU General Public License Version 3 (GPL v3)</strong>. You are free to run, study, share, and modify this software. Any derivative works must be distributed under the same license terms with source code made available.
                            <strong class="text-yellow-400">Commercial derivative scripts must retain this copyright notice.</strong>
                        </p>
                    </div>

                    <!-- Acknowledgements -->
                    <div class="p-4 bg-gray-950 rounded-xl border border-pink-900/40 space-y-3">
                        <h3 class="font-bold text-sm text-pink-300 flex items-center gap-2">
                            <i data-lucide="heart" class="w-4 h-4"></i> Third-Party Acknowledgements
                        </h3>
                        <p class="text-[10px] text-gray-500">This project incorporates the following outstanding open-source libraries, each retaining its original license terms.</p>

                        <div>
                            <div class="text-[10px] text-gray-600 font-bold uppercase tracking-wider mb-1.5">🖥️ Frontend</div>
                            <div class="space-y-2">
                                <div class="flex items-start gap-2.5 p-2.5 bg-gray-900/60 rounded-lg border border-gray-800/60">
                                    <span class="shrink-0 w-2 h-2 rounded-full bg-cyan-500 mt-1"></span>
                                    <div>
                                        <a href="https://github.com/vercel-labs/wterm" target="_blank" class="text-cyan-400 hover:text-cyan-300 font-bold text-[11px] underline">wterm</a>
                                        <span class="text-[10px] text-gray-500 ml-1">— Vercel Labs</span>
                                        <p class="text-[10px] text-gray-400 mt-0.5">Browser DOM + WASM Terminal Emulator · <span class="text-green-600 font-semibold">Apache 2.0</span></p>
                                    </div>
                                </div>
                                <div class="flex items-start gap-2.5 p-2.5 bg-gray-900/60 rounded-lg border border-gray-800/60">
                                    <span class="shrink-0 w-2 h-2 rounded-full bg-yellow-400 mt-1"></span>
                                    <div>
                                        <a href="https://github.com/mlc-ai/web-llm" target="_blank" class="text-yellow-400 hover:text-yellow-300 font-bold text-[11px] underline">@mlc-ai/web-llm (WebLLM)</a>
                                        <span class="text-[10px] text-gray-500 ml-1">— MLC AI</span>
                                        <p class="text-[10px] text-gray-400 mt-0.5">In-Browser WebGPU Local Inference Engine · <span class="text-green-600 font-semibold">Apache 2.0</span></p>
                                    </div>
                                </div>
                                <div class="flex items-start gap-2.5 p-2.5 bg-gray-900/60 rounded-lg border border-gray-800/60">
                                    <span class="shrink-0 w-2 h-2 rounded-full bg-sky-400 mt-1"></span>
                                    <div>
                                        <a href="https://github.com/tailwindlabs/tailwindcss" target="_blank" class="text-sky-400 hover:text-sky-300 font-bold text-[11px] underline">Tailwind CSS</a>
                                        <span class="text-[10px] text-gray-500 ml-1">— Tailwind Labs</span>
                                        <p class="text-[10px] text-gray-400 mt-0.5">Utility-First CSS Framework · <span class="text-green-600 font-semibold">MIT</span></p>
                                    </div>
                                </div>
                                <div class="flex items-start gap-2.5 p-2.5 bg-gray-900/60 rounded-lg border border-gray-800/60">
                                    <span class="shrink-0 w-2 h-2 rounded-full bg-orange-400 mt-1"></span>
                                    <div>
                                        <a href="https://github.com/lucide-icons/lucide" target="_blank" class="text-orange-400 hover:text-orange-300 font-bold text-[11px] underline">Lucide Icons</a>
                                        <span class="text-[10px] text-gray-500 ml-1">— Lucide Contributors</span>
                                        <p class="text-[10px] text-gray-400 mt-0.5">Open Source SVG Icon Library · <span class="text-green-600 font-semibold">ISC</span></p>
                                    </div>
                                </div>
                                <div class="flex items-start gap-2.5 p-2.5 bg-gray-900/60 rounded-lg border border-gray-800/60">
                                    <span class="shrink-0 w-2 h-2 rounded-full bg-gray-400 mt-1"></span>
                                    <div>
                                        <a href="https://github.com/markedjs/marked" target="_blank" class="text-gray-300 hover:text-white font-bold text-[11px] underline">marked.js</a>
                                        <span class="text-[10px] text-gray-500 ml-1">— markedjs</span>
                                        <p class="text-[10px] text-gray-400 mt-0.5">Markdown Parser and Compiler · <span class="text-green-600 font-semibold">MIT</span></p>
                                    </div>
                                </div>
                                <div class="flex items-start gap-2.5 p-2.5 bg-gray-900/60 rounded-lg border border-gray-800/60">
                                    <span class="shrink-0 w-2 h-2 rounded-full bg-emerald-400 mt-1"></span>
                                    <div>
                                        <a href="https://github.com/GoneTone/markitdown-website" target="_blank" class="text-emerald-400 hover:text-emerald-300 font-bold text-[11px] underline">markitdown-website</a>
                                        <span class="text-[10px] text-gray-500 ml-1">— GoneTone (Tang Yu-Cheng)</span>
                                        <p class="text-[10px] text-gray-400 mt-0.5">Web app for document conversion to Markdown · <span class="text-green-600 font-semibold">MIT</span></p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <div class="text-[10px] text-gray-600 font-bold uppercase tracking-wider mb-1.5">⚙️ Backend (Python)</div>
                            <div class="space-y-2">
                                <div class="flex items-start gap-2.5 p-2.5 bg-gray-900/60 rounded-lg border border-gray-800/60">
                                    <span class="shrink-0 w-2 h-2 rounded-full bg-teal-400 mt-1"></span>
                                    <div>
                                        <a href="https://github.com/fastapi/fastapi" target="_blank" class="text-teal-400 hover:text-teal-300 font-bold text-[11px] underline">FastAPI</a>
                                        <span class="text-[10px] text-gray-500 ml-1">— Sebastián Ramírez</span>
                                        <p class="text-[10px] text-gray-400 mt-0.5">High Performance Python Web API Framework · <span class="text-green-600 font-semibold">MIT</span></p>
                                    </div>
                                </div>
                                <div class="flex items-start gap-2.5 p-2.5 bg-gray-900/60 rounded-lg border border-gray-800/60">
                                    <span class="shrink-0 w-2 h-2 rounded-full bg-teal-300 mt-1"></span>
                                    <div>
                                        <a href="https://github.com/encode/uvicorn" target="_blank" class="text-teal-300 hover:text-teal-200 font-bold text-[11px] underline">uvicorn</a>
                                        <span class="text-[10px] text-gray-500 ml-1">— Encode</span>
                                        <p class="text-[10px] text-gray-400 mt-0.5">Lightning-Fast ASGI HTTP Server · <span class="text-green-600 font-semibold">BSD 3-Clause</span></p>
                                    </div>
                                </div>
                                <div class="flex items-start gap-2.5 p-2.5 bg-gray-900/60 rounded-lg border border-gray-800/60">
                                    <span class="shrink-0 w-2 h-2 rounded-full bg-purple-400 mt-1"></span>
                                    <div>
                                        <a href="https://github.com/paramiko/paramiko" target="_blank" class="text-purple-400 hover:text-purple-300 font-bold text-[11px] underline">Paramiko</a>
                                        <span class="text-[10px] text-gray-500 ml-1">— Jeff Forcier et al.</span>
                                        <p class="text-[10px] text-gray-400 mt-0.5">Python SSH2 Protocol Implementation · <span class="text-green-600 font-semibold">LGPL 2.1</span></p>
                                    </div>
                                </div>
                                <div class="flex items-start gap-2.5 p-2.5 bg-gray-900/60 rounded-lg border border-gray-800/60">
                                    <span class="shrink-0 w-2 h-2 rounded-full bg-amber-400 mt-1"></span>
                                    <div>
                                        <a href="https://github.com/pyserial/pyserial" target="_blank" class="text-amber-400 hover:text-amber-300 font-bold text-[11px] underline">pyserial</a>
                                        <span class="text-[10px] text-gray-500 ml-1">— Chris Liechti</span>
                                        <p class="text-[10px] text-gray-400 mt-0.5">Python Serial Port (COM / UART) Communication · <span class="text-green-600 font-semibold">BSD 3-Clause</span></p>
                                    </div>
                                </div>
                                <div class="flex items-start gap-2.5 p-2.5 bg-gray-900/60 rounded-lg border border-gray-800/60">
                                    <span class="shrink-0 w-2 h-2 rounded-full bg-orange-400 mt-1"></span>
                                    <div>
                                        <a href="https://github.com/microsoft/markitdown" target="_blank" class="text-orange-400 hover:text-orange-300 font-bold text-[11px] underline">markitdown</a>
                                        <span class="text-[10px] text-gray-500 ml-1">— Microsoft</span>
                                        <p class="text-[10px] text-gray-400 mt-0.5">Universal Document to Markdown Converter Engine · <span class="text-green-600 font-semibold">MIT</span></p>
                                    </div>
                                </div>
                                <div class="flex items-start gap-2.5 p-2.5 bg-gray-900/60 rounded-lg border border-gray-800/60">
                                    <span class="shrink-0 w-2 h-2 rounded-full bg-blue-400 mt-1"></span>
                                    <div>
                                        <a href="https://github.com/mozman/ezdxf" target="_blank" class="text-blue-400 hover:text-blue-300 font-bold text-[11px] underline">ezdxf</a>
                                        <span class="text-[10px] text-gray-500 ml-1">— Manfred Moitzi</span>
                                        <p class="text-[10px] text-gray-400 mt-0.5">Python DXF Drawing and CAD File Library · <span class="text-green-600 font-semibold">MIT</span></p>
                                    </div>
                                </div>
                                <div class="flex items-start gap-2.5 p-2.5 bg-gray-900/60 rounded-lg border border-gray-800/60">
                                    <span class="shrink-0 w-2 h-2 rounded-full bg-rose-400 mt-1"></span>
                                    <div>
                                        <a href="https://github.com/NousResearch/Hermes-Function-Calling" target="_blank" class="text-rose-400 hover:text-rose-300 font-bold text-[11px] underline">NousResearch Hermes Agent</a>
                                        <span class="text-[10px] text-gray-500 ml-1">— Nous Research</span>
                                        <p class="text-[10px] text-gray-400 mt-0.5">Autonomous Agent Tool Orchestration Protocol and Multi-Tier Sandbox Specs · <span class="text-green-600 font-semibold">MIT / Apache 2.0</span></p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
""".strip()

output_js = f"""// ================================================================
// Webcom AI - Bilingual User Guide Translations (zh-TW & en)
// Author: startgo (startgo@yia.app) | License: GPLv3
// ================================================================

const GUIDE_TRANSLATIONS = {{
    "zh-TW": {json.dumps(tab_contents_zh, ensure_ascii=False, indent=8)},
    "en": {json.dumps(tab_contents_en, ensure_ascii=False, indent=8)}
}};

if (typeof window !== 'undefined') {{
    window.GUIDE_TRANSLATIONS = GUIDE_TRANSLATIONS;
}}
"""

with open('web/js/guide_translations.js', 'w', encoding='utf-8') as f:
    f.write(output_js)

print("Generated web/js/guide_translations.js successfully!")
