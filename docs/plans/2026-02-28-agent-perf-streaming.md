# Agent Performance & Streaming Improvements

> **For Claude:** Use `skills/collaboration/executing-plans` to implement this plan task-by-task.

**Goal:** Reduce perceived latency in the agent loop by parallelizing I/O, emitting events more frequently so the UI stays alive, and fixing the BrowserStream fallback so users always see something.

**Architecture:** Three independent changes — (1) Python agent loop parallelization, (2) Python agent loop event emission, (3) TypeScript BrowserStream component fallback. All three can be implemented in parallel since they touch different files with no dependencies.

**Tech Stack:** Python 3.10+ (asyncio), TypeScript/React (Next.js 15)

---

### Task 1: Parallelize Agent Loop I/O with asyncio.gather

**Files:**
- Modify: `agent/agent_runner.py` (lines 91-100 of the while loop)

**Step 1: Replace sequential calls with asyncio.gather**

In `agent/agent_runner.py`, find the block inside the `while` loop (lines 92-100):

```python
            emails = await mail.check_inbox()
            balance = await payments.get_balance()

            past_context = memory.search(
                query=f"strategies for {sandbox_config.get('goal_type', 'general')}",
                sandbox_id=sandbox_id,
            )

            user_prompts = await _fetch_pending_prompts(sandbox_id)
```

Replace it with:

```python
            emails_task = mail.check_inbox()
            balance_task = payments.get_balance()
            prompts_task = _fetch_pending_prompts(sandbox_id)

            emails, balance, user_prompts = await asyncio.gather(
                emails_task, balance_task, prompts_task,
                return_exceptions=True,
            )

            if isinstance(emails, BaseException):
                logger.warning("check_inbox failed: %s", emails)
                emails = []
            if isinstance(balance, BaseException):
                logger.warning("get_balance failed: %s", balance)
                balance = 0.0
            if isinstance(user_prompts, BaseException):
                logger.warning("fetch_prompts failed: %s", user_prompts)
                user_prompts = []

            past_context = memory.search(
                query=f"strategies for {sandbox_config.get('goal_type', 'general')}",
                sandbox_id=sandbox_id,
            )
```

Note: `memory.search()` stays sequential because `Supermemory.search.memories()` is synchronous (not async). We'd need `asyncio.to_thread()` to parallelize it, but that's a separate concern. The three async calls (mail, balance, prompts) now run concurrently.

**Step 2: Verify syntax**

```bash
cd /Users/ianalin/Desktop/agent-arena && python3 -c "import ast; ast.parse(open('agent/agent_runner.py').read()); print('OK')"
```

Expected: `OK`

**Step 3: Commit**

```bash
git add agent/agent_runner.py
git commit -m "perf: parallelize agent loop I/O with asyncio.gather"
```

---

### Task 2: Emit Events Before Slow Operations

**Files:**
- Modify: `agent/agent_runner.py` (inside the while loop, around lines 108-116)

**Step 1: Add pre-action events**

Find the block after the `stuck_hint` detection and before the LLM call (around lines 108-116):

```python
            stuck_hint = _detect_loop(recent_actions)
            screenshot = ""

            decision = await _think_step_with_fallback(
                fallback_chain, goal, screenshot, emails, balance,
                past_context, user_prompts, recent_actions, stuck_hint,
            )

            result = await _execute_action(decision, browser, mail, payments, sandbox_id)
```

Replace it with:

```python
            stuck_hint = _detect_loop(recent_actions)
            screenshot = ""

            await _push_event(sandbox_id, {
                "step": len(recent_actions) + 1,
                "status": "thinking",
            }, event_type="status")

            decision = await _think_step_with_fallback(
                fallback_chain, goal, screenshot, emails, balance,
                past_context, user_prompts, recent_actions, stuck_hint,
            )

            await _push_event(sandbox_id, {
                "step": len(recent_actions) + 1,
                "status": "executing",
                "action_type": decision.action_type,
                "action_summary": str(decision.action.get("task", decision.action))[:120] if isinstance(decision.action, dict) else str(decision.action)[:120],
            }, event_type="status")

            result = await _execute_action(decision, browser, mail, payments, sandbox_id)
```

This emits two new `status` events per iteration: one when the agent starts thinking (before the LLM call) and one when it starts executing (before the browser task). The UI will show activity during the long waits.

**Step 2: Verify syntax**

