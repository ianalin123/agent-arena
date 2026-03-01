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
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

sys.path.insert(0, os.path.dirname(__file__))

from event_bridge import EventBridge
from goal_extractor import extract_goal
from judge import JudgeScheduler
from sandbox_manager import SandboxManager

agent_env = os.path.join(os.path.dirname(__file__), "..", "agent", ".env")
if os.path.exists(agent_env):
    load_dotenv(agent_env)

for _key in [*ENV_KEYS_TO_FORWARD, "DAYTONA_API_KEY", "DAYTONA_API_URL"]:
    _val = os.environ.get(_key, "")
    if _val != _val.strip():
        os.environ[_key] = _val.strip()

logger = logging.getLogger(__name__)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(name)s %(levelname)s %(message)s",
)

_manager: SandboxManager | None = None
_judge: JudgeScheduler | None = None


@asynccontextmanager
async def lifespan(application: FastAPI):
    global _manager, _judge
    _manager = SandboxManager()
    logger.info("SandboxManager initialized")

    convex_url = os.environ.get("CONVEX_URL", "")
    convex_key = os.environ.get("CONVEX_DEPLOY_KEY", "")
    if convex_url and convex_key:
        _judge = JudgeScheduler(convex_url, convex_key)
        _judge.start()
        logger.info("JudgeScheduler started")

    yield

    if _judge:
        await _judge.stop()
        logger.info("JudgeScheduler stopped")
    if _manager:
        await _manager.close()
        logger.info("SandboxManager closed")


app = FastAPI(title="Agent Arena Orchestrator", lifespan=lifespan)

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


async def _create_agentmail_inbox() -> str:
    """Create a fresh AgentMail inbox for this sandbox."""
    api_key = os.environ.get("AGENTMAIL_API_KEY", "")
    if not api_key:
        logger.warning("AGENTMAIL_API_KEY not set, skipping inbox creation")
        return ""
    try:
        from agentmail import AsyncAgentMail
        client = AsyncAgentMail(api_key=api_key)
        inbox = await client.inboxes.create()
        inbox_id = getattr(inbox, "id", "") or getattr(inbox, "inbox_id", "")
        logger.info("AgentMail inbox created: %s", inbox_id)
        return str(inbox_id)
    except Exception as e:
        logger.warning("Failed to create AgentMail inbox: %s", e)
        return ""


@app.post("/launch", response_model=LaunchResponse)
async def launch_sandbox(req: LaunchRequest) -> LaunchResponse:
    """Create a Daytona sandbox, deploy agent code, and return IDs.

    Called by the Convex sandboxes.launch action.
    """
    logger.info("Launch request for sandbox %s (model=%s)", req.sandboxId, req.model)

    extracted = await extract_goal(req.goalDescription)
    logger.info(
        "Goal extracted: type=%s target=%s constraints=%s",
        extracted.goal_type, extracted.target_value, extracted.constraints,
    )

    inbox_id = await _create_agentmail_inbox()

    env_vars = {}
    for key in ENV_KEYS_TO_FORWARD:
        val = os.environ.get(key, "")
        if val:
            env_vars[key] = val

    config_overrides = req.config or {}
    sandbox_config = {
        "sandbox_id": req.sandboxId,
        "goal": req.goalDescription,
        "goal_type": config_overrides.get("goal_type", extracted.goal_type),
        "target_value": config_overrides.get("target_value", extracted.target_value),
        "model": req.model,
        "time_limit": req.timeLimit or extracted.time_limit_seconds,
        "initial_credits": 50,
        "constraints": extracted.constraints,
        "verification_hint": extracted.verification_hint,
        "platform": extracted.platform,
        "account_handle": extracted.account_handle,
        "agentmail_inbox_id": inbox_id,
        "paylocus_wallet_id": "",
        **config_overrides,
    }

    if _manager is None:
        raise HTTPException(status_code=503, detail="Server not ready")
    try:
        daytona_id = await _manager.create_and_start_agent(sandbox_config, env_vars)
    except Exception as e:
        logger.exception("Daytona sandbox creation failed")
        raise HTTPException(status_code=500, detail=str(e))

    logger.info("Sandbox %s launched as Daytona %s", req.sandboxId, daytona_id)

    return LaunchResponse(
        daytonaSandboxId=daytona_id,
        agentmailInboxId=inbox_id,
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
