"""Step 1.3 — Test the Event Bridge against a live Convex deployment.

Usage:
    export CONVEX_URL="https://your-deployment.convex.cloud"
    export CONVEX_DEPLOY_KEY="your-deploy-key"
    python scripts/test_event_bridge.py

Requires a sandbox to already exist. If SANDBOX_ID is not set,
the script creates a test user + sandbox first.
"""

import asyncio
import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "orchestrator"))

from event_bridge import EventBridge  # noqa: E402

CONVEX_URL = os.environ.get("CONVEX_URL", "").rstrip("/")
CONVEX_DEPLOY_KEY = os.environ.get("CONVEX_DEPLOY_KEY", "")
SANDBOX_ID = os.environ.get("SANDBOX_ID", "")


async def main() -> None:
    if not CONVEX_URL or not CONVEX_DEPLOY_KEY:
        print("ERROR: Set CONVEX_URL and CONVEX_DEPLOY_KEY env vars first.")
        sys.exit(1)

    bridge = EventBridge(CONVEX_URL, CONVEX_DEPLOY_KEY)

    try:
        sandbox_id = SANDBOX_ID

        if not sandbox_id:
            print("No SANDBOX_ID set — creating a test user + sandbox...")
            user_id = await bridge._call_mutation("users:create", {
                "name": "Bridge Test User",
                "email": "bridge-test@example.com",
                "initialBalance": 1000,
            })
            print(f"  Created user: {user_id}")

            sandbox_id = await bridge._call_mutation("sandboxes:create", {
                "goalDescription": "Event bridge smoke test",
                "goalType": "task",
                "targetValue": 1,
                "model": "test-model",
                "timeLimit": 300,
                "initialCredits": 50,
                "userId": user_id,
            })
            print(f"  Created sandbox: {sandbox_id}")

        print(f"\nTesting Event Bridge against sandbox {sandbox_id}...")

        # 1. push_event
        print("\n1) push_event('test', {message: 'hello from bridge test'})...")
        await bridge.push_event(sandbox_id, "test", {"message": "hello from bridge test"})
        print("   OK")

        # 2. push_event with a larger payload
        print("2) push_event('log', {step: 1, action: 'navigate', url: ...})...")
        await bridge.push_event(sandbox_id, "log", {
            "step": 1,
            "action": "navigate",
            "url": "https://example.com",
            "status": "success",
        })
        print("   OK")

        # 3. update_progress
        print("3) update_progress(0.25)...")
        await bridge.update_progress(sandbox_id, 0.25)
        print("   OK")

        # 4. fetch_pending_prompts (should return empty list)
        print("4) fetch_pending_prompts()...")
        prompts = await bridge.fetch_pending_prompts(sandbox_id)
        print(f"   OK — got {len(prompts)} pending prompt(s)")

        # 5. Verify events landed
        print("\n5) Verifying events via query...")
        events = await bridge._call_query("events:recent", {
            "sandboxId": sandbox_id,
            "limit": 10,
        })
        print(f"   Found {len(events)} event(s) for this sandbox")
        for ev in events:
            print(f"     - type={ev.get('eventType')}, payload={ev.get('payload')[:60]}...")

        print("\n=== All Event Bridge tests passed ===")

    finally:
        await bridge.close()


if __name__ == "__main__":
    asyncio.run(main())
