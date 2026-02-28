"""Bridge between agent runtime and Convex backend.

This is the shared interface between Track A (agent) and Track B (Convex).
Track B implements this; Track A imports and calls it.
"""

import json
from typing import Any

import httpx


class EventBridge:
    """Thin client for pushing agent events into Convex."""

    def __init__(self, convex_url: str, convex_deploy_key: str):
        self.convex_url = convex_url
        self.deploy_key = convex_deploy_key
        self.client = httpx.AsyncClient()

    async def push_event(
        self, sandbox_id: str, event_type: str, payload: dict[str, Any]
    ) -> None:
        """Push an agent event to Convex (triggers live UI updates)."""
        await self._call_mutation("events:push", {
            "sandboxId": sandbox_id,
            "eventType": event_type,
            "payload": json.dumps(payload, default=str),
        })

    async def update_progress(self, sandbox_id: str, progress: float) -> None:
        """Update goal progress in Convex."""
        await self._call_mutation("sandboxes:updateProgress", {
            "sandboxId": sandbox_id,
            "progress": progress,
        })

    async def complete_sandbox(self, sandbox_id: str, outcome: str) -> None:
        """Mark sandbox as completed/failed and trigger bet settlement."""
        await self._call_mutation("sandboxes:complete", {
            "sandboxId": sandbox_id,
            "outcome": outcome,
        })

    async def update_live_url(
        self, sandbox_id: str, live_url: str, share_url: str = ""
    ) -> None:
        """Push the Browser Use live_url and share_url to Convex."""
        args: dict[str, Any] = {
            "sandboxId": sandbox_id,
            "liveUrl": live_url,
        }
        if share_url:
            args["shareUrl"] = share_url
        await self._call_mutation("sandboxes:updateLiveUrl", args)

    async def fetch_pending_prompts(self, sandbox_id: str) -> list[dict[str, Any]]:
        """Pull pending user prompts from Convex."""
        result = await self._call_query("prompts:fetchPending", {
            "sandboxId": sandbox_id,
        })
        return result if isinstance(result, list) else []

    async def _call_mutation(self, function_name: str, args: dict[str, Any]) -> Any:
        """Call a Convex mutation via HTTP API."""
        url = f"{self.convex_url.rstrip('/')}/api/mutation"
        payload = {"path": function_name, "args": args, "format": "json"}
        headers = {
            "Authorization": f"Convex {self.deploy_key}",
            "Content-Type": "application/json",
        }
        resp = await self.client.post(url, json=payload, headers=headers)
        resp.raise_for_status()
        data = resp.json()
        if data.get("status") == "error":
            msg = data.get("errorMessage", "Convex mutation failed")
            raise RuntimeError(msg)

        return data.get("value")

    async def _call_query(self, function_name: str, args: dict[str, Any]) -> Any:
        """Call a Convex query via HTTP API."""
        url = f"{self.convex_url.rstrip('/')}/api/query"
        payload = {"path": function_name, "args": args, "format": "json"}
        headers = {
            "Authorization": f"Convex {self.deploy_key}",
            "Content-Type": "application/json",
        }
        resp = await self.client.post(url, json=payload, headers=headers)
        resp.raise_for_status()
        data = resp.json()
        if data.get("status") == "error":
            msg = data.get("errorMessage", "Convex query failed")
            raise RuntimeError(msg)
        return data.get("value")

    async def close(self) -> None:
        await self.client.aclose()
