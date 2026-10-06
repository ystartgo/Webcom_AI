# Webcom AI (Webcom + Hermes Agent WASM) 架構設計藍圖

## 1. 專案背景與願景

本專案（`webcom_AI`）旨在將 **Webcom（雙引擎 Web/WASM AI 控制台）** 與 **Hermes Agent（強大具自主性的 100+ 工具鏈 Agent）** 進行深度整合，打造一套：
1. **以 WASM / 瀏覽器沙盒為第一公民（WASM-First）**：
   - 介面徹底摒棄傳統無法跨平台的 Tkinter，全面採用 Webcom 雙欄響應式 Web UI。
   - 輕量運算、Python 腳本、文字/JSON/向量檢索、Jev 極速二元決策與硬體 COM 序列埠直接在瀏覽器 WASM / WebGPU 內閉環執行。
2. **雙軌彈性降級（Graceful Degradation）**：
   - **純瀏覽器/斷網模式（Air-Gapped WASM Mode）**：無任何後端常駐進程時，依然具備完整對話、WebGPU/ONNX 本地推論、Pyodide Python 運算、檔案解析與安全沙盒工具調用。
   - **本機賦能模式（Host Daemon Mode）**：啟動輕量 Daemon 後，無縫擴展真實 Shell、WSL、GPU 硬體狀態、以及 ComfyUI / 本機 TTS / 本機 Music 生成能力。
3. **原生 Hermes Upstream 無痛同步機制（Upstream Sync & Adapter Pattern）**：
   - 當 NousResearch 或 upstream `portable-hermes-agent` 釋出新版本、更新提示詞、新增/修改 Toolsets 時，透過本專案的同步追蹤機制，能夠**一鍵偵測差異、保留客製化、自動更新 Schema 與適配器 (Adapters)**。

---

## 2. 系統總體架構圖

```mermaid
flowchart TB
    subgraph Client_Browser ["瀏覽器客戶端 (Webcom AI Console & Pure WASM)"]
        subgraph UI_Layer ["UI & 互動層"]
            Console["Webcom 響應式雙欄主控台"]
            TermUI["wterm WASM 終端機 (Session #1~#8)"]
            Drawer["Artifacts 預覽工坊 & Jev 調試沙盒"]
        end

        subgraph Hermes_Agent_Core ["Hermes Agent 核心 (WASM / JS Bridge)"]
            Orchestrator["Hermes Orchestrator (對話迴圈 / 工具分流器)"]
            PromptGen["System Prompt 產生器 (動態注入 Toolsets & 環境感知)"]
            ToolRouter["Tool Dispatcher (工具路由中心)"]
        end

        subgraph Tier1_Pure_WASM ["Tier 1: 純 WASM 工具 (免安裝 / 沙盒內)"]
            Pyodide["Pyodide WASM (Python 3 REPL & 數據運算)"]
            WebSerial["Web Serial API (免驅動 COM 序列埠直連)"]
            ClientRAG["Transformers.js + RAG 向量檢索"]
            JevSandbox["Jev 極速二元/多元決策 (ONNX 5~28ms)"]
            ClientDoc["純前端文件解析 (Markdown / JSON / CSV)"]
        end

        subgraph Tier2_Web_API ["Tier 2: 瀏覽器直接 HTTP/Fetch 工具"]
            Serper["Serper.dev / Web 搜尋"]
            RemoteLLM["LM Studio / OpenRouter / OpenAI API"]
        end
    end

    subgraph Host_Daemon ["Tier 3: 本機宿主代理 (Webcom Daemon / Port 8001)"]
        FastAPI["FastAPI 輕量轉發代理"]
        NativeShell["真實本機 Shell (WSL / PowerShell / CMD)"]
        NativeSerial["後端 PySerial 驅動"]
        HeavyServices["外部 AI 服務 (ComfyUI:5000 / TTS:8200 / Music:9150)"]
        HardwareStatus["NVIDIA GPU 探針 (NVML / nvidia-smi)"]
    end

    subgraph Upstream_Hermes ["Upstream 原生 Hermes 倉庫"]
        UpstreamRepo["NousResearch / portable-hermes-agent"]
        SyncScript["sync_upstream_hermes.py (差異比對與適配器生成)"]
    end

    Console --> Orchestrator
    Orchestrator --> ToolRouter
    ToolRouter -->|純沙盒 / 程式碼計算| Tier1_Pure_WASM
    ToolRouter -->|直連 API| Tier2_Web_API
    ToolRouter -->|特權操作 (WebSocket/REST)| Host_Daemon

    UpstreamRepo -.->|自動分析 & 差異偵測| SyncScript
    SyncScript -.->|更新 Schema & 產生 Adapter 模板| Hermes_Agent_Core
```

---

## 3. 三層工具執行矩陣 (Three-Tier Execution Matrix)

為了解決 WASM 安全沙盒限制與原生 Agent 系統操作權限的矛盾，本專案將 Hermes 的 100+ 工具解構為三級執行層：

| 層級 | 執行環境 | 代表工具 | 特性與依賴 |
| :--- | :--- | :--- | :--- |
| **Tier 1: Pure WASM** | 瀏覽器主線程 / Web Worker / Pyodide | `run_python`, `execute_code`, `execute_serial` (Web Serial), `query_knowledge_base`, `todo`, `memory`, `clarify`, `svg` | **100% 離線可用**、無須本機 Python、無管理員權限、資料絕不離開瀏覽器。 |
| **Tier 2: Direct HTTP** | 瀏覽器 `fetch` / `WebSocket` | `web_search`, `web_extract`, `serper_search`, `switch_model`, `lm_studio_chat` | 支援直連任何相容 OpenAI 的端點或外部 Web 搜尋 API（需處理 CORS）。 |
| **Tier 3: Host Daemon** | 本機 Python Daemon (Port 8001) | `execute_shell`, `terminal`, `process`, `gpu_info`, `comfyui_*`, `tts_server_*`, `music_*`, `read_file`/`write_file` (本機實體硬碟) | 當需要存取本機 OS 或重型 4GB+ PyTorch 服務時調用；**若 Daemon 未啟動，自動提供友善降級引導**。 |

---

## 4. 原生 Hermes Agent 更新時的同步與適配設計

原生 Hermes Agent 的更新通常包含三類：
1. **Prompt 結構與人格演進**：更新於 `agent/prompts/` 或系統引導邏輯。
2. **工具清單與分類 (Toolsets)**：更新於 `toolsets.py` 中的 `_HERMES_CORE_TOOLS` 或 `TOOLSETS` 字典。
3. **具體工具實作與參數 Schema**：更新於 `tools/*.py`。

本專案的相應防禦與解耦機制如下：
* **Manifest 基準線 (`hermes_tools_manifest.json`)**：將工具定義（名稱、參數、描述、所屬 Tier）集中儲存為標準 JSON 契約。
* **Adapter 適配器插槽 (`hermes_bridge/adapters/`)**：每個工具均有獨立適配層，隔離 upstream 參數異動對 Webcom 前端 UI 的衝擊。
* **自動差異比對腳本 (`sync/sync_upstream_hermes.py`)**：
  - 能夠比對本地 Manifest 與 Upstream 的 `toolsets.py` / `tools/*.py`。
  - 列出「新增工具 (Added)」、「參數變更 (Modified)」、「移除工具 (Removed)」。
  - 自動生成新工具的 Adapter 骨架，工程人員只需決定其屬於 Tier 1、Tier 2 或 Tier 3。
