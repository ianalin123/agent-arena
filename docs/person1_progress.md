# Person 1 Progress — Agent Runtime (Track A) + Frontend

**Owner:** Sissi
**Directories:** `agent/`, `apps/web/`
**Languages:** Python (agent runtime), TypeScript (frontend)

---

## Summary

All Track A agent integrations and the full frontend are implemented. The agent runtime can run end-to-end with real SDK calls (Browser Use, AgentMail, Paylocus, Supermemory) and push events to Convex via the event bridge. The frontend has Convex real-time subscriptions, a dark-themed UI, and all interactive components wired up.

---

## What's Done

### Agent Runtime (`agent/`)

| File | Status | What Changed |
|------|--------|--------------|
| `agent/tools/browser.py` | **Complete** | Integrated `browser-use-sdk` (`AsyncBrowserUse`). Creates persistent cloud sessions, runs tasks for navigate/click/type/scroll, captures screenshots as base64 PNG via task steps. |
| `agent/tools/email.py` | **Complete** | Integrated `agentmail` SDK (`AsyncAgentMail`). Checks inbox threads, sends emails with HTML+text, counts positive replies using keyword signal detection. |
| `agent/tools/payments.py` | **Complete** | Integrated Locus/Paylocus via `httpx` REST client (no published Python SDK). Gets wallet balance, executes USDC transfers, fetches transaction history. Includes cached balance fallback. |
| `agent/memory.py` | **Complete** | Integrated `supermemory` SDK. Stores learnings with `container_tag` (sandbox ID) and metadata. Searches with hybrid mode (memories + document chunks). Gracefully degrades if API key is missing. |
| `agent/goal_verifier.py` | **Complete** | Implemented all 4 goal types: follower count (Twitter via social API + Nitter scraping fallback), revenue (via Paylocus transaction history), view count (HTML scraping), positive email replies (via AgentMail). |
| `agent/agent_runner.py` | **Complete** | Rewired the full agent loop: lazily connects to EventBridge when `CONVEX_URL`/`CONVEX_DEPLOY_KEY` are set (falls back to console logging). Pushes typed events (`reasoning`, `email`, `payment`). Fetches pending user prompts and stores them in Supermemory. Laminar `@observe` tracing on the reasoning step. Proper cleanup of browser/payment resources on exit. |
| `agent/requirements.txt` | **Updated** | Changed `browser-use` → `browser-use-sdk`, `laminar` → `lmnr`, added `Pillow`. |

### Frontend (`apps/web/`)

| File | Status | What Changed |
|------|--------|--------------|
| `apps/web/tsconfig.json` | **Created** | Standard Next.js 15 config with `@/*` path alias. |
| `apps/web/next.config.ts` | **Created** | Transpiles convex package. |
| `apps/web/postcss.config.mjs` | **Created** | Tailwind CSS 4 via `@tailwindcss/postcss`. |
| `apps/web/app/globals.css` | **Created** | Custom dark theme with 18 CSS variables in `@theme` block (bg, text, accent, border colors). |
| `apps/web/convex/api.ts` | **Created** | Local API reference using `anyApi`. Replace with generated types once `npx convex dev` runs. |
| `apps/web/convex/types.ts` | **Created** | Local `Id<T>` type stub. Replace with generated types once deployed. |
| `apps/web/package.json` | **Updated** | Added `lucide-react`, `@tailwindcss/postcss`. Removed `convex-helpers`. |
| `apps/web/app/layout.tsx` | **Complete** | `ConvexProvider` wrapping the app. Sticky nav bar with logo, dark theme. |
| `apps/web/app/page.tsx` | **Complete** | Dashboard subscribes to `sandboxes.list` query. Grid of `SandboxCard` components. Empty state UI. `ModelComparison` section when sandboxes exist. |
| `apps/web/app/sandbox/[id]/page.tsx` | **Complete** | Detail page subscribes to `sandboxes.get`. Passes real-time data (sandbox, pool, events, payments) to all child components. Loading spinner. Back link. |
| `apps/web/components/BrowserStream.tsx` | **Complete** | Parses screenshot events from Convex, renders base64 `<img>` with smooth transitions. Placeholder when no stream. |
| `apps/web/components/AgentThinking.tsx` | **Complete** | Filters reasoning events, shows step-by-step trace with action type badges (browser/email/payment) and cost per step. |
| `apps/web/components/ActivityFeed.tsx` | **Complete** | Renders all event types with icons and formatted descriptions. Handles email, payment, reasoning, browser_action, error events. Timestamps. |
| `apps/web/components/GoalProgress.tsx` | **Complete** | Live countdown timer (updates every second). Gradient progress bar. Shows credits, wallet balance, model with color indicator. Status badge. |
| `apps/web/components/BettingPanel.tsx` | **Complete** | Live odds display (YES/NO with percentages and multipliers). Position selection. Bet amount input. Calls `betting.placeBet` mutation. Closed state when betting locked. |
| `apps/web/components/PromptInput.tsx` | **Complete** | Text input with Enter key support. Calls `prompts.submit` mutation. Success feedback ("Sent!") with auto-reset. |
| `apps/web/components/CreditInjection.tsx` | **Created** | Quick-amount buttons ($5/$10/$25/$50). Calls `credits.inject` mutation. Success feedback. |
| `apps/web/components/SandboxCard.tsx` | **Complete** | Card with model color indicator, status badge, gradient progress bar. Links to sandbox detail page. Hover effects. |
| `apps/web/components/ModelComparison.tsx` | **Created** | Aggregates sandbox stats per model. Shows session count, success rate, average progress, active count. Per-model progress bars. Only renders when multiple models are present. |

