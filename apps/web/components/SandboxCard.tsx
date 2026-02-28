"use client";

import Link from "next/link";

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

export function SandboxCard({ sandbox }: SandboxCardProps) {
  const progressPct = Math.min(
    100,
    (sandbox.currentProgress / sandbox.targetValue) * 100
  );

  const modelColor = MODEL_COLORS[sandbox.model] ?? "bg-gray-500";
  const statusStyle = STATUS_STYLES[sandbox.status] ?? STATUS_STYLES.pending;

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
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusStyle}`}
          >
            {sandbox.status}
          </span>
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
      </div>
    </Link>
  );
}
