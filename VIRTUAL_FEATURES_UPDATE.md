# Webcom AI 專案功能實作狀態更新（2026-10-06）

## 🎯 **核心發現**

經過詳細檢查，以下功能是**首次運行後會自動生成/下載**的檔案，而非完全虛擬：

---

## ✅ **實際可運作的功能**

### 1. **天氣查詢功能 (get_weather)**
```python
# daemon/server.py 行號 846-898
elif name in ["web_search", "weather", "get_weather"]:
    # Primary: Open-Meteo Live API
    meteo_res = fetch_open_meteo_weather_py(loc)
    
    # Secondary: wttr.in
    url = f"https://wttr.in/{urllib.parse.quote(loc)}?format=j1"
```

✅ **已完整實作**:
- 會呼叫真實的 **Open-Meteo** 和 **wttr.in** API
- 有離線模擬作為備份方案
- 返回真實的天氣數據結構

### 2. **GraphRAG 知識圖譜引擎**
```python
# daemon/graphrag_engine.py
DEFAULT_GRAPH = {
    "nodes": [...],  # 包含 webcom_ai, tier1_wasm, hermes_agent 等節點
    "edges": [...]   # 關係定義
}
```

✅ **已部分實作**:
- 有預設的知識圖譜結構
- 可從 `data/knowledge_graph.json` 加載
- 支援多跳檢索 (`graphrag_query`)

### 3. **Jev 模型列表顯示**
```python
# daemon/server.py 行號 91-105
@app.get("/api/jev/models")
def api_jev_models():
    return {
        "status": "success",
        "models": [
            {"id": "Xenova/bge-reranker-base", "name": "BGE-Reranker-Base"},
            {"id": "onnx-community/bge-reranker-v2-m3-ONNX", "name": "BGE-Reranker-v2-M3"},
            # ...
        ]
    }
```

✅ **API 已實作**:
- 列出可用的 ONNX 模型 ID
- 但**實際模型需手動下載或瀏覽器緩存**

---

## ⚠️ **需要手動配置的項目**

### 1. **字典資料庫 (dictionary_rag.db)**
❌ **狀態**: 未建立

🔧 **如何建立**:
```bash
cd /home/auser/Project/Webcom_AI
source .venv/bin/activate
python tools/convert_dictionary_rag.py
```

📝 **說明**:
- 使用 `tools/convert_dictionary_rag.py` 將 `Dictionary_Zh_TW.xlsx` 轉換為 SQLite + FTS5
- 產生 `data/dictionary_rag.db` (約幾 MB)
- 同時會生成輕量知識包 `data/ragpacks/*.json`

### 2. **ONNX 模型文件**
⚠️ **狀態**: 需要首次運行時下載

🔧 **如何獲取**:
- **WebGPU 模式**: 當選擇 WebGPU 模型時，瀏覽器會自動從 HuggingFace 下載並緩存
- **ONNX WASM 模式**: 需要前端手動加載模型權重
- 模型示例:
  - `Qwen2.5-0.5B` (~350MB)
  - `bge-reranker-base` (~140MB)
  - `OneJev-0.8B-ONNX` (~800MB)

📝 **說明**:
- 非伺服器端下載，而是**客戶端瀏覽器下載**
- 一旦下載，會永久緩存在瀏覽器的 IndexedDB/Caching 中

### 3. **Serper.dev API Key**
❌ **狀態**: 未配置

🔧 **如何配置**:
需要在 `hermes_bridge/hermes_tools.js` 或 `.env` 中添加：
```javascript
const SERPER_API_KEY = "your-api-key-here";
```

---

## ❌ **真正虛擬/未實作的功能**

### 1. **網頁抓取 (web_extractor/web_extract)**
❌ **狀態**: 前綴列在 Tier 2，但後端無實作

```javascript
// hermes_bridge/hermes_tools.js - Tier 2 列表
const DEFAULT_TIER2_TOOLS = ['web_search', 'web_extract', ...];

// 但在 daemon/server.py 中搜索不到 web_extractor 處理邏輯
grep -c "web_extractor" daemon/server.py  → 0 matches
```

📝 **影響**:
- 前端可以調用此工具
- 但沒有對應的後端處理函數
- 會返回錯誤或空結果

### 2. **一般網頁搜尋 (web_search)**
❌ **狀態**: 只有模擬結果

```python
# daemon/server.py 行號 900-908
else:
    return {
        "status": "success",
        "tool": "web_search",
        "query": query,
        "results": [
            {"title": f"搜尋結果：{query}", 
             "snippet": f"Webcom AI Hermes 聯網搜尋引擎已檢索「{query}」之相關技術文獻"}
        ]
    }
```

📝 **影響**:
- 不真的連接外部搜尋引擎
- 僅返回預先編寫的模擬回應
- 除非配置 Serper API，否則無法實現真實搜尋

### 3. **外部服務整合 (ComfyUI/TTS/Music)**
❌ **狀態**: 僅端口檢查

