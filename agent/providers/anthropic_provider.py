"""Anthropic Claude provider — uses native tool use API with multi-turn history."""

import os
from typing import Any

import anthropic

from base import BaseProvider, Decision
from prompts import SYSTEM_PROMPT
from tools.schemas import to_anthropic_tools


class AnthropicProvider(BaseProvider):
    def __init__(self, model_id: str = "claude-sonnet-4-5"):
        self.client = anthropic.AsyncAnthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
        self.model_id = model_id

    async def think(self, messages: list[dict[str, Any]], **context: Any) -> Decision:
        response = await self.client.messages.create(
            model=self.model_id,
            max_tokens=4096,
            system=SYSTEM_PROMPT,
            tools=to_anthropic_tools(),
            messages=messages,
        )

        return _parse_tool_use(response)


def _parse_tool_use(response: Any) -> Decision:
    """Extract the tool call from Anthropic's response content blocks."""
    reasoning_parts: list[str] = []
    tool_name = "finish_reasoning"
    tool_input: dict[str, Any] = {}
    tool_use_id = ""

    for block in response.content:
        if block.type == "text":
            reasoning_parts.append(block.text)
        elif block.type == "tool_use":
            tool_name = block.name
            tool_input = block.input
            tool_use_id = block.id

    reasoning = " ".join(reasoning_parts)
    if tool_name == "finish_reasoning":
        reasoning = tool_input.get("reasoning", reasoning)

    raw_content = []
    for block in response.content:
        if block.type == "text":
            raw_content.append({"type": "text", "text": block.text})
        elif block.type == "tool_use":
            raw_content.append({
                "type": "tool_use",
                "id": block.id,
                "name": block.name,
                "input": block.input,
            })

    return Decision(
        reasoning=reasoning,
        action_type=tool_name,
        action=tool_input,
        cost=0.01,
        tool_use_id=tool_use_id,
        raw_assistant_message={"role": "assistant", "content": raw_content},
    )
