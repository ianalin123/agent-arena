# Agent Arena — Technical Plan

## What We're Building

A platform where users watch, bet on, and interact with AI agents pursuing verifiable goals in real-time sandboxed environments.

**MVP scope:** Multiple sandboxes running concurrently, each with one agent pursuing one goal. Users can spectate, bet, inject compute credits, and submit strategy prompts. Agents can browse the web, send emails, and make payments autonomously.

---

## Sponsor Stack

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER LAYER                              │
│                                                                 │
│   Next.js Frontend (Vercel)                                     │
│   - Live agent browser stream                                   │
│   - Betting panel with dynamic odds                             │
│   - Goal progress tracker                                       │
│   - Credit injection + prompt submission                        │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                       BACKEND LAYER                             │
│                                                                 │
│   Convex (Reactive Backend + Database)                          │
│   - Real-time sandbox state (progress, status, credits)         │
│   - Betting engine (pools, odds, settlement)                    │
│   - User auth + credit balances                                 │
│   - Prompt injection queue                                      │
│   - Agent event log (live feed to frontend)                     │
│   - All persistent storage (no separate DB needed)              │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                    AGENT RUNTIME LAYER                           │
│                                                                 │
│   Browser Use (Agent Browser Automation)                        │
│   - Cloud-hosted browser agents via API                         │
│   - Agent controls browser: navigate, click, type, scroll       │
│   - Screenshots streamed to frontend for live observation       │
│   - Each sandbox gets its own Browser Use session               │
│                                                                 │
│   Model Router (Custom — model-agnostic agent brain)            │
│   - Wraps Anthropic, OpenAI, Google DeepMind SDKs               │
│   - Standardized input/output: screenshot + context → action    │
│   - User picks model per sandbox; router handles the rest       │
│   - Hot-swap models mid-session if one rate-limits              │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                    AGENT TOOLS LAYER                             │
│                                                                 │
│   AgentMail (Email for Agents)                                  │
│   - Each sandbox agent gets its own email inbox                 │
│   - Send outreach, receive replies, handle verification codes   │
│   - Essential for goals involving outreach, signups, sales      │
│                                                                 │
│   Paylocus (Agentic Payments)                                   │
│   - Programmable wallet per sandbox with capped balance          │
│   - Agent can purchase ads, buy domains, pay for services       │
│   - Transaction logging feeds into frontend event stream        │
│   - Spend controls: per-transaction limits, blacklists          │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                      SANDBOX LAYER                              │
│                                                                 │
│   Daytona (Secure Sandboxed Environments)                       │
│   - One Daytona sandbox per active goal session                 │
│   - Agent process runs inside isolated environment              │
│   - File system access for screenshots/logs                     │
│   - Agents can't escape or interfere with each other            │
│   - Sub-90ms creation for instant sandbox spin-up               │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                    OBSERVABILITY LAYER                           │
│                                                                 │
│   Laminar (Agent Tracing + Observability)                       │
│   - Every LLM call, tool use, and browser action traced         │
│   - Decision log: "Agent thought X, then did Y, observed Z"     │
│   - Feeds real-time "agent thinking" stream to frontend         │
│   - Signals for detecting failure loops and stalls              │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                      MEMORY LAYER                               │
│                                                                 │
│   Supermemory (Long-term Agent Context)                         │
│   - Persists agent learnings across long sessions               │
│   - "I tried posting memes, engagement was low → try threads"   │
│   - Stores user-injected prompts as retrievable context         │
│   - Prevents agents from repeating failed strategies            │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                    EVALUATION LAYER (Stretch)                    │
│                                                                 │
│   HUD.ai (Agent Benchmarking)                                   │
│   - Benchmark agent performance across goal types               │
│   - Compare model effectiveness (Claude vs GPT vs Gemini)       │
│   - Track success rates, time-to-goal, cost-efficiency          │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                    LLM PROVIDERS                                │
│                                                                 │
│   Anthropic — Claude Sonnet/Opus (vision + reasoning)           │
│   OpenAI — GPT-4o (alternative model)                           │
│   Google DeepMind — Gemini (alternative model)                  │
│   User selects model per sandbox. Same goal + different models  │
│   = compelling comparison demo.                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Sponsor count: 10** — Browser Use, Convex, Daytona, Laminar, Supermemory, AgentMail, Vercel, Anthropic, OpenAI, Google DeepMind (+Paylocus as agent payments layer, +HUD.ai as stretch)

