import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const record = mutation({
  args: {
    sandboxId: v.id("sandboxes"),
    amount: v.number(),
    description: v.string(),
    recipient: v.string(),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("paymentTransactions", {
      sandboxId: args.sandboxId,
      amount: args.amount,
      description: args.description,
      recipient: args.recipient,
      status: args.status,
      createdAt: Date.now(),
    });
  },
});
