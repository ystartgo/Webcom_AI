#!/usr/bin/env python3
"""
速率限制器 - 簡單版本
避免使用 async with 語法
"""

import time
import threading
from collections import deque
from typing import Dict, Optional
import logging

logger = logging.getLogger(__name__)


class SimpleRateLimiter:
    """
    簡單的速率限制器
    使用固定窗口算法
    """

    def __init__(self, max_requests: int = 30, period: float = 60.0):
        """
        初始化速率限制器

        Args:
            max_requests: 每 period 秒的最大請求數
            period: 時間週期（秒）
        """
        self.max_requests = max_requests
        self.period = period

        # 請求時間戳記隊列
        self.request_times = []

        # 同步鎖
        self._lock = threading.Lock()

    def check_limit(self) -> bool:
        """
        檢查是否超過限制

        Returns:
            True 如果未超過限制，False 如果超過限制
        """
        with self._lock:
            current_time = time.time()
            window_start = current_time - self.period

            # 清理舊的請求
            self.request_times = [t for t in self.request_times if t >= window_start]

            # 檢查是否超過限制
            if len(self.request_times) >= self.max_requests:
                return False

            # 記錄新的請求
            self.request_times.append(current_time)
            return True

    def wait_if_needed(self):
        """
        如果需要則等待
        """
        with self._lock:
            current_time = time.time()
            window_start = current_time - self.period

            # 清理舊的請求
            self.request_times = [t for t in self.request_times if t >= window_start]

            # 檢查是否超過限制
            if len(self.request_times) >= self.max_requests:
                # 計算需要等待的時間
                oldest_time = self.request_times[0]
                wait_time = oldest_time + self.period - current_time

                if wait_time > 0:
                    time.sleep(wait_time)
                    return True

            # 記錄新的請求
            self.request_times.append(current_time)
            return True

    def get_stats(self) -> Dict:
        """獲取統計資訊"""
        current_time = time.time()
        window_start = current_time - self.period

        recent_requests = len([t for t in self.request_times if t >= window_start])

        return {
            "max_requests": self.max_requests,
            "period": self.period,
            "recent_requests": recent_requests,
            "available_tokens": self.max_requests - recent_requests,
            "total_recorded": len(self.request_times)
        }

    def reset(self):
        """重置限制器"""
        with self._lock:
            self.request_times.clear()

    def __str__(self) -> str:
        stats = self.get_stats()
        return (f"SimpleRateLimiter(max={self.max_requests}/"
                f"{self.period}s, recent={stats['recent_requests']}, "
                f"available={stats['available_tokens']})")


class RateLimitManager:
    """
    多個速率限制器管理器

    用於管理不同服務的不同速率限制
    """

    def __init__(self):
        self.limiters = {}
        self.default_limits = {
            "duckduckgo": (30, 60),   # 30 requests / 60 seconds
            "serper": (10, 1),        # 10 requests / 1 second (burst)
            "brave": (10, 60),        # 10 requests / 60 seconds
            "default": (10, 60),      # 預設限制
        }

    def get_limiter(self, service: str) -> SimpleRateLimiter:
        """獲取或創建服務的速率限制器"""
        if service not in self.limiters:
            max_requests, period = self.default_limits.get(
                service, self.default_limits["default"]
            )
            self.limiters[service] = SimpleRateLimiter(max_requests, period)

        return self.limiters[service]

    def check_limit(self, service: str) -> bool:
        """檢查指定服務是否超過限制"""
        limiter = self.get_limiter(service)
        return limiter.check_limit()

    def wait_for_service(self, service: str):
        """為指定服務等待（如果需要）"""
        limiter = self.get_limiter(service)
        return limiter.wait_if_needed()

    def get_all_stats(self) -> Dict[str, Dict]:
        """獲取所有限制器的統計資訊"""
        return {
            service: limiter.get_stats()
            for service, limiter in self.limiters.items()
        }

    def reset_all(self):
        """重置所有限制器"""
        for limiter in self.limiters.values():
            limiter.reset()

    def set_limit(self, service: str, max_requests: int, period: float):
        """設置服務的速率限制"""
        if service in self.limiters:
            self.limiters[service].max_requests = max_requests
            self.limiters[service].period = period
        else:
            self.limiters[service] = SimpleRateLimiter(max_requests, period)