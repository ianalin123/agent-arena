"""Model-agnostic router with fallback chain support.

Provides a unified interface regardless of LLM provider, plus automatic
fallback to alternative providers on rate limits or API errors.
"""

import logging
from typing import Any

from base import BaseProvider, Decision

logger = logging.getLogger(__name__)


class ModelRouter:
    MODEL_IDS: dict[str, str] = {
        "claude-sonnet": "claude-sonnet-4-5",
        "claude-opus": "claude-opus-4-6",
        "gpt-4o": "gpt-4o",
        "gemini-2-flash": "gemini-2.0-flash",
    }

    PROVIDER_MODULES: dict[str, tuple[str, str]] = {
        "claude-sonnet": ("providers.anthropic_provider", "AnthropicProvider"),
        "claude-opus": ("providers.anthropic_provider", "AnthropicProvider"),
        "gpt-4o": ("providers.openai_provider", "OpenAIProvider"),
        "gemini-2-flash": ("providers.gemini_provider", "GeminiProvider"),
    }

    FALLBACK_ORDER: list[str] = ["claude-sonnet", "gpt-4o", "gemini-2-flash"]

    def get(self, model_key: str) -> BaseProvider:
        entry = self.PROVIDER_MODULES.get(model_key)
        if entry is None:
            raise ValueError(f"Unknown model: {model_key}. Options: {list(self.PROVIDER_MODULES.keys())}")
        module_path, class_name = entry
        import importlib
        mod = importlib.import_module(module_path)
        provider_cls = getattr(mod, class_name)
        model_id = self.MODEL_IDS[model_key]
        return provider_cls(model_id=model_id)

    def get_fallback_chain(self, primary_key: str) -> list[BaseProvider]:
        """Return a list of providers: primary first, then fallbacks.

        Example: get_fallback_chain("claude-sonnet") returns
        [AnthropicProvider, OpenAIProvider, GeminiProvider]
        """
        chain = [self.get(primary_key)]
        for key in self.FALLBACK_ORDER:
            if key != primary_key and key in self.PROVIDER_MODULES:
                try:
                    chain.append(self.get(key))
                except Exception:
                    logger.debug("Skipping fallback %s (init failed)", key)
        return chain
