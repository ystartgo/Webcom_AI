#!/usr/bin/env python3
"""
搜尋管理器
協調多個搜尋引擎，提供統一介面
"""

import asyncio
import logging
import time
from typing import List, Dict, Any, Optional, Tuple
from pathlib import Path

# 導入搜尋引擎
from .search_engines.base import SearchEngine, SearchEngineError, DummySearchEngine
from .search_engines.duckduckgo import DuckDuckGoEngine
from .search_engines.serper import SerperEngine
from .search_engines.brave import BraveEngine
from .config_manager import ConfigManager
from .api_key_manager import ApiKeyManager
from .rate_limiter import RateLimitManager

logger = logging.getLogger(__name__)


class SearchManager:
    """
    搜尋管理器

    功能：
    1. 管理多個搜尋引擎
    2. 提供統一搜尋介面
    3. 實施降級和重試策略
    4. 處理錯誤和超時
    """

    def __init__(self, config_manager: ConfigManager, api_key_manager: ApiKeyManager):
        """
        初始化搜尋管理器

        Args:
            config_manager: 配置管理器
            api_key_manager: API 金鑰管理器
        """
        self.config_manager = config_manager
        self.api_key_manager = api_key_manager
        self.rate_limit_manager = RateLimitManager()
        self.engines: Dict[str, SearchEngine] = {}
        self.engine_priority: List[str] = []
        self._initialize_engines()

        logger.info(f"Search manager initialized with engines: {list(self.engines.keys())}")

    def _initialize_engines(self):
        """初始化所有啟用的搜尋引擎"""
        config = self.config_manager.read_config()
        search_config = config.get("search_engines", {})

        # 清空現有引擎
        self.engines.clear()
        self.engine_priority = []

        # 初始化 DuckDuckGo（總是可用）
        if duckduckgo_config := search_config.get("duckduckgo"):
            if duckduckgo_config.get("enabled", True):
                try:
                    rate_limiter = self.rate_limit_manager.get_limiter("duckduckgo")
                    engine = DuckDuckGoEngine(
                        name="duckduckgo",
                        config=duckduckgo_config,
                        rate_limiter=rate_limiter
                    )
                    self.engines["duckduckgo"] = engine
                    self.engine_priority.append("duckduckgo")
                    logger.info("DuckDuckGo engine initialized")
                except Exception as e:
                    logger.error(f"Failed to initialize DuckDuckGo engine: {e}")

        # 初始化 Serper（如果配置了 API 金鑰）
        if serper_config := search_config.get("serper"):
            if serper_config.get("enabled", False):
                api_key = self.api_key_manager.get_key("serper")
                if api_key:
                    try:
                        rate_limiter = self.rate_limit_manager.get_limiter("serper")
                        engine = SerperEngine(
                            name="serper",
                            config=serper_config,
                            api_key=api_key,
                            rate_limiter=rate_limiter
                        )
                        self.engines["serper"] = engine
                        self.engine_priority.append("serper")
                        logger.info("Serper engine initialized")
                    except Exception as e:
                        logger.error(f"Failed to initialize Serper engine: {e}")
                else:
                    logger.warning("Serper engine enabled but no API key found")

        # 初始化 Brave（如果配置了 API 金鑰）
        if brave_config := search_config.get("brave"):
            if brave_config.get("enabled", False):
                api_key = self.api_key_manager.get_key("brave")
                try:
                    rate_limiter = self.rate_limit_manager.get_limiter("brave")
                    engine = BraveEngine(
                        name="brave",
                        config=brave_config,
                        api_key=api_key,
                        rate_limiter=rate_limiter
                    )
                    self.engines["brave"] = engine
                    self.engine_priority.append("brave")
                    logger.info("Brave engine initialized")
                except Exception as e:
                    logger.error(f"Failed to initialize Brave engine: {e}")

        # 總是添加虛擬引擎作為最後的降級
        dummy_engine = DummySearchEngine(
            name="dummy",
            config={"enabled": True, "max_results": 1}
        )
        self.engines["dummy"] = dummy_engine
        self.engine_priority.append("dummy")

        # 設置引擎優先級
        if not self.engine_priority:
            self.engine_priority = ["dummy"]

        logger.info(f"Engine priority: {self.engine_priority}")

    async def search(self, query: str, engine: Optional[str] = None, **kwargs) -> Dict[str, Any]:
        """
        執行搜尋

        策略：
        1. 如果指定了引擎，只用該引擎
        2. 否則按優先級嘗試多個引擎
        3. 所有引擎失敗後降級到虛擬引擎

        Args:
            query: 搜尋查詢
            engine: 指定的搜尋引擎名稱
            **kwargs: 額外搜尋參數

        Returns:
            搜尋結果字典
        """
        if not query or not query.strip():
            return self._create_error_response("Empty query")

        start_time = time.time()
        query = query.strip()

        logger.info(f"Searching for: '{query}' (engine: {engine or 'auto'})")

        # 確定要嘗試的引擎
        if engine and engine in self.engines:
            engines_to_try = [engine]
        else:
            # 按優先級嘗試引擎
            engines_to_try = [e for e in self.engine_priority if e != "dummy"]
            if not engines_to_try:
                engines_to_try = ["dummy"]

        # 嘗試搜尋
        results = []
        used_engines = []
        errors = []

        for engine_name in engines_to_try:
            if engine_name not in self.engines:
                errors.append(f"Engine {engine_name} not available")
                continue

            try:
                logger.info(f"Trying engine: {engine_name}")

                engine_instance = self.engines[engine_name]
                search_results = await engine_instance.search(query, **kwargs)

                if search_results:
                    # 將 SearchResult 物件轉換為字典
                    result_dicts = []
                    for result in search_results:
                        result_dicts.append({
                            "title": result.title,
                            "snippet": result.snippet,
                            "url": result.url,
                            "source": result.source,
                            "relevance": result.relevance,
                            "engine": engine_name
                        })

                    results.extend(result_dicts)
                    used_engines.append(engine_name)

                    logger.info(f"Engine {engine_name} returned {len(result_dicts)} results")

                    # 如果已經有足夠結果，提前返回
                    if len(results) >= kwargs.get("min_results", 5):
                        break

            except SearchEngineError as e:
                error_msg = f"{engine_name}: {str(e)}"
                errors.append(error_msg)
                logger.warning(f"Search engine {engine_name} failed: {e}")
            except Exception as e:
                error_msg = f"{engine_name}: Unexpected error - {str(e)}"
                errors.append(error_msg)
                logger.error(f"Unexpected error from engine {engine_name}: {e}", exc_info=True)

        # 如果沒有任何引擎成功，使用虛擬引擎
        if not results and "dummy" in self.engines:
            try:
                dummy_results = await self.engines["dummy"].search(query, **kwargs)
                results = [{
                    "title": r.title,
                    "snippet": r.snippet,
                    "url": r.url,
                    "source": r.source,
                    "relevance": r.relevance,
                    "engine": "dummy"
                } for r in dummy_results]
                used_engines.append("dummy")
                logger.info("Using dummy engine as fallback")
            except Exception as e:
                logger.error(f"Dummy engine also failed: {e}")

        # 計算耗時
        elapsed_time = time.time() - start_time

        # 建立回應
        if results:
            response = self._create_success_response(
                query=query,
                results=results,
                engines_used=used_engines,
                elapsed_time=elapsed_time,
                errors=errors if errors else None
            )
        else:
            response = self._create_error_response(
                message="All search engines failed",
                query=query,
                errors=errors,
                elapsed_time=elapsed_time
            )

        logger.info(f"Search completed in {elapsed_time:.2f}s, found {len(results)} results")
        return response

    def _create_success_response(self, query: str, results: List[Dict],
                                engines_used: List[str], elapsed_time: float,
                                errors: Optional[List[str]] = None) -> Dict[str, Any]:
        """建立成功回應"""
        return {
            "status": "success",
            "query": query,
            "engines_used": engines_used,
            "results": results,
            "total_results": len(results),
            "elapsed_time": round(elapsed_time, 3),
            "timestamp": time.time(),
            "errors": errors,
            "note": f"Found {len(results)} results using {', '.join(engines_used)}"
        }

    def _create_error_response(self, message: str, query: str = "",
                              errors: Optional[List[str]] = None,
                              elapsed_time: float = 0) -> Dict[str, Any]:
        """建立錯誤回應"""
        return {
            "status": "error",
            "query": query,
            "engines_used": [],
            "results": [],
            "total_results": 0,
            "elapsed_time": round(elapsed_time, 3),
            "timestamp": time.time(),
            "error": message,
            "errors": errors,
            "suggestion": "Please check your network connection or try a different query."
        }

    async def test_all_engines(self) -> Dict[str, bool]:
        """
        測試所有引擎的連線

        Returns:
            字典：引擎名稱 -> 連線狀態
        """
        results = {}

        for engine_name, engine in self.engines.items():
            if engine_name == "dummy":
                results[engine_name] = True  # 虛擬引擎總是可用
                continue

            try:
                is_connected = await engine.test_connection()
                results[engine_name] = is_connected
                logger.info(f"Engine {engine_name} connection test: {'PASS' if is_connected else 'FAIL'}")
            except Exception as e:
                results[engine_name] = False
                logger.warning(f"Connection test failed for {engine_name}: {e}")

        return results

    def get_engine_stats(self) -> Dict[str, Dict[str, Any]]:
        """獲取所有引擎的統計資訊"""
        stats = {}
        for engine_name, engine in self.engines.items():
            stats[engine_name] = engine.get_stats()
        return stats

    def get_available_engines(self) -> List[str]:
        """獲取可用的搜尋引擎列表"""
        return [name for name in self.engines.keys() if name != "dummy"]

    def reload_config(self):
        """重新載入配置"""
        logger.info("Reloading search manager configuration")
        self._initialize_engines()

    def __str__(self) -> str:
        return f"SearchManager(engines={list(self.engines.keys())}, priority={self.engine_priority})"