import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";
import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getPool = query({
  args: { sandboxId: v.id("sandboxes") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("bettingPools")
      .withIndex("by_sandbox", (q) => q.eq("sandboxId", args.sandboxId))
      .first();
  },
});

export const getBets = query({
  args: { sandboxId: v.id("sandboxes") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("bets")
      .withIndex("by_sandbox", (q) => q.eq("sandboxId", args.sandboxId))
      .take(200);
  },
});

export const getUserBets = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("bets")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .take(200);
  },
});

export const placeBet = mutation({
  args: {
    sandboxId: v.id("sandboxes"),
    amount: v.number(),
    position: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Must be signed in to place a bet");

    let pool = await ctx.db
      .query("bettingPools")
      .withIndex("by_sandbox", (q) => q.eq("sandboxId", args.sandboxId))
      .first();

    if (!pool) {
      await ctx.db.insert("bettingPools", {
        sandboxId: args.sandboxId,
        yesTotal: 0,
        noTotal: 0,
        bettingOpen: true,
      });
      pool = await ctx.db
        .query("bettingPools")
        .withIndex("by_sandbox", (q) => q.eq("sandboxId", args.sandboxId))
        .first();
    }

    if (!pool || !pool.bettingOpen) {
      throw new Error("Betting is closed for this sandbox");
    }

    const sandbox = await ctx.db.get(args.sandboxId);
    if (sandbox) {
      const now = Date.now();
      const elapsed = now - sandbox.createdAt;
      const timeLimitMs = sandbox.timeLimit * 1000;
      const progressPct =
        sandbox.targetValue > 0
          ? sandbox.currentProgress / sandbox.targetValue
          : 0;
      if (elapsed >= 0.8 * timeLimitMs || progressPct >= 0.9) {
        await ctx.db.patch(pool._id, { bettingOpen: false });
        throw new Error("Betting is closed for this sandbox");
      }
    }

    const user = await ctx.db.get(userId);
    if (!user || (user.balance ?? 0) < args.amount) {
      throw new Error("Insufficient balance");
    }

    await ctx.db.patch(userId, {
      balance: (user.balance ?? 0) - args.amount,
    });

    const poolUpdate =
      args.position === "yes"
        ? { yesTotal: pool.yesTotal + args.amount }
        : { noTotal: pool.noTotal + args.amount };
    await ctx.db.patch(pool._id, poolUpdate);

    const newTotal = pool.yesTotal + pool.noTotal + args.amount;
    const winningPool =
      args.position === "yes"
        ? pool.yesTotal + args.amount
        : pool.noTotal + args.amount;

    await ctx.db.insert("bets", {
      sandboxId: args.sandboxId,
      userId,
      amount: args.amount,
      position: args.position,
      oddsAtPlacement: newTotal / winningPool,
      settled: false,
      placedAt: Date.now(),
    });
  },
});

