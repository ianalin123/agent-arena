"""Main agent loop — runs inside each Daytona sandbox.

Uses native tool use APIs for structured LLM responses, Browser Use
high-level task API with live_url streaming, and automatic model
fallback on rate limits.
"""

import asyncio
import json
import logging
import os
import sys

from lmnr import Laminar, observe

from model_router import ModelRouter, Decision
from tools.browser import BrowserTool
from tools.email import EmailTool
from tools.payments import PaymentsTool
from goal_verifier import GoalVerifier
from memory import AgentMemory

logger = logging.getLogger(__name__)

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "orchestrator"))

_bridge = None


def _get_bridge():
    """Lazily initialize the EventBridge (only when Convex env vars are set)."""
    global _bridge
    if _bridge is not None:
        return _bridge

    convex_url = os.environ.get("CONVEX_URL")
    convex_key = os.environ.get("CONVEX_DEPLOY_KEY")
    if convex_url and convex_key:
        try:
            from event_bridge import EventBridge
            _bridge = EventBridge(convex_url, convex_key)
            logger.info("EventBridge connected to %s", convex_url)
        except ImportError:
            logger.warning("event_bridge module not available, using mock")
    return _bridge


def _detect_loop(recent_actions: list[dict], window: int = 3) -> str | None:
    """Check if the agent is stuck repeating the same action."""
    if len(recent_actions) < window:
        return None
    last_n = recent_actions[-window:]
    types = [a.get("action_type") for a in last_n]
    tasks = [str(a.get("action", {}).get("task", "")) for a in last_n]
    if len(set(types)) == 1 and len(set(tasks)) == 1:
        return "You appear stuck repeating the same action. Try a completely different approach or strategy."
    return None


async def run_agent(sandbox_config: dict):
    if os.environ.get("LMNR_PROJECT_API_KEY"):
        Laminar.initialize()
        logger.info("Laminar tracing initialized")

    router = ModelRouter()
    fallback_chain = router.get_fallback_chain(sandbox_config["model"])

    browser = BrowserTool()
    mail = EmailTool(inbox_id=sandbox_config.get("agentmail_inbox_id", ""))
    payments = PaymentsTool(wallet_id=sandbox_config.get("paylocus_wallet_id", ""))
    memory = AgentMemory(api_key=os.environ.get("SUPERMEMORY_API_KEY", ""))
    verifier = GoalVerifier(sandbox_config)

    sandbox_id = sandbox_config["sandbox_id"]
    goal = sandbox_config["goal"]
    credits = sandbox_config.get("initial_credits", 50)
    recent_actions: list[dict] = []

    await browser.create_session()

    if browser.live_url or browser.share_url:
        await _push_live_url(sandbox_id, browser.live_url or "", browser.share_url or "")

    try:
        while credits > 0 and not verifier.goal_achieved and not verifier.time_expired:
            emails = await mail.check_inbox()
            balance = await payments.get_balance()

            past_context = memory.search(
                query=f"strategies for {sandbox_config.get('goal_type', 'general')}",
                sandbox_id=sandbox_id,
            )

            user_prompts = await _fetch_pending_prompts(sandbox_id)

            for prompt_data in user_prompts:
                memory.add_user_prompt(
                    prompt=prompt_data.get("promptText", ""),
                    sandbox_id=sandbox_id,
                )

            stuck_hint = _detect_loop(recent_actions)
            screenshot = browser.get_last_screenshot() or ""

            decision = await _think_step_with_fallback(
                fallback_chain, goal, screenshot, emails, balance,
                past_context, user_prompts, recent_actions, stuck_hint,
            )

            result = await _execute_action(decision, browser, mail, payments, sandbox_id)

            memory.add(
                content=f"Action: {decision.action_type} {decision.action}, Result: {result}",
                sandbox_id=sandbox_id,
                goal_type=sandbox_config.get("goal_type", "general"),
            )

            recent_actions.append({
                "action_type": decision.action_type,
                "action": decision.action,
                "result": result,
                "reasoning": decision.reasoning,
            })
            if len(recent_actions) > 20:
                recent_actions = recent_actions[-20:]

            progress = await verifier.check_progress()

            await _push_event(sandbox_id, {
                "reasoning": decision.reasoning,
                "action": decision.action,
                "action_type": decision.action_type,
                "result": result,
                "progress": progress,
                "credits_used": decision.cost,
            }, event_type="reasoning")

            bridge = _get_bridge()
            if bridge:
                await bridge.update_progress(sandbox_id, progress)

            credits -= decision.cost

    finally:
        await browser.close()
        if hasattr(payments, "close"):
            await payments.close()

    success = verifier.goal_achieved
    await _complete_sandbox(sandbox_id, success)


