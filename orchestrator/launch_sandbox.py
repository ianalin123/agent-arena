#!/usr/bin/env python3
"""End-to-end sandbox launcher — CLI script for demo and production use.

Creates a Convex sandbox record, spins up a Daytona sandbox, uploads
agent code, installs dependencies, starts agent_runner.py, and updates
Convex with the Daytona sandbox ID.

Usage:
    python orchestrator/launch_sandbox.py \
        --goal "Get 100 followers on X in 2 hours" \
        --goal-type follower_count \
        --target 100 \
        --model claude-sonnet \
        --time-limit 7200
"""

import argparse
import asyncio
import json
import logging
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from dotenv import load_dotenv
from event_bridge import EventBridge
from sandbox_manager import SandboxManager

logger = logging.getLogger(__name__)

ENV_KEYS_TO_FORWARD = [
    "ANTHROPIC_API_KEY",
    "OPENAI_API_KEY",
    "GOOGLE_API_KEY",
    "BROWSER_USE_API_KEY",
    "AGENTMAIL_API_KEY",
    "SUPERMEMORY_API_KEY",
    "LMNR_PROJECT_API_KEY",
    "LOCUS_API_KEY",
    "CONVEX_URL",
    "CONVEX_DEPLOY_KEY",
]


async def launch(args: argparse.Namespace) -> None:
    agent_env = os.path.join(os.path.dirname(__file__), "..", "agent", ".env")
    if os.path.exists(agent_env):
        load_dotenv(agent_env)

    convex_url = os.environ.get("CONVEX_URL", "")
    convex_key = os.environ.get("CONVEX_DEPLOY_KEY", "")

    if not convex_url or not convex_key:
        logger.error("CONVEX_URL and CONVEX_DEPLOY_KEY must be set")
        sys.exit(1)

    bridge = EventBridge(convex_url, convex_key)

    logger.info("Creating sandbox record in Convex...")
    user_id = args.user_id
    if not user_id:
        user_id = await _ensure_test_user(bridge)

    sandbox_id = await bridge._call_mutation("sandboxes:create", {
        "goalDescription": args.goal,
        "goalType": args.goal_type,
        "targetValue": args.target,
        "model": args.model,
        "timeLimit": args.time_limit,
        "initialCredits": args.credits,
        "userId": user_id,
    })
    logger.info("Convex sandbox created: %s", sandbox_id)

    env_vars = {}
    for key in ENV_KEYS_TO_FORWARD:
        val = os.environ.get(key, "")
        if val:
            env_vars[key] = val

    sandbox_config = {
        "sandbox_id": sandbox_id,
        "goal": args.goal,
        "goal_type": args.goal_type,
        "target_value": args.target,
        "model": args.model,
        "time_limit": args.time_limit,
        "initial_credits": args.credits,
        "agentmail_inbox_id": "",
        "paylocus_wallet_id": "",
    }

    logger.info("Creating Daytona sandbox and deploying agent...")
    manager = SandboxManager()
    try:
        daytona_id = await manager.create_and_start_agent(sandbox_config, env_vars)
    except Exception as e:
        logger.error("Failed to create Daytona sandbox: %s", e)
        await bridge._call_mutation("sandboxes:updateStatus", {
            "sandboxId": sandbox_id,
            "status": "failed",
        })
        await bridge.close()
        sys.exit(1)

    logger.info("Daytona sandbox running: %s", daytona_id)

    try:
        await bridge._call_mutation("sandboxes:updateAfterLaunch", {
            "sandboxId": sandbox_id,
            "daytonaSandboxId": daytona_id,
            "agentmailInboxId": "",
            "paylocusWalletId": "",
        })
    except Exception as e:
        logger.warning("updateAfterLaunch failed (may be internal mutation): %s", e)
        try:
            await bridge._call_mutation("sandboxes:updateStatus", {
                "sandboxId": sandbox_id,
                "status": "active",
            })
        except Exception:
            pass

    await bridge.close()
    await manager.close()

    print("\n" + "=" * 60)
    print(f"  Sandbox launched successfully!")
    print(f"  Convex Sandbox ID:  {sandbox_id}")
    print(f"  Daytona Sandbox ID: {daytona_id}")
    print(f"  Goal: {args.goal}")
    print(f"  Model: {args.model}")
    print("=" * 60 + "\n")


async def _ensure_test_user(bridge: EventBridge) -> str:
    """Create or find a test user in Convex."""
    try:
        user_id = await bridge._call_mutation("users:ensureTestUser", {
            "name": "Test User",
            "email": "test@agentarena.dev",
        })
        return user_id
    except Exception:
        logger.warning("ensureTestUser mutation not available, trying create")
        try:
            user_id = await bridge._call_mutation("users:create", {
                "name": "Test User",
                "email": "test@agentarena.dev",
                "initialBalance": 1000,
            })
            return user_id
        except Exception as e:
            logger.error("Could not create test user: %s", e)
            raise


def main():
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(name)s %(levelname)s %(message)s",
    )

    parser = argparse.ArgumentParser(description="Launch an Agent Arena sandbox end-to-end")
    parser.add_argument("--goal", required=True, help="Goal description for the agent")
    parser.add_argument("--goal-type", default="general", help="Goal type (follower_count, revenue, views, etc.)")
    parser.add_argument("--target", type=float, default=100, help="Target value for the goal")
    parser.add_argument("--model", default="claude-sonnet", help="LLM model key")
    parser.add_argument("--time-limit", type=int, default=7200, help="Time limit in seconds")
    parser.add_argument("--credits", type=int, default=50, help="Initial credits")
    parser.add_argument("--user-id", default="", help="Convex user ID (auto-creates test user if empty)")
    args = parser.parse_args()

    asyncio.run(launch(args))


if __name__ == "__main__":
    main()
