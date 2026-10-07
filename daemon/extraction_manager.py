#!/usr/bin/env python3
"""
網頁提取管理器
協調多個提取器，提供統一介面

注意：本文件已被重寫以確保與 base.py, bs4_extractor.py 和 readability_extractor.py 的結構一致性。
"""

import asyncio
import logging
import time
from typing import Dict, Any, Optional, List
from pathlib import Path

# 導入提取器 (假設路徑正確)
from .extractors.base import WebExtractor, ExtractionResult, ExtractorError
from .extractors.bs4_extractor import BS4Extractor
from .extractors.readability_extractor import ReadabilityExtractor


logger = logging.getLogger(__name__)


class ExtractionManager:
    """
    網頁提取管理器 (Facade/Coordinator)

    功能：
    1. 管理多個提取器，實施戰略模式。
    2. 提供統一的提取介面和預設流程控制。
    3. 處理快取、優先級順序和失敗降級策略。
    """

    def __init__(self, config_manager: Any): # 使用Any代替ConfigManager，避免循環依賴問題
        """
        初始化提取管理器
        Args:
            config_manager: 配置管理器實例
        """
        self.config_manager = config_manager
        self.extractors: Dict[str, WebExtractor] = {}
        self.extractor_priority: List[str] = [] # 按照優先級順序的提取器名稱
        self.cache: Dict[str, Dict[str, Any]] = {}
        self._initialize_extractors()

        logger.info(f"Extraction manager initialized with extractors: {list(self.extractors.keys())}")

    def _initialize_extractors(self):
        """初始化所有提取器，根據配置設定優先級。"""
        config = self.config_manager.read_config()
        extraction_config = config.get("extraction", {})

        # 1. 清空現有提取器
        self.extractors.clear()
        self.extractor_priority = []

        available_implementations: Dict[str, type] = {
            "bs4": BS4Extractor,
            "readability": ReadabilityExtractor,
            # 可以在這裡添加新的提取器，例如 'playwright'
        }

        # 2. 根據配置和可用實現初始化並設置優先級
        for name_key, ExtractorClass in available_implementations.items():
            if extraction_config.get(name_key, {}).get("enabled", False):
                try:
                    extractor = ExtractorClass(name=name_key, config=extraction_config[name_key])
                    self.extractors[name_key] = extractor
                    # 假設在配置中，越靠前的越優先 (或根據需求手動排序)
                    self.extractor_priority.append(name_key)
                except Exception as e:
                    logger.error(f"Failed to initialize {name_key} extractor: {e}")

        if not self.extractors:
            # 如果沒有任何提取器啟動，我們將添加一個佔位符名稱，確保後續邏輯不會崩潰
            self.extractor_priority = ["simple_fallback"]
            logger.warning("No extractors available; primary fallback mechanism will be used.")


    async def extract(self, url: str, selector: Optional[str] = None,
                      method: Optional[str] = None, **kwargs) -> Dict[str, Any]:
        """
        提取網頁內容。流程：緩存檢查 -> 優先級化嘗試 -> Fallback 降級。

        Args:
            url: 要提取的網頁 URL
            selector: CSS 選擇器 (用於精確定位)
            method: 指定要使用的提取方法 (覆蓋預設優先級)
            **kwargs: 額外參數，如 cache_ttl 等。

        Returns:
            包含提取結果和狀態資訊的標準化字典。
        """
        if not url or not url.strip():
            return self._create_error_response("URL is required", url=url)

        start_time = time.time()
        url = url.strip()
        cache_key = f"{url}:{selector or ''}"

        # 1. 檢查緩存
        config = self.config_manager.read_config()
        cache_ttl = config.get("extraction", {}).get("cache_ttl", 3600)
        if cache_key in self.cache:
            cached_entry = self.cache[cache_key]
            if time.time() - cached_entry["timestamp"] < cache_ttl:
                logger.info(f"Using cached result for {url}")
                cached_result = cached_entry["result"].copy()
                cached_result["source"] = "cache"
                return cached_result

        # 2. 確定嘗試順序
        if method and method in self.extractors:
            extractors_to_try = [method] # 使用指定的方法
        else:
            # 按照配置的優先級列表 (如果用戶未指定方法)
            extractors_to_try = self.extractor_priority

        all_errors: List[str] = []
        successful_results: Optional[List[Any]] = None


        # 3. 執行提取器瀑布流 (Extraction Cascade)
        for extractor_name in extractors_to_try:
            if extractor_name not in self.extractors:
                all_errors.append(f"Extractor {extractor_name} is not initialized.")
                continue

            extractor = self.extractors[extractor_name]
            try:
                logger.info(f"Attempting extraction using: {extractor_name}")
                # 執行提取，這一步必須是異步的 (async)
                extraction_result = await extractor.extract(url, selector, **kwargs)

                # 將 ExtractionResult 對象轉換為字典結構
                result_dict = self._extraction_result_to_dict(extraction_result)
                successful_results = [result_dict] # 找到第一個成功結果，即當前最佳答案
                break # 成功後立即退出循環，採用優先級最高的那個結果

            except ExtractorError as e:
                error_msg = f"{extractor_name} failed: {str(e)}"
                all_errors.append(error_msg)
            except Exception as e:
                error_msg = f"{extractor_name} failed unexpectedly: {type(e).__name__}: {str(e)}"
                all_errors.append(error_msg)

        # 4. 處理結果：成功或所有嘗試失敗 -> Fallback 降級
        if successful_results:
            result = successful_results[0]
        else:
            logger.warning("All configured extractors failed. Falling back to simple HTTP text extraction.")
            result = await self._simple_extract(url, selector, start_time, all_errors)

        # 5. 完成後，更新快取 (只在成功或失敗都能計算出最終結果時進行)
        if result and result["status"] != "error":
             self.cache[cache_key] = {
                "result": result,
                "timestamp": time.time()
            }

        # 6. 返回標準化結果
        return result


    async def _simple_extract(self, url: str, selector: Optional[str] = None,
                             start_time: float = None,
                             previous_errors: List[str] = None) -> Dict[str, Any]:
        """
        簡單的網頁提取（備份方案）。不依賴複雜的HTML解析，僅使用正規表達式。
        這個方法應該是所有失敗的最終終點。
        """
        try:
            # 確保在本地運行環境中模擬 aiohttp 的行為
            import aiohttp
            import re

            async with aiohttp.ClientSession() as session:
                headers = {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                    "Accept": "text/html"
                }

                async with session.get(
                    url,
                    headers=headers,
                    timeout=aiohttp.ClientTimeout(total=10)
                ) as response:
                    if response.status != 200:
                        raise Exception(f"HTTP {response.status}")

                    html = await response.text()

            # --- 基本清理邏輯 (與BS4保持一致，但更激進) ---

            # 1. 移除腳本和樣式
            html = re.sub(r'<script[^>]*>.*?</script>', '', html, flags=re.DOTALL | re.IGNORECASE)
            html = re.sub(r'<style[^>]*>.*?</style>', '', html, flags=re.DOTALL | re.IGNORECASE)

            # 2. 提取標題 (保留原邏輯)
            title_match = re.search(r'<title[^>]*>(.*?)</title>', html, re.IGNORECASE | re.DOTALL)
            title = title_match.group(1).strip() if title_match else url

            # 3. 移除所有標籤，只保留文字內容 (這是最基礎的文本提取方式)
            text = re.sub(r'<[^>]+>', ' ', html)

            # 4. 清理空白
            text = re.sub(r'\s+', ' ', text).strip()

            max_length = self.config_manager.get_extraction_config().get("max_content_length", 5000)
            final_content = text[:max_length]

            elapsed_time = time.time() - start_time
            return {
                "status": "success",
                "url": url,
                "title": title[:200],
                "content": final_content,
                "content_length": len(final_content),
                "method": "simple",
                "source": "simple_http",
                "elapsed_time": round(elapsed_time, 3),
                "timestamp": time.time(),
                "errors": previous_errors if previous_errors else None
            }

        except ImportError:
             # 如果依賴庫不存在
            return self._create_error_response("Dependencies missing (e.g., aiohttp)", url=url, errors=[previous_errors] or ["Missing dependencies"])
        except Exception as e:
            elapsed_time = time.time() - start_time if start_time else 0
            return self._create_error_response(f"Simple extraction failed due to dependency/runtime error: {str(e)}", url=url, errors=(previous_errors or []) + [str(e)], elapsed_time=elapsed_time)


    def _extraction_result_to_dict(self, result: ExtractionResult) -> Dict[str, Any]:
        """將 ExtractionResult 對象轉換為字典，以符合外部 API 輸出要求。"""
        return {
            "status": "success" if result.success else "error",
            "url": result.url,
            "title": result.title,
            "content": result.content,
            "content_length": result.content_length,
            "method": result.method,
            "error": result.error,
            "metadata": result.metadata,
            "timestamp": time.time()
        }

    def _create_error_response(self, message: str, url: str = "",
                              errors: Optional[List[str]] = None,
                              elapsed_time: float = 0) -> Dict[str, Any]:
        """建立標準化錯誤回應。"""
        return {
            "status": "error",
            "url": url,
            "title": "",
            "content": "",
            "content_length": 0,
            "method": "",
            "source": "system_error",
            "elapsed_time": round(elapsed_time, 3),
            "timestamp": time.time(),
            "error": message,
            "errors": errors if errors else [],
            "suggestion": "Please check the URL, your network connection, or ensure all required dependencies (like aiohttp) are installed."
        }

    async def test_all_extractors(self) -> Dict[str, bool]:
        """測試所有已配置的提取器連線狀態。"""
        results = {}
        for name, extractor in self.extractors.items():
            try:
                is_working = await extractor.test_connection()
                results[name] = is_working
            except Exception as e:
                logger.error(f"Test failed for {name}: {e}")
                results[name] = False
        return results

    def get_extractor_stats(self) -> Dict[str, Dict[str, Any]]:
        """獲取所有提取器的統計資訊。"""
        return {
            name: extractor.get_stats()
            for name, extractor in self.extractors.items()
        }

    def get_available_methods(self) -> List[str]:
        """獲取可用的提取方法列表，供前端/用戶介面參考。"""
        return list(self.extractors.keys())

    def clear_cache(self):
        """清空緩存"""
        self.cache.clear()
        logger.info("Extraction cache cleared")

    def reload_config(self):
        """重新載入配置，重建提取器實例。"""
        logger.info("Reloading extraction manager configuration: Re-initializing extractors.")
        self._initialize_extractors()