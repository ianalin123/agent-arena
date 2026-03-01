"""Main agent loop — runs inside each Daytona sandbox.

Uses native tool use APIs with multi-turn message history, automatic model
fallback on rate limits, and constraint enforcement.
"""

import asyncio
import json
import logging
import os
import sys
import time

from dotenv import load_dotenv
load_dotenv()

from lmnr import Laminar, observe

from base import Decision
from model_router import ModelRouter
from tools.browser import BrowserTool
from tools.email import EmailTool
from tools.payments import PaymentsTool
from goal_verifier import GoalVerifier
from memory import AgentMemory
from prompts import build_user_prompt

logger = logging.getLogger(__name__)

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "orchestrator"))

_bridge = None
MAX_MESSAGES = 40


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


def _trim_messages(messages: list[dict], max_len: int = MAX_MESSAGES) -> list[dict]:
    """Keep conversation within context window limits."""
    if len(messages) <= max_len:
        return messages
    return [messages[0]] + messages[-(max_len - 1):]


def _is_constrained(action_type: str, constraints: list[str]) -> str | None:
    """Return a block reason if the action violates a constraint, else None."""
    constraint_text = " ".join(constraints).lower()
    if action_type in ("send_usdc", "send_usdc_email"):
        for signal in ("no crypto", "don't use crypto", "no payment", "no usdc"):
            if signal in constraint_text:
                return f"Action '{action_type}' blocked by constraint: {signal}"
    if action_type == "send_email":
        for signal in ("no email", "don't send email", "don't use email"):
            if signal in constraint_text:
                return f"Action '{action_type}' blocked by constraint: {signal}"
    return None


