"""Anthropic Claude provider — vision + reasoning."""

import os
from typing import Any

import anthropic

from model_router import BaseProvider, Decision


SYSTEM_PROMPT = """You are an autonomous agent pursuing a goal. Analyze the screenshot and context, then decide your next action.

Respond with JSON:
{
  "reasoning": "your thought process",
  "action_type": "browser" | "email" | "payment",
  "action": { ... action details ... }
}"""


class AnthropicProvider(BaseProvider):
    def __init__(self, model_id: str = "claude-sonnet-4-5-20250929"):
        self.client = anthropic.AsyncAnthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
        self.model_id = model_id

    async def think(self, goal: str, screenshot: str, **context: Any) -> Decision:
        prompt = _build_prompt(goal, **context)

        response = await self.client.messages.create(
            model=self.model_id,
            max_tokens=4096,
            system=SYSTEM_PROMPT,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {"type": "base64", "media_type": "image/png", "data": screenshot},
                        },
                        {"type": "text", "text": prompt},
                    ],
                }
            ],
        )

        return _parse_response(response.content[0].text)


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
    import json

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
