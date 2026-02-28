"""Browser Use integration — cloud-hosted browser automation for agents.

Uses Browser Use's high-level task API: give it a natural language task
and it handles all browser actions internally. Sessions provide a live_url
for real-time browser streaming and a public share URL for embedding.
"""

import os
import logging
from typing import Any

from browser_use_sdk import AsyncBrowserUse

logger = logging.getLogger(__name__)


class BrowserTool:
    def __init__(self, api_key: str | None = None):
        self.api_key = api_key or os.environ.get("BROWSER_USE_API_KEY", "")
        self.client = AsyncBrowserUse(api_key=self.api_key)
        self.session_id: str | None = None
        self.live_url: str | None = None
        self.share_url: str | None = None
        self._last_screenshot: str | None = None

    async def create_session(self) -> None:
        """Initialize a persistent Browser Use cloud session with live streaming."""
        session = await self.client.sessions.create()
        self.session_id = session.id
        self.live_url = getattr(session, "live_url", None)
        logger.info("Browser session created: %s (live_url=%s)", self.session_id, self.live_url)

        try:
            share = await self.client.sessions.create_share(session.id)
            self.share_url = getattr(share, "url", None)
            logger.info("Share URL created: %s", self.share_url)
        except Exception as e:
            logger.warning("Could not create share URL: %s", e)
            self.share_url = None

    async def execute(self, action: dict[str, Any]) -> dict[str, Any]:
        """Execute a high-level browser task via natural language.

        The action dict should contain:
          {"task": "Natural language description of what to do"}

        Browser Use handles all low-level browser orchestration internally.
        """
        task = action.get("task", "")
        if not task:
            return {"status": "error", "error": "No task description provided"}

        if not self.session_id:
            await self.create_session()

        try:
            result = await self.client.run(
                task,
                session_id=self.session_id,
            )

            if result.steps:
                last_step = result.steps[-1]
                if hasattr(last_step, "screenshot") and last_step.screenshot:
                    self._last_screenshot = last_step.screenshot

            return {
                "status": "completed",
                "output": result.output or "",
                "task_id": result.id,
                "steps": len(result.steps) if result.steps else 0,
            }
        except Exception as e:
            logger.error("Browser task failed: %s", e)
            return {"status": "error", "error": str(e)}

    def get_last_screenshot(self) -> str | None:
        """Return the last screenshot captured from task steps (fallback for live_url)."""
        return self._last_screenshot

    async def close(self) -> None:
        """Tear down the Browser Use session."""
        if self.session_id:
            try:
                await self.client.sessions.stop(self.session_id)
            except Exception as e:
                logger.debug("Error stopping session: %s", e)
        self.session_id = None
        self.live_url = None
        self.share_url = None
        self._last_screenshot = None
        logger.info("Browser session closed")
