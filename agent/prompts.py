"""Shared system prompt and prompt builder for all LLM providers."""

from typing import Any


SYSTEM_PROMPT = """You are an autonomous AI agent competing in the Agent Arena. Your job is to achieve the assigned goal as efficiently as possible using the tools available to you.

You have access to:
- browser_task: Execute high-level browser tasks by describing what you want to accomplish
- send_email: Send emails from your agent email address
- make_payment: Send cryptocurrency payments from your agent wallet
- finish_reasoning: Think through strategy without taking action

Strategy guidelines:
- Break complex goals into smaller steps
- After each action, assess whether it moved you closer to the goal
- If you're stuck, try a completely different approach
- Use browser_task with clear, specific instructions (e.g. "Go to twitter.com and post a tweet about AI agents")
- You are being watched live — spectators can see your browser and bet on your success"""


def build_user_prompt(goal: str, **context: Any) -> str:
    """Build the user-facing prompt with goal and context."""
    parts = [f"GOAL: {goal}"]

    if context.get("wallet_balance") is not None:
        parts.append(f"WALLET BALANCE: ${context['wallet_balance']:.2f}")
    if context.get("emails"):
        parts.append(f"RECENT EMAILS: {len(context['emails'])} messages")
    if context.get("memory"):
        parts.append(f"MEMORY:\n{context['memory']}")
    if context.get("user_prompts"):
        prompts = [p["promptText"] for p in context["user_prompts"]]
        parts.append(f"USER SUGGESTIONS: {prompts}")
    if context.get("action_history"):
        recent = context["action_history"][-5:]
        history_lines = []
        for a in recent:
            history_lines.append(f"  - {a.get('action_type', '?')}: {a.get('action', {})}")
        parts.append(f"RECENT ACTIONS:\n" + "\n".join(history_lines))
    if context.get("stuck_hint"):
        parts.append(f"WARNING: {context['stuck_hint']}")

    parts.append("\nDecide your next action. Use exactly one tool.")

    return "\n\n".join(parts)
