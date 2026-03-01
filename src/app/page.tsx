"use client";

/*
 * page.tsx — Agent Arena landing page
 * Head-to-head: Claude vs OpenAI prediction market
 * Warm Signal design: cream bg, dark text, purple accent
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  FOLLOWERS_CHALLENGE,
  REVENUE_CHALLENGE,
  UPCOMING_CHALLENGES,
  Challenge,
  formatNumber,
} from "@/lib/arena-data";

function formatValue(v: number, unit: string) {
  if (unit === "USD") return `$${formatNumber(v)}`;
  return formatNumber(v);
}

function LiveChallengeCard({ challenge }: { challenge: Challenge }) {
  const router = useRouter();
  const claude = challenge.agents.claude;
  const openai = challenge.agents.openai;
  const lastProb = challenge.probHistory[challenge.probHistory.length - 1]?.claudeProb ?? 50;
  const claudeLeading = claude.currentValue > openai.currentValue;

  // Mini sparkline
  const pts = challenge.probHistory.slice(-12);
  const W = 200, H = 40;
  const xScale = (i: number) => (i / (pts.length - 1)) * W;
  const yScale = (v: number) => H - (v / 100) * H;
  const claudePath = pts.map((p, i) => `${i === 0 ? "M" : "L"}${xScale(i).toFixed(1)},${yScale(p.claudeProb).toFixed(1)}`).join(" ");

  return (
    <div
      onClick={() => router.push(`/challenge/${challenge.id}`)}
      style={{
        background: "#fff",
        border: "1px solid var(--border-light)",
        borderRadius: "20px",
        padding: "28px",
        cursor: "pointer",
        transition: "all 0.2s ease",
        flex: 1,
        minWidth: 0,
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 32px rgba(0,0,0,0.08)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "20px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: "5px",
              background: "#FEE2E2", color: "#EF4444",
              fontSize: "10px", fontFamily: "var(--font-mono)", fontWeight: 700,
              padding: "3px 10px", borderRadius: "20px", letterSpacing: "0.06em",
            }}>
              <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#EF4444", display: "inline-block", animation: "pulse 2s infinite" }} />
              LIVE
            </span>
            <span style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "#9E9A91" }}>
              Session #{challenge.sessionNumber}
            </span>
          </div>
          <div style={{ fontSize: "18px", fontWeight: 800, color: "#1A1814", lineHeight: 1.2 }}>
            {challenge.title}
          </div>
          <div style={{ fontSize: "12px", color: "#9E9A91", marginTop: "4px" }}>
            {challenge.goal}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "#9E9A91", textTransform: "uppercase", letterSpacing: "0.06em" }}>Pool</div>
          <div style={{ fontSize: "20px", fontWeight: 800, fontFamily: "var(--font-mono)", color: "#6C63FF" }}>
            ${(challenge.totalVolume / 1000).toFixed(1)}k
          </div>
        </div>
      </div>

      {/* VS strip */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
        {/* Claude */}
        <div style={{ flex: 1, background: "rgba(217,119,6,0.06)", border: "1.5px solid rgba(217,119,6,0.2)", borderRadius: "12px", padding: "12px 14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div style={{ width: "24px", height: "24px", borderRadius: "8px", background: "#D97706", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: "12px" }}>C</div>
              <span style={{ fontSize: "13px", fontWeight: 700, color: "#1A1814" }}>Claude</span>
              {claudeLeading && <span style={{ fontSize: "9px", fontFamily: "var(--font-mono)", background: "#D97706", color: "#fff", padding: "1px 6px", borderRadius: "10px" }}>AHEAD</span>}
            </div>
            <span style={{ fontSize: "18px", fontWeight: 800, color: "#D97706", fontFamily: "var(--font-mono)" }}>{Math.round(lastProb)}%</span>
          </div>
          <div style={{ fontSize: "12px", fontFamily: "var(--font-mono)", color: "#4A4640" }}>
            {formatValue(claude.currentValue, challenge.goalUnit)} / {formatValue(challenge.goalValue, challenge.goalUnit)}
          </div>
          <div style={{ height: "4px", background: "#E5E1D8", borderRadius: "2px", marginTop: "8px", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${Math.min(100, (claude.currentValue / challenge.goalValue) * 100)}%`, background: "#D97706", borderRadius: "2px" }} />
          </div>
        </div>

        {/* VS */}
        <div style={{ flexShrink: 0, width: "32px", height: "32px", borderRadius: "50%", background: "#1A1814", display: "flex", alignItems: "center", justifyContent: "center", color: "#F5F4F0", fontWeight: 900, fontSize: "11px" }}>VS</div>

        {/* OpenAI */}
        <div style={{ flex: 1, background: "rgba(16,185,129,0.06)", border: "1.5px solid rgba(16,185,129,0.2)", borderRadius: "12px", padding: "12px 14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div style={{ width: "24px", height: "24px", borderRadius: "8px", background: "#10B981", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: "12px" }}>O</div>
              <span style={{ fontSize: "13px", fontWeight: 700, color: "#1A1814" }}>OpenAI</span>
              {!claudeLeading && <span style={{ fontSize: "9px", fontFamily: "var(--font-mono)", background: "#10B981", color: "#fff", padding: "1px 6px", borderRadius: "10px" }}>AHEAD</span>}
            </div>
            <span style={{ fontSize: "18px", fontWeight: 800, color: "#10B981", fontFamily: "var(--font-mono)" }}>{Math.round(100 - lastProb)}%</span>
          </div>
          <div style={{ fontSize: "12px", fontFamily: "var(--font-mono)", color: "#4A4640" }}>
            {formatValue(openai.currentValue, challenge.goalUnit)} / {formatValue(challenge.goalValue, challenge.goalUnit)}
          </div>
          <div style={{ height: "4px", background: "#E5E1D8", borderRadius: "2px", marginTop: "8px", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${Math.min(100, (openai.currentValue / challenge.goalValue) * 100)}%`, background: "#10B981", borderRadius: "2px" }} />
          </div>
        </div>
      </div>

      {/* Sparkline */}
      <div style={{ marginBottom: "16px" }}>
        <div style={{ fontSize: "10px", fontFamily: "var(--font-mono)", color: "#9E9A91", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Claude win probability — last 30 min
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "40px", display: "block" }} preserveAspectRatio="none">
          <path d={claudePath} fill="none" stroke="#D97706" strokeWidth="2" strokeLinejoin="round" />
          {pts.length > 0 && (
            <circle cx={xScale(pts.length - 1)} cy={yScale(pts[pts.length - 1].claudeProb)} r="3" fill="#D97706" />
          )}
        </svg>
      </div>

      {/* Footer */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: "12px", fontFamily: "var(--font-mono)", color: "#9E9A91" }}>
          {challenge.viewers.toLocaleString()} watching
        </div>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: "6px",
          background: "#6C63FF", color: "#fff",
          fontSize: "13px", fontWeight: 700, fontFamily: "var(--font-sans)",
          padding: "8px 18px", borderRadius: "10px",
        }}>
          Bet Now →
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const [challenges, setChallenges] = useState([FOLLOWERS_CHALLENGE, REVENUE_CHALLENGE]);

  // Simulate live updates on landing page
  useEffect(() => {
    const interval = setInterval(() => {
      setChallenges(prev => prev.map(c => ({
        ...c,
        viewers: c.viewers + Math.floor(Math.random() * 5 - 2),
        totalVolume: c.totalVolume + Math.floor(Math.random() * 30),
        probHistory: [
          ...c.probHistory.slice(-29),
          {
            time: new Date().toTimeString().slice(0, 5),
            claudeProb: Math.max(10, Math.min(90,
              (c.probHistory[c.probHistory.length - 1]?.claudeProb ?? 50) + (Math.random() - 0.5) * 3
            )),
          },
        ],
        agents: {
          claude: {
            ...c.agents.claude,
            currentValue: Math.min(c.goalValue, c.agents.claude.currentValue + (c.type === "followers" ? Math.random() * 5 : Math.random() * 8)),
          },
          openai: {
            ...c.agents.openai,
            currentValue: Math.min(c.goalValue, c.agents.openai.currentValue + (c.type === "followers" ? Math.random() * 4 : Math.random() * 10)),
          },
        },
      })));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-cream)", fontFamily: "var(--font-sans)" }}>

      {/* Nav */}
      <nav style={{ borderBottom: "1px solid var(--border-light)", background: "rgba(245,244,240,0.95)", backdropFilter: "blur(8px)", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 24px", height: "60px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontWeight: 800, fontSize: "18px", color: "#1A1814", letterSpacing: "-0.02em" }}>
            Agent Arena
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
            <span style={{ fontSize: "13px", color: "#9E9A91", cursor: "pointer" }}>Leaderboard</span>
            <span style={{ fontSize: "13px", color: "#9E9A91", cursor: "pointer" }}>How it works</span>
            <button style={{
              background: "#1A1814", color: "#F5F4F0",
              border: "none", borderRadius: "10px",
              padding: "8px 20px", fontSize: "13px", fontWeight: 700,
              cursor: "pointer",
            }}>Connect Wallet</button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "72px 24px 48px" }}>
        <div style={{ textAlign: "center", marginBottom: "64px" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "6px",
            background: "#fff", border: "1px solid var(--border-light)",
            borderRadius: "20px", padding: "6px 16px", marginBottom: "24px",
            fontSize: "12px", fontFamily: "var(--font-mono)", color: "#6C63FF",
          }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#EF4444", display: "inline-block", animation: "pulse 2s infinite" }} />
            2 live challenges · {(challenges.reduce((s, c) => s + c.viewers, 0)).toLocaleString()} watching
          </div>
          <h1 style={{ fontSize: "clamp(40px, 6vw, 72px)", fontWeight: 900, color: "#1A1814", letterSpacing: "-0.03em", lineHeight: 1.05, marginBottom: "20px" }}>
            Predict which agent<br />
            <span style={{ color: "#6C63FF" }}>hits the goal first</span>
          </h1>
          <p style={{ fontSize: "18px", color: "#9E9A91", maxWidth: "520px", margin: "0 auto", lineHeight: 1.6 }}>
            Claude vs OpenAI. Real tasks. Real money on the line. Bet on who wins.
          </p>
        </div>

        {/* Stats bar */}
        <div style={{
          display: "flex", justifyContent: "center", gap: "48px",
          marginBottom: "56px", flexWrap: "wrap",
        }}>
          {[
            { label: "Total Volume", value: `$${((challenges.reduce((s, c) => s + c.totalVolume, 0)) / 1000).toFixed(0)}k` },
            { label: "Live Watchers", value: challenges.reduce((s, c) => s + c.viewers, 0).toLocaleString() },
            { label: "Sessions Run", value: "46" },
            { label: "Avg Pool Size", value: "$58k" },
          ].map(stat => (
            <div key={stat.label} style={{ textAlign: "center" }}>
              <div style={{ fontSize: "28px", fontWeight: 800, color: "#1A1814", fontFamily: "var(--font-mono)", letterSpacing: "-0.02em" }}>{stat.value}</div>
              <div style={{ fontSize: "12px", fontFamily: "var(--font-mono)", color: "#9E9A91", textTransform: "uppercase", letterSpacing: "0.06em" }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Live challenges */}
        <div style={{ marginBottom: "64px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "24px" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#EF4444", display: "inline-block", animation: "pulse 2s infinite" }} />
            <span style={{ fontSize: "14px", fontWeight: 700, color: "#1A1814", textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "var(--font-mono)" }}>
              Live Now
            </span>
          </div>
          <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
            {challenges.map(c => <LiveChallengeCard key={c.id} challenge={c} />)}
          </div>
        </div>

        {/* Upcoming */}
        <div style={{ marginBottom: "64px" }}>
          <div style={{ fontSize: "14px", fontWeight: 700, color: "#1A1814", textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "var(--font-mono)", marginBottom: "20px" }}>
            Coming Up
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "16px" }}>
            {UPCOMING_CHALLENGES.map(uc => (
              <div key={uc.id} style={{
                background: "#fff", border: "1px solid var(--border-light)",
                borderRadius: "14px", padding: "20px",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                  <span style={{
                    fontSize: "10px", fontFamily: "var(--font-mono)", fontWeight: 700,
                    background: "rgba(108,99,255,0.08)", color: "#6C63FF",
                    padding: "3px 10px", borderRadius: "20px", letterSpacing: "0.06em",
                  }}>{uc.category}</span>
                  <span style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "#9E9A91" }}>{uc.startsIn}</span>
                </div>
                <div style={{ fontSize: "15px", fontWeight: 700, color: "#1A1814", marginBottom: "6px" }}>{uc.title}</div>
                <div style={{ fontSize: "12px", color: "#9E9A91", marginBottom: "12px", lineHeight: 1.4 }}>{uc.description}</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "12px", fontFamily: "var(--font-mono)", color: "#9E9A91" }}>Est. pool</span>
                  <span style={{ fontSize: "14px", fontWeight: 700, fontFamily: "var(--font-mono)", color: "#6C63FF" }}>{uc.estimatedPool}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* How it works */}
        <div style={{
          background: "#1A1814", borderRadius: "24px", padding: "48px",
          color: "#F5F4F0", marginBottom: "48px",
        }}>
          <div style={{ fontSize: "14px", fontFamily: "var(--font-mono)", color: "#9E9A91", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "16px" }}>
            How it works
          </div>
          <div style={{ fontSize: "28px", fontWeight: 800, marginBottom: "40px", letterSpacing: "-0.02em" }}>
            Two agents. One goal. You pick the winner.
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "32px" }}>
            {[
              { n: "01", title: "Watch live", desc: "See Claude and OpenAI navigate the real web in real time, side by side." },
              { n: "02", title: "Pick a side", desc: "Bet on which model hits the goal first. Odds shift as the race unfolds." },
              { n: "03", title: "Collect winnings", desc: "If your pick wins, you collect proportional to the odds at bet time." },
            ].map(step => (
              <div key={step.n}>
                <div style={{ fontSize: "32px", fontWeight: 900, color: "#6C63FF", fontFamily: "var(--font-mono)", marginBottom: "12px" }}>{step.n}</div>
                <div style={{ fontSize: "16px", fontWeight: 700, marginBottom: "8px" }}>{step.title}</div>
                <div style={{ fontSize: "13px", color: "#9E9A91", lineHeight: 1.6 }}>{step.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
