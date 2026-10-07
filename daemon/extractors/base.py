#!/usr/bin/env python3
"""
網頁提取器基類
參考 ClaudeCode-Portable 的 provider 模式
"""

import abc
import aiohttp
import logging
from typing import Dict, Any, Optional
from dataclasses import dataclass
import urllib.parse

logger = logging.getLogger(__name__)


@dataclass
class ExtractionResult:
    """網頁提取結果資料類別"""
    url: str
    title: str
    content: str
    method: str  # bs4, playwright, readability 等
    content_length: int
    success: bool = True
    error: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class ExtractorError(Exception):
    """提取器錯誤"""
    pass


class WebExtractor(abc.ABC):
    """
    網頁提取器基類

    功能：
    1. 提供統一的網頁提取介面
    2. 處理 HTTP 請求和錯誤
    3. 支援不同的提取方法
    4. 結果格式化
    """

    def __init__(self, name: str, config: Dict[str, Any]):
        """
        初始化網頁提取器

        Args:
            name: 提取器名稱
            config: 配置字典
        """
        self.name = name
        self.config = config
        self.timeout = config.get("timeout", 10)
        self.max_content_length = config.get("max_content_length", 5000)
        self.enabled = config.get("enabled", True)
        self.user_agents = config.get("user_agents", [
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        ])

        # HTTP 會話
        self._session = None

    async def extract(self, url: str, selector: Optional[str] = None, **kwargs) -> ExtractionResult:
        """
        提取網頁內容

        Args:
            url: 要提取的網頁 URL
            selector: CSS 選擇器（可選）
            **kwargs: 額外參數

        Returns:
            ExtractionResult 提取結果

        Raises:
            ExtractorError: 提取失敗時拋出
        """
        if not self.enabled:
            raise ExtractorError(f"Extractor {self.name} is disabled")

        if not url or not url.strip():
            raise ExtractorError("URL is required")

        url = url.strip()

        # 驗證 URL
        if not self._is_valid_url(url):
            raise ExtractorError(f"Invalid URL: {url}")

        try:
            # 執行具體提取
            result = await self._perform_extraction(url, selector, **kwargs)

            # 截斷內容
            if result.content and len(result.content) > self.max_content_length:
                result.content = result.content[:self.max_content_length]
                result.content_length = self.max_content_length

            logger.info(f"Extractor {self.name} extracted content from {url}")
            return result

        except aiohttp.ClientError as e:
            raise ExtractorError(f"Network error: {str(e)}")
        except Exception as e:
            raise ExtractorError(f"Extraction failed: {str(e)}")

    @abc.abstractmethod
    async def _perform_extraction(self, url: str, selector: Optional[str] = None, **kwargs) -> ExtractionResult:
        """
        具體提取實作

        子類別必須實現此方法
        """
        pass

    async def fetch_html(self, url: str) -> str:
        """
        獲取網頁 HTML

        Args:
            url: 網頁 URL

        Returns:
            HTML 字串
        """
        async with aiohttp.ClientSession() as session:
            headers = {
                "User-Agent": self.user_agents[0] if self.user_agents else "Mozilla/5.0",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "zh-TW,zh;q=0.9,en;q=0.8",
            }

            async with session.get(
                url,
                headers=headers,
                timeout=aiohttp.ClientTimeout(total=self.timeout),
                allow_redirects=True
            ) as response:
                if response.status != 200:
                    raise ExtractorError(f"HTTP {response.status}")

                return await response.text()

    def _is_valid_url(self, url: str) -> bool:
        """驗證 URL 格式"""
        try:
            parsed = urllib.parse.urlparse(url)
            return bool(parsed.scheme and parsed.netloc)
        except Exception:
            return False

    async def test_connection(self) -> bool:
        """
        測試連線是否正常

        Returns:
            True 如果連線正常，False 否則
        """
        try:
            # 使用一個簡單的網站測試
            result = await self.extract("https://example.com")
            return result.success
        except Exception as e:
            logger.warning(f"Connection test failed for {self.name}: {e}")
            return False

    def get_stats(self) -> Dict[str, Any]:
        """獲取提取器統計資訊"""
        return {
            "name": self.name,
            "enabled": self.enabled,
            "timeout": self.timeout,
            "max_content_length": self.max_content_length,
            "method": self.name
        }

    def __str__(self) -> str:
        return f"WebExtractor(name={self.name}, enabled={self.enabled})"