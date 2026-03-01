import { internalMutation, mutation, query } from "./_generated/server";
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

export const listBySandbox = query({
  args: {
    sandboxId: v.id("sandboxes"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("agentEvents")
      .withIndex("by_sandbox_time", (q) => q.eq("sandboxId", args.sandboxId))
      .order("desc")
      .take(args.limit ?? 50);
  },
});

export const recentAll = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("agentEvents")
      .withIndex("by_timestamp")
      .order("desc")
      .take(args.limit ?? 50);
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const saveScreenshot = mutation({
  args: {
    sandboxId: v.id("sandboxes"),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("screenshots", {
      sandboxId: args.sandboxId,
      storageId: args.storageId,
      timestamp: Date.now(),
    });
  },
});

export const getLatestScreenshot = query({
  args: { sandboxId: v.id("sandboxes") },
  handler: async (ctx, args) => {
    const latest = await ctx.db
      .query("screenshots")
      .withIndex("by_sandbox_time", (q) => q.eq("sandboxId", args.sandboxId))
      .order("desc")
      .first();
    if (!latest) return null;
    const url = await ctx.storage.getUrl(latest.storageId);
    return { url, timestamp: latest.timestamp };
  },
});

export const cleanup = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const old = await ctx.db
      .query("agentEvents")
      .withIndex("by_timestamp")
      .filter((q) => q.lt(q.field("timestamp"), cutoff))
      .take(500);
    for (const event of old) {
      await ctx.db.delete(event._id);
    }
  },
});
