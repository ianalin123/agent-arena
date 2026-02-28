# Agent Arena

A platform where users watch, bet on, and interact with AI agents pursuing verifiable goals in real-time sandboxed environments.

## What It Does

Multiple sandboxes run concurrently, each with one AI agent pursuing one goal. Users can spectate live browser streams, bet on outcomes, inject compute credits, and submit strategy prompts. Agents can browse the web, send emails, and make payments autonomously.

## Architecture

```
apps/web/       → Next.js frontend (Vercel)
convex/         → Reactive backend + database (Convex)
agent/          → Agent runtime — runs inside Daytona sandboxes
orchestrator/   → Sandbox lifecycle management
eval/           → HUD.ai benchmarking (stretch)
docs/           → Technical plan + work split
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

## Getting Started

### Frontend

```bash
cd apps/web
npm install
npm run dev
```

### Convex Backend

```bash
npx convex dev
```

### Agent (runs inside Daytona sandbox)

```bash
cd agent
pip install -r requirements.txt
python agent_runner.py --config config.json
```

## Docs

- [Technical Plan](docs/technical_plan.md) — full architecture, data model, and build phases
- [Work Split](docs/work_split.md) — concurrent development plan for the team
