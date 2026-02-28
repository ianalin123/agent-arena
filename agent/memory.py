"""Supermemory integration — long-term context and learning for agents."""

from typing import Any


class AgentMemory:
    def __init__(self, api_key: str):
        self.api_key = api_key

    def add(self, content: str, sandbox_id: str, goal_type: str, source: str = "agent") -> None:
        """Store a learning or observation in long-term memory."""
        # TODO: Call Supermemory add API
        pass

    def search(self, query: str, sandbox_id: str, top_k: int = 5) -> list[dict[str, Any]]:
        """Retrieve relevant past context."""
        # TODO: Call Supermemory search API
        return []

    def add_user_prompt(self, prompt: str, sandbox_id: str) -> None:
        """Store a user-injected prompt as retrievable memory."""
        self.add(
            content=f"User suggestion: {prompt}",
            sandbox_id=sandbox_id,
            goal_type="user_prompt",
            source="user",
        )
