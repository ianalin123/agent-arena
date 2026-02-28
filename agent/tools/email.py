"""AgentMail integration — email capabilities for agents."""

import os
import logging
from typing import Any

from agentmail import AsyncAgentMail

logger = logging.getLogger(__name__)


class EmailTool:
    def __init__(self, api_key: str | None = None, inbox_id: str = ""):
        self.api_key = api_key or os.environ.get("AGENTMAIL_API_KEY", "")
        self.inbox_id = inbox_id
        self.client = AsyncAgentMail(api_key=self.api_key)

    async def check_inbox(self) -> list[dict[str, Any]]:
        """Fetch recent messages from the agent's inbox."""
        try:
            threads = await self.client.threads.list(
                inbox_id=self.inbox_id,
                labels=["inbox"],
            )
            messages = []
            for thread in threads.threads or []:
                thread_detail = await self.client.threads.get(thread.id)
                if thread_detail.messages:
                    last_msg = thread_detail.messages[-1]
                    messages.append({
                        "thread_id": thread.id,
                        "subject": getattr(last_msg, "subject", ""),
                        "from": getattr(last_msg, "from_", ""),
                        "snippet": getattr(last_msg, "text", "")[:200],
                        "timestamp": getattr(last_msg, "created_at", ""),
                    })
            return messages
        except Exception as e:
            logger.error("Failed to check inbox: %s", e)
            return []

    async def send(self, action: dict[str, Any]) -> dict[str, Any]:
        """Send an email from the agent's inbox."""
        to = action.get("to", "")
        subject = action.get("subject", "")
        body = action.get("body", "")

        try:
            await self.client.inboxes.messages.send(
                inbox_id=self.inbox_id,
                to=[to] if isinstance(to, str) else to,
                subject=subject,
                text=body,
                html=f"<p>{body}</p>",
            )
            return {
                "status": "sent",
                "to": to,
                "subject": subject,
            }
        except Exception as e:
            logger.error("Failed to send email: %s", e)
            return {
                "status": "error",
                "error": str(e),
                "to": to,
                "subject": subject,
            }

    async def count_positive_replies(self) -> int:
        """Count replies that indicate positive engagement."""
        try:
            threads = await self.client.threads.list(
                inbox_id=self.inbox_id,
                labels=["inbox"],
            )
            positive_count = 0
            positive_signals = [
                "yes", "sure", "interested", "love", "great", "sounds good",
                "let's do it", "happy to", "would love", "absolutely", "count me in",
            ]

            for thread in threads.threads or []:
                thread_detail = await self.client.threads.get(thread.id)
                if not thread_detail.messages or len(thread_detail.messages) < 2:
                    continue
                last_msg = thread_detail.messages[-1]
                text = getattr(last_msg, "text", "").lower()
                if any(signal in text for signal in positive_signals):
                    positive_count += 1

            return positive_count
        except Exception as e:
            logger.error("Failed to count positive replies: %s", e)
            return 0
