import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const submit = mutation({
  args: {
    sandboxId: v.id("sandboxes"),
    userId: v.id("users"),
    promptText: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("promptInjections", {
      sandboxId: args.sandboxId,
      userId: args.userId,
      promptText: args.promptText,
      injectedAt: Date.now(),
      acknowledged: false,
    });
  },
});

export const fetchPending = query({
  args: { sandboxId: v.id("sandboxes") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("promptInjections")
      .withIndex("by_sandbox_pending", (q) =>
        q.eq("sandboxId", args.sandboxId).eq("acknowledged", false)
      )
      .collect();
  },
});

export const acknowledge = mutation({
  args: { promptId: v.id("promptInjections") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.promptId, { acknowledged: true });
  },
});
