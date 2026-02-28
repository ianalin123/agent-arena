import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const push = mutation({
  args: {
    sandboxId: v.id("sandboxes"),
    eventType: v.string(),
    payload: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("agentEvents", {
      sandboxId: args.sandboxId,
      eventType: args.eventType,
      payload: args.payload,
      timestamp: Date.now(),
    });
  },
});

export const recent = query({
  args: {
    sandboxId: v.id("sandboxes"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("agentEvents")
      .withIndex("by_sandbox_time", (q) => q.eq("sandboxId", args.sandboxId))
      .order("desc")
      .take(args.limit ?? 20);
  },
});
