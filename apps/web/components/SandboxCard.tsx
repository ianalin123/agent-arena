"use client";

import Link from "next/link";
import { useMutation } from "convex/react";
import { api } from "@/convex/api";
import type { Id } from "@/convex/types";

interface SandboxCardProps {
  sandbox: {
    _id: string;
    goalDescription: string;
    goalType?: string;
    model: string;
    currentProgress: number;
    targetValue: number;
    status: string;
    creditsRemaining?: number;
    expiresAt?: number;
  };
}

const STATUS_PILL: Record<string, string> = {
  active: "pill pill-live",
  pending: "pill pill-amber",
  completed: "pill pill-green",
  failed: "pill pill-red",
  paused: "pill pill-neutral",
};

export function SandboxCard({ sandbox }: SandboxCardProps) {
  const progressPct = Math.min(
    100,
    (sandbox.currentProgress / sandbox.targetValue) * 100
  );

  const stopSandbox = useMutation(api.sandboxes.stop);
  const pauseSandbox = useMutation(api.sandboxes.pause);
  const resumeSandbox = useMutation(api.sandboxes.resume);

  const canStop = sandbox.status === "active" || sandbox.status === "paused" || sandbox.status === "pending";
  const canPause = sandbox.status === "active";
  const canResume = sandbox.status === "paused";

  const href = sandbox.goalType
    ? `/challenge/${sandbox.goalType}`
    : `/sandbox/${sandbox._id}`;

  return (
    <Link href={href} style={{ textDecoration: "none" }}>
      <div
        className="card-white"
        style={{
          padding: 20,
          cursor: "pointer",
          transition: "all 0.2s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = "var(--shadow-md)";
          e.currentTarget.style.transform = "translateY(-1px)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = "var(--shadow-sm)";
          e.currentTarget.style.transform = "translateY(0)";
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
          <span className="label-caps">{sandbox.model}</span>
          <span className={STATUS_PILL[sandbox.status] ?? "pill pill-neutral"}>
            {sandbox.status === "active" ? "LIVE" : sandbox.status}
          </span>
        </div>

        <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", marginBottom: 16, lineHeight: 1.4 }}>
          {sandbox.goalDescription}
        </h3>

        <div style={{ marginBottom: 8 }}>
          <div className="progress-track">
            <div className="progress-fill-purple" style={{ width: `${progressPct}%` }} />
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--ink-faint)" }}>
          <span>
            {sandbox.currentProgress.toLocaleString()} / {sandbox.targetValue.toLocaleString()}
          </span>
          <span>{progressPct.toFixed(0)}%</span>
        </div>

        {(canStop || canPause || canResume) && (
          <div style={{ display: "flex", gap: 8, marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border-light)" }}>
            {canPause && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  pauseSandbox({ sandboxId: sandbox._id as Id<"sandboxes"> });
                }}
                className="btn-outline"
                style={{ flex: 1, padding: "6px 8px", fontSize: 11 }}
              >
                Pause
              </button>
            )}
            {canResume && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  resumeSandbox({ sandboxId: sandbox._id as Id<"sandboxes"> });
                }}
                className="btn-outline"
                style={{ flex: 1, padding: "6px 8px", fontSize: 11 }}
              >
                Resume
              </button>
            )}
            {canStop && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  stopSandbox({ sandboxId: sandbox._id as Id<"sandboxes"> });
                }}
                className="btn-outline"
                style={{ flex: 1, padding: "6px 8px", fontSize: 11 }}
              >
                Stop
              </button>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