---

## What's NOT Done (and who owns it)

| Item | Owner | Notes |
|------|-------|-------|
| Convex deployment + URL | **Iana (Track B)** | Frontend needs `NEXT_PUBLIC_CONVEX_URL` to connect. |
| Event bridge HTTP calls | **Iana (Track B)** | ✅ Done as of latest pull from main. |
| Daytona sandbox manager | **Iana (Track B)** | Needed for sandbox lifecycle. |
| User auth / accounts | **Iana (Track B)** | Betting and prompts currently use placeholder user IDs. |
| Convex `_generated/` types | **Iana (Track B)** | Need `npx convex dev` to generate. Frontend uses `anyApi` stubs until then. |

---

## Environment Variables

### Agent (`agent/.env`)

```
ANTHROPIC_API_KEY=         # Claude — console.anthropic.com
OPENAI_API_KEY=            # GPT-4o — platform.openai.com
GOOGLE_API_KEY=            # Gemini — aistudio.google.com
BROWSER_USE_API_KEY=       # Browser Use — cloud.browser-use.com
AGENTMAIL_API_KEY=         # AgentMail — agentmail.to
LOCUS_API_KEY=             # Paylocus/Locus — dashboard.paywithlocus.com
SUPERMEMORY_API_KEY=       # Supermemory — supermemory.ai
LMNR_PROJECT_API_KEY=      # Laminar — laminar.sh
CONVEX_URL=                # From Iana after Convex deployment
CONVEX_DEPLOY_KEY=         # From Iana after Convex deployment
```

### Frontend (`apps/web/.env.local`)

```
NEXT_PUBLIC_CONVEX_URL=    # From Iana after Convex deployment
```

---

## How to Test

### Agent (standalone, no Convex needed)

```bash
cd agent
pip install -r requirements.txt
python agent_runner.py --config test_config.json
```

Without `CONVEX_URL` set, the agent falls back to console logging for all events. You'll see JSON output of each reasoning step, action, and result.

Sample `test_config.json`:
```json
{
  "sandbox_id": "test-001",
  "goal": "Navigate to X.com and post a tweet about AI agents",
  "goal_type": "follower_count",
  "target_value": 100,
  "model": "claude-sonnet",
  "time_limit": 3600,
  "initial_credits": 10,
  "agentmail_inbox_id": "",
  "paylocus_wallet_id": ""
}
```

### Frontend (needs Convex URL from Iana)

```bash
cd apps/web
npm install
npm run dev
```

Without Convex, the page will show a loading state. Once `NEXT_PUBLIC_CONVEX_URL` is set and Convex is deployed, the dashboard will show live sandbox data.

---

## Architecture Notes for Team

### Event flow: Agent → Convex → Frontend

```
agent_runner.py
  └─ _push_event(sandbox_id, payload, event_type)
       └─ EventBridge.push_event()   [orchestrator/event_bridge.py]
            └─ POST {CONVEX_URL}/api/mutation
                 └─ events:push mutation   [convex/events.ts]
                      └─ useQuery(api.sandboxes.get)   [frontend subscribes]
                           └─ BrowserStream / AgentThinking / ActivityFeed re-render
```

### Event types pushed by agent

| `eventType` | When | Payload shape |
|-------------|------|---------------|
| `"reasoning"` | Every agent step | `{ reasoning, action, action_type, result, progress, credits_used }` |
| `"email"` | Agent sends email | `{ type: "email", direction: "sent", to, subject }` |
| `"payment"` | Agent makes payment | `{ type: "payment", amount, description, recipient }` |
| `"screenshot"` | Screenshot streamer | `{ image: "<base64 PNG>" }` |

### Frontend Convex subscriptions

| Page/Component | Query | Data used |
|----------------|-------|-----------|
| Dashboard (`page.tsx`) | `sandboxes.list` | All sandbox cards |
| Sandbox detail | `sandboxes.get` | sandbox + pool + recentEvents + recentPayments |
| BettingPanel | via `sandboxes.get` → `pool` | yesTotal, noTotal, bettingOpen |
| BettingPanel | `betting.placeBet` (mutation) | — |
| PromptInput | `prompts.submit` (mutation) | — |
| CreditInjection | `credits.inject` (mutation) | — |

### Frontend type stubs

`apps/web/convex/api.ts` and `apps/web/convex/types.ts` are temporary stubs using `anyApi` and `string` types. Once Iana runs `npx convex dev` and the `convex/_generated/` directory is properly generated, replace:

```typescript
// apps/web/convex/api.ts — replace with:
export { api } from "../../../convex/_generated/api";

// apps/web/convex/types.ts — replace with:
export type { Id } from "../../../convex/_generated/dataModel";
```

And update `tsconfig.json` to include `../../convex/_generated/` in its scope.
