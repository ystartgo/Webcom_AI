#!/usr/bin/env python3
"""
Webcom AI - GraphRAG Backend Engine
Provides knowledge graph storage, multi-hop traversal, entity extraction, and prompt context formatting.
"""

import json
import re
from pathlib import Path
from typing import Dict, Any, List, Optional, Set

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = PROJECT_ROOT / "data"
GRAPH_FILE = DATA_DIR / "knowledge_graph.json"

DEFAULT_GRAPH = {
    "version": "1.0",
    "nodes": [
        {"id": "webcom_ai", "label": "Webcom AI", "type": "system", "desc": "雙引擎 AI 控制台，整合 Tier 1 WASM、Tier 2 HTTP 與 Tier 3 Host Daemon。"},
        {"id": "tier1_wasm", "label": "Tier 1: Pure WASM", "type": "system", "desc": "純瀏覽器本機沙箱，包含 Pyodide、Web Serial 與 Jev Fast-Decision。"},
        {"id": "tier2_http", "label": "Tier 2: Direct HTTP", "type": "system", "desc": "前端直連本機或雲端 LM Studio / OpenAI 相容 REST API。"},
        {"id": "tier3_daemon", "label": "Tier 3: Host Daemon", "type": "system", "desc": "本機背景常駐服務 (Port 8001)，委派執行 Shell、WSL2 與 ComfyUI。"},
        {"id": "hermes_agent", "label": "Hermes Agent", "type": "agent", "desc": "自主推理與工具排程代理，搭載 101 款核心工具契約。"},
        {"id": "jev_decision", "label": "Jev Fast-Decision", "type": "agent", "desc": "微秒級決策分流引擎，專責 API 500 自動重試與工具死循環阻斷。"},
        {"id": "host_daemon", "label": "Host Daemon (8001)", "type": "service", "desc": "Python FastAPI 常駐服務，監聽 127.0.0.1:8001。"},
        {"id": "web_serial", "label": "Web Serial", "type": "hardware", "desc": "瀏覽器原生硬體序列埠通訊，支援 9600 至 921600 鮑率。"},
        {"id": "baud_rates", "label": "9600-921600 Baud", "type": "hardware", "desc": "標準嵌入式硬體通訊傳輸速率範圍。"},
        {"id": "lm_studio", "label": "LM Studio (1234)", "type": "service", "desc": "本機大型語言模型推論伺服器，監聽通訊埠 1234。"},
        {"id": "ollama", "label": "Ollama (11434)", "type": "service", "desc": "本機開源模型運行環境，預設監聽通訊埠 11434。"},
        {"id": "comfyui", "label": "ComfyUI (5000)", "type": "service", "desc": "節點式 AI 繪圖與生圖伺服器，預設監聽通訊埠 5000。"},
        {"id": "novnc_wsl", "label": "noVNC WSL2 (6080)", "type": "service", "desc": "瀏覽器內嵌 Linux 遠端桌面視窗，監聽通訊埠 6080。"},
        {"id": "kokoro_tts", "label": "Kokoro TTS (8200)", "type": "service", "desc": "本機輕量高速語音合成 (TTS) 服務，監聽通訊埠 8200。"},
        {"id": "pyodide_wasm", "label": "Pyodide WASM", "type": "system", "desc": "純瀏覽器執行 Python 3.11 腳本與數值計算環境。"},
        {"id": "webgpu_engine", "label": "WebGPU Native", "type": "hardware", "desc": "瀏覽器原生顯示卡硬體加速推論引擎 (Qwen2.5 等 MLC 模型)。"},
        {"id": "onnx_wasm", "label": "ONNX WASM", "type": "system", "desc": "跨平台神經網路 CPU/GPU 混合推論架構。"},
        {"id": "artifact_drawer", "label": "Artifact 工坊", "type": "system", "desc": "即時 HTML / SVG / 程式沙箱預覽與代碼抽屜。"},
        {"id": "app_library", "label": "自建應用庫", "type": "system", "desc": "單檔自訂工具與腳本管理庫，支援一鍵執行與 LLM 深度調用。"},
        {"id": "ragpack_spec", "label": "RagPack 規範", "type": "standard", "desc": "主題知識包備份標準格式 (.ragpack JSON)。"},
        {"id": "graphrag_engine", "label": "GraphRAG 引擎", "type": "agent", "desc": "結合實體關聯圖譜與向量分塊的多跳推理知識庫系統。"}
    ],
    "edges": [
        {"source": "webcom_ai", "target": "tier1_wasm", "relation": "具備架構層級", "weight": 1.0},
        {"source": "webcom_ai", "target": "tier2_http", "relation": "具備架構層級", "weight": 1.0},
        {"source": "webcom_ai", "target": "tier3_daemon", "relation": "具備架構層級", "weight": 1.0},
        {"source": "webcom_ai", "target": "hermes_agent", "relation": "搭載核心大腦", "weight": 1.0},
        {"source": "webcom_ai", "target": "jev_decision", "relation": "搭載安全守護", "weight": 1.0},
        {"source": "webcom_ai", "target": "graphrag_engine", "relation": "整合知識大腦", "weight": 1.0},
        {"source": "tier1_wasm", "target": "pyodide_wasm", "relation": "內建執行時", "weight": 0.9},
        {"source": "tier1_wasm", "target": "webgpu_engine", "relation": "硬體顯卡加速", "weight": 0.9},
        {"source": "tier1_wasm", "target": "onnx_wasm", "relation": "模型推論後端", "weight": 0.8},
        {"source": "tier1_wasm", "target": "web_serial", "relation": "本機外設通訊", "weight": 0.9},
        {"source": "web_serial", "target": "baud_rates", "relation": "支援通訊鮑率", "weight": 0.9},
        {"source": "tier2_http", "target": "lm_studio", "relation": "直連推論節點", "weight": 0.9},
        {"source": "tier2_http", "target": "ollama", "relation": "直連推論節點", "weight": 0.9},
        {"source": "tier3_daemon", "target": "host_daemon", "relation": "常駐連線目標", "weight": 1.0},
        {"source": "host_daemon", "target": "novnc_wsl", "relation": "反向代理轉發", "weight": 0.8},
        {"source": "host_daemon", "target": "comfyui", "relation": "委派生圖任務", "weight": 0.8},
        {"source": "host_daemon", "target": "kokoro_tts", "relation": "呼叫語音合成", "weight": 0.8},
        {"source": "hermes_agent", "target": "tier1_wasm", "relation": "派發本機工具", "weight": 0.9},
        {"source": "hermes_agent", "target": "tier2_http", "relation": "派發聯網工具", "weight": 0.9},
        {"source": "hermes_agent", "target": "tier3_daemon", "relation": "派發宿主工具", "weight": 0.9},
        {"source": "jev_decision", "target": "hermes_agent", "relation": "阻斷死循環", "weight": 1.0},
        {"source": "jev_decision", "target": "tier2_http", "relation": "500錯誤重試評估", "weight": 1.0},
        {"source": "graphrag_engine", "target": "hermes_agent", "relation": "注入實體三元組", "weight": 1.0},
        {"source": "graphrag_engine", "target": "ragpack_spec", "relation": "知識包格式相容", "weight": 0.8},
        {"source": "webcom_ai", "target": "artifact_drawer", "relation": "提供互動沙箱", "weight": 0.8},
        {"source": "webcom_ai", "target": "app_library", "relation": "提供工具管理", "weight": 0.8}
    ]
}