---

## How a Session Works End-to-End

### 1. Sandbox Creation

```
User clicks "Create Goal" or selects existing goal template
    │
    ▼
Convex mutation: createSandbox({
    goal: "Get 1000 followers on X",
    target: 1000,
    metric: "follower_count",
    timeLimit: "48h",
    model: "claude-sonnet",           // user picks model
    initialCredits: 50                // seed from creating user
})
    │
    ▼
Backend spins up Daytona sandbox:
    sandbox = daytona.create({
        language: "python",
        image: "agent-arena-base"     // pre-built with deps
    })
    │
    ▼
Inside sandbox, initialize agent:
    - Browser Use session (cloud browser)
    - AgentMail inbox (unique email for this agent)
    - Paylocus wallet (capped at seed credits)
    - Supermemory connection
    - Laminar tracing
    │
    ▼
Agent loop starts, sandbox status → "active"
Frontend shows live stream
```

### 2. The Agent Loop

```python
# agent_runner.py — runs inside each Daytona sandbox

from browser_use import BrowserUseClient
from agentmail import AgentMailClient
from supermemory import SuperMemory
from laminar import Laminar, observe
from model_router import get_model

# ── Initialize ──────────────────────────────────────────────
model = get_model(sandbox_config.model_id)   # claude / gpt-4o / gemini
browser = BrowserUseClient(api_key=BROWSER_USE_KEY)
mail = AgentMailClient(inbox_id=sandbox_config.email_inbox_id)
payments = PaylocusClient(wallet_id=sandbox_config.wallet_id)
memory = SuperMemory(api_key=SUPERMEMORY_KEY)
Laminar.initialize(project_api_key=LAMINAR_KEY)

# ── Main Loop ───────────────────────────────────────────────
while credits > 0 and not goal_achieved and not time_expired:

    # 1. OBSERVE — capture current state
    screenshot = await browser.screenshot()
    emails = await mail.check_inbox()
    balance = await payments.get_balance()

    # 2. REMEMBER — retrieve relevant past context
    past_context = memory.search(
        query=f"strategies for {goal_type}",
        top_k=5,
        filters={"sandbox_id": sandbox_id}
    )

    # 3. CHECK USER PROMPTS — pull from Convex queue
    user_prompts = await fetch_pending_prompts(sandbox_id)

    # 4. THINK — ask the model what to do next
    @observe(name="agent_reasoning_step")  # Laminar traces this
    async def think():
        return await model.think(
            goal=sandbox_config.goal,
            screenshot=screenshot,
            emails=emails,
            wallet_balance=balance,
            memory=past_context,
            user_prompts=user_prompts,
            action_history=recent_actions,
            available_tools=[
                "browser: navigate, click, type, scroll",
                "email: send, reply, check inbox",
                "payment: purchase, subscribe, boost",
            ]
        )

    decision = await think()

    # 5. ACT — execute the decided action
    if decision.action_type == "browser":
        result = await browser.execute(decision.action)
    elif decision.action_type == "email":
        result = await mail.send(decision.email)
    elif decision.action_type == "payment":
        result = await payments.transact(decision.payment)

    # 6. LEARN — store outcome in memory
    memory.add(
        content=f"Action: {decision.action}, Result: {result}",
        metadata={"sandbox_id": sandbox_id, "goal_type": goal_type}
    )

    # 7. UPDATE — push state to Convex (triggers live UI updates)
    await convex_push_event(sandbox_id, {
        "reasoning": decision.reasoning,
        "action": decision.action,
        "result": result,
        "progress": await check_goal_progress(),
        "credits_used": decision.cost
    })

    credits -= decision.cost

# ── Session Complete ────────────────────────────────────────
await trigger_goal_verification(sandbox_id)
```

### 3. Model Router (Swappable LLM Brain)

