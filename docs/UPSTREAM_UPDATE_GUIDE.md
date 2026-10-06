# 原生 Hermes Agent 更新同步與適配操作指南 (Upstream Update Guide)

當 Upstream 原生專案（如 [NousResearch/hermes-agent](https://github.com/NousResearch/hermes-agent) 或 [ystartgo/portable-hermes-agent](https://github.com/ystartgo/portable-hermes-agent)）發布新版本時，本專案提供標準化、半自動的追蹤與遷移流程，確保客製化的 Webcom 前端與 WASM 適配層不受破壞。

---

## 1. 原生更新帶來的衝擊分析

Upstream 的版本迭代通常影響以下四個部分：

```
Upstream 更新來源                    影響範圍與處置方式
┌─────────────────────────────────┐   ┌────────────────────────────────────────────────────────┐
│ 1. toolsets.py                  │ ─►│ 影響可用工具清單與分類 (Toolsets)。                      │
│    (新增/刪除工具、調整分類)     │   │ 處置：透過 sync 腳本比對，自動補全 Manifest。           │
├─────────────────────────────────┤   ├────────────────────────────────────────────────────────┤
│ 2. tools/*.py                   │ ─►│ 影響工具參數簽章 (Schema) 與實作邏輯。                  │
│    (修改參數、重構實作)         │   │ 處置：比對參數差異，更新 Adapter 轉換層。               │
├─────────────────────────────────┤   ├────────────────────────────────────────────────────────┤
│ 3. agent/ 核心邏輯              │ ─►│ 影響 Prompt 模板、思考機制與 Context 壓縮。           │
│    (對話循環、Prompt 演進)       │   │ 處置：參考 Upstream Prompt 差異，更新 Webcom 注入模板。│
├─────────────────────────────────┤   ├────────────────────────────────────────────────────────┤
│ 4. requirements.txt / 套件更新  │ ─►│ 影響本機 Daemon 依賴環境。                             │
│                                 │   │ 處置：同步更新 daemon/requirements.txt。                │
└─────────────────────────────────┘   └────────────────────────────────────────────────────────┘
```

---

## 2. 三步自動化同步流程 (3-Step Sync Workflow)

本專案在 `sync/` 目錄下提供了全自動化同步分析工具 `sync_upstream_hermes.py`。

### 步驟 ①：取得 Upstream 最新原始碼
你可以透過以下兩種方式之一提供 Upstream 來源：
* **方式 A：使用本機 zip 壓縮包**（例如 `C:\Apps\portable-hermes-agent-main.zip`）
* **方式 B：使用本機 Git 或已解壓目錄**（例如 `C:\Apps\portable-hermes-agent-main\`）

### 步驟 ②：執行差異分析與同步腳本
在專案根目錄執行：

```powershell
# 使用 Windows 快速批次檔：
.\SYNC_UPSTREAM.bat

# 或直接使用 Python 執行：
python sync/sync_upstream_hermes.py --upstream "C:\Apps\portable-hermes-agent-main.zip"
```

腳本會自動完成以下工作：
1. **解析 Upstream 工具**：自動掃描 Upstream 的 `toolsets.py` 與 `tools/*.py`。
2. **差異對比 (Diffing)**：核對 `hermes_bridge/schema/hermes_tools_manifest.json`。
3. **報告產出**：
   - 🟢 **新增工具 (New Tools)**：Upstream 新增但本地尚未註冊的工具。
   - 🟡 **參數變更 (Modified Tools)**：參數名稱或型別有變更的工具。
   - 🔴 **廢棄工具 (Deprecated/Removed Tools)**：Upstream 已移除的工具。
4. **自動產生 Adapter 骨架**：針對新增工具，自動在 `hermes_bridge/adapters/` 建立對應的適配模板。
5. **產生同步日誌**：輸出 `sync/sync_report.md`。

### 步驟 ③：審查與分類適配 (Review & Adapt)
檢查 `sync/sync_report.md`，並針對有變更的工具做以下分級決定：

1. **若新工具屬於「純邏輯／文字／資料運算」**：
   - 分配至 **Tier 1 (WASM)**。
   - 在生成的 Adapter 中，使用 Pyodide 或 JS 實作。
2. **若新工具屬於「外部 REST API」**：
   - 分配至 **Tier 2 (HTTP Fetch)**。
   - 配置 CORS 與 Endpoint。
3. **若新工具屬於「本機 OS / 硬體操作」**：
   - 分配至 **Tier 3 (Host Daemon)**。
   - 在 `daemon/hermes_host_service.py` 加入該工具的 Python 委派處理器。

---

## 3. Adapter 適配器撰寫範例

所有工具都透過「適配器模式（Adapter Pattern）」隔離，防止 Upstream 參數修改直接衝擊 Webcom 介面。

### 範例：新增一個 `calculate_hash` 工具適配器
檔案位置：`hermes_bridge/adapters/calculate_hash.js`

```javascript
/**
 * Adapter for 'calculate_hash' tool
 * Tier: 1 (Pure WASM / WebCrypto)
 */
export async function executeCalculateHash(args, context) {
    const { algorithm = 'SHA-256', text } = args;
    
    // Tier 1: 直接利用瀏覽器原生 WebCrypto，免調用 Daemon
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest(algorithm.toUpperCase(), data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return {
        status: 'success',
        algorithm: algorithm,
        hash: hashHex
    };
}
```

---

## 4. 驗證與測試 (Verification)

同步完成後，執行驗證腳本確認所有工具路由與 Schema 均符合規範：

```powershell
# 執行自動化測試
.\TEST.bat

# 或
python -m unittest tests/test_tool_routing.py
```

確認所有綠燈通過後，即可提交版本或重啟 Webcom AI 主控台體驗新功能！
