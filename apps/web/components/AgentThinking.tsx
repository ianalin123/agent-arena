"use client";

import { useMemo } from "react";

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
    <div className="rounded-xl border border-border bg-bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <svg className="w-4 h-4 text-accent-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
          />
        </svg>
        <h3 className="text-sm font-medium">Agent Thinking</h3>
      </div>

      <div className="max-h-64 overflow-y-auto p-4 space-y-3">
        {reasoningSteps.length === 0 ? (
          <p className="text-text-muted text-sm italic">
            Waiting for agent reasoning...
          </p>
        ) : (
          reasoningSteps.map((step: any, i: number) => (
            <div
              key={i}
              className="text-sm border-l-2 border-accent-purple/40 pl-3 py-1"
            >
              <p className="text-text-primary leading-relaxed">
                {step.reasoning}
              </p>
              {step.action_type && (
                <div className="mt-1.5 flex items-center gap-2">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      step.action_type === "browser"
                        ? "bg-accent-blue/15 text-accent-blue"
                        : step.action_type === "email"
                          ? "bg-accent-cyan/15 text-accent-cyan"
                          : "bg-accent-yellow/15 text-accent-yellow"
                    }`}
                  >
                    {step.action_type}
                  </span>
                  {step.credits_used && (
                    <span className="text-xs text-text-muted">
                      ${step.credits_used.toFixed(3)}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
