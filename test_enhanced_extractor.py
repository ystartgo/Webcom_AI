#!/usr/bin/env python3
"""
測試增強版網頁提取器
"""

import asyncio
import sys
sys.path.insert(0, '.')

from daemon.web_extractor_v2 import EnhancedWebExtractor


async def test_extractor():
    """測試提取器"""
    print("=== 增強版網頁提取器測試 ===")
    
    extractor = EnhancedWebExtractor(timeout=15)
    
    # 測試不同類型的網站
    test_urls = [
        "https://example.com",  # 簡單測試頁面
        "https://httpbin.org/html",  # 純 HTML 測試
        "https://news.ycombinator.com",  # 新聞網站
    ]
    
    for url in test_urls:
        print(f"\n測試: {url}")
        print("-" * 50)
        
        try:
            result = await extractor.extract(url)
            
            if result["status"] == "success":
                print(f"狀態: ✅ 成功")
                print(f"標題: {result['title']}")
                print(f"內容長度: {result['content_length']} 字符")
                print(f"摘要: {result['excerpt']}")
                
                if result['metadata']:
                    print(f"元數據: {result['metadata']}")
                
                # 顯示前200字符的內容
                if result['content']:
                    preview = result['content'][:200]
                    print(f"內容預覽: {preview}...")
            else:
                print(f"狀態: ❌ 失敗")
                print(f"錯誤: {result.get('error', '未知錯誤')}")
                
        except Exception as e:
            print(f"異常: {e}")
    
    print("\n=== CSS 選擇器測試 ===")
    print("測試: https://example.com 使用 h1 選擇器")
    
    try:
        result = await extractor.extract("https://example.com", selector="h1")
        if result["status"] == "success":
            print(f"狀態: ✅ 成功")
            print(f"提取內容: {result['content'][:100]}...")
        else:
            print(f"狀態: ❌ 失敗")
    except Exception as e:
        print(f"異常: {e}")


async def test_performance():
    """測試效能"""
    print("\n=== 效能測試 ===")
    
    extractor = EnhancedWebExtractor(timeout=10)
    
    import time
    
    start_time = time.time()
    result = await extractor.extract("https://example.com")
    end_time = time.time()
    
    print(f"提取時間: {end_time - start_time:.2f} 秒")
    print(f"狀態: {result['status']}")
    
    if result["status"] == "success":
        print(f"內容提取速度: {result['content_length'] / (end_time - start_time):.0f} 字符/秒")


async def main():
    """主測試函數"""
    await test_extractor()
    await test_performance()
    
    print("\n=== 測試完成 ===")
    print("總結: 增強版網頁提取器已實現以下改進:")
    print("1. 更智慧的內容識別 (article, main, content 等)")
    print("2. 更好的標題提取策略")
    print("3. 元數據提取 (描述、作者、日期)")
    print("4. 內容清理和格式化")
    print("5. 錯誤處理和降級機制")
    print("6. CSS 選擇器支援")


if __name__ == "__main__":
    asyncio.run(main())