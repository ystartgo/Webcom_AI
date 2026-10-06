# Webcom AI 專案：虛擬功能 vs 動態生成檔案完整分析

## 📌 **快速摘要**

### ✅ **非虛擬 - 實際可運作的功能**
1. **天氣查詢 (get_weather)** - 使用 Open-Meteo API
2. **基礎对话管理** - todo, memory 功能完整
3. **FastAPI 後端** - 正常運作於端口 8001
4. **Jev 模型列表** - 已實作，列出現有模型
5. **GPU 資訊檢查** - nvidia-smi 回傳硬體狀態

---

## 🔧 **非虛擬 - 首次運行會自動生成/下載**

這些功能是**真實的**，只是需要**手動觸發一次**才能生成檔案：

### 1. 字典資料庫 (`dictionary_rag.db`)
- **狀態**: ⚠️ 需手動建立
- **如何生成**: 
```bash
python tools/convert_dictionary_rag.py
```
- **來源檔案**: `Dictionary_Zh_TW.xlsx` (已有，73MB)
- **目標檔案**: `data/dictionary_rag.db` (~10-20 MB)
- **完成後可用性**: ✅ 16.4 萬詞條全功能支援

### 2. ONNX 模型權重
- **狀態**: ⚠️ 瀏覽器首次運行時下載
- **如何獲取**: 
  - 訪問 Web UI → 選擇 WebGPU 模式 → 下拉選擇模型
  - 瀏覽器從 HuggingFace 自動下載
- **典型大小**: 
  - Qwen2.5-0.5B: ~350MB
  - bge-reranker-base: ~140MB
  - OneJev-0.8B-ONNX: ~800MB
- **儲存位置**: 瀏覽器 IndexedDB/Caching（永久緩存）
- **完成後可用性**: ✅ 完全離線可用

### 3. GraphRAG 知識圖譜資料
- **狀態**: ⚠️ 有預設但可擴充
- **預設內容**: `data/knowledge_graph.json` (現有，7.3KB)
- **可擴充**: 從文檔或外部來源匯入更多節點
- **完成後可用性**: ✅ 可立即查詢，可逐步擴充

---

## ❌ **真正虛擬/未實作的功能**

這些是**框架存在但無實際邏輯**的功能：

### 1. 網頁搜尋 (web_search)
- **後端實作**: ❌ 僅返回模擬結果
```python
return {
    "tool": "web_search",
    "results": [
        {"title": f"搜尋結果：{query}", 
         "snippet": f"Webcom AI Hermes 聯網搜尋引擎已檢索「{query}」"}
    ]
}
```
- **所需配置**: Serper.dev API Key
- **開發工作**: 中等（整合外部 API）

### 2. 網頁抓取 (web_extractor/web_extract)
- **後端實作**: ❌ 完全無對應處理函數
- **前端狀態**: Tier 2 工具清單中提及，但無執行邏輯
- **開發工作**: 高（需實現網頁解析邏輯）

### 3. ComfyUI 生成功能 (comfyui_*)
- **後端實作**: ❌ 僅檢查端口 5000
- **所需條件**: 獨立啟動 ComfyUI 服務
- **開發工作**: 中（可簡化為簡單代理）

### 4. TTS 語音合成 (tts_server_*)
- **後端實作**: ❌ 僅檢查端口 8200
- **所需條件**: 獨立啟動 TTS 服務
- **開發工作**: 中

### 5. Music 音樂生成 (music_generate/*)
- **後端實作**: ❌ 僅檢查端口 9150
- **所需條件**: 獨立啟動 Music 服務
- **開發工作**: 中

### 6. Shell 命令執行 (terminal/process)
- **後端實作**: ❌ 轉發模板，無實際 shell 權限
- **安全性考量**: 需設計安全沙盒
- **開發工作**: 高（涉及系統安全）

### 7. 檔案讀寫 (read_file/write_file/patch/search_files)
- **後端實作**: ❌ 轉發模板
- **所需權限**: OS 級別檔案權限
- **開發工作**: 中

---

## 🎯 **分類總覽表**

| 類別 | 功能數量 | 代表功能 | 說明 |
|------|---------|----------|------|
| ✅ 實際可運作 | 4-5 | get_weather, todo, memory | 無需額外步驟 |
| ⚠️ 需手動初始化 | 2-3 | dictionary_rag.db, ONNX models | 執行一次即可 |
| ❌ 虛擬/待開發 | 7-8 | web_search, web_extractor, comfyui | 需程式開發 |
| 🔄 需外部服務 | 5 | ComfyUI, TTS, Music, LM Studio | 需獨立安裝服務 |