```bash
cd /Users/ianalin/Desktop/agent-arena && python3 -c "import ast; ast.parse(open('agent/agent_runner.py').read()); print('OK')"
```

Expected: `OK`

**Step 3: Commit**

```bash
git add agent/agent_runner.py
git commit -m "feat: emit status events before LLM call and action execution"
```

---

### Task 3: Fix BrowserStream Fallback When Iframe is Blank

**Files:**
- Modify: `apps/web/components/BrowserStream.tsx`

The current problem: when `streamUrl` is set, the component renders an iframe and completely skips screenshot fallback. If the iframe content fails to load (stale session, CORS, timeout), the user sees a blank browser forever.

**Step 1: Add iframe load detection with screenshot fallback**

Replace the entire `BrowserStream.tsx` with:

```tsx
"use client";

import { useMemo, useState, useCallback } from "react";

interface BrowserStreamProps {
  sandboxId: string;
  events?: any[];
  liveUrl?: string | null;
  shareUrl?: string | null;
}

export function BrowserStream({ sandboxId, events = [], liveUrl, shareUrl }: BrowserStreamProps) {
  const streamUrl = shareUrl || liveUrl;
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [iframeError, setIframeError] = useState(false);

  const handleIframeLoad = useCallback(() => {
    setIframeLoaded(true);
  }, []);

  const handleIframeError = useCallback(() => {
    setIframeError(true);
  }, []);

  const latestScreenshot = useMemo(() => {
    const screenshotEvents = events.filter(
      (e: any) => e.eventType === "screenshot"
    );
    if (screenshotEvents.length === 0) return null;

    const latest = screenshotEvents[0];
    try {
      const payload = JSON.parse(latest.payload);
      return payload.image || null;
    } catch {
      return null;
    }
  }, [events]);

  const showIframe = streamUrl && !iframeError;
  const showScreenshot = !showIframe && latestScreenshot;
  const showPlaceholder = !showIframe && !showScreenshot;

  const isLive = streamUrl && iframeLoaded && !iframeError;

  return (
    <div className="rounded-xl border border-border bg-bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${isLive ? "bg-accent-green" : latestScreenshot ? "bg-yellow-500" : "bg-text-muted"} animate-pulse`} />
          <h3 className="text-sm font-medium">Live Browser Stream</h3>
        </div>
        <span className="text-xs text-text-muted">
          {isLive ? "Live via Browser Use" : latestScreenshot ? "Screenshots" : "Connecting…"}
        </span>
      </div>

      <div className="aspect-video bg-bg-primary relative flex items-center justify-center">
        {showIframe && (
          <iframe
            src={streamUrl}
            className="w-full h-full border-0"
            allow="autoplay"
            title="Agent browser live stream"
            onLoad={handleIframeLoad}
            onError={handleIframeError}
          />
        )}
        {showScreenshot && (
          <img
            src={`data:image/png;base64,${latestScreenshot}`}
            alt="Agent browser view"
            className="w-full h-full object-contain transition-opacity duration-300"
          />
        )}
        {showPlaceholder && (
          <div className="text-center p-8">
            <div className="w-16 h-16 rounded-full bg-bg-tertiary mx-auto mb-3 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-text-muted"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <p className="text-text-secondary text-sm">
              Waiting for browser stream...
            </p>
            <p className="text-text-muted text-xs mt-1">
              The agent is initializing its browser session
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
```

Key changes:
- Tracks `iframeLoaded` and `iframeError` state
- If iframe errors, falls back to screenshots automatically
- Always parses screenshots from events (removed the `if (streamUrl) return null` guard)
- Status indicator reflects actual state: green = live iframe, yellow = screenshots, gray = connecting

**Step 2: Verify build**

```bash
cd /Users/ianalin/Desktop/agent-arena/apps/web && npx next build
```

Expected: Build succeeds.

**Step 3: Commit**

```bash
git add apps/web/components/BrowserStream.tsx
git commit -m "fix: BrowserStream falls back to screenshots when iframe fails"
```

---

### Task 4: Final Verification

**Step 1: Verify Python syntax**

```bash
cd /Users/ianalin/Desktop/agent-arena && python3 -c "import ast; ast.parse(open('agent/agent_runner.py').read()); print('OK')"
```

**Step 2: Verify Next.js build**

```bash
cd /Users/ianalin/Desktop/agent-arena/apps/web && npx next build
```

**Step 3: Push**

```bash
git push origin main
```
