#!/usr/bin/env python3
"""
測試搜尋引擎管理器
"""

import asyncio
import sys
import time
from pathlib import Path

# 添加 daemon 目錄到路徑
sys.path.insert(0, str(Path(__file__).parent))

from daemon.config_manager import ConfigManager
from daemon.api_key_manager import ApiKeyManager
from daemon.search_manager import SearchManager


async def test_search_manager():
    """測試搜尋管理器"""
    print("=== 測試 SearchManager ===")

    # 初始化管理器
    project_root = Path(__file__).parent
    config_manager = ConfigManager(project_root)
    api_key_manager = ApiKeyManager(config_manager)
    search_manager = SearchManager(config_manager, api_key_manager)

    # 測試引擎統計
    stats = search_manager.get_engine_stats()
    print(f"引擎統計: {stats}")

    # 測試可用引擎
    available_engines = search_manager.get_available_engines()
    print(f"可用引擎: {available_engines}")

    # 測試連線
    connection_results = await search_manager.test_all_engines()
    print(f"連線測試: {connection_results}")

    # 測試簡單搜尋
    print("\n--- 測試簡單搜尋 ---")
    result = await search_manager.search("Python programming")
    print(f"狀態: {result['status']}")
    print(f"使用引擎: {result['engines_used']}")
    print(f"結果數量: {result['total_results']}")
    print(f"耗時: {result['elapsed_time']}s")

    if result['status'] == 'success' and result['results']:
        for i, r in enumerate(result['results'][:3]):  # 顯示前3個結果
            print(f"\n結果 {i+1}:")
            print(f"  標題: {r.get('title', 'N/A')}")
            print(f"  摘要: {r.get('snippet', 'N/A')[:100]}...")
            print(f"  來源: {r.get('engine', 'N/A')}")
            print(f"  URL: {r.get('url', 'N/A')}")

    # 測試指定引擎搜尋
    print("\n--- 測試指定 DuckDuckGo 引擎搜尋 ---")
    if 'duckduckgo' in available_engines:
        result = await search_manager.search("test query", engine="duckduckgo")
        print(f"狀態: {result['status']}")
        print(f"使用引擎: {result['engines_used']}")
        print(f"結果數量: {result['total_results']}")

    # 測試空查詢
    print("\n--- 測試空查詢 ---")
    result = await search_manager.search("")
    print(f"狀態: {result['status']}")
    print(f"錯誤: {result.get('error', 'N/A')}")

    # 測試降級搜尋（使用不存在的引擎）
    print("\n--- 測試降級搜尋 ---")
    result = await search_manager.search("fallback test", engine="nonexistent")
    print(f"狀態: {result['status']}")
    print(f"使用引擎: {result['engines_used']}")
    print(f"結果數量: {result['total_results']}")

    return True


async def test_performance():
    """測試搜尋效能"""
    print("\n=== 測試搜尋效能 ===")

    project_root = Path(__file__).parent
    config_manager = ConfigManager(project_root)
    api_key_manager = ApiKeyManager(config_manager)
    search_manager = SearchManager(config_manager, api_key_manager)

    test_queries = [
        "Python",
        "機器學習",
        "人工智慧",
        "程式設計",
        "資料科學"
    ]

    total_time = 0
    successful_searches = 0

    for query in test_queries:
        start_time = time.time()
        try:
            result = await search_manager.search(query)
            elapsed = time.time() - start_time

            if result['status'] == 'success':
                successful_searches += 1
                print(f"[OK] '{query}': {elapsed:.2f}s, {result['total_results']} 結果")
            else:
                print(f"[FAIL] '{query}': 失敗 ({result.get('error', '未知錯誤')})")

            total_time += elapsed

        except Exception as e:
            print(f"[ERROR] '{query}': 異常 ({e})")

    if successful_searches > 0:
        avg_time = total_time / successful_searches
        print(f"\n平均搜尋時間: {avg_time:.2f}s")
        print(f"成功率: {successful_searches}/{len(test_queries)} ({successful_searches/len(test_queries)*100:.1f}%)")
    else:
        print("\n所有搜尋都失敗了")

    return successful_searches > 0


async def main():
    """主測試函數"""
    print("開始測試搜尋管理器...\n")

    try:
        # 測試搜尋管理器
        if not await test_search_manager():
            print("\n搜尋管理器測試失敗")
            return 1

        # 測試效能
        if not await test_performance():
            print("\n效能測試失敗")
            return 1

        print("\n所有測試通過！")
        return 0

    except Exception as e:
        print(f"\n測試失敗: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    # 設定環境變數進行測試
    import os
    os.environ["SERPER_API_KEY"] = "test_key_123"  # 測試用金鑰
    os.environ["BRAVE_API_KEY"] = "test_key_456"    # 測試用金鑰

    exit_code = asyncio.run(main())
    sys.exit(exit_code)