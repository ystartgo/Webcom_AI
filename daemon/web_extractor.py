#!/usr/bin/env python3
"""
Webcom AI - Web Extractor Compatibility Module

This module is kept as a stable import path and delegates to the current
advanced BeautifulSoup-based extractor implementation.
"""

from typing import Dict

from daemon.web_extractor_advanced import AdvancedWebExtractor, advanced_web_extract


async def extract_web_content(url: str, selector: str = "", timeout: int = 15) -> Dict:
    """Compatibility helper for extracting webpage content."""
    return await advanced_web_extract(url=url, selector=selector, timeout=timeout)


__all__ = ["AdvancedWebExtractor", "advanced_web_extract", "extract_web_content"]
