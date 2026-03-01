# Sandbox UX Cleanup Implementation Plan

> **For Claude:** Use `skills/collaboration/executing-plans` to implement this plan task-by-task.

**Goal:** Simplify the sandbox detail page by removing redundant panels, add sandbox lifecycle controls (stop/pause/resume), and add status tooltips for clarity.

**Architecture:** Remove ActivityFeed component from sandbox detail page. Add Convex mutations for stop/pause/resume that update sandbox status. Add control buttons to GoalProgress sidebar and SandboxCard. Add tooltip to status badge on SandboxCard.

**Tech Stack:** Next.js 15, React 19, Convex, Tailwind CSS 4 (custom theme tokens in globals.css)

---

### Task 1: Remove ActivityFeed from Sandbox Detail Page

**Files:**
- Modify: `apps/web/app/sandbox/[id]/page.tsx`

**Step 1: Remove the ActivityFeed import and usage**

In `apps/web/app/sandbox/[id]/page.tsx`, remove the ActivityFeed import line:
```tsx
import { ActivityFeed } from "../../../components/ActivityFeed";
```

And remove the ActivityFeed usage from the JSX (line 56):
```tsx
<ActivityFeed sandboxId={sandboxId} events={recentEvents} payments={recentPayments} />
```

The `recentPayments` destructuring from `data` can stay — other components may use it later.

**Step 2: Verify the page renders**

Run: `cd apps/web && npx next build`
Expected: Build succeeds with no errors about missing components.

Alternatively, check the dev server at `http://localhost:3000/sandbox/<any-id>` — the page should show BrowserStream, AgentThinking, and LogStream only (no Activity Feed section).

**Step 3: Commit**

```bash
git add apps/web/app/sandbox/[id]/page.tsx
git commit -m "refactor: remove ActivityFeed from sandbox detail page"
```

---

### Task 2: Add Convex Mutations for Stop / Pause / Resume

**Files:**
- Modify: `convex/sandboxes.ts`

There is already a generic `updateStatus` mutation. We need dedicated mutations with proper validation so the frontend can call them safely.

**Step 1: Add stop, pause, and resume mutations**

Add these three mutations at the end of `convex/sandboxes.ts` (before the closing of the file, after the `autoSettleExpired` action):

```typescript
export const stop = mutation({
  args: { sandboxId: v.id("sandboxes") },
  handler: async (ctx, args) => {
    const sandbox = await ctx.db.get(args.sandboxId);
    if (!sandbox) throw new Error("Sandbox not found");
    if (sandbox.status !== "active" && sandbox.status !== "paused" && sandbox.status !== "pending") {
      throw new Error(`Cannot stop sandbox with status "${sandbox.status}"`);
    }
    await ctx.db.patch(args.sandboxId, { status: "failed" });
  },
});

export const pause = mutation({
  args: { sandboxId: v.id("sandboxes") },
  handler: async (ctx, args) => {
    const sandbox = await ctx.db.get(args.sandboxId);
    if (!sandbox) throw new Error("Sandbox not found");
    if (sandbox.status !== "active") {
      throw new Error(`Cannot pause sandbox with status "${sandbox.status}"`);
    }
    await ctx.db.patch(args.sandboxId, { status: "paused" });
  },
});

export const resume = mutation({
  args: { sandboxId: v.id("sandboxes") },
  handler: async (ctx, args) => {
    const sandbox = await ctx.db.get(args.sandboxId);
    if (!sandbox) throw new Error("Sandbox not found");
    if (sandbox.status !== "paused") {
      throw new Error(`Cannot resume sandbox with status "${sandbox.status}"`);
    }
    await ctx.db.patch(args.sandboxId, { status: "active" });
  },
});
```

**Step 2: Verify Convex syncs**

If `npx convex dev` is running, it should auto-sync and show:
```
✔ Convex functions ready!
```

If not running: `npx convex dev` and confirm no errors.

**Step 3: Commit**

```bash
git add convex/sandboxes.ts
git commit -m "feat: add stop, pause, resume mutations for sandbox lifecycle"
```

---

### Task 3: Add Lifecycle Control Buttons to GoalProgress Sidebar

**Files:**
- Modify: `apps/web/components/GoalProgress.tsx`

**Step 1: Add useMutation import and control buttons**

