#!/usr/bin/env python3
"""
測試常見搜尋詞的 DuckDuckGo API 回應
"""

import asyncio
import aiohttp
import json
import urllib.parse

SEARCH_QUERIES = [
    "weather",           # 天氣 - 應該有結果
    "python",           # Python - 程式語言
    "artificial intelligence",  # 人工智慧
    "news",             # 新聞
    "Taiwan",           # 台灣
    "openai",           # OpenAI
    "weather Taipei",   # 台北天氣
]

async def test_query(query: str):
    """測試單個搜尋詞"""
    encoded_query = urllib.parse.quote(query)
    url = f"https://api.duckduckgo.com/?q={encoded_query}&format=json&pretty=1&no_html=1&skip_disambig=1"
    
    headers = {
        "User-Agent": "Webcom-AI-Hermes/2.2.0"
    }
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers=headers, timeout=10) as response:
                content = await response.text()
                data = json.loads(content)
                
                has_abstract = bool(data.get("AbstractText"))
                has_related = len(data.get("RelatedTopics", [])) > 0
                has_results = len(data.get("Results", [])) > 0
                has_answer = bool(data.get("Answer"))
                
                return {
                    "query": query,
                    "has_abstract": has_abstract,
                    "has_related": has_related,
                    "has_results": has_results,
                    "has_answer": has_answer,
                    "abstract_preview": data.get("AbstractText", "")[:50] if has_abstract else None,
                    "related_count": len(data.get("RelatedTopics", [])),
                    "results_count": len(data.get("Results", []))
                }
                
    except Exception as e:
        return {
            "query": query,
            "error": str(e)
        }

async def main():
    """測試多個搜尋詞"""
    print("測試多個搜尋詞的 DuckDuckGo API 回應")
    print("=" * 60)
    
    results = []
    for query in SEARCH_QUERIES:
        print(f"測試: {query}")
        result = await test_query(query)
        results.append(result)
    
    print("\n=== 測試結果總結 ===")
    print(f"總共測試: {len(results)} 個搜尋詞")
    
    successful = [r for r in results if "error" not in r]
    print(f"成功測試: {len(successful)} 個")
    
    print("\n詳細結果:")
    for result in results:
        if "error" in result:
            print(f"  {result['query']}: ❌ 錯誤 - {result['error']}")
        else:
            status = []
            if result["has_abstract"]: status.append("摘要")
            if result["has_related"]: status.append(f"相關({result['related_count']})")
            if result["has_results"]: status.append(f"結果({result['results_count']})")
            if result["has_answer"]: status.append("答案")
            
            status_str = ", ".join(status) if status else "無結果"
            print(f"  {result['query']}: {status_str}")
            
            if result.get("abstract_preview"):
                print(f"    摘要預覽: {result['abstract_preview']}...")
    
    print("\n建議的搜尋詞:")
    good_queries = [r["query"] for r in results if "error" not in r and (r["has_abstract"] or r["has_related"] or r["has_results"])]
    if good_queries:
        print("  " + ", ".join(good_queries[:5]))
    else:
        print("  無推薦搜尋詞")

if __name__ == "__main__":
    asyncio.run(main())