/** Place a bet on a sandbox using an explicit userId (guest/demo, no auth required). Deducts amount from that user's balance. */
export const placeBetAsGuestForSandbox = mutation({
  args: {
    sandboxId: v.id("sandboxes"),
    amount: v.number(),
    position: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    let pool = await ctx.db
      .query("bettingPools")
      .withIndex("by_sandbox", (q) => q.eq("sandboxId", args.sandboxId))
      .first();

    if (!pool) {
      await ctx.db.insert("bettingPools", {
        sandboxId: args.sandboxId,
        yesTotal: 0,
        noTotal: 0,
        bettingOpen: true,
      });
      pool = await ctx.db
        .query("bettingPools")
        .withIndex("by_sandbox", (q) => q.eq("sandboxId", args.sandboxId))
        .first();
    }

    if (!pool || !pool.bettingOpen) {
      throw new Error("Betting is closed for this sandbox");
    }

    const sandbox = await ctx.db.get(args.sandboxId);
    if (sandbox) {
      const now = Date.now();
      const elapsed = now - sandbox.createdAt;
      const timeLimitMs = sandbox.timeLimit * 1000;
      const progressPct =
        sandbox.targetValue > 0
          ? sandbox.currentProgress / sandbox.targetValue
          : 0;
      if (elapsed >= 0.8 * timeLimitMs || progressPct >= 0.9) {
        await ctx.db.patch(pool._id, { bettingOpen: false });
        throw new Error("Betting is closed for this sandbox");
      }
    }

    const user = await ctx.db.get(args.userId);
    if (!user || (user.balance ?? 0) < args.amount) {
      throw new Error("Insufficient balance");
    }

    await ctx.db.patch(args.userId, {
      balance: (user.balance ?? 0) - args.amount,
    });

    const poolUpdate =
      args.position === "yes"
        ? { yesTotal: pool.yesTotal + args.amount }
        : { noTotal: pool.noTotal + args.amount };
    await ctx.db.patch(pool._id, poolUpdate);

    const newTotal = pool.yesTotal + pool.noTotal + args.amount;
    const winningPool =
      args.position === "yes"
        ? pool.yesTotal + args.amount
        : pool.noTotal + args.amount;

    await ctx.db.insert("bets", {
      sandboxId: args.sandboxId,
      userId: args.userId,
      amount: args.amount,
      position: args.position,
      oddsAtPlacement: newTotal / winningPool,
      settled: false,
      placedAt: Date.now(),
    });
  },
});

export const settle = mutation({
  args: {
    sandboxId: v.id("sandboxes"),
    outcome: v.string(),
  },
  handler: async (ctx, args) => {
    const pool = await ctx.db
      .query("bettingPools")
      .withIndex("by_sandbox", (q) => q.eq("sandboxId", args.sandboxId))
      .first();
    if (!pool) return;

    const totalPool = pool.yesTotal + pool.noTotal;
    const winningPosition = args.outcome === "success" ? "yes" : "no";
    const winningPool =
      winningPosition === "yes" ? pool.yesTotal : pool.noTotal;

    const platformTakePct = 0.05;
    const platformTake = totalPool * platformTakePct;
    const prizePoolForWinners = totalPool - platformTake;

    const bets = await ctx.db
      .query("bets")
      .withIndex("by_sandbox", (q) => q.eq("sandboxId", args.sandboxId))
      .collect();

    for (const bet of bets) {
      const payout =
        winningPool > 0 && bet.position === winningPosition
          ? (bet.amount / winningPool) * prizePoolForWinners
          : 0;

      await ctx.db.patch(bet._id, { settled: true, payout });

      if (payout > 0) {
        const user = await ctx.db.get(bet.userId);
        if (user) {
          await ctx.db.patch(bet.userId, { balance: (user.balance ?? 0) + payout });
        }
      }
    }

    await ctx.db.patch(pool._id, {
      bettingOpen: false,
      platformTake,
    });
    if (platformTake > 0) {
      await ctx.runMutation(internal.sandboxes.addAgentEarnings, {
        sandboxId: args.sandboxId,
        amountUsd: platformTake,
      });
    }
  },
});

export const getOdds = query({
  args: { sandboxId: v.id("sandboxes") },
  handler: async (ctx, args) => {
    const pool = await ctx.db
      .query("bettingPools")
      .withIndex("by_sandbox", (q) => q.eq("sandboxId", args.sandboxId))
      .first();
    if (!pool) {
      return {
        yesOdds: 1,
        noOdds: 1,
        yesPct: 0.5,
        noPct: 0.5,
        totalPool: 0,
        bettingOpen: true,
      };
    }
    const totalPool = pool.yesTotal + pool.noTotal;
    const yesOdds = pool.yesTotal > 0 ? totalPool / pool.yesTotal : 1;
    const noOdds = pool.noTotal > 0 ? totalPool / pool.noTotal : 1;
    const yesPct = totalPool > 0 ? pool.yesTotal / totalPool : 0.5;
    const noPct = totalPool > 0 ? pool.noTotal / totalPool : 0.5;
    return {
      yesOdds,
      noOdds,
      yesPct,
      noPct,
      totalPool,
      bettingOpen: pool.bettingOpen,
    };
  },
});

