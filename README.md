# Agent Arena

A platform where users watch, bet on, and interact with AI agents pursuing verifiable goals in real-time sandboxed environments.

## What It Does

Multiple sandboxes run concurrently, each with one AI agent pursuing one goal. Users can spectate live browser streams, bet on outcomes, inject compute credits, and submit strategy prompts. Agents can browse the web, send emails, and make payments autonomously.

## Architecture

```
apps/web/       → Next.js frontend (Vercel)
convex/         → Reactive backend + database (Convex)
agent/          → Agent runtime — runs inside Daytona sandboxes
orchestrator/   → Sandbox lifecycle management (FastAPI)
eval/           → HUD.ai benchmarking (stretch)
docs/           → Technical plan + work split
scripts/        → Seed and test scripts
```

## Sponsor Stack

| Sponsor | Role |
|---------|------|
| **Browser Use** | Cloud browser automation for agents |
| **Convex** | Reactive backend + real-time database |
| **Daytona** | Secure sandboxed environments |
| **Laminar** | Agent tracing + observability |
| **Supermemory** | Long-term agent context |
| **AgentMail** | Email capabilities for agents |
| **Paylocus** | Programmable agent wallets |
| **Vercel** | Frontend hosting |
| **Anthropic** | Claude models |
| **OpenAI** | GPT-4o model |
| **Google DeepMind** | Gemini model |

## Prerequisites

- **Node.js** >= 18
- **Python** >= 3.10
- A [Convex](https://convex.dev) account (free tier works)
- (Optional) API keys for LLM providers, Browser Use, AgentMail, etc.

## Getting Started

### 1. Install dependencies

```bash
# Frontend
cd apps/web
npm install

# Orchestrator (optional — only needed for launching sandboxes)
cd orchestrator
pip install -r requirements.txt
```

### 2. Configure environment variables

```bash
# Frontend — set your Convex deployment URL
cd apps/web
cp .env.local.example .env.local
# Edit .env.local and set NEXT_PUBLIC_CONVEX_URL to your Convex deployment URL
```

### 3. Start Convex dev server

From the repo root:

```bash
npx convex dev
```

This starts the Convex backend, syncs your schema, and generates types. Keep this running in a terminal.

### 4. Start the frontend

In a second terminal:

```bash
cd apps/web
npm run dev
```

The frontend will be available at **http://localhost:3000**.

### 5. Seed demo data (optional)

To populate the database with demo sandboxes for testing, set `CONVEX_URL` and `CONVEX_DEPLOY_KEY` in `agent/.env`, then:

```bash
python scripts/seed_convex.py
```

### 6. Start the orchestrator (optional)

The orchestrator manages Daytona sandbox creation. Only needed if you want to launch real agent sessions:

```bash
cd orchestrator
uvicorn server:app --host 0.0.0.0 --port 8000
```

## Deploying to Vercel

### Option A: Vercel CLI

```bash
# From the repo root
npx vercel
```

The root `vercel.json` is configured to build from `apps/web/`.

### Option B: Vercel Dashboard (GitHub integration)

1. Import your GitHub repo in [Vercel](https://vercel.com/new)
2. Set **Root Directory** to `apps/web`
3. Set the following environment variable:
   - `NEXT_PUBLIC_CONVEX_URL` — your Convex deployment URL (e.g. `https://your-project.convex.cloud`)
4. Deploy

### Environment Variables for Vercel

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_CONVEX_URL` | Yes | Convex deployment URL |

## Development Notes

- The frontend uses `anyApi` stubs for Convex types (`apps/web/convex/api.ts`). This works at runtime but does not provide full TypeScript safety. Once `npx convex dev` generates types, you can swap in the generated API for strict types.
- The Convex backend at `convex/` handles all persistent storage and real-time subscriptions — no separate database is needed.
- The orchestrator at `orchestrator/` is a Python FastAPI server that creates Daytona sandboxes and launches agent processes.

## Docs

- [Technical Plan](docs/technical_plan.md) — full architecture, data model, and build phases
- [Work Split](docs/work_split.md) — concurrent development plan for the team
- [Person 1 Plan — Sissi](docs/plan_person1_agent_runtime.md) — Agent Runtime track (agent/, providers, tools)
- [Person 2 Plan — Iana](docs/plan_person2_convex_platform.md) — Convex Platform track (convex/, orchestrator/)
