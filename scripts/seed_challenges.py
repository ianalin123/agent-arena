#!/usr/bin/env python3
"""Seed two head-to-head challenges (followers + revenue) in Convex,
then launch each sandbox through the orchestrator so agents actually start.

Usage:
    python scripts/seed_challenges.py                  # create + launch
    python scripts/seed_challenges.py --no-launch      # create only (skip orchestrator)
    python scripts/seed_challenges.py --launch-existing # re-launch pending sandboxes for existing challenges
"""

import asyncio
import os
import sys

import httpx

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "orchestrator"))

from dotenv import load_dotenv

agent_env = os.path.join(os.path.dirname(__file__), "..", "agent", ".env")
if os.path.exists(agent_env):
    load_dotenv(agent_env)

from event_bridge import EventBridge

ORCHESTRATOR_URL = os.environ.get("ORCHESTRATOR_URL", "http://localhost:8000")

ENV_FILE = os.path.join(os.path.dirname(__file__), "..", ".env.local")

CHALLENGES = [
    {
        "slug": "followers",
        "goalDescription": "Grow a social media account to 10,000 followers",
        "goalType": "follower_count",
        "targetValue": 10000,
        "timeLimit": 7200,
        "initialCredits": 50,
    },
    {
        "slug": "revenue",
        "goalDescription": "Earn $10,000 in revenue from scratch",
        "goalType": "revenue",
        "targetValue": 10000,
        "timeLimit": 7200,
        "initialCredits": 50,
    },
]


async def launch_sandbox(
    bridge: EventBridge,
    http: httpx.AsyncClient,
    sandbox_data: dict,
    label: str,
) -> bool:
    """Call the orchestrator /launch endpoint, then update Convex."""
    sandbox_id = sandbox_data["_id"]
    print(f"    [{label}] Launching sandbox {sandbox_id} via orchestrator...")

    try:
        resp = await http.post(
            f"{ORCHESTRATOR_URL.rstrip('/')}/launch",
            json={
                "sandboxId": sandbox_id,
                "goalDescription": sandbox_data["goalDescription"],
                "model": sandbox_data["model"],
                "timeLimit": sandbox_data["timeLimit"],
            },
            timeout=300,
        )
        resp.raise_for_status()
        result = resp.json()

        daytona_id = result.get("daytonaSandboxId", "")
        agentmail_id = result.get("agentmailInboxId", "")
        paylocus_id = result.get("paylocusWalletId", "")

        print(f"    [{label}] Daytona sandbox: {daytona_id}")
        print(f"    [{label}] AgentMail inbox: {agentmail_id}")

        await bridge._call_mutation("sandboxes:updateAfterLaunch", {
            "sandboxId": sandbox_id,
            "daytonaSandboxId": daytona_id,
            "agentmailInboxId": agentmail_id,
            "paylocusWalletId": paylocus_id,
            "walletBalance": result.get("walletBalance"),
        })
        print(f"    [{label}] Status → active")
        return True

    except httpx.ConnectError:
        print(f"    [{label}] FAILED: Cannot connect to orchestrator at {ORCHESTRATOR_URL}")
        print(f"           Make sure 'python orchestrator/server.py' is running")
        return False
    except Exception as e:
        print(f"    [{label}] FAILED: {e}")
        return False


def update_env_local(created: dict[str, str]) -> None:
    """Auto-update .env.local with the new challenge IDs."""
    if not created:
        return
    env_path = ENV_FILE
    lines = []
    if os.path.exists(env_path):
        with open(env_path) as f:
            lines = f.readlines()

    key_map = {
        "followers": "NEXT_PUBLIC_CHALLENGE_FOLLOWERS",
        "revenue": "NEXT_PUBLIC_CHALLENGE_REVENUE",
    }
    for slug, cid in created.items():
        key = key_map.get(slug)
        if not key:
            continue
        replaced = False
        for i, line in enumerate(lines):
            if line.startswith(f"{key}="):
                lines[i] = f"{key}={cid}\n"
                replaced = True
                break
        if not replaced:
            lines.append(f"{key}={cid}\n")

    with open(env_path, "w") as f:
        f.writelines(lines)
    print(f"  Updated {env_path}")


