"""Google Gemini provider — uses native function calling API.

Gemini's chat API doesn't map cleanly to the Anthropic message format, so
we extract only the latest user message from the history for each call.
Multi-turn context is preserved via the action_history in the prompt text.
"""

import base64
import io
import os
import uuid
from typing import Any

import google.generativeai as genai
from PIL import Image

from base import BaseProvider, Decision
from prompts import SYSTEM_PROMPT
from tools.schemas import to_gemini_tools


class GeminiProvider(BaseProvider):
    def __init__(self, model_id: str = "gemini-2.0-flash"):
        genai.configure(api_key=os.environ["GOOGLE_API_KEY"])
        self.model = genai.GenerativeModel(
            model_id,
            system_instruction=SYSTEM_PROMPT,
            tools=to_gemini_tools(),
        )

    async def think(self, messages: list[dict[str, Any]], **context: Any) -> Decision:
        last_user = ""
        for msg in reversed(messages):
            if msg["role"] == "user":
                content = msg["content"]
                if isinstance(content, str):
                    last_user = content
                elif isinstance(content, list):
                    last_user = " ".join(
                        c.get("text", c.get("content", ""))
                        for c in content
                        if isinstance(c, dict) and c.get("type") in ("text", "tool_result")
                    )
                break

        parts: list[Any] = [last_user or "Continue working toward the goal."]
        response = await self.model.generate_content_async(parts)
        return _parse_function_call(response)


def _parse_function_call(response: Any) -> Decision:
    """Extract the function call from Gemini's response."""
    reasoning = ""
    tool_name = "finish_reasoning"
    tool_input: dict[str, Any] = {}
    tool_use_id = ""

    for candidate in response.candidates:
        for part in candidate.content.parts:
            if hasattr(part, "text") and part.text:
                reasoning += part.text
            if hasattr(part, "function_call") and part.function_call:
                fc = part.function_call
                tool_name = fc.name
                tool_input = dict(fc.args) if fc.args else {}
                tool_use_id = str(uuid.uuid4())

    if tool_name == "finish_reasoning":
        reasoning = tool_input.get("reasoning", reasoning)

    raw_content: list[dict[str, Any]] = []
    if reasoning:
        raw_content.append({"type": "text", "text": reasoning})
    if tool_name != "finish_reasoning" or tool_input:
        raw_content.append({
            "type": "tool_use",
            "id": tool_use_id,
            "name": tool_name,
            "input": tool_input,
        })

    return Decision(
        reasoning=reasoning,
        action_type=tool_name,
        action=tool_input,
        cost=0.005,
        tool_use_id=tool_use_id,
        raw_assistant_message={"role": "assistant", "content": raw_content},
    )
