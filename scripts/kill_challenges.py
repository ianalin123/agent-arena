#!/usr/bin/env python3
"""Kill all running sandboxes and Browser Use sessions for seeded challenges.

Destroys Daytona sandboxes, stops Browser Use cloud sessions, and marks
sandboxes as stopped in Convex.

Usage:
    python scripts/kill_challenges.py               # kill sandboxes for challenges in .env.local
    python scripts/kill_challenges.py --all-sessions # also stop ALL Browser Use sessions (not just challenge ones)
"""

import asyncio
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "orchestrator"))

from dotenv import load_dotenv

agent_env = os.path.join(os.path.dirname(__file__), "..", "agent", ".env")
if os.path.exists(agent_env):
    load_dotenv(agent_env)

from event_bridge import EventBridge
from sandbox_manager import SandboxManager

ENV_FILE = os.path.join(os.path.dirname(__file__), "..", ".env.local")


def _read_challenge_ids() -> dict[str, str]:
    """Read challenge IDs from .env.local."""
    ids: dict[str, str] = {}
    if not os.path.exists(ENV_FILE):
        return ids
    with open(ENV_FILE) as f:
        for line in f:
            line = line.strip()
            if line.startswith("NEXT_PUBLIC_CHALLENGE_FOLLOWERS="):
                ids["followers"] = line.split("=", 1)[1]
            elif line.startswith("NEXT_PUBLIC_CHALLENGE_REVENUE="):
                ids["revenue"] = line.split("=", 1)[1]
    return ids


async def _stop_browser_use_sessions() -> int:
    """Stop all Browser Use cloud sessions via the SDK. Returns count stopped."""
    api_key = os.environ.get("BROWSER_USE_API_KEY", "")
    if not api_key:
        print("  BROWSER_USE_API_KEY not set — skipping")
        return 0

    try:
        from browser_use_sdk.v3 import AsyncBrowserUse
    except ImportError:
        print("  browser_use_sdk not installed — skipping")
        return 0

    stopped = 0
    client = AsyncBrowserUse(api_key=api_key)
    try:
        sessions = await client.sessions.list()
        if not sessions:
            print("  No Browser Use sessions found")
            return 0

        for session in sessions:
            sid = str(getattr(session, "id", "") or getattr(session, "session_id", ""))
            status = getattr(session, "status", "unknown")
            if not sid:
                continue
            if status in ("stopped", "completed", "error", "failed"):
                print(f"  Session {sid} already {status} — skipping")
                continue
            try:
                await client.sessions.stop(sid)
                print(f"  Stopped session {sid} (was {status})")
                stopped += 1
            except Exception as e:
                print(f"  Failed to stop session {sid}: {e}")
    except AttributeError:
        print("  SDK does not support sessions.list() — skipping bulk stop")
    except Exception as e:
        print(f"  Browser Use cleanup error: {e}")
    finally:
        try:
            await client.close()
        except Exception:
            pass

    return stopped


async def kill():
    stop_all_sessions = "--all-sessions" in sys.argv

    convex_url = os.environ.get("CONVEX_URL", "")
    convex_key = os.environ.get("CONVEX_DEPLOY_KEY", "")
    if not convex_url or not convex_key:
        print("ERROR: CONVEX_URL and CONVEX_DEPLOY_KEY must be set (loaded from agent/.env)")
        sys.exit(1)

    bridge = EventBridge(convex_url, convex_key)
    manager = SandboxManager()

    challenge_ids = _read_challenge_ids()
    if not challenge_ids:
        print("ERROR: No challenge IDs found in .env.local")
        await bridge.close()
        await manager.close()
        sys.exit(1)

    # --- Step 1: Destroy Daytona sandboxes & mark stopped in Convex ---
    print("Step 1: Destroying Daytona sandboxes...\n")
    daytona_destroyed = 0
    convex_stopped = 0

    for slug, cid in challenge_ids.items():
        print(f"  [{slug}] Challenge: {cid}")
        try:
            data = await bridge._call_query("challenges:get", {"challengeId": cid})
        except Exception as e:
            print(f"    Could not fetch challenge: {e}")
            continue

        if not data:
            print("    Challenge not found in Convex")
            continue

        for label, sb in [("claude", data.get("claudeSandbox")),
                          ("openai", data.get("openaiSandbox"))]:
            if not sb:
                print(f"    [{label}] No sandbox data")
                continue

            sandbox_id = sb.get("_id", "")
            daytona_id = sb.get("daytonaSandboxId", "")
            status = sb.get("status", "")
            live_url = sb.get("liveUrl", "")

            print(f"    [{label}] sandbox={sandbox_id}  daytona={daytona_id or '(none)'}  status={status}")
            if live_url:
                print(f"    [{label}] live_url={live_url}")

            if daytona_id:
                try:
                    await manager.destroy_sandbox(daytona_id)
                    print(f"    [{label}] Daytona sandbox destroyed")
                    daytona_destroyed += 1
                except Exception as e:
                    print(f"    [{label}] Daytona destroy failed: {e}")

            if sandbox_id and status in ("active", "paused", "pending"):
                try:
                    await bridge._call_mutation("sandboxes:stop", {"sandboxId": sandbox_id})
                    print(f"    [{label}] Marked as stopped in Convex")
                    convex_stopped += 1
                except Exception as e:
                    print(f"    [{label}] Convex stop failed: {e}")

    print(f"\n  Daytona sandboxes destroyed: {daytona_destroyed}")
    print(f"  Convex sandboxes stopped:    {convex_stopped}")

    # --- Step 2: Stop Browser Use sessions ---
    if stop_all_sessions:
        print("\nStep 2: Stopping all Browser Use sessions...\n")
        count = await _stop_browser_use_sessions()
        print(f"\n  Browser Use sessions stopped: {count}")
    else:
        print("\nStep 2: Skipped (use --all-sessions to stop all Browser Use sessions)")

    await manager.close()
    await bridge.close()
    print("\nDone.")


if __name__ == "__main__":
    asyncio.run(kill())