async def run_agent(sandbox_config: dict):
    if os.environ.get("LMNR_PROJECT_API_KEY"):
        Laminar.initialize()
        logger.info("Laminar tracing initialized")

    router = ModelRouter()
    fallback_chain = router.get_fallback_chain(sandbox_config["model"])

    browser = BrowserTool()
    mail = EmailTool(inbox_id=sandbox_config.get("agentmail_inbox_id", ""))
    payments = PaymentsTool()
    memory = AgentMemory(api_key=os.environ.get("SUPERMEMORY_API_KEY", ""))
    verifier = GoalVerifier(sandbox_config, payments_tool=payments, email_tool=mail)

    sandbox_id = sandbox_config["sandbox_id"]
    goal = sandbox_config["goal"]
    credits = sandbox_config.get("initial_credits", 50)
    constraints = sandbox_config.get("constraints", [])
    recent_actions: list[dict] = []
    messages: list[dict] = []

    await browser.create_session()

    bridge = _get_bridge()

    _live_url_pushed = False
    if browser.live_url:
        await _push_live_url(sandbox_id, browser.live_url, "")
        _live_url_pushed = True

    async def _poll_live_url():
        nonlocal _live_url_pushed
        for _ in range(30):
            await asyncio.sleep(2)
            if _live_url_pushed:
                return
            try:
                details = await browser.get_session_details()
                url = details.get("live_url")
                if url:
                    await _push_live_url(sandbox_id, url, "")
                    _live_url_pushed = True
                    logger.info("Background poller pushed live_url: %s", url)
                    return
            except Exception as e:
                logger.debug("live_url poll error: %s", e)

    live_url_task = asyncio.create_task(_poll_live_url())

    try:
        while credits > 0 and not verifier.goal_achieved and not verifier.time_expired:
            emails_task = mail.check_inbox()
            balance_task = payments.get_balance()
            prompts_task = _fetch_pending_prompts(sandbox_id)
            memory_task = memory.search(
                query=f"strategies for {sandbox_config.get('goal_type', 'general')}",
                sandbox_id=sandbox_id,
            )

            emails, balance, user_prompts, past_context = await asyncio.gather(
                emails_task, balance_task, prompts_task, memory_task,
                return_exceptions=True,
            )

            if isinstance(emails, BaseException):
                logger.warning("check_inbox failed: %s", emails)
                emails = []
            if isinstance(balance, BaseException):
                logger.warning("get_balance failed: %s", balance)
                balance = 0.0
            if isinstance(user_prompts, BaseException):
                logger.warning("fetch_prompts failed: %s", user_prompts)
                user_prompts = []
            if isinstance(past_context, BaseException):
                logger.warning("memory search failed: %s", past_context)
                past_context = []

            for prompt_data in user_prompts:
                await memory.add_user_prompt(
                    prompt=prompt_data.get("promptText", ""),
                    sandbox_id=sandbox_id,
                )
                prompt_id = prompt_data.get("_id", "")
                if prompt_id and bridge:
                    try:
                        await bridge.acknowledge_prompt(prompt_id)
                    except Exception as e:
                        logger.warning("Failed to acknowledge prompt %s: %s", prompt_id, e)

            stuck_hint = _detect_loop(recent_actions)

            user_prompt = build_user_prompt(
                goal,
                wallet_balance=balance,
                emails=emails,
                memory=past_context,
                user_prompts=user_prompts,
                action_history=recent_actions,
                stuck_hint=stuck_hint,
                constraints=constraints,
                time_remaining_seconds=verifier.remaining_seconds,
                current_progress=verifier._current_progress,
            )
            messages.append({"role": "user", "content": user_prompt})

            await _push_event(sandbox_id, {
                "step": len(recent_actions) + 1,
                "status": "thinking",
            }, event_type="status")

            decision = await _think_step_with_fallback(fallback_chain, messages)

            if decision.raw_assistant_message:
                messages.append(decision.raw_assistant_message)

            await _push_event(sandbox_id, {
                "step": len(recent_actions) + 1,
                "status": "executing",
                "action_type": decision.action_type,
                "action_summary": str(decision.action.get("task", decision.action))[:120] if isinstance(decision.action, dict) else str(decision.action)[:120],
            }, event_type="status")

            block_reason = _is_constrained(decision.action_type, constraints)
            if block_reason:
                logger.info("Constraint blocked: %s", block_reason)
                result = {"status": "blocked", "error": block_reason}
            else:
                result = await _execute_action(decision, browser, mail, payments, sandbox_id)

            if decision.tool_use_id:
                messages.append({
                    "role": "user",
                    "content": [{
                        "type": "tool_result",
                        "tool_use_id": decision.tool_use_id,
                        "content": json.dumps(result, default=str)[:2000],
                    }],
                })

            messages = _trim_messages(messages)

            if browser.live_url and not _live_url_pushed:
                await _push_live_url(sandbox_id, browser.live_url, "")
                _live_url_pushed = True

            await memory.add(
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

            if bridge:
                try:
                    await bridge.update_progress(sandbox_id, progress)
                except Exception as e:
                    logger.warning("Failed to update progress in Convex: %s", e)

            credits -= decision.cost

            if (decision.action_type == "finish_reasoning"
                    and decision.action.get("should_stop")):
                logger.info("Agent chose to stop (finish_reasoning with should_stop=True)")
                break

            await asyncio.sleep(1.0)

    finally:
        live_url_task.cancel()
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

        elif decision.action_type == "send_usdc":
            result = await payments.send_usdc(decision.action)
            await _push_event(sandbox_id, {
                "type": "payment",
                "method": "address",
                "amount": decision.action.get("amount", 0),
                "memo": decision.action.get("memo", ""),
                "to_address": decision.action.get("to_address", ""),
                "status": result.get("status", ""),
            }, event_type="payment")
            return result

        elif decision.action_type == "send_usdc_email":
            result = await payments.send_usdc_email(decision.action)
            await _push_event(sandbox_id, {
                "type": "payment",
                "method": "email",
                "amount": decision.action.get("amount", 0),
                "memo": decision.action.get("memo", ""),
                "email": decision.action.get("email", ""),
                "status": result.get("status", ""),
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
    fallback_chain,
    messages: list[dict],
) -> Decision:
    """Try the primary provider, fall back to alternatives on failure."""
    last_error = None
    for provider in fallback_chain:
        try:
            return await provider.think(messages=messages)
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
