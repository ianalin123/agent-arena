"""Shared base types for the agent runtime — avoids circular imports."""

from dataclasses import dataclass
from typing import Any


@dataclass
class Decision:
    reasoning: str
    action_type: str  # "browser_task" | "send_email" | "make_payment" | "finish_reasoning"
    action: dict
    cost: float


class BaseProvider:
    async def think(self, goal: str, screenshot: str, **context: Any) -> "Decision":
        raise NotImplementedError
