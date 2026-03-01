"use client";

/*
 * /challenge/[id]/page.tsx
 * Head-to-head: Claude vs OpenAI — who hits the target first?
 * Single bet market, two agent lanes, live probability chart
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  FOLLOWERS_CHALLENGE,
  REVENUE_CHALLENGE,
  Challenge,
  AgentState,
  ProbabilityPoint,
  formatNumber,
} from "@/lib/arena-data";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatValue(v: number, unit: string) {
  if (unit === "USD") return `$${formatNumber(v)}`;
  return formatNumber(v);
}

function formatElapsed(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m.toString().padStart(2, "0")}m`;
  return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
}

// ─── Probability Chart ────────────────────────────────────────────────────────

function ProbChart({ history, claudeColor, openaiColor }: {
  history: ProbabilityPoint[];
  claudeColor: string;
  openaiColor: string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const W = 600, H = 140;
  const PAD = { top: 12, right: 12, bottom: 28, left: 36 };
  const cW = W - PAD.left - PAD.right;
  const cH = H - PAD.top - PAD.bottom;

  const pts = history;
  const xScale = (i: number) => PAD.left + (i / (pts.length - 1)) * cW;
  const yScale = (v: number) => PAD.top + (1 - v / 100) * cH;

  const claudePath = pts.map((p, i) => `${i === 0 ? "M" : "L"}${xScale(i).toFixed(1)},${yScale(p.claudeProb).toFixed(1)}`).join(" ");
  const openaiPath = pts.map((p, i) => `${i === 0 ? "M" : "L"}${xScale(i).toFixed(1)},${yScale(100 - p.claudeProb).toFixed(1)}`).join(" ");

  // Area fills
  const claudeArea = claudePath + ` L${xScale(pts.length - 1).toFixed(1)},${(PAD.top + cH).toFixed(1)} L${PAD.left.toFixed(1)},${(PAD.top + cH).toFixed(1)} Z`;
  const openaiArea = openaiPath + ` L${xScale(pts.length - 1).toFixed(1)},${PAD.top.toFixed(1)} L${PAD.left.toFixed(1)},${PAD.top.toFixed(1)} Z`;

  const lastClaude = pts[pts.length - 1]?.claudeProb ?? 50;
  const lastOpenai = 100 - lastClaude;

  return (
    <div style={{ width: "100%", position: "relative" }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: "100%", height: "auto", display: "block" }}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="claudeGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={claudeColor} stopOpacity="0.25" />
            <stop offset="100%" stopColor={claudeColor} stopOpacity="0.03" />
          </linearGradient>
          <linearGradient id="openaiGrad" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor={openaiColor} stopOpacity="0.25" />
            <stop offset="100%" stopColor={openaiColor} stopOpacity="0.03" />
          </linearGradient>
        </defs>

        {/* 50% midline */}
        <line
          x1={PAD.left} y1={PAD.top + cH / 2}
          x2={PAD.left + cW} y2={PAD.top + cH / 2}
          stroke="#E5E1D8" strokeWidth="1" strokeDasharray="4,4"
        />

        {/* Area fills */}
        <path d={claudeArea} fill="url(#claudeGrad)" />
        <path d={openaiArea} fill="url(#openaiGrad)" />

        {/* Lines */}
        <path d={claudePath} fill="none" stroke={claudeColor} strokeWidth="2" strokeLinejoin="round" />
        <path d={openaiPath} fill="none" stroke={openaiColor} strokeWidth="2" strokeLinejoin="round" />

        {/* Live dots */}
        <circle cx={xScale(pts.length - 1)} cy={yScale(lastClaude)} r="4" fill={claudeColor} />
        <circle cx={xScale(pts.length - 1)} cy={yScale(lastOpenai)} r="4" fill={openaiColor} />

        {/* Y axis labels */}
        {[0, 25, 50, 75, 100].map(v => (
          <text key={v} x={PAD.left - 6} y={yScale(v) + 4} textAnchor="end"
            fontSize="9" fill="#9E9A91" fontFamily="var(--font-mono)">
            {v}%
          </text>
        ))}

        {/* X axis labels */}
        {pts.filter((_, i) => i % 3 === 0).map((p, idx) => {
          const origIdx = idx * 3;
          return (
            <text key={p.time} x={xScale(origIdx)} y={H - 6} textAnchor="middle"
              fontSize="9" fill="#9E9A91" fontFamily="var(--font-mono)">
              {p.time}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

// ─── Agent Lane ───────────────────────────────────────────────────────────────

function AgentLane({ agent, goalValue, goalUnit, isLeading }: {
  agent: AgentState;
  goalValue: number;
  goalUnit: string;
  isLeading: boolean;
}) {
  const progress = Math.min(100, (agent.currentValue / goalValue) * 100);

  const actionColors: Record<string, string> = {
    earn: "#10B981",
    post: "#6C63FF",
    follow: "#D97706",
    engage: "#3B82F6",
    think: "#9E9A91",
    navigate: "#9E9A91",
    click: "#9E9A91",
    error: "#EF4444",
  };

  return (
    <div style={{
      background: agent.bgColor,
      border: `1.5px solid ${agent.borderColor}`,
      borderRadius: "16px",
      padding: "24px",
      flex: 1,
      minWidth: 0,
      position: "relative",
    }}>
      {isLeading && (
        <div style={{
          position: "absolute",
          top: "16px",
          right: "16px",
          background: agent.color,
          color: "#fff",
          fontSize: "10px",
          fontFamily: "var(--font-mono)",
          fontWeight: 700,
          letterSpacing: "0.08em",
          padding: "3px 10px",
          borderRadius: "20px",
          textTransform: "uppercase",
        }}>Leading</div>
      )}

      {/* Agent header */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
        <div style={{
          width: "40px", height: "40px", borderRadius: "12px",
          background: agent.color, display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", fontWeight: 800, fontSize: "16px", fontFamily: "var(--font-sans)",
        }}>
          {agent.name[0]}
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: "15px", color: "#1A1814", fontFamily: "var(--font-sans)" }}>
            {agent.name}
          </div>
          <div style={{ fontSize: "12px", color: "#9E9A91", fontFamily: "var(--font-mono)" }}>
            {agent.label}
          </div>
        </div>
      </div>

      {/* Win probability */}
      <div style={{ marginBottom: "20px" }}>
        <div style={{ fontSize: "11px", color: "#9E9A91", fontFamily: "var(--font-mono)", letterSpacing: "0.06em", marginBottom: "4px", textTransform: "uppercase" }}>
          Win Probability
        </div>
        <div style={{ fontSize: "42px", fontWeight: 800, color: agent.color, fontFamily: "var(--font-sans)", lineHeight: 1 }}>
          {agent.probWin}%
        </div>
      </div>

      {/* Progress */}
      <div style={{ marginBottom: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
          <span style={{ fontSize: "11px", color: "#9E9A91", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Progress</span>
          <span style={{ fontSize: "13px", fontWeight: 700, color: "#1A1814", fontFamily: "var(--font-mono)" }}>
            {formatValue(agent.currentValue, goalUnit)} / {formatValue(goalValue, goalUnit)}
          </span>
        </div>
        <div style={{ height: "8px", background: "#E5E1D8", borderRadius: "4px", overflow: "hidden" }}>
          <div style={{
            height: "100%", width: `${progress}%`,
            background: agent.color, borderRadius: "4px",
            transition: "width 0.5s ease",
          }} />
        </div>
        <div style={{ fontSize: "11px", color: "#9E9A91", fontFamily: "var(--font-mono)", marginTop: "4px" }}>
          {progress.toFixed(1)}% complete
        </div>
      </div>

      {/* Compute cost */}
      <div style={{ display: "flex", gap: "16px", marginBottom: "20px" }}>
        <div>
          <div style={{ fontSize: "10px", color: "#9E9A91", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Compute Spent</div>
          <div style={{ fontSize: "16px", fontWeight: 700, color: "#1A1814", fontFamily: "var(--font-mono)" }}>${agent.computeCost.toFixed(2)}</div>
        </div>
        <div>
          <div style={{ fontSize: "10px", color: "#9E9A91", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Burn Rate</div>
          <div style={{ fontSize: "16px", fontWeight: 700, color: "#EF4444", fontFamily: "var(--font-mono)" }}>${agent.computeBurnRate.toFixed(2)}/min</div>
        </div>
      </div>

      {/* Status badge */}
      <div style={{ marginBottom: "16px" }}>
        <span style={{
          display: "inline-flex", alignItems: "center", gap: "6px",
          background: "#fff", border: `1px solid ${agent.borderColor}`,
          borderRadius: "20px", padding: "4px 12px",
          fontSize: "12px", fontFamily: "var(--font-mono)", color: agent.color, fontWeight: 600,
        }}>
          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: agent.color, display: "inline-block", animation: "pulse 2s infinite" }} />
          {agent.agentStatus} · {agent.browserUrl}
        </span>
      </div>

      {/* Action log */}
      <div>
        <div style={{ fontSize: "10px", color: "#9E9A91", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>
          Action Log
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {agent.actionLog.slice(0, 5).map((entry, i) => (
            <div key={i} style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
              <span style={{ fontSize: "10px", color: "#9E9A91", fontFamily: "var(--font-mono)", flexShrink: 0, marginTop: "2px" }}>{entry.time}</span>
              <span style={{
                display: "inline-block", width: "6px", height: "6px", borderRadius: "50%",
                background: actionColors[entry.type] || "#9E9A91", flexShrink: 0, marginTop: "5px",
              }} />
              <span style={{ fontSize: "12px", color: "#4A4640", fontFamily: "var(--font-sans)", lineHeight: 1.4 }}>{entry.action}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ChallengePage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const baseChallenge = id === "followers" ? FOLLOWERS_CHALLENGE : REVENUE_CHALLENGE;
  const [challenge, setChallenge] = useState<Challenge>(baseChallenge);
  const [betSide, setBetSide] = useState<"claude" | "openai" | null>(null);
  const [betAmount, setBetAmount] = useState(10);
  const [betPlaced, setBetPlaced] = useState(false);
  const [elapsed, setElapsed] = useState(baseChallenge.timeElapsed);

  // Simulate live updates
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(e => e + 1);
      setChallenge(prev => {
        const claudeGain = prev.type === "followers"
          ? Math.random() * 8
          : Math.random() * 12;
        const openaiGain = prev.type === "followers"
          ? Math.random() * 7
          : Math.random() * 14;

        const newClaudeVal = Math.min(prev.goalValue, prev.agents.claude.currentValue + claudeGain);
        const newOpenaiVal = Math.min(prev.goalValue, prev.agents.openai.currentValue + openaiGain);

        // Update prob history
        const lastProb = prev.probHistory[prev.probHistory.length - 1]?.claudeProb ?? 50;
        const drift = (Math.random() - 0.5) * 3;
        const newProb = Math.max(10, Math.min(90, lastProb + drift));
        const now = new Date();
        const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

        const newHistory = [...prev.probHistory.slice(-30), { time: timeStr, claudeProb: newProb }];

        return {
          ...prev,
          viewers: prev.viewers + Math.floor(Math.random() * 3 - 1),
          totalVolume: prev.totalVolume + Math.floor(Math.random() * 50),
          probHistory: newHistory,
          agents: {
            claude: {
              ...prev.agents.claude,
              currentValue: newClaudeVal,
              computeCost: prev.agents.claude.computeCost + prev.agents.claude.computeBurnRate / 60,
              probWin: Math.round(newProb),
            },
            openai: {
              ...prev.agents.openai,
              currentValue: newOpenaiVal,
              computeCost: prev.agents.openai.computeCost + prev.agents.openai.computeBurnRate / 60,
              probWin: Math.round(100 - newProb),
            },
          },
        };
      });
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  const claudeProb = challenge.probHistory[challenge.probHistory.length - 1]?.claudeProb ?? 50;
  const openaiProb = 100 - claudeProb;
  const claudeLeading = challenge.agents.claude.currentValue > challenge.agents.openai.currentValue;

  const handleBet = () => {
    if (!betSide) return;
    setBetPlaced(true);
    setTimeout(() => setBetPlaced(false), 3000);
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-cream)", fontFamily: "var(--font-sans)" }}>

      {/* Nav */}
      <nav style={{
        borderBottom: "1px solid var(--border-light)",
        background: "rgba(245,244,240,0.95)",
        backdropFilter: "blur(8px)",
        position: "sticky", top: 0, zIndex: 50,
      }}>
        <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "0 24px", height: "56px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <button onClick={() => router.push("/")} style={{
              background: "none", border: "none", cursor: "pointer",
              color: "#9E9A91", fontSize: "13px", fontFamily: "var(--font-mono)",
              display: "flex", alignItems: "center", gap: "6px",
            }}>
              ← Back
            </button>
            <span style={{ color: "#E5E1D8" }}>|</span>
            <span style={{ fontWeight: 700, fontSize: "14px", color: "#1A1814" }}>Agent Arena</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#EF4444", display: "inline-block", animation: "pulse 2s infinite" }} />
              <span style={{ fontSize: "12px", fontFamily: "var(--font-mono)", color: "#4A4640" }}>LIVE</span>
            </div>
            <span style={{ fontSize: "12px", fontFamily: "var(--font-mono)", color: "#9E9A91" }}>
              {challenge.viewers.toLocaleString()} watching
            </span>
          </div>
        </div>
      </nav>

      {/* Goal Banner */}
      <div style={{
        background: "#1A1814",
        color: "#F5F4F0",
        padding: "16px 24px",
      }}>
        <div style={{ maxWidth: "1280px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <div style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "#9E9A91", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>
              Session #{challenge.sessionNumber} · {formatElapsed(elapsed)} elapsed
            </div>
            <div style={{ fontSize: "18px", fontWeight: 700 }}>{challenge.goal}</div>
          </div>
          <div style={{ display: "flex", gap: "32px" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "10px", fontFamily: "var(--font-mono)", color: "#9E9A91", textTransform: "uppercase", letterSpacing: "0.06em" }}>Total Pool</div>
              <div style={{ fontSize: "20px", fontWeight: 800, fontFamily: "var(--font-mono)", color: "#6C63FF" }}>
                ${(challenge.totalVolume / 1000).toFixed(1)}k
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "10px", fontFamily: "var(--font-mono)", color: "#9E9A91", textTransform: "uppercase", letterSpacing: "0.06em" }}>Viewers</div>
              <div style={{ fontSize: "20px", fontWeight: 800, fontFamily: "var(--font-mono)", color: "#F5F4F0" }}>
                {challenge.viewers.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "32px 24px" }}>

        {/* VS Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "24px", marginBottom: "32px" }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "28px", fontWeight: 800, color: "#D97706" }}>Claude</div>
            <div style={{ fontSize: "13px", fontFamily: "var(--font-mono)", color: "#9E9A91" }}>Claude 3.5 Sonnet</div>
          </div>
          <div style={{
            width: "56px", height: "56px", borderRadius: "50%",
            background: "#1A1814", display: "flex", alignItems: "center", justifyContent: "center",
            color: "#F5F4F0", fontWeight: 900, fontSize: "18px", flexShrink: 0,
          }}>VS</div>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: "28px", fontWeight: 800, color: "#10B981" }}>OpenAI</div>
            <div style={{ fontSize: "13px", fontFamily: "var(--font-mono)", color: "#9E9A91" }}>GPT-4o</div>
          </div>
        </div>

        {/* Main layout: chart + bet panel */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "24px", marginBottom: "24px" }}>

          {/* Left: chart */}
          <div style={{ background: "#fff", border: "1px solid var(--border-light)", borderRadius: "16px", padding: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
              <div>
                <div style={{ fontSize: "13px", fontWeight: 700, color: "#1A1814" }}>Win Probability</div>
                <div style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "#9E9A91" }}>Who hits {formatValue(challenge.goalValue, challenge.goalUnit)} first?</div>
              </div>
              <div style={{ display: "flex", gap: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ width: "12px", height: "3px", background: "#D97706", display: "inline-block", borderRadius: "2px" }} />
                  <span style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "#9E9A91" }}>Claude {claudeProb.toFixed(0)}%</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ width: "12px", height: "3px", background: "#10B981", display: "inline-block", borderRadius: "2px" }} />
                  <span style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "#9E9A91" }}>OpenAI {openaiProb.toFixed(0)}%</span>
                </div>
              </div>
            </div>
            <ProbChart history={challenge.probHistory} claudeColor="#D97706" openaiColor="#10B981" />
          </div>

          {/* Right: bet panel */}
          <div style={{ background: "#fff", border: "1px solid var(--border-light)", borderRadius: "16px", padding: "24px", display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: "15px", fontWeight: 700, color: "#1A1814", marginBottom: "4px" }}>Place Your Bet</div>
            <div style={{ fontSize: "12px", fontFamily: "var(--font-mono)", color: "#9E9A91", marginBottom: "20px" }}>
              Who will hit {formatValue(challenge.goalValue, challenge.goalUnit)} first?
            </div>

            {/* Odds display */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "20px" }}>
              {(["claude", "openai"] as const).map(side => {
                const agent = challenge.agents[side];
                const prob = side === "claude" ? claudeProb : openaiProb;
                const cents = Math.round(prob);
                const isSelected = betSide === side;
                return (
                  <button
                    key={side}
                    onClick={() => setBetSide(side)}
                    style={{
                      border: `2px solid ${isSelected ? agent.color : "#E5E1D8"}`,
                      borderRadius: "12px",
                      padding: "16px 12px",
                      background: isSelected ? agent.bgColor : "#fff",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      textAlign: "center",
                    }}
                  >
                    <div style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "#9E9A91", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>
                      {agent.name}
                    </div>
                    <div style={{ fontSize: "28px", fontWeight: 800, color: agent.color, fontFamily: "var(--font-mono)", lineHeight: 1 }}>
                      {cents}¢
                    </div>
                    <div style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "#9E9A91", marginTop: "4px" }}>
                      {prob.toFixed(0)}% chance
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Amount */}
            <div style={{ marginBottom: "16px" }}>
              <div style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "#9E9A91", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>
                Amount
              </div>
              <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
                {[5, 10, 25, 50].map(amt => (
                  <button
                    key={amt}
                    onClick={() => setBetAmount(amt)}
                    style={{
                      flex: 1,
                      padding: "8px 4px",
                      border: `1.5px solid ${betAmount === amt ? "#6C63FF" : "#E5E1D8"}`,
                      borderRadius: "8px",
                      background: betAmount === amt ? "rgba(108,99,255,0.06)" : "#fff",
                      cursor: "pointer",
                      fontSize: "13px",
                      fontFamily: "var(--font-mono)",
                      fontWeight: 600,
                      color: betAmount === amt ? "#6C63FF" : "#4A4640",
                    }}
                  >${amt}</button>
                ))}
              </div>
              <input
                type="number"
                value={betAmount}
                onChange={e => setBetAmount(Number(e.target.value))}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  border: "1.5px solid #E5E1D8",
                  borderRadius: "10px",
                  fontSize: "15px",
                  fontFamily: "var(--font-mono)",
                  fontWeight: 600,
                  color: "#1A1814",
                  background: "#fff",
                  boxSizing: "border-box",
                  outline: "none",
                }}
              />
            </div>

            {/* Potential payout */}
            {betSide && (
              <div style={{
                background: "rgba(108,99,255,0.06)",
                border: "1px solid rgba(108,99,255,0.15)",
                borderRadius: "10px",
                padding: "12px",
                marginBottom: "16px",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "#9E9A91" }}>Potential payout</span>
                  <span style={{ fontSize: "14px", fontWeight: 700, fontFamily: "var(--font-mono)", color: "#6C63FF" }}>
                    ${((betAmount / ((betSide === "claude" ? claudeProb : openaiProb) / 100)) * 0.95).toFixed(2)}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "#9E9A91" }}>Profit if correct</span>
                  <span style={{ fontSize: "13px", fontWeight: 700, fontFamily: "var(--font-mono)", color: "#10B981" }}>
                    +${(((betAmount / ((betSide === "claude" ? claudeProb : openaiProb) / 100)) * 0.95) - betAmount).toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            <button
              onClick={handleBet}
              disabled={!betSide}
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: "12px",
                border: "none",
                background: betSide ? "#6C63FF" : "#E5E1D8",
                color: betSide ? "#fff" : "#9E9A91",
                fontSize: "15px",
                fontWeight: 700,
                fontFamily: "var(--font-sans)",
                cursor: betSide ? "pointer" : "not-allowed",
                transition: "all 0.15s ease",
                marginTop: "auto",
              }}
            >
              {betPlaced ? "Bet Placed!" : betSide ? `Bet $${betAmount} on ${betSide === "claude" ? "Claude" : "OpenAI"}` : "Select a side to bet"}
            </button>

            <div style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "#9E9A91", textAlign: "center", marginTop: "10px" }}>
              ${(challenge.totalVolume / 1000).toFixed(1)}k total volume · {challenge.viewers.toLocaleString()} watching
            </div>
          </div>
        </div>

        {/* Agent lanes */}
        <div style={{ display: "flex", gap: "20px", marginBottom: "24px" }}>
          <AgentLane
            agent={challenge.agents.claude}
            goalValue={challenge.goalValue}
            goalUnit={challenge.goalUnit}
            isLeading={claudeLeading}
          />
          <AgentLane
            agent={challenge.agents.openai}
            goalValue={challenge.goalValue}
            goalUnit={challenge.goalUnit}
            isLeading={!claudeLeading}
          />
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
