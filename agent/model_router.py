"""Model-agnostic router with fallback chain support.

Provides a unified interface regardless of LLM provider, plus automatic
fallback to alternative providers on rate limits or API errors.
"""

import logging
from dataclasses import dataclass
from typing import Any

from providers.anthropic_provider import AnthropicProvider
from providers.openai_provider import OpenAIProvider
from providers.gemini_provider import GeminiProvider

logger = logging.getLogger(__name__)


@dataclass
class Decision:
    reasoning: str
    action_type: str  # "browser_task" | "send_email" | "make_payment" | "finish_reasoning"
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

    FALLBACK_ORDER: list[str] = ["claude-sonnet", "gpt-4o", "gemini-2-flash"]

    def get(self, model_key: str) -> BaseProvider:
        provider_cls = self.PROVIDERS.get(model_key)
        if provider_cls is None:
            raise ValueError(f"Unknown model: {model_key}. Options: {list(self.PROVIDERS.keys())}")
        model_id = self.MODEL_IDS[model_key]
        return provider_cls(model_id=model_id)

    def get_fallback_chain(self, primary_key: str) -> list[BaseProvider]:
        """Return a list of providers: primary first, then fallbacks.

        Example: get_fallback_chain("claude-sonnet") returns
        [AnthropicProvider, OpenAIProvider, GeminiProvider]
        """
        chain = [self.get(primary_key)]
        for key in self.FALLBACK_ORDER:
            if key != primary_key and key in self.PROVIDERS:
                try:
                    chain.append(self.get(key))
                except Exception:
                    logger.debug("Skipping fallback %s (init failed)", key)
        return chain