Replace the full `GoalProgress.tsx` with the version below. Key changes:
- Import `useMutation` from `convex/react` and `api`
- Add stop/pause/resume buttons below the status badge
- Buttons are conditionally rendered based on current status
- Stop button is red, pause is yellow, resume is green

```tsx
"use client";

import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/api";
import type { Id } from "@/convex/types";

interface GoalProgressProps {
  sandbox: any;
}

const MODEL_LABELS: Record<string, { name: string; color: string }> = {
  "claude-sonnet": { name: "Claude Sonnet", color: "bg-orange-500" },
  "claude-opus": { name: "Claude Opus", color: "bg-orange-600" },
  "gpt-4o": { name: "GPT-4o", color: "bg-emerald-500" },
  "gemini-2-flash": { name: "Gemini Flash", color: "bg-blue-500" },
};

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function GoalProgress({ sandbox }: GoalProgressProps) {
  const [remaining, setRemaining] = useState("");

  const stopSandbox = useMutation(api.sandboxes.stop);
  const pauseSandbox = useMutation(api.sandboxes.pause);
  const resumeSandbox = useMutation(api.sandboxes.resume);

  useEffect(() => {
    if (!sandbox) return;
    const update = () => {
      const left = Math.max(0, sandbox.expiresAt - Date.now()) / 1000;
      setRemaining(formatTime(left));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [sandbox]);

  if (!sandbox) return null;

  const progressPct = Math.min(
    100,
    (sandbox.currentProgress / sandbox.targetValue) * 100
  );
  const modelInfo = MODEL_LABELS[sandbox.model] ?? {
    name: sandbox.model,
    color: "bg-gray-500",
  };

  const statusColors: Record<string, string> = {
    active: "bg-accent-green/15 text-accent-green",
    pending: "bg-accent-yellow/15 text-accent-yellow",
    completed: "bg-accent-blue/15 text-accent-blue",
    failed: "bg-accent-red/15 text-accent-red",
    paused: "bg-text-muted/15 text-text-muted",
  };

  const canStop = sandbox.status === "active" || sandbox.status === "paused" || sandbox.status === "pending";
  const canPause = sandbox.status === "active";
  const canResume = sandbox.status === "paused";

  const handleStop = () => stopSandbox({ sandboxId: sandbox._id as Id<"sandboxes"> });
  const handlePause = () => pauseSandbox({ sandboxId: sandbox._id as Id<"sandboxes"> });
  const handleResume = () => resumeSandbox({ sandboxId: sandbox._id as Id<"sandboxes"> });

  return (
    <div className="rounded-xl border border-border bg-bg-card p-5">
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-sm font-medium text-text-secondary uppercase tracking-wider">
          Goal
        </h3>
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            statusColors[sandbox.status] ?? statusColors.pending
          }`}
        >
          {sandbox.status}
        </span>
      </div>

      <p className="text-base font-medium mb-4 leading-snug">
        {sandbox.goalDescription}
      </p>

      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1.5">
          <span className="text-text-secondary">Progress</span>
          <span className="font-mono font-medium">
            {sandbox.currentProgress.toLocaleString()} /{" "}
            {sandbox.targetValue.toLocaleString()}
          </span>
        </div>
        <div className="h-2.5 bg-bg-tertiary rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-accent-purple to-accent-blue rounded-full transition-all duration-700 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <p className="text-xs text-text-muted mt-1 text-right">
          {progressPct.toFixed(1)}%
        </p>
      </div>

      <div className="space-y-2.5 text-sm">
        <div className="flex justify-between">
          <span className="text-text-secondary">Time Left</span>
          <span className="font-mono">{remaining || "--:--:--"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-secondary">Credits</span>
          <span className="font-mono">
            ${sandbox.creditsRemaining?.toFixed(2) ?? "0.00"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-secondary">Wallet</span>
          <span className="font-mono">
            ${sandbox.walletBalance?.toFixed(2) ?? "0.00"}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-text-secondary">Model</span>
          <span className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${modelInfo.color}`} />
            <span className="text-sm">{modelInfo.name}</span>
          </span>
        </div>
      </div>

      {(canStop || canPause || canResume) && (
        <div className="mt-5 pt-4 border-t border-border flex gap-2">
          {canPause && (
            <button
              onClick={handlePause}
              className="flex-1 px-3 py-2 rounded-lg text-xs font-medium bg-accent-yellow/15 text-accent-yellow hover:bg-accent-yellow/25 transition-colors"
            >
              Pause
            </button>
          )}
          {canResume && (
            <button
              onClick={handleResume}
              className="flex-1 px-3 py-2 rounded-lg text-xs font-medium bg-accent-green/15 text-accent-green hover:bg-accent-green/25 transition-colors"
            >
              Resume
            </button>
          )}
          {canStop && (
            <button
              onClick={handleStop}
              className="flex-1 px-3 py-2 rounded-lg text-xs font-medium bg-accent-red/15 text-accent-red hover:bg-accent-red/25 transition-colors"
            >
              Stop
            </button>
          )}
        </div>
      )}
    </div>
  );
}
```

**Step 2: Verify in browser**

Go to `http://localhost:3000/sandbox/<any-active-sandbox-id>`. The GoalProgress sidebar should now show:
- For `active` sandboxes: Pause + Stop buttons
- For `paused` sandboxes: Resume + Stop buttons
- For `pending` sandboxes: Stop button only
- For `completed`/`failed`: No buttons shown

**Step 3: Commit**

```bash
git add apps/web/components/GoalProgress.tsx
git commit -m "feat: add stop/pause/resume controls to GoalProgress sidebar"
```

---

### Task 4: Add Status Tooltip to SandboxCard

**Files:**
- Modify: `apps/web/components/SandboxCard.tsx`

**Step 1: Add tooltip with status descriptions**

Add a `STATUS_TOOLTIPS` map and a relative/group wrapper around the status badge with an absolutely-positioned tooltip that appears on hover.

Replace the full `SandboxCard.tsx`:

```tsx
"use client";

import Link from "next/link";

interface SandboxCardProps {
  sandbox: {
    _id: string;
    goalDescription: string;
    model: string;
    currentProgress: number;
    targetValue: number;
    status: string;
    creditsRemaining?: number;
    expiresAt?: number;
  };
}

const MODEL_COLORS: Record<string, string> = {
  "claude-sonnet": "bg-orange-500",
  "claude-opus": "bg-orange-600",
  "gpt-4o": "bg-emerald-500",
  "gemini-2-flash": "bg-blue-500",
};

const STATUS_STYLES: Record<string, string> = {
  active: "bg-accent-green/15 text-accent-green",
  pending: "bg-accent-yellow/15 text-accent-yellow",
  completed: "bg-accent-blue/15 text-accent-blue",
  failed: "bg-accent-red/15 text-accent-red",
  paused: "bg-text-muted/15 text-text-muted",
};

const STATUS_TOOLTIPS: Record<string, string> = {
  active: "Agent is running and executing tasks",
  pending: "Sandbox is queued and waiting to start",
  completed: "Agent finished — goal was achieved",
  failed: "Agent stopped — goal was not achieved",
  paused: "Agent execution is paused",
};

export function SandboxCard({ sandbox }: SandboxCardProps) {
  const progressPct = Math.min(
    100,
    (sandbox.currentProgress / sandbox.targetValue) * 100
  );

  const modelColor = MODEL_COLORS[sandbox.model] ?? "bg-gray-500";
  const statusStyle = STATUS_STYLES[sandbox.status] ?? STATUS_STYLES.pending;

  return (
    <Link href={`/sandbox/${sandbox._id}`}>
      <div className="group rounded-xl border border-border bg-bg-card p-5 hover:bg-bg-card-hover hover:border-border-bright transition-all cursor-pointer">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${modelColor}`} />
            <span className="text-xs text-text-muted font-medium uppercase">
              {sandbox.model}
            </span>
          </div>
          <div className="relative group/tooltip">
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusStyle}`}
            >
              {sandbox.status}
            </span>
            <div className="absolute right-0 top-full mt-1.5 px-2.5 py-1.5 rounded-lg bg-bg-tertiary border border-border text-xs text-text-secondary whitespace-nowrap opacity-0 pointer-events-none group-hover/tooltip:opacity-100 transition-opacity z-10">
              {STATUS_TOOLTIPS[sandbox.status] ?? sandbox.status}
            </div>
          </div>
        </div>

        <h3 className="text-sm font-medium mb-4 leading-snug line-clamp-2 group-hover:text-white transition-colors">
          {sandbox.goalDescription}
        </h3>

        <div className="mb-2">
          <div className="h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-accent-purple to-accent-blue rounded-full transition-all duration-700"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-text-muted">
          <span>
            {sandbox.currentProgress.toLocaleString()} /{" "}
            {sandbox.targetValue.toLocaleString()}
          </span>
          <span>{progressPct.toFixed(0)}%</span>
        </div>
      </div>
    </Link>
  );
}
```

