# Person 2 Plan — Convex Platform + Orchestrator (Track B)

**Owner:** Iana
**Directories:** `convex/`, `orchestrator/`
**Languages:** TypeScript (Convex), Python (orchestrator)
**Sponsor integrations:** Convex, Daytona, Vercel (indirectly via frontend support)

---

## What's Already Scaffolded

### Convex (`convex/`) — All files have complete logic

| File | Status | Notes |
|------|--------|-------|
| `convex/schema.ts` | **Complete** | 9 tables: sandboxes, bets, bettingPools, creditTransactions, paymentTransactions, agentEmails, promptInjections, agentEvents, users. All indexes defined. |
| `convex/sandboxes.ts` | **Complete** | `list`, `get`, `create`, `updateProgress`, `updateStatus`, `complete` — all implemented. `get` returns sandbox + pool + recent events + recent payments in one query. |
| `convex/betting.ts` | **Complete** | `getPool`, `getBets`, `getUserBets`, `placeBet` (with balance deduction + odds calc), `settle` (parimutuel payout distribution). |
| `convex/credits.ts` | **Complete** | `getForSandbox`, `inject` (deducts from user balance, adds to sandbox credits). |
| `convex/prompts.ts` | **Complete** | `submit`, `fetchPending` (filtered by acknowledged=false), `acknowledge`. |
| `convex/events.ts` | **Complete** | `push`, `recent` (with configurable limit, default 20). |

**The Convex logic is written.** Your Phase 1 work is mostly: deploy it, test it, make sure the queries work correctly with real data, and handle any edge cases the scaffold missed.

### Orchestrator (`orchestrator/`) — Needs real API calls

| File | Status | Notes |
|------|--------|-------|
| `orchestrator/event_bridge.py` | **Partial** | Class structure is complete with all 5 methods. 2 TODOs — `_call_mutation` and `_call_query` need to actually call the Convex HTTP API. |
| `orchestrator/sandbox_manager.py` | **Skeleton** | 4 TODOs — `create_sandbox`, `destroy_sandbox`, `get_sandbox_status` need real Daytona SDK calls. |
| `orchestrator/screenshot_streamer.py` | **Partial** | Loop structure works. 1 TODO — error logging. Functionally almost complete; just needs error handling. |

---

## Phase 1: Deploy + Wire the Foundation (Hours 0–8)

The goal is: **Convex deployed, event bridge working, Daytona spinning up sandboxes.** This unblocks both Person 1 (agent can push events) and Max (frontend can subscribe to real data).

### Task 1.1 — Initialize and Deploy Convex

**What to do:**
- Run `npx convex dev` from the project root to initialize the Convex project
- This will create the `convex/_generated/` directory with type-safe helpers
- Verify the schema deploys without errors
- Get the deployment URL and deploy key — you'll share these with Person 1

**Potential issues:**
- The `convex/` files import from `./_generated/server` which doesn't exist until `npx convex dev` runs. If there are type errors, fix them after generation.
- The schema references `v.id("users")` in several tables. Make sure the `users` table is created before inserting records that reference it.

**Test:** Open the Convex dashboard. You should see all 9 tables. Insert a test user manually and verify it appears.

**Output for team:** Share the Convex deployment URL and deploy key with Person 1 and Max.

### Task 1.2 — Test Convex Mutations with Seed Data

