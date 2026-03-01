#!/usr/bin/env python3
"""Seed Convex with test data for demo purposes.

Creates a test user and several demo sandboxes with different models
competing on the same goal. Uses the Convex HTTP API directly.

Usage:
    python scripts/seed_convex.py          # target prod
    python scripts/seed_convex.py --dev    # target dev Convex deployment
"""

import asyncio
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "orchestrator"))

from dotenv import load_dotenv

_root = os.path.join(os.path.dirname(__file__), "..")
USE_DEV = "--dev" in sys.argv
if USE_DEV:
    sys.argv.remove("--dev")

if USE_DEV:
    _env_file = os.path.join(_root, ".env.local")
    print(f"  env: DEV (loading {_env_file})")
else:
    _env_file = os.path.join(_root, "agent", ".env")
    print(f"  env: PROD (loading {_env_file})")

if os.path.exists(_env_file):
    load_dotenv(_env_file)
else:
    print(f"WARNING: {_env_file} not found")
    sys.exit(1)

from event_bridge import EventBridge


DEMO_GOAL = "Get 100 followers on X (Twitter) within 2 hours"
DEMO_GOAL_TYPE = "follower_count"
DEMO_TARGET = 100
DEMO_TIME_LIMIT = 7200

MODELS = ["claude-sonnet", "gpt-4o", "gemini-2-flash"]


async def seed():
    convex_url = os.environ.get("CONVEX_URL", "")
    convex_key = os.environ.get("CONVEX_DEPLOY_KEY", "")

    if not convex_url or not convex_key:
        print("ERROR: CONVEX_URL and CONVEX_DEPLOY_KEY must be set")
        sys.exit(1)

    bridge = EventBridge(convex_url, convex_key)

    print("Creating test user...")
    try:
        user_id = await bridge._call_mutation("users:create", {
            "name": "Demo Spectator",
            "email": "demo@agentarena.dev",
            "initialBalance": 5000,
        })
        print(f"  User created: {user_id}")
    except Exception as e:
        print(f"  User creation failed (may already exist): {e}")
        result = await bridge._call_query("users:getByEmail", {"email": "demo@agentarena.dev"})
        if result:
            user_id = result["_id"]
            print(f"  Using existing user: {user_id}")
        else:
            print("  Could not find or create user")
            await bridge.close()
            sys.exit(1)

    print(f"\nCreating demo sandboxes for goal: '{DEMO_GOAL}'")
    sandbox_ids = []
    for model in MODELS:
        try:
            sandbox_id = await bridge._call_mutation("sandboxes:create", {
                "goalDescription": DEMO_GOAL,
                "goalType": DEMO_GOAL_TYPE,
                "targetValue": DEMO_TARGET,
                "model": model,
                "timeLimit": DEMO_TIME_LIMIT,
                "initialCredits": 50,
                "userId": user_id,
            })
            sandbox_ids.append((model, sandbox_id))
            print(f"  [{model}] sandbox: {sandbox_id}")
        except Exception as e:
            print(f"  [{model}] failed: {e}")

    await bridge.close()

    print(f"\nDone! Created {len(sandbox_ids)} sandboxes.")
    print("View them at your Convex dashboard or the frontend.")


if __name__ == "__main__":
    asyncio.run(seed())