```python
# model_router.py — model-agnostic interface

import anthropic
import openai
import google.generativeai as genai

class ModelRouter:
    """Same interface regardless of model. Sandbox config picks which one."""

    providers = {
        "claude-sonnet": AnthropicProvider(),
        "claude-opus": AnthropicProvider(model="claude-opus-4-6"),
        "gpt-4o": OpenAIProvider(),
        "gemini-2-flash": GeminiProvider(),
    }

    def get(self, model_id: str) -> BaseProvider:
        return self.providers[model_id]


class AnthropicProvider(BaseProvider):
    async def think(self, goal, screenshot, **context) -> Decision:
        response = await anthropic.messages.create(
            model="claude-sonnet-4-5-20250929",
            max_tokens=4096,
            messages=[{
                "role": "user",
                "content": [
                    {"type": "image", "source": {"type": "base64", "data": screenshot}},
                    {"type": "text", "text": build_prompt(goal, **context)}
                ]
            }]
        )
        return parse_decision(response)


class OpenAIProvider(BaseProvider):
    async def think(self, goal, screenshot, **context) -> Decision:
        response = await openai.chat.completions.create(
            model="gpt-4o",
            messages=[{
                "role": "user",
                "content": [
                    {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{screenshot}"}},
                    {"type": "text", "text": build_prompt(goal, **context)}
                ]
            }]
        )
        return parse_decision(response)


class GeminiProvider(BaseProvider):
    async def think(self, goal, screenshot, **context) -> Decision:
        model = genai.GenerativeModel("gemini-2.0-flash")
        response = await model.generate_content([
            screenshot_as_image,
            build_prompt(goal, **context)
        ])
        return parse_decision(response)


# All providers return the same Decision object:
@dataclass
class Decision:
    reasoning: str           # "Engagement on threads is 3x higher..."
    action_type: str         # "browser" | "email" | "payment"
    action: dict             # {"type": "navigate", "url": "..."}
    cost: float              # estimated LLM cost for this step
```

### 4. What the Frontend Shows

```
┌──────────────────────────────────────────────────────────────┐
│  AGENT ARENA                                    [My Credits] │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────┐  ┌──────────────────┐  │
│  │                                 │  │  GOAL             │  │
│  │     LIVE BROWSER STREAM         │  │  Get 1K followers │  │
│  │                                 │  │  on X in 48hrs    │  │
│  │  (screenshots from Browser Use  │  │                   │  │
│  │   updated every 2-3 seconds)    │  │  ████████░░ 847   │  │
│  │                                 │  │  / 1000           │  │
│  │                                 │  │                   │  │
│  │                                 │  │  TIME: 31:42:08   │  │
│  └─────────────────────────────────┘  │  CREDITS: $23.40  │  │
│                                       │  WALLET: $14.20   │  │
│  ┌─────────────────────────────────┐  │  MODEL: Claude    │  │
│  │  AGENT THINKING (Laminar trace) │  └──────────────────┘  │
│  │                                 │                         │
│  │  "Thread strategy working well. │  ┌──────────────────┐  │
│  │   Engagement up 3x. Now going   │  │  BETTING          │  │
│  │   to spend $5 on a promoted     │  │                   │  │
│  │   post via Paylocus wallet..."  │  │  Will it hit      │  │
│  │                                 │  │  1000?             │  │
│  │  → Navigating to X ads manager  │  │                   │  │
│  │  → Payment: $5.00 for boost ✓   │  │  YES  63% ($312)  │  │
│  │  → Checking email for confirm   │  │  NO   37% ($183)  │  │
│  │  → 12 new followers from boost  │  │                   │  │
│  └─────────────────────────────────┘  │  [Place Bet]      │  │
│                                       │  [Add Credits]    │  │
│  ┌─────────────────────────────────┐  │  [Send Prompt]    │  │
│  │  ACTIVITY FEED                  │  └──────────────────┘  │
│  │                                 │                         │
│  │  📧 Agent sent cold outreach    │                         │
│  │     to 3 AI newsletter authors  │                         │
│  │  💰 Agent spent $5.00 on ad     │                         │
│  │  💡 @user1: "try posting memes" │                         │
│  │  🔄 Agent pivoted to threads    │                         │
│  │  [Type a suggestion...]         │                         │
│  └─────────────────────────────────┘                         │
└──────────────────────────────────────────────────────────────┘
```

### 5. Betting Mechanics

**Parimutuel pool model** (simplest, no market-making needed):

```
All YES bets go into one pool.
All NO bets go into another pool.

Odds = total_pool / winning_pool
Payout = (your_bet / winning_pool) × total_pool

Example:
  $300 total on YES, $200 total on NO
  Total pool = $500

  If goal succeeds (YES wins):
    $50 YES bettor gets: ($50 / $300) × $500 = $83.33

  If goal fails (NO wins):
    $50 NO bettor gets: ($50 / $200) × $500 = $125.00
```

**Convex handles this reactively** — odds update live as bets come in, no polling needed.