```python
# daemon/server.py 行號 955-969
elif name.startswith("comfyui_"):
    port = 5000
    is_up = check_port_listening(port)
    return {
        "status": "success" if is_up else "service_offline",
        "message": "ComfyUI service ready on port 5000" if is_up 
                  else "ComfyUI service is not running..."
    }
```

📝 **影響**:
- 僅檢查端口是否開啟
- 若 ComfyUI/TTS/Music 服務未獨立啟動，則返回離線狀態
- 無實際的圖片生成、語音合成、音樂生成功能

---

## 🗂️ **檔案生成機制總結**

| 功能 | 是否需要手動執行 | 生成檔案 | 位置 |
|------|-----------------|----------|------|
| 字典資料庫 | ✅ 是 | `dictionary_rag.db` | `data/` |
| RAG 知識包 | ✅ 是 | `*.json` | `data/ragpacks/` |
| ONNX 模型 | ⚠️ 瀏覽器下載 | 緩存在瀏覽器 | IndexedDB |
| GraphRAG 圖譜 | ⚠️ 可選加載 | `knowledge_graph.json` | `data/` |
| LM Studio/Ollama | ❌ 否 | 需自行安裝 | 本地服務 |
| ComfyUI/TTS/Music | ❌ 否 | 需自行安裝 | 本地服務 |

---

## 🛠️ **建議的初始化步驟**

若要讓系統達到**最大可用度**，建議執行以下步驟：

### Step 1: 建立字典資料庫
```bash
cd /home/auser/Project/Webcom_AI
source .venv/bin/activate
python tools/convert_dictionary_rag.py
```

### Step 2: 測試關鍵功能
```bash
# 測試天氣查詢（真實 API）
curl http://127.0.0.1:8001/api/weather?loc=Taipei

# 測試 GraphRAG 查詢
curl -X POST http://127.0.0.1:8001/api/graphrag/query \
  -H "Content-Type: application/json" \
  -d '{"query":"Webcom AI","mode":"hybrid"}'

# 測試 Jev 模型列表
curl http://127.0.0.1:8001/api/jev/models
```

### Step 3: 瀏覽器配置
1. 訪問 `http://127.0.0.1:8001/web/index.html`
2. 選擇 WebGPU 引擎模式
3. 下載所需的 ONNX 模型
4. 等待瀏覽器緩存完成

### Step 4: (可選) 配置外部 API
```bash
# 創建 .env 檔案
echo "SERPER_API_KEY=your_key_here" >> .env
```

---

## 📋 **功能可用性矩陣**

| 功能 | Tier | 實作狀態 | 是否需要額外配置 |
|------|------|----------|------------------|
| get_weather | 2 | ✅ 已實作 | 無需 |
| run_python | 1 | ⚠️ 需 Pyodide | 瀏覽器支援 |
| todo/memory | 1 | ✅ 已實作 | 無需 |
| graphrag_query | 1/3 | ⚠️ 部分實作 | 需 GraphRAG 資料 |
| dictionary_lookup | 3 | ❌ 需建庫 | 需執行腳本 |
| web_search | 2 | ❌ 模擬 | 需 Serper API |
| web_extractor | 2 | ❌ 未實作 | 需開發 |
| terminal/process | 3 | ⚠️ 轉發 | 無實際 Shell |
| comfyui_generate | 3 | ❌ 端口檢查 | 需 ComfyUI |
| tts/music | 3 | ❌ 端口檢查 | 需 TTS/Music 服務 |
| GPU 資訊 | 3 | ✅ 已實作 | nvidia-smi 必須存在 |
| read/write_file | 3 | ⚠️ 轉發 | 無實際檔案權限 |

---

## 🎯 **結論與建議**

### 🔥 **真正的核心功能**（可直接使用）
1. **天氣查詢** (get_weather) - 真實 API
2. **基礎對話管理** (todo, memory) - 完整實作
3. **API 架構** - FastAPI 正常運行
4. **圖譜查詢** (partial) - 需補充資料

### 🔧 **需要初始化的功能**（可快速啟動）
1. **字典查詢** - 執行一次 `convert_dictionary_rag.py`
2. **ONNX 模型** - 第一次運行時瀏覽器下載
3. **GraphRAG 資料** - 擴充現有圖譜

### ⚠️ **需要開發的功能**（長期工作）
1. **網頁搜尋** - 整合 Serper 或其他搜尋 API
2. **網頁抓取** - 實作 web_extractor
3. **AI 生成服務** - ComfyUI, TTS, Music
4. **Shell 命令執行** - 需要安全沙盒設計
5. **檔案操作** - 需要權限控制

---

**最後更新**: 2026-10-06  
**分析版本**: v2.2.0-Hermes-GraphRAG-Jev-WebGPU-MultiTier  
**可用度評估**: 25% (核心框架可用，大量功能待配置/開發)  
**建議優先級**:  
1. **高**: 執行字典資料庫初始化腳本  
2. **中**: 整合真实網頁搜尋 API  
3. **低**: 逐步擴展其他生成式功能