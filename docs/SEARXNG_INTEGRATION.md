# SearXNG 整合指南

## 📌 **SearXNG 簡介**

**SearXNG** 是一個隱私優先的開源搜尋引擎元聚合器，能夠：
- 聚合多個搜尋引擎結果（Google、Bing、DuckDuckGo 等）
- 保護用戶隱私，不追蹤搜尋紀錄
- 提供 JSON API 介面
- 可自託管，完全控制

GitHub: https://github.com/searxng/searxng  
官方文件: https://docs.searxng.org

## 🔧 **SearXNG 部署方式**

### 方式一：Docker（最簡單）
```bash
# 快速啟動
docker run -d --name searxng -p 8888:8080 searxng/searxng

# 或使用 Docker Compose
git clone https://github.com/searxng/searxng.git
cd searxng
docker-compose up -d
```

### 方式二：手動安裝
```bash
# 安裝依賴
sudo apt-get install git build-essential libxslt-dev zlib1g-dev libffi-dev libssl-dev python3-dev python3-pip python3-venv

# 下載代碼
git clone https://github.com/searxng/searxng.git
cd searxng

# 設定虛擬環境
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# 設定
sed -i -e "s/ultrasecretkey/$(openssl rand -hex 32)/g" settings.yml

# 啟動
python3 searx/webapp.py
```

## ⚙️ **Webcom AI 整合設定**

### 1. 基本配置
修改 `config/search_config.json`：
```json
{
  "search_engines": {
    "searxng": {
      "name": "SearXNG",
      "description": "自託管隱私搜尋元聚合器",
      "api_url": "http://localhost:8888",  # 修改為您的 SearXNG URL
      "requires_api_key": false,
      "default": false
    }
  }
}
```

### 2. 設定 Webcom AI
修改 `daemon/server.py` 中的 `SEARCH_CONFIG`：
```python
SEARCH_CONFIG = {
    "default_engine": "searxng",  # 將預設改為 SearXNG
    "searxng_url": "http://localhost:8888",  # 您的 SearXNG 實例
    "timeout":法与,
    "max_results": 10
}
```

### 3. 啟用 SearXNG 整合
```python
# 搜尋時指定引擎
{
    "tool": "web_search",
    "arguments": {
        "query": "搜尋內容",
        "engine": "searxng"  # 或 "duckduckgo"
    }
}
```

## 🔍 **SearXNG API 端點**

### 搜尋端點
```
GET /search?q={query}&format=json
```

參數：
- `q`: 搜尋查詢（URL 編碼）
- `format`: json（返回 JSON 格式）
- `categories`: general, images, news, videos 等
- `language`: zh-TW, en, ja 等
- `time_range`: day, week, month, year

### 健康檢查
```
GET /health
```

### 範例請求
```bash
# 搜尋範例
curl "http://localhost:8888/search?q=webcom+ai&format=json&categories=general&language=zh-TW"

# 健康檢查
curl "http://localhost:8888/health"
```

## 📊 **Webcom AI 中的 SearXNG 功能**

### 1. 搜尋引擎選擇
```javascript
// 在 Web UI 中選擇搜尋引擎
await execute_web_search({
    query: "人工智慧發展",
    engine: "searxng",  // 或 "duckduckgo"
    max_results: 10
});
```

### 2. 搜尋引擎狀態檢查
```bash
# API 檢查
curl http://127.0.0.1:8001/api/search/engines

# 返回範例
{
  "status": "success",
  "default_engine": "searxng",
  "engines": [
    {
      "id": "searxng",
      "name": "SearXNG",
      "available": true,
      "description": "自託管隱私搜尋元聚合器"
    },
    {
      "id": "duckduckgo",
      "name": "DuckDuckGo",
      "available": true,
      "description": "隱私優先搜尋引擎"
    }
  ]
}
```

### 3. 搜尋結果格式
SearXNG 返回的結果包含：
```json
{
  "title": "結果標題",
  "snippet": "內容摘要",
  "url": "來源網址",
  "source": "搜尋引擎名稱",
  "score": 0.85
}
```

## 🚀 **效能優化設定**

### 1. SearXNG 設定檔 (`/etc/searxng/settings.yml`)
```yaml
server:
  port: 8888
  bind_address: "127.0.0.1"  # 限制本地存取
  secret_key: "your-secret-key"
  
search:
  formats: ["json"]  # 僅啟用 JSON 格式
  safe_search: 0  # 關閉安全搜尋
  
engines:
  - name: duckduckgo
    engine: duckduckgo
    shortcut: ddg
    categories: [general]
  
  - name: google
    engine: google
    shortcut: goog
    categories: [general]
    tokens: [YOUR_API_KEY]  # 需要申請 API Key
```

### 2. 快取設定
```yaml
cache:
  type: "redis"  # 使用 Redis 快取
  url: "redis://localhost:6379/0"
  
  # 或使用記憶體快取
  type: "simple"
  expire: 300  # 快取 5 分鐘
```

### 3. 速率限制
```yaml
limiter:
  enabled: true
  strategy: "fixed-window"
  limits:
    - "10 per minute"
    - "100 per hour"
```

## 🔒 **安全性考量**

### 1. 存取控制
```yaml
# 限制僅本地存取
server:
  bind_address: "127.0.0.1"
  
# 啟用 API Key 驗證
api:
  enabled: true
  tokens:
    - "your-api-token"
```

