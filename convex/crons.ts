import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "auto-settle expired sandboxes",
  { minutes: 1 },
  internal.sandboxes.autoSettleExpired
);

crons.interval(
  "cleanup-old-events",
  { hours: 6 },
  internal.events.cleanup
);

crons.interval(
  "snapshot-odds-history",
  { seconds: 30 },
  internal.oddsHistory.snapshotAllActive
);

export default crons;