**Dynamic betting rules:**
- Bets open when sandbox starts
- Odds shift with every new bet (displayed in real-time via Convex subscriptions)
- Bets lock at 80% time elapsed OR when goal is >90% complete
- Settlement is automatic when goal verifier confirms outcome

### 6. Goal Verification

```python
# Runs as a separate polling process per sandbox

async def verify_goal(sandbox_id, goal_config):
    while sandbox_active(sandbox_id):
        await asyncio.sleep(30)  # check every 30 seconds

        if goal_config.type == "follower_count":
            count = await scrape_follower_count(
                platform="twitter",
                handle=goal_config.account_handle
            )
        elif goal_config.type == "revenue":
            count = await payments.get_total_earned()
        elif goal_config.type == "views":
            count = await scrape_view_count(...)
        elif goal_config.type == "emails_booked":
            count = await mail.count_positive_replies()

        # Update progress in Convex (triggers real-time UI update)
        await convex.mutation("updateProgress", {
            "sandboxId": sandbox_id,
            "progress": count,
            "timestamp": now()
        })

        if count >= goal_config.target:
            await convex.mutation("completeSandbox", {
                "sandboxId": sandbox_id,
                "outcome": "success"
            })
            # Betting engine auto-settles
            return
```

---

## Data Model (Convex Schema)

Convex serves as both the reactive backend AND the database. No separate DB needed — Convex handles real-time subscriptions, persistent storage, and queries in one place. At hackathon scale this is more than sufficient, and the real-time reactivity is a core product feature (live odds, live progress, live event stream).

```typescript
// convex/schema.ts

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Active sandboxes
  sandboxes: defineTable({
    goalDescription: v.string(),
    goalType: v.string(),           // "follower_count" | "revenue" | "views" | "emails_booked"
    targetValue: v.number(),
    currentProgress: v.number(),
    status: v.string(),             // "pending" | "active" | "paused" | "completed" | "failed"
    model: v.string(),              // "claude-sonnet" | "gpt-4o" | "gemini-2-flash"
    daytonaSandboxId: v.string(),
    agentmailInboxId: v.string(),   // AgentMail inbox for this sandbox
    paylocusWalletId: v.string(),   // Paylocus wallet for this sandbox
    walletBalance: v.number(),      // Current agent wallet balance
    timeLimit: v.number(),          // seconds
    creditsRemaining: v.number(),   // LLM compute credits
    createdAt: v.number(),
    expiresAt: v.number(),
    createdBy: v.id("users"),
  })
    .index("by_status", ["status"])
    .index("by_created", ["createdAt"]),

  // Bets on sandbox outcomes
  bets: defineTable({
    sandboxId: v.id("sandboxes"),
    userId: v.id("users"),
    amount: v.number(),
    position: v.string(),           // "yes" | "no"
    oddsAtPlacement: v.number(),
    settled: v.boolean(),
    payout: v.optional(v.number()),
    placedAt: v.number(),
  })
    .index("by_sandbox", ["sandboxId"])
    .index("by_user", ["userId"]),

  // Betting pools (one per sandbox, reactive)
  bettingPools: defineTable({
    sandboxId: v.id("sandboxes"),
    yesTotal: v.number(),
    noTotal: v.number(),
    bettingOpen: v.boolean(),
  })
    .index("by_sandbox", ["sandboxId"]),

  // Credit transactions (compute top-ups)
  creditTransactions: defineTable({
    sandboxId: v.id("sandboxes"),
    userId: v.id("users"),
    amount: v.number(),
    type: v.string(),               // "seed" | "topup"
    createdAt: v.number(),
  })
    .index("by_sandbox", ["sandboxId"]),

  // Agent payment transactions (via Paylocus)
  paymentTransactions: defineTable({
    sandboxId: v.id("sandboxes"),
    amount: v.number(),
    description: v.string(),        // "Instagram ad boost", "Domain purchase"
    recipient: v.string(),
    status: v.string(),             // "pending" | "completed" | "failed"
    createdAt: v.number(),
  })
    .index("by_sandbox", ["sandboxId"]),

  // Agent emails (via AgentMail)
  agentEmails: defineTable({
    sandboxId: v.id("sandboxes"),
    direction: v.string(),          // "sent" | "received"
    subject: v.string(),
    snippet: v.string(),            // preview text
    timestamp: v.number(),
  })
    .index("by_sandbox", ["sandboxId"]),

  // User-submitted prompts
  promptInjections: defineTable({
    sandboxId: v.id("sandboxes"),
    userId: v.id("users"),
    promptText: v.string(),
    injectedAt: v.number(),
    acknowledged: v.boolean(),
  })
    .index("by_sandbox_pending", ["sandboxId", "acknowledged"]),

  // Agent event stream (real-time feed)
  agentEvents: defineTable({
    sandboxId: v.id("sandboxes"),
    eventType: v.string(),          // "reasoning" | "browser_action" | "email" | "payment" | "screenshot" | "error" | "progress"
    payload: v.string(),            // JSON string for flexibility
    timestamp: v.number(),
  })
    .index("by_sandbox_time", ["sandboxId", "timestamp"]),

  // Users
  users: defineTable({
    name: v.string(),
    email: v.string(),
    balance: v.number(),            // play money balance
  }),
});
```

