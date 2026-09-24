# Webcom AI — Dual-Engine WASM AI Console with Hermes Agent Core

<p align="center">
  <a href="#繁體中文">繁體中文</a> • <a href="#english">English</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Architecture-WASM--First-blue?style=for-the-badge" alt="WASM First">
  <img src="https://img.shields.io/badge/Hermes_Tools-100+-purple?style=for-the-badge" alt="100+ Tools">
  <img src="https://img.shields.io/badge/Jev_Latency-~4ms-emerald?style=for-the-badge" alt="Jev Latency">
  <img src="https://img.shields.io/badge/License-GPL_v3.0-orange?style=for-the-badge" alt="License">
</p>

---

<a name="繁體中文"></a>
## 🇹🇼 繁體中文

### 🎯 專案簡介

**Webcom AI** 是一套將 **Webcom（雙引擎 Web/WASM AI 控制台）** 與 **NousResearch Hermes Agent（100+ 款強大工具鏈的自主 Agent）** 進行深度整合的新一代邊緣 AI 系統。

針對原生 `portable-hermes-agent` 依賴 Windows 本機 Tkinter GUI 且無法在瀏覽器沙盒運行的限制，本專案實現了 **WASM-First（以 WebAssembly 為第一公民）** 架構，並具備 **Jev 極速單次傳播決策器（~4ms）** 與 **原生 Hermes Upstream 無痛同步更新機制**。

---

### ✨ 核心亮點

1. 🌐 **現代化雙欄 Web 控制台（淘汰傳統 Tkinter）**：
   - 整合 Webcom 雙欄自適應介面、Artifact 預覽工坊、多協定終端機（Session #1~#8：本地 Shell / WSL / Pyodide WASM / Web Serial 直連）。
   - 跨平台支援，可在純瀏覽器、離線斷網環境或 WinPE 中運行。

2. ⚡ **三層自適應工具執行模型（Three-Tier Execution Model）**：
   - 🟢 **Tier 1 (純 WASM / 瀏覽器內閉環)**：
     - Python 程式碼執行（Pyodide WASM 直譯器）。
     - 硬體 COM 序列埠操作（Chrome/Edge 原生 Web Serial API，免驅動）。
     - 本地對話記憶（Memory）、任務清單（Todo）、SVG 向量圖渲染。
     - 純客戶端向量檢索與語意重排（Transformers.js + ONNX WASM）。
   - 🟡 **Tier 2 (直連 HTTP / Fetch)**：
     - 本地 LM Studio API (Port 1234)、Serper / 網際網路搜尋、模型即時熱切換。
   - 🔴 **Tier 3 (Host Daemon 委派)**：
     - 本機作業系統權限（CMD / PowerShell / WSL）、實體檔案讀寫。
     - NVIDIA GPU 硬體狀態探針（`nvidia-smi`）。
     - 重型多模態生成服務代理（ComfyUI:5000、TTS:8200、Music:9150）。
     - **優雅降級**：若未啟動 Daemon，系統自動提供降級引導與純沙盒替代方案，絕不卡死。

3. 🎯 **Jev 極速二元決策與 Qwen2.5-0.5B 協同架構（System 1 快思 + System 2 慢想）**：
   - 解決微型模型（如 0.5B）面對 100+ 款工具時注意力渙散的難題。
   - **System 1 (Jev Cross-Encoder)**：以 4ms 極速單次傳播過濾意圖，瞬間鎖定 Top 1~2 款工具。
   - **System 2 (ONNX Qwen2.5-0.5B)**：只需接收精簡後的工具 Schema，以極致準確度發射 `<tool_call>`。

4. 🔄 **原生 Hermes Agent Upstream 差異追蹤與自動適配**：
   - 當 Upstream（`portable-hermes-agent` 或 `NousResearch/hermes-agent`）發布新版本時，透過 [`sync_upstream_hermes.py`](sync/sync_upstream_hermes.py) 進行全自動比對。
   - 自動更新工具契約清單 ([`hermes_tools_manifest.json`](hermes_bridge/schema/hermes_tools_manifest.json))，並為新工具產生適配器模板 ([`hermes_bridge/adapters/`](hermes_bridge/adapters/))。

---

### 🚀 快速開始

#### 1. 啟動主控台與後端服務
在 Windows 檔案總管雙擊：
👉 **`START.bat`**
* 自動啟動 FastAPI Host Daemon (`http://127.0.0.1:8001`) 並喚醒瀏覽器。
* 若本機無 Python，自動以「純瀏覽器 WASM 獨立沙盒」模式開啟。

#### 2. 原生 Hermes Agent 更新同步
當 upstream 發布新版或更換 zip 壓縮檔時，雙擊：
👉 **`SYNC_UPSTREAM.bat`**
* 自動掃描 Upstream 的 `toolsets.py` 與 `tools/*.py`。
* 輸出差異報告 [`sync/sync_report.md`](sync/sync_report.md)，並自動生成新增工具的適配器骨架。

#### 3. 執行單元測試
雙擊：
👉 **`TEST.bat`**
* 執行 [`tests/test_tool_routing.py`](tests/test_tool_routing.py)，驗證 101 款工具的路由規則與契約完整性。

---

### 📁 專案目錄結構

