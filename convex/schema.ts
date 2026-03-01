import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    balance: v.optional(v.number()),
    /** Total usd_credits balance we've already synced from Autumn (so we don't double-credit). */
    autumnBalanceSynced: v.optional(v.number()),
  })
    .index("email", ["email"])
    .index("phone", ["phone"]),

  sandboxes: defineTable({
    goalDescription: v.string(),
    goalType: v.string(),
    targetValue: v.number(),
    currentProgress: v.number(),
    status: v.string(),
    model: v.string(),
    daytonaSandboxId: v.string(),
    agentmailInboxId: v.string(),
    paylocusWalletId: v.string(),
    walletBalance: v.number(),
    timeLimit: v.number(),
    creditsRemaining: v.number(),
    liveUrl: v.optional(v.string()),
    shareUrl: v.optional(v.string()),
    constraints: v.optional(v.array(v.string())),
    verificationHint: v.optional(v.string()),
    platform: v.optional(v.string()),
    accountHandle: v.optional(v.string()),
    /** Agent earnings in USD (tracked when agent completes paid tasks / settles). */
    agentEarningsUsd: v.optional(v.number()),
    createdAt: v.number(),
    expiresAt: v.number(),
    createdBy: v.id("users"),
  })
    .index("by_status", ["status"])
    .index("by_created", ["createdAt"])
    .index("by_model", ["model"])
    .index("by_goal_status", ["goalDescription", "status"]),

  bets: defineTable({
    sandboxId: v.id("sandboxes"),
    userId: v.id("users"),
    amount: v.number(),
    position: v.string(),
    oddsAtPlacement: v.number(),
    settled: v.boolean(),
    payout: v.optional(v.number()),
    placedAt: v.number(),
  })
    .index("by_sandbox", ["sandboxId"])
    .index("by_user", ["userId"]),

  bettingPools: defineTable({
    sandboxId: v.id("sandboxes"),
    yesTotal: v.number(),
    noTotal: v.number(),
    bettingOpen: v.boolean(),
    platformTake: v.optional(v.number()),
  }).index("by_sandbox", ["sandboxId"]),

  creditTransactions: defineTable({
    sandboxId: v.id("sandboxes"),
    userId: v.id("users"),
    amount: v.number(),
    type: v.string(),
    createdAt: v.number(),
  }).index("by_sandbox", ["sandboxId"]),

  paymentTransactions: defineTable({
    sandboxId: v.id("sandboxes"),
    amount: v.number(),
    description: v.string(),
    recipient: v.string(),
    status: v.string(),
    createdAt: v.number(),
  }).index("by_sandbox", ["sandboxId"]),

  agentEmails: defineTable({
    sandboxId: v.id("sandboxes"),
    direction: v.string(),
    subject: v.string(),
    snippet: v.string(),
    timestamp: v.number(),
  }).index("by_sandbox", ["sandboxId"]),

  promptInjections: defineTable({
    sandboxId: v.id("sandboxes"),
    userId: v.id("users"),
    promptText: v.string(),
    injectedAt: v.number(),
    acknowledged: v.boolean(),
  }).index("by_sandbox_pending", ["sandboxId", "acknowledged"]),

  agentEvents: defineTable({
    sandboxId: v.id("sandboxes"),
    eventType: v.string(),
    payload: v.string(),
    timestamp: v.number(),
  })
    .index("by_sandbox_time", ["sandboxId", "timestamp"])
    .index("by_timestamp", ["timestamp"]),

  screenshots: defineTable({
    sandboxId: v.id("sandboxes"),
    storageId: v.id("_storage"),
    timestamp: v.number(),
  }).index("by_sandbox_time", ["sandboxId", "timestamp"]),
});