class BackendGraphRAGEngine:
    def __init__(self):
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        self.load_graph()

    def load_graph(self):
        if GRAPH_FILE.exists():
            try:
                data = json.loads(GRAPH_FILE.read_text(encoding="utf-8"))
                self.nodes = data.get("nodes", DEFAULT_GRAPH["nodes"])
                self.edges = data.get("edges", DEFAULT_GRAPH["edges"])
                return
            except Exception as e:
                print(f"[GraphRAG Engine] Failed to load {GRAPH_FILE}: {e}")
        self.nodes = list(DEFAULT_GRAPH["nodes"])
        self.edges = list(DEFAULT_GRAPH["edges"])
        self.save_graph()

    def save_graph(self):
        try:
            GRAPH_FILE.write_text(
                json.dumps({"version": "1.0", "nodes": self.nodes, "edges": self.edges}, indent=2, ensure_ascii=False),
                encoding="utf-8"
            )
        except Exception as e:
            print(f"[GraphRAG Engine] Failed to save {GRAPH_FILE}: {e}")

    def get_graph(self) -> Dict[str, Any]:
        return {
            "status": "success",
            "node_count": len(self.nodes),
            "edge_count": len(self.edges),
            "nodes": self.nodes,
            "edges": self.edges
        }

    def query(self, user_query: str, mode: str = "hybrid", max_hops: int = 2, limit: int = 15) -> Dict[str, Any]:
        if not user_query or not user_query.strip():
            return {
                "status": "success",
                "has_match": False,
                "matched_entities": [],
                "triples_count": 0,
                "triples": [],
                "formatted_prompt": ""
            }

        q_lower = user_query.strip().lower()
        matched_nodes = []
        for n in self.nodes:
            label = n.get("label", "").lower()
            desc = n.get("desc", "").lower()
            if label in q_lower or q_lower in label or (desc and (desc in q_lower or q_lower in desc)):
                matched_nodes.append(n)

        # Token match
        tokens = [t for t in re.split(r"[\s,./;:_|\-+~!?，。、；：？！]+", q_lower) if len(t) >= 2]
        for n in self.nodes:
            if any(m["id"] == n["id"] for m in matched_nodes):
                continue
            text = (n.get("label", "") + " " + n.get("desc", "")).lower()
            if any(tok in text for tok in tokens):
                matched_nodes.append(n)

        if not matched_nodes:
            return {
                "status": "success",
                "has_match": False,
                "matched_entities": [],
                "triples_count": 0,
                "triples": [],
                "formatted_prompt": "未找到直接關聯之圖譜實體。"
            }

        visited_node_ids: Set[str] = {n["id"] for n in matched_nodes}
        relevant_edges: List[Dict[str, Any]] = []
        current_frontier = set(visited_node_ids)

        for _ in range(max(1, min(max_hops, 3))):
            next_frontier = set()
            for edge in self.edges:
                src_in = edge["source"] in current_frontier
                tgt_in = edge["target"] in current_frontier
                if src_in or tgt_in:
                    if not any(e["source"] == edge["source"] and e["target"] == edge["target"] and e["relation"] == edge["relation"] for e in relevant_edges):
                        relevant_edges.append(edge)
                    if src_in and edge["target"] not in visited_node_ids:
                        visited_node_ids.add(edge["target"])
                        next_frontier.add(edge["target"])
                    if tgt_in and edge["source"] not in visited_node_ids:
                        visited_node_ids.add(edge["source"])
                        next_frontier.add(edge["source"])
            current_frontier = next_frontier

        # Triples mapping
        id_to_node = {n["id"]: n for n in self.nodes}
        triples = []
        for e in relevant_edges[:limit]:
            src_node = id_to_node.get(e["source"], {"label": e["source"]})
            tgt_node = id_to_node.get(e["target"], {"label": e["target"]})
            triples.append({
                "source": src_node["label"],
                "relation": e["relation"],
                "target": tgt_node["label"],
                "text": f"({src_node['label']}) ──[{e['relation']}]──> ({tgt_node['label']})"
            })

        all_nodes = [id_to_node[nid] for nid in visited_node_ids if nid in id_to_node]
        triples_block = "\n".join([f"• {t['text']}" for t in triples])
        entity_desc_block = "\n".join([f"• [{n['label']}]: {n.get('desc', '無描述')}" for n in all_nodes[:6]])

        formatted_prompt = (
            "【GraphRAG 知識圖譜多跳推理背景知識 (Knowledge Graph Context)】\n"
            f"▶ 核心實體關聯三元組 (Knowledge Graph Triples):\n{triples_block or '• 暫無特定邊關聯'}\n\n"
            f"▶ 關聯實體定義 (Entity Definitions):\n{entity_desc_block}"
        )

        return {
            "status": "success",
            "has_match": True,
            "matched_entities": [n["label"] for n in matched_nodes],
            "triples_count": len(triples),
            "triples": triples,
            "formatted_prompt": formatted_prompt
        }

backend_graphrag = BackendGraphRAGEngine()
