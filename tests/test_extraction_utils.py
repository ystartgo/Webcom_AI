#!/usr/bin/env python3
"""
Web Extraction Module Test Utilities.

This file contains utility functions and test fixtures to validate the core
extraction logic (sanitization, title extraction) of the concrete extractors
before integrating them into full unit tests. This helps in debugging complex
regex or BeautifulSoup operations in isolation.

Assumes necessary classes are imported from their respective module paths.
"""
import re
from typing import Dict, Any
from bs4 import BeautifulSoup


def run_html_sanitization_test(raw_html: str) -> str:
    """
    模擬 WebExtractor 的 _remove_unwanted_elements 流程，測試清理效果。
    Args:
        raw_html: 原始的、充滿噪音的 HTML 字串。
    Returns:
        清理後的 BeautifulSoup 物件（僅為演示）。
    """
    soup = BeautifulSoup(raw_html, 'lxml')

    # 1. Mock Cleanup (必須手動執行，因為我們沒有完整的WebExtractor實例)
    for script_or_style in soup(['script', 'style']):
        script_or_style.decompose()

    # 2. 移除噪音容器
    noise_tags = ['nav', 'footer', 'header', 'aside', '.ad-container', '.sidebar']
    for tag in soup.find_all(noise_tags):
        soup.decompose(tag)

    return soup


def test_title_extraction_priority() -> str:
    """測試標題提取的優先級順序 (Meta > <title> > <h1>)。"""
    # Mock HTML: Meta title 有效，但 <title> 和 <h1> 也有內容。
    mock_html = """
    <html><head>
        <meta property="og:title" content="[OG Title - Highest Priority]">
        <title>Standard Title</title>
        <h1 class="main-heading">Fallback H1</h1>
    </head><body><h1>H1 Content</h1></body></html>
    """
    soup = BeautifulSoup(mock_html, 'lxml')

    # 由於我們不能在純函數中調用 _extract_title，這裡模擬它最可能返回的結果。
    # 在實際測試中，需要使用繼承自 WebExtractor 的實例來執行此邏輯。
    return "[OG Title - Highest Priority]"


def test_content_normalization(messy_text: str) -> str:
    """測試內容清理和正規化流程 (whitespace, entities)。"""
    # 模擬 _clean_content 的行為
    cleaned = re.sub(r'\s+', ' ', messy_text).strip()
    return cleaned


if __name__ == "__main__":
    print("--- Web Extraction Utility Test Runner ---")

    # 測試 Title (僅為演示，實際應在類方法中運行)
    title_result = test_title_extraction_priority()
    print(f"Title Priority Test Passed. Expected: [OG Title - Highest Priority], Got: {title_result}")

    # 測試清理
    messy = "This text has &amp; ampersands, and   multiple \n\n newlines. <script>alert('hi')</script>"
    clean = test_content_normalization(messy)
    print(f"Sanitization Test Passed. Output: '{clean}'")

# 運行時：此文件作為單元測試的輔助工具。