---

## Sponsor Integration Details

### Browser Use — Agent Browser Automation (CORE)

```python
from browser_use import BrowserUseClient

# Create a cloud browser session for this sandbox
browser = BrowserUseClient(api_key=BROWSER_USE_KEY)
session = await browser.create_session()

# Agent takes actions through Browser Use API
await session.navigate("https://x.com")
await session.click("#compose-tweet")
await session.type("Here's my thread about AI agents...")
await session.click("#post-button")

# Get screenshot for the model to reason about
screenshot_b64 = await session.screenshot()

# Stream screenshots to frontend via Convex
await convex.mutation("pushAgentEvent", {
    "sandboxId": sandbox_id,
    "eventType": "screenshot",
    "payload": json.dumps({"image": screenshot_b64})
})
```

**Why Browser Use over raw Playwright:** Cloud-hosted browsers mean we don't need to run heavyweight browser processes inside Daytona sandboxes. Browser Use handles the infra, we just call the API. Also a direct sponsor integration.

### AgentMail — Agent Email

```python
from agentmail import AgentMailClient

# Create a unique inbox for this sandbox's agent
mail = AgentMailClient(api_key=AGENTMAIL_KEY)
inbox = await mail.create_inbox()  # e.g., agent-abc123@agentmail.to

# Agent sends outreach
await mail.send(
    from_inbox=inbox.id,
    to="newsletter@example.com",
    subject="Collaboration opportunity",
    body="Hi, I'm building an audience around AI topics..."
)

# Check for replies
messages = await mail.check_inbox(inbox_id=inbox.id)
for msg in messages:
    if is_positive_reply(msg):
        # Agent decides next steps based on reply content
        pass

# Feed email activity to frontend
await convex.mutation("pushAgentEvent", {
    "sandboxId": sandbox_id,
    "eventType": "email",
    "payload": json.dumps({
        "direction": "sent",
        "to": "newsletter@example.com",
        "subject": "Collaboration opportunity"
    })
})
```

### Paylocus — Agent Payments

```python
from paylocus import PaylocusClient

# Create a wallet for this sandbox with a capped balance
payments = PaylocusClient(api_key=PAYLOCUS_KEY)
wallet = await payments.create_wallet(
    sandbox_id=sandbox_id,
    initial_balance=sandbox_config.wallet_budget,
    max_single_transaction=50.00,     # safety cap
)

# Agent decides to spend money on ads
result = await payments.transact(
    wallet_id=wallet.id,
    amount=5.00,
    description="Instagram promoted post",
    recipient="instagram_ads",
)

# Check balance
balance = await payments.get_balance(wallet_id=wallet.id)

# Feed payment events to frontend (users see "$5 spent on ad boost")
await convex.mutation("pushAgentEvent", {
    "sandboxId": sandbox_id,
    "eventType": "payment",
    "payload": json.dumps({
        "amount": 5.00,
        "description": "Instagram promoted post",
        "balance_remaining": balance
    })
})
```

**Why this matters for the product:** An agent that can spend money is dramatically more interesting to watch and bet on. "Will the agent's $20 ad spend pay off?" creates real tension. Without payments, agents are limited to slow organic strategies.

### Daytona — Sandbox Infrastructure

```python
from daytona import Daytona, CreateSandboxParams

daytona = Daytona()

# Create isolated sandbox for a new goal session
sandbox = daytona.create(CreateSandboxParams(
    language="python",
    # Custom image with agent dependencies pre-installed
))

# Upload agent code + config
sandbox.fs.upload_file(agent_code, "/home/daytona/agent_runner.py")
sandbox.fs.upload_file(config, "/home/daytona/config.json")

# Start agent process
response = sandbox.process.exec(
    "python agent_runner.py --sandbox-id=abc123",
    cwd="/home/daytona",
    timeout=86400  # 24hr max
)

# Tear down when session ends
daytona.remove(sandbox)
```

