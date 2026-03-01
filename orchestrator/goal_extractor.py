"""Goal extraction — parses free-text challenges into structured, verifiable goals.

Uses the Anthropic messages API as the primary extraction path with JSON-mode
structured output. Falls back to regex/keyword heuristics when the API is
unavailable.
"""

import json
import logging
import os
import re

from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


class ExtractedGoal(BaseModel):
    """Structured representation of a challenge, extracted from free text."""

    goal_type: str = Field(
        default="general",
        description=(
            "Category: follower_count, revenue, views, emails_booked, "
            "engagement, sign_ups, or general"
        ),
    )
    target_value: float = Field(
        default=100,
        description="Numeric target the agent must reach (e.g. 100 followers)",
    )
    time_limit_seconds: int = Field(
        default=7200,
        description="Time budget in seconds extracted from the prompt (e.g. '2 hours' → 7200)",
    )
    verification_hint: str = Field(
        default="",
        description="How progress can be checked (e.g. 'check @handle follower count on X')",
    )
    constraints: list[str] = Field(
        default_factory=list,
        description="Restrictions the agent must follow (e.g. 'don't use crypto')",
    )
    account_handle: str = Field(
        default="",
        description="Social media handle if mentioned (e.g. '@agentarena')",
    )
    platform: str = Field(
        default="",
        description="Primary platform (twitter, youtube, linkedin, etc.)",
    )


_EXTRACTION_PROMPT = """\
You are a goal extraction system for an AI agent arena. Given a challenge description,
extract the structured fields below. Be precise:

- goal_type: Pick the closest category. Use "general" only if nothing else fits.
- target_value: The numeric goal. If the prompt says "100 followers", target is 100.
  If no number is explicit, estimate a reasonable target.
- time_limit_seconds: Convert any time reference to seconds.
  "2 hours" = 7200, "30 minutes" = 1800, "1 day" = 86400.
  Default to 7200 if no time is mentioned.
- verification_hint: Describe how an external judge could verify progress.
- constraints: List every restriction or prohibition mentioned.
  Examples: "don't use crypto", "don't post offensive content", "only use email".
  Also capture implicit constraints like "cold outreach only" → "only use cold outreach".
- account_handle: Any @handle or username mentioned.
- platform: The primary platform (twitter, youtube, linkedin, reddit, etc.).
  If the prompt mentions "X" as a social platform, use "twitter".

Challenge description:
{challenge_text}
"""

_SYSTEM_INSTRUCTION = (
    "Respond ONLY with valid JSON. No markdown, no explanation, no code fences. "
    "The JSON must have these keys: goal_type (string), target_value (number), "
    "time_limit_seconds (integer), verification_hint (string), "
    "constraints (array of strings), account_handle (string), platform (string)."
)


async def extract_goal(challenge_text: str) -> ExtractedGoal:
    """Parse a free-text challenge into a structured ExtractedGoal.

    Uses the Anthropic messages API as primary path. Falls back to heuristic
    regex parsing when the API call fails.
    """
    try:
        return await _extract_with_anthropic(challenge_text)
    except Exception as e:
        logger.warning("Anthropic extraction failed (%s), using heuristic fallback", e)

    return _extract_heuristic(challenge_text)


async def _extract_with_anthropic(challenge_text: str) -> ExtractedGoal:
    """Primary path: Anthropic messages API with JSON-mode output."""
    import anthropic

    client = anthropic.AsyncAnthropic()
    prompt = _EXTRACTION_PROMPT.format(challenge_text=challenge_text)

    response = await client.messages.create(
        model="claude-sonnet-4-5-20250514",
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}],
        system=_SYSTEM_INSTRUCTION,
    )

    text = _extract_json_text(response)
    data = json.loads(text)
    return ExtractedGoal.model_validate(data)


def _extract_json_text(response) -> str:
    """Pull the JSON string from an Anthropic response, handling thinking blocks
    and markdown code fences."""
    for block in response.content:
        if hasattr(block, "text") and block.text:
            text = block.text.strip()
            if text.startswith("```"):
                text = re.sub(r"^```(?:json)?\s*", "", text)
                text = re.sub(r"\s*```\s*$", "", text)
            return text
    raise ValueError(f"No text content in response (got {[type(b).__name__ for b in response.content]})")


