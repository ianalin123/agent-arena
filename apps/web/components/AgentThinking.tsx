"use client";

interface AgentThinkingProps {
  sandboxId: string;
}

export function AgentThinking({ sandboxId }: AgentThinkingProps) {
  // TODO: Subscribe to reasoning events from Convex (Laminar trace data)

  return (
    <div>
      <h3>Agent Thinking</h3>
      <div>
        {/* Reasoning steps will render here as a scrollable feed */}
        <p>Waiting for agent reasoning...</p>
      </div>
    </div>
  );
}
