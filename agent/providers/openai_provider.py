"""OpenAI GPT provider — uses native function calling API for structured actions."""

import json
import os
from typing import Any

import openai

from base import BaseProvider, Decision
from prompts import SYSTEM_PROMPT, build_user_prompt
from tools.schemas import to_openai_tools


class OpenAIProvider(BaseProvider):
    def __init__(self, model_id: str = "gpt-4o"):
        self.client = openai.AsyncOpenAI(api_key=os.environ["OPENAI_API_KEY"])
        self.model_id = model_id

    async def think(self, goal: str, screenshot: str, **context: Any) -> Decision:
        prompt = build_user_prompt(goal, **context)

        user_content: list[dict[str, Any]] = [{"type": "text", "text": prompt}]
        if screenshot:
            user_content.insert(0, {
                "type": "image_url",
                "image_url": {"url": f"data:image/png;base64,{screenshot}"},
            })

        response = await self.client.chat.completions.create(
            model=self.model_id,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_content},
            ],
            tools=to_openai_tools(),
            tool_choice="required",
        )

        return _parse_tool_call(response)


def _parse_tool_call(response: Any) -> Decision:
    """Extract the function call from OpenAI's response."""
    message = response.choices[0].message
    reasoning = message.content or ""

    if message.tool_calls:
        call = message.tool_calls[0]
        tool_name = call.function.name
        try:
            tool_input = json.loads(call.function.arguments)
        except json.JSONDecodeError:
            tool_input = {"raw": call.function.arguments}
    else:
        tool_name = "finish_reasoning"
        tool_input = {"reasoning": reasoning}

    if tool_name == "finish_reasoning":
        reasoning = tool_input.get("reasoning", reasoning)

    return Decision(
        reasoning=reasoning,
        action_type=tool_name,
        action=tool_input,
        cost=0.01,
    )
