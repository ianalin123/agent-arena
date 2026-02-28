"""Browser Use integration — cloud-hosted browser automation for agents."""

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
        self._last_task_id: str | None = None

    async def create_session(self) -> None:
        """Initialize a persistent Browser Use cloud session."""
        session = await self.client.sessions.create()
        self.session_id = session.id
        logger.info("Browser session created: %s", self.session_id)

    async def screenshot(self) -> str:
        """Capture current browser state as base64 PNG.

        Runs a lightweight task to observe the current page and return
        the last screenshot from task steps.
        """
        if not self.session_id:
            await self.create_session()

        result = await self.client.run(
            "Take a screenshot of the current page. Do not navigate or click anything.",
            session_id=self.session_id,
            vision=True,
        )
        self._last_task_id = result.id

        if result.steps:
            last_step = result.steps[-1]
            if hasattr(last_step, "screenshot") and last_step.screenshot:
                return last_step.screenshot

        try:
            screenshots = await self.client.tasks.get_screenshots(result.id)
            if screenshots:
                return screenshots[-1] if isinstance(screenshots[-1], str) else ""
        except Exception:
            logger.debug("Could not fetch task screenshots for %s", result.id)

        return ""

    async def execute(self, action: dict[str, Any]) -> dict[str, Any]:
        """Execute a browser action (navigate, click, type, scroll)."""
        action_type = action.get("type")

        if action_type == "navigate":
            return await self._navigate(action["url"])
        elif action_type == "click":
            return await self._click(action["selector"])
        elif action_type == "type":
            return await self._type(action["selector"], action["text"])
        elif action_type == "scroll":
            return await self._scroll(action.get("direction", "down"))
        elif action_type == "wait":
            return {"status": "waited"}
        else:
            return {"error": f"Unknown browser action: {action_type}"}

    async def _run_task(self, instruction: str, start_url: str | None = None) -> dict[str, Any]:
        """Run a Browser Use task within our persistent session."""
        if not self.session_id:
            await self.create_session()

        kwargs: dict[str, Any] = {
            "session_id": self.session_id,
            "vision": True,
        }
        if start_url:
            kwargs["start_url"] = start_url

        try:
            result = await self.client.run(instruction, **kwargs)
            self._last_task_id = result.id
            return {
                "status": "completed",
                "output": result.output or "",
                "task_id": result.id,
                "steps": len(result.steps) if result.steps else 0,
            }
        except Exception as e:
            logger.error("Browser task failed: %s", e)
            return {"status": "error", "error": str(e)}

    async def _navigate(self, url: str) -> dict[str, Any]:
        result = await self._run_task(f"Navigate to {url}", start_url=url)
        result["url"] = url
        return result

    async def _click(self, selector: str) -> dict[str, Any]:
        result = await self._run_task(f"Click on the element described as: {selector}")
        result["selector"] = selector
        return result

    async def _type(self, selector: str, text: str) -> dict[str, Any]:
        result = await self._run_task(
            f"Find the input field described as '{selector}' and type the following text: {text}"
        )
        result["selector"] = selector
        result["length"] = len(text)
        return result

    async def _scroll(self, direction: str) -> dict[str, Any]:
        result = await self._run_task(f"Scroll the page {direction}")
        result["direction"] = direction
        return result

    async def close(self) -> None:
        """Tear down the Browser Use session."""
        self.session_id = None
        self._last_task_id = None
        logger.info("Browser session closed")
