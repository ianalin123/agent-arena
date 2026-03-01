"""LLM-as-Judge — time-adaptive progress evaluator for active sandboxes.

Runs as a background task in the orchestrator. Periodically reads agent event
logs from Convex and uses the Anthropic messages API (structured JSON output)
to score progress toward the goal. Pushes updated progress to Convex so the
frontend progress bar reflects reality.
"""

import asyncio
import json
import logging
import time
from typing import Any

from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


class JudgeVerdict(BaseModel):
    """Structured evaluation of agent progress from the LLM judge."""

    progress_pct: float = Field(
        default=0.0,
        ge=0.0,
        le=100.0,
        description="Progress toward the goal, 0.0 to 100.0",
    )
    evidence: list[str] = Field(
        default_factory=list,
        description="Specific log entries or observations justifying the score",
    )
    goal_achieved: bool = Field(
        default=False,
        description="Whether the goal has been definitively achieved",
    )
    reasoning: str = Field(
        default="",
        description="Brief explanation of the progress assessment",
    )


_JUDGE_PROMPT = """\
You are an impartial judge evaluating an AI agent's progress toward a goal.
Based on the agent's action logs, score progress from 0 to 100.

Be evidence-based: only credit progress you can verify from the logs.
If the agent has been repeating actions without progress, score accordingly.
If the agent claims success but logs don't confirm it, remain skeptical.

Goal description: {goal_description}
Goal type: {goal_type}
Target value: {target_value}
Verification hint: {verification_hint}

Time elapsed: {elapsed_minutes:.0f} minutes of {total_minutes:.0f} total

Agent event logs (most recent first):
{log_summary}
"""


def judge_interval_seconds(time_limit_seconds: int) -> int:
    """Compute how often to run the judge based on the total time budget."""
    if time_limit_seconds <= 3600:
        return 120
    elif time_limit_seconds <= 14400:
        return 300
    elif time_limit_seconds <= 86400:
        return 1800
    else:
        return 86400


def _format_logs_for_judge(events: list[dict], max_events: int = 30) -> str:
    """Convert Convex agentEvents into a text summary for the judge prompt."""
    lines: list[str] = []
    for event in events[:max_events]:
        payload_str = event.get("payload", "{}")
        try:
            payload = json.loads(payload_str) if isinstance(payload_str, str) else payload_str
        except (json.JSONDecodeError, TypeError):
            payload = {"raw": str(payload_str)}

        event_type = event.get("eventType", "unknown")
        if event_type == "reasoning":
            action_type = payload.get("action_type", "?")
            reasoning = payload.get("reasoning", "")[:200]
            result = str(payload.get("result", ""))[:150]
            lines.append(f"[{event_type}] {action_type}: {reasoning} -> {result}")
        elif event_type == "status":
            lines.append(f"[status] step={payload.get('step')} {payload.get('status')}")
        elif event_type in ("email", "payment"):
            lines.append(f"[{event_type}] {json.dumps(payload, default=str)[:200]}")
        else:
            lines.append(f"[{event_type}] {str(payload)[:200]}")

    return "\n".join(lines) if lines else "(no events yet)"


_JUDGE_SYSTEM = (
    "Respond ONLY with valid JSON. No markdown, no explanation, no code fences. "
    "The JSON must have these keys: progress_pct (number 0-100), "
    "evidence (array of strings), goal_achieved (boolean), reasoning (string)."
)


async def evaluate_progress(
    sandbox_config: dict,
    events: list[dict],
    start_time: float,
) -> JudgeVerdict:
    """Score the agent's progress using the Anthropic messages API."""
    time_limit = sandbox_config.get("timeLimit", sandbox_config.get("time_limit", 7200))
    elapsed = time.time() - start_time

    prompt = _JUDGE_PROMPT.format(
        goal_description=sandbox_config.get("goalDescription", sandbox_config.get("goal", "")),
        goal_type=sandbox_config.get("goalType", sandbox_config.get("goal_type", "general")),
        target_value=sandbox_config.get("targetValue", sandbox_config.get("target_value", 100)),
        verification_hint=sandbox_config.get("verificationHint", sandbox_config.get("verification_hint", "")),
        elapsed_minutes=elapsed / 60,
        total_minutes=time_limit / 60,
        log_summary=_format_logs_for_judge(events),
    )

    try:
        return await _judge_with_anthropic(prompt)
    except Exception as e:
        logger.warning("Anthropic judge failed (%s), returning zero progress", e)

    return JudgeVerdict()


