#!/usr/bin/env python3
"""
配置管理器
參考 ClaudeCode-Portable 的配置管理模式
"""

import json
import os
import logging
from pathlib import Path
from typing import Dict, Any, Optional
import time

logger = logging.getLogger(__name__)

class ConfigManager:
    """配置管理器，參考 ClaudeCode-Portable 的設計"""

    def __init__(self, project_root: Path):
        self.project_root = project_root
        self.settings_path = project_root / "data" / "settings.json"
        self.search_config_path = project_root / "config" / "search_config.json"

        # 確保目錄存在
        self.settings_path.parent.mkdir(parents=True, exist_ok=True)

        # 緩存配置
        self._config_cache = None
        self._last_modified = 0

    def read_config(self) -> Dict[str, Any]:
        """讀取配置檔案，支援緩存和環境變數覆蓋"""
        try:
            # 檢查緩存
            current_time = time.time()
            if self._config_cache and current_time - self._last_modified < 30:
                return self._config_cache

            # 合併多個配置來源
            config = self._merge_configs()

            # 應用環境變數覆蓋
            config = self.apply_env_overrides(config)

            # 更新緩存
            self._config_cache = config
            self._last_modified = current_time

            return config

        except Exception as e:
            logger.error(f"Failed to read config: {e}")
            return self.default_config()

    def _merge_configs(self) -> Dict[str, Any]:
        """合併多個配置來源"""
        # 從 settings.json 讀取使用者配置
        user_config = {}
        if self.settings_path.exists():
            try:
                with open(self.settings_path, 'r', encoding='utf-8') as f:
                    user_config = json.load(f)
            except json.JSONDecodeError:
                logger.warning(f"Invalid JSON in {self.settings_path}")

        # 從 search_config.json 讀取搜尋配置
        search_config = {}
        if self.search_config_path.exists():
            try:
                with open(self.search_config_path, 'r', encoding='utf-8') as f:
                    search_config = json.load(f)
            except json.JSONDecodeError:
                logger.warning(f"Invalid JSON in {self.search_config_path}")

        # 建立預設配置
        default_config = self.default_config()

        # 深度合併配置
        merged = self._deep_merge(default_config, search_config)
        merged = self._deep_merge(merged, user_config)

        return merged

    def default_config(self) -> Dict[str, Any]:
        """預設配置，參考 ClaudeCode-Portable 結構"""
        return {
            "version": 2,
            "active": "duckduckgo",
            "search_engines": {
                "duckduckgo": {
                    "enabled": True,
                    "name": "DuckDuckGo",
                    "api_url": "https://api.duckduckgo.com/",
                    "requires_api_key": False,
                    "rate_limit": {"requests_per_minute": 30},
                    "timeout": 10,
                    "max_results": 10
                },
                "serper": {
                    "enabled": False,
                    "name": "Serper.dev",
                    "api_url": "https://google.serper.dev/search",
                    "requires_api_key": True,
                    "api_key_env": "SERPER_API_KEY",
                    "rate_limit": {"requests_per_day": 2500},
                    "timeout": 10,
                    "max_results": 10
                },
                "brave": {
                    "enabled": False,
                    "name": "Brave Search",
                    "api_url": "https://api.search.brave.com/res/v1/web/search",
                    "requires_api_key": True,
                    "api_key_env": "BRAVE_API_KEY",
                    "rate_limit": {"requests_per_minute": 10},
                    "timeout": 10,
                    "max_results": 10
                }
            },
            "extraction": {
                "enabled": True,
                "default_method": "bs4",
                "cache_ttl": 3600,
                "timeout": 10,
                "max_content_length": 5000,
                "user_agents": [
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
                    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36"
                ],
                "playwright_enabled": False
            },
            "cache": {
                "enabled": True,
                "ttl": 3600,
                "max_size": 1000
            },
            "logging": {
                "level": "INFO",
                "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
            }
        }

    def save_config(self, config: Dict[str, Any]) -> bool:
        """安全儲存配置（先寫臨時檔案再重命名）"""
        try:
            temp_path = self.settings_path.with_suffix('.tmp')

            # 確保目錄存在
            temp_path.parent.mkdir(parents=True, exist_ok=True)

            with open(temp_path, 'w', encoding='utf-8') as f:
                json.dump(config, f, indent=2, ensure_ascii=False)

            # 原子操作：重命名
            os.replace(temp_path, self.settings_path)

            # 清除緩存
            self._config_cache = None

            logger.info(f"Configuration saved to {self.settings_path}")
            return True

        except Exception as e:
            logger.error(f"Failed to save config: {e}")
            return False

    def apply_env_overrides(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """應用環境變數覆蓋配置"""
        # 環境變數到配置路徑的映射
        env_mappings = {
            "SERPER_API_KEY": ("search_engines", "serper", "api_key"),
            "BRAVE_API_KEY": ("search_engines", "brave", "api_key"),
            "EXTRACTION_TIMEOUT": ("extraction", "timeout"),
            "CACHE_TTL": ("cache", "ttl"),
            "LOG_LEVEL": ("logging", "level")
        }

        for env_var, config_path in env_mappings.items():
            if value := os.getenv(env_var):
                # 深度設置配置值
                self._set_nested(config, config_path, value)
                logger.debug(f"Applied environment override: {env_var} -> {config_path}")

        return config

    def get_search_engine_config(self, engine_name: str) -> Optional[Dict[str, Any]]:
        """獲取指定搜尋引擎的配置"""
        config = self.read_config()
        return config.get("search_engines", {}).get(engine_name)

    def get_extraction_config(self) -> Dict[str, Any]:
        """獲取提取配置"""
        config = self.read_config()
        return config.get("extraction", {})

    def is_search_engine_enabled(self, engine_name: str) -> bool:
        """檢查搜尋引擎是否啟用"""
        engine_config = self.get_search_engine_config(engine_name)
        return bool(engine_config and engine_config.get("enabled", False))

    def _deep_merge(self, base: Dict, update: Dict) -> Dict:
        """深度合併兩個字典"""
        result = base.copy()

        for key, value in update.items():
            if key in result and isinstance(result[key], dict) and isinstance(value, dict):
                result[key] = self._deep_merge(result[key], value)
            else:
                result[key] = value

        return result

    def _set_nested(self, obj, path, value):
        """深度設置嵌套配置值"""
        keys = path if isinstance(path, (list, tuple)) else path.split('.')
        current = obj

        for key in keys[:-1]:
            if key not in current:
                current[key] = {}
            current = current[key]

        current[keys[-1]] = value