async def _execute_action(
    decision: Decision,
    browser: BrowserTool,
    mail: EmailTool,
    payments: PaymentsTool,
    sandbox_id: str,
) -> dict:
    """Execute the tool call from the LLM's decision, with error handling."""
    try:
        if decision.action_type == "browser_task":
            return await browser.execute(decision.action)

        elif decision.action_type == "send_email":
            result = await mail.send(decision.action)
            await _push_event(sandbox_id, {
                "type": "email",
                "direction": "sent",
                "to": decision.action.get("to", ""),
                "subject": decision.action.get("subject", ""),
            }, event_type="email")
            return result

        elif decision.action_type == "make_payment":
            result = await payments.transact(decision.action)
            await _push_event(sandbox_id, {
                "type": "payment",
                "amount": decision.action.get("amount", 0),
                "description": decision.action.get("description", ""),
                "recipient": decision.action.get("recipient", ""),
            }, event_type="payment")
            return result

        elif decision.action_type == "finish_reasoning":
            return {"status": "reasoning_only", "reasoning": decision.reasoning}

        else:
            return {"error": f"Unknown action type: {decision.action_type}"}

    except Exception as e:
        logger.error("Action execution failed (%s): %s", decision.action_type, e)
        return {"status": "error", "error": str(e)}


@observe(name="agent_reasoning_step")
async def _think_step_with_fallback(
    fallback_chain, goal, screenshot, emails, balance,
    past_context, user_prompts, recent_actions, stuck_hint,
) -> Decision:
    """Try the primary provider, fall back to alternatives on failure."""
    last_error = None
    for provider in fallback_chain:
        try:
            return await provider.think(
                goal=goal,
                screenshot=screenshot,
                emails=emails,
                wallet_balance=balance,
                memory=past_context,
                user_prompts=user_prompts,
                action_history=recent_actions,
                stuck_hint=stuck_hint,
            )
        except Exception as e:
            provider_name = type(provider).__name__
            logger.warning("Provider %s failed: %s — trying fallback", provider_name, e)
            last_error = e

    logger.error("All providers failed. Last error: %s", last_error)
    return Decision(
        reasoning=f"All LLM providers failed: {last_error}",
        action_type="finish_reasoning",
        action={"reasoning": "Waiting for provider recovery", "should_stop": False},
        cost=0.0,
    )


async def _push_live_url(sandbox_id: str, live_url: str, share_url: str) -> None:
    bridge = _get_bridge()
    if bridge:
        try:
            await bridge.update_live_url(sandbox_id, live_url, share_url)
            logger.info("Pushed live_url to Convex: %s", live_url)
        except Exception as e:
            logger.warning("Failed to push live_url: %s", e)


async def _fetch_pending_prompts(sandbox_id: str) -> list[dict]:
    bridge = _get_bridge()
    if bridge:
        try:
            return await bridge.fetch_pending_prompts(sandbox_id)
        except Exception as e:
            logger.warning("Failed to fetch prompts from Convex: %s", e)
    return []


async def _push_event(sandbox_id: str, payload: dict, event_type: str = "reasoning"):
    bridge = _get_bridge()
    if bridge:
        try:
            await bridge.push_event(sandbox_id, event_type, payload)
            return
        except Exception as e:
            logger.warning("Failed to push event to Convex: %s", e)
    logger.info("Event [%s] %s", event_type, json.dumps({"sandbox_id": sandbox_id, **payload}, default=str))


async def _complete_sandbox(sandbox_id: str, success: bool):
    outcome = "success" if success else "failed"
    bridge = _get_bridge()
    if bridge:
        try:
            await bridge.complete_sandbox(sandbox_id, outcome)
            return
        except Exception as e:
            logger.warning("Failed to complete sandbox in Convex: %s", e)
    logger.info("Sandbox completed: %s", json.dumps({"sandbox_id": sandbox_id, "outcome": outcome}))


if __name__ == "__main__":
    import argparse

    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")

    parser = argparse.ArgumentParser()
    parser.add_argument("--config", required=True, help="Path to sandbox config JSON")
    args = parser.parse_args()

    with open(args.config) as f:
        config = json.load(f)

    asyncio.run(run_agent(config))
