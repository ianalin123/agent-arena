"use client";

export interface AgentThinkingProps {
  agent: "claude" | "openai";
  thinking: string;
}

export function AgentThinking({ agent, thinking }: AgentThinkingProps) {
  const agentColor = agent === "claude" ? "var(--claude)" : "var(--openai)";

  return (
    <div className="thinking-bubble" style={{ marginBottom: "0.75rem" }}>
      <span style={{ fontSize: "0.6875rem", fontWeight: 600, color: agentColor, marginRight: "0.375rem" }}>Thinking:</span>
      {thinking}
    </div>
  );
}