### Convex — Reactive Backend + Database

```typescript
// convex/sandboxes.ts — real-time sandbox state

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Frontend subscribes to this — auto-updates on ANY change
export const getSandbox = query({
  args: { sandboxId: v.id("sandboxes") },
  handler: async (ctx, args) => {
    const sandbox = await ctx.db.get(args.sandboxId);
    const pool = await ctx.db
      .query("bettingPools")
      .withIndex("by_sandbox", (q) => q.eq("sandboxId", args.sandboxId))
      .first();
    const recentEvents = await ctx.db
      .query("agentEvents")
      .withIndex("by_sandbox_time", (q) => q.eq("sandboxId", args.sandboxId))
      .order("desc")
      .take(20);
    const recentPayments = await ctx.db
      .query("paymentTransactions")
      .withIndex("by_sandbox", (q) => q.eq("sandboxId", args.sandboxId))
      .order("desc")
      .take(5);
    return { sandbox, pool, recentEvents, recentPayments };
  },
});

// Place a bet — automatically updates odds for all subscribers
export const placeBet = mutation({
  args: {
    sandboxId: v.id("sandboxes"),
    userId: v.id("users"),
    amount: v.number(),
    position: v.string(),
  },
  handler: async (ctx, args) => {
    const pool = await ctx.db
      .query("bettingPools")
      .withIndex("by_sandbox", (q) => q.eq("sandboxId", args.sandboxId))
      .first();

    if (!pool || !pool.bettingOpen) throw new Error("Betting closed");

    // Update pool totals
    const update = args.position === "yes"
      ? { yesTotal: pool.yesTotal + args.amount }
      : { noTotal: pool.noTotal + args.amount };
    await ctx.db.patch(pool._id, update);

    // Calculate odds at time of placement
    const newTotal = pool.yesTotal + pool.noTotal + args.amount;
    const winningPool = args.position === "yes"
      ? pool.yesTotal + args.amount
      : pool.noTotal + args.amount;

    // Record bet
    await ctx.db.insert("bets", {
      ...args,
      oddsAtPlacement: newTotal / winningPool,
      settled: false,
      placedAt: Date.now(),
    });

    // All subscribed frontends instantly see new odds
  },
});

// Agent pushes events — frontend updates live
export const pushAgentEvent = mutation({
  args: {
    sandboxId: v.id("sandboxes"),
    eventType: v.string(),
    payload: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("agentEvents", {
      ...args,
      timestamp: Date.now(),
    });
  },
});

// Settle bets when goal is verified
export const settleSandbox = mutation({
  args: {
    sandboxId: v.id("sandboxes"),
    outcome: v.string(), // "success" | "failed"
  },
  handler: async (ctx, args) => {
    // Update sandbox status
    await ctx.db.patch(args.sandboxId, { status: args.outcome === "success" ? "completed" : "failed" });

    // Get pool
    const pool = await ctx.db
      .query("bettingPools")
      .withIndex("by_sandbox", (q) => q.eq("sandboxId", args.sandboxId))
      .first();
    if (!pool) return;

    const totalPool = pool.yesTotal + pool.noTotal;
    const winningPosition = args.outcome === "success" ? "yes" : "no";
    const winningPool = winningPosition === "yes" ? pool.yesTotal : pool.noTotal;

    // Settle all bets
    const bets = await ctx.db
      .query("bets")
      .withIndex("by_sandbox", (q) => q.eq("sandboxId", args.sandboxId))
      .collect();

    for (const bet of bets) {
      const payout = bet.position === winningPosition
        ? (bet.amount / winningPool) * totalPool
        : 0;
      await ctx.db.patch(bet._id, { settled: true, payout });

      // Credit winner's balance
      if (payout > 0) {
        const user = await ctx.db.get(bet.userId);
        if (user) await ctx.db.patch(bet.userId, { balance: user.balance + payout });
      }
    }

    // Close betting
    await ctx.db.patch(pool._id, { bettingOpen: false });
  },
});
```

### Laminar — Agent Observability

