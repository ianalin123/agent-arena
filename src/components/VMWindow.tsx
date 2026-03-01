"use client";

import { AgentThinking } from "./AgentThinking";
import { ActionLog, type ActionItem } from "./ActionLog";

export interface VMWindowProps {
  agent: "claude" | "openai";
  liveUrl?: string | null;
  shareUrl?: string | null;
  screenshotUrl?: string | null;
  agentStatus?: string;
  computeCost?: number;
  burnRate?: number;
  thinking?: string;
  actions?: ActionItem[];
}

export function VMWindow({
  agent,
  liveUrl,
  shareUrl,
  screenshotUrl,
  agentStatus,
  computeCost,
  burnRate,
  thinking,
  actions,
}: VMWindowProps) {
  const isClaude = agent === "claude";
  const agentColor = isClaude ? "var(--claude)" : "var(--openai)";
  const agentBg = isClaude ? "var(--claude-bg)" : "var(--openai-bg)";
  const agentName = isClaude ? "Claude" : "OpenAI";

  const statusLabel =
    agentStatus === "working" ? "Working" :
    agentStatus === "thinking" ? "Thinking..." :
    agentStatus === "success" ? "Success" :
    agentStatus === "error" ? "Retrying" :
    agentStatus ?? "Working";

  const iframeUrl = liveUrl ?? shareUrl ?? null;
  const lastActionText = actions?.[actions.length - 1]?.text ?? "Initializing...";

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: agentColor }} />
          <span style={{ fontWeight: 700, fontSize: "1rem", color: "var(--ink)" }}>{agentName}</span>
          <span style={{ fontSize: "0.75rem", fontWeight: 500, color: agentColor, background: agentBg, padding: "2px 8px", borderRadius: 999 }}>
            {statusLabel}
          </span>
        </div>
      </div>

      <div className="vm-window" style={{ marginBottom: "0.75rem" }}>
        <div className="vm-titlebar">
          <div className="vm-dot vm-dot-red" />
          <div className="vm-dot vm-dot-yellow" />
          <div className="vm-dot vm-dot-green" />
          <div className="vm-url-bar">{iframeUrl ?? screenshotUrl ?? agentName}</div>
        </div>
        <div className="vm-content" style={{ aspectRatio: "4 / 3", padding: iframeUrl ? 0 : "1rem" }}>
          {iframeUrl ? (
            <iframe
              src={iframeUrl}
              title={`${agentName} live view`}
              style={{ width: "100%", height: "100%", border: "none" }}
              sandbox="allow-scripts allow-same-origin"
            />
          ) : screenshotUrl ? (
            <img
              src={screenshotUrl}
              alt={`${agentName} screenshot`}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <div style={{ height: 12, background: "var(--cream-2)", borderRadius: 4, width: "60%" }} />
                <div style={{ height: 8, background: "var(--cream-2)", borderRadius: 4, width: "90%" }} />
                <div style={{ height: 8, background: "var(--cream-2)", borderRadius: 4, width: "75%" }} />
                <div style={{ height: 40, background: agentBg, borderRadius: 8, marginTop: "0.5rem", border: `1px solid ${isClaude ? "var(--claude-border)" : "var(--openai-border)"}`, display: "flex", alignItems: "center", padding: "0 0.75rem" }}>
                  <span style={{ fontSize: "0.75rem", color: agentColor, fontWeight: 600 }}>
                    {lastActionText}
                  </span>
                </div>
                <div style={{ height: 8, background: "var(--cream-2)", borderRadius: 4, width: "80%" }} />
                <div style={{ height: 8, background: "var(--cream-2)", borderRadius: 4, width: "55%" }} />
                <div style={{ height: 8, background: "var(--cream-2)", borderRadius: 4, width: "70%" }} />
              </div>
              <div style={{
                position: "absolute",
                bottom: 40,
                right: 40,
                width: 12,
                height: 12,
                background: agentColor,
                borderRadius: "0 50% 50% 50%",
                transform: "rotate(-45deg)",
                opacity: 0.7,
                animation: "cursor-move 4s ease-in-out infinite",
              }} />
            </>
          )}
        </div>
      </div>

      {thinking && <AgentThinking agent={agent} thinking={thinking} />}

      {actions && actions.length > 0 && <ActionLog agent={agent} actions={actions} />}

      {(computeCost != null || burnRate != null) && (
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.75rem", padding: "0.625rem 0.75rem", background: "var(--cream-2)", borderRadius: 8 }}>
          {computeCost != null && (
            <div>
              <div className="text-label">Compute spent</div>
              <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--ink)", fontFamily: "DM Mono, monospace" }}>${computeCost.toFixed(2)}</div>
            </div>
          )}
          {burnRate != null && (
            <div>
              <div className="text-label">Burn rate</div>
              <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--red)", fontFamily: "DM Mono, monospace" }}>${burnRate.toFixed(3)}/s</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