async def launch_existing(bridge: EventBridge, http: httpx.AsyncClient) -> None:
    """Find existing challenges from .env.local and re-launch any pending sandboxes."""
    env_path = ENV_FILE
    if not os.path.exists(env_path):
        print(f"ERROR: {env_path} not found")
        return

    challenge_ids = {}
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line.startswith("NEXT_PUBLIC_CHALLENGE_FOLLOWERS="):
                challenge_ids["followers"] = line.split("=", 1)[1]
            elif line.startswith("NEXT_PUBLIC_CHALLENGE_REVENUE="):
                challenge_ids["revenue"] = line.split("=", 1)[1]

    if not challenge_ids:
        print("ERROR: No challenge IDs found in .env.local")
        return

    launched = 0
    total = 0
    for slug, cid in challenge_ids.items():
        print(f"\n  [{slug}] Challenge: {cid}")
        try:
            data = await bridge._call_query("challenges:get", {"challengeId": cid})
            if not data:
                print(f"    Challenge not found in Convex")
                continue
            for label, sb in [("claude", data.get("claudeSandbox")), ("openai", data.get("openaiSandbox"))]:
                if not sb:
                    continue
                total += 1
                status = sb.get("status", "")
                daytona_id = sb.get("daytonaSandboxId", "")
                if status == "active" and daytona_id:
                    print(f"    [{label}] Already active (Daytona: {daytona_id})")
                    launched += 1
                    continue
                if await launch_sandbox(bridge, http, sb, f"{slug}/{label}"):
                    launched += 1
        except Exception as e:
            print(f"    FAILED: {e}")

    print(f"\n  Launched {launched}/{total} sandboxes")


async def seed():
    skip_launch = "--no-launch" in sys.argv
    relaunch = "--launch-existing" in sys.argv

    convex_url = os.environ.get("CONVEX_URL", "")
    convex_key = os.environ.get("CONVEX_DEPLOY_KEY", "")

    if not convex_url or not convex_key:
        print("ERROR: CONVEX_URL and CONVEX_DEPLOY_KEY must be set (loaded from agent/.env)")
        sys.exit(1)

    bridge = EventBridge(convex_url, convex_key)
    http = httpx.AsyncClient()

    if relaunch:
        print("Re-launching existing challenges from .env.local...")
        await launch_existing(bridge, http)
        await http.aclose()
        await bridge.close()
        return

    print("Step 1: Ensure demo user exists...")
    try:
        user_id = await bridge._call_mutation("users:ensureTestUser", {
            "name": "Demo Spectator",
            "email": "demo@agentarena.dev",
        })
        print(f"  User: {user_id}")
    except Exception:
        try:
            user_id = await bridge._call_mutation("users:create", {
                "name": "Demo Spectator",
                "email": "demo@agentarena.dev",
                "initialBalance": 5000,
            })
            print(f"  User created: {user_id}")
        except Exception:
            result = await bridge._call_query("users:getByEmail", {"email": "demo@agentarena.dev"})
            if result:
                user_id = result["_id"]
                print(f"  Using existing user: {user_id}")
            else:
                print("  Could not find or create user")
                await bridge.close()
                await http.aclose()
                sys.exit(1)

    print("\nStep 2: Creating challenges...")
    created = {}
    sandbox_pairs = {}

    for ch in CHALLENGES:
        slug = ch["slug"]
        print(f"\n  [{slug}] {ch['goalDescription']}")
        try:
            challenge_id = await bridge._call_mutation("challenges:create", {
                "goalDescription": ch["goalDescription"],
                "goalType": ch["goalType"],
                "targetValue": ch["targetValue"],
                "timeLimit": ch["timeLimit"],
                "initialCredits": ch["initialCredits"],
                "userId": user_id,
            })
            created[slug] = challenge_id
            print(f"    Challenge ID: {challenge_id}")

            data = await bridge._call_query("challenges:get", {"challengeId": challenge_id})
            if data:
                print(f"    Claude sandbox: {data['claudeSandbox']['_id']}")
                print(f"    OpenAI sandbox: {data['openaiSandbox']['_id']}")
                sandbox_pairs[slug] = (data["claudeSandbox"], data["openaiSandbox"])
        except Exception as e:
            print(f"    FAILED: {e}")

    print("\nStep 3: Updating .env.local...")
    update_env_local(created)

    if not skip_launch and sandbox_pairs:
        print("\nStep 4: Launching sandboxes via orchestrator...")
        launched = 0
        for slug, (claude_sb, openai_sb) in sandbox_pairs.items():
            print(f"\n  [{slug}]")
            if await launch_sandbox(bridge, http, claude_sb, f"{slug}/claude"):
                launched += 1
            if await launch_sandbox(bridge, http, openai_sb, f"{slug}/openai"):
                launched += 1
        print(f"\n  Launched {launched}/{len(sandbox_pairs) * 2} sandboxes")
    elif skip_launch:
        print("\nStep 4: Skipped launch (--no-launch)")

    await http.aclose()
    await bridge.close()

    print("\n" + "=" * 60)
    print("SEED COMPLETE")
    print("=" * 60)
    for slug, cid in created.items():
        print(f"  /challenge/{slug}  →  Convex ID: {cid}")
    print()


if __name__ == "__main__":
    asyncio.run(seed())
