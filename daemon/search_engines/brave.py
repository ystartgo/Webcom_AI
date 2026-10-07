#!/usr/bin/env python3
"""
Brave 搜尋引擎實作
使用 Brave Search API
需要 API 金鑰（有免費層級）
"""

import aiohttp
import json
import logging
import urllib.parse
from typing import List, Dict, Any
from .base import SearchEngine, SearchEngineError

logger = logging.getLogger(__name__)


class BraveEngine(SearchEngine):
    """Brave 搜尋引擎"""

    def __init__(self, name: str, config: Dict[str, Any], api_key: str = None, rate_limiter=None):
        super().__init__(name, config, rate_limiter)
        self.api_url = config.get("api_url", "https://api.search.brave.com/res/v1/web/search")
        self.api_key = api_key
        self.safesearch = config.get("safesearch", "moderate")  # off, moderate, strict

    async def _perform_search(self, query: str, **kwargs) -> List[Dict[str, Any]]:
        """
        使用 Brave Search API 進行搜尋

        Args:
            query: 搜尋查詢
            **kwargs: 額外參數

        Returns:
            搜尋結果列表
        """
        async with aiohttp.ClientSession() as session:
            # 構建 API 參數
            params = {
                "q": query,
                "count": kwargs.get("count", self.max_results),
                "offset": kwargs.get("offset", 0),
                "safesearch": kwargs.get("safesearch", self.safesearch),
                "freshness": kwargs.get("freshness", "")  # pd (過去一天), pw, pm, py
            }

            # 添加國家和語言參數
            if country := kwargs.get("country"):
                params["country"] = country
            if search_lang := kwargs.get("search_lang"):
                params["search_lang"] = search_lang
            if ui_lang := kwargs.get("ui_lang"):
                params["ui_lang"] = ui_lang

            headers = {
                "Accept": "application/json",
                "User-Agent": "Webcom-AI/1.0"
            }

            # 添加 API 金鑰（如果有的話）
            if self.api_key:
                headers["X-Subscription-Token"] = self.api_key

            try:
                async with session.get(
                    self.api_url,
                    params=params,
                    headers=headers,
                    timeout=aiohttp.ClientTimeout(total=self.timeout)
                ) as response:
                    if response.status != 200:
                        error_text = await response.text()
                        logger.error(f"Brave API error: {response.status} - {error_text}")

                        if response.status == 401:
                            raise SearchEngineError("Invalid or missing API key")
                        elif response.status == 429:
                            raise SearchEngineError("Rate limit exceeded")
                        elif response.status == 403:
                            raise SearchEngineError("Forbidden - check API permissions")
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
        """解析 Brave API 回應"""
        results = []

        # 1. 處理網頁搜尋結果
        web_results = data.get("web", {}).get("results", [])
        for item in web_results:
            title = item.get("title", "")
            description = item.get("description", "")
            url = item.get("url", "")

            if title and url:  # 確保有標題和 URL
                results.append({
                    "title": title,
                    "snippet": description,
                    "url": url,
                    "source": "brave_web"
                })

        # 2. 處理新聞結果（如果有）
        if news := data.get("news", {}).get("results", []):
            for item in news[:5]:  # 限制新聞數量
                title = item.get("title", "")
                description = item.get("description", "")
                url = item.get("url", "")
                date = item.get("published_date", "")

                if title and url:
                    snippet = description or f"新聞 - {date}" if date else "最新新聞"
                    results.append({
                        "title": title,
                        "snippet": snippet,
                        "url": url,
                        "source": "brave_news",
                        "date": date
                    })

        # 3. 處理影片結果（如果有）
        if videos := data.get("videos", {}).get("results", []):
            for item in videos[:3]:  # 限制影片數量
                title = item.get("title", "")
                description = item.get("description", "")
                url = item.get("url", "")

                if title and url:
                    results.append({
                        "title": f"影片: {title}",
                        "snippet": description,
                        "url": url,
                        "source": "brave_video"
                    })

        # 4. 處理在地結果（如果有）
        if local := data.get("local", {}).get("results", []):
            for item in local[:3]:  # 限制在地結果數量
                title = item.get("title", "")
                address = item.get("address", {}).get("street", "")
                phone = item.get("phone", "")

                if title:
                    snippet_parts = []
                    if address:
                        snippet_parts.append(f"地址: {address}")
                    if phone:
                        snippet_parts.append(f"電話: {phone}")

                    results.append({
                        "title": title,
                        "snippet": " | ".join(snippet_parts),
                        "url": item.get("place_id", f"https://maps.google.com/?q={urllib.parse.quote(title)}"),
                        "source": "brave_local"
                    })

        # 5. 如果沒有結果，返回一個基本結果
        if not results:
            results.append({
                "title": f"搜尋結果: {query}",
                "snippet": f"Brave Search 正在搜尋「{query}」。請嘗試不同的查詢或檢查 API 配置。",
                "url": f"https://search.brave.com/search?q={urllib.parse.quote(query)}",
                "source": "fallback"
            })

        return results[:self.max_results]

    async def test_connection(self) -> bool:
        """測試 Brave API 連線"""
        try:
            async with aiohttp.ClientSession() as session:
                params = {
                    "q": "test",
                    "count": 1
                }

                headers = {"Accept": "application/json"}
                if self.api_key:
                    headers["X-Subscription-Token"] = self.api_key

                async with session.get(
                    self.api_url,
                    params=params,
                    headers=headers,
                    timeout=aiohttp.ClientTimeout(total=5)
                ) as response:
                    if response.status == 200:
                        return True
                    elif response.status == 401:
                        logger.warning("Brave API key may be invalid or missing")
                        # 免費層級可能不需要金鑰
                        return response.status == 200
                    else:
                        logger.warning(f"Brave API test returned status {response.status}")
                        return False

        except Exception as e:
            logger.warning(f"Brave connection test failed: {e}")
            return False

    def get_stats(self) -> Dict[str, Any]:
        """獲取引擎統計資訊"""
        stats = super().get_stats()
        stats.update({
            "api_url": self.api_url,
            "description": "Brave Search API",
            "safesearch": self.safesearch,
            "requires_api_key": bool(self.api_key),
            "privacy_focused": True,
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
        return f"BraveEngine(name={self.name}, safesearch={self.safesearch}, has_key={bool(self.api_key)})"