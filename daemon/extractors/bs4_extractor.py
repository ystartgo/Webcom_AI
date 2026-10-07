#!/usr/bin/env python3
"""
BeautifulSoup 4 (BS4) based Web Extractor.
This extractor implements advanced sanitization and hierarchical content detection patterns
to reliably extract main article bodies from complex web pages, mimicking best practices
observed in robust web scraping tools.

It inherits from the base WebExtractor class to handle networking and result standardization.
"""

import re
from typing import Optional, Dict, Any, List
from bs4 import BeautifulSoup
import aiohttp

# 假設 ExtractionResult 和 ExtractorError 已經從 base.py 導入
# 注意：在實際專案中，這裡需要處理正確的相對/絕對路徑導入。
try:
    from ..base import WebExtractor, ExtractionResult, ExtractorError
except ImportError:
    # 為了單獨測試文件結構完整性
    class DummyWebExtractor: pass
    class DummyExtractionResult: pass
    class DummyExtractorError(Exception): pass
    WebExtractor = DummyWebExtractor
    ExtractionResult = DummyExtractionResult
    ExtractorError = DummyExtractorError


class BS4Extractor(WebExtractor):
    """
    具體實現的 BS4 網頁提取器。
    使用 BeautifulSoup 和複雜的 HTML/CSS 選擇邏輯來確保高準確性內容提取。
    """

    def __init__(self, name: str, config: Dict[str, Any]):
        super().__init__(name, config)
        # 過載配置，可能需要更精細的設定
        pass


    async def _remove_unwanted_elements(self, soup: BeautifulSoup) -> BeautifulSoup:
        """
        移除網頁中的廣告、導航和腳本等非核心內容。
        這是一個強力的清理步驟，旨在提高信噪比。
        """
        # 1. 移除所有 script 和 style 標籤
        for script_or_style in soup(['script', 'style']):
            script_or_style.decompose()

        # 2. 嘗試移除常見的噪音容器 (這需要根據目標網站調整)
        noise_tags = ['nav', 'footer', 'header', 'aside', '.ad-container', '.sidebar']
        for tag in soup.find_all(noise_tags):
            soup.decompose(tag)

        # 3. 移除通過樣式隱藏的元素 (更複雜的邏輯，這裡簡化為一個範例)
        for element in soup.find_all(True):
            style = str(element.get('style', ''))
            if "display: none;" in style or "visibility: hidden" in style:
                element.decompose()

        return soup


    def _extract_title(self, soup: BeautifulSoup) -> str:
        """
        提取標準化標題。優先考慮OpenGraph或Twitter的meta標籤。
        """
        # 1. Meta Title (最高優先級 - 適用於分享卡片)
        og_title = soup.find('meta', property='og:title')
        if og_title and 'content' in og_title.get('content', ''):
            return og_title['content']

        twitter_title = soup.find('meta', attrs={'name': 'twitter:title'})
        if twitter_title and 'content' in twitter_title.get('content', ''):
            return twitter_title['content']

        # 2. HTML <title> 標籤 (標準)
        title_tag = soup.find('title')
        if title_tag:
            return title_tag.get_text(strip=True)

        # 3. H1 或 H2 標籤作為最後的備用方案 (常作為文章標題)
        h1 = soup.find('h1')
        if h1: return h1.get_text(strip=True)

        return "No Title Found"


    def _extract_main_content(self, soup: BeautifulSoup) -> str:
        """
        使用優先級別的選擇器來定位並提取頁面的主要文章內容。
        這比簡單地獲取 body 的文本更精準。
        """
        # 優先順序：Article > Main Role > Common Classes
        main_selectors = [
            'article',
            '[role="main"]',
            '.content',
            '.post-body'
        ]

        for selector in main_selectors:
            element = soup.select_one(selector)
            if element:
                # 成功定位主要內容區塊，提取其文本
                return element.get_text(separator='\n', strip=True)

        # 如果找不到特定的主要容器，則嘗試從 body/body的子元素中獲取所有可讀文本
        # 但這風險很高，所以通常只在上述都失敗時作為備用。
        all_text = soup.body.get_text(separator='\n', strip=True)
        return all_text


    def _clean_content(self, text: str) -> str:
        """
        進行內容的最終清理，包括移除多餘空格、空行和HTML實體。
        """
        # 1. 清理多個連續空格或換行符
        cleaned = re.sub(r'\s+', ' ', text).strip()

        # 2. 處理可能殘留的 HTML 實體 (如果內容來源不純淨)
        cleaned = cleaned.replace('&nbsp;', ' ').replace('&amp;','&').replace('&#39;','\'')

        return cleaned


    async def _perform_extraction(self, url: str, selector: Optional[str] = None, **kwargs) -> ExtractionResult:
        """
        核心邏輯：從網頁獲取HTML，清理標籤，提取內容。
        """
        try:
            html_content = await self.fetch_html(url)
        except ExtractorError as e:
            raise ExtractorError(f"Failed to fetch HTML for {url}: {str(e)}")

        # 使用 BeautifulSoup 進行解析，保留完整的DOM結構供後續操作
        soup = BeautifulSoup(html_content, 'lxml')

        # --- Step 1: 清理標籤和噪音元素 ---
        cleaned_soup = await self._remove_unwanted_elements(soup)

        # --- Step 2: 提取標準化內容 ---
        extracted_text = ""
        title = self._extract_title(cleaned_soup)

        if selector:
            # 如果用戶提供了 CSS Selector，使用它來精準定位 (高精度模式)
            element = cleaned_soup.select_one(selector)
            if element:
                extracted_text = element.get_text(separator='\n', strip=True)
        else:
            # 沒有提供選擇器，嘗試提取文章主要內容 (結構化模式)
            main_content = self._extract_main_content(cleaned_soup)
            if main_content:
                extracted_text = main_content

        # --- Step 3: 清理文本 ---
        final_content = self._clean_content(extracted_text)


        # --- Step 4: 返回結果 ---
        result = ExtractionResult(
            url=url,
            title=title,
            content=final_content,
            method=self.name,
            content_length=len(final_content),
            success=True,
            metadata={
                "original_selector": selector,
                "extracted_from_selectors": main_selectors # 記錄嘗試的選擇器
            }
        )
        return result

# --- End of BS4Extractor class ---