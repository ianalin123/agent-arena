"""Main agent loop — runs inside each Daytona sandbox."""

import asyncio
import json
import os

from model_router import ModelRouter
from tools.browser import BrowserTool
from tools.email import EmailTool
from tools.payments import PaymentsTool
from goal_verifier import GoalVerifier
from memory import AgentMemory


async def run_agent(sandbox_config: dict):
    model = ModelRouter().get(sandbox_config["model"])
    browser = BrowserTool(api_key=os.environ["BROWSER_USE_KEY"])
    mail = EmailTool(
        api_key=os.environ["AGENTMAIL_KEY"],
        inbox_id=sandbox_config["agentmail_inbox_id"],
    )
    payments = PaymentsTool(
        api_key=os.environ["PAYLOCUS_KEY"],
        wallet_id=sandbox_config["paylocus_wallet_id"],
    )
    memory = AgentMemory(api_key=os.environ["SUPERMEMORY_KEY"])
    verifier = GoalVerifier(sandbox_config)

    sandbox_id = sandbox_config["sandbox_id"]
    goal = sandbox_config["goal"]
    credits = sandbox_config["initial_credits"]
    recent_actions: list[dict] = []

    while credits > 0 and not verifier.goal_achieved and not verifier.time_expired:
        screenshot = await browser.screenshot()
        emails = await mail.check_inbox()
        balance = await payments.get_balance()

        past_context = memory.search(
            query=f"strategies for {sandbox_config['goal_type']}",
            sandbox_id=sandbox_id,
        )

        user_prompts = await _fetch_pending_prompts(sandbox_id)

        decision = await model.think(
            goal=goal,
            screenshot=screenshot,
            emails=emails,
            wallet_balance=balance,
            memory=past_context,
            user_prompts=user_prompts,
            action_history=recent_actions,
        )

        if decision.action_type == "browser":
            result = await browser.execute(decision.action)
        elif decision.action_type == "email":
            result = await mail.send(decision.action)
        elif decision.action_type == "payment":
            result = await payments.transact(decision.action)
        else:
            result = {"error": f"Unknown action type: {decision.action_type}"}

        memory.add(
            content=f"Action: {decision.action}, Result: {result}",
            sandbox_id=sandbox_id,
            goal_type=sandbox_config["goal_type"],
        )

        recent_actions.append(
            {"action": decision.action, "result": result, "reasoning": decision.reasoning}
        )
        if len(recent_actions) > 20:
            recent_actions = recent_actions[-20:]

        await _push_event(sandbox_id, {
            "reasoning": decision.reasoning,
            "action": decision.action,
            "result": result,
            "progress": await verifier.check_progress(),
            "credits_used": decision.cost,
        })

        credits -= decision.cost

    await _complete_sandbox(sandbox_id, verifier.goal_achieved)


async def _fetch_pending_prompts(sandbox_id: str) -> list[dict]:
    # TODO: Wire to Convex via event_bridge
    return []


async def _push_event(sandbox_id: str, event: dict):
    # TODO: Wire to Convex via event_bridge
    print(json.dumps({"sandbox_id": sandbox_id, **event}))


async def _complete_sandbox(sandbox_id: str, success: bool):
    # TODO: Wire to Convex via event_bridge
    outcome = "success" if success else "failed"
    print(json.dumps({"sandbox_id": sandbox_id, "outcome": outcome}))


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("--config", required=True, help="Path to sandbox config JSON")
    args = parser.parse_args()

    with open(args.config) as f:
        config = json.load(f)

    asyncio.run(run_agent(config))
