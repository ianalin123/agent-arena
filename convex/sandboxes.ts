import {
  action,
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("sandboxes")
      .withIndex("by_created")
      .order("desc")
      .take(100);
  },
});

export const listActive = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("sandboxes")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .take(200);
  },
});

export const listByModel = query({
  args: { model: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("sandboxes")
      .withIndex("by_model", (q) => q.eq("model", args.model))
      .order("desc")
      .take(100);
  },
});

export const getComparison = query({
  args: { sandboxId: v.id("sandboxes") },
  handler: async (ctx, args) => {
    const sandbox = await ctx.db.get(args.sandboxId);
    if (!sandbox) return [];
    const goalDescription = sandbox.goalDescription;
    const completed = await ctx.db
      .query("sandboxes")
      .withIndex("by_goal_status", (q) =>
        q.eq("goalDescription", goalDescription).eq("status", "completed")
      )
      .take(50);
    const failed = await ctx.db
      .query("sandboxes")
      .withIndex("by_goal_status", (q) =>
        q.eq("goalDescription", goalDescription).eq("status", "failed")
      )
      .take(50);
    return [...completed, ...failed];
  },
});

export const getModelStats = query({
  args: {},
  handler: async (ctx) => {
    const completedSandboxes = await ctx.db
      .query("sandboxes")
      .withIndex("by_status", (q) => q.eq("status", "completed"))
      .take(500);
    const failedSandboxes = await ctx.db
      .query("sandboxes")
      .withIndex("by_status", (q) => q.eq("status", "failed"))
      .take(500);
    const allFinished = [...completedSandboxes, ...failedSandboxes];

    const byModel = new Map<
      string,
      { success: number; failed: number; totalWallet: number; count: number }
    >();
    for (const s of allFinished) {
      const cur = byModel.get(s.model) ?? {
        success: 0,
        failed: 0,
        totalWallet: 0,
        count: 0,
      };
      if (s.status === "completed") cur.success++;
      else cur.failed++;
      cur.totalWallet += s.walletBalance ?? 0;
      cur.count++;
      byModel.set(s.model, cur);
    }
    return Array.from(byModel.entries()).map(([model, agg]) => ({
      model,
      successRate: agg.count > 0 ? agg.success / agg.count : 0,
      successCount: agg.success,
      failedCount: agg.failed,
      totalCount: agg.count,
      avgWalletSpend: agg.count > 0 ? agg.totalWallet / agg.count : 0,
    }));
  },
});

export const listActiveByGoalType = query({
  args: { goalType: v.string() },
  handler: async (ctx, args) => {
    const active = await ctx.db
      .query("sandboxes")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .take(200);
    return active.filter((s) => s.goalType === args.goalType);
  },
});

export const listByGoalType = query({
  args: { goalType: v.string() },
  handler: async (ctx, args) => {
    const all = await ctx.db
      .query("sandboxes")
      .withIndex("by_created")
      .order("desc")
      .take(200);
    return all.filter((s) => s.goalType === args.goalType);
  },
});

export const getForLaunch = internalQuery({
  args: { sandboxId: v.id("sandboxes") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.sandboxId);
  },
});

