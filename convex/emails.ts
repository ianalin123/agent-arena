import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const record = mutation({
  args: {
    sandboxId: v.id("sandboxes"),
    direction: v.string(),
    subject: v.string(),
    snippet: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("agentEmails", {
      sandboxId: args.sandboxId,
      direction: args.direction,
      subject: args.subject,
      snippet: args.snippet,
      timestamp: Date.now(),
    });
  },
});
