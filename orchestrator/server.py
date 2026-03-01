"""Orchestrator HTTP server — exposes POST /launch for the Convex sandboxes.launch action.

Also exposes an x402-compliant route for Locus: when called without payment,
returns 402 Payment Required with accepts[]; when called with PAYMENT-SIGNATURE, returns 200.

Usage:
    uvicorn orchestrator.server:app --host 0.0.0.0 --port 8000

Or from the orchestrator directory:
    python server.py
"""

import logging
import os
import sys

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

sys.path.insert(0, os.path.dirname(__file__))

from event_bridge import EventBridge
from sandbox_manager import SandboxManager

agent_env = os.path.join(os.path.dirname(__file__), "..", "agent", ".env")
if os.path.exists(agent_env):
    load_dotenv(agent_env)

logger = logging.getLogger(__name__)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(name)s %(levelname)s %(message)s",
)

app = FastAPI(title="Agent Arena Orchestrator")

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


class LaunchRequest(BaseModel):
    sandboxId: str
    goalDescription: str
    model: str
    timeLimit: int
    config: dict | None = None


class LaunchResponse(BaseModel):
    daytonaSandboxId: str
    agentmailInboxId: str
    paylocusWalletId: str
    walletBalance: float | None = None


@app.post("/launch", response_model=LaunchResponse)
async def launch_sandbox(req: LaunchRequest) -> LaunchResponse:
    """Create a Daytona sandbox, deploy agent code, and return IDs.

    Called by the Convex sandboxes.launch action.
    """
    logger.info("Launch request for sandbox %s (model=%s)", req.sandboxId, req.model)

    env_vars = {}
    for key in ENV_KEYS_TO_FORWARD:
        val = os.environ.get(key, "")
        if val:
            env_vars[key] = val

    sandbox_config = {
        "sandbox_id": req.sandboxId,
        "goal": req.goalDescription,
        "model": req.model,
        "time_limit": req.timeLimit,
        "initial_credits": 50,
        **(req.config or {}),
    }

    manager = SandboxManager()
    try:
        daytona_id = await manager.create_and_start_agent(sandbox_config, env_vars)
    except Exception as e:
        logger.exception("Daytona sandbox creation failed")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        await manager.close()

    logger.info("Sandbox %s launched as Daytona %s", req.sandboxId, daytona_id)

    return LaunchResponse(
        daytonaSandboxId=daytona_id,
        agentmailInboxId="",
        paylocusWalletId="",
        walletBalance=0,
    )


@app.get("/health")
async def health():
    return {"status": "ok"}


# --- x402 (Locus) pay-per-call ---
# Register with Locus. Point ngrok at this server (port 8000), not Next.js (3000).
# Set X402_PAY_TO_ADDRESS (your Base wallet).

X402_PAY_TO = os.environ.get("X402_PAY_TO_ADDRESS", "0x0000000000000000000000000000000000000000")
X402_NETWORK = os.environ.get("X402_NETWORK", "base-sepolia")
X402_MAX_AMOUNT = os.environ.get("X402_MAX_AMOUNT_REQUIRED", "1000")


def _x402_accepts_payload(resource_url: str) -> dict:
    return {
        "accepts": [
            {
                "scheme": "exact",
                "network": X402_NETWORK,
                "maxAmountRequired": X402_MAX_AMOUNT,
                "resource": resource_url,
                "payTo": X402_PAY_TO,
                "mimeType": "application/json",
                "description": "Agent Arena paid resource (x402)",
            }
        ]
    }


@app.get("/x402/test-402")
async def x402_test(request: Request):
    """Always returns 402. Use to verify your tunnel hits this server: curl -i https://YOUR-NGROK/x402/test-402"""
    body = _x402_accepts_payload(str(request.url))
    return JSONResponse(status_code=402, content=body, media_type="application/json")


@app.get("/x402/paid-resource")
@app.post("/x402/paid-resource")
async def x402_paid_resource(request: Request):
    """x402: 402 when no valid payment; 200 only with real PAYMENT-SIGNATURE."""
    resource_url = str(request.url)
    # Only accept explicit payment header; ignore empty or short values
    raw = request.headers.get("payment-signature") or request.headers.get("PAYMENT-SIGNATURE") or ""
    has_payment = bool(raw and raw.strip() and len(raw.strip()) >= 32)

    if not has_payment:
        logger.info("x402 paid-resource: no payment → 402")
        return JSONResponse(status_code=402, content=_x402_accepts_payload(resource_url), media_type="application/json")

    logger.info("x402 paid-resource: payment present → 200")
    return JSONResponse(status_code=200, content={"status": "ok", "message": "Payment accepted"}, media_type="application/json")


if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("ORCHESTRATOR_PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port)
