"""Anthropic Claude provider — uses native tool use API for structured actions."""

import os
from typing import Any

import anthropic

from base import BaseProvider, Decision
from prompts import SYSTEM_PROMPT, build_user_prompt
from tools.schemas import to_anthropic_tools


class AnthropicProvider(BaseProvider):
    def __init__(self, model_id: str = "claude-sonnet-4-5-20250929"):
        self.client = anthropic.AsyncAnthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
        self.model_id = model_id

    async def think(self, goal: str, screenshot: str, **context: Any) -> Decision:
        prompt = build_user_prompt(goal, **context)

        content: list[dict[str, Any]] = [{"type": "text", "text": prompt}]
        if screenshot:
            content.insert(0, {
                "type": "image",
                "source": {"type": "base64", "media_type": "image/png", "data": screenshot},
            })

        response = await self.client.messages.create(
            model=self.model_id,
            max_tokens=4096,
            system=SYSTEM_PROMPT,
            tools=to_anthropic_tools(),
            messages=[{"role": "user", "content": content}],
        )

        return _parse_tool_use(response)


def _parse_tool_use(response: Any) -> Decision:
    """Extract the tool call from Anthropic's response content blocks."""
    reasoning_parts: list[str] = []
    tool_name = "finish_reasoning"
    tool_input: dict[str, Any] = {}

    for block in response.content:
        if block.type == "text":
            reasoning_parts.append(block.text)
        elif block.type == "tool_use":
            tool_name = block.name
            tool_input = block.input

    reasoning = " ".join(reasoning_parts)
    if tool_name == "finish_reasoning":
        reasoning = tool_input.get("reasoning", reasoning)

    return Decision(
        reasoning=reasoning,
        action_type=tool_name,
        action=tool_input,
        cost=0.01,
    )
