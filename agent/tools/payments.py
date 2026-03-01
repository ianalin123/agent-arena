"""Locus integration — USDC payments for AI agents on Base.

Uses the Locus REST API (https://api.paywithlocus.com/api) for:
  - Checking wallet balance
  - Sending USDC to wallet addresses
  - Sending USDC via email (escrow-backed)
  - Querying transaction history

Auth: Bearer token with a claw_* API key from https://app.paywithlocus.com
Each API key maps to one smart wallet on Base.
"""

import os
import logging
from typing import Any

import httpx

logger = logging.getLogger(__name__)

LOCUS_API_BASE = "https://api.paywithlocus.com/api"


class PaymentsTool:
    def __init__(self, api_key: str | None = None):
        self.api_key = api_key or os.environ.get("LOCUS_API_KEY", "")
        self._available = bool(self.api_key)
        self.client = httpx.AsyncClient(
            base_url=LOCUS_API_BASE,
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
            timeout=30.0,
        ) if self._available else None
        self._cached_balance: float = 0.0

    async def get_balance(self) -> float:
        """Get current wallet USDC balance."""
        if not self._available:
            return 0.0
        try:
            resp = await self.client.get("/pay/balance")
            resp.raise_for_status()
            data = resp.json()
            if data.get("success"):
                # Locus returns balance as data.usdc_balance (string), not data.balance
                raw = data["data"].get("usdc_balance") or data["data"].get("balance", 0)
                self._cached_balance = float(raw)
            return self._cached_balance
        except Exception as e:
            logger.error("Failed to get wallet balance: %s", e)
            return self._cached_balance

    async def send_usdc(self, action: dict[str, Any]) -> dict[str, Any]:
        """Send USDC to a wallet address on Base."""
        if not self._available:
            return {"status": "error", "error": "Locus API key not configured"}

        to_address = action.get("to_address", "") or action.get("recipient", "")
        amount = action.get("amount", 0)
        memo = action.get("memo", "") or action.get("description", "")

        try:
            resp = await self.client.post("/pay/send", json={
                "to_address": to_address,
                "amount": amount,
                "memo": memo,
            })
            resp.raise_for_status()
            data = resp.json()

            if data.get("success"):
                tx = data["data"]
                return {
                    "status": tx.get("status", "QUEUED"),
                    "transaction_id": tx.get("transaction_id", ""),
                    "from_address": tx.get("from_address", ""),
                    "to_address": to_address,
                    "amount": amount,
                    "memo": memo,
                    "approval_url": tx.get("approval_url"),
                }
            else:
                return {
                    "status": "error",
                    "error": data.get("message", "Unknown error"),
                    "to_address": to_address,
                    "amount": amount,
                }
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 403:
                body = e.response.json() if e.response.headers.get("content-type", "").startswith("application/json") else {}
                return {
                    "status": "policy_rejected",
                    "error": body.get("message", "Policy limit reached — ask your human to adjust limits"),
                    "to_address": to_address,
                    "amount": amount,
                }
            logger.error("USDC send failed: %s", e)
            return {"status": "error", "error": str(e), "to_address": to_address, "amount": amount}
        except Exception as e:
            logger.error("USDC send failed: %s", e)
            return {"status": "error", "error": str(e), "to_address": to_address, "amount": amount}

    async def send_usdc_email(self, action: dict[str, Any]) -> dict[str, Any]:
        """Send USDC to an email address via escrow."""
        if not self._available:
            return {"status": "error", "error": "Locus API key not configured"}

        email = action.get("email", "")
        amount = action.get("amount", 0)
        memo = action.get("memo", "") or action.get("description", "")
        expires_in_days = action.get("expires_in_days", 30)

        try:
            resp = await self.client.post("/pay/send-email", json={
                "email": email,
                "amount": amount,
                "memo": memo,
                "expires_in_days": expires_in_days,
            })
            resp.raise_for_status()
            data = resp.json()

            if data.get("success"):
                tx = data["data"]
                return {
                    "status": tx.get("status", "QUEUED"),
                    "transaction_id": tx.get("transaction_id", ""),
                    "escrow_id": tx.get("escrow_id", ""),
                    "recipient_email": email,
                    "amount": amount,
                    "memo": memo,
                    "expires_at": tx.get("expires_at", ""),
                    "approval_url": tx.get("approval_url"),
                }
            else:
                return {
                    "status": "error",
                    "error": data.get("message", "Unknown error"),
                    "email": email,
                    "amount": amount,
                }
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 403:
                body = e.response.json() if e.response.headers.get("content-type", "").startswith("application/json") else {}
                return {
                    "status": "policy_rejected",
                    "error": body.get("message", "Policy limit reached"),
                    "email": email,
                    "amount": amount,
                }
            logger.error("USDC email send failed: %s", e)
            return {"status": "error", "error": str(e), "email": email, "amount": amount}
        except Exception as e:
            logger.error("USDC email send failed: %s", e)
            return {"status": "error", "error": str(e), "email": email, "amount": amount}

    async def get_transaction_history(self, limit: int = 50) -> list[dict[str, Any]]:
        """Fetch recent x402 transaction history."""
        if not self._available:
            return []
        try:
            resp = await self.client.get("/x402/transactions", params={"limit": limit})
            resp.raise_for_status()
            data = resp.json()
            if data.get("success"):
                return data["data"].get("transactions", [])
            return []
        except Exception as e:
            logger.error("Failed to get transaction history: %s", e)
            return []

    async def close(self) -> None:
        if self.client:
            await self.client.aclose()
