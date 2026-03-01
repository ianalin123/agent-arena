import { getAuthUserId } from "@convex-dev/auth/server";
import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return await ctx.db.get(userId);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    initialBalance: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("users", {
      name: args.name,
      email: args.email,
      balance: args.initialBalance ?? 1000,
    });
  },
});

export const get = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

export const getByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();
  },
});

/** First user id (for dev/demo when auth is not wired). */
export const getFirstUserId = query({
  args: {},
  handler: async (ctx) => {
    const user = await ctx.db.query("users").first();
    return user?._id ?? null;
  },
});

export const ensureTestUser = mutation({
  args: {
    name: v.string(),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();
    if (existing) return existing._id;
    return await ctx.db.insert("users", {
      name: args.name,
      email: args.email,
      balance: 1000,
    });
  },
});

export const updateBalance = mutation({
  args: {
    userId: v.id("users"),
    balance: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, { balance: args.balance });
  },
});

/** Called by Lemon Squeezy webhook (or other server code) to credit deposit. */
export const addToBalance = internalMutation({
  args: {
    userId: v.id("users"),
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    if (args.amount <= 0) return;
    const user = await ctx.db.get(args.userId);
    if (!user) return;
    await ctx.db.patch(args.userId, {
      balance: (user.balance ?? 0) + args.amount,
    });
  },
});

/** Apply Autumn balance sync: credit (autumnCurrentBalance - already synced) so we don't double-credit. */
export const syncAutumnBalance = internalMutation({
  args: {
    userId: v.id("users"),
    autumnCurrentBalance: v.number(),
  },
  handler: async (ctx, args) => {
    if (args.autumnCurrentBalance < 0) return;
    const user = await ctx.db.get(args.userId);
    if (!user) return;
    const synced = user.autumnBalanceSynced ?? 0;
    const toAdd = args.autumnCurrentBalance - synced;
    if (toAdd <= 0) return;
    await ctx.db.patch(args.userId, {
      balance: user.balance + toAdd,
      autumnBalanceSynced: args.autumnCurrentBalance,
    });
  },
});

/** Called by Stripe webhook to credit deposit by customer email. */
export const addToBalanceByEmail = internalMutation({
  args: {
    email: v.string(),
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    if (args.amount <= 0) return;
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    if (!user) return;
    await ctx.db.patch(user._id, {
      balance: user.balance + args.amount,
    });
  },
});
