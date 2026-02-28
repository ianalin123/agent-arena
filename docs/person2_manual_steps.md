# Person 2 Plan — Steps You Must Do Manually

This file lists steps that cannot be fully automated and require you to run commands, create accounts, or share credentials.

---

## Phase 1: Deploy + Wire the Foundation

### 1.1 Initialize and Deploy Convex (required first)

1. **Install Convex CLI** (if needed): `npm install -g convex`
2. **Log in**: `npx convex login`
3. **From project root**, run:
   ```bash
   npx convex dev
   ```
4. This creates `convex/_generated/` and deploys the schema. Note the **deployment URL** and create a **Deploy key** in the Convex dashboard (Settings → Deploy key).
5. **Share with the team**: Give Person 1 (Sissi) and Max the **Convex deployment URL** and **deploy key** so they can use the Event Bridge and frontend provider.

**Optional:** If Convex uses a different auth header for the deploy key (e.g. `Convex <key>` instead of `Bearer <key>`), set the deploy key in the orchestrator env and adjust `orchestrator/event_bridge.py` if needed.

---

### 1.2 Test Convex with seed data

1. In the **Convex dashboard**, open the **Data** tab and confirm all 9 tables exist.
2. **Create a test user** (no `createUser` in the UI by default): use the **Functions** tab and run `users:create` with args e.g. `{ "name": "Test User", "email": "test@example.com", "initialBalance": 1000 }`.
3. Run through the critical path (dashboard or a small script):
   - `sandboxes.create` with test data (use the user id from step 2 as `userId`).
   - `events.push` with the new sandbox id.
   - `sandboxes.updateProgress` and `betting.placeBet`.
   - `sandboxes.get` and confirm you get sandbox + pool + events + payments.

---

### 1.3 Test the Event Bridge

1. Set env vars: `CONVEX_URL`, `CONVEX_DEPLOY_KEY` (or `CONVEX_DEPLOY_KEY` as used in your app).
2. Run a small Python script that:
   - Instantiates `EventBridge(convex_url, deploy_key)`
   - Calls `await bridge.push_event(sandbox_id, "test", { "message": "hello" })`
   - Uses a real `sandbox_id` from the dashboard.
3. In the Convex dashboard, confirm the new event appears in `agentEvents`.

---

### 1.4 Daytona sandbox manager

1. **Get Daytona credentials**: Sign up at [daytona.io](https://daytona.io) and obtain `DAYTONA_API_KEY` (and optionally `DAYTONA_API_URL`).
2. **Install the Daytona SDK** in the orchestrator env:
   ```bash
   pip install daytona
   ```
3. **Start the agent process**: `SandboxManager.create_sandbox()` only creates the sandbox and uploads config/agent code. You must start the agent process yourself (e.g. via a session with `run_async=True` or a separate runner script) so it runs in the background.
4. **Test**: Create a sandbox, confirm it appears in the Daytona dashboard, then destroy it and confirm it is removed.

---

### 1.5 Orchestrator `/launch` endpoint and env

1. **Implement an HTTP endpoint** (e.g. in the Python orchestrator) that:
   - Accepts `POST /launch` with body `{ sandboxId, goalDescription, model, timeLimit, config }`.
   - Uses `SandboxManager` to create a Daytona sandbox.
   - Creates an AgentMail inbox and Paylocus wallet (or stubs if those services are not ready).
   - Returns `{ daytonaSandboxId, agentmailInboxId, paylocusWalletId, walletBalance? }`.
2. **Set Convex env** for the Convex deployment:
   ```bash
   npx convex env set CONVEX_ORCHESTRATOR_URL https://your-orchestrator-host/launch
   ```
   (Use the base URL of your orchestrator so the action can call `POST {CONVEX_ORCHESTRATOR_URL}/launch`.)

Alternatively, skip the Convex `sandboxes.launch` action and have your orchestrator listen for new sandbox records (e.g. poll or use a Convex webhook if you add one), then call the Convex mutation `sandboxes.updateAfterLaunch` with the IDs after creating the Daytona sandbox and other resources.

---

## Phase 2–3: After implementation

### Completing a sandbox and settling bets

When an agent run finishes (success or failure), **two Convex calls** are required:

1. **Update sandbox status**: `sandboxes.complete` with `{ sandboxId, outcome: "success" | "failed" }`.
2. **Settle bets**: `betting.settle` with `{ sandboxId, outcome: "success" | "failed" }`.

If the agent only calls `sandboxes.complete` (e.g. via the event bridge), you must ensure `betting.settle` is called as well (e.g. from your orchestrator or from a Convex action triggered on completion). **Expired** sandboxes are auto-settled as "failed" by the cron (every minute) via `sandboxes.autoSettleExpired`.

---

### HUD.ai (stretch)

- `eval/benchmark.py` is still a stub. To integrate HUD.ai, add your API key and implement `log_session` / `get_model_comparison` using the HUD.ai API docs.

---

### Screenshot size

- Agree with Person 1 on screenshot format (e.g. base64 PNG, max ~500KB) so the `agentEvents` table does not grow too large.

---

## Environment variables summary

| Variable | Where | Purpose |
|----------|--------|--------|
| `CONVEX_URL` | Orchestrator / Agent | Convex deployment URL for Event Bridge |
| `CONVEX_DEPLOY_KEY` | Orchestrator / Agent | Deploy key for Convex HTTP API |
| `DAYTONA_API_KEY` | Orchestrator | Daytona SDK (SandboxManager) |
| `DAYTONA_API_URL` | Orchestrator (optional) | Override Daytona API base URL |
| `CONVEX_ORCHESTRATOR_URL` | Convex (dashboard env) | Base URL for `sandboxes.launch` action to call your `/launch` endpoint |
