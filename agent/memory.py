"""Supermemory integration — long-term context and learning for agents."""

import asyncio
import os
import logging
from typing import Any

from supermemory import Supermemory

logger = logging.getLogger(__name__)


class AgentMemory:
    def __init__(self, api_key: str | None = None):
        self.api_key = api_key or os.environ.get("SUPERMEMORY_API_KEY", "")
        try:
            self.client = Supermemory(api_key=self.api_key)
            self._available = True
        except Exception:
            self.client = None
            self._available = False
            logger.warning("Supermemory client not available — running without persistent memory")

    async def add(self, content: str, sandbox_id: str, goal_type: str, source: str = "agent") -> None:
        """Store a learning or observation in long-term memory."""
        if not self._available:
            return
        try:
            await asyncio.to_thread(
                self.client.add,
                content=content,
                container_tag=sandbox_id,
                metadata={
                    "goal_type": goal_type,
                    "source": source,
                },
            )
        except Exception as e:
            logger.warning("Failed to store memory: %s", e)

    async def search(self, query: str, sandbox_id: str, top_k: int = 5) -> list[dict[str, Any]]:
        """Retrieve relevant past context."""
        if not self._available:
            return []
        try:
            results = await asyncio.to_thread(
                self.client.search.memories,
                q=query,
                container_tag=sandbox_id,
                search_mode="hybrid",
                limit=top_k,
            )
            return [
                {
                    "content": getattr(r, "memory", None) or getattr(r, "chunk", ""),
                    "similarity": getattr(r, "similarity", 0),
                }
                for r in (results.results or [])
            ]
        except Exception as e:
            logger.warning("Failed to search memory: %s", e)
            return []

    async def add_user_prompt(self, prompt: str, sandbox_id: str) -> None:
        """Store a user-injected prompt as retrievable memory."""
        await self.add(
            content=f"User suggestion: {prompt}",
            sandbox_id=sandbox_id,
            goal_type="user_prompt",
            source="user",
        )
