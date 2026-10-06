# Webcom AI Linux 運行指南

## 專案概述
Webcom AI 是一個將 Webcom (雙引擎 Web/WASM AI 控制台) 與 NousResearch Hermes Agent (100+ 款工具的自主 Agent) 深度整合的下一代邊緣 AI 系統。本專案採用 WASM-First 架構，具備 Jev 極速決策引擎、GraphRAG 知識圖譜、GPU 防當機守護等功能。

## 快速開始

### 1. 環境準備
```bash
# 確保已安裝 Python 3.10+
python3 --version

# 建立虛擬環境（如果尚未建立）
python3 -m venv .venv
```

### 2. 安裝依賴套件
```bash
# 啟用虛擬環境
source .venv/bin/activate

# 安裝依賴套件
pip install -r daemon/requirements.txt
```

### 3. 啟動服務
```bash
# 方法一：使用啟動腳本
chmod +x launch.sh
./launch.sh

# 方法二：直接啟動
.venv/bin/python daemon/server.py
```

## 服務端點

服務啟動後，可通過以下 URL 訪問：

1. **Webcom 控制台**: http://127.0.0.1:8001/web/index.html
2. **API 文檔**: http://127.0.0.1:8001/docs
3. **API 端點**: http://127.0.0.1:8001/api/jev/models
4. **測試頁面**: http://127.0.0.1:8001/web/test_web.html (如果已建立)

## 功能測試

### 檢查服務狀態
```bash
# 檢查 API 是否正常響應
curl http://127.0.0.1:8001/api/jev/models

# 檢查網頁是否可訪問
curl -I http://127.0.0.1:8001/web/index.html
```

### 測試功能
1. **Jev 模型選擇** - 提供多種輕量級決策模型
2. **GraphRAG 知識圖譜** - 實體關聯與多跳推論
3. **三層執行模型** - WASM / HTTP / Host Daemon 分層
4. **GPU 資源保護** - 90% 使用率上限保護

## 系統架構

```
Webcom_AI/
├── web/                 # 前端 Web UI
│   ├── index.html      # 主介面
│   ├── app.js         # 主要邏輯
│   └── hermes_tools.js # Hermes 工具橋接
├── daemon/             # FastAPI 後端
│   ├── server.py       # 主服務
│   └── requirements.txt # 依賴套件
├── hermes_bridge/      # Hermes 工具橋接層
├── data/               # 資料儲存
├── docs/              # 文件
└── tests/             # 測試案例
```

## 故障排除

### 常見問題
1. **端口衝突**
   ```bash
   # 釋放端口 8001
   lsof -ti:8001 | xargs kill -9
   ```

2. **Python 依賴問題**
   ```bash
   # 重新建立虛擬環境
   rm -rf .venv
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r daemon/requirements.txt
   ```

3. **無法訪問網頁**
   ```bash
   # 檢查服務是否運行
   curl -I http://127.0.0.1:8001/
   ```

### 日誌查看
服務運行時會輸出日誌到終端，包含：
- 服務啟動狀態
- API 請求記錄
- 錯誤訊息

## 開發與擴展

### 添加新工具
1. 在 `hermes_bridge/schema/hermes_tools_manifest.json` 中註冊新工具
2. 在 `hermes_bridge/adapters/` 中建立適配器
3. 在 `daemon/server.py` 中實作對應端點

### 更新上游
使用同步腳本更新 Hermes Agent 上游：
```bash
# Windows 使用 SYNC_UPSTREAM.bat
# Linux 可運行 sync/sync_upstream_hermes.py
python sync/sync_upstream_hermes.py
```

## 授權與版權
- **作者**: startgo (`startgo@yia.app`)
- **版本**: v2.2.0-Hermes-GraphRAG-Jev-WebGPU-MultiTier
- **授權**: GNU General Public License v3.0 (GPL-3.0)

## 支援與回饋
如需技術支援或問題回報，請參考原始專案文件或聯絡作者。

---

**服務運行中**: http://127.0.0.1:8001  
**最後更新**: 2026-10-06  
**環境**: Linux / Python 3.14.4