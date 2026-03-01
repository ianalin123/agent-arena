"""Goal progress verification — polls external sources to check agent progress."""

import logging
import time
from typing import Any

import httpx

logger = logging.getLogger(__name__)


class GoalVerifier:
    def __init__(
        self,
        sandbox_config: dict[str, Any],
        payments_tool: Any = None,
        email_tool: Any = None,
    ):
        self.config = sandbox_config
        self.goal_type = sandbox_config.get("goal_type", "")
        self.target = sandbox_config.get("target_value", 0)
        self.start_time = time.time()
        self.time_limit = sandbox_config.get("time_limit", 86400)
        self._current_progress: float = 0
        self._http = httpx.AsyncClient(timeout=15.0)
        self._payments = payments_tool
        self._email = email_tool

    @property
    def goal_achieved(self) -> bool:
        return self._current_progress >= self.target

    @property
    def time_expired(self) -> bool:
        return (time.time() - self.start_time) > self.time_limit

    @property
    def elapsed_seconds(self) -> float:
        return time.time() - self.start_time

    @property
    def remaining_seconds(self) -> float:
        return max(0, self.time_limit - self.elapsed_seconds)

    async def check_progress(self) -> float:
        """Poll external source for current goal progress."""
        try:
            if self.goal_type == "follower_count":
                self._current_progress = await self._scrape_follower_count()
            elif self.goal_type == "revenue":
                self._current_progress = await self._check_revenue()
            elif self.goal_type == "views":
                self._current_progress = await self._scrape_view_count()
            elif self.goal_type == "emails_booked":
                self._current_progress = await self._count_positive_replies()
        except Exception as e:
            logger.error("Progress check failed for %s: %s", self.goal_type, e)

        return self._current_progress

    async def _scrape_follower_count(self) -> float:
        """Scrape follower count from social platform.

        Uses a public profile endpoint approach. For X/Twitter, we attempt
        to read the follower count from the public profile page or API.
        """
        handle = self.config.get("account_handle", "")
        platform = self.config.get("platform", "twitter")

        if not handle:
            return self._current_progress

        if platform in ("twitter", "x"):
            try:
                resp = await self._http.get(
                    f"https://api.socialdata.tools/twitter/user/{handle}",
                    headers={"Authorization": f"Bearer {self.config.get('social_api_key', '')}"},
                )
                if resp.status_code == 200:
                    data = resp.json()
                    return float(data.get("followers_count", 0))
            except Exception as e:
                logger.debug("Twitter API scrape failed: %s", e)

            try:
                resp = await self._http.get(
                    f"https://nitter.net/{handle}",
                    headers={"User-Agent": "Mozilla/5.0"},
                )
                if resp.status_code == 200:
                    text = resp.text
                    import re
                    match = re.search(r'followers.*?(\d[\d,]*)', text, re.IGNORECASE)
                    if match:
                        return float(match.group(1).replace(",", ""))
            except Exception as e:
                logger.debug("Nitter scrape failed: %s", e)

        return self._current_progress

    async def _check_revenue(self) -> float:
        """Check revenue via Paylocus wallet transaction totals."""
        if not self._payments:
            return self._current_progress

        try:
            history = await self._payments.get_transaction_history()
            total_earned = sum(
                float(tx.get("amount_usdc", 0))
                for tx in history
                if tx.get("status") == "SUCCESS"
            )
            return total_earned
        except Exception as e:
            logger.debug("Revenue check failed: %s", e)
            return self._current_progress

    async def _scrape_view_count(self) -> float:
        """Scrape view count from content platform."""
        url = self.config.get("content_url", "")
        if not url:
            return self._current_progress

        try:
            resp = await self._http.get(url, headers={"User-Agent": "Mozilla/5.0"})
            if resp.status_code == 200:
                import re
                text = resp.text
                match = re.search(r'(\d[\d,]*)\s*views?', text, re.IGNORECASE)
                if match:
                    return float(match.group(1).replace(",", ""))
        except Exception as e:
            logger.debug("View count scrape failed: %s", e)

        return self._current_progress

    async def _count_positive_replies(self) -> float:
        """Count positive email replies via AgentMail."""
        if not self._email:
            return self._current_progress

        try:
            count = await self._email.count_positive_replies()
            return float(count)
        except Exception as e:
            logger.debug("Positive replies count failed: %s", e)
            return self._current_progress
