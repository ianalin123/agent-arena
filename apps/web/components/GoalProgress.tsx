"use client";

import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/api";
import type { Id } from "@/convex/types";

interface GoalProgressProps {
  sandbox: any;
}

const MODEL_LABELS: Record<string, { name: string; color: string }> = {
  "claude-sonnet": { name: "Claude Sonnet", color: "var(--amber)" },
  "claude-opus": { name: "Claude Opus", color: "#C2410C" },
  "gpt-4o": { name: "GPT-4o", color: "var(--green)" },
  "gemini-2-flash": { name: "Gemini Flash", color: "var(--blue)" },
};

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

const STATUS_PILL_CLASSES: Record<string, string> = {
  active: "pill pill-live",
  pending: "pill pill-amber",
  completed: "pill pill-green",
  failed: "pill pill-red",
  paused: "pill pill-neutral",
};

export function GoalProgress({ sandbox }: GoalProgressProps) {
  const [remaining, setRemaining] = useState("");

  const stopSandbox = useMutation(api.sandboxes.stop);
  const pauseSandbox = useMutation(api.sandboxes.pause);
  const resumeSandbox = useMutation(api.sandboxes.resume);

  useEffect(() => {
    if (!sandbox) return;
    const update = () => {
      const left = Math.max(0, sandbox.expiresAt - Date.now()) / 1000;
      setRemaining(formatTime(left));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [sandbox]);

  if (!sandbox) return null;

  const progressPct = Math.min(
    100,
    (sandbox.currentProgress / sandbox.targetValue) * 100
  );
  const modelInfo = MODEL_LABELS[sandbox.model] ?? {
    name: sandbox.model,
    color: "var(--ink-muted)",
  };

  const canStop = sandbox.status === "active" || sandbox.status === "paused" || sandbox.status === "pending";
  const canPause = sandbox.status === "active";
  const canResume = sandbox.status === "paused";

  const handleStop = () => stopSandbox({ sandboxId: sandbox._id as Id<"sandboxes"> });
  const handlePause = () => pauseSandbox({ sandboxId: sandbox._id as Id<"sandboxes"> });
  const handleResume = () => resumeSandbox({ sandboxId: sandbox._id as Id<"sandboxes"> });

  return (
    <div className="card-white" style={{ padding: "20px" }}>
      <style>{`
        .goal-progress-btn-pause:hover { border-color: var(--amber); color: var(--amber); }
        .goal-progress-btn-resume:hover { border-color: var(--green); color: var(--green); }
        .goal-progress-btn-stop:hover { border-color: var(--red); color: var(--red); }
      `}</style>

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "12px" }}>
        <h3 className="label-caps">Goal</h3>
        <span className={STATUS_PILL_CLASSES[sandbox.status] ?? STATUS_PILL_CLASSES.pending}>
          {sandbox.status}
        </span>
      </div>

      <p style={{ fontSize: "16px", fontWeight: 600, color: "var(--ink)", marginBottom: "16px", lineHeight: 1.4 }}>
        {sandbox.goalDescription}
      </p>

      <div style={{ marginBottom: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "13px" }}>
          <span style={{ color: "var(--ink-muted)" }}>Progress</span>
          <span style={{ fontFamily: "var(--font-dm-mono, 'DM Mono'), monospace", fontWeight: 500, color: "var(--ink)" }}>
            {sandbox.currentProgress.toLocaleString()} / {sandbox.targetValue.toLocaleString()}
          </span>
        </div>
        <div className="progress-track">
          <div
            className="progress-fill-purple"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <p style={{ fontSize: "12px", color: "var(--ink-faint)", marginTop: "4px", textAlign: "right" }}>
          {progressPct.toFixed(1)}%
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
          <span style={{ color: "var(--ink-muted)" }}>Time Left</span>
          <span style={{ fontFamily: "var(--font-dm-mono, 'DM Mono'), monospace", fontWeight: 500, color: "var(--ink)" }}>
            {remaining || "--:--:--"}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
          <span style={{ color: "var(--ink-muted)" }}>Credits</span>
          <span style={{ fontFamily: "var(--font-dm-mono, 'DM Mono'), monospace", fontWeight: 500, color: "var(--ink)" }}>
            ${sandbox.creditsRemaining?.toFixed(2) ?? "0.00"}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
          <span style={{ color: "var(--ink-muted)" }}>Wallet</span>
          <span style={{ fontFamily: "var(--font-dm-mono, 'DM Mono'), monospace", fontWeight: 500, color: "var(--ink)" }}>
            ${sandbox.walletBalance?.toFixed(2) ?? "0.00"}
          </span>
        </div>
        {(sandbox.agentEarningsUsd != null && sandbox.agentEarningsUsd > 0) && (
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
            <span style={{ color: "var(--ink-muted)" }}>Agent earnings (USD)</span>
            <span style={{ fontFamily: "var(--font-dm-mono, 'DM Mono'), monospace", fontWeight: 500, color: "var(--green)" }}>
              ${sandbox.agentEarningsUsd.toFixed(2)}
            </span>
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px" }}>
          <span style={{ color: "var(--ink-muted)" }}>Model</span>
          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: modelInfo.color,
                flexShrink: 0,
              }}
            />
            <span style={{ fontFamily: "var(--font-dm-mono, 'DM Mono'), monospace", fontWeight: 500, color: "var(--ink)" }}>
              {modelInfo.name}
            </span>
          </span>
        </div>
      </div>

      {(canStop || canPause || canResume) && (
        <div style={{ marginTop: "20px", paddingTop: "16px", borderTop: "1px solid var(--border-light)", display: "flex", gap: "8px" }}>
          {canPause && (
            <button
              onClick={handlePause}
              className="btn-outline goal-progress-btn-pause"
              style={{ flex: 1, padding: "8px 12px", fontSize: "12px" }}
            >
              Pause
            </button>
          )}
          {canResume && (
            <button
              onClick={handleResume}
              className="btn-outline goal-progress-btn-resume"
              style={{ flex: 1, padding: "8px 12px", fontSize: "12px" }}
            >
              Resume
            </button>
          )}
          {canStop && (
            <button
              onClick={handleStop}
              className="btn-outline goal-progress-btn-stop"
              style={{ flex: 1, padding: "8px 12px", fontSize: "12px" }}
            >
              Stop
            </button>
          )}
        </div>
      )}
    </div>
  );
}
