# scripts/run_critical_path.py (or similar)
import asyncio
import json
import os
import httpx

CONVEX_URL = os.environ["CONVEX_URL"].rstrip("/")
CONVEX_DEPLOY_KEY = os.environ["CONVEX_DEPLOY_KEY"]


async def call_mutation(client: httpx.AsyncClient, path: str, args: dict):
    resp = await client.post(
        f"{CONVEX_URL}/api/mutation",
        json={"path": path, "args": args, "format": "json"},
        headers={
            "Authorization": f"Convex {CONVEX_DEPLOY_KEY}",
            "Content-Type": "application/json",
        },
    )
    resp.raise_for_status()
    data = resp.json()
    if data.get("status") == "error":
        raise RuntimeError(data.get("errorMessage", "mutation failed"))
    return data.get("value")


async def call_query(client: httpx.AsyncClient, path: str, args: dict):
    resp = await client.post(
        f"{CONVEX_URL}/api/query",
        json={"path": path, "args": args, "format": "json"},
        headers={
            "Authorization": f"Convex {CONVEX_DEPLOY_KEY}",
            "Content-Type": "application/json",
        },
    )
    resp.raise_for_status()
    data = resp.json()
    if data.get("status") == "error":
        raise RuntimeError(data.get("errorMessage", "query failed"))
    return data.get("value")


async def main():
    async with httpx.AsyncClient() as client:
        # 0. Create a test user first
        user_id = await call_mutation(client, "users:create", {
            "name": "Test User",
            "email": "test@example.com",
            "initialBalance": 1000,
        })
        print("userId:", user_id)

        # 1. Create sandbox
        sandbox_id = await call_mutation(client, "sandboxes:create", {
            "goalDescription": "Book a flight to NYC",
            "goalType": "task",
            "targetValue": 1,
            "model": "claude-3-5-sonnet",
            "timeLimit": 300,
            "initialCredits": 100,
            "userId": user_id,
        })
        print("sandboxId:", sandbox_id)

        # 2. Push event
        await call_mutation(client, "events:push", {
            "sandboxId": sandbox_id,
            "eventType": "test",
            "payload": json.dumps({"message": "hello from critical path script"}),
        })
        print("events.push done")

        # 3a. Update progress
        await call_mutation(client, "sandboxes:updateProgress", {
            "sandboxId": sandbox_id,
            "progress": 0.5,
        })
        print("updateProgress done")

        # 3b. Place bet (user bets 50 on "yes")
        await call_mutation(client, "betting:placeBet", {
            "sandboxId": sandbox_id,
            "userId": user_id,
            "amount": 50,
            "position": "yes",
        })
        print("placeBet done")

        # 4. Get full sandbox + pool + events + payments
        result = await call_query(client, "sandboxes:get", {"sandboxId": sandbox_id})
        print("sandboxes.get result:")
        print(json.dumps(result, indent=2, default=str))

        # Sanity checks
        assert result.get("sandbox") is not None
        assert result.get("pool") is not None
        assert result.get("recentEvents") is not None
        assert result.get("recentPayments") is not None
        print("\nOK: sandbox + pool + events + payments present")
        return result


if __name__ == "__main__":
    asyncio.run(main())