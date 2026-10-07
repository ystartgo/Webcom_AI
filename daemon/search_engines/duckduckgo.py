#!/usr/bin/env python3
"""
DuckDuckGo 搜尋引擎實作
使用 DuckDuckGo Instant Answer API
"""

import aiohttp
import json
import urllib.parse
import logging
from typing import List, Dict, Any
from .base import SearchEngine, SearchEngineError

logger = logging.getLogger(__name__)

logger = logging.getLogger(__name__)


class DuckDuckGoEngine(SearchEngine):
    """DuckDuckGo 搜尋引擎"""

    def __init__(self, name: str, config: Dict[str, Any], rate_limiter=None):
        super().__init__(name, config, rate_limiter)
        self.api_url = config.get("api_url", "https://api.duckduckgo.com/")

    async def _perform_search(self, query: str, **kwargs) -> List[Dict[str, Any]]:
        """
        使用 DuckDuckGo Instant Answer API 進行搜尋

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
                "format": "json",
                "no_html": "1",
                "no_redirect": "1",
                "skip_disambig": "1",
                "t": "webcom_ai",
                "ia": "web"  # 網頁搜尋
            }

            # 添加額外參數
            if region := kwargs.get("region"):
                params["kl"] = region
            if safe_search := kwargs.get("safe_search"):
                params["safe"] = "1" if safe_search else "-2"

            try:
                async with session.get(
                    self.api_url,
                    params=params,
                    timeout=aiohttp.ClientTimeout(total=self.timeout)
                ) as response:
                    if response.status != 200:
                        raise SearchEngineError(
                            f"DuckDuckGo API returned status {response.status}"
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
        """解析 DuckDuckGo API 回應"""
        results = []

        # 1. 提取即時答案（Instant Answer）
        if abstract_text := data.get("AbstractText"):
            results.append({
                "title": data.get("Heading", "Instant Answer"),
                "snippet": abstract_text,
                "url": data.get("AbstractURL", f"https://duckduckgo.com/?q={urllib.parse.quote(query)}"),
                "source": "instant_answer"
            })

        # 2. 提取相關主題
        for topic in data.get("RelatedTopics", []):
            if isinstance(topic, dict) and "Text" in topic and "FirstURL" in topic:
                # 這是標準相關主題
                text = topic.get("Text", "")
                if text:
                    # 從文本中提取標題（第一個破折號前的部分）
                    title = text.split(" - ")[0] if " - " in text else text[:100]

                    results.append({
                        "title": title,
                        "snippet": text,
                        "url": topic.get("FirstURL"),
                        "source": "related_topic"
                    })
            elif isinstance(topic, dict) and "Topics" in topic:
                # 這是主題組
                for subtopic in topic.get("Topics", []):
                    if "Text" in subtopic and "FirstURL" in subtopic:
                        text = subtopic.get("Text", "")
                        if text:
                            title = text.split(" - ")[0] if " - " in text else text[:100]
                            results.append({
                                "title": title,
                                "snippet": text,
                                "url": subtopic.get("FirstURL"),
                                "source": "subtopic"
                            })

        # 3. 提取定義（如果有）
        if definition := data.get("Definition"):
            results.append({
                "title": f"定義: {query}",
                "snippet": definition,
                "url": f"https://duckduckgo.com/?q={urllib.parse.quote(query)}",
                "source": "definition"
            })

        # 4. 如果沒有結果，返回一個基本的結果
        if not results:
            results.append({
                "title": f"搜尋結果: {query}",
                "snippet": f"DuckDuckGo 已搜尋「{query}」。請嘗試不同的查詢或檢查網路連線。",
                "url": f"https://duckduckgo.com/?q={urllib.parse.quote(query)}",
                "source": "fallback"
            })

        return results[:self.max_results]

    async def test_connection(self) -> bool:
        """測試 DuckDuckGo 連線"""
        try:
            async with aiohttp.ClientSession() as session:
                params = {
                    "q": "test",
                    "format": "json",
                    "no_html": "1"
                }

                async with session.get(
                    self.api_url,
                    params=params,
                    timeout=aiohttp.ClientTimeout(total=5)
                ) as response:
                    # DuckDuckGo API 有時會返回非 200 狀態但仍然可用
                    # 我們檢查是否返回了有效的 JSON
                    if response.status == 200:
                        data = await response.json()
                        return isinstance(data, dict)
                    return False

        except Exception as e:
            logger.warning(f"DuckDuckGo connection test failed: {e}")
            return False

    def get_stats(self) -> Dict[str, Any]:
        """獲取引擎統計資訊"""
        stats = super().get_stats()
        stats.update({
            "api_url": self.api_url,
            "description": "DuckDuckGo Instant Answer API",
            "privacy_focused": True,
            "no_api_key_required": True
        })
        return stats

    def __str__(self) -> str:
        return f"DuckDuckGoEngine(name={self.name}, url={self.api_url})"