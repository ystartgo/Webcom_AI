#!/usr/bin/env python3
"""
簡單測試搜尋引擎
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from daemon.search_engines.duckduckgo import DuckDuckGoEngine


async def test_duckduckgo():
    """測試 DuckDuckGo 引擎"""
    print("測試 DuckDuckGo 引擎...")

    config = {
        "enabled": True,
        "api_url": "https://api.duckduckgo.com/",
        "timeout": 10,
        "max_results": 5,
        "requires_api_key": False
    }

    try:
        engine = DuckDuckGoEngine("test", config)
        print(f"引擎創建成功: {engine}")

        # 測試連線
        print("測試連線...")
        connected = await engine.test_connection()
        print(f"連線狀態: {connected}")

        print("嘗試執行搜尋...")
        try:
            results = await engine.search("Python")
            print(f"返回 {len(results)} 個結果")

            for i, result in enumerate(results[:3]):
                print(f"\n結果 {i+1}:")
                print(f"  標題: {result.title}")
                print(f"  摘要: {result.snippet[:100]}...")
                print(f"  URL: {result.url}")
        except Exception as e:
            print(f"搜尋錯誤: {type(e).__name__}: {e}")
            import traceback
            traceback.print_exc()

    except Exception as e:
        print(f"錯誤: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()

    return True


async def main():
    """主測試函數"""
    await test_duckduckgo()


if __name__ == "__main__":
    asyncio.run(main())