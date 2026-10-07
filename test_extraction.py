#!/usr/bin/env python3
"""
測試網頁提取管理器
"""

import asyncio
import sys
import time
from pathlib import Path

# 添加 daemon 目錄到路徑
sys.path.insert(0, str(Path(__file__).parent))

from daemon.config_manager import ConfigManager
from daemon.extraction_manager import ExtractionManager


async def test_extraction_manager():
    """測試提取管理器"""
    print("=== 測試 ExtractionManager ===")

    # 初始化管理器
    project_root = Path(__file__).parent
    config_manager = ConfigManager(project_root)
    extraction_manager = ExtractionManager(config_manager)

    # 測試提取器統計
    stats = extraction_manager.get_extractor_stats()
    print(f"提取器統計: {stats}")

    # 測試可用方法
    available_methods = extraction_manager.get_available_methods()
    print(f"可用方法: {available_methods}")

    # 測試連線
    connection_results = await extraction_manager.test_all_extractors()
    print(f"連線測試: {connection_results}")

    # 測試簡單提取
    print("\n--- 測試簡單網頁提取 ---")
    test_url = "https://example.com"
    result = await extraction_manager.extract(test_url)

    print(f"狀態: {result['status']}")
    print(f"使用方法: {result.get('method', 'N/A')}")
    print(f"標題: {result.get('title', 'N/A')}")
    print(f"內容長度: {result.get('content_length', 0)}")
    print(f"耗時: {result.get('elapsed_time', 0)}s")

    if result['status'] == 'success' and result.get('content'):
        print(f"\n內容預覽 (前200字):")
        print(result['content'][:200])

    # 測試 CSS 選擇器提取
    print("\n--- 測試 CSS 選擇器提取 ---")
    result_with_selector = await extraction_manager.extract(
        "https://example.com",
        selector="h1"
    )
    print(f"狀態: {result_with_selector['status']}")
    print(f"內容: {result_with_selector.get('content', 'N/A')[:100]}")

    # 測試空 URL
    print("\n--- 測試空 URL ---")
    empty_result = await extraction_manager.extract("")
    print(f"狀態: {empty_result['status']}")
    print(f"錯誤: {empty_result.get('error', 'N/A')}")

    # 測試無效 URL
    print("\n--- 測試無效 URL ---")
    invalid_result = await extraction_manager.extract("not-a-url")
    print(f"狀態: {invalid_result['status']}")

    # 測試快取
    print("\n--- 測試快取功能 ---")
    start = time.time()
    cached_result = await extraction_manager.extract(test_url)
    first_time = time.time() - start

    start = time.time()
    cached_result_2 = await extraction_manager.extract(test_url)
    second_time = time.time() - start

    print(f"第一次提取: {first_time:.3f}s")
    print(f"第二次提取: {second_time:.3f}s (應該更快)")
    print(f"來源標記: {cached_result_2.get('source', 'N/A')}")

    return True


async def test_multiple_sites():
    """測試多個網站的提取"""
    print("\n=== 測試多個網站 ===")

    project_root = Path(__file__).parent
    config_manager = ConfigManager(project_root)
    extraction_manager = ExtractionManager(config_manager)

    test_sites = [
        ("https://example.com", "Example Domain"),
        ("https://httpbin.org/html", "HTTPBin"),
        ("https://www.python.org", "Python.org"),
    ]

    successful = 0

    for url, name in test_sites:
        print(f"\n測試: {name} ({url})")
        start = time.time()

        try:
            result = await extraction_manager.extract(url)
            elapsed = time.time() - start

            if result['status'] == 'success':
                successful += 1
                print(f"  [OK] {elapsed:.2f}s, 內容長度: {result.get('content_length', 0)}")
                print(f"  標題: {result.get('title', 'N/A')[:100]}")
            else:
                print(f"  [FAIL] {result.get('error', '未知錯誤')}")

        except Exception as e:
            print(f"  [ERROR] {e}")

    print(f"\n成功提取: {successful}/{len(test_sites)}")
    return successful > 0


async def main():
    """主測試函數"""
    print("開始測試網頁提取管理器...\n")

    try:
        # 測試提取管理器
        if not await test_extraction_manager():
            print("\n提取管理器測試失敗")
            return 1

        # 測試多個網站
        if not await test_multiple_sites():
            print("\n多網站測試失敗")
            return 1

        print("\n所有測試完成！")
        return 0

    except Exception as e:
        print(f"\n測試失敗: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)