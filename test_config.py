#!/usr/bin/env python3
"""
測試配置管理系統
"""

import os
import sys
import time
from pathlib import Path

# 添加 daemon 目錄到路徑
sys.path.insert(0, str(Path(__file__).parent))

from daemon.config_manager import ConfigManager
from daemon.api_key_manager import ApiKeyManager
from daemon.rate_limiter import SimpleRateLimiter, RateLimitManager

def test_config_manager():
    """測試配置管理器"""
    print("=== 測試 ConfigManager ===")

    project_root = Path(__file__).parent
    config_manager = ConfigManager(project_root)

    # 讀取配置
    config = config_manager.read_config()
    print(f"配置版本: {config.get('version')}")
    print(f"預設搜尋引擎: {config.get('active')}")

    # 測試搜尋引擎配置
    duckduckgo_config = config_manager.get_search_engine_config("duckduckgo")
    print(f"DuckDuckGo 配置: {duckduckgo_config}")

    # 測試啟用狀態
    is_enabled = config_manager.is_search_engine_enabled("duckduckgo")
    print(f"DuckDuckGo 啟用狀態: {is_enabled}")

    # 測試環境變數覆蓋
    os.environ["SERPER_API_KEY"] = "test_api_key_123"
    config_with_env = config_manager.apply_env_overrides(config.copy())

    # 檢查配置是否正確
    assert config_with_env["search_engines"]["serper"]["api_key"] == "test_api_key_123"
    print("環境變數覆蓋測試通過")

    print()

def test_api_key_manager():
    """測試 API 金鑰管理器"""
    print("=== 測試 ApiKeyManager ===")

    project_root = Path(__file__).parent
    config_manager = ConfigManager(project_root)
    api_key_manager = ApiKeyManager(config_manager)

    # 設置測試金鑰
    test_key = "sk-test-1234567890abcdef1234567890abcdef"
    api_key_manager.set_key("test_service", test_key)

    # 測試獲取金鑰
    retrieved_key = api_key_manager.get_key("test_service")
    print(f"獲取到的金鑰: {retrieved_key[:20]}...")
    assert retrieved_key == test_key

    # 測試金鑰遮擋
    sensitive_text = f"錯誤: API 金鑰 {test_key} 無效"
    redacted = api_key_manager.redact(sensitive_text)
    print(f"遮擋前: {sensitive_text}")
    print(f"遮擋後: {redacted}")
    assert "[REDACTED]" in redacted

    # 測試服務列表
    services = api_key_manager.get_all_services()
    print(f"所有服務: {services}")

    print()

def test_rate_limiter():
    """測試速率限制器"""
    print("=== 測試 SimpleRateLimiter ===")

    # 創建限制器：每2秒最多3個請求
    limiter = SimpleRateLimiter(max_requests=3, period=2.0)

    # 測試連續請求
    start_time = time.time()

    for i in range(5):
        # 等待（如果需要）
        limiter.wait_if_needed()
        current_time = time.time()
        elapsed = current_time - start_time
        print(f"請求 {i+1}: 總時間 {elapsed:.2f}s")

    # 檢查統計
    stats = limiter.get_stats()
    print(f"限制器統計: {stats}")

    print()

def test_rate_limit_manager():
    """測試速率限制管理器"""
    print("=== 測試 RateLimitManager ===")

    manager = RateLimitManager()

    # 測試不同服務的限制器
    services = ["duckduckgo", "serper", "brave"]

    for service in services:
        limiter = manager.get_limiter(service)
        print(f"{service} 限制器: {limiter}")

        # 快速獲取幾個令牌
        for i in range(2):
            manager.wait_for_service(service)
            print(f"  {service} 請求 {i+1}: 完成")

    # 檢查所有統計
    all_stats = manager.get_all_stats()
    print(f"所有統計: {all_stats}")

def main():
    """執行所有測試"""
    print("開始測試配置管理系統...\n")

    try:
        test_config_manager()
        test_api_key_manager()
        test_rate_limiter()
        test_rate_limit_manager()

        print("所有測試通過！")
        return 0

    except Exception as e:
        print(f"測試失敗: {e}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    sys.exit(main())