export const settleExpired = internalMutation({
  args: { sandboxId: v.id("sandboxes") },
  handler: async (ctx, args) => {
    const sandbox = await ctx.db.get(args.sandboxId);
    if (
      !sandbox ||
      sandbox.status === "completed" ||
      sandbox.status === "failed"
    )
      return;
    if (Date.now() < sandbox.expiresAt) return;

    await ctx.db.patch(args.sandboxId, { status: "failed" });

    const pool = await ctx.db
      .query("bettingPools")
      .withIndex("by_sandbox", (q) => q.eq("sandboxId", args.sandboxId))
      .first();
    if (!pool) return;

    const totalPool = pool.yesTotal + pool.noTotal;
    const winningPool = pool.noTotal;
    const platformTakePct = 0.05;
    const platformTake = totalPool * platformTakePct;
    const prizePoolForWinners = totalPool - platformTake;

    const bets = await ctx.db
      .query("bets")
      .withIndex("by_sandbox", (q) => q.eq("sandboxId", args.sandboxId))
      .collect();

    for (const bet of bets) {
      const payout =
        winningPool > 0 && bet.position === "no"
          ? (bet.amount / winningPool) * prizePoolForWinners
          : 0;
      await ctx.db.patch(bet._id, { settled: true, payout });
      if (payout > 0) {
        const user = await ctx.db.get(bet.userId);
        if (user) {
          await ctx.db.patch(bet.userId, { balance: (user.balance ?? 0) + payout });
        }
      }
    }
    await ctx.db.patch(pool._id, {
      bettingOpen: false,
      platformTake,
    });
    if (platformTake > 0) {
      await ctx.runMutation(internal.sandboxes.addAgentEarnings, {
        sandboxId: args.sandboxId,
        amountUsd: platformTake,
      });
    }
  },
});

export const refund = mutation({
  args: { sandboxId: v.id("sandboxes") },
  handler: async (ctx, args) => {
    const pool = await ctx.db
      .query("bettingPools")
      .withIndex("by_sandbox", (q) => q.eq("sandboxId", args.sandboxId))
      .first();
    if (!pool) return;

    const bets = await ctx.db
      .query("bets")
      .withIndex("by_sandbox", (q) => q.eq("sandboxId", args.sandboxId))
      .collect();

    for (const bet of bets) {
      if (bet.settled) continue;
      await ctx.db.patch(bet._id, { settled: true, payout: bet.amount });
      const user = await ctx.db.get(bet.userId);
      if (user) {
        await ctx.db.patch(bet.userId, {
          balance: (user.balance ?? 0) + bet.amount,
        });
      }
    }

    await ctx.db.patch(pool._id, { bettingOpen: false });
  },
});

export const getPoolByChallenge = query({
  args: { challengeId: v.id("challenges") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("bettingPools")
      .withIndex("by_challenge", (q) => q.eq("challengeId", args.challengeId))
      .first();
  },
});

