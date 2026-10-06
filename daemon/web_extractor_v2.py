#!/usr/bin/env python3
"""
Webcom AI - Enhanced Web Extractor
改進的網頁內容提取引擎
"""

import re
import json
import asyncio
from typing import Dict, List, Optional, Tuple, Any
from urllib.parse import urlparse, urljoin
from datetime import datetime

import aiohttp
from bs4 import BeautifulSoup, Tag


class EnhancedWebExtractor:
    """增強型網頁內容提取器"""
    
    def __init__(self, timeout: int = 15):
        self.timeout = timeout
        self.user_agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    
    async def extract(self, url: str, selector: str = "") -> Dict[str, Any]:
        """提取網頁內容"""
        try:
            # 1. 下載網頁
            html = await self._fetch_html(url)
            
            # 2. 解析 HTML
            soup = BeautifulSoup(html, 'html.parser')
            
            # 3. 清理
            self._clean_soup(soup)
            
            # 4. 提取標題
            title = self._extract_title(soup, url)
            
            # 5. 提取內容
            if selector:
                content = self._extract_by_selector(soup, selector)
            else:
                content = self._extract_main_content(soup)
            
            # 6. 提取元數據
            metadata = self._extract_metadata(soup)
            
            # 7. 處理內容
            cleaned_content = self._clean_content(content)
            
            return {
                "status": "success",
                "url": url,
                "title": title,
                "content": cleaned_content,
                "content_length": len(cleaned_content),
                "excerpt": cleaned_content[:200] + "..." if len(cleaned_content) > 200 else cleaned_content,
                "metadata": metadata,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            return {
                "status": "error",
                "url": url,
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
    
    async def _fetch_html(self, url: str) -> str:
        """下載 HTML"""
        timeout = aiohttp.ClientTimeout(total=self.timeout)
        
        async with aiohttp.ClientSession(timeout=timeout) as session:
            headers = {
                "User-Agent": self.user_agent,
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            }
            
            async with session.get(url, headers=headers) as response:
                if response.status != 200:
                    raise Exception(f"HTTP {response.status}")
                
                return await response.text()
    
    def _clean_soup(self, soup: BeautifulSoup):
        """清理 BeautifulSoup 物件"""
        # 移除 script 和 style
        for tag in soup(["script", "style"]):
            tag.decompose()
        
        # 移除空白元素
        for element in soup.find_all():
            if isinstance(element, Tag):
                text = element.get_text(strip=True)
                if not text or text.isspace():
                    element.decompose()
    
    def _extract_title(self, soup: BeautifulSoup, url: str) -> str:
        """提取標題"""
        # 嘗試多種標題來源
        if soup.title and soup.title.string:
            return soup.title.string.strip()
        
        # 嘗試 h1
        h1 = soup.find('h1')
        if h1 and h1.get_text(strip=True):
            return h1.get_text(strip=True)
        
        # 嘗試 og:title
        og_title = soup.find('meta', property='og:title')
        if og_title and og_title.get('content'):
            return og_title['content'].strip()
        
        # 回退到 URL
        parsed = urlparse(url)
        return parsed.netloc
    
    def _extract_by_selector(self, soup: BeautifulSoup, selector: str) -> str:
        """根據 CSS 選擇器提取"""
        elements = soup.select(selector)
        
        if not elements:
            raise Exception(f"選擇器 '{selector}' 未找到內容")
        
        texts = []
        for element in elements:
            if isinstance(element, Tag):
                # 清理元素內的垃圾
                for tag in element(["script", "style", "nav", "footer", "header"]):
                    tag.decompose()
                
                text = element.get_text(separator='\n', strip=True)
                if text:
                    texts.append(text)
        
        return '\n\n'.join(texts)
    
    def _extract_main_content(self, soup: BeautifulSoup) -> str:
        """自動提取主要內容"""
        # 嘗試常見的內容容器
        content_selectors = [
            'article',
            'main',
            '[role="main"]',
            '.content',
            '.article',
            '.post',
            '.story',
            '.entry-content',
            '#content',
            '.main-content'
        ]
        
        for selector in content_selectors:
            elements = soup.select(selector)
            if elements:
                # 選擇最大的元素
                largest = max(elements, key=lambda x: len(x.get_text()))
                text = largest.get_text(separator='\n', strip=True)
                if text and len(text) > 100:  # 至少有100字符
                    return text
        
        # 回退：提取所有段落
        paragraphs = soup.find_all('p')
        texts = []
        for p in paragraphs:
            text = p.get_text(strip=True)
            if text and len(text) > 20:  # 過濾太短的段落
                texts.append(text)
        
        if texts:
            return '\n\n'.join(texts)
        
        # 最終回退：body 內容
        body = soup.find('body')
        if body:
            return body.get_text(separator='\n', strip=True)
        
        return ""
    
    def _extract_metadata(self, soup: BeautifulSoup) -> Dict:
        """提取元數據"""
        metadata = {}
        
        # 描述
        desc_selectors = [
            'meta[name="description"]',
            'meta[property="og:description"]',
            'meta[name="twitter:description"]'
        ]
        
        for selector in desc_selectors:
            meta = soup.select_one(selector)
            if meta and meta.get('content'):
                metadata['description'] = meta['content'].strip()
                break
        
        # 作者
        author_selectors = [
            'meta[name="author"]',
            '[itemprop="author"]',
            '.author',
            '.byline'
        ]
        
        for selector in author_selectors:
            element = soup.select_one(selector)
            if element:
                text = element.get_text(strip=True)
                if text:
                    metadata['author'] = text
                    break
        
        # 發布日期
        date_selectors = [
            'meta[property="article:published_time"]',
            'time[datetime]',
            '.date',
            '.published',
            '[itemprop="datePublished"]'
        ]
        
        for selector in date_selectors:
            element = soup.select_one(selector)
            if element:
                date = element.get('datetime') or element.get('content') or element.get_text(strip=True)
                if date:
                    metadata['published_date'] = date
                    break
        
        return metadata
    
    def _clean_content(self, content: str) -> str:
        """清理內容"""
        if not content:
            return ""
        
        # 移除多餘空白
        content = re.sub(r'\n\s*\n\s*\n+', '\n\n', content)
        
        # 移除重複的空白
        content = re.sub(r'[ \t]+', ' ', content)
        
        # 移除開頭和結尾的空白
        content = content.strip()
        
        # 限制長度
        if len(content) > 10000:
            content = content[:10000] + "...[內容被截斷]"
        
        return content


# 簡化的 API 函數
async def enhanced_web_extract(url: str, selector: str = "", timeout: int = 15) -> Dict:
    """增強版網頁提取 API 函數"""
    extractor = EnhancedWebExtractor(timeout=timeout)
    return await extractor.extract(url, selector)