```python
from laminar import Laminar, observe

Laminar.initialize(project_api_key=LAMINAR_KEY)

# Wrap every agent reasoning step with Laminar tracing
@observe(name="agent_reasoning_step")
async def agent_step(goal, screenshot, memory_context, emails, wallet):
    """Each step is traced with full input/output context"""
    decision = await model.think(
        goal=goal,
        screenshot=screenshot,
        memory=memory_context,
        emails=emails,
        wallet_balance=wallet,
    )
    return decision

# Laminar captures:
# - Full LLM prompt and response
# - Latency, token usage, cost
# - Tool calls and results
# - Chain of reasoning across steps

# The "Agent Thinking" panel on the frontend pulls from
# Laminar traces to show WHY the agent made each decision
```

### Supermemory — Agent Long-Term Context

```python
from supermemory import SuperMemory

memory = SuperMemory(api_key=SUPERMEMORY_KEY)

# Store learnings after each action
memory.add(
    content=f"Tried {strategy}. Result: {outcome}. Engagement: {metrics}",
    metadata={"sandbox_id": sandbox_id, "goal_type": goal_type}
)

# Retrieve relevant context before next decision
results = memory.search(
    query=f"successful strategies for {goal_type}",
    top_k=5,
    filters={"sandbox_id": sandbox_id}
)

# Also store user-injected prompts as retrievable memory
memory.add(
    content=f"User suggestion: {user_prompt}",
    metadata={"sandbox_id": sandbox_id, "source": "user"}
)
```

### HUD.ai — Agent Evaluation (Stretch)

```python
from hud import HUDClient

hud = HUDClient(api_key=HUD_KEY)

# After a session completes, log results for benchmarking
hud.log_evaluation(
    task="get_1000_followers_x",
    model=selected_model,
    metrics={
        "goal_achieved": True,
        "time_to_goal": 14.5,       # hours
        "total_compute_cost": 47.20,
        "total_wallet_spend": 23.00, # Paylocus spend
        "actions_taken": 342,
        "emails_sent": 15,
        "strategies_tried": 5
    }
)
```

---

## Build Priority (Hackathon Timeline)

### Phase 1: Core Loop (Hours 0-8) — THE DEMO

**Goal: One agent, one sandbox, visibly pursuing a goal in a browser.**

1. **Browser Use session + model router** — get an agent that can see a browser and take actions. Start with Claude via Anthropic SDK. This is the hardest part and the entire demo.
2. **Daytona sandbox** — agent process runs in an isolated Daytona environment
3. **Screenshot streaming** — periodic screenshots from Browser Use → Convex → frontend
4. **Basic Next.js frontend on Vercel** — shows the live browser stream and event log
5. **Pick ONE demo goal** — "Get 100 followers on X in 2 hours" or similar. Hard-code the goal.

**At end of Phase 1:** You can show someone an agent autonomously browsing and taking actions toward a goal.

### Phase 2: Platform Layer (Hours 8-16) — WHAT MAKES IT A PRODUCT

6. **Convex backend** — sandbox state, event stream, user accounts (play money)
7. **Betting interface** — yes/no bets with parimutuel odds, live odds display
8. **Goal progress tracking** — verification polling + progress bar
9. **Credit injection** — "Fund this agent" button
10. **AgentMail integration** — agent gets an inbox, can send outreach
11. **Paylocus integration** — agent gets a wallet, can spend strategically
12. **Multiple sandboxes** — show 2-3 simultaneously (same goal, different models)

**At end of Phase 2:** Users can watch agents that browse, email, and spend money. They can bet on outcomes and fund agents.

### Phase 3: Polish + Differentiators (Hours 16-24) — IMPRESS JUDGES

13. **Laminar tracing** — "Agent Thinking" panel showing reasoning live
14. **Supermemory** — agent visibly learns and adapts strategies
15. **Prompt injection** — users submit suggestions the agent incorporates
16. **Dynamic odds** — odds shift as progress changes
17. **Model comparison view** — side-by-side Claude vs GPT vs Gemini on same goal
18. **HUD.ai benchmarking** — model performance comparison dashboard

### Phase 4: If Time Permits

19. **User-defined goals** — form to propose new goals and spin up sandboxes
20. **Goal templates** — pre-built goals users can launch with one click
21. **Mobile-responsive layout**
22. **Replay mode** — rewatch completed sessions

---

## Key Technical Risks + Mitigations

