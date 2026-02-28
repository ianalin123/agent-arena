# Agent Arena — Work Split

## Team

| Person | Track | Focus | Primary Languages |
|--------|-------|-------|-------------------|
| **Max** | Frontend | Next.js on Vercel | TypeScript, React |
| **Sissi** | Track A | Agent Runtime (`agent/`) | Python |
| **Iana** | Track B | Convex Platform (`convex/`, `orchestrator/`) | TypeScript, Python |

Max has full repo access and will mock up the frontend against whatever backend data is available. Sissi and Iana split the backend into two independent tracks.

### Detailed Plans

- **[Person 1 Plan — Sissi (Agent Runtime)](plan_person1_agent_runtime.md)**
- **[Person 2 Plan — Iana (Convex Platform)](plan_person2_convex_platform.md)**

---

## The Natural Split: Agent Runtime vs. Platform Backend

The architecture has a clean seam between two layers:

- **Track A — Agent Runtime** (`agent/` + parts of `orchestrator/`): Python code that runs inside Daytona sandboxes. Deals with LLMs, Browser Use, AgentMail, Paylocus, Supermemory, Laminar.
- **Track B — Convex Platform** (`convex/` + parts of `orchestrator/`): TypeScript. Reactive database, betting engine, credit management, prompt queue, event stream, user accounts.

These two tracks communicate through a narrow, well-defined contract (see below). Once the contract is agreed on, both people can work independently for hours at a time.

---

## The Contract (agree on this first, ~30 minutes)

Before splitting up, both people sit together and lock down the exact signatures for the bridge between agent and Convex. These are the **only** shared touch points:

### Agent → Convex (agent pushes data out)

```
pushAgentEvent(sandboxId, eventType, payload)
updateProgress(sandboxId, progress, timestamp)
completeSandbox(sandboxId, outcome)
```

### Convex → Agent (agent pulls data in)

```
fetchPendingPrompts(sandboxId) → PromptInjection[]
getSandboxConfig(sandboxId) → SandboxConfig
```

### Also agree on:

- The `SandboxConfig` shape (goal, model, credentials, wallet ID, inbox ID, time limit)
- The `eventType` enum values: `"reasoning"`, `"browser_action"`, `"email"`, `"payment"`, `"screenshot"`, `"error"`, `"progress"`
- The `payload` JSON structure for each event type

Once this is locked, go heads-down on respective tracks.

---

## Phase-by-Phase Breakdown

### Phase 1: Core Loop (Hours 0–8)

#### Track A — Agent Runtime

1. `model_router.py` — Anthropic provider first, standardized `Decision` interface
2. `agent/tools/browser.py` — Browser Use client wrapper
3. `agent_runner.py` — basic observe → think → act loop (no email/payments yet)
4. Test the loop locally: agent opens browser, takes screenshots, reasons, acts

#### Track B — Convex Platform

1. `convex/schema.ts` — full data model from the technical plan
2. `convex/sandboxes.ts` — `createSandbox`, `getSandbox`, `updateProgress` mutations/queries
3. `convex/events.ts` — `pushAgentEvent` mutation + query for recent events
4. `orchestrator/sandbox_manager.py` — Daytona create/destroy + upload agent code
5. `orchestrator/event_bridge.py` — thin client the agent uses to call Convex mutations

#### Why this works without conflicts

- Track A works entirely in `agent/` — Python files, LLM SDKs, Browser Use API
- Track B works in `convex/` (TypeScript) and `orchestrator/` (Python, but only the Daytona + Convex client code)
- Track A can **mock** the Convex calls (print to console) until the bridge is ready
- Track B can **test Convex mutations** from the dashboard or a script without needing the real agent

#### Integration point (end of Phase 1)

Track B hands Track A the `event_bridge.py` client. Track A replaces their mock calls. Agent now pushes real events into Convex. Max (frontend) can subscribe to real data.

---

### Phase 2: Platform Layer (Hours 8–16)

#### Track A — Agent Runtime

