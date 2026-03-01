"""Daytona sandbox lifecycle — create, configure, and run agent sandboxes.

Handles the full lifecycle: create sandbox, upload agent code, install
dependencies, start agent_runner.py, monitor, and destroy.
"""

import asyncio
import json
import logging
import os
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

try:
    from daytona import AsyncDaytona, CreateSandboxFromSnapshotParams, DaytonaConfig
except ImportError:
    AsyncDaytona = None
    CreateSandboxFromSnapshotParams = None
    DaytonaConfig = None

AGENT_DIR = Path(__file__).resolve().parent.parent / "agent"
ORCHESTRATOR_DIR = Path(__file__).resolve().parent

AGENT_FILES = [
    "agent_runner.py",
    "base.py",
    "model_router.py",
    "prompts.py",
    "goal_verifier.py",
    "memory.py",
    "requirements.txt",
    "providers/__init__.py",
    "providers/anthropic_provider.py",
    "providers/openai_provider.py",
    "providers/gemini_provider.py",
    "tools/__init__.py",
    "tools/browser.py",
    "tools/email.py",
    "tools/payments.py",
    "tools/schemas.py",
]

ORCHESTRATOR_FILES = [
    "event_bridge.py",
]


class SandboxManager:
    """Manages Daytona sandboxes for running AI agents in isolation."""

    def __init__(self, api_key: str | None = None, api_url: str | None = None):
        self._api_key = api_key or os.environ.get("DAYTONA_API_KEY", "")
        self._api_url = api_url or os.environ.get("DAYTONA_API_URL", "https://app.daytona.io/api")
        self._daytona: Any = None

    async def _get_client(self) -> "AsyncDaytona":
        if AsyncDaytona is None:
            raise RuntimeError("Daytona SDK not installed. Run: pip install daytona")
        if self._daytona is None:
            config = DaytonaConfig(
                api_key=self._api_key,
                api_url=self._api_url,
                target="us",
            )
            self._daytona = AsyncDaytona(config)
        return self._daytona

    async def create_and_start_agent(
        self,
        sandbox_config: dict[str, Any],
        env_vars: dict[str, str] | None = None,
    ) -> str:
        """Create a Daytona sandbox, upload agent code, install deps, start agent.

        Returns the Daytona sandbox ID.
        """
        daytona = await self._get_client()

        params = CreateSandboxFromSnapshotParams(language="python")
        sandbox = await daytona.create(params)
        logger.info("Daytona sandbox created: %s", sandbox.id)

        try:
            await self._create_directories(sandbox)
            await self._upload_agent_files(sandbox)
            await self._upload_config(sandbox, sandbox_config)
            await self._upload_env(sandbox, env_vars or {})
            await self._install_dependencies(sandbox)
            await self._start_agent(sandbox, env_vars or {})
        except Exception:
            logger.exception("Error setting up sandbox %s — destroying", sandbox.id)
            try:
                await daytona.delete(sandbox)
            except Exception:
                pass
            raise

        return sandbox.id

    async def _create_directories(self, sandbox: Any) -> None:
        """Create the directory structure inside the sandbox."""
        for subdir in ["agent", "agent/providers", "agent/tools", "orchestrator"]:
            try:
                await sandbox.fs.create_folder(f"/home/daytona/{subdir}", "0755")
            except Exception:
                pass

    async def _upload_agent_files(self, sandbox: Any) -> None:
        """Upload all agent and orchestrator source files in parallel."""
        upload_tasks = []

        for rel_path in AGENT_FILES:
            local_path = AGENT_DIR / rel_path
            if not local_path.exists():
                logger.warning("Agent file not found locally: %s", local_path)
                continue
            content = local_path.read_bytes()
            remote_path = f"/home/daytona/agent/{rel_path}"
            upload_tasks.append(sandbox.fs.upload_file(content, remote_path))

        for rel_path in ORCHESTRATOR_FILES:
            local_path = ORCHESTRATOR_DIR / rel_path
            if not local_path.exists():
                logger.warning("Orchestrator file not found locally: %s", local_path)
                continue
            content = local_path.read_bytes()
            remote_path = f"/home/daytona/orchestrator/{rel_path}"
            upload_tasks.append(sandbox.fs.upload_file(content, remote_path))

        if upload_tasks:
            await asyncio.gather(*upload_tasks)
            logger.debug("Uploaded %d files in parallel", len(upload_tasks))

    async def _upload_config(self, sandbox: Any, config: dict[str, Any]) -> None:
        """Write the sandbox config JSON."""
        await sandbox.fs.upload_file(
            json.dumps(config, indent=2).encode(),
            "/home/daytona/config.json",
        )

    async def _upload_env(self, sandbox: Any, env_vars: dict[str, str]) -> None:
        """Write the .env file for the agent process."""
        lines = [f"{k}={v}" for k, v in env_vars.items()]
        await sandbox.fs.upload_file(
            "\n".join(lines).encode(),
            "/home/daytona/agent/.env",
        )

    async def _install_dependencies(self, sandbox: Any) -> None:
        """Install Python dependencies inside the sandbox."""
        result = await sandbox.process.exec(
            "pip install -r /home/daytona/agent/requirements.txt",
            timeout=180,
        )
        logger.info("pip install exit code: %s", getattr(result, "exit_code", "?"))

    async def _start_agent(self, sandbox: Any, env_vars: dict[str, str]) -> None:
        """Start agent_runner.py in background inside the sandbox."""
        cmd = (
            "cd /home/daytona/agent && "
            "nohup python agent_runner.py --config /home/daytona/config.json "
            "> /home/daytona/agent.log 2>&1 &"
        )
        await sandbox.process.exec(cmd, env=env_vars)
        logger.info("Agent process started in sandbox")

    async def get_agent_logs(self, daytona_sandbox_id: str, tail: int = 100) -> str:
        """Read agent logs from the sandbox."""
        daytona = await self._get_client()
        sandbox = await daytona.get(daytona_sandbox_id)
        result = await sandbox.process.exec(f"tail -n {tail} /home/daytona/agent.log")
        return getattr(result, "stdout", "") or getattr(result, "output", "")

    async def is_agent_running(self, daytona_sandbox_id: str) -> bool:
        """Check if the agent process is still alive."""
        daytona = await self._get_client()
        sandbox = await daytona.get(daytona_sandbox_id)
        result = await sandbox.process.exec("pgrep -f agent_runner.py")
        exit_code = getattr(result, "exit_code", 1)
        return exit_code == 0

    async def destroy_sandbox(self, daytona_sandbox_id: str) -> None:
        """Stop and delete a Daytona sandbox."""
        daytona = await self._get_client()
        sandbox = await daytona.get(daytona_sandbox_id)
        await daytona.delete(sandbox)
        logger.info("Sandbox destroyed: %s", daytona_sandbox_id)

    async def close(self) -> None:
        """Release the Daytona client."""
        if self._daytona is not None:
            await self._daytona.close()
            self._daytona = None
