#!/usr/bin/env python3
"""
測試搜尋引擎整合功能
"""

import asyncio
import aiohttp
import json
import urllib.parse

async def test_duckduckgo():
    """測試 DuckDuckGo API"""
    print("=== 測試 DuckDuckGo API ===")
    
    query = "天氣"
    encoded_query = urllib.parse.quote(query)
    url = f"https://api.duckduckgo.com/?q={encoded_query}&format=json&pretty=1&no_html=1&skip_disambig=1"
    
    headers = {
        "User-Agent": "Webcom-AI-Hermes/2.2.0 (https://github.com/startgo/webcom_ai)"
    }
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers=headers, timeout=10) as response:
                print(f"狀態碼: {response.status}")
                print(f"Content-Type: {response.headers.get('Content-Type')}")
                
                content = await response.text()
                print(f"內容長度: {len(content)} 字節")
                
                try:
                    data = json.loads(content)
                    print(f"JSON 解析成功")
                    print(f"AbstractText: {data.get('AbstractText', 'N/A')[:50]}...")
                    print(f"RelatedTopics 數量: {len(data.get('RelatedTopics', []))}")
                    print(f"Results 數量: {len(data.get('Results', []))}")
                    
                    # 提取結果
                    results = []
                    if data.get("AbstractText"):
                        results.append({
                            "title": data.get("Heading", f"搜尋結果: {query}"),
                            "snippet": data.get("AbstractText", "")[:100],
                            "source": "DuckDuckGo Abstract"
                        })
                    
                    for topic in data.get("RelatedTopics", [])[:3]:
                        if isinstance(topic, dict) and topic.get("Text"):
                            results.append({
                                "title": topic.get("FirstURL", "").split("/")[-1].replace("_", " ") if topic.get("FirstURL") else "相關主題",
                                "snippet": topic.get("Text", "")[:100],
                                "source": "DuckDuckGo Related Topics"
                            })
                    
                    print(f"提取的結果數量: {len(results)}")
                    return True
                    
                except json.JSONDecodeError as e:
                    print(f"JSON 解析錯誤: {e}")
                    print(f"內容前 200 字符: {content[:200]}")
                    return False
                    
    except Exception as e:
        print(f"請求失敗: {e}")
        return False

async def test_web_extract():
    """測試網頁抓取"""
    print("\n=== 測試網頁抓取 ===")
    
    url = "https://example.com"
    
    try:
        async with aiohttp.ClientSession() as session:
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            }
            
            async with session.get(url, headers=headers, timeout=10) as response:
                print(f"狀態碼: {response.status}")
                html = await response.text()
                print(f"HTML 長度: {len(html)} 字符")
                print(f"標題檢查: {'Example Domain' in html}")
                return True
                
    except Exception as e:
        print(f"網頁抓取失敗: {e}")
        return False

async def main():
    """主測試函數"""
    print("Webcom AI 搜尋引擎整合測試")
    print("=" * 50)
    
    # 測試 DuckDuckGo
    ddg_success = await test_duckduckgo()
    
    # 測試網頁抓取
    extract_success = await test_web_extract()
    
    print("\n=== 測試總結 ===")
    print(f"DuckDuckGo API: {'✓ 成功' if ddg_success else '✗ 失敗'}")
    print(f"網頁抓取: {'✓ 成功' if extract_success else '✗ 失敗'}")
    
    if ddg_success and extract_success:
        print("\n✅ 所有測試通過！")
        return 0
    else:
        print("\n❌ 部分測試失敗")
        return 1

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    exit(exit_code)