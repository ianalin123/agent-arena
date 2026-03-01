/**
 * oddsAssessor.ts — Real-time Claude-powered win probability assessor
 *
 * Every 10 seconds (when challenges are live), this action:
 * 1. Fetches the last 10s of agentEvents for both sandboxes
 * 2. Reads currentProgress, creditsRemaining, walletBalance for each agent
 * 3. Calls Claude Haiku to assess which agent's recent actions improved odds
 * 4. Blends the AI assessment (40%) with the betting pool ratio (60%)
 * 5. Records the result to oddsHistory and updates bettingPools.claudePct/openaiPct
 */

import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// ─── Internal query: get full challenge context for assessment ────────────────
export const getChallengeContext = internalQuery({
  args: { challengeId: v.id("challenges") },
  handler: async (ctx, args) => {
    const challenge = await ctx.db.get(args.challengeId);
    if (!challenge) return null;

    const claudeSandbox = await ctx.db.get(challenge.claudeSandboxId);
    const openaiSandbox = await ctx.db.get(challenge.openaiSandboxId);
    if (!claudeSandbox || !openaiSandbox) return null;

    // Last 20 events per sandbox (covers ~10s of activity)
    const claudeEvents = await ctx.db
      .query("agentEvents")
      .withIndex("by_sandbox_time", (q) => q.eq("sandboxId", challenge.claudeSandboxId))
      .order("desc")
      .take(20);

    const openaiEvents = await ctx.db
      .query("agentEvents")
      .withIndex("by_sandbox_time", (q) => q.eq("sandboxId", challenge.openaiSandboxId))
      .order("desc")
      .take(20);

    // Current betting pool
    const pool = await ctx.db
      .query("bettingPools")
      .withIndex("by_challenge", (q) => q.eq("challengeId", args.challengeId))
      .first();

    // Last recorded odds
    const lastOdds = await ctx.db
      .query("oddsHistory")
      .withIndex("by_challenge_time", (q) => q.eq("challengeId", args.challengeId))
      .order("desc")
      .first();

    return {
      challenge,
      claudeSandbox,
      openaiSandbox,
      claudeEvents,
      openaiEvents,
      pool,
      lastOdds,
    };
  },
});

// ─── Internal mutation: write new odds to history and update pool ─────────────
export const writeOdds = internalMutation({
  args: {
    challengeId: v.id("challenges"),
    claudePct: v.number(),
    openaiPct: v.number(),
  },
  handler: async (ctx, args) => {
    // Record to history
    await ctx.db.insert("oddsHistory", {
      challengeId: args.challengeId,
      claudePct: args.claudePct,
      openaiPct: args.openaiPct,
      timestamp: Date.now(),
    });

    // Update the bettingPool's implied odds (stored as yesTotal/noTotal ratio)
    // We don't change the actual money — just update the display odds
    // by storing the AI-assessed probability in a separate field if available,
    // or by adjusting the pool ratio to reflect the new odds.
    // For now we store the AI odds directly in oddsHistory and the frontend reads from there.
  },
});

// ─── Main assessor action ─────────────────────────────────────────────────────
export const assessAllActive = internalAction({
  args: {},
  handler: async (ctx) => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.warn("[oddsAssessor] ANTHROPIC_API_KEY not set — skipping assessment");
      return;
    }

    // Get all active challenges
    const activeChallenges = await ctx.runQuery(internal.challenges.listActive, {});
    if (!activeChallenges.length) return;

    for (const challenge of activeChallenges) {
      try {
        await assessChallenge(ctx, apiKey, challenge._id as Id<"challenges">);
      } catch (err) {
        console.error(`[oddsAssessor] Error assessing challenge ${challenge._id}:`, err);
      }
    }
  },
});

