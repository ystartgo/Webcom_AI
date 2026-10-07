#!/usr/bin/env python3
"""
搜尋引擎基類
參考 ClaudeCode-Portable 的 provider 模式
"""

import abc
import aiohttp
import logging
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
import urllib.parse

logger = logging.getLogger(__name__)


@dataclass
class SearchResult:
    """搜尋結果資料類別"""
    title: str
    snippet: str
    url: str
    source: str = "web"  # web, knowledge_graph, news, video, image 等
    relevance: float = 1.0  # 相關性分數 (0.0-1.0)


class SearchEngineError(Exception):
    """搜尋引擎錯誤"""
    pass


class SearchEngine(abc.ABC):
    """
    搜尋引擎基類

    功能：
    1. 提供統一的搜尋介面
    2. 處理錯誤和重試
    3. 速率限制
    4. 結果格式化
    """

    def __init__(self, name: str, config: Dict[str, Any], rate_limiter=None):
        """
        初始化搜尋引擎

        Args:
            name: 引擎名稱
            config: 配置字典
            rate_limiter: 速率限制器
        """
        self.name = name
        self.config = config
        self.rate_limiter = rate_limiter
        self.timeout = config.get("timeout", 10)
        self.max_results = config.get("max_results", 10)
        self.enabled = config.get("enabled", True)

        # HTTP 會話
        self._session = None

    async def search(self, query: str, **kwargs) -> List[SearchResult]:
        """
        執行搜尋

        Args:
            query: 搜尋查詢
            **kwargs: 額外參數

        Returns:
            搜尋結果列表

        Raises:
            SearchEngineError: 搜尋失敗時拋出
        """
        if not self.enabled:
            raise SearchEngineError(f"Search engine {self.name} is disabled")

        # 應用速率限制
        if self.rate_limiter:
            self.rate_limiter.wait_if_needed()

        try:
            # 清理查詢
            cleaned_query = self._clean_query(query)

            # 執行具體搜尋
            results = await self._perform_search(cleaned_query, **kwargs)

            # 格式化結果
            formatted_results = self._format_results(results)

            logger.info(f"Search engine {self.name} returned {len(formatted_results)} results")
            return formatted_results

        except aiohttp.ClientError as e:
            raise SearchEngineError(f"Network error: {str(e)}")
        except Exception as e:
            raise SearchEngineError(f"Search failed: {str(e)}")

    @abc.abstractmethod
    async def _perform_search(self, query: str, **kwargs) -> List[Dict[str, Any]]:
        """
        具體搜尋實作

        子類別必須實現此方法
        """
        pass

    def _clean_query(self, query: str) -> str:
        """清理搜尋查詢"""
        query = query.strip()

        # 移除多餘空白
        query = ' '.join(query.split())

        # URL 編碼敏感字符
        query = urllib.parse.quote(query)

        return query

    def _format_results(self, raw_results: List[Dict[str, Any]]) -> List[SearchResult]:
        """格式化原始結果為 SearchResult 物件"""
        formatted = []

        for idx, raw in enumerate(raw_results):
            try:
                result = SearchResult(
                    title=raw.get("title", f"Result {idx+1}"),
                    snippet=raw.get("snippet", ""),
                    url=raw.get("url", ""),
                    source=raw.get("source", "web"),
                    relevance=1.0 - (idx * 0.1)  # 簡單的相關性計算
                )
                formatted.append(result)
            except Exception as e:
                logger.warning(f"Failed to format result {idx}: {e}")
                continue

        return formatted[:self.max_results]

    async def test_connection(self) -> bool:
        """
        測試連線是否正常

        Returns:
            True 如果連線正常，False 否則
        """
        try:
            # 執行簡單的測試搜尋
            results = await self.search("test")
            return len(results) > 0
        except Exception as e:
            logger.warning(f"Connection test failed for {self.name}: {e}")
            return False

    async def __aenter__(self):
        """非同步上下文管理器進入"""
        self._session = aiohttp.ClientSession()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """非同步上下文管理器退出"""
        if self._session:
            await self._session.close()
            self._session = None

    def get_stats(self) -> Dict[str, Any]:
        """獲取引擎統計資訊"""
        return {
            "name": self.name,
            "enabled": self.enabled,
            "timeout": self.timeout,
            "max_results": self.max_results,
            "requires_api_key": self.config.get("requires_api_key", False)
        }

    def __str__(self) -> str:
        return f"SearchEngine(name={self.name}, enabled={self.enabled})"


class DummySearchEngine(SearchEngine):
    """
    虛擬搜尋引擎（用於測試和降級）
    """

    async def _perform_search(self, query: str, **kwargs) -> List[Dict[str, Any]]:
        """返回虛擬結果"""
        return [{
            "title": f"虛擬結果: {query}",
            "snippet": f"這是 {self.name} 的虛擬搜尋結果。實際搜尋引擎暫時不可用。",
            "url": f"https://duckduckgo.com/?q={urllib.parse.quote(query)}",
            "source": "dummy"
        }]