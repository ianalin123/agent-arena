"use client";

import { useMemo } from "react";
import { deriveEventLabel } from "@/lib/event-labels";

interface AgentThinkingProps {
  sandboxId: string;
  events?: any[];
}

export function AgentThinking({ sandboxId, events = [] }: AgentThinkingProps) {
  const reasoningSteps = useMemo(() => {
    return events
      .filter((e: any) => e.eventType === "reasoning")
      .map((e: any) => {
        try {
          return { ...JSON.parse(e.payload), timestamp: e.timestamp };
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .slice(0, 10);
  }, [events]);

  return (
    <div className="card-white" style={{ overflow: "hidden" }}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border-light)", display: "flex", alignItems: "center", gap: 8 }}>
        <svg style={{ width: 16, height: 16, color: "var(--purple)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
          />
        </svg>
        <h3 className="label-caps">Agent Thinking</h3>
      </div>

      <div style={{ maxHeight: 256, overflowY: "auto", padding: 16 }}>
        {reasoningSteps.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--ink-faint)", fontStyle: "italic" }}>
            Waiting for agent reasoning...
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {reasoningSteps.map((step: any, i: number) => {
              const rawPayload = JSON.stringify(step);
              const { label, pillClass } = deriveEventLabel("reasoning", rawPayload);

              return (
                <div
                  key={i}
                  style={{
                    borderLeft: "2px solid var(--purple-light)",
                    paddingLeft: 12,
                    paddingTop: 4,
                    paddingBottom: 4,
                  }}
                >
                  <p style={{ fontSize: 13, color: "var(--ink)", lineHeight: 1.5 }}>
                    {step.reasoning}
                  </p>
                  {step.action_type && (
                    <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8 }}>
                      <span className={`pill ${pillClass}`}>{label}</span>
                      {step.credits_used != null && (
                        <span style={{ fontSize: 11, color: "var(--ink-faint)" }}>
                          ${step.credits_used.toFixed(3)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