async def _judge_with_anthropic(prompt: str) -> JudgeVerdict:
    import re

    import anthropic

    client = anthropic.AsyncAnthropic()
    response = await client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}],
        system=_JUDGE_SYSTEM,
    )

    text = _extract_json_text(response)
    data = json.loads(text)
    return JudgeVerdict.model_validate(data)


def _extract_json_text(response) -> str:
    """Pull the JSON string from an Anthropic response, handling thinking blocks
    and markdown code fences."""
    import re

    for block in response.content:
        if hasattr(block, "text") and block.text:
            text = block.text.strip()
            if text.startswith("```"):
                text = re.sub(r"^```(?:json)?\s*", "", text)
                text = re.sub(r"\s*```\s*$", "", text)
            return text
    raise ValueError(f"No text content in response (got {[type(b).__name__ for b in response.content]})")


class JudgeScheduler:
    """Background task that runs the LLM judge for all active sandboxes."""

    def __init__(self, convex_url: str, convex_deploy_key: str):
        self._convex_url = convex_url
        self._convex_key = convex_deploy_key
        self._bridge: Any = None
        self._last_judge_time: dict[str, float] = {}
        self._sandbox_start_times: dict[str, float] = {}
        self._task: asyncio.Task | None = None

    async def _get_bridge(self):
        if self._bridge is None:
            from event_bridge import EventBridge
            self._bridge = EventBridge(self._convex_url, self._convex_key)
        return self._bridge

    def start(self):
        """Start the background judge loop."""
        self._task = asyncio.create_task(self._run_loop())
        logger.info("JudgeScheduler started")

    async def stop(self):
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        if self._bridge:
            await self._bridge.close()
            self._bridge = None

    async def _run_loop(self):
        while True:
            try:
                await self._tick()
            except asyncio.CancelledError:
                raise
            except Exception as e:
                logger.error("Judge loop error: %s", e)
            await asyncio.sleep(30)

    async def _tick(self):
        bridge = await self._get_bridge()

        try:
            active_sandboxes = await bridge._call_query("sandboxes:listActive", {})
        except Exception as e:
            logger.warning("Failed to list active sandboxes: %s", e)
            return

        if not active_sandboxes:
            return

        now = time.time()
        for sandbox in active_sandboxes:
            sandbox_id = sandbox["_id"]
            time_limit = sandbox.get("timeLimit", 7200)
            interval = judge_interval_seconds(time_limit)

            if sandbox_id not in self._sandbox_start_times:
                self._sandbox_start_times[sandbox_id] = (
                    sandbox.get("createdAt", now * 1000) / 1000
                )

            last_judged = self._last_judge_time.get(sandbox_id, 0)
            if (now - last_judged) < interval:
                continue

            logger.info("Judging sandbox %s (interval=%ds)", sandbox_id, interval)

            try:
                events = await bridge._call_query("events:listBySandbox", {
                    "sandboxId": sandbox_id,
                    "limit": 50,
                })
            except Exception:
                events = []

            verdict = await evaluate_progress(
                sandbox_config=sandbox,
                events=events if isinstance(events, list) else [],
                start_time=self._sandbox_start_times[sandbox_id],
            )

            self._last_judge_time[sandbox_id] = now
            logger.info(
                "Judge verdict for %s: %.1f%% (achieved=%s) -- %s",
                sandbox_id,
                verdict.progress_pct,
                verdict.goal_achieved,
                verdict.reasoning[:100],
            )

            try:
                target = sandbox.get("targetValue", 100)
                progress_value = verdict.progress_pct / 100.0 * target
                await bridge.update_progress(sandbox_id, progress_value)
            except Exception as e:
                logger.warning("Failed to push judge progress for %s: %s", sandbox_id, e)

            if verdict.goal_achieved:
                try:
                    await bridge.complete_sandbox(sandbox_id, "success")
                    logger.info(
                        "Judge marked sandbox %s as completed (goal achieved)",
                        sandbox_id,
                    )
                except Exception as e:
                    logger.warning("Failed to complete sandbox %s: %s", sandbox_id, e)
