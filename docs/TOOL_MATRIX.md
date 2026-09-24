# Hermes Agent 100+ 工具三層分級執行矩陣 (Tool Matrix Reference)

本文件列出原生 Hermes Agent 的 100+ 款工具在 Webcom AI 中的分級歸屬、執行環境以及在**純 WASM 斷網環境**下的降級行為。

---

## 1. 分級原則

* 🟢 **Tier 1 (Pure WASM / 瀏覽器內執行)**：無須 Daemon、無須管理員權限，藉由 WebAssembly、Pyodide、Web Serial API 或前端 JS 模組直接完成。
* 🟡 **Tier 2 (Direct HTTP / Fetch)**：瀏覽器端直接透過 Fetch API 連線至外部服務（如 LM Studio:1234 或 Serper 搜尋）。
* 🔴 **Tier 3 (Host Daemon Delegated)**：涉及作業系統層級（本機 Shell、實體硬碟讀寫、NVIDIA 顯卡核心）或重型 PyTorch 伺服器（ComfyUI:5000、TTS:8200、Music:9150）。若 Daemon 未啟動，提供優雅降級或提示。

---

## 2. 核心工具矩陣表

| 工具名稱 (Tool Name) | 原生 Hermes 分類 | 執行層級 (Tier) | 執行載體 / 技術 | 純 WASM 斷網模式下表現 (Fallback Behavior) |
| :--- | :--- | :--- | :--- | :--- |
| `run_python` | Code Execution | 🟢 **Tier 1** | Pyodide WASM / Web Worker | **完全可用**，直接在瀏覽器記憶體沙盒內執行 Python 程式碼。 |
| `execute_code` | Code Execution | 🟢 **Tier 1** | Pyodide WASM | **完全可用**，支援數值計算、正則與資料處理。 |
| `todo` | Planning | 🟢 **Tier 1** | LocalStorage / IndexedDB | **完全可用**，任務清單永久保存在瀏覽器本地快照中。 |
| `memory` | Memory | 🟢 **Tier 1** | In-Memory / OPFS | **完全可用**，對話記憶在瀏覽器分頁中保存與檢索。 |
| `clarify` | Reasoning | 🟢 **Tier 1** | Webcom UI Modal 彈窗 | **完全可用**，向使用者彈出互動式澄清問題卡片。 |
| `svg` | Visualization | 🟢 **Tier 1** | DOM / SVG 渲染引擎 | **完全可用**，在 Artifact 工坊或對話泡泡中即時畫圖。 |
| `query_knowledge_base` | RAG | 🟢 **Tier 1** | Transformers.js (ONNX WASM) | **完全可用**，純客戶端向量檢索與語意重排 (Jev)。 |
| `search_guide` | Documentation | 🟢 **Tier 1** | 內建雙語離線手冊 (Markdown) | **完全可用**，100% 離線檢索本機指引。 |
| `web_search` | Web Research | 🟡 **Tier 2** | Web Fetch / REST API | 降級為離線搜尋警告或引導使用左側終端機查詢。 |
| `web_extract` | Web Scraper | 🟡 **Tier 2** | Web Fetch (DOMParser) | 需受 CORS 政策約束，或經 Daemon 反向代理。 |
| `serper_search` | Search | 🟡 **Tier 2** | Serper.dev REST API | 需配置 API Key，直接由瀏覽器發送。 |
| `switch_model` | Model Switcher | 🟡 **Tier 2** | Webcom Engine Controller | **完全可用**，於 WebGPU、ONNX WASM 與 API 間切換。 |
| `lm_studio_status` | LM Studio | 🟡 **Tier 2** | `http://127.0.0.1:1234/v1/models` | 若 LM Studio 未開啟或跨域被阻擋，回傳離線狀態。 |
| `lm_studio_chat` | LM Studio | 🟡 **Tier 2** | OpenAI-Compatible API | 直接向 1234 端口發起串流生成。 |
| `terminal` | System | 🔴 **Tier 3** | Subprocess (CMD / PowerShell / WSL) | ⚠️ **需 Daemon**；無 Daemon 時切換至 Web Serial COM 埠。 |
| `process` | System | 🔴 **Tier 3** | OS Process Manager | ⚠️ **需 Daemon**；若未連線則提示啟動常駐程式。 |
| `read_file` | File IO | 🔴 **Tier 3** | OS File System | ⚠️ **需 Daemon**；或引導使用者手動拖曳上傳至前端。 |
| `write_file` | File IO | 🔴 **Tier 3** | OS File System | ⚠️ **需 Daemon**；無 Daemon 時改為前端 Artifact 下載。 |
| `patch` | File IO | 🔴 **Tier 3** | OS File System | ⚠️ **需 Daemon**；在純前端時以 Diff 預覽卡片展示。 |
| `search_files` | File IO | 🔴 **Tier 3** | Python `glob` / `Path` | ⚠️ **需 Daemon**。 |
| `gpu_info` | Hardware | 🔴 **Tier 3** | `nvidia-smi` / WMI | ⚠️ **需 Daemon**；無 Daemon 時顯示 WebGPU 介面識別資訊。 |
| `comfyui_generate` | Extension | 🔴 **Tier 3** | 本機 ComfyUI (Port 5000) | ⚠️ 需本機獨立啟動 ComfyUI 服務 (需 6GB 顯存)。 |
| `tts_server_generate`| Extension | 🔴 **Tier 3** | 本機 TTS Server (Port 8200) | ⚠️ 需本機啟動 TTS 服務；純 WASM 可降級使用 Web Speech API。 |
| `music_generate` | Extension | 🔴 **Tier 3** | 本機 Music Server (Port 9150) | ⚠️ 需本機獨立啟動 Music 服務。 |
| `workflow_*` | Automation | 🔴 **Tier 3** | Host Workflow Engine | 輕量工作流可在前端執行，定時排程 (Cron) 需 Daemon。 |
| `kanban_*` | Multi-Agent | 🔴 **Tier 3** | Multi-Agent Coordination | 協作卡片於前端展示，狀態同步需 Daemon 或雲端同步。 |

---

## 3. 工具適配與擴充方式

每個工具在 `hermes_bridge/adapters/<tool_name>.js` 中均有獨立適配器。若需調整某工具的執行層級或實作方式：
1. 修改 `hermes_bridge/schema/hermes_tools_manifest.json` 中該工具的 `"tier"` 欄位。
2. 編輯 `hermes_bridge/adapters/<tool_name>.js` 實作對應邏輯。
3. 執行 `python -m unittest tests/test_tool_routing.py` 確保無破壞性變更。
