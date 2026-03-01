import {
  internalAction,
  internalMutation,
  internalQuery,
  query,
} from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

export const record = internalMutation({
  args: {
    challengeId: v.id("challenges"),
    claudePct: v.number(),
    openaiPct: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("oddsHistory", {
      challengeId: args.challengeId,
      claudePct: args.claudePct,
      openaiPct: args.openaiPct,
      timestamp: Date.now(),
    });
  },
});

export const list = query({
  args: {
    challengeId: v.id("challenges"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("oddsHistory")
      .withIndex("by_challenge_time", (q) =>
        q.eq("challengeId", args.challengeId)
      )
      .order("asc")
      .take(args.limit ?? 500);
  },
});

export const snapshotAllActive = internalAction({
  args: {},
  handler: async (ctx) => {
    const activeChallenges = await ctx.runQuery(
      internal.challenges.listActive,
      {}
    );

    for (const challenge of activeChallenges) {
      const pool = await ctx.runQuery(internal.oddsHistory.getPool, {
        challengeId: challenge._id,
      });
      if (!pool) continue;

      const total = pool.yesTotal + pool.noTotal;
      const claudePct = total > 0 ? (pool.yesTotal / total) * 100 : 50;
      const openaiPct = total > 0 ? (pool.noTotal / total) * 100 : 50;

      await ctx.runMutation(internal.oddsHistory.record, {
        challengeId: challenge._id,
        claudePct,
        openaiPct,
      });
    }
  },
});

export const getPool = internalQuery({
  args: { challengeId: v.id("challenges") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("bettingPools")
      .withIndex("by_challenge", (q) => q.eq("challengeId", args.challengeId))
      .first();
  },
});
