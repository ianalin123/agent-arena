"""OpenAI GPT provider — uses native function calling API with multi-turn history."""

import json
import os
from typing import Any

import openai

from base import BaseProvider, Decision
from prompts import SYSTEM_PROMPT
from tools.schemas import to_openai_tools


class OpenAIProvider(BaseProvider):
    def __init__(self, model_id: str = "gpt-4o"):
        self.client = openai.AsyncOpenAI(api_key=os.environ["OPENAI_API_KEY"])
        self.model_id = model_id

    async def think(self, messages: list[dict[str, Any]], **context: Any) -> Decision:
        oai_messages = [{"role": "system", "content": SYSTEM_PROMPT}]

        for msg in messages:
            if msg["role"] == "user":
                content = msg["content"]
                if isinstance(content, list):
                    has_tool_result = any(
                        isinstance(c, dict) and c.get("type") == "tool_result"
                        for c in content
                    )
                    if has_tool_result:
                        for c in content:
                            if isinstance(c, dict) and c.get("type") == "tool_result":
                                oai_messages.append({
                                    "role": "tool",
                                    "tool_call_id": c.get("tool_use_id", ""),
                                    "content": c.get("content", ""),
                                })
                        continue
                oai_messages.append({"role": "user", "content": content})
            elif msg["role"] == "assistant":
                raw_content = msg.get("content", [])
                text_parts = []
                tool_calls = []
                for block in (raw_content if isinstance(raw_content, list) else []):
                    if isinstance(block, dict):
                        if block.get("type") == "text":
                            text_parts.append(block["text"])
                        elif block.get("type") == "tool_use":
                            tool_calls.append({
                                "id": block["id"],
                                "type": "function",
                                "function": {
                                    "name": block["name"],
                                    "arguments": json.dumps(block["input"]),
                                },
                            })
                oai_msg: dict[str, Any] = {
                    "role": "assistant",
                    "content": " ".join(text_parts) if text_parts else None,
                }
                if tool_calls:
                    oai_msg["tool_calls"] = tool_calls
                oai_messages.append(oai_msg)

        response = await self.client.chat.completions.create(
            model=self.model_id,
            messages=oai_messages,
            tools=to_openai_tools(),
            tool_choice="required",
        )

        return _parse_tool_call(response)


def _parse_tool_call(response: Any) -> Decision:
    """Extract the function call from OpenAI's response."""
    message = response.choices[0].message
    reasoning = message.content or ""

    tool_use_id = ""
    if message.tool_calls:
        call = message.tool_calls[0]
        tool_name = call.function.name
        tool_use_id = call.id
        try:
            tool_input = json.loads(call.function.arguments)
        except json.JSONDecodeError:
            tool_input = {"raw": call.function.arguments}
    else:
        tool_name = "finish_reasoning"
        tool_input = {"reasoning": reasoning}

    if tool_name == "finish_reasoning":
        reasoning = tool_input.get("reasoning", reasoning)

    raw_content: list[dict[str, Any]] = []
    if reasoning:
        raw_content.append({"type": "text", "text": reasoning})
    if message.tool_calls:
        call = message.tool_calls[0]
        raw_content.append({
            "type": "tool_use",
            "id": call.id,
            "name": call.function.name,
            "input": tool_input,
        })

    return Decision(
        reasoning=reasoning,
        action_type=tool_name,
        action=tool_input,
        cost=0.01,
        tool_use_id=tool_use_id,
        raw_assistant_message={"role": "assistant", "content": raw_content},
    )