**Step 2: Verify tooltip in browser**

Go to `http://localhost:3000`. Hover over any status badge (e.g. the green "active" pill) on a sandbox card. A tooltip should appear below the badge with the description text.

**Step 3: Commit**

```bash
git add apps/web/components/SandboxCard.tsx
git commit -m "feat: add status tooltip to SandboxCard for clarity"
```

---

### Task 5: Add Quick-Action Buttons to SandboxCard on Home Grid

**Files:**
- Modify: `apps/web/components/SandboxCard.tsx`

**Step 1: Add stop/pause icon buttons**

We need inline icon buttons on the card that stop event propagation (so clicking them doesn't navigate to the detail page). Add them between the progress bar and the stats row.

Update `SandboxCard.tsx` — add these imports at the top:

```tsx
import { useMutation } from "convex/react";
import { api } from "@/convex/api";
import type { Id } from "@/convex/types";
```

Then add mutation hooks and button handlers inside the component function body (before the return):

```tsx
const stopSandbox = useMutation(api.sandboxes.stop);
const pauseSandbox = useMutation(api.sandboxes.pause);
const resumeSandbox = useMutation(api.sandboxes.resume);

const canStop = sandbox.status === "active" || sandbox.status === "paused" || sandbox.status === "pending";
const canPause = sandbox.status === "active";
const canResume = sandbox.status === "paused";
```

Then add a button row just before the closing `</div>` of the card (after the progress stats row):

```tsx
{(canStop || canPause || canResume) && (
  <div className="flex gap-2 mt-3 pt-3 border-t border-border/50">
    {canPause && (
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          pauseSandbox({ sandboxId: sandbox._id as Id<"sandboxes"> });
        }}
        className="flex-1 px-2 py-1.5 rounded-lg text-[11px] font-medium bg-accent-yellow/10 text-accent-yellow hover:bg-accent-yellow/20 transition-colors"
      >
        Pause
      </button>
    )}
    {canResume && (
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          resumeSandbox({ sandboxId: sandbox._id as Id<"sandboxes"> });
        }}
        className="flex-1 px-2 py-1.5 rounded-lg text-[11px] font-medium bg-accent-green/10 text-accent-green hover:bg-accent-green/20 transition-colors"
      >
        Resume
      </button>
    )}
    {canStop && (
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          stopSandbox({ sandboxId: sandbox._id as Id<"sandboxes"> });
        }}
        className="flex-1 px-2 py-1.5 rounded-lg text-[11px] font-medium bg-accent-red/10 text-accent-red hover:bg-accent-red/20 transition-colors"
      >
        Stop
      </button>
    )}
  </div>
)}
```

**Step 2: Verify in browser**

Go to `http://localhost:3000`. Active sandbox cards should show Pause + Stop buttons at the bottom. Clicking Pause should change status to "paused" and swap to Resume + Stop. Clicking Stop should change status to "failed" and remove the buttons. Clicking the card itself (not a button) should still navigate to the detail page.

**Step 3: Commit**

```bash
git add apps/web/components/SandboxCard.tsx
git commit -m "feat: add quick stop/pause/resume actions to SandboxCard"
```

---

### Task 6: Final Verification

**Step 1: Run build**

```bash
cd apps/web && npx next build
```

Expected: Build succeeds with no TypeScript or import errors.

**Step 2: Manual smoke test**

1. Home page (`/`): Cards show status tooltips on hover, action buttons work
2. Detail page (`/sandbox/<id>`): Only BrowserStream + AgentThinking + LogStream in left column (no ActivityFeed)
3. GoalProgress sidebar: Stop/Pause/Resume buttons render correctly based on status
4. Click Stop on an active sandbox → status changes to "failed", buttons disappear
5. Click Pause → status changes to "paused", button swaps to Resume + Stop

**Step 3: Final commit if any fixes needed, then push**

```bash
git push origin main
```
