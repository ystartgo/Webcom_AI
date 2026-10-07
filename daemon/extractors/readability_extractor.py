#!/usr/bin/env python3
"""
Readability-based Web Extractor.

This extractor attempts to emulate the logic of dedicated readability tools (like
Medium's or Mozilla's) by focusing on clean, article-like text structures, rather
than relying solely on CSS selectors or basic DOM traversal. It provides a more
human-readable output, even if slightly less precise than BS4 + selector targeting.

It inherits from WebExtractor to handle networking and standardization.
"""
import re
from typing import Optional, Dict, Any
from bs4 import BeautifulSoup

# 假設 ExtractionResult 和 ExtractorError 已經從 base.py 導入
try:
    from ..base import WebExtractor, ExtractionResult, ExtractorError
except ImportError:
    class DummyWebExtractor: pass
    class DummyExtractionResult: pass
    class DummyExtractorError(Exception): pass
    WebExtractor = DummyWebExtractor
    ExtractionResult = DummyExtractionResult
    ExtractorError = DummyExtractorError


class ReadabilityExtractor(WebExtractor):
    """
    具體實現的 Readability 網頁提取器。
    模擬閱讀器的效果，去除大部分雜訊並優化排版。
    """

    def __init__(self, name: str, config: Dict[str, Any]):
        super().__init__(name, config)
        # 可選配置：調整內容密度或過濾的元素類型
        pass


    async def _remove_unwanted_elements(self, soup: BeautifulSoup) -> BeautifulSoup:
        """
        基於閱讀器原理，移除大量非文本內容（如圖片、廣告佔位符等）。
        此處沿用通用清理邏輯，但可以在這裡增加更激進的圖片/媒體移除規則。
        """
        # 繼承 BS4 的清理步驟 (保持一致性)
        for script_or_style in soup(['script', 'style']):
            script_or_style.decompose()

        return super()._remove_unwanted_elements(soup)


    def _extract_main_content(self, soup: BeautifulSoup) -> str:
        """
        嘗試尋找最有可能包含正文的結構，但邏輯比BS4更保守。
        例如，傾向於在 body 的中心區域查找主要內容。
        """
        # 1. 再次使用強勢選擇器作為第一道防線 (不與 BS4 的 selector 衝突)
        main_selectors = [
            'article',
            '[role="main"]',
            '.content-body', # 更常見的類名備用
        ]

        for selector in main_selectors:
            element = soup.select_one(selector)
            if element:
                # 提取文本，但會保留一定的結構（例如按段落分割）
                return element.get_text(separator='\n\n', strip=True)


        # 2. 如果所有選擇器都失敗，嘗試從 body 的第一個主要區塊獲取內容
        if soup.body:
            # 這是一個折衷方案：只提取 body 中前 N 個段落的文本。
            paragraphs = [p for p in soup.find_all('p')][:15] # 限制最多考慮 15 個 <p> 標籤
            text_parts = ["\n\n".join([p.get_text(strip=True) for p in paragraphs])]
            return "\n\n".join(text_parts)


        return ""

    def _clean_content(self, text: str) -> str:
        """
        與 BS4Extractor 保持一致的內容清理流程。
        """
        # (可直接調用父類或共享一個工具函數，但為獨立文件故複製邏輯)
        cleaned = re.sub(r'\s+', ' ', text).strip()
        cleaned = cleaned.replace('&nbsp;', ' ').replace('&amp;','&').replace('&#39;','\'')
        return cleaned


    async def _perform_extraction(self, url: str, selector: Optional[str] = None, **kwargs) -> ExtractionResult:
        """
        核心邏輯：運行閱讀器提取流程。
        """
        try:
            # 獲取原始 HTML 和一個基於 BS4 的清理過後的 soup 對象進行操作
            html_content = await self.fetch_html(url)
            soup = BeautifulSoup(html_content, 'lxml')

            # --- Step 1: 清理標籤和噪音元素 (使用父類的方法，確保一致性) ---
            cleaned_soup = await self._remove_unwanted_elements(soup)

            # --- Step 2: 提取標準化內容 ---
            extracted_text = ""
            title = self._extract_title(cleaned_soup) # 重用父類的標題提取邏輯

            if selector:
                element = cleaned_soup.select_one(selector)
                if element:
                    extracted_text = element.get_text(separator='\n', strip=True)
            else:
                # 使用 Readability 的專有內容提取方法
                main_content = self._extract_main_content(cleaned_soup)
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
                    "extracted_from_selectors": [] # Readability 提取通常不依賴單一選擇器，可留空或記錄備用列表
                }
            )
            return result

        except ExtractorError as e:
            raise ExtractorError(f"Readability extraction failed: {str(e)}")

# --- End of ReadabilityExtractor class ---