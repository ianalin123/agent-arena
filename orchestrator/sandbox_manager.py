"""Daytona sandbox lifecycle — create, configure, and destroy agent sandboxes."""

import json
from typing import Any


class SandboxManager:
    def __init__(self):
        # TODO: Initialize Daytona client
        pass

    async def create_sandbox(self, sandbox_config: dict[str, Any]) -> str:
        """Spin up a new Daytona sandbox and deploy the agent."""
        # TODO: Create Daytona sandbox
        # sandbox = daytona.create(CreateSandboxParams(language="python"))
        #
        # Upload agent code:
        # sandbox.fs.upload_file(agent_code, "/home/daytona/agent_runner.py")
        # sandbox.fs.upload_file(json.dumps(sandbox_config), "/home/daytona/config.json")
        #
        # Start agent process:
        # sandbox.process.run("python agent_runner.py --config config.json")
        #
        # Return the Daytona sandbox ID
        return ""

    async def destroy_sandbox(self, daytona_sandbox_id: str) -> None:
        """Tear down a Daytona sandbox."""
        # TODO: daytona.remove(sandbox)
        pass

    async def get_sandbox_status(self, daytona_sandbox_id: str) -> str:
        """Check if the sandbox process is still running."""
        # TODO: Check Daytona sandbox status
        return "unknown"