export const placeBetOnChallenge = mutation({
  args: {
    challengeId: v.id("challenges"),
    amount: v.number(),
    position: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Must be signed in to place a bet");

    const challenge = await ctx.db.get(args.challengeId);
    if (!challenge) throw new Error("Challenge not found");

    let pool = await ctx.db
      .query("bettingPools")
      .withIndex("by_challenge", (q) => q.eq("challengeId", args.challengeId))
      .first();

    if (!pool) {
      await ctx.db.insert("bettingPools", {
        sandboxId: challenge.claudeSandboxId,
        yesTotal: 0,
        noTotal: 0,
        bettingOpen: true,
        challengeId: args.challengeId,
      });
      pool = await ctx.db
        .query("bettingPools")
        .withIndex("by_challenge", (q) => q.eq("challengeId", args.challengeId))
        .first();
    }

    if (!pool || !pool.bettingOpen) {
      throw new Error("Betting is closed for this challenge");
    }
    const claudeSandbox = await ctx.db.get(challenge.claudeSandboxId);
    const openaiSandbox = await ctx.db.get(challenge.openaiSandboxId);
    const claudeDone =
      claudeSandbox &&
      (claudeSandbox.status === "completed" ||
        claudeSandbox.status === "failed");
    const openaiDone =
      openaiSandbox &&
      (openaiSandbox.status === "completed" ||
        openaiSandbox.status === "failed");
    if (claudeDone && openaiDone) {
      await ctx.db.patch(pool._id, { bettingOpen: false });
      throw new Error("Betting is closed for this challenge");
    }

    const user = await ctx.db.get(userId);
    if (!user || (user.balance ?? 0) < args.amount) {
      throw new Error("Insufficient balance");
    }

    await ctx.db.patch(userId, {
      balance: (user.balance ?? 0) - args.amount,
    });

    const poolUpdate =
      args.position === "claude"
        ? { yesTotal: pool.yesTotal + args.amount }
        : { noTotal: pool.noTotal + args.amount };
    await ctx.db.patch(pool._id, poolUpdate);

    const newTotal = pool.yesTotal + pool.noTotal + args.amount;
    const winningPool =
      args.position === "claude"
        ? pool.yesTotal + args.amount
        : pool.noTotal + args.amount;

    const sandboxId =
      args.position === "claude"
        ? challenge?.claudeSandboxId
        : challenge?.openaiSandboxId;

    await ctx.db.insert("bets", {
      sandboxId: sandboxId ?? (undefined as any),
      challengeId: args.challengeId,
      userId,
      amount: args.amount,
      position: args.position,
      oddsAtPlacement: newTotal / winningPool,
      settled: false,
      placedAt: Date.now(),
    });
  },
});

/** Same as placeBetOnChallenge but accepts an explicit userId (for guest/demo mode). */
export const placeBetAsGuest = mutation({
  args: {
    challengeId: v.id("challenges"),
    amount: v.number(),
    position: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    let pool = await ctx.db
      .query("bettingPools")
      .withIndex("by_challenge", (q) => q.eq("challengeId", args.challengeId))
      .first();

    const challenge = await ctx.db.get(args.challengeId);
    if (!challenge) throw new Error("Challenge not found");

    if (!pool) {
      await ctx.db.insert("bettingPools", {
        sandboxId: challenge.claudeSandboxId,
        yesTotal: 0,
        noTotal: 0,
        bettingOpen: true,
        challengeId: args.challengeId,
      });
      pool = await ctx.db
        .query("bettingPools")
        .withIndex("by_challenge", (q) => q.eq("challengeId", args.challengeId))
        .first();
    }

    if (!pool || !pool.bettingOpen) {
      throw new Error("Betting is closed for this challenge");
    }
    if (challenge) {
      const claudeSandbox = await ctx.db.get(challenge.claudeSandboxId);
      const openaiSandbox = await ctx.db.get(challenge.openaiSandboxId);
      const claudeDone =
        claudeSandbox &&
        (claudeSandbox.status === "completed" ||
          claudeSandbox.status === "failed");
      const openaiDone =
        openaiSandbox &&
        (openaiSandbox.status === "completed" ||
          openaiSandbox.status === "failed");
      if (claudeDone && openaiDone) {
        await ctx.db.patch(pool._id, { bettingOpen: false });
        throw new Error("Betting is closed for this challenge");
      }
    }

    const user = await ctx.db.get(args.userId);
    if (!user || (user.balance ?? 0) < args.amount) {
      throw new Error("Insufficient balance");
    }

    await ctx.db.patch(args.userId, {
      balance: (user.balance ?? 0) - args.amount,
    });

    const poolUpdate =
      args.position === "claude"
        ? { yesTotal: pool.yesTotal + args.amount }
        : { noTotal: pool.noTotal + args.amount };
    await ctx.db.patch(pool._id, poolUpdate);

    const newTotal = pool.yesTotal + pool.noTotal + args.amount;
    const winningPool =
      args.position === "claude"
        ? pool.yesTotal + args.amount
        : pool.noTotal + args.amount;

    const sandboxId =
      args.position === "claude"
        ? challenge?.claudeSandboxId
        : challenge?.openaiSandboxId;

    await ctx.db.insert("bets", {
      sandboxId: sandboxId ?? (undefined as any),
      challengeId: args.challengeId,
      userId: args.userId,
      amount: args.amount,
      position: args.position,
      oddsAtPlacement: newTotal / winningPool,
      settled: false,
      placedAt: Date.now(),
    });
  },
});