1. `agent/tools/email.py` — AgentMail integration (create inbox, send, check)
2. `agent/tools/payments.py` — Paylocus integration (wallet, transact, balance)
3. `agent/goal_verifier.py` — polling loop for goal progress
4. OpenAI + Gemini providers in `agent/providers/`
5. Wire email/payment events into `pushAgentEvent` calls
6. `agent/memory.py` — Supermemory store/retrieve

#### Track B — Convex Platform

1. `convex/betting.ts` — `placeBet`, `settleSandbox`, parimutuel math
2. `convex/credits.ts` — credit injection, balance tracking
3. `convex/prompts.ts` — prompt injection queue (submit, fetch pending, acknowledge)
4. Reactive odds calculation in `bettingPools`
5. Multi-sandbox support — list active sandboxes query, sandbox cards
6. User auth + play-money balances

#### Why this works without conflicts

- Track A adds new tool integrations (AgentMail, Paylocus, Supermemory) — all in `agent/tools/` and `agent/providers/`. These push events through the same `pushAgentEvent` contract.
- Track B builds user-facing platform features (betting, credits, prompts) — entirely in `convex/`. New tables and mutations that don't touch agent code.
- The goal verifier (Track A) calls `updateProgress` and `completeSandbox` — mutations Track B already built in Phase 1.

#### Integration point (end of Phase 2)

Track A's agent now sends email, payment, and memory events. Track B's Convex layer now has betting and credits. Max hooks the betting panel and activity feed into real Convex queries.

---

### Phase 3: Polish + Differentiators (Hours 16–24)

#### Track A — Agent Runtime

1. Laminar tracing — wrap agent steps with `@observe`
2. Supermemory deep integration — agent visibly adapts strategy
3. Prompt incorporation — agent reads user prompts and references them in reasoning
4. Model hot-swap on rate limit
5. Error recovery / failure loop detection

#### Track B — Convex Platform

1. Dynamic odds — odds shift based on progress + time
2. Betting lock logic — close at 80% time or 90% progress
3. Settlement edge cases — ties, timeouts, refunds
4. Model comparison query — aggregate stats across sandboxes
5. HUD.ai integration (stretch) — log completed sessions

---

## Ownership Map

| Directory / Area | Owner | Language |
|---|---|---|
| `agent/agent_runner.py` | Track A | Python |
| `agent/model_router.py` | Track A | Python |
| `agent/providers/*` | Track A | Python |
| `agent/tools/*` (browser, email, payments) | Track A | Python |
| `agent/goal_verifier.py` | Track A | Python |
| `agent/memory.py` | Track A | Python |
| `convex/schema.ts` | Track B | TypeScript |
| `convex/sandboxes.ts` | Track B | TypeScript |
| `convex/betting.ts` | Track B | TypeScript |
| `convex/credits.ts` | Track B | TypeScript |
| `convex/prompts.ts` | Track B | TypeScript |
| `convex/events.ts` | Track B | TypeScript |
| `orchestrator/sandbox_manager.py` | Track B | Python |
| `orchestrator/event_bridge.py` | **Shared** (agree on interface, Track B implements) | Python |
| `orchestrator/screenshot_streamer.py` | Track B | Python |
| `apps/web/*` | Max | TypeScript |

The **only shared file** is `event_bridge.py` — a thin Convex client. Track B writes it, Track A imports and calls it. No merge conflicts.

---

## Track Assignments

- **Track A — Sissi (Agent Runtime):** LLM API wrangling, prompt engineering, and integrating sponsor SDKs (Browser Use, AgentMail, Paylocus, Supermemory, Laminar). The "make the agent smart" track.
- **Track B — Iana (Convex Platform):** Data modeling, real-time reactive queries, betting math, orchestration, and Daytona sandbox management. The "make the platform work" track.

---

## Frontend Dependency

Max (frontend) benefits most from Track B finishing Convex queries early, since the frontend subscribes directly to Convex. Track B should prioritize getting `getSandbox` and `getRecentEvents` queries working first so Max has real data to build against.
