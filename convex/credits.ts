import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getForSandbox = query({
  args: { sandboxId: v.id("sandboxes") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("creditTransactions")
      .withIndex("by_sandbox", (q) => q.eq("sandboxId", args.sandboxId))
      .take(100);
  },
});

export const inject = mutation({
  args: {
    sandboxId: v.id("sandboxes"),
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Must be signed in to inject credits");

    const user = await ctx.db.get(userId);
    if (!user || (user.balance ?? 0) < args.amount) {
      throw new Error("Insufficient balance");
    }

    await ctx.db.patch(userId, {
      balance: (user.balance ?? 0) - args.amount,
    });

    const sandbox = await ctx.db.get(args.sandboxId);
    if (!sandbox) throw new Error("Sandbox not found");

    await ctx.db.patch(args.sandboxId, {
      creditsRemaining: sandbox.creditsRemaining + args.amount,
    });

    await ctx.db.insert("creditTransactions", {
      sandboxId: args.sandboxId,
      userId,
      amount: args.amount,
      type: "topup",
      createdAt: Date.now(),
    });
  },
});