def _extract_heuristic(challenge_text: str) -> ExtractedGoal:
    """Last resort: regex/keyword extraction when the LLM call fails."""
    text_lower = challenge_text.lower()

    goal_type = "general"
    for keyword, gtype in [
        ("follower", "follower_count"),
        ("revenue", "revenue"),
        ("earn", "revenue"),
        ("view", "views"),
        ("watch", "views"),
        ("email", "emails_booked"),
        ("book", "emails_booked"),
        ("sign up", "sign_ups"),
        ("signup", "sign_ups"),
    ]:
        if keyword in text_lower:
            goal_type = gtype
            break

    target_value = _parse_target_value(text_lower)

    time_limit = 7200
    time_match = re.search(r"(\d+)\s*(hour|minute|min|day|second|sec)", text_lower)
    if time_match:
        amount = int(time_match.group(1))
        unit = time_match.group(2)
        if unit.startswith("hour"):
            time_limit = amount * 3600
        elif unit.startswith("min"):
            time_limit = amount * 60
        elif unit.startswith("day"):
            time_limit = amount * 86400
        elif unit.startswith("sec"):
            time_limit = amount

    handle_match = re.search(r"@([\w]+)", challenge_text)
    account_handle = f"@{handle_match.group(1)}" if handle_match else ""

    platform = _detect_platform(text_lower)

    constraints = _extract_constraints(text_lower)

    return ExtractedGoal(
        goal_type=goal_type,
        target_value=target_value,
        time_limit_seconds=time_limit,
        verification_hint="",
        constraints=constraints,
        account_handle=account_handle,
        platform=platform,
    )


def _parse_target_value(text_lower: str) -> float:
    """Extract the numeric target from challenge text.

    Handles both '$50' (currency prefix) and '100 followers' (number + unit)
    patterns.
    """
    currency_match = re.search(r"\$\s*(\d[\d,]*(?:\.\d+)?)", text_lower)
    if currency_match:
        return float(currency_match.group(1).replace(",", ""))

    unit_match = re.search(
        r"(\d[\d,]*)\s*(?:follower|view|email|sign|subscriber|member|customer|user|download)",
        text_lower,
    )
    if unit_match:
        return float(unit_match.group(1).replace(",", ""))

    bare_match = re.search(r"(?:get|reach|achieve|earn|make|book)\s+(\d[\d,]*)", text_lower)
    if bare_match:
        return float(bare_match.group(1).replace(",", ""))

    return 100


def _detect_platform(text_lower: str) -> str:
    """Detect the primary platform from challenge text.

    Handles 'X' as a standalone platform name (maps to twitter), 'x.com',
    and standard platform names.
    """
    platform_map = [
        ("twitter", "twitter"),
        ("x.com", "twitter"),
        ("youtube", "youtube"),
        ("linkedin", "linkedin"),
        ("reddit", "reddit"),
        ("instagram", "instagram"),
        ("tiktok", "tiktok"),
        ("gumroad", "gumroad"),
        ("substack", "substack"),
    ]
    for keyword, name in platform_map:
        if keyword in text_lower:
            return name

    if re.search(r"\bon x\b|\bx account\b|\bx profile\b|\bon x\.|post on x\b", text_lower):
        return "twitter"

    return ""


def _extract_constraints(text_lower: str) -> list[str]:
    """Extract explicit and implicit constraints from challenge text."""
    constraints: list[str] = []

    explicit_patterns = [
        r"(?:don'?t|do not|never|avoid|no)\s+(.+?)(?:\.|,|$)",
        r"(?:without|exclude)\s+(.+?)(?:\.|,|$)",
    ]
    for pattern in explicit_patterns:
        for match in re.finditer(pattern, text_lower):
            constraints.append(match.group(0).strip().rstrip(".,"))

    only_match = re.search(r"(?:using|via|through|by)\s+(.+?)\s+only", text_lower)
    if only_match:
        constraints.append(f"only use {only_match.group(1).strip()}")

    only_prefix = re.search(r"only\s+(?:use|via|through|by)\s+(.+?)(?:\.|,|$)", text_lower)
    if only_prefix:
        constraints.append(f"only use {only_prefix.group(1).strip().rstrip('.,')}")

    return constraints
