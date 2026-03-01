"""Shared base types for the agent runtime — avoids circular imports."""

from dataclasses import dataclass, field
from typing import Any


@dataclass
class Decision:
    reasoning: str
    action_type: str  # "browser_task" | "send_email" | "send_usdc" | "send_usdc_email" | "finish_reasoning"
    action: dict
    cost: float
    tool_use_id: str = ""
    raw_assistant_message: dict = field(default_factory=dict)


class BaseProvider:
    async def think(
        self,
        messages: list[dict[str, Any]],
        **context: Any,
    ) -> Decision:
        """Generate the next action given the full conversation history.

        Providers that don't support multi-turn can fall back to using only
        the last user message.
        """
        raise NotImplementedError
