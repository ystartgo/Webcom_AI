#!/usr/bin/env python3
"""
API 金鑰管理器
參考 ClaudeCode-Portable 的金鑰管理設計
"""

import os
import re
import json
import logging
from pathlib import Path
from typing import Dict, Optional, List, Set
import hashlib

logger = logging.getLogger(__name__)

class ApiKeyManager:
    """
    API 金鑰管理器

    功能：
    1. 從多個來源載入 API 金鑰
    2. 遮擋敏感資訊（用於日誌）
    3. 提供金鑰驗證和格式化
    4. 支援金鑰輪換和備份
    """

    # 常見 API 金鑰模式（用於檢測和遮擋）
    KEY_PATTERNS = [
        r'sk-ant-[a-zA-Z0-9]{96}',      # Anthropic
        r'sk-or-[a-zA-Z0-9]{96}',       # OpenRouter
        r'sk-[a-zA-Z0-9]{48}',          # OpenAI
        r'AIzaSy[a-zA-Z0-9_-]{35}',     # Google (Gemini)
        r'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}',  # UUID
        r'[a-f0-9]{32}',                # 32位 hex (通用)
        r'[A-Z0-9]{40}',                # 40位大寫字母數字
        r'Bearer [a-zA-Z0-9._-]{100,}', # Bearer token
    ]

    # 環境變數到服務名稱的映射
    ENV_SERVICE_MAPPINGS = {
        'SERPER_API_KEY': 'serper',
        'BRAVE_API_KEY': 'brave',
        'ANTHROPIC_API_KEY': 'anthropic',
        'OPENAI_API_KEY': 'openai',
        'GOOGLE_API_KEY': 'google',
        'OPENROUTER_API_KEY': 'openrouter',
        'DEEPSEEK_API_KEY': 'deepseek',
    }

    def __init__(self, config_manager=None):
        self.config_manager = config_manager
        self.keys: Dict[str, str] = {}
        self.key_metadata: Dict[str, Dict] = {}  # 儲存金鑰的元數據
        self.load_from_env()
        self.load_from_config_file()
        logger.info(f"Loaded API keys for services: {list(self.keys.keys())}")

    def load_from_env(self):
        """從環境變數載入 API 金鑰"""
        for env_var, service in self.ENV_SERVICE_MAPPINGS.items():
            if value := os.getenv(env_var):
                if self._is_likely_api_key(value):
                    self.keys[service] = value
                    self.key_metadata[service] = {
                        'source': 'environment',
                        'env_var': env_var,
                        'loaded_at': self._current_timestamp()
                    }
                    logger.debug(f"Loaded API key for {service} from {env_var}")

        # 也嘗試從通用環境變數載入
        for key, value in os.environ.items():
            key_upper = key.upper()
            if 'API_KEY' in key_upper and self._is_likely_api_key(value):
                # 從環境變數名稱推測服務
                service = self._guess_service_from_env(key)
                if service and service not in self.keys:
                    self.keys[service] = value
                    self.key_metadata[service] = {
                        'source': 'environment',
                        'env_var': key,
                        'loaded_at': self._current_timestamp()
                    }
                    logger.debug(f"Loaded API key for {service} from generic env var {key}")

    def load_from_config_file(self):
        """從配置檔案載入 API 金鑰"""
        if not self.config_manager:
            return

        try:
            config = self.config_manager.read_config()

            # 從搜尋引擎配置載入金鑰
            search_engines = config.get('search_engines', {})
            for engine_name, engine_config in search_engines.items():
                if api_key := engine_config.get('api_key'):
                    if self._is_likely_api_key(api_key):
                        self.keys[engine_name] = api_key
                        self.key_metadata[engine_name] = {
                            'source': 'config_file',
                            'config_path': f'search_engines.{engine_name}.api_key',
                            'loaded_at': self._current_timestamp()
                        }
                        logger.debug(f"Loaded API key for {engine_name} from config file")

        except Exception as e:
            logger.error(f"Failed to load API keys from config: {e}")

    def get_key(self, service: str, default: Optional[str] = None) -> Optional[str]:
        """
        獲取指定服務的 API 金鑰

        Args:
            service: 服務名稱 (serper, brave, anthropic, openai, google 等)
            default: 預設值

        Returns:
            API 金鑰或 None
        """
        key = self.keys.get(service, default)

        if key:
            # 記錄金鑰使用（不含實際金鑰）
            logger.debug(f"Using API key for service: {service}")
            return key

        logger.warning(f"No API key found for service: {service}")
        return None

    def has_key(self, service: str) -> bool:
        """檢查是否有指定服務的 API 金鑰"""
        return service in self.keys

    def set_key(self, service: str, key: str, source: str = 'manual'):
        """
        設置 API 金鑰

        Args:
            service: 服務名稱
            key: API 金鑰
            source: 來源（manual, environment, config）
        """
        if not self._is_likely_api_key(key):
            logger.warning(f"Key for {service} doesn't look like a valid API key")

        self.keys[service] = key
        self.key_metadata[service] = {
            'source': source,
            'loaded_at': self._current_timestamp()
        }

        logger.info(f"Set API key for service: {service} (source: {source})")

    def remove_key(self, service: str):
        """移除指定服務的 API 金鑰"""
        if service in self.keys:
            del self.keys[service]
            if service in self.key_metadata:
                del self.key_metadata[service]
            logger.info(f"Removed API key for service: {service}")

    def get_all_services(self) -> List[str]:
        """獲取所有有金鑰的服務列表"""
        return list(self.keys.keys())

    def redact(self, text: str) -> str:
        """
        遮擋敏感資訊（用於日誌和錯誤訊息）

        參考 ClaudeCode-Portable 的 redaction 功能
        """
        if not text:
            return text

        redacted = text
        for pattern in self.KEY_PATTERNS:
            redacted = re.sub(pattern, '[REDACTED]', redacted, flags=re.IGNORECASE)

        # 也遮擋類似金鑰的長字串
        redacted = re.sub(r'[a-zA-Z0-9._-]{40,}', '[REDACTED]', redacted)

        return redacted

    def redact_exception(self, exc: Exception) -> str:
        """遮擋異常訊息中的敏感資訊"""
        error_str = str(exc)
        return self.redact(error_str)

    def get_key_hash(self, service: str) -> Optional[str]:
        """
        獲取金鑰的雜湊值（用於檢查金鑰是否變更）

        Returns:
            金鑰的 SHA-256 雜湊值（前8位）或 None
        """
        if key := self.get_key(service):
            hash_obj = hashlib.sha256(key.encode())
            return hash_obj.hexdigest()[:8]
        return None

    def validate_key_format(self, service: str, key: str) -> bool:
        """驗證金鑰格式"""
        return self._is_likely_api_key(key)

    def _is_likely_api_key(self, value: str) -> bool:
        """檢查字串是否可能是 API 金鑰"""
        if not value or not isinstance(value, str):
            return False

        value = value.strip()

        # 檢查長度
        if len(value) < 20 or len(value) > 200:
            return False

        # 檢查是否包含空格（Bearer token 除外）
        if ' ' in value and not value.startswith('Bearer '):
            return False

        # 檢查常見金鑰模式
        for pattern in self.KEY_PATTERNS:
            if re.fullmatch(pattern, value, re.IGNORECASE):
                return True

        # 檢查是否看起來像密碼/金鑰（包含字母和數字）
        if re.search(r'[A-Za-z]', value) and re.search(r'[0-9]', value):
            return True

        return False

    def _guess_service_from_env(self, env_var: str) -> Optional[str]:
        """從環境變數名稱推測服務"""
        env_var_lower = env_var.lower()

        mappings = [
            ('serper', 'serper'),
            ('brave', 'brave'),
            ('anthropic', 'anthropic'),
            ('openai', 'openai'),
            ('google', 'google'),
            ('gemini', 'google'),
            ('openrouter', 'openrouter'),
            ('deepseek', 'deepseek'),
            ('nvidia', 'nvidia'),
            ('azure', 'azure'),
            ('aws', 'aws'),
            ('cohere', 'cohere'),
            ('huggingface', 'huggingface'),
            ('replicate', 'replicate')
        ]

        for keyword, service in mappings:
            if keyword in env_var_lower:
                return service

        return None

    def _current_timestamp(self) -> str:
        """取得當前時間戳記"""
        from datetime import datetime
        return datetime.now().isoformat()

    def __str__(self) -> str:
        """字串表示（不包含實際金鑰）"""
        services = list(self.keys.keys())
        return f"ApiKeyManager(services={services}, total_keys={len(self.keys)})"