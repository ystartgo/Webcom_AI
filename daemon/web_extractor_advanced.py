#!/usr/bin/env python3
"""
Webcom AI - Advanced Web Extractor
完整的網頁內容提取解決方案
"""

import re
import asyncio
from typing import Dict, List, Optional, Tuple, Any
from urllib.parse import urlparse, urljoin
from datetime import datetime

import aiohttp
from bs4 import BeautifulSoup, Tag


class AdvancedWebExtractor:
    """進階網頁內容提取器"""
    
    def __init__(self, timeout: int = 15, max_content_length: int = 10000):
        self.timeout = timeout
        self.max_content_length = max_content_length
        self.user_agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        
        # 內容識別優先級
        self.content_selectors = [
            'article',  # HTML5 article
            'main',     # HTML5 main
            '[role="main"]',
            '.article-content',
            '.post-content',
            '.entry-content',
            '.story-content',
            '.content',
            '#content',
            '.main-content',
            '.article-body',
            '.post-body',
            '.story-body',
        ]
        
        # 標題識別優先級
        self.title_selectors = [
            'h1',
            '.title',
            '.headline',
            '.article-title',
            '.post-title',
            '[itemprop="headline"]',
            '[property="og:title"]',
            'meta[name="title"]',
            'title',
        ]
        
    async def extract(self, url: str, selector: str = "", 
                     include_metadata: bool = True) -> Dict[str, Any]:
        """
        提取網頁內容
        
        Args:
            url: 目標網址
            selector: CSS 選擇器（可選）
            include_metadata: 是否包含元數據
        
        Returns:
            包含內容和元數據的字典
        """
        try:
            # 1. 下載網頁
            html, response_info = await self._fetch_page(url)
            
            # 2. 解析 HTML
            soup = BeautifulSoup(html, 'html.parser')
            
            # 3. 清理 HTML
            self._clean_html(soup)
            
            # 4. 提取標題
            title = self._extract_title(soup, url)
            
            # 5. 提取內容
            if selector:
                content, extraction_method = self._extract_by_selector(soup, selector)
            else:
                content, extraction_method = self._extract_main_content(soup)
            
            # 6. 清理和格式化內容
            cleaned_content = self._clean_content(content)
            
            # 7. 提取元數據
            metadata = {}
            if include_metadata:
                metadata = self._extract_metadata(soup)
            
            # 8. 計算內容品質
            quality_metrics = self._calculate_quality_metrics(cleaned_content, title)
            
            # 9. 建立回應
            result = {
                "status": "success",
                "url": url,
                "title": title[:200],  # 限制標題長度
                "content": cleaned_content[:self.max_content_length],
                "content_length": len(cleaned_content),
                "excerpt": self._create_excerpt(cleaned_content),
                "extraction_method": extraction_method,
                "selector_used": selector if selector else None,
                "metadata": metadata,
                "quality_metrics": quality_metrics,
                "response_info": response_info,
                "timestamp": datetime.now().isoformat(),
            }
            
            return result
            
        except Exception as e:
            return {
                "status": "error",
                "url": url,
                "error": str(e),
                "error_type": type(e).__name__,
                "timestamp": datetime.now().isoformat()
            }
    
    async def _fetch_page(self, url: str) -> Tuple[str, Dict]:
        """下載網頁內容"""
        timeout = aiohttp.ClientTimeout(total=self.timeout)
        
        async with aiohttp.ClientSession(timeout=timeout) as session:
            headers = {
                "User-Agent": self.user_agent,
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "zh-TW,zh;q=0.9,en;q=0.8",
            }
            
            try:
                async with session.get(url, headers=headers) as response:
                    response_info = {
                        "status": response.status,
                        "content_type": response.headers.get('Content-Type', ''),
                        "final_url": str(response.url),
                        "redirected": response.history and len(response.history) > 0,
                    }
                    
                    if response.status != 200:
                        raise Exception(f"HTTP {response.status}: {response.reason}")
                    
                    html = await response.text(encoding='utf-8', errors='replace')
                    
                    # 檢查內容是否過大
                    if len(html) > 2000000:  # 2MB
                        html = html[:2000000]
                        response_info["truncated"] = True
                    
                    return html, response_info
                    
            except asyncio.TimeoutError:
                raise Exception(f"請求超時 ({self.timeout}秒)")
            except aiohttp.ClientError as e:
                raise Exception(f"網路錯誤: {str(e)}")
    
    def _clean_html(self, soup: BeautifulSoup):
        """清理 HTML，移除不必要的元素"""
        # 移除 script, style, noscript
        for tag in soup(["script", "style", "noscript"]):
            tag.decompose()
        
        # 移除常見的廣告和導覽元素
        ad_selectors = [
            '.ad', '.ads', '.advertisement', '.ad-container',
            '.banner', '.sponsored', '.promoted',
            '.navbar', '.nav', '.menu', '.sidebar',
            '.footer', '.share-buttons', '.social-share',
            '.comments', '.comment-section', '.related-articles',
            '.recommendations', '.newsletter', '.subscribe',
        ]
        
        for selector in ad_selectors:
            for element in soup.select(selector):
                element.decompose()
        
        # 移除空白元素
        for element in soup.find_all():
            if isinstance(element, Tag):
                text = element.get_text(strip=True)
                if not text or text.isspace() or len(text) < 5:
                    # 保留短元素如 h1, h2 等標題
                    if element.name not in ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']:
                        element.decompose()
    
    def _extract_title(self, soup: BeautifulSoup, url: str) -> str:
        """提取標題"""
        # 嘗試多種標題來源
        for selector in self.title_selectors:
            if selector.startswith('meta'):
                # 處理 meta 標籤
                if selector == '[property="og:title"]':
                    meta = soup.select_one('meta[property="og:title"]')
                elif selector == 'meta[name="title"]':
                    meta = soup.select_one('meta[name="title"]')
                
                if meta and meta.get('content'):
                    title = meta['content'].strip()
                    if title:
                        return title
            else:
                # 處理一般元素
                element = soup.select_one(selector)
                if element:
                    text = element.get_text(strip=True)
                    if text:
                        return text
        
        # 回退到 URL
        parsed = urlparse(url)
        return parsed.netloc or url
    
    def _extract_by_selector(self, soup: BeautifulSoup, selector: str) -> Tuple[str, str]:
        """根據 CSS 選擇器提取內容"""
        try:
            elements = soup.select(selector)
            
            if not elements:
                raise Exception(f"選擇器 '{selector}' 未找到任何元素")
            
            # 提取所有匹配元素的文本
            texts = []
            for element in elements:
                if isinstance(element, Tag):
                    # 清理元素內的垃圾
                    for tag in element(["script", "style", "nav", "footer", "header"]):
                        tag.decompose()
                    
                    text = element.get_text(separator='\n', strip=True)
                    if text:
                        texts.append(text)
            
            if not texts:
                raise Exception(f"選擇器 '{selector}' 找到元素但沒有文字內容")
            
            content = '\n\n'.join(texts)
            return content, f"CSS選擇器: {selector}"
            
        except Exception as e:
            # 如果選擇器提取失敗，回退到自動提取
            return self._extract_main_content(soup)
    
    def _extract_main_content(self, soup: BeautifulSoup) -> Tuple[str, str]:
        """自動提取主要內容"""
        # 嘗試各種內容選擇器
        for selector in self.content_selectors:
            elements = soup.select(selector)
            if elements:
                # 選擇最大的元素（通常包含最多內容）
                largest = max(elements, key=lambda x: len(x.get_text()))
                text = largest.get_text(separator='\n', strip=True)
                if text and len(text) > 100:
                    return text, f"自動識別: {selector}"
        
        # 如果常見選擇器失敗，嘗試提取所有段落
        paragraphs = soup.find_all('p')
        if paragraphs:
            texts = []
            for p in paragraphs:
                text = p.get_text(strip=True)
                if text and len(text) > 20:  # 過濾太短的段落
                    texts.append(text)
            
            if texts:
                content = '\n\n'.join(texts)
                if len(content) > 50:
                    return content, "段落提取"
        
        # 最終回退：提取 body 內容
        body = soup.find('body')
        if body:
            content = body.get_text(separator='\n', strip=True)
            if content:
                return content, "body回退"
        
        # 如果所有方法都失敗，返回空內容
        return "", "無內容可提取"
    
    def _extract_metadata(self, soup: BeautifulSoup) -> Dict[str, Any]:
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
            '.byline',
            '.article-author',
            '.post-author'
        ]
        
        for selector in author_selectors:
            element = soup.select_one(selector)
            if element:
                if selector.startswith('meta'):
                    author = element.get('content', '')
                else:
                    author = element.get_text(strip=True)
                
                if author:
                    metadata['author'] = author
                    break
        
        # 發布日期
        date_selectors = [
            'meta[property="article:published_time"]',
            'meta[name="article:published_time"]',
            'time[datetime]',
            '.date',
            '.published',
            '.post-date',
            '[itemprop="datePublished"]'
        ]
        
        for selector in date_selectors:
            element = soup.select_one(selector)
            if element:
                date = element.get('datetime') or element.get('content') or element.get_text(strip=True)
                if date:
                    metadata['published_date'] = date
                    break
        
        # 關鍵字
        keywords = soup.select_one('meta[name="keywords"]')
        if keywords and keywords.get('content'):
            metadata['keywords'] = [k.strip() for k in keywords['content'].split(',')]
        
        # 語言
        html_tag = soup.find('html')
        if html_tag and html_tag.get('lang'):
            metadata['language'] = html_tag['lang']
        
        return metadata
    
    def _clean_content(self, content: str) -> str:
        """清理和格式化內容"""
        if not content:
            return ""
        
        # 移除多餘空白
        content = re.sub(r'\n\s*\n\s*\n+', '\n\n', content)
        
        # 移除重複的空白
        content = re.sub(r'[ \t]+', ' ', content)
        
        # 移除開頭和結尾的空白
        content = content.strip()
        
        # 移除純標點符號的行
        lines = content.split('\n')
        cleaned_lines = []
        for line in lines:
            stripped = line.strip()
            if stripped and not re.match(r'^[\s\.,;!?\-]*$', stripped):
                cleaned_lines.append(stripped)
        
        content = '\n'.join(cleaned_lines)
        
        # 限制長度
        if len(content) > self.max_content_length:
            content = content[:self.max_content_length] + "...[內容被截斷]"
        
        return content
    
    def _create_excerpt(self, content: str, length: int = 200) -> str:
        """建立摘要"""
        if not content:
            return ""
        
        # 取前 length 個字符
        excerpt = content[:length]
        
        # 確保摘要以完整句子結束
        if len(content) > length:
            # 找最後一個句號、問號或驚嘆號
            last_punctuation = max(
                excerpt.rfind('。'),
                excerpt.rfind('.'),
                excerpt.rfind('!'),
                excerpt.rfind('?'),
                excerpt.rfind('」'),
                excerpt.rfind('）')
            )
            
            if last_punctuation > length * 0.5:  # 如果找到了合適的標點
                excerpt = excerpt[:last_punctuation + 1]
        
        if len(content) > length:
            excerpt += "..."
        
        return excerpt
    
    def _calculate_quality_metrics(self, content: str, title: str) -> Dict[str, Any]:
        """計算內容品質指標"""
        metrics = {
            "has_content": bool(content),
            "content_length": len(content),
            "has_title": bool(title),
            "title_length": len(title),
            "avg_sentence_length": 0,
            "paragraph_count": 0,
        }
        
        if content:
            # 計算句子長度
            sentences = re.split(r'[。.!?]+', content)
            valid_sentences = [s.strip() for s in sentences if s.strip()]
            if valid_sentences:
                metrics["avg_sentence_length"] = sum(len(s) for s in valid_sentences) / len(valid_sentences)
            
            # 計算段落數
            metrics["paragraph_count"] = len([p for p in content.split('\n\n') if p.strip()])
            
            # 內容密度（非空白字符比例）
            non_whitespace = len(re.sub(r'\s', '', content))
            metrics["content_density"] = non_whitespace / len(content) if len(content) > 0 else 0
        
        return metrics


# 簡化的 API 函數
async def advanced_web_extract(url: str, selector: str = "", 
                              timeout: int = 15) -> Dict:
    """進階網頁提取 API 函數"""
    extractor = AdvancedWebExtractor(timeout=timeout)
    return await extractor.extract(url, selector)