```text
Webcom_AI/
├── web/                             # 前端 Web UI (雙欄控制台、wterm 終端、Chat)
│   ├── index.html
│   └── app.js
├── hermes_bridge/                   # Hermes 工具橋接層
│   ├── hermes_tools.js              # 前端三層工具分流調度器
│   ├── schema/
│   │   └── hermes_tools_manifest.json # 101 款工具的標準契約與分層定義
│   └── adapters/                    # 各工具獨立適配器 (隔離 Upstream 變更)
├── daemon/                          # 輕量 FastAPI Host Daemon (Port 8001)
│   ├── server.py
│   └── requirements.txt
├── sync/                            # Upstream 同步與差異分析模組
│   ├── sync_upstream_hermes.py
│   └── sync_report.md
├── docs/                            # 專案架構文件
│   ├── ARCHITECTURE.md              # 系統架構設計藍圖
│   ├── UPSTREAM_UPDATE_GUIDE.md     # Upstream 更新操作指南
│   └── TOOL_MATRIX.md               # 100+ 工具分級與降級矩陣
├── tests/                           # 自動化測試案例
│   ├── test_tool_routing.py         # 工具分流單元測試
│   ├── test_agent_reasoning.py      # 本地小模型 Agent 閉環實測
│   └── test_jev_synergy.py          # Jev + Qwen 協同決策測試
├── START.bat                        # 一鍵啟動腳本
├── SYNC_UPSTREAM.bat                # 一鍵 Upstream 同步腳本
└── TEST.bat                         # 一鍵測試腳本
```

---

<a name="english"></a>
## 🌐 English

### 🎯 Overview

**Webcom AI** is a next-generation Edge AI system that deeply integrates **Webcom (Dual-Engine Web/WASM AI Console)** with **NousResearch Hermes Agent (Autonomous Agent with 100+ tools)**.

Addressing the limitation where native `portable-hermes-agent` is tied to Windows Tkinter GUI and cannot run inside browser sandboxes, this project implements a **WASM-First architecture** with the **Jev Fast Single Forward-Pass Decision Engine (~4ms)** and an automated **Upstream Hermes Synchronization Mechanism**.

---

### ✨ Key Features

1. 🌐 **Modern Dual-Pane Web Console (Replaces Tkinter)**:
   - Built on Webcom's dual-pane adaptive layout, Artifact Drawer, and multi-protocol terminal (Session #1~#8: Local Shell, WSL, Pyodide WASM, Web Serial).
   - Fully cross-platform, capable of running in pure browser environments, air-gapped offline networks, and WinPE.

2. ⚡ **Three-Tier Adaptive Execution Model**:
   - 🟢 **Tier 1 (Pure In-Browser WASM)**:
     - Python script execution via Pyodide WASM runtime.
     - Direct hardware COM port access via Web Serial API (driverless).
     - Local Memory, Todo planning, and SVG vector rendering.
     - Client-side vector search and semantic reranking (Transformers.js + ONNX WASM).
   - 🟡 **Tier 2 (Direct HTTP / Fetch)**:
     - Local LM Studio API (Port 1234), Serper / Web search, and runtime model switching.
   - 🔴 **Tier 3 (Host Daemon Delegated)**:
     - Native OS permissions (CMD / PowerShell / WSL) and physical File IO.
     - NVIDIA GPU telemetry via `nvidia-smi`.
     - Multi-modal local service proxies (ComfyUI:5000, TTS:8200, Music:9150).
     - **Graceful Degradation**: If the Host Daemon is offline, the console provides friendly fallback guidance without crashing.

3. 🎯 **Jev Fast-Decision & Qwen2.5-0.5B Synergy (System 1 Fast + System 2 Slow)**:
   - Resolves attention dilution when small models (like 0.5B) encounter 100+ tool definitions.
   - **System 1 (Jev Cross-Encoder)**: Filters user intent in ~4ms via single forward-pass, isolating the Top 1~2 tools.
   - **System 2 (ONNX Qwen2.5-0.5B)**: Receives a concise tool schema and emits precise `<tool_call>` actions with high fidelity.

4. 🔄 **Native Hermes Agent Upstream Synchronization**:
   - Automatically tracks updates from upstream (`portable-hermes-agent` or `NousResearch/hermes-agent`) using [`sync_upstream_hermes.py`](sync/sync_upstream_hermes.py).
   - Generates difference reports ([`sync/sync_report.md`](sync/sync_report.md)), updates [`hermes_tools_manifest.json`](hermes_bridge/schema/hermes_tools_manifest.json), and scaffolds new adapters in [`hermes_bridge/adapters/`](hermes_bridge/adapters/).

---

### 🚀 Quick Start

#### 1. Launch Console & Host Daemon
Double-click in Windows Explorer:
👉 **`START.bat`**
* Starts the FastAPI Host Daemon (`http://127.0.0.1:8001`) and opens the default browser.
* If Python is absent, automatically launches in Standalone Browser WASM mode.

#### 2. Sync Upstream Hermes Updates
When upstream releases a new version or zip file, double-click:
👉 **`SYNC_UPSTREAM.bat`**
* Scans `toolsets.py` and `tools/*.py` in upstream.
* Generates [`sync/sync_report.md`](sync/sync_report.md) and creates adapter templates for any new tools.

#### 3. Run Automated Tests
Double-click:
👉 **`TEST.bat`**
* Executes [`tests/test_tool_routing.py`](tests/test_tool_routing.py) to verify tool routing and contract integrity.

---

### 📄 License

Distributed under the **GNU General Public License v3.0 (GPL-3.0)**. See upstream license files for details.
