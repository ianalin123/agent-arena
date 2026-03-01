"""Browser Use integration — cloud-hosted browser automation for agents.

Uses Browser Use's v3 BU Agent API: give it a natural language task
and it handles all browser actions autonomously. Sessions provide a live_url
for real-time browser monitoring.
"""

import os
import logging
from typing import Any

from browser_use_sdk.v3 import AsyncBrowserUse, BrowserUseError

logger = logging.getLogger(__name__)


class BrowserTool:
    def __init__(self, api_key: str | None = None):
        self.api_key = api_key or os.environ.get("BROWSER_USE_API_KEY", "")
        self.client = AsyncBrowserUse(api_key=self.api_key)
        self.session_id: str | None = None
        self.live_url: str | None = None

    async def create_session(self) -> None:
        """Create an idle Browser Use cloud session for reuse across tasks."""
        session = await self.client.sessions.create(keep_alive=True)
        self.session_id = str(session.id)
        self.live_url = getattr(session, "live_url", None)
        logger.info(
            "Browser session created: %s (live_url=%s)",
            self.session_id, self.live_url,
        )

    async def execute(self, action: dict[str, Any]) -> dict[str, Any]:
        """Execute a high-level browser task via natural language.

        The action dict should contain:
          {"task": "Natural language description of what to do"}

        The BU Agent handles all clicking, typing, navigation autonomously.
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
                keep_alive=True,
            )

            if not self.live_url and result.live_url:
                self.live_url = result.live_url

            return {
                "status": "completed",
                "output": result.output or "",
                "task_id": str(result.id),
                "session_status": str(result.status),
                "cost_usd": result.total_cost_usd or "0",
            }
        except TimeoutError:
            logger.error("Browser task timed out: %s", task[:100])
            return {"status": "error", "error": "Task timed out (5 min limit)"}
        except BrowserUseError as e:
            logger.error("Browser Use API error: %s", e)
            return {"status": "error", "error": str(e)}
        except Exception as e:
            logger.error("Browser task failed: %s", e)
            return {"status": "error", "error": str(e)}

    async def get_session_details(self) -> dict[str, Any]:
        """Fetch current session state from Browser Use, including live_url."""
        if not self.session_id:
            return {}
        try:
            session = await self.client.sessions.get(self.session_id)
            url = getattr(session, "live_url", None)
            if url and not self.live_url:
                self.live_url = url
            return {
                "session_id": self.session_id,
                "status": getattr(session, "status", None),
                "live_url": url,
            }
        except Exception as e:
            logger.debug("Failed to get session details: %s", e)
            return {}

    async def close(self) -> None:
        """Stop the Browser Use session and release the client."""
        if self.session_id:
            try:
                await self.client.sessions.stop(self.session_id)
            except Exception as e:
                logger.debug("Error stopping session: %s", e)
        try:
            await self.client.close()
        except Exception:
            pass
        self.session_id = None
        self.live_url = None
        logger.info("Browser session closed")
