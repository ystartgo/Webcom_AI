#!/usr/bin/env python3
"""
Serper.dev 搜尋引擎實作
使用商業 Google 搜尋 API
需要 API 金鑰
"""

import aiohttp
import json
import logging
from typing import List, Dict, Any
from .base import SearchEngine, SearchEngineError

logger = logging.getLogger(__name__)


class SerperEngine(SearchEngine):
    """Serper.dev Google 搜尋引擎"""

    def __init__(self, name: str, config: Dict[str, Any], api_key: str, rate_limiter=None):
        super().__init__(name, config, rate_limiter)
        self.api_url = config.get("api_url", "https://google.serper.dev/search")
        self.api_key = api_key

        if not self.api_key:
            raise ValueError("Serper API key is required")

    async def _perform_search(self, query: str, **kwargs) -> List[Dict[str, Any]]:
        """
        使用 Serper.dev API 進行搜尋

        Args:
            query: 搜尋查詢
            **kwargs: 額外參數

        Returns:
            搜尋結果列表
        """
        async with aiohttp.ClientSession() as session:
            # 構建請求負載
            payload = {
                "q": query,
                "gl": kwargs.get("gl", "tw"),  # 國家代碼
                "hl": kwargs.get("hl", "zh-tw"),  # 語言
                "num": kwargs.get("num", self.max_results),
                "autocorrect": kwargs.get("autocorrect", True),
            }

            # 添加搜尋類型
            if search_type := kwargs.get("type"):
                payload["type"] = search_type  # search, news, images, videos

            headers = {
                "X-API-KEY": self.api_key,
                "Content-Type": "application/json",
                "User-Agent": "Webcom-AI/1.0"
            }

            try:
                async with session.post(
                    self.api_url,
                    headers=headers,
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=self.timeout)
                ) as response:
                    if response.status != 200:
                        error_text = await response.text()
                        logger.error(f"Serper API error: {response.status} - {error_text}")

                        if response.status == 401:
                            raise SearchEngineError("Invalid API key")
                        elif response.status == 429:
                            raise SearchEngineError("Rate limit exceeded")
                        else:
                            raise SearchEngineError(
                                f"API returned status {response.status}: {error_text[:200]}"
                            )

                    data = await response.json()
                    return self._parse_response(data, query)

            except aiohttp.ClientTimeout:
                raise SearchEngineError("Request timeout")
            except aiohttp.ClientError as e:
                raise SearchEngineError(f"Network error: {str(e)}")
            except json.JSONDecodeError as e:
                raise SearchEngineError(f"Invalid JSON response: {str(e)}")

    def _parse_response(self, data: Dict[str, Any], query: str) -> List[Dict[str, Any]]:
        """解析 Serper API 回應"""
        results = []

        # 1. 處理有機搜尋結果
        for item in data.get("organic", []):
            title = item.get("title", "")
            snippet = item.get("snippet", "")
            url = item.get("link", "")

            if title and url:  # 確保有標題和 URL
                results.append({
                    "title": title,
                    "snippet": snippet,
                    "url": url,
                    "source": "organic"
                })

        # 2. 處理知識圖譜
        if knowledge_graph := data.get("knowledgeGraph"):
            title = knowledge_graph.get("title", "")
            description = knowledge_graph.get("description", "")

            if title or description:
                results.insert(0, {  # 插入到最前面
                    "title": title or f"關於: {query}",
                    "snippet": description or f"{query} 的相關資訊",
                    "url": knowledge_graph.get("website", f"https://google.com/search?q={query}"),
                    "source": "knowledge_graph"
                })

        # 3. 處理相關問題
        for question in data.get("peopleAlsoAsk", []):
            question_text = question.get("question", "")
            answer = question.get("answer", "")

            if question_text:
                results.append({
                    "title": f"問題: {question_text}",
                    "snippet": answer[:200] if answer else "查看相關資訊",
                    "url": question.get("link", f"https://google.com/search?q={question_text}"),
                    "source": "people_also_ask"
                })

        # 4. 處理相關搜尋
        for related in data.get("relatedSearches", []):
            query_text = related.get("query", "")
            if query_text:
                results.append({
                    "title": f"相關搜尋: {query_text}",
                    "snippet": f"與「{query}」相關的搜尋",
                    "url": f"https://google.com/search?q={query_text}",
                    "source": "related_search"
                })

        # 5. 如果沒有有機結果，返回一個基本結果
        if not results:
            results.append({
                "title": f"搜尋結果: {query}",
                "snippet": "Serper API 返回了空結果。請檢查查詢或 API 配置。",
                "url": f"https://google.com/search?q={query}",
                "source": "fallback"
            })

        return results[:self.max_results]

    async def test_connection(self) -> bool:
        """測試 Serper API 連線"""
        try:
            async with aiohttp.ClientSession() as session:
                headers = {
                    "X-API-KEY": self.api_key,
                    "Content-Type": "application/json"
                }

                payload = {
                    "q": "test",
                    "gl": "tw",
                    "num": 1
                }

                async with session.post(
                    self.api_url,
                    headers=headers,
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=5)
                ) as response:
                    if response.status == 200:
                        return True
                    elif response.status == 401:
                        logger.error("Serper API key invalid")
                        return False
                    else:
                        logger.warning(f"Serper API test returned status {response.status}")
                        return False

        except Exception as e:
            logger.warning(f"Serper connection test failed: {e}")
            return False

    def get_stats(self) -> Dict[str, Any]:
        """獲取引擎統計資訊"""
        stats = super().get_stats()
        stats.update({
            "api_url": self.api_url,
            "description": "Serper.dev Google Search API",
            "requires_api_key": True,
            "commercial_service": True,
            "api_key_hash": self._hash_api_key() if self.api_key else None
        })
        return stats

    def _hash_api_key(self) -> str:
        """計算 API 金鑰的雜湊值（用於日誌）"""
        import hashlib
        if self.api_key:
            return hashlib.sha256(self.api_key.encode()).hexdigest()[:8]
        return ""

    def __str__(self) -> str:
        return f"SerperEngine(name={self.name}, requires_key={bool(self.api_key)})"