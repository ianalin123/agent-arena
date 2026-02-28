import { action, query } from "./_generated/server";
import { v } from "convex/values";
import { BrowserUse } from "browser-use-convex-component";
import { components } from "./_generated/api";

const browserUse = new BrowserUse(components.browserUse);

// ─── Task management ─────────────────────────────────────────────

export const createTask = action({
  args: {
    task: v.string(),
    sandboxId: v.optional(v.id("sandboxes")),
    startUrl: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    maxSteps: v.optional(v.number()),
    vision: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { taskId, externalId } = await browserUse.createTask(ctx, {
      task: args.task,
      startUrl: args.startUrl,
      sessionId: args.sessionId,
      maxSteps: args.maxSteps ?? 100,
      vision: args.vision ?? true,
      metadata: args.sandboxId ? { sandboxId: args.sandboxId } : undefined,
    });
    return { taskId, externalId };
  },
});

export const getTask = query({
  args: { taskId: v.string() },
  handler: async (ctx, args) => {
    return await browserUse.getTask(ctx, { taskId: args.taskId });
  },
});

export const listTasks = query({
  args: {},
  handler: async (ctx) => {
    return await browserUse.listTasks(ctx);
  },
});

export const getTaskSteps = query({
  args: { taskId: v.string() },
  handler: async (ctx, args) => {
    return await browserUse.getTaskSteps(ctx, { taskId: args.taskId });
  },
});

export const fetchTaskStatus = action({
  args: { externalId: v.string() },
  handler: async (ctx, args) => {
    return await browserUse.fetchTaskStatus(ctx, {
      externalId: args.externalId,
    });
  },
});

export const fetchTaskDetail = action({
  args: { externalId: v.string() },
  handler: async (ctx, args) => {
    return await browserUse.fetchTaskDetail(ctx, {
      externalId: args.externalId,
    });
  },
});

export const stopTask = action({
  args: { externalId: v.string() },
  handler: async (ctx, args) => {
    return await browserUse.stopTask(ctx, { externalId: args.externalId });
  },
});

// ─── Session management ──────────────────────────────────────────

export const createSession = action({
  args: {
    proxyCountryCode: v.optional(v.string()),
    profileId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await browserUse.createSession(ctx, {
      proxyCountryCode: args.proxyCountryCode ?? "us",
      profileId: args.profileId,
    });
  },
});

export const getSession = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    return await browserUse.getSession(ctx, { sessionId: args.sessionId });
  },
});

export const listSessions = query({
  args: {},
  handler: async (ctx) => {
    return await browserUse.listSessions(ctx);
  },
});

export const fetchSessionDetail = action({
  args: { externalId: v.string() },
  handler: async (ctx, args) => {
    return await browserUse.fetchSessionDetail(ctx, {
      externalId: args.externalId,
    });
  },
});

export const stopSession = action({
  args: { externalId: v.string() },
  handler: async (ctx, args) => {
    return await browserUse.stopSession(ctx, { externalId: args.externalId });
  },
});

// ─── Profile management ──────────────────────────────────────────

export const createProfile = action({
  args: { name: v.optional(v.string()) },
  handler: async (ctx, args) => {
    return await browserUse.createProfile(ctx, { name: args.name });
  },
});

export const listProfiles = action({
  args: {},
  handler: async (ctx) => {
    return await browserUse.listProfiles(ctx);
  },
});