export const settleChallenge = mutation({
  args: {
    challengeId: v.id("challenges"),
    winner: v.string(),
  },
  handler: async (ctx, args) => {
    const pool = await ctx.db
      .query("bettingPools")
      .withIndex("by_challenge", (q) => q.eq("challengeId", args.challengeId))
      .first();
    if (!pool) return;

    const totalPool = pool.yesTotal + pool.noTotal;
    const winningPosition = args.winner === "claude" ? "claude" : "openai";
    const winningPool =
      args.winner === "claude" ? pool.yesTotal : pool.noTotal;

    const platformTakePct = 0.05;
    const platformTake = totalPool * platformTakePct;
    const prizePoolForWinners = totalPool - platformTake;

    const bets = await ctx.db
      .query("bets")
      .withIndex("by_challenge", (q) => q.eq("challengeId", args.challengeId))
      .collect();

    for (const bet of bets) {
      const payout =
        winningPool > 0 && bet.position === winningPosition
          ? (bet.amount / winningPool) * prizePoolForWinners
          : 0;

      await ctx.db.patch(bet._id, { settled: true, payout });

      if (payout > 0) {
        const user = await ctx.db.get(bet.userId);
        if (user) {
          await ctx.db.patch(bet.userId, {
            balance: (user.balance ?? 0) + payout,
          });
        }
      }
    }

    await ctx.db.patch(pool._id, {
      bettingOpen: false,
      platformTake,
    });
  },
});

export const getOddsByChallenge = query({
  args: { challengeId: v.id("challenges") },
  handler: async (ctx, args) => {
    const pool = await ctx.db
      .query("bettingPools")
      .withIndex("by_challenge", (q) => q.eq("challengeId", args.challengeId))
      .first();
    if (!pool) {
      return {
        claudeOdds: 1,
        openaiOdds: 1,
        claudePct: 0.5,
        openaiPct: 0.5,
        totalPool: 0,
        bettingOpen: true,
      };
    }
    const totalPool = pool.yesTotal + pool.noTotal;
    const claudeOdds = pool.yesTotal > 0 ? totalPool / pool.yesTotal : 1;
    const openaiOdds = pool.noTotal > 0 ? totalPool / pool.noTotal : 1;
    const claudePct = totalPool > 0 ? pool.yesTotal / totalPool : 0.5;
    const openaiPct = totalPool > 0 ? pool.noTotal / totalPool : 0.5;
    return {
      claudeOdds,
      openaiOdds,
      claudePct,
      openaiPct,
      totalPool,
      bettingOpen: pool.bettingOpen,
    };
  },
});

export const refundChallenge = mutation({
  args: { challengeId: v.id("challenges") },
  handler: async (ctx, args) => {
    const pool = await ctx.db
      .query("bettingPools")
      .withIndex("by_challenge", (q) => q.eq("challengeId", args.challengeId))
      .first();
    if (!pool) return;

    const bets = await ctx.db
      .query("bets")
      .withIndex("by_challenge", (q) => q.eq("challengeId", args.challengeId))
      .collect();

    for (const bet of bets) {
      if (bet.settled) continue;
      await ctx.db.patch(bet._id, { settled: true, payout: bet.amount });
      const user = await ctx.db.get(bet.userId);
      if (user) {
        await ctx.db.patch(bet.userId, {
          balance: (user.balance ?? 0) + bet.amount,
        });
      }
    }

    await ctx.db.patch(pool._id, { bettingOpen: false });
  },
});
