import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

// How long (ms) before a presence record is considered stale
const STALE_MS = 90_000; // 90 seconds

/**
 * Called by the frontend every 30s to keep the session alive.
 * Upserts a presence record keyed on sessionId.
 */
export const heartbeat = mutation({
  args: {
    sessionId: v.string(),
    path: v.string(),
  },
  handler: async (ctx, { sessionId, path }) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("presence")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { path, lastSeen: now });
    } else {
      await ctx.db.insert("presence", { sessionId, path, lastSeen: now });
    }
  },
});

/**
 * Returns the total number of active viewers across the entire site.
 * Reactive — all subscribers update automatically when the count changes.
 */
export const countActive = query({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - STALE_MS;
    const records = await ctx.db
      .query("presence")
      .withIndex("by_last_seen", (q) => q.gt("lastSeen", cutoff))
      .collect();
    return records.length;
  },
});

/**
 * Returns the number of active viewers on a specific path (e.g. a challenge page).
 */
export const countByPath = query({
  args: { path: v.string() },
  handler: async (ctx, { path }) => {
    const cutoff = Date.now() - STALE_MS;
    const records = await ctx.db
      .query("presence")
      .withIndex("by_path", (q) => q.eq("path", path))
      .filter((q) => q.gt(q.field("lastSeen"), cutoff))
      .collect();
    return records.length;
  },
});

/**
 * Internal: removes all stale presence records. Called by the cron job.
 */
export const cleanupStale = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - STALE_MS;
    const stale = await ctx.db
      .query("presence")
      .withIndex("by_last_seen", (q) => q.lt("lastSeen", cutoff))
      .collect();
    await Promise.all(stale.map((r) => ctx.db.delete(r._id)));
    return stale.length;
  },
});
