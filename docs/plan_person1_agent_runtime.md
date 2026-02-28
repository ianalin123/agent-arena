# Person 1 Plan — Agent Runtime (Track A)

**Owner:** Sissi
**Directories:** `agent/` (all files)
**Language:** Python
**Sponsor integrations:** Browser Use, AgentMail, Paylocus, Supermemory, Laminar, Anthropic, OpenAI, Google DeepMind

---

## What's Already Scaffolded

| File | Status | Notes |
|------|--------|-------|
| `agent/model_router.py` | **Complete** | Router + `Decision` dataclass + `BaseProvider` base class. Ready to use. |
| `agent/providers/anthropic_provider.py` | **Complete** | Vision + reasoning, prompt building, JSON response parsing. |
| `agent/providers/openai_provider.py` | **Complete** | Same interface as Anthropic, adapted for OpenAI SDK. |
| `agent/providers/gemini_provider.py` | **Complete** | Same interface, adapted for Google GenAI SDK. |
| `agent/agent_runner.py` | **Partial** | Full loop structure (observe → think → act → learn → update). Three functions at the bottom (`_fetch_pending_prompts`, `_push_event`, `_complete_sandbox`) are mocked — they print to console. Replace with `EventBridge` calls when Person 2 delivers it. |
| `agent/tools/browser.py` | **Skeleton** | Class structure and method signatures. 7 TODOs — every method body is a stub. |
| `agent/tools/email.py` | **Skeleton** | Class structure. 3 TODOs — `check_inbox`, `send`, `count_positive_replies` are stubs. |
| `agent/tools/payments.py` | **Skeleton** | Class structure. 3 TODOs — `get_balance`, `transact`, `get_transaction_history` are stubs. |
| `agent/goal_verifier.py` | **Partial** | Class structure with properties (`goal_achieved`, `time_expired`) and `check_progress` dispatch. 4 TODOs — each scraping/checking method is a stub. |
| `agent/memory.py` | **Skeleton** | Class structure. 2 TODOs — `add` and `search` are stubs. |
| `agent/requirements.txt` | **Complete** | All deps listed. |

---

## Phase 1: Core Loop (Hours 0–8)

The goal is: **one agent, one browser, visibly doing things.**

### Task 1.1 — Wire up Browser Use (`agent/tools/browser.py`)

This is the most critical integration. Without it, there's nothing to demo.

**What to do:**
- Read the Browser Use docs/SDK. You're using their **cloud-hosted browser API** (not local Playwright).
- Fill in `create_session()` — call the Browser Use API to spin up a cloud browser
- Fill in `screenshot()` — returns base64 PNG of current browser state
- Fill in `_navigate()`, `_click()`, `_type()`, `_scroll()` — map to Browser Use SDK methods
- Fill in `close()` — tear down the session

**Test:** Run a standalone script that creates a Browser Use session, navigates to a URL, takes a screenshot, and prints the base64 length. If that works, the core is done.

**File:** `agent/tools/browser.py` — replace all 7 TODO stubs

### Task 1.2 — Test the Anthropic Provider End-to-End

**What to do:**
- The provider code is already written. Test it with a real API key.
- Write a quick test script: give it a screenshot (from Task 1.1) and a goal, see if it returns a valid `Decision` object
- Tune the system prompt in `agent/providers/anthropic_provider.py` if the model isn't producing well-structured JSON responses
- Consider: should the prompt be more specific about available actions? Does the model need examples?

**File:** `agent/providers/anthropic_provider.py` — the `SYSTEM_PROMPT` and `_build_prompt` function may need iteration

### Task 1.3 — Run the Agent Loop

**What to do:**
- Create a test config JSON file for `agent_runner.py`:
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
- Run: `python agent_runner.py --config test_config.json`
- The loop should: take screenshot → send to Claude → get a Decision → execute browser action → repeat
- The Convex calls are mocked (print to console) — that's fine for now. Focus on the agent actually doing things in a browser.

**Key risk:** The model might not produce valid JSON. You may need to add retry logic or a more forgiving parser in `_parse_response`.

**File:** `agent/agent_runner.py` — the main loop. May need tweaks to error handling.

### Task 1.4 — Integration with Event Bridge

**When:** After Person 2 delivers `orchestrator/event_bridge.py` with working Convex HTTP calls.

**What to do:**
- Import `EventBridge` in `agent_runner.py`
- Replace the three mock functions at the bottom:
  - `_push_event` → `bridge.push_event()`
  - `_fetch_pending_prompts` → `bridge.fetch_pending_prompts()`
  - `_complete_sandbox` → `bridge.complete_sandbox()`
- You'll need the Convex deployment URL and deploy key from Person 2

**File:** `agent/agent_runner.py` — bottom of file, three TODO functions

---

## Phase 2: Agent Tools + Multi-Model (Hours 8–16)

### Task 2.1 — AgentMail Integration (`agent/tools/email.py`)

**What to do:**
- Read the AgentMail SDK docs
- Fill in `check_inbox()` — fetch recent messages from the inbox
- Fill in `send()` — send an email (to, subject, body)
- Fill in `count_positive_replies()` — basic heuristic or LLM-based analysis of reply sentiment
- After each email action, the agent_runner already pushes an event via `_push_event`. Make sure the email data is included in the payload.

**Test:** Create an AgentMail inbox, send a test email, check if it arrives.

