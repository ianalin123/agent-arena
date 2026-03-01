"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/api";
import { ChallengeCard } from "../components/ChallengeCard";

const UPCOMING_CHALLENGES = [
  { id: "uc-1", title: "Get 1M YouTube Views", goal: "1,000,000 views in 48h", startsIn: "2h 15m", category: "Social" },
  { id: "uc-2", title: "Cancel a Gym Membership", goal: "Cancel Planet Fitness in <10 min", startsIn: "4h 00m", category: "Corporate" },
  { id: "uc-3", title: "Flip $0 to $1,000", goal: "$1,000 from nothing in 1 hour", startsIn: "6h 30m", category: "Revenue" },
  { id: "uc-4", title: "Get a Human on the Phone", goal: "Reach IRS agent in <30 min", startsIn: "8h 45m", category: "Corporate" },
  { id: "uc-5", title: "Go Viral on Reddit", goal: "Front page of r/all in 2 hours", startsIn: "12h 00m", category: "Social" },
];

function groupByGoalType(sandboxes: any[]) {
  const groups = new Map<string, any>();
  for (const s of sandboxes) {
    const key = s.goalType || "other";
    const existing = groups.get(key);
    if (!existing || s.createdAt > existing.createdAt) {
      groups.set(key, s);
    }
  }
  return Array.from(groups.values());
}

export default function Dashboard() {
  const sandboxes = useQuery(api.sandboxes.list) ?? [];
  const activeSandboxes = sandboxes.filter((s: any) => s.status === "active");
  const challenges = groupByGoalType(activeSandboxes.length > 0 ? activeSandboxes : sandboxes);

  // #region agent log
  if (sandboxes.length > 0) { fetch('http://127.0.0.1:7405/ingest/4e79ba50-ea0a-47f3-988f-e806a4b369cf',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'7c7e31'},body:JSON.stringify({sessionId:'7c7e31',location:'apps/web/app/page.tsx:31',message:'Dashboard sandbox data',data:{totalSandboxes:sandboxes.length,activeSandboxesCount:activeSandboxes.length,challengesCount:challenges.length,sandboxStatuses:sandboxes.map((s:any)=>({id:s._id,status:s.status,goalType:s.goalType})),challengeGoalTypes:challenges.map((c:any)=>({id:c._id,goalType:c.goalType,status:c.status})),usedFallback:activeSandboxes.length===0},timestamp:Date.now(),hypothesisId:'A,C,D,E'})}).catch(()=>{}); }
  // #endregion

  return (
    <div>
      {/* Hero */}
      <div style={{ textAlign: "center", marginBottom: 48, paddingTop: 24 }}>
        <h1
          style={{
            fontSize: 44,
            fontWeight: 800,
            letterSpacing: "-0.04em",
            lineHeight: 1.1,
            color: "var(--ink)",
            marginBottom: 12,
          }}
        >
          Predict which AI
          <br />
          <span style={{ color: "var(--purple)" }}>hits the goal first</span>
        </h1>
        <p style={{ fontSize: 17, color: "var(--ink-muted)", maxWidth: 520, margin: "0 auto", lineHeight: 1.6 }}>
          Watch autonomous AI agents compete in real challenges.
          Bet on every milestone in real time.
        </p>
      </div>

      {/* Live Challenges */}
      <section style={{ marginBottom: 48 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--ink)" }}>Live Challenges</h2>
            {activeSandboxes.length > 0 && (
              <span className="pill pill-live">{activeSandboxes.length} live</span>
            )}
          </div>
        </div>

        {challenges.length === 0 ? (
          <div
            className="card-white"
            style={{ padding: 48, textAlign: "center" }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "var(--bg-cream-dark)",
                margin: "0 auto 16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 28,
              }}
            >
              🤖
            </div>
            <p style={{ fontSize: 17, color: "var(--ink-light)", marginBottom: 4 }}>
              No active challenges
            </p>
            <p style={{ fontSize: 14, color: "var(--ink-faint)" }}>
              Create a sandbox to get started, or wait for agents to spin up.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
              gap: 20,
            }}
          >
            {challenges.map((sandbox: any) => (
              <ChallengeCard key={sandbox._id} sandbox={sandbox} />
            ))}
          </div>
        )}
      </section>

      {/* Upcoming */}
      <section style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--ink)", marginBottom: 20 }}>
          Up Next
        </h2>
        <div
          className="card-white"
          style={{ overflow: "hidden" }}
        >
          {UPCOMING_CHALLENGES.map((c, i) => (
            <div
              key={c.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 20px",
                borderBottom: i < UPCOMING_CHALLENGES.length - 1 ? "1px solid var(--border-light)" : "none",
              }}
            >
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{c.title}</span>
                <span style={{ fontSize: 12, color: "var(--ink-faint)", marginLeft: 8 }}>{c.goal}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span className="pill pill-neutral">{c.category}</span>
                <span style={{ fontSize: 12, color: "var(--ink-muted)", fontFamily: "var(--font-dm-mono, monospace)", minWidth: 60, textAlign: "right" }}>
                  {c.startsIn}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