**What to do:**
- From the Convex dashboard (or a test script), run through the critical path:
  1. Create a user (manual insert — there's no `createUser` mutation yet, add one)
  2. Call `sandboxes.create` with test data
  3. Call `events.push` to simulate an agent event
  4. Call `sandboxes.updateProgress` to simulate progress
  5. Call `betting.placeBet` with the test user
  6. Call `sandboxes.get` and verify the full response (sandbox + pool + events + payments)
- **Add a `users.ts` file** — the scaffold is missing user CRUD. You need at minimum:
  - `create` mutation (name, email, initial balance)
  - `get` query (by ID)
  - `getByEmail` query (for auth lookup)

**File to create:** `convex/users.ts`

**Bug to watch for:** `betting.placeBet` calculates `oddsAtPlacement` as `newTotal / winningPool`. When the pool is empty (first bet), this divides by the bet amount, giving odds of 1.0. That's correct but verify the math works for subsequent bets too.

### Task 1.3 — Implement the Event Bridge (`orchestrator/event_bridge.py`)

**This is the highest priority deliverable.** Person 1 is blocked on this for real Convex integration.

**What to do:**
- Implement `_call_mutation()` — HTTP POST to the Convex API
- Implement `_call_query()` — HTTP POST to the Convex API
- Convex HTTP API format:
  ```
  POST {CONVEX_URL}/api/mutation
  Headers:
    Authorization: Bearer {DEPLOY_KEY}
    Content-Type: application/json
  Body:
    { "path": "events:push", "args": { "sandboxId": "...", ... } }
  ```
  (Same pattern for queries but to `/api/query`)

**Important:** The Convex HTTP API expects document IDs as strings but with a specific format. Test with real IDs from the dashboard.

**Test:** Run a Python script that creates an `EventBridge` instance, calls `push_event()`, and verify the event appears in the Convex dashboard.

**File:** `orchestrator/event_bridge.py` — fill in `_call_mutation` and `_call_query`

**Deliver to Person 1:** The working `EventBridge` class + the Convex URL + deploy key.

### Task 1.4 — Implement Sandbox Manager (`orchestrator/sandbox_manager.py`)

**What to do:**
- Read the Daytona SDK docs
- Fill in `create_sandbox()`:
  1. Call `daytona.create(CreateSandboxParams(language="python"))` to spin up a sandbox
  2. Upload agent code files into the sandbox filesystem
  3. Upload the config JSON
  4. Start the agent process inside the sandbox
  5. Return the Daytona sandbox ID
- Fill in `destroy_sandbox()` — `daytona.remove(sandbox)`
- Fill in `get_sandbox_status()` — check if process is still running

**Test:** Create a sandbox, verify it exists in Daytona, destroy it, verify it's gone.

**File:** `orchestrator/sandbox_manager.py` — 4 TODOs

### Task 1.5 — Wire the Full Sandbox Creation Flow

**What to do:**
- When `sandboxes.create` is called in Convex, the system needs to:
  1. Create a Daytona sandbox (via sandbox_manager)
  2. Create an AgentMail inbox (Person 1's domain, but you can call the API to create it)
  3. Create a Paylocus wallet (same)
  4. Update the Convex sandbox record with the Daytona ID, inbox ID, and wallet ID
  5. Start the agent process inside the sandbox

- This is an **orchestration** concern. Consider whether this should be:
  - A Convex action (TypeScript, runs server-side, calls external APIs)
  - A separate Python orchestration script that listens for new sandbox records

- Recommendation: **Convex action** is cleaner. Add a `sandboxes.launch` action in `convex/sandboxes.ts` that handles the Daytona + external service setup. Actions can make HTTP calls.

**File:** `convex/sandboxes.ts` — add a `launch` action, or create a new `convex/orchestration.ts`

---

## Phase 2: Betting, Credits, and Platform Features (Hours 8–16)

### Task 2.1 — Validate Betting Math

**What to do:**
- The betting code is written. Now stress-test the math:
  - Place multiple bets from multiple users on the same sandbox
  - Verify odds shift correctly with each bet
  - Run `settle` with "success" and "failed" outcomes
  - Verify payouts: sum of all payouts should equal total pool (no money created or destroyed)
  - Edge case: what if only YES bets exist and YES wins? `winningPool === totalPool`, everyone gets 1:1
  - Edge case: what if no bets exist? `settle` should not crash
  - Edge case: what if `winningPool` is 0 (all bets on losing side)? Division by zero!

**Bug to fix:** In `betting.ts` `settle`, if `winningPool` is 0 (everyone bet on the losing side), you get division by zero: `(bet.amount / winningPool) * totalPool`. Add a guard:
  ```typescript
  if (winningPool === 0) {
    // All bettors lose — no payouts
  }
  ```

**File:** `convex/betting.ts` — add edge case handling in `settle`

### Task 2.2 — Add Betting Lock Logic

**What to do:**
- Bets should lock when:
  - 80% of time has elapsed, OR
  - Goal is >90% complete
- Add a check in `placeBet` that reads the sandbox's `expiresAt` and `currentProgress`/`targetValue`
- When conditions are met, set `bettingOpen: false` on the pool
- Consider: add a Convex scheduled function that auto-closes betting at the time threshold

**File:** `convex/betting.ts` — modify `placeBet` to check time/progress

### Task 2.3 — Dynamic Odds Query

**What to do:**
- The `getPool` query already returns `yesTotal` and `noTotal`. The frontend can compute odds from these.
- But for a richer experience, add a computed query that returns:
  ```typescript
  {
    yesOdds: totalPool / yesTotal,  // payout multiplier for YES
    noOdds: totalPool / noTotal,    // payout multiplier for NO
    yesPct: yesTotal / totalPool,   // probability implied by market
    noPct: noTotal / totalPool,
    totalPool: yesTotal + noTotal,
    bettingOpen: boolean,
  }
  ```
- Handle the edge case where `yesTotal` or `noTotal` is 0

**File:** `convex/betting.ts` — add a `getOdds` query

### Task 2.4 — Create User Management (`convex/users.ts`)

**What to do (if not done in Phase 1 Task 1.2):**
- `create` mutation — name, email, initial balance (e.g., $1000 play money)
- `get` query — by ID
- `getByEmail` query — for login/lookup
- `updateBalance` mutation — for manual adjustments
- Consider: for the hackathon, auth can be simplified (no passwords, just email lookup or auto-create)

**File to create:** `convex/users.ts`

### Task 2.5 — Multi-Sandbox Support

**What to do:**
- The `sandboxes.list` query already exists and returns all sandboxes
- Add filtering: `listActive` (status = "active"), `listByModel` (group by model for comparison view)
- Add a `sandboxes.getComparison` query that returns multiple sandboxes with the same goal but different models — this powers the "Claude vs GPT vs Gemini" side-by-side view

**File:** `convex/sandboxes.ts` — add filtered queries

### Task 2.6 — Feed Payment + Email Events into Convex

**What to do:**
- When Person 1's agent sends email or payment events via the event bridge, they arrive as `agentEvents` with type `"email"` or `"payment"`
- Consider also writing to the dedicated `agentEmails` and `paymentTransactions` tables for richer queries
- Option A: Person 1 calls separate mutations for these
- Option B: Add a Convex internal function that listens for events and fans out to the right tables
- Recommendation: Option A is simpler — add `emails.record` and `payments.record` mutations

**Files to create or modify:** `convex/emails.ts`, `convex/payments.ts` (or add to `events.ts`)

---

## Phase 3: Polish + Settlement Edge Cases (Hours 16–24)

### Task 3.1 — Settlement Edge Cases

**What to do:**
- **Timeout:** When a sandbox expires without hitting the goal, auto-settle as "failed"
  - Add a Convex scheduled function that checks `expiresAt` and auto-settles expired sandboxes
- **Tie / partial:** If progress is exactly at target at expiry, settle as "success"
- **Refunds:** If a sandbox is cancelled before completion, refund all bets
  - Add a `betting.refund` mutation that returns bet amounts to user balances

**File:** `convex/betting.ts` — add `refund` mutation. Add scheduled function for auto-settlement.

### Task 3.2 — Model Comparison Aggregation

**What to do:**
- Query across completed sandboxes to compute per-model stats:
  - Success rate
  - Average time to goal
  - Average compute cost
  - Average wallet spend
- This powers the model comparison dashboard

**File:** `convex/sandboxes.ts` — add `getModelStats` query

### Task 3.3 — HUD.ai Integration (Stretch)

**What to do:**
- When a sandbox completes, log the session to HUD.ai for benchmarking
- The `eval/benchmark.py` is a skeleton. You can either:
  - Call HUD.ai from a Convex action when `settleSandbox` runs
  - Or run `benchmark.py` as a post-processing script

**File:** `eval/benchmark.py` — fill in API calls

### Task 3.4 — Screenshot Streamer Polish

**What to do:**
- `orchestrator/screenshot_streamer.py` is nearly complete but needs:
  - Proper error logging (not just `pass`)
  - Configurable interval (maybe faster for demo, slower for production)
  - Graceful shutdown when sandbox completes
  - Consider: should screenshots be stored in Convex file storage instead of as base64 in event payloads? Base64 screenshots are large and will bloat the events table.

**File:** `orchestrator/screenshot_streamer.py`

---

## Environment Variables You'll Need

```
CONVEX_URL=                # From `npx convex dev`
CONVEX_DEPLOY_KEY=         # From Convex dashboard
DAYTONA_API_KEY=           # Or however Daytona auth works
```

---

## Coordination with Person 1 (Sissi)

| What | When | Your Action |
|------|------|-------------|
| **Convex URL + deploy key** | Start of Phase 1 | Deploy Convex, share credentials immediately |
| **Event bridge delivery** | End of Phase 1 | Hand off working `EventBridge` class to Person 1 |
| **Schema changes requested** | As needed | Person 1 may need new event types or fields — you own the schema, make the change |
| **Screenshot format** | Phase 1 | Agree on base64 PNG, max ~500KB per screenshot to keep events table manageable |
| **New mutation requests** | Phase 2 | Person 1 may need mutations for email/payment records — add them |

## Coordination with Max (Frontend)

| What | When | Your Action |
|------|------|-------------|
| **Convex queries for frontend** | Phase 1 | `sandboxes.list`, `sandboxes.get`, `events.recent` — these are already written. Share the function names and return shapes. |
| **Betting queries** | Phase 2 | `betting.getPool`, `betting.placeBet` — share with Max when tested |
| **Convex React provider setup** | Phase 1 | Help Max set up the Convex React provider in `apps/web/` — needs the deployment URL |
| **Type exports** | Phase 1 | The Convex code generation creates TypeScript types Max can import |

---

## Priority Order (if you're short on time)

1. **Deploy Convex** — unblocks everyone; Max can start subscribing, Person 1 knows the URL
2. **Event bridge working** — Person 1 is completely blocked on real-time updates without this
3. **Test sandbox creation flow** — can we create a sandbox and have it appear in the dashboard?
4. **Seed data** — create test users, a test sandbox, and some test events so Max has data to build against
5. **Daytona sandbox manager** — needed for actual agent deployment
6. **User management** — needed for betting to work
7. **Betting validation** — fix edge cases, especially division by zero
8. **Betting lock logic** — prevents late bets
9. **Dynamic odds query** — better UX for betting panel
10. **Settlement automation** — auto-settle on timeout
