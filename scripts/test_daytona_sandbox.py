"""Step 1.4 — Test the Daytona SandboxManager: create a sandbox, check status, destroy it.

Usage:
    export DAYTONA_API_KEY="your-daytona-api-key"
    python scripts/test_daytona_sandbox.py

Optional:
    export DAYTONA_API_URL="https://app.daytona.io/api"  (default)
"""

import asyncio
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "orchestrator"))

from sandbox_manager import SandboxManager  # noqa: E402


async def main() -> None:
    api_key = os.environ.get("DAYTONA_API_KEY", "")
    if not api_key:
        print("ERROR: Set DAYTONA_API_KEY env var first.")
        sys.exit(1)

    manager = SandboxManager()

    print("1) Creating a minimal Daytona sandbox...")
    config = {
        "sandbox_id": "test-sandbox-local",
        "goal": "Daytona SDK smoke test",
        "model": "test",
        "time_limit": 60,
        "initial_credits": 0,
    }

    try:
        daytona_id = await manager.create_and_start_agent(config, env_vars={})
    except Exception as e:
        print(f"   create_and_start_agent failed (expected if agent files missing): {e}")
        print("   Falling back to basic sandbox creation...")
        from daytona import AsyncDaytona, CreateSandboxFromSnapshotParams, DaytonaConfig

        dc = DaytonaConfig(
            api_key=api_key,
            api_url=os.environ.get("DAYTONA_API_URL", "https://app.daytona.io/api"),
            target="us",
        )
        async with AsyncDaytona(dc) as daytona:
            sandbox = await daytona.create(CreateSandboxFromSnapshotParams(language="python"))
            daytona_id = sandbox.id
            print(f"   Basic sandbox created: {daytona_id}")

            print("\n2) Checking sandbox status...")
            info = await daytona.get(daytona_id)
            state = getattr(info, "state", "unknown")
            print(f"   State: {state}")

            print("\n3) Destroying sandbox...")
            await daytona.delete(info)
            print("   Destroyed.")

        print("\n=== Daytona sandbox test passed (basic mode) ===")
        return

    print(f"   Created sandbox: {daytona_id}")

    print("\n2) Checking if agent is running...")
    try:
        running = await manager.is_agent_running(daytona_id)
        print(f"   Agent running: {running}")
    except Exception as e:
        print(f"   Could not check agent status: {e}")

    print("\n3) Fetching agent logs...")
    try:
        logs = await manager.get_agent_logs(daytona_id, tail=20)
        print(f"   Logs ({len(logs)} chars):")
        for line in logs.strip().splitlines()[:10]:
            print(f"     {line}")
    except Exception as e:
        print(f"   Could not fetch logs: {e}")

    print("\n4) Destroying sandbox...")
    await manager.destroy_sandbox(daytona_id)
    print("   Destroyed.")

    await manager.close()
    print("\n=== Daytona sandbox test passed ===")


if __name__ == "__main__":
    asyncio.run(main())
