"""Shared system prompt and prompt builder for all LLM providers."""

from typing import Any


SYSTEM_PROMPT = """\
You are an autonomous AI agent competing in the Agent Arena. Your job is to \
achieve the assigned goal as efficiently as possible using the tools available.

You have access to:
- browser_task: Execute high-level browser tasks by describing what you want \
to accomplish. The browser automation system handles clicking, typing, and navigation.
- send_email: Send emails from your dedicated agent email address (via AgentMail).
- send_usdc: Send USDC cryptocurrency to a Base wallet address.
- send_usdc_email: Send USDC to someone via their email (held in escrow until claimed).
- finish_reasoning: Think through strategy without taking an external action. \
Set should_stop=true when you believe the goal is achieved.

Strategy guidelines:
- Break complex goals into smaller, verifiable steps.
- After each action, assess whether it moved you closer to the goal.
- If you're stuck or repeating yourself, try a completely different approach.
- Use browser_task with clear, specific instructions \
(e.g. "Go to twitter.com and post a tweet about AI agents").
- You are being watched live — spectators can see your browser and bet on your success.
- Pay attention to CONSTRAINTS — violating them will count against you."""


def build_user_prompt(goal: str, **context: Any) -> str:
    """Build the user-facing prompt with goal, constraints, time/progress, and context."""
    parts = [f"GOAL: {goal}"]

    if context.get("constraints"):
        constraint_lines = "\n".join(f"  - {c}" for c in context["constraints"])
        parts.append(f"CONSTRAINTS:\n{constraint_lines}")

    if context.get("time_remaining_seconds") is not None:
        remaining = context["time_remaining_seconds"]
        if remaining > 3600:
            time_str = f"{remaining / 3600:.1f} hours"
        elif remaining > 60:
            time_str = f"{int(remaining / 60)} minutes"
        else:
            time_str = f"{int(remaining)} seconds"
        parts.append(f"TIME REMAINING: {time_str}")

    if context.get("current_progress") is not None:
        parts.append(f"PROGRESS: {context['current_progress']:.1f}% toward goal")

    if context.get("wallet_balance") is not None:
        parts.append(f"WALLET BALANCE: ${context['wallet_balance']:.2f}")
    if context.get("emails"):
        email_count = len(context["emails"])
        parts.append(f"RECENT EMAILS: {email_count} message{'s' if email_count != 1 else ''}")
    if context.get("memory"):
        parts.append(f"MEMORY:\n{context['memory']}")
    if context.get("user_prompts"):
        prompts = [p.get("promptText", str(p)) for p in context["user_prompts"]]
        parts.append(f"USER SUGGESTIONS: {prompts}")
    if context.get("action_history"):
        recent = context["action_history"][-5:]
        history_lines = []
        for a in recent:
            result_snippet = str(a.get("result", ""))[:80]
            history_lines.append(
                f"  - {a.get('action_type', '?')}: "
                f"{a.get('action', {})} → {result_snippet}"
            )
        parts.append(f"RECENT ACTIONS:\n" + "\n".join(history_lines))
    if context.get("stuck_hint"):
        parts.append(f"WARNING: {context['stuck_hint']}")

    parts.append("\nDecide your next action. Use exactly one tool.")

    return "\n\n".join(parts)