**File:** `agent/tools/email.py` — 3 TODOs

### Task 2.2 — Paylocus Integration (`agent/tools/payments.py`)

**What to do:**
- Read the Paylocus SDK docs
- Fill in `get_balance()` — current wallet balance
- Fill in `transact()` — make a payment (amount, description, recipient)
- Fill in `get_transaction_history()` — recent transactions
- The wallet should have safety caps (max single transaction, no negative balance)

**Test:** Create a test wallet, execute a small transaction, verify balance updates.

**File:** `agent/tools/payments.py` — 3 TODOs

### Task 2.3 — Goal Verifier (`agent/goal_verifier.py`)

**What to do:**
- `_scrape_follower_count()` — for the MVP, you can use Browser Use to navigate to the profile and parse the follower count from the page, or use a platform API if available
- `_check_revenue()` — call Paylocus `get_balance()` or total earned
- `_scrape_view_count()` — similar to follower count scraping
- `_count_positive_replies()` — delegate to `EmailTool.count_positive_replies()`

**Priority:** Focus on `_scrape_follower_count` first — that's the demo goal.

**File:** `agent/goal_verifier.py` — 4 TODOs

### Task 2.4 — Test OpenAI + Gemini Providers

**What to do:**
- The provider code is already written. Get API keys and test each one.
- Run the same test from Task 1.2 but with `gpt-4o` and `gemini-2-flash`
- Verify all three produce valid `Decision` objects from the same screenshot + goal
- This enables the model comparison demo (same goal, 3 models racing)

**Files:** `agent/providers/openai_provider.py`, `agent/providers/gemini_provider.py` — should work, just need testing

### Task 2.5 — Supermemory Integration (`agent/memory.py`)

**What to do:**
- Read the Supermemory SDK docs
- Fill in `add()` — store content with metadata (sandbox_id, goal_type, source)
- Fill in `search()` — retrieve relevant past context by query with filtering
- The agent_runner already calls these in the loop (step 6: LEARN, step 2: REMEMBER)

**Test:** Add a few memories, search for them, verify results are relevant.

**File:** `agent/memory.py` — 2 TODOs

---

## Phase 3: Polish + Differentiators (Hours 16–24)

### Task 3.1 — Laminar Tracing

**What to do:**
- Add `from laminar import Laminar, observe` to `agent_runner.py`
- Call `Laminar.initialize(project_api_key=os.environ["LAMINAR_KEY"])` at startup
- Wrap the `model.think()` call with `@observe(name="agent_reasoning_step")`
- This feeds the "Agent Thinking" panel on the frontend with decision traces

**File:** `agent/agent_runner.py` — add imports and decorator

### Task 3.2 — Prompt Incorporation

**What to do:**
- The agent_runner already fetches user prompts in step 3. Make sure the provider prompts reference them explicitly.
- Update `_build_prompt()` in each provider to give user suggestions more weight:
  - e.g., "A user suggested: 'try posting memes'. Consider this in your strategy."
- Store user prompts in Supermemory too so they persist across steps

**Files:** `agent/providers/anthropic_provider.py` (and the other two) — update `_build_prompt`

### Task 3.3 — Model Hot-Swap on Rate Limit

**What to do:**
- In `agent_runner.py`, catch rate limit errors from the current provider
- Fall back to the next provider: Claude → GPT → Gemini
- Update `ModelRouter` to support a `get_fallback()` method
- Log the swap as an agent event

**File:** `agent/model_router.py`, `agent/agent_runner.py`

### Task 3.4 — Error Recovery / Failure Loop Detection

**What to do:**
- Track if the agent is repeating the same action (e.g., clicking the same button 5 times)
- If action_history shows a loop, inject a "try something different" prompt
- Handle browser errors gracefully (page not found, timeout, etc.)
- If credits hit 0 or time expires, clean shutdown + push final event

**File:** `agent/agent_runner.py` — add loop detection logic in the main while loop

---

## Environment Variables You'll Need

```
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
GOOGLE_API_KEY=
BROWSER_USE_KEY=
AGENTMAIL_KEY=
PAYLOCUS_KEY=
SUPERMEMORY_KEY=
LAMINAR_KEY=
```

---

## Coordination with Person 2 (Iana)

| What | When | Details |
|------|------|---------|
| **Event bridge delivery** | End of Phase 1 | Person 2 gives you a working `EventBridge` class. You import it and replace mock calls. |
| **Convex URL + deploy key** | Start of Phase 1 | Person 2 deploys Convex and shares the URL + key for the bridge. |
| **Schema changes** | As needed | If you need a new event type or field, tell Person 2. They own the schema. |
| **Screenshot format** | Phase 1 | Agree on base64 PNG format and max size. Person 2's frontend needs to render it. |

---

## Priority Order (if you're short on time)

1. **Browser Use** — without this, no demo exists
2. **Anthropic provider tested** — the agent needs a brain
3. **Agent loop running** — observe → think → act cycle working
4. **Event bridge wired** — agent talks to Convex (real-time updates for frontend)
5. **AgentMail** — email makes the demo more interesting
6. **Paylocus** — payments make the demo dramatically more interesting
7. **Laminar** — "agent thinking" panel is a differentiator
8. **Other models** — enables comparison demo
9. **Supermemory** — learning across steps
10. **Goal verifier** — nice to have for auto-completing sandboxes
