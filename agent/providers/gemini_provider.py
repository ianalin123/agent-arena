"""Google Gemini provider — uses native function calling API for structured actions."""

import base64
import io
import os
from typing import Any

import google.generativeai as genai
from PIL import Image

from model_router import BaseProvider, Decision
from prompts import SYSTEM_PROMPT, build_user_prompt
from tools.schemas import to_gemini_tools


class GeminiProvider(BaseProvider):
    def __init__(self, model_id: str = "gemini-2.0-flash"):
        genai.configure(api_key=os.environ["GOOGLE_API_KEY"])
        self.model = genai.GenerativeModel(
            model_id,
            system_instruction=SYSTEM_PROMPT,
            tools=to_gemini_tools(),
        )

    async def think(self, goal: str, screenshot: str, **context: Any) -> Decision:
        prompt = build_user_prompt(goal, **context)
        parts: list[Any] = []

        if screenshot:
            image_bytes = base64.b64decode(screenshot)
            image = Image.open(io.BytesIO(image_bytes))
            parts.append(image)

        parts.append(prompt)

        response = await self.model.generate_content_async(parts)
        return _parse_function_call(response)


def _parse_function_call(response: Any) -> Decision:
    """Extract the function call from Gemini's response."""
    reasoning = ""
    tool_name = "finish_reasoning"
    tool_input: dict[str, Any] = {}

    for candidate in response.candidates:
        for part in candidate.content.parts:
            if hasattr(part, "text") and part.text:
                reasoning += part.text
            if hasattr(part, "function_call") and part.function_call:
                fc = part.function_call
                tool_name = fc.name
                tool_input = dict(fc.args) if fc.args else {}

    if tool_name == "finish_reasoning":
        reasoning = tool_input.get("reasoning", reasoning)

    return Decision(
        reasoning=reasoning,
        action_type=tool_name,
        action=tool_input,
        cost=0.005,
    )