export const listExpiredActive = internalQuery({
  args: { now: v.number() },
  handler: async (ctx, args) => {
    const active = await ctx.db
      .query("sandboxes")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .take(200);
    return active.filter((s) => s.expiresAt < args.now).map((s) => s._id);
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
    constraints: v.optional(v.array(v.string())),
    verificationHint: v.optional(v.string()),
    platform: v.optional(v.string()),
    accountHandle: v.optional(v.string()),
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
      constraints: args.constraints,
      verificationHint: args.verificationHint,
      platform: args.platform,
      accountHandle: args.accountHandle,
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

export const updateLiveUrl = mutation({
  args: {
    sandboxId: v.id("sandboxes"),
    liveUrl: v.string(),
    shareUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sandboxId, {
      liveUrl: args.liveUrl,
      ...(args.shareUrl !== undefined && { shareUrl: args.shareUrl }),
    });
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

export const updateAfterLaunch = mutation({
  args: {
    sandboxId: v.id("sandboxes"),
    daytonaSandboxId: v.string(),
    agentmailInboxId: v.string(),
    paylocusWalletId: v.string(),
    walletBalance: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sandboxId, {
      daytonaSandboxId: args.daytonaSandboxId,
      agentmailInboxId: args.agentmailInboxId,
      paylocusWalletId: args.paylocusWalletId,
      status: "active",
      ...(args.walletBalance !== undefined && { walletBalance: args.walletBalance }),
    });
  },
});

export const launch = action({
  args: { sandboxId: v.id("sandboxes") },
  handler: async (ctx, args) => {
    const sandbox = await ctx.runQuery(internal.sandboxes.getForLaunch, {
      sandboxId: args.sandboxId,
    });
    if (!sandbox) throw new Error("Sandbox not found");
    const orchestratorUrl = process.env.CONVEX_ORCHESTRATOR_URL;
    if (!orchestratorUrl) {
      throw new Error(
        "CONVEX_ORCHESTRATOR_URL not set; configure orchestrator to create Daytona sandbox and call updateAfterLaunch"
      );
    }
    const res = await fetch(`${orchestratorUrl.replace(/\/$/, "")}/launch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sandboxId: args.sandboxId,
        goalDescription: sandbox.goalDescription,
        model: sandbox.model,
        timeLimit: sandbox.timeLimit,
        config: sandbox,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Orchestrator launch failed: ${res.status} ${text}`);
    }
    const data = (await res.json()) as {
      daytonaSandboxId: string;
      agentmailInboxId: string;
      paylocusWalletId: string;
      walletBalance?: number;
    };
    await ctx.runMutation(internal.sandboxes.updateAfterLaunch, {
      sandboxId: args.sandboxId,
      daytonaSandboxId: data.daytonaSandboxId,
      agentmailInboxId: data.agentmailInboxId,
      paylocusWalletId: data.paylocusWalletId,
      walletBalance: data.walletBalance,
    });
  },
});

export const autoSettleExpired = internalAction({
  args: {},
  handler: async (ctx) => {
    const expiredIds = await ctx.runQuery(
      internal.sandboxes.listExpiredActive,
      { now: Date.now() }
    );
    for (const sandboxId of expiredIds) {
      await ctx.runMutation(internal.betting.settleExpired, { sandboxId });
    }
  },
});

export const stop = mutation({
  args: { sandboxId: v.id("sandboxes") },
  handler: async (ctx, args) => {
    const sandbox = await ctx.db.get(args.sandboxId);
    if (!sandbox) throw new Error("Sandbox not found");
    if (sandbox.status !== "active" && sandbox.status !== "paused" && sandbox.status !== "pending") {
      throw new Error(`Cannot stop sandbox with status "${sandbox.status}"`);
    }
    await ctx.db.patch(args.sandboxId, { status: "failed" });
  },
});

export const pause = mutation({
  args: { sandboxId: v.id("sandboxes") },
  handler: async (ctx, args) => {
    const sandbox = await ctx.db.get(args.sandboxId);
    if (!sandbox) throw new Error("Sandbox not found");
    if (sandbox.status !== "active") {
      throw new Error(`Cannot pause sandbox with status "${sandbox.status}"`);
    }
    await ctx.db.patch(args.sandboxId, { status: "paused" });
  },
});

export const resume = mutation({
  args: { sandboxId: v.id("sandboxes") },
  handler: async (ctx, args) => {
    const sandbox = await ctx.db.get(args.sandboxId);
    if (!sandbox) throw new Error("Sandbox not found");
    if (sandbox.status !== "paused") {
      throw new Error(`Cannot resume sandbox with status "${sandbox.status}"`);
    }
    await ctx.db.patch(args.sandboxId, { status: "active" });
  },
});

/** Credit USD earnings to the agent (e.g. on task completion or settlement). Call from event_bridge or settlement. */
export const addAgentEarnings = internalMutation({
  args: {
    sandboxId: v.id("sandboxes"),
    amountUsd: v.number(),
  },
  handler: async (ctx, args) => {
    if (args.amountUsd <= 0) return;
    const sandbox = await ctx.db.get(args.sandboxId);
    if (!sandbox) return;
    const current = sandbox.agentEarningsUsd ?? 0;
    await ctx.db.patch(args.sandboxId, {
      agentEarningsUsd: current + args.amountUsd,
    });
  },
});
