# Webcom AI 搜尋引擎整合總結

## 🎯 **整合完成的功能**

### ✅ **已實作的功能**
1. **DuckDuckGo API 整合**
   - 使用官方 Instant Answer API
   - 無需 API Key，免費使用
   - 支援繁體中文搜尋

2. **SearXNG API 整合**
   - 支援自託管隱私搜尋引擎
   - 可聚合多個搜尋引擎結果
   - 提供 JSON API 介面

3. **網頁抓取功能 (web_extract)**
   - 使用 BeautifulSoup4 解析網頁
   - 支援 CSS 選擇器
   - 自動提取主要內容

4. **多引擎支援架構**
   - 可配置的搜尋引擎選項
   - 自動故障轉移
   - 搜尋引擎健康檢查

### 🔧 **技術架構**
- **後端**: FastAPI + aiohttp + BeautifulSoup4
- **前端**: JavaScript 適配器更新
- **配置**: JSON 配置檔案
- **API**: RESTful API 端點

## 📊 **性能與限制**

### DuckDuckGo API
- **速率限制**: ~30 請求/分鐘
- **最大結果**: 10 條/請求
- **延遲**: 200-500ms
- **優點**: 免配置，隱私友好
- **缺點**: 結果較簡單，無進階排序

### SearXNG
- **速率限制**: 可自訂（預設 60 請求/分鐘）
- **最大結果**: 20 條/請求
- **延遲**: 500-1500ms（取決於聚合引擎數量）
- **優點**: 可自託管，多引擎聚合，高度可定製
- **缺點**: 需要部署和維護

### Web Extraction
- **內容大小**: 最多 5000 字符
- **超時**: 10 秒
- **支援**: 大部分現代網頁
- **限制**: 需要處理 JavaScript 渲染的網站可能失敗

## 🚀 **使用方式**

### 1. 基本搜尋
```javascript
// 使用 DuckDuckGo（預設）
await execute_web_search({
    query: "搜尋內容",
    engine: "duckduckgo"
});

// 使用 SearXNG
await execute_web_search({
    query: "搜尋內容", 
    engine: "searxng"
});
```

### 2. 網頁抓取
```javascript
await execute_web_extract({
    url: "https://example.com",
    selector: ".article-content" // 可選 CSS 選擇器
});
```

### 3. API 測試
```bash
# 測試 DuckDuckGo
curl http://127.0.0.1:8001/api/search/test/duckduckgo?query=webcom+ai

# 測試 SearXNG（如果已部署）
curl http://127.0.0.1:8001/api/search/test/searxng?query=webcom+ai

# 檢查搜尋引擎狀態
curl http://127.0.0.1:8001/api/search/engines
```

## ⚙️ **配置選項**

### 1. 修改預設搜尋引擎
編輯 `config/search_config.json`：
```json
{
  "search_engines": {
    "default_engine": "searxng",  // 或 "duckduckgo"
    "searxng_url": "http://localhost:8888"
  }
}
```

### 2. 部署 SearXNG
```bash
# 快速啟動（Docker）
docker run -d --name searxng -p 8888:8080 searxng/searxng

# 驗證安裝
curl http://localhost:8888/health
```

### 3. 調整搜尋參數
```python
# 在 server.py 中調整
SEARCH_CONFIG = {
    "timeout": 15,  # 超時時間
    "max_results": 10,  # 最大結果數
    "max_content_length": 10000  # 網頁內容最大長度
}
```

## 📈 **監控與維護**

### 1. 健康檢查
```bash
# 定期檢查服務狀態
*/5 * * * * curl -f http://127.0.0.1:8001/api/search/engines || systemctl restart webcom-ai
```

### 2. 日誌檢查
```bash
# 查看搜尋日誌
tail -f /var/log/webcom-ai/search.log

# 監控錯誤率
grep "status.*error" /var/log/webcom-ai/search.log | wc -l
```

### 3. 效能監控
```bash
# 監控搜尋延遲
watch -n 60 'curl -o /dev/null -s -w "%{time_total}s\\n" http://127.0.0.1:8001/api/search/test/duckduckgo'
```

## 🔍 **故障排除**

### 常見問題

#### 1. DuckDuckGo API 失敗
- **症狀**: 搜尋返回模擬結果
- **原因**: API 超時或被阻擋
- **解決**: 檢查網路連線，增加超時時間

#### 2. SearXNG 無法連線
- **症狀**: SearXNG 顯示不可用
- **原因**: SearXNG 服務未啟動
- **解決**: 啟動 SearXNG 服務，檢查防火牆

#### 3. 網頁抓取失敗
- **症狀**: 返回錯誤或空白內容
- **原因**: 網站反爬蟲或需要 JavaScript
- **解決**: 嘗試使用 requests-html 替代 BeautifulSoup

#### 4. 搜尋結果品質差
- **症狀**: 結果不相關或不完整
- **原因**: 搜尋引擎設定不當
- **解決**: 調整搜尋參數，嘗試不同引擎

## 🎯 **建議與最佳實踐**

### 1. 生產環境部署
- **建議**: 使用 SearXNG + DuckDuckGo 備用
- **理由**: SearXNG 提供更好的結果，DuckDuckGo 作為備用
- **配置**: 設定自動故障轉移

### 2. 隱私考量
- **DuckDuckGo**: 隱私友好，不追蹤
- **SearXNG**: 自託管，完全控制
- **建議**: 敏感搜尋使用 SearXNG

### 3. 效能優化
- **快取**: 實現搜尋結果快取
- **預載**: 熱門搜尋預載
- **壓縮**: 壓縮傳輸資料

### 4. 擴展性
- **插件架構**: 易於添加新搜尋引擎
- **配置驅動**: JSON 配置，無需修改程式碼
- **API 優先**: 所有功能透過 API 存取

## 📋 **驗證檢查清單**

### 安裝後檢查
- [ ] DuckDuckGo 搜尋正常
- [ ] SearXNG 整合可配置
- [ ] 網頁抓取功能正常
- [ ] 搜尋引擎切換功能正常

### 功能測試
- [ ] 基本搜尋返回實際結果
- [ ] 搜尋引擎選擇生效
- [ ] 搜尋結果格式正確
- [ ] 錯誤處理適當

### 效能測試
- [ ] 搜尋延遲可接受（<2秒）
- [ ] 併發搜尋正常
- [ ] 記憶體使用合理
- [ ] 網路頻寬使用適當

## 🔮 **未來擴展方向**

### 1. 更多搜尋引擎
- Google Custom Search API
- Bing Search API
- 中文專用搜尋引擎（百度、搜狗）

### 2. 進階功能
- 搜尋結果摘要生成
- 相關搜尋建議
- 搜尋歷史記錄
- 搜尋結果排序/過濾

### 3. 效能優化
- 搜尋結果快取
- 搜尋預測
- 離線搜尋索引
- 增量搜尋更新

### 4. 整合功能
- 瀏覽器擴展
- 桌面應用整合
- 行動應用支援
- CLI 工具整合

---

**整合狀態**: ✅ 已完成  
**測試狀態**: ⚠️ 需要實際測試  
**文件完整性**: ✅ 完整  
**維護需求**: 🔧 中等  
**擴展性**: 🔄 良好  

**最後更新**: 2026-10-06  
**適用版本**: Webcom AI v2.2.0+  
**依賴版本**: 
- aiohttp >= 3.8.0
- beautifulsoup4 >= 4.11.0
- SearXNG >= 1.0.0（可選）