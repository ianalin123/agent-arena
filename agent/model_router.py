"""Model-agnostic router — same interface regardless of LLM provider."""

from dataclasses import dataclass
from typing import Any

from providers.anthropic_provider import AnthropicProvider
from providers.openai_provider import OpenAIProvider
from providers.gemini_provider import GeminiProvider


@dataclass
class Decision:
    reasoning: str
    action_type: str  # "browser" | "email" | "payment"
    action: dict
    cost: float


class BaseProvider:
    async def think(self, goal: str, screenshot: str, **context: Any) -> Decision:
        raise NotImplementedError


class ModelRouter:
    PROVIDERS: dict[str, type] = {
        "claude-sonnet": AnthropicProvider,
        "claude-opus": AnthropicProvider,
        "gpt-4o": OpenAIProvider,
        "gemini-2-flash": GeminiProvider,
    }

    MODEL_IDS: dict[str, str] = {
        "claude-sonnet": "claude-sonnet-4-5-20250929",
        "claude-opus": "claude-opus-4-6",
        "gpt-4o": "gpt-4o",
        "gemini-2-flash": "gemini-2.0-flash",
    }

    def get(self, model_key: str) -> BaseProvider:
        provider_cls = self.PROVIDERS.get(model_key)
        if provider_cls is None:
            raise ValueError(f"Unknown model: {model_key}. Options: {list(self.PROVIDERS.keys())}")
        model_id = self.MODEL_IDS[model_key]
        return provider_cls(model_id=model_id)
