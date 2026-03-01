import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    goalDescription: v.string(),
    goalType: v.string(),
    targetValue: v.number(),
    timeLimit: v.number(),
    initialCredits: v.number(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const sharedFields = {
      goalDescription: args.goalDescription,
      goalType: args.goalType,
      targetValue: args.targetValue,
      currentProgress: 0,
      status: "pending" as const,
      daytonaSandboxId: "",
      agentmailInboxId: "",
      paylocusWalletId: "",
      walletBalance: 0,
      timeLimit: args.timeLimit,
      creditsRemaining: args.initialCredits,
      createdAt: now,
      expiresAt: now + args.timeLimit * 1000,
      createdBy: args.userId,
    };

    const claudeSandboxId = await ctx.db.insert("sandboxes", {
      ...sharedFields,
      model: "claude-sonnet",
    });

    const openaiSandboxId = await ctx.db.insert("sandboxes", {
      ...sharedFields,
      model: "gpt-4o",
    });

    const existingChallenges = await ctx.db
      .query("challenges")
      .withIndex("by_created")
      .order("desc")
      .take(1);
    const sessionNumber =
      existingChallenges.length > 0
        ? existingChallenges[0].sessionNumber + 1
        : 1;

    const challengeId = await ctx.db.insert("challenges", {
      goalDescription: args.goalDescription,
      goalType: args.goalType,
      targetValue: args.targetValue,
      claudeSandboxId,
      openaiSandboxId,
      status: "active",
      sessionNumber,
      createdAt: now,
    });

    await ctx.db.insert("bettingPools", {
      sandboxId: claudeSandboxId,
      yesTotal: 0,
      noTotal: 0,
      bettingOpen: true,
      challengeId,
    });

    return challengeId;
  },
});

export const get = query({
  args: { challengeId: v.id("challenges") },
  handler: async (ctx, args) => {
    const challenge = await ctx.db.get(args.challengeId);
    if (!challenge) return null;

    const claudeSandbox = await ctx.db.get(challenge.claudeSandboxId);
    const openaiSandbox = await ctx.db.get(challenge.openaiSandboxId);

    const pool = await ctx.db
      .query("bettingPools")
      .withIndex("by_challenge", (q) => q.eq("challengeId", args.challengeId))
      .first();

    return { challenge, claudeSandbox, openaiSandbox, pool };
  },
});

export const listActive = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("challenges")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .order("desc")
      .take(20);
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("challenges")
      .withIndex("by_created")
      .order("desc")
      .take(50);
  },
});