| Risk | Mitigation |
|------|------------|
| Agent fails to make any progress during demo | Pre-run sessions, have "replay" mode showing a successful run. Pick a validated goal. |
| Browser Use API rate limits or downtime | Fallback: run Playwright directly inside Daytona sandbox |
| Model rate limits during live demo | Model router auto-falls back to next provider (Claude → GPT → Gemini) |
| Real-time streaming is laggy | Screenshots every 3-5 seconds is fine. Don't try video streaming. |
| Platform rate limits (X/Instagram) | Backup accounts. Use less-restricted platforms as fallback goals. |
| Paylocus integration complexity | Fallback: simulate payments with logged events (still shows the UX) |
| AgentMail deliverability issues | Pre-verify recipient addresses. Have backup goal types that don't need email. |
| Convex cold starts for demo | Keep backend warm before demo. Pre-populate with historical data. |

---

## Demo Script (2 minutes)

> "Agent Arena is a prediction market for AI agent performance."
>
> **[Show dashboard with 3 live sandboxes — Claude, GPT-4o, Gemini — same goal]**
>
> "Three agents are racing to get 1,000 followers on X. Claude, GPT-4o, and Gemini — same goal, same budget, different strategies. Watch."
>
> **[Click into Claude's sandbox — show browser stream + thinking panel]**
>
> "You can see exactly what Claude is thinking. It tried memes earlier, got low engagement, and pivoted to threads. That learning is stored in Supermemory so it won't make the same mistake."
>
> **[Show email panel]**
>
> "It also just sent cold outreach to 3 AI newsletter authors via AgentMail, asking for cross-promotion. One replied — it's now drafting a collaboration plan."
>
> **[Show payment event]**
>
> "And it spent $5 from its Paylocus wallet on a promoted post. That's the interesting part — the agent is making real spending decisions. Will the ad spend pay off?"
>
> **[Show betting panel]**
>
> "47 people are betting on whether Claude hits 1,000. Current odds: 63% yes. You can bet, fund the agent, or suggest a strategy."
>
> **[Show Laminar trace]**
>
> "Every decision is traced through Laminar. Full transparency on the agent's reasoning."
>
> **[Quick model comparison]**
>
> "Across all sessions: Claude has a 71% goal completion rate but spends 40% more. GPT is cheaper but less creative. That's the kind of insight our platform surfaces."

---

## Repository Structure

```
agent-arena/
├── apps/
│   └── web/                       # Next.js frontend (Vercel)
│       ├── app/
│       │   ├── page.tsx           # Dashboard — all active sandboxes
│       │   ├── sandbox/
│       │   │   └── [id]/
│       │   │       └── page.tsx   # Individual sandbox view
│       │   └── layout.tsx
│       ├── components/
│       │   ├── BrowserStream.tsx   # Live screenshot viewer
│       │   ├── BettingPanel.tsx    # Odds + place bet
│       │   ├── AgentThinking.tsx   # Laminar reasoning trace
│       │   ├── GoalProgress.tsx    # Progress bar + timer
│       │   ├── ActivityFeed.tsx    # Emails, payments, actions
│       │   ├── PromptInput.tsx     # User prompt submission
│       │   └── SandboxCard.tsx     # Dashboard card per sandbox
│       └── package.json
│
├── convex/                        # Convex backend (DB + real-time)
│   ├── schema.ts                  # Full data model
│   ├── sandboxes.ts               # Sandbox CRUD + state
│   ├── betting.ts                 # Betting engine + settlement
│   ├── credits.ts                 # Credit management
│   ├── prompts.ts                 # Prompt injection queue
│   └── events.ts                  # Agent event stream
│
├── agent/                         # Agent runtime (runs in Daytona)
│   ├── agent_runner.py            # Main agent loop
│   ├── model_router.py            # Claude / GPT / Gemini router
│   ├── providers/
│   │   ├── anthropic_provider.py
│   │   ├── openai_provider.py
│   │   └── gemini_provider.py
│   ├── tools/
│   │   ├── browser.py             # Browser Use integration
│   │   ├── email.py               # AgentMail integration
│   │   └── payments.py            # Paylocus integration
│   ├── goal_verifier.py           # Goal progress checking
│   ├── memory.py                  # Supermemory integration
│   └── requirements.txt
│
├── orchestrator/                  # Sandbox lifecycle management
│   ├── sandbox_manager.py         # Daytona sandbox create/destroy
│   ├── event_bridge.py            # Agent events → Convex
│   └── screenshot_streamer.py     # Browser Use screenshots → frontend
│
├── eval/                          # HUD.ai evaluation (stretch)
│   └── benchmark.py
│
└── README.md
```
