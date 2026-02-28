"""Stream browser screenshots from Browser Use into Convex for the frontend."""

import asyncio
import logging
from typing import Any

from event_bridge import EventBridge

logger = logging.getLogger(__name__)


class ScreenshotStreamer:
    """Periodically captures screenshots and pushes them to Convex."""

    def __init__(
        self,
        event_bridge: EventBridge,
        interval_seconds: float = 3.0,
    ):
        self.bridge = event_bridge
        self.interval = interval_seconds
        self._running = False
        self._task: asyncio.Task[None] | None = None

    async def start(self, sandbox_id: str, browser_session: Any) -> None:
        """Begin streaming screenshots for a sandbox. Runs until stop() is called."""
        self._running = True
        while self._running:
            try:
                screenshot_b64 = await browser_session.screenshot()
                await self.bridge.push_event(
                    sandbox_id=sandbox_id,
                    event_type="screenshot",
                    payload={"image": screenshot_b64},
                )
            except asyncio.CancelledError:
                logger.info(
                    "Screenshot stream cancelled for sandbox %s", sandbox_id
                )
                break
            except Exception as e:
                logger.warning(
                    "Screenshot capture or push failed for sandbox %s: %s",
                    sandbox_id,
                    e,
                    exc_info=True,
                )
            await asyncio.sleep(self.interval)

    def stop(self) -> None:
        """Stop the stream gracefully. Safe to call from another task."""
        self._running = False
