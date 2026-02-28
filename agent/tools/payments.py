"""Paylocus (Locus) integration — programmable wallet for agent spending.

Locus provides smart wallets on Base with USDC transfers.
Uses httpx for REST API calls since the Python SDK is not yet published.
"""

import os
import logging
from typing import Any

import httpx

logger = logging.getLogger(__name__)

LOCUS_API_BASE = os.environ.get("LOCUS_API_BASE", "https://api.paywithlocus.com")


class PaymentsTool:
    def __init__(self, api_key: str | None = None, wallet_id: str = ""):
        self.api_key = api_key or os.environ.get("LOCUS_API_KEY", "")
        self.wallet_id = wallet_id
        self.client = httpx.AsyncClient(
            base_url=LOCUS_API_BASE,
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
            timeout=30.0,
        )
        self._cached_balance: float = 0.0

    async def get_balance(self) -> float:
        """Get current wallet balance in USDC."""
        try:
            resp = await self.client.get(f"/wallets/{self.wallet_id}/balance")
            resp.raise_for_status()
            data = resp.json()
            self._cached_balance = float(data.get("balance", 0))
            return self._cached_balance
        except Exception as e:
            logger.error("Failed to get wallet balance: %s", e)
            return self._cached_balance

    async def transact(self, action: dict[str, Any]) -> dict[str, Any]:
        """Execute a payment from the agent's wallet."""
        amount = action.get("amount", 0)
        description = action.get("description", "")
        recipient = action.get("recipient", "")

        try:
            resp = await self.client.post(
                f"/wallets/{self.wallet_id}/transfer",
                json={
                    "to": recipient,
                    "amount": str(amount),
                    "memo": description,
                },
            )
            resp.raise_for_status()
            data = resp.json()
            self._cached_balance = max(0, self._cached_balance - amount)

            return {
                "status": "completed",
                "amount": amount,
                "description": description,
                "recipient": recipient,
                "tx_hash": data.get("tx_hash", ""),
            }
        except Exception as e:
            logger.error("Payment failed: %s", e)
            return {
                "status": "failed",
                "error": str(e),
                "amount": amount,
                "description": description,
                "recipient": recipient,
            }

    async def get_transaction_history(self) -> list[dict[str, Any]]:
        """Fetch recent transactions."""
        try:
            resp = await self.client.get(f"/wallets/{self.wallet_id}/transactions")
            resp.raise_for_status()
            data = resp.json()
            return data.get("transactions", [])
        except Exception as e:
            logger.error("Failed to get transaction history: %s", e)
            return []

    async def close(self) -> None:
        await self.client.aclose()
