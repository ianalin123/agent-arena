import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getForSandbox = query({
  args: { sandboxId: v.id("sandboxes") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("creditTransactions")
      .withIndex("by_sandbox", (q) => q.eq("sandboxId", args.sandboxId))
      .collect();
  },
});

export const inject = mutation({
  args: {
    sandboxId: v.id("sandboxes"),
    userId: v.id("users"),
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user || user.balance < args.amount) {
      throw new Error("Insufficient balance");
    }

    await ctx.db.patch(args.userId, {
      balance: user.balance - args.amount,
    });

    const sandbox = await ctx.db.get(args.sandboxId);
    if (!sandbox) throw new Error("Sandbox not found");

    await ctx.db.patch(args.sandboxId, {
      creditsRemaining: sandbox.creditsRemaining + args.amount,
    });

    await ctx.db.insert("creditTransactions", {
      sandboxId: args.sandboxId,
      userId: args.userId,
      amount: args.amount,
      type: "topup",
      createdAt: Date.now(),
    });
  },
});