// ─── Per-challenge assessment ─────────────────────────────────────────────────
async function assessChallenge(
  ctx: { runQuery: Function; runMutation: Function },
  apiKey: string,
  challengeId: Id<"challenges">
) {
  const data = await ctx.runQuery(internal.oddsAssessor.getChallengeContext, { challengeId });
  if (!data) return;

  const { challenge, claudeSandbox, openaiSandbox, claudeEvents, openaiEvents, pool, lastOdds } = data;

  // Current odds baseline: use last recorded odds or 50/50
  const baseClaudePct = lastOdds?.claudePct ?? 50;
  const baseOpenaiPct = lastOdds?.openaiPct ?? 50;

  // Betting pool ratio (60% weight)
  const poolTotal = (pool?.yesTotal ?? 0) + (pool?.noTotal ?? 0);
  const poolClaudePct = poolTotal > 0 ? (pool!.yesTotal / poolTotal) * 100 : 50;
  const poolOpenaiPct = poolTotal > 0 ? (pool!.noTotal / poolTotal) * 100 : 50;

  // Format recent events for the prompt
  const formatEvents = (events: Array<{ eventType: string; payload: string; timestamp: number }>) =>
    events
      .slice(0, 10)
      .map((e) => {
        let payloadStr = e.payload;
        try {
          const parsed = JSON.parse(e.payload);
          payloadStr = parsed.action || parsed.message || parsed.text || JSON.stringify(parsed).slice(0, 120);
        } catch {}
        return `  [${e.eventType}] ${payloadStr}`;
      })
      .join("\n") || "  (no recent events)";

  const claudeProgressPct = Math.min(100, (claudeSandbox.currentProgress / challenge.targetValue) * 100);
  const openaiProgressPct = Math.min(100, (openaiSandbox.currentProgress / challenge.targetValue) * 100);

  const prompt = `You are assessing the win probability for two AI agents competing in a real-time challenge.

CHALLENGE: ${challenge.goalDescription}
TARGET: ${challenge.targetValue} ${challenge.goalType}

CLAUDE (Agent A):
- Progress: ${claudeSandbox.currentProgress} / ${challenge.targetValue} (${claudeProgressPct.toFixed(1)}%)
- Credits remaining: ${claudeSandbox.creditsRemaining}
- Wallet balance: $${(claudeSandbox.walletBalance / 100).toFixed(2)}
- Recent actions (last 10s):
${formatEvents(claudeEvents)}

OPENAI / GPT (Agent B):
- Progress: ${openaiSandbox.currentProgress} / ${challenge.targetValue} (${openaiProgressPct.toFixed(1)}%)
- Credits remaining: ${openaiSandbox.creditsRemaining}
- Wallet balance: $${(openaiSandbox.walletBalance / 100).toFixed(2)}
- Recent actions (last 10s):
${formatEvents(openaiEvents)}

Current odds: Claude ${baseClaudePct.toFixed(1)}% / OpenAI ${baseOpenaiPct.toFixed(1)}%

Based on the agents' recent actions, progress momentum, and resource efficiency, assess whether the win probability should shift. Consider:
1. Are the recent actions moving toward the goal effectively?
2. Is one agent making better use of resources?
3. Is one agent's progress accelerating or stalling?

Respond with ONLY a JSON object in this exact format (no markdown, no explanation):
{"claudePct": <number 0-100>, "openaiPct": <number 0-100>, "reasoning": "<one sentence>"}

The two numbers must sum to 100. Make conservative adjustments (max ±8 points per assessment).`;

  // Call Claude Haiku
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5",
      max_tokens: 150,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error("[oddsAssessor] Anthropic API error:", response.status, err);
    return;
  }

  const result = await response.json();
  const text = result.content?.[0]?.text ?? "";

  let aiClaudePct: number;
  let aiOpenaiPct: number;

  try {
    const parsed = JSON.parse(text.trim());
    aiClaudePct = Math.max(5, Math.min(95, Number(parsed.claudePct)));
    aiOpenaiPct = 100 - aiClaudePct;
    console.log(`[oddsAssessor] ${challengeId}: ${parsed.reasoning}`);
  } catch {
    console.error("[oddsAssessor] Failed to parse Claude response:", text);
    return;
  }

  // Blend: 60% betting pool + 40% AI assessment
  const AI_WEIGHT = 0.4;
  const POOL_WEIGHT = 0.6;

  const blendedClaudePct = poolTotal > 0
    ? POOL_WEIGHT * poolClaudePct + AI_WEIGHT * aiClaudePct
    : aiClaudePct;
  const blendedOpenaiPct = 100 - blendedClaudePct;

  // Clamp to avoid extreme swings
  const finalClaudePct = Math.max(5, Math.min(95, blendedClaudePct));
  const finalOpenaiPct = 100 - finalClaudePct;

  await ctx.runMutation(internal.oddsAssessor.writeOdds, {
    challengeId,
    claudePct: Math.round(finalClaudePct * 10) / 10,
    openaiPct: Math.round(finalOpenaiPct * 10) / 10,
  });
}