---

## 📋 **優先級建議**

### 🔥 **第一順位：立即可用的配置**
1. **建立字典資料庫**
   ```bash
   cd /home/auser/Project/Webcom_AI
   source .venv/bin/activate
   python tools/convert_dictionary_rag.py
   ```
   - 原因：一次執行，永久可用
   - 效果：獲得 16.4 萬詞條查詢能力

2. **訪問 Web UI 並選擇模型**
   ```
   http://127.0.0.1:8001/web/index.html
   → 選擇 WebGPU 模式
   → 選擇任意模型（如 Qwen2.5-0.5B）
   → 等待下載完成
   ```
   - 原因：首次下載後永久緩存
   - 效果：獲得離線 LLM 推理能力

### 🛠️ **第二順位：中期開發項目**
1. **整合真實網頁搜尋**
   - 選項：Serper.dev（推薦）、Bing Search API、Google Custom Search
   - 難度：低（只需修改 daemon/server.py 中的 web_search 處理）

2. **實作網頁抓取 (web_extractor)**
   - 技術：BeautifulSoup、requests-html、Playwright
   - 難度：中（需處理跨域、CORS 問題）

3. **簡化外部服務整合**
   - 選項：提供輕量替代品（如簡單的圖片生成 API）
   - 難度：中

### 🏗️ **第三順位：長期架構優化**
1. **Shell 執行沙盒**
   - 挑戰：安全隔離、權限控制
   - 難度：高

2. **完整的檔案操作系統**
   - 挑戰：安全、性能、易用性平衡
   - 難度：中

---

## 💡 **結論**

### 🎯 **本專案的真實狀態**
- **不是純原型**：有部分功能真正可運作（天氣查詢、基本對話管理）
- **不是完全虛擬**：有大量需要先運行/下載才能使用的功能
- **不是生產就緒**：關鍵功能（網頁搜尋、抓取、生成式服務）尚未完備

### 🔍 **用戶最關心的答案**

#### Q1: "哪些功能是假的？"
- ❌ **網頁搜尋** (只有模擬文字)
- ❌ **網頁抓取** (後端無處理)
- ❌ **ComfyUI/TTS/Music** (僅端口檢查)

#### Q2: "哪些是我第一次用就會有的？"
- ✅ **天氣查詢** (Open-Meteo API)
- ✅ **Basic 對話功能** (todo, memory)
- ✅ **GraphRAG 預設圖譜** (可查 5-10 個核心概念)

#### Q3: "哪些是我需要手動跑的？"
- ⚠️ **字典資料庫** (`python tools/convert_dictionary_rag.py`)
- ⚠️ **ONNX 模型** (瀏覽器首次選擇時下載)

#### Q4: "哪些是需要我另外安裝服務的？"
- 🔄 **LM Studio** (port 1234)
- 🔄 **ComfyUI** (port 5000)
- 🔄 **TTS Server** (port 8200)
- 🔄 **Music Server** (port 9150)

---

## 🚀 **快速上手流程**

### Step 1: 初始化 (30 分鐘)
```bash
cd /home/auser/Project/Webcom_AI
source .venv/bin/activate
python tools/convert_dictionary_rag.py  # 建立字典資料庫
echo "done!"
```

### Step 2: 啟動服務 (10 秒)
```bash
./launch.sh  # 或直接 python daemon/server.py
```

### Step 3: 瀏覽器設定 (5 分鐘)
1. 打開 http://127.0.0.1:8001/web/index.html
2. 選擇 WebGPU 模式
3. 選擇一個模型
4. 等待下載完成

### Step 4: 測試功能 (驗證)
```bash
# 測試天氣
curl http://127.0.0.1:8001/api/weather?loc=Taipei

# 測試圖譜查詢
curl -X POST http://127.0.0.1:8001/api/graphrag/query \
  -H "Content-Type: application/json" \
  -d '{"query":"Webcom AI","mode":"hybrid"}'
```

---

**最後更新**: 2026-10-06  
**版本**: v2.2.0-Hermes-GraphRAG-Jev-WebGPU-MultiTier  
**可用度**: 25-35% (取決於是否完成初始化和模型下載)  
**虛擬功能占比**: ~30% (主要是網頁相關和外部服務整合)  
**實際可用功能**: ~35% (天氣、基本對話、圖譜)  
**需初始化功能**: ~20% (字典 DB、ONNX 模型)  
**外部服務依賴**: ~15% (ComfyUI、TTS、Music 等)

**總結**: 這是一個**部分實作的先進框架**，而非純粹的空殼。核心架構已經完備，只需少量初始化和中度開發即可達到可用的水準。