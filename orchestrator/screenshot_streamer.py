"""Stream browser screenshots from Browser Use into Convex for the frontend."""

import asyncio
import json
from typing import Any

from event_bridge import EventBridge


class ScreenshotStreamer:
    """Periodically captures screenshots and pushes them to Convex."""

    def __init__(self, event_bridge: EventBridge, interval_seconds: float = 3.0):
        self.bridge = event_bridge
        self.interval = interval_seconds
        self._running = False

    async def start(self, sandbox_id: str, browser_session: Any) -> None:
        """Begin streaming screenshots for a sandbox."""
        self._running = True

        while self._running:
            try:
                screenshot_b64 = await browser_session.screenshot()
                await self.bridge.push_event(
                    sandbox_id=sandbox_id,
                    event_type="screenshot",
                    payload={"image": screenshot_b64},
                )
            except Exception:
                # TODO: Log error, don't crash the stream
                pass

            await asyncio.sleep(self.interval)

    def stop(self) -> None:
        self._running = False
