"""Daytona sandbox lifecycle — create, configure, and destroy agent sandboxes."""

import json
import logging
from typing import Any

logger = logging.getLogger(__name__)

try:
    from daytona import AsyncDaytona, CreateSandboxFromSnapshotParams
except ImportError:
    AsyncDaytona = None
    CreateSandboxFromSnapshotParams = None


class SandboxManager:
    """Manages Daytona sandboxes. Requires DAYTONA_API_KEY (and optionally DAYTONA_API_URL)."""

    def __init__(self, api_key: str | None = None, api_url: str | None = None):
        self._api_key = api_key
        self._api_url = api_url
        self._daytona: AsyncDaytona | None = None

    async def _get_client(self) -> "AsyncDaytona":
        if AsyncDaytona is None:
            raise RuntimeError(
                "Daytona SDK not installed. Run: pip install daytona"
            )
        if self._daytona is None:
            from daytona import DaytonaConfig
            config = DaytonaConfig(
                api_key=self._api_key,
                api_url=self._api_url or None,
            )
            self._daytona = AsyncDaytona(config)
        return self._daytona

    async def create_sandbox(self, sandbox_config: dict[str, Any]) -> str:
        """Spin up a new Daytona sandbox and deploy the agent."""
        daytona = await self._get_client()
        params = CreateSandboxFromSnapshotParams(language="python")
        sandbox = await daytona.create(params)

        try:
            # Upload config so the agent can read it
            config_path = "/home/daytona/config.json"
            await sandbox.fs.upload_file(
                json.dumps(sandbox_config).encode(),
                config_path,
            )
            # Agent code is expected to be deployed by the caller or via a known image.
            # To upload agent_runner.py from local disk you'd need the file path in config.
            agent_code = sandbox_config.get("agentCode")
            if agent_code:
                await sandbox.fs.upload_file(
                    agent_code.encode() if isinstance(agent_code, str) else agent_code,
                    "/home/daytona/agent_runner.py",
                )
            # Agent process must be started by the caller (e.g. session with run_async=True
            # or a separate runner) so create_sandbox does not block.
        except Exception:
            logger.exception("Error configuring sandbox %s", sandbox.id)
            await daytona.delete(sandbox)
            raise

        return sandbox.id

    async def destroy_sandbox(self, daytona_sandbox_id: str) -> None:
        """Tear down a Daytona sandbox."""
        daytona = await self._get_client()
        sandbox = await daytona.get(daytona_sandbox_id)
        await daytona.delete(sandbox)

    async def get_sandbox_status(self, daytona_sandbox_id: str) -> str:
        """Check if the sandbox (and its process) is still running. Returns state string."""
        daytona = await self._get_client()
        sandbox = await daytona.get(daytona_sandbox_id)
        return getattr(sandbox, "state", "unknown")

    async def close(self) -> None:
        """Release the Daytona client."""
        if self._daytona is not None:
            await self._daytona.close()
            self._daytona = None
