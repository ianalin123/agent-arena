# Research Notes — Agent Architecture Patterns

Reference repos and sponsor docs reviewed for Agent Arena's design decisions.

## 1. Native Tool Use over JSON-in-text

**Sources**: AutoGPT, SuperAGI, Quoroom, Claude Agent SDK, Trading repo

Every production agent framework uses the LLM provider's **native tool calling / function calling API** instead of asking the LLM to respond with JSON in text. This is critical because:

- LLMs frequently wrap JSON in markdown fences (`` ```json ... ``` ``), breaking `json.loads()`
- Native tool use returns structured `tool_use` blocks with **guaranteed schema conformance**
- Anthropic offers `strict: true` for zero-deviation schema matching
- OpenAI has `strict: true` Structured Outputs for the same guarantee
- All three providers (Anthropic, OpenAI, Gemini) support tool definitions natively

**Our implementation**: Define tools (`browser_task`, `send_email`, `make_payment`, `finish_reasoning`) in `agent/tools/schemas.py` with per-provider converters. Each provider reads the structured tool call response — no JSON parsing needed.

## 2. Multi-Model Fallback Chain

**Source**: Trading repo (IgorGanapolsky/trading) — LLM Gateway with BATS framework

The trading repo routes all LLM calls through a unified gateway that supports multiple providers with automatic fallback. On rate limit or API error, it cascades to the next provider in the chain. Their budget-aware model selection (BATS) routes tasks to the cheapest model that can handle the complexity.

**Our implementation**: `ModelRouter.get_fallback_chain(primary_key)` returns `[primary, fallback1, fallback2]`. The agent runner wraps `_think_step` in a retry loop that swaps providers on failure.

## 3. Observe-Think-Act-Learn Loop

**Sources**: AutoGPT, SuperAGI, AgentGPT

The canonical agent loop is:
1. **Observe** — Gather context (screenshot, emails, wallet balance, memory)
2. **Think** — LLM reasons about the goal and decides on an action
3. **Act** — Execute the chosen tool (browser, email, payment)
4. **Learn** — Store the action + result in memory for future reference

Our existing `agent_runner.py` loop already follows this pattern. Supermemory integration provides the "Learn" step.

## 4. High-Level Task Delegation

**Sources**: Browser Use docs, AgentGPT

Agents should describe *what* to accomplish ("Post a tweet about AI agents"), not *how* to do it ("Click on the compose button, type text, click send"). Browser Use is itself an AI agent that handles low-level browser orchestration. Treating it as a low-level automation tool (our original approach) was architecturally wrong.

**Our implementation**: `BrowserTool.execute()` takes a `{"task": "natural language description"}` and delegates to `client.run(task, session_id=...)`.

## 5. Session Live Streaming

**Source**: Browser Use API v3 docs

Browser Use sessions expose:
- `session.live_url` — Real-time browser video stream (WebSocket-based)
- `client.sessions.create_share(session_id)` — Public shareable URL

This replaces screenshot-based streaming entirely. The frontend embeds an `<iframe>` pointing to the share URL for real-time browser visibility.

## 6. Sandbox Isolation

**Sources**: Daytona, E2B (awesome-ai-agents), SuperAGI

Each agent goal runs in an isolated sandbox with its own filesystem, processes, and network. This provides:
- Security: agents can't escape their sandbox
- Reproducibility: each run starts from a clean state
- Resource isolation: one agent can't starve another

**Our implementation**: Daytona SDK creates sandboxes, uploads agent code, installs dependencies, and starts `agent_runner.py` inside the sandbox. The `orchestrator/launch_sandbox.py` CLI handles the end-to-end flow.

## 7. Claude Agent SDK Patterns

**Source**: anthropics/claude-agent-sdk-python

The Claude Agent SDK uses `@tool()` decorators and MCP servers for custom tool registration. While we don't use the SDK directly (our agents use the Messages API), the pattern of defining tools with schemas is exactly what we adopt. Key patterns:
- Tools are defined with name, description, and input schema
- The agent loop processes `tool_use` content blocks and executes the corresponding tool
- Results are fed back as `tool_result` messages for multi-turn conversations

## 8. Swarm / Multi-Agent Patterns

**Source**: Quoroom (quoroom-ai/room)

Quoroom implements a queen/worker/quorum model with:
- Memory with semantic vector search (entities, observations, relations)
- Task scheduling (cron, one-time, webhook-triggered)
- Agent-to-agent messaging via inbox

While Agent Arena doesn't implement multi-agent swarms, the memory pattern (semantic search over past actions) and task lifecycle management patterns are relevant.

## Sponsor Tool Integration Summary

| Tool | Role | Key Insight |
|------|------|------------|
| **Browser Use** | Web automation | High-level task API + `live_url` for streaming |
| **Convex** | Reactive backend | Real-time subscriptions for live UI updates |
| **AgentMail** | Email for agents | Simple REST API, works as-is |
| **Supermemory** | Long-term memory | Semantic search over past actions and strategies |
| **Laminar** | Observability | Auto-instruments Anthropic/OpenAI SDK calls |
| **Daytona** | Sandbox isolation | Full lifecycle: create, upload, exec, destroy |
| **Locus/Paylocus** | Agent wallet | EVM wallet for agent payments (deferred) |
