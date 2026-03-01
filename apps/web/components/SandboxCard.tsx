"use client";

import Link from "next/link";
import { useMutation } from "convex/react";
import { api } from "@/convex/api";
import type { Id } from "@/convex/types";

interface SandboxCardProps {
  sandbox: {
    _id: string;
    goalDescription: string;
    model: string;
    currentProgress: number;
    targetValue: number;
    status: string;
    creditsRemaining?: number;
    expiresAt?: number;
  };
}

const MODEL_COLORS: Record<string, string> = {
  "claude-sonnet": "bg-orange-500",
  "claude-opus": "bg-orange-600",
  "gpt-4o": "bg-emerald-500",
  "gemini-2-flash": "bg-blue-500",
};

const STATUS_STYLES: Record<string, string> = {
  active: "bg-accent-green/15 text-accent-green",
  pending: "bg-accent-yellow/15 text-accent-yellow",
  completed: "bg-accent-blue/15 text-accent-blue",
  failed: "bg-accent-red/15 text-accent-red",
  paused: "bg-text-muted/15 text-text-muted",
};

const STATUS_TOOLTIPS: Record<string, string> = {
  active: "Agent is running and executing tasks",
  pending: "Sandbox is queued and waiting to start",
  completed: "Agent finished — goal was achieved",
  failed: "Agent stopped — goal was not achieved",
  paused: "Agent execution is paused",
};

export function SandboxCard({ sandbox }: SandboxCardProps) {
  const progressPct = Math.min(
    100,
    (sandbox.currentProgress / sandbox.targetValue) * 100
  );

  const modelColor = MODEL_COLORS[sandbox.model] ?? "bg-gray-500";
  const statusStyle = STATUS_STYLES[sandbox.status] ?? STATUS_STYLES.pending;

  const stopSandbox = useMutation(api.sandboxes.stop);
  const pauseSandbox = useMutation(api.sandboxes.pause);
  const resumeSandbox = useMutation(api.sandboxes.resume);

  const canStop = sandbox.status === "active" || sandbox.status === "paused" || sandbox.status === "pending";
  const canPause = sandbox.status === "active";
  const canResume = sandbox.status === "paused";

  return (
    <Link href={`/sandbox/${sandbox._id}`}>
      <div className="group rounded-xl border border-border bg-bg-card p-5 hover:bg-bg-card-hover hover:border-border-bright transition-all cursor-pointer">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${modelColor}`} />
            <span className="text-xs text-text-muted font-medium uppercase">
              {sandbox.model}
            </span>
          </div>
          <div className="relative group/tooltip">
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusStyle}`}
            >
              {sandbox.status}
            </span>
            <div className="absolute right-0 top-full mt-1.5 px-2.5 py-1.5 rounded-lg bg-bg-tertiary border border-border text-xs text-text-secondary whitespace-nowrap opacity-0 pointer-events-none group-hover/tooltip:opacity-100 transition-opacity z-10">
              {STATUS_TOOLTIPS[sandbox.status] ?? sandbox.status}
            </div>
          </div>
        </div>

        <h3 className="text-sm font-medium mb-4 leading-snug line-clamp-2 group-hover:text-white transition-colors">
          {sandbox.goalDescription}
        </h3>

        <div className="mb-2">
          <div className="h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-accent-purple to-accent-blue rounded-full transition-all duration-700"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-text-muted">
          <span>
            {sandbox.currentProgress.toLocaleString()} /{" "}
            {sandbox.targetValue.toLocaleString()}
          </span>
          <span>{progressPct.toFixed(0)}%</span>
        </div>

        {(canStop || canPause || canResume) && (
          <div className="flex gap-2 mt-3 pt-3 border-t border-border/50">
            {canPause && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  pauseSandbox({ sandboxId: sandbox._id as Id<"sandboxes"> });
                }}
                className="flex-1 px-2 py-1.5 rounded-lg text-[11px] font-medium bg-accent-yellow/10 text-accent-yellow hover:bg-accent-yellow/20 transition-colors"
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
                className="flex-1 px-2 py-1.5 rounded-lg text-[11px] font-medium bg-accent-green/10 text-accent-green hover:bg-accent-green/20 transition-colors"
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
                className="flex-1 px-2 py-1.5 rounded-lg text-[11px] font-medium bg-accent-red/10 text-accent-red hover:bg-accent-red/20 transition-colors"
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
