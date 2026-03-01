"use client";

import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/api";
import type { Id } from "@/convex/types";

interface GoalProgressProps {
  sandbox: any;
}

const MODEL_LABELS: Record<string, { name: string; color: string }> = {
  "claude-sonnet": { name: "Claude Sonnet", color: "bg-orange-500" },
  "claude-opus": { name: "Claude Opus", color: "bg-orange-600" },
  "gpt-4o": { name: "GPT-4o", color: "bg-emerald-500" },
  "gemini-2-flash": { name: "Gemini Flash", color: "bg-blue-500" },
};

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

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
    color: "bg-gray-500",
  };

  const statusColors: Record<string, string> = {
    active: "bg-accent-green/15 text-accent-green",
    pending: "bg-accent-yellow/15 text-accent-yellow",
    completed: "bg-accent-blue/15 text-accent-blue",
    failed: "bg-accent-red/15 text-accent-red",
    paused: "bg-text-muted/15 text-text-muted",
  };

  const canStop = sandbox.status === "active" || sandbox.status === "paused" || sandbox.status === "pending";
  const canPause = sandbox.status === "active";
  const canResume = sandbox.status === "paused";

  const handleStop = () => stopSandbox({ sandboxId: sandbox._id as Id<"sandboxes"> });
  const handlePause = () => pauseSandbox({ sandboxId: sandbox._id as Id<"sandboxes"> });
  const handleResume = () => resumeSandbox({ sandboxId: sandbox._id as Id<"sandboxes"> });

  return (
    <div className="rounded-xl border border-border bg-bg-card p-5">
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-sm font-medium text-text-secondary uppercase tracking-wider">
          Goal
        </h3>
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            statusColors[sandbox.status] ?? statusColors.pending
          }`}
        >
          {sandbox.status}
        </span>
      </div>

      <p className="text-base font-medium mb-4 leading-snug">
        {sandbox.goalDescription}
      </p>

      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1.5">
          <span className="text-text-secondary">Progress</span>
          <span className="font-mono font-medium">
            {sandbox.currentProgress.toLocaleString()} /{" "}
            {sandbox.targetValue.toLocaleString()}
          </span>
        </div>
        <div className="h-2.5 bg-bg-tertiary rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-accent-purple to-accent-blue rounded-full transition-all duration-700 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <p className="text-xs text-text-muted mt-1 text-right">
          {progressPct.toFixed(1)}%
        </p>
      </div>

      <div className="space-y-2.5 text-sm">
        <div className="flex justify-between">
          <span className="text-text-secondary">Time Left</span>
          <span className="font-mono">{remaining || "--:--:--"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-secondary">Credits</span>
          <span className="font-mono">
            ${sandbox.creditsRemaining?.toFixed(2) ?? "0.00"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-secondary">Wallet</span>
          <span className="font-mono">
            ${sandbox.walletBalance?.toFixed(2) ?? "0.00"}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-text-secondary">Model</span>
          <span className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${modelInfo.color}`} />
            <span className="text-sm">{modelInfo.name}</span>
          </span>
        </div>
      </div>

      {(canStop || canPause || canResume) && (
        <div className="mt-5 pt-4 border-t border-border flex gap-2">
          {canPause && (
            <button
              onClick={handlePause}
              className="flex-1 px-3 py-2 rounded-lg text-xs font-medium bg-accent-yellow/15 text-accent-yellow hover:bg-accent-yellow/25 transition-colors"
            >
              Pause
            </button>
          )}
          {canResume && (
            <button
              onClick={handleResume}
              className="flex-1 px-3 py-2 rounded-lg text-xs font-medium bg-accent-green/15 text-accent-green hover:bg-accent-green/25 transition-colors"
            >
              Resume
            </button>
          )}
          {canStop && (
            <button
              onClick={handleStop}
              className="flex-1 px-3 py-2 rounded-lg text-xs font-medium bg-accent-red/15 text-accent-red hover:bg-accent-red/25 transition-colors"
            >
              Stop
            </button>
          )}
        </div>
      )}
    </div>
  );
}
