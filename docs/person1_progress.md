# Progress — Agent Runtime + Frontend + Orchestration

**Owner:** Sissi (solo — all tracks)
**Directories:** `agent/`, `apps/web/`, `orchestrator/`, `convex/`, `scripts/`
**Languages:** Python (agent runtime + orchestrator), TypeScript (frontend + Convex)

---

## Summary

Full pipeline is implemented end-to-end: agent runtime with native tool use APIs (Anthropic, OpenAI, Gemini), Browser Use high-level task API with live_url streaming, Daytona sandbox isolation, Convex real-time backend, and a dark-themed Next.js frontend. All sponsor tools are integrated.

---

## What's Done

### Agent Runtime (`agent/`)

| File | Status | What Changed |
|------|--------|--------------|
| `agent/tools/browser.py` | **Rewritten (v2)** | Uses Browser Use high-level task API. Agent describes tasks in natural language. Sessions expose `live_url` + `share_url` for real-time streaming. |
| `agent/tools/schemas.py` | **New** | Shared tool definitions for native tool use. Defines `browser_task`, `send_email`, `make_payment`, `finish_reasoning` with per-provider converters. |
| `agent/tools/email.py` | **Complete** | Integrated `agentmail` SDK (`AsyncAgentMail`). |
| `agent/tools/payments.py` | **Complete** | Integrated Locus/Paylocus via `httpx` REST client. |
| `agent/prompts.py` | **New** | Shared system prompt and `build_user_prompt()` extracted from all 3 providers. |
| `agent/memory.py` | **Complete** | Integrated `supermemory` SDK with semantic search. |
| `agent/goal_verifier.py` | **Complete** | All 4 goal types implemented. |
| `agent/model_router.py` | **Rewritten (v2)** | Added `get_fallback_chain()` for automatic provider failover on rate limits. |
| `agent/providers/anthropic_provider.py` | **Rewritten (v2)** | Uses native Anthropic `tools` parameter — no JSON parsing needed. |
| `agent/providers/openai_provider.py` | **Rewritten (v2)** | Uses native OpenAI `tools` parameter with `tool_choice="required"`. |
| `agent/providers/gemini_provider.py` | **Rewritten (v2)** | Uses native Gemini `tools` parameter with `FunctionDeclaration`. |
| `agent/agent_runner.py` | **Rewritten (v2)** | Fallback chain retry loop, live_url push to Convex, loop detection (3+ identical actions), try/except around all action execution. |
| `agent/requirements.txt` | **Updated** | Added `daytona`, `python-dotenv`. |

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

### Orchestrator (`orchestrator/`)

| File | Status | What Changed |
|------|--------|--------------|
| `orchestrator/sandbox_manager.py` | **Rewritten (v2)** | Full Daytona SDK integration: creates sandbox, uploads all agent files, installs deps, starts agent in background. Includes `get_agent_logs()`, `is_agent_running()`, `destroy_sandbox()`. |
| `orchestrator/launch_sandbox.py` | **New** | End-to-end CLI: creates Convex record, Daytona sandbox, uploads agent code, starts agent. Single command to launch a demo. |
| `orchestrator/event_bridge.py` | **Updated** | Added `update_live_url()` for pushing Browser Use live_url to Convex. |
| `orchestrator/requirements.txt` | **New** | `httpx`, `daytona`, `python-dotenv`. |

### Convex Backend (`convex/`)

| File | Status | What Changed |
|------|--------|--------------|
| `convex/schema.ts` | **Updated** | Added `liveUrl` and `shareUrl` (optional strings) to sandboxes table. |
| `convex/sandboxes.ts` | **Updated** | Added `updateLiveUrl` mutation for pushing live browser stream URLs. |

### Scripts + Docs

| File | Status | What Changed |
|------|--------|--------------|
| `scripts/seed_convex.py` | **New** | Seeds Convex with test user and demo sandboxes (3 models competing on same goal). |
| `docs/research_notes.md` | **New** | Documents architectural patterns from AutoGPT, SuperAGI, Quoroom, Trading repo, Claude Agent SDK. |

---

## What's NOT Done

| Item | Notes |
|------|-------|
| Convex deployment | Need to run `npx convex dev` to deploy schema + functions. |
| Convex `_generated/` types | Frontend uses `anyApi` stubs until codegen runs. |
| User auth / accounts | Betting and prompts use placeholder user IDs. |
| Locus/Paylocus full integration | Deferred — no API key access yet. Agent logs payment events but uses mock wallet. |

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
DAYTONA_API_KEY=           # Daytona — daytona.io
DAYTONA_API_URL=           # https://app.daytona.io/api
CONVEX_URL=                # Convex cloud URL
CONVEX_DEPLOY_KEY=         # Convex deploy key
```

### Frontend (`apps/web/.env.local`)

```
NEXT_PUBLIC_CONVEX_URL=    # From Iana after Convex deployment
```

---

## How to Test

### Full end-to-end launch (recommended)

```bash
# 1. Install deps
pip install -r agent/requirements.txt
pip install -r orchestrator/requirements.txt

# 2. Launch a sandbox (creates Convex record + Daytona sandbox + starts agent)
python orchestrator/launch_sandbox.py \
    --goal "Get 100 followers on X in 2 hours" \
    --goal-type follower_count \
    --target 100 \
    --model claude-sonnet \
    --time-limit 7200
```

### Agent standalone (no Convex/Daytona)

```bash
cd agent
pip install -r requirements.txt
python agent_runner.py --config test_config.json
```

Without `CONVEX_URL` set, the agent falls back to console logging.

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

### Seed Convex with demo data

```bash
python scripts/seed_convex.py
```

### Frontend

```bash
cd apps/web
npm install
npm run dev
```

---

## Architecture Notes for Team

### Full pipeline flow

```
launch_sandbox.py (CLI)
  ├─ Convex: sandboxes:create
  ├─ Daytona: create sandbox + upload agent code + install deps
  └─ Daytona: start agent_runner.py in background

agent_runner.py (inside Daytona sandbox)
  ├─ Browser Use: create session → get live_url
  ├─ EventBridge: update_live_url → Convex sandboxes table
  └─ Agent loop:
       ├─ LLM: messages.create with native tools → tool_use block
       ├─ Execute tool (browser_task / send_email / make_payment)
       ├─ EventBridge: push_event → Convex agentEvents table
       └─ Frontend: useQuery → BrowserStream (iframe) / ActivityFeed re-render
```

### Event types pushed by agent

| `eventType` | When | Payload shape |
|-------------|------|---------------|
| `"reasoning"` | Every agent step | `{ reasoning, action, action_type, result, progress, credits_used }` |
| `"email"` | Agent sends email | `{ type: "email", direction: "sent", to, subject }` |
| `"payment"` | Agent makes payment | `{ type: "payment", amount, description, recipient }` |

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
