import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "auto-settle expired sandboxes",
  { minutes: 1 },
  internal.sandboxes.autoSettleExpired
);

export default crons;
