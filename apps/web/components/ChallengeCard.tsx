"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/api";
import type { Id } from "@/convex/types";

interface ChallengeCardProps {
  sandbox: {
    _id: string;
    goalDescription: string;
    goalType: string;
    model: string;
    currentProgress: number;
    targetValue: number;
    status: string;
    creditsRemaining?: number;
    expiresAt?: number;
    createdAt?: number;
  };
}

function MiniChart({ color = "#6C63FF" }: { color?: string }) {
  const points = [40, 45, 38, 52, 48, 61, 58, 67, 63, 71];
  const w = 120,
    h = 40;
  const min = Math.min(...points) - 5;
  const max = Math.max(...points) + 5;
  const xs = points.map((_, i) => (i / (points.length - 1)) * w);
  const ys = points.map((p) => h - ((p - min) / (max - min)) * h);
  const d = xs
    .map((x, i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${ys[i].toFixed(1)}`)
    .join(" ");
  const fill = `${d} L ${w} ${h} L 0 ${h} Z`;

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: "block" }}>
      <defs>
        <linearGradient id={`mg-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={fill} fill={`url(#mg-${color.replace("#", "")})`} />
      <path
        d={d}
        stroke={color}
        strokeWidth={2}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={xs[xs.length - 1]} cy={ys[ys.length - 1]} r={3} fill={color} />
    </svg>
  );
}

function formatGoalType(goalType: string): string {
  return goalType
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function ChallengeCard({ sandbox }: ChallengeCardProps) {
  const odds = useQuery(api.betting.getOdds, {
    sandboxId: sandbox._id as Id<"sandboxes">,
  });

  const progressPct = Math.min(100, (sandbox.currentProgress / sandbox.targetValue) * 100);
  const isLive = sandbox.status === "active";
  const yesPct = odds ? Math.round(odds.yesPct * 100) : 50;
  const totalPool = odds?.totalPool ?? 0;

  return (
    <Link href={`/challenge/${sandbox.goalType}`} style={{ textDecoration: "none" }}>
      <div
        className="card-white"
        style={{
          padding: "24px",
          cursor: "pointer",
          transition: "all 0.2s ease",
          position: "relative",
          overflow: "hidden",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = "var(--shadow-md)";
          e.currentTarget.style.transform = "translateY(-2px)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = "var(--shadow-sm)";
          e.currentTarget.style.transform = "translateY(0)";
        }}
      >
        {/* Header row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <span className="label-caps" style={{ marginBottom: 4, display: "block" }}>
              {formatGoalType(sandbox.goalType)}
            </span>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--ink)", letterSpacing: "-0.02em", lineHeight: 1.3 }}>
              {sandbox.goalDescription}
            </h3>
          </div>
          <span className={`pill ${isLive ? "pill-live" : sandbox.status === "completed" ? "pill-green" : sandbox.status === "failed" ? "pill-red" : "pill-neutral"}`}>
            {isLive ? "LIVE" : sandbox.status.toUpperCase()}
          </span>
        </div>

        {/* Progress */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
            <span style={{ fontSize: 24, fontWeight: 800, color: "var(--ink)", letterSpacing: "-0.03em" }}>
              {sandbox.currentProgress.toLocaleString()}
            </span>
            <span style={{ fontSize: 13, color: "var(--ink-muted)" }}>
              / {sandbox.targetValue.toLocaleString()}
            </span>
          </div>
          <div className="progress-track">
            <div className="progress-fill-purple" style={{ width: `${progressPct}%` }} />
          </div>
        </div>

        {/* Bottom row: odds + chart */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
              <span className="pill pill-green" style={{ fontSize: 12, fontWeight: 700 }}>
                YES {yesPct}%
              </span>
              <span className="pill pill-red" style={{ fontSize: 12, fontWeight: 700 }}>
                NO {100 - yesPct}%
              </span>
            </div>
            {totalPool > 0 && (
              <span style={{ fontSize: 11, color: "var(--ink-faint)" }}>
                ${totalPool.toLocaleString()} volume
              </span>
            )}
          </div>
          <MiniChart />
        </div>

        {/* Model tag */}
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border-light)" }}>
          <span className="label-caps">{sandbox.model}</span>
        </div>
      </div>
    </Link>
  );
}
