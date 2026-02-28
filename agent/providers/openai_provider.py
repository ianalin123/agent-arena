"""OpenAI GPT provider — alternative model."""

import json
import os
from typing import Any

import openai

from model_router import BaseProvider, Decision


SYSTEM_PROMPT = """You are an autonomous agent pursuing a goal. Analyze the screenshot and context, then decide your next action.

Respond with JSON:
{
  "reasoning": "your thought process",
  "action_type": "browser" | "email" | "payment",
  "action": { ... action details ... }
}"""


class OpenAIProvider(BaseProvider):
    def __init__(self, model_id: str = "gpt-4o"):
        self.client = openai.AsyncOpenAI(api_key=os.environ["OPENAI_API_KEY"])
        self.model_id = model_id

    async def think(self, goal: str, screenshot: str, **context: Any) -> Decision:
        prompt = _build_prompt(goal, **context)

        response = await self.client.chat.completions.create(
            model=self.model_id,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:image/png;base64,{screenshot}"},
                        },
                        {"type": "text", "text": prompt},
                    ],
                },
            ],
        )

        return _parse_response(response.choices[0].message.content or "")


def _build_prompt(goal: str, **context: Any) -> str:
    parts = [f"GOAL: {goal}"]
    if context.get("wallet_balance") is not None:
        parts.append(f"WALLET BALANCE: ${context['wallet_balance']:.2f}")
    if context.get("emails"):
        parts.append(f"RECENT EMAILS: {len(context['emails'])} messages")
    if context.get("memory"):
        parts.append(f"MEMORY:\n{context['memory']}")
    if context.get("user_prompts"):
        prompts = [p["promptText"] for p in context["user_prompts"]]
        parts.append(f"USER SUGGESTIONS: {prompts}")
    if context.get("action_history"):
        recent = context["action_history"][-5:]
        parts.append(f"RECENT ACTIONS: {recent}")
    return "\n\n".join(parts)


def _parse_response(text: str) -> Decision:
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        return Decision(
            reasoning=text,
            action_type="browser",
            action={"type": "wait", "reason": "Failed to parse response"},
            cost=0.01,
        )

    return Decision(
        reasoning=data.get("reasoning", ""),
        action_type=data.get("action_type", "browser"),
        action=data.get("action", {}),
        cost=0.01,
    )