### 2. 隱私設定
```yaml
# 不記錄搜尋紀錄
general:
  instance_name: "Webcom AI SearXNG"
  privacypolicy_url: false
  
# 清除搜尋紀錄
result_proxy:
  proxify_results: true  # 透過代理存取結果
```

## 📈 **監控與日誌**

### 1. 日誌設定
```yaml
logging:
  level: "INFO"
  format: "json"
  output: "/var/log/searxng/searxng.log"
  
  # 監控指標
  metrics:
    enabled: true
    port: 9090
```

### 2. 健康檢查
```bash
# 定期檢查
*/5 * * * * curl -f http://localhost:8888/health || systemctl restart searxng

# 監控搜尋成功率
curl http://localhost:8888/stats
```

## 🔧 **故障排除**

### 常見問題

#### 1. SearXNG 無法啟動
```bash
# 檢查日誌
docker logs searxng
journalctl -u searxng

# 檢查端口
netstat -tlnp | grep 8888
```

#### 2. API 無回應
```bash
# 測試連線
curl -v http://localhost:8888/health

# 檢查防火牆
sudo ufw status
sudo ufw allow 8888/tcp
```

#### 3. 搜尋結果空白
```bash
# 檢查搜尋引擎設定
curl http://localhost:8888/engines

# 測試個別引擎
curl "http://localhost:8888/search?q=test&engines=duckduckgo&format=json"
```

#### 4. 效能問題
```bash
# 監控資源使用
docker stats searxng

# 調整 Docker 資源限制
docker update --memory=512m --cpus="0.5" searxng
```

## 🎯 **整合最佳實踐**

### 1. 逐步部署
```yaml
# 階段一：基本功能
engines:
  - duckduckgo
  - bing
  
# 階段二：擴展功能  
engines:
  - google (需要 API Key)
  - wikipedia
  - youtube
```

### 2. 備用方案
```python
# 在 Webcom AI 中實作備用邏輯
async def web_search(query, engine="searxng"):
    try:
        if engine == "searxng":
            return await searxng_search(query)
    except Exception:
        # 自動切換到 DuckDuckGo
        return await duckduckgo_search(query)
```

### 3. 效能監控
```bash
# 監控搜尋延遲
watch -n 60 'curl -o /dev/null -s -w "%{time_total}s\\n" http://localhost:8888/search?q=test'

# 監控成功率
cat /var/log/searxng/access.log | grep "200" | wc -l
```

## 📋 **驗證檢查清單**

### 安裝後檢查
- [ ] SearXNG 服務運行中 `systemctl status searxng`
- [ ] 端口 8888 可存取 `curl http://localhost:8888/health`
- [ ] API 端點正常 `curl "http://localhost:8888/search?q=test&format=json"`
- [ ] Webcom AI 可連線 `curl http://127.0.0.1:8001/api/search/test/searxng`

### 功能檢查
- [ ] 基本搜尋功能正常
- [ ] 搜尋結果包含標題、摘要、URL
- [ ] 多語言搜尋支援
- [ ] 搜尋類別過濾
- [ ] 搜尋引擎切換功能

### 安全性檢查
- [ ] 僅本地存取（如設定）
- [ ] 搜尋紀錄不保存
- [ ] HTTPS 支援（如有需要）
- [ ] 速率限制生效

## 💡 **進階功能**

### 1. 自訂搜尋引擎
```yaml
# 添加自訂搜尋引擎
- name: my_custom_engine
  engine: my_engine
  categories: [general]
  shortcut: my
  base_url: "https://api.example.com/search"
  query_str: "q={query}&api_key={key}"
```

### 2. 搜尋結果後處理
```python
# 在 Webcom AI 中處理結果
def process_searxng_results(results):
    processed = []
    for result in results:
        # 過濾低品質結果
        if result.get("score", 0) < 0.5:
            continue
        
        # 增強結果資訊
        result["processed"] = True
        result["timestamp"] = datetime.now().isoformat()
        processed.append(result)
    
    return processed
```

### 3. 搜尋偏好設定
```json
{
  "search_preferences": {
    "default_engine": "searxng",
    "preferred_language": "zh-TW",
    "safe_search": true,
    "max_results": 15,
    "time_range": "week"
  }
}
```

## 🔗 **相關資源**

### 官方資源
- SearXNG GitHub: https://github.com/searxng/searxng
- 官方文件: https://docs.searxng.org
- 設定參考: https://github.com/searxng/searxng/blob/master/searx/settings.yml

### 部署指南
- Docker 部署: https://docs.searxng.org/admin/installation/docker.html
- 手動安裝: https://docs.searxng.org/admin/installation/manual.html
- 反向代理: https://docs.searxng.org/admin/installation/https.html

### 監控工具
- Prometheus 整合: https://docs.searxng.org/admin/monitoring.html
- 日誌管理: https://docs.searxng.org/admin/logging.html
- 效能優化: https://docs.searxng.org/admin/performance.html

---

**最後更新**: 2026-10-06  
**適用版本**: Webcom AI v2.2.0+  
**SearXNG 版本**: 1.0.0+  
**配置難度**: 中等  
**維護需求**: 低（Docker）至中（手動安裝）