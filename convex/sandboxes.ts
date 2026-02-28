import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("sandboxes")
      .withIndex("by_status")
      .order("desc")
      .collect();
  },
});

export const get = query({
  args: { sandboxId: v.id("sandboxes") },
  handler: async (ctx, args) => {
    const sandbox = await ctx.db.get(args.sandboxId);
    const pool = await ctx.db
      .query("bettingPools")
      .withIndex("by_sandbox", (q) => q.eq("sandboxId", args.sandboxId))
      .first();
    const recentEvents = await ctx.db
      .query("agentEvents")
      .withIndex("by_sandbox_time", (q) => q.eq("sandboxId", args.sandboxId))
      .order("desc")
      .take(20);
    const recentPayments = await ctx.db
      .query("paymentTransactions")
      .withIndex("by_sandbox", (q) => q.eq("sandboxId", args.sandboxId))
      .order("desc")
      .take(5);
    return { sandbox, pool, recentEvents, recentPayments };
  },
});

export const create = mutation({
  args: {
    goalDescription: v.string(),
    goalType: v.string(),
    targetValue: v.number(),
    model: v.string(),
    timeLimit: v.number(),
    initialCredits: v.number(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const sandboxId = await ctx.db.insert("sandboxes", {
      goalDescription: args.goalDescription,
      goalType: args.goalType,
      targetValue: args.targetValue,
      currentProgress: 0,
      status: "pending",
      model: args.model,
      daytonaSandboxId: "",
      agentmailInboxId: "",
      paylocusWalletId: "",
      walletBalance: 0,
      timeLimit: args.timeLimit,
      creditsRemaining: args.initialCredits,
      createdAt: now,
      expiresAt: now + args.timeLimit * 1000,
      createdBy: args.userId,
    });

    await ctx.db.insert("bettingPools", {
      sandboxId,
      yesTotal: 0,
      noTotal: 0,
      bettingOpen: true,
    });

    return sandboxId;
  },
});

export const updateProgress = mutation({
  args: {
    sandboxId: v.id("sandboxes"),
    progress: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sandboxId, {
      currentProgress: args.progress,
    });
  },
});

export const updateStatus = mutation({
  args: {
    sandboxId: v.id("sandboxes"),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sandboxId, { status: args.status });
  },
});

export const complete = mutation({
  args: {
    sandboxId: v.id("sandboxes"),
    outcome: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sandboxId, {
      status: args.outcome === "success" ? "completed" : "failed",
    });
  },
});
