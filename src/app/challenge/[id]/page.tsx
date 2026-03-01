"use client";

/*
 * challenge/[id]/page.tsx — Agent Arena Challenge Detail (Next.js App Router)
 * Design: "Warm Signal" — Yonder × Kota
 * Background: cream #F0EDE8, white cards, purple #6C63FF accent only
 * Layout: Agent browser + action log at TOP, prediction markets below
 */

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { FOLLOWERS_CHALLENGE, REVENUE_CHALLENGE } from "@/lib/arena-data";
import type { Challenge, Market, ProbabilityPoint } from "@/lib/arena-data";

function formatTime(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0)
    return `${h}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
}

function ProbChart({
  history,
  color = "#6C63FF",
}: {
  history: ProbabilityPoint[];
  color?: string;
}) {
  const w = 600,
    h = 100;
  if (history.length < 2) return null;
  const probs = history.map((p) => p.prob);
  const min = Math.max(0, Math.min(...probs) - 10);
  const max = Math.min(100, Math.max(...probs) + 10);
  const xs = history.map((_, i) => (i / (history.length - 1)) * w);
  const ys = probs.map((p) => h - ((p - min) / (max - min)) * h);
  const d = xs
    .map((x, i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${ys[i].toFixed(1)}`)
    .join(" ");
  const fill = `${d} L ${w} ${h} L 0 ${h} Z`;

  return (
    <div style={{ position: "relative" }}>
      <svg
        width="100%"
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        style={{ display: "block" }}
      >
        <defs>
          <linearGradient
            id={`cg-${color.replace("#", "")}`}
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop offset="0%" stopColor={color} stopOpacity="0.18" />
            <stop offset="100%" stopColor={color} stopOpacity="0.01" />
          </linearGradient>
        </defs>
        {[25, 50, 75].map((pct) => {
          const y = h - ((pct - min) / (max - min)) * h;
          if (y < 0 || y > h) return null;
          return (
            <line
              key={pct}
              x1={0}
              y1={y}
              x2={w}
              y2={y}
              stroke="rgba(0,0,0,0.06)"
              strokeWidth={1}
              strokeDasharray="4,4"
            />
          );
        })}
        <path d={fill} fill={`url(#cg-${color.replace("#", "")})`} />
        <path
          d={d}
          stroke={color}
          strokeWidth={2}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle
          cx={xs[xs.length - 1]}
          cy={ys[ys.length - 1]}
          r={4}
          fill={color}
        />
        <circle
          cx={xs[xs.length - 1]}
          cy={ys[ys.length - 1]}
          r={8}
          fill={color}
          fillOpacity={0.2}
        >
          <animate
            attributeName="r"
            values="4;10;4"
            dur="2s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="fill-opacity"
            values="0.2;0;0.2"
            dur="2s"
            repeatCount="indefinite"
          />
        </circle>
      </svg>
    </div>
  );
}

function MarketRow({
  market,
  onBet,
  accent,
}: {
  market: Market;
  onBet: (id: string, side: "yes" | "no", amount: number) => void;
  accent: string;
}) {
  const [amount, setAmount] = useState(25);
  const [betSide, setBetSide] = useState<"yes" | "no" | null>(null);
  const [justBet, setJustBet] = useState(false);

  const handleBet = (side: "yes" | "no") => {
    setBetSide(side);
    setJustBet(true);
    onBet(market.id, side, amount);
    setTimeout(() => setJustBet(false), 1500);
  };

  const isResolved = market.status !== "open";

  return (
    <div className="card-white" style={{ padding: "18px 20px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 12,
        }}
      >
        <div style={{ flex: 1, paddingRight: 16 }}>
          <div
            style={{
              fontWeight: 600,
              fontSize: 14,
              color: "var(--ink)",
              letterSpacing: "-0.01em",
              marginBottom: 4,
            }}
          >
            {market.question}
          </div>
          <div
            style={{
              fontFamily: "DM Mono, monospace",
              fontSize: 11,
              color: "var(--ink-muted)",
            }}
          >
            Vol: ${(market.volume / 1000).toFixed(1)}k
          </div>
        </div>
        <div
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            flexShrink: 0,
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontFamily: "DM Mono, monospace",
                fontSize: 22,
                fontWeight: 700,
                color: "#16A34A",
                lineHeight: 1,
              }}
            >
              {market.yesCents}¢
            </div>
            <div
              style={{
                fontSize: 9,
                color: "var(--ink-muted)",
                marginTop: 2,
                fontWeight: 600,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
              }}
            >
              YES
            </div>
          </div>
          <div style={{ color: "var(--border-medium)", fontSize: 16 }}>/</div>
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontFamily: "DM Mono, monospace",
                fontSize: 22,
                fontWeight: 700,
                color: "#DC2626",
                lineHeight: 1,
              }}
            >
              {market.noCents}¢
            </div>
            <div
              style={{
                fontSize: 9,
                color: "var(--ink-muted)",
                marginTop: 2,
                fontWeight: 600,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
              }}
            >
              NO
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <div
          style={{
            height: 4,
            background: "var(--bg-cream-dark)",
            borderRadius: 999,
            overflow: "hidden",
            display: "flex",
          }}
        >
          <div
            style={{
              width: `${market.yesProb}%`,
              background: "#22C55E",
              transition: "width 0.5s ease",
              borderRadius: "999px 0 0 999px",
            }}
          />
          <div
            style={{
              width: `${market.noProb}%`,
              background: "#EF4444",
              transition: "width 0.5s ease",
              borderRadius: "0 999px 999px 0",
            }}
          />
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 4,
          }}
        >
          <span
            style={{
              fontFamily: "DM Mono, monospace",
              fontSize: 10,
              color: "#16A34A",
            }}
          >
            {market.yesProb}% YES
          </span>
          <span
            style={{
              fontFamily: "DM Mono, monospace",
              fontSize: 10,
              color: "#DC2626",
            }}
          >
            {market.noProb}% NO
          </span>
        </div>
      </div>

      {!isResolved && (
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ display: "flex", gap: 4 }}>
            {[10, 25, 50, 100].map((v) => (
              <button
                key={v}
                onClick={() => setAmount(v)}
                style={{
                  padding: "4px 8px",
                  borderRadius: 6,
                  border: `1.5px solid ${amount === v ? accent : "var(--border-light)"}`,
                  background: amount === v ? `${accent}12` : "transparent",
                  color: amount === v ? accent : "var(--ink-muted)",
                  fontFamily: "DM Mono, monospace",
                  fontSize: 11,
                  cursor: "pointer",
                  fontWeight: amount === v ? 700 : 400,
                }}
              >
                ${v}
              </button>
            ))}
          </div>
          <div style={{ flex: 1 }} />
          <button
            onClick={() => handleBet("yes")}
            disabled={justBet}
            style={{
              padding: "7px 16px",
              borderRadius: 999,
              border: "1.5px solid rgba(34,197,94,0.3)",
              background:
                justBet && betSide === "yes"
                  ? "rgba(34,197,94,0.2)"
                  : "rgba(34,197,94,0.08)",
              color: "#16A34A",
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
              fontFamily: "DM Sans, sans-serif",
            }}
          >
            {justBet && betSide === "yes" ? "✓ Placed" : `YES $${amount}`}
          </button>
          <button
            onClick={() => handleBet("no")}
            disabled={justBet}
            style={{
              padding: "7px 16px",
              borderRadius: 999,
              border: "1.5px solid rgba(239,68,68,0.3)",
              background:
                justBet && betSide === "no"
                  ? "rgba(239,68,68,0.2)"
                  : "rgba(239,68,68,0.08)",
              color: "#DC2626",
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
              fontFamily: "DM Sans, sans-serif",
            }}
          >
            {justBet && betSide === "no" ? "✓ Placed" : `NO $${amount}`}
          </button>
        </div>
      )}

      {isResolved && (
        <div
          style={{
            padding: "6px 14px",
            borderRadius: 999,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background:
              market.status === "resolved_yes"
                ? "rgba(34,197,94,0.1)"
                : "rgba(239,68,68,0.1)",
            color:
              market.status === "resolved_yes" ? "#16A34A" : "#DC2626",
            fontWeight: 700,
            fontSize: 12,
          }}
        >
          {market.status === "resolved_yes"
            ? "✓ Resolved YES"
            : "✗ Resolved NO"}
        </div>
      )}
    </div>
  );
}

export default function ChallengePage() {
  const params = useParams<{ id: string }>();
  const challengeId = params?.id || "revenue";
  const baseChallenge =
    challengeId === "followers" ? FOLLOWERS_CHALLENGE : REVENUE_CHALLENGE;
  const isFollowers = baseChallenge.type === "followers";
  const accent = isFollowers ? "#9B8FF7" : "#6C63FF";

  const [elapsed, setElapsed] = useState(baseChallenge.timeElapsed);
  const [probHistory, setProbHistory] = useState<ProbabilityPoint[]>(
    baseChallenge.probHistory
  );
  const [markets, setMarkets] = useState<Market[]>(baseChallenge.markets);
  const [currentUrl, setCurrentUrl] = useState(baseChallenge.browserUrl);
  const [agentStatus, setAgentStatus] = useState<Challenge["agentStatus"]>(
    baseChallenge.agentStatus
  );
  const [actionLog, setActionLog] = useState(baseChallenge.actionLog);
  const [currentValue, setCurrentValue] = useState(baseChallenge.currentValue);
  const [computeCost, setComputeCost] = useState(baseChallenge.computeCost);
  const [activeTab, setActiveTab] = useState<"1h" | "6h" | "all">("1h");
  const [totalBets, setTotalBets] = useState(0);
  const tickRef = useRef(0);

  const URLS = isFollowers
    ? [
        "twitter.com/compose/tweet",
        "reddit.com/r/entrepreneur",
        "instagram.com/explore",
        "tiktok.com/creator-center",
        "linkedin.com/feed",
      ]
    : [
        "fiverr.com/manage/orders",
        "upwork.com/nx/find-work",
        "gumroad.com/dashboard",
        "etsy.com/shop/manage",
        "stripe.com/dashboard",
      ];

  const ACTIONS = isFollowers
    ? [
        {
          action: "Posted viral thread about AI productivity",
          type: "post" as const,
        },
        {
          action: "Engaged with 12 top accounts in niche",
          type: "engage" as const,
        },
        {
          action: "Analyzed trending hashtags — #AI #tech #startup",
          type: "think" as const,
        },
        {
          action: "Followed 50 targeted accounts in ICP",
          type: "follow" as const,
        },
      ]
    : [
        {
          action: "Completed Fiverr order — $45 earned ✓",
          type: "earn" as const,
        },
        {
          action: "Published new Gumroad product — $29.99",
          type: "click" as const,
        },
        {
          action: "Analyzing market demand for AI services",
          type: "think" as const,
        },
        {
          action: "3 sales on Gumroad — $89.97 earned ✓",
          type: "earn" as const,
        },
      ];

  useEffect(() => {
    const interval = setInterval(() => {
      tickRef.current += 1;
      const tick = tickRef.current;
      setElapsed((e) => e + 1);
      setComputeCost((c) =>
        parseFloat((c + baseChallenge.computeBurnRate / 60).toFixed(2))
      );
      if (tick % 10 === 0) {
        const inc = isFollowers
          ? Math.floor(Math.random() * 40 + 5)
          : Math.floor(Math.random() * 80 + 10);
        setCurrentValue((v) => Math.min(v + inc, baseChallenge.goalValue));
      }
      if (tick % 20 === 0) {
        setCurrentUrl(URLS[Math.floor(Math.random() * URLS.length)]);
        const statuses: Challenge["agentStatus"][] = [
          "Navigating",
          "Analyzing",
          "Executing",
          "Thinking",
          "Engaging",
        ];
        setAgentStatus(statuses[Math.floor(Math.random() * statuses.length)]);
      }
      if (tick % 15 === 0) {
        const entry = ACTIONS[Math.floor(Math.random() * ACTIONS.length)];
        const now = new Date();
        const ts = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
        setActionLog((log) => [
          { time: ts, action: entry.action, type: entry.type },
          ...log.slice(0, 19),
        ]);
      }
      if (tick % 30 === 0) {
        const now = new Date();
        const ts = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
        setProbHistory((h) => {
          const last = h[h.length - 1]?.prob ?? 61;
          const next = Math.max(
            5,
            Math.min(95, last + (Math.random() - 0.45) * 4)
          );
          return [...h, { time: ts, prob: parseFloat(next.toFixed(1)) }];
        });
      }
      if (tick % 45 === 0) {
        setMarkets((ms) =>
          ms.map((m) => {
            if (m.status !== "open") return m;
            const newYes = Math.max(
              2,
              Math.min(98, m.yesProb + (Math.random() - 0.5) * 3)
            );
            return {
              ...m,
              yesProb: Math.round(newYes),
              noProb: Math.round(100 - newYes),
              yesCents: Math.round(newYes),
              noCents: Math.round(100 - newYes),
              volume: m.volume + Math.floor(Math.random() * 500),
            };
          })
        );
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [baseChallenge.computeBurnRate, baseChallenge.goalValue, isFollowers]);

  const handleBet = useCallback(
    (marketId: string, side: "yes" | "no", amount: number) => {
      setTotalBets((t) => t + amount);
      setMarkets((ms) =>
        ms.map((m) => {
          if (m.id !== marketId) return m;
          const shift = side === "yes" ? 1.5 : -1.5;
          const newYes = Math.max(2, Math.min(98, m.yesProb + shift));
          return {
            ...m,
            yesProb: Math.round(newYes),
            noProb: Math.round(100 - newYes),
            yesCents: Math.round(newYes),
            noCents: Math.round(100 - newYes),
            volume: m.volume + amount,
          };
        })
      );
    },
    []
  );

  const survivalProb = probHistory[probHistory.length - 1]?.prob ?? 61;
  const progressPct = Math.min(
    100,
    (currentValue / baseChallenge.goalValue) * 100
  );
  const netProfit = currentValue - computeCost;
  const isAhead = netProfit > 0;

  const actionTypeColor: Record<string, string> = {
    navigate: "var(--ink-faint)",
    click: "#6C63FF",
    think: "#9B8FF7",
    earn: "#16A34A",
    error: "#DC2626",
    post: accent,
    follow: accent,
    engage: "#D97706",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg-cream)",
        color: "var(--ink)",
      }}
    >
      {/* NAV */}
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 2.5rem",
          height: 60,
          background: "rgba(240,237,232,0.95)",
          borderBottom: "1px solid var(--border-light)",
          position: "sticky",
          top: 0,
          zIndex: 100,
          backdropFilter: "blur(8px)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/" style={{ textDecoration: "none" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  width: 26,
                  height: 26,
                  background: "var(--purple)",
                  borderRadius: 6,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M8 2L14 5.5V10.5L8 14L2 10.5V5.5L8 2Z"
                    stroke="white"
                    strokeWidth="1.5"
                    fill="none"
                  />
                  <circle cx="8" cy="8" r="2" fill="white" />
                </svg>
              </div>
              <span
                style={{
                  fontWeight: 800,
                  fontSize: 15,
                  color: "var(--ink)",
                  letterSpacing: "-0.02em",
                }}
              >
                Agent Arena
              </span>
            </div>
          </Link>
          <span style={{ color: "var(--border-medium)" }}>/</span>
          <span
            style={{
              fontSize: 13,
              color: "var(--ink-muted)",
              fontWeight: 500,
            }}
          >
            {baseChallenge.title}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span className="pill pill-live">
            Session #{baseChallenge.sessionNumber}
          </span>
          <span
            style={{
              fontFamily: "DM Mono, monospace",
              fontSize: 12,
              color: "var(--ink-muted)",
            }}
          >
            {formatTime(elapsed)}
          </span>
          <span style={{ fontSize: 12, color: "var(--ink-muted)" }}>
            {baseChallenge.viewers.toLocaleString()} watching
          </span>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Link href="/">
            <button className="btn-ghost" style={{ fontSize: 12 }}>
              ← Back
            </button>
          </Link>
          <button className="btn-purple" style={{ fontSize: 12 }}>
            Place bet
          </button>
        </div>
      </nav>

      {/* GOAL BANNER */}
      <div style={{ background: accent, color: "white", padding: "0 2.5rem" }}>
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            height: 56,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  opacity: 0.75,
                }}
              >
                Challenge Goal
              </span>
              <span style={{ opacity: 0.4 }}>—</span>
              <span
                style={{
                  fontWeight: 800,
                  fontSize: 15,
                  letterSpacing: "-0.01em",
                }}
              >
                {baseChallenge.goal}
              </span>
            </div>
            <div
              style={{
                width: 1,
                height: 24,
                background: "rgba(255,255,255,0.25)",
              }}
            />
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{ fontSize: 11, opacity: 0.75, fontWeight: 600 }}
              >
                Progress
              </span>
              <div
                style={{
                  width: 140,
                  height: 5,
                  background: "rgba(255,255,255,0.25)",
                  borderRadius: 999,
                }}
              >
                <div
                  style={{
                    width: `${progressPct}%`,
                    height: "100%",
                    background: "white",
                    borderRadius: 999,
                    transition: "width 1s ease",
                  }}
                />
              </div>
              <span
                style={{
                  fontFamily: "DM Mono, monospace",
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {progressPct.toFixed(1)}%
              </span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{ textAlign: "right" }}>
              <div
                style={{
                  fontSize: 10,
                  opacity: 0.7,
                  fontWeight: 600,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                Current
              </div>
              <div
                style={{
                  fontFamily: "DM Mono, monospace",
                  fontSize: 16,
                  fontWeight: 700,
                }}
              >
                {isFollowers
                  ? `${(currentValue / 1000).toFixed(1)}k followers`
                  : `$${currentValue.toLocaleString()}`}
              </div>
            </div>
            <div
              style={{
                width: 1,
                height: 24,
                background: "rgba(255,255,255,0.25)",
              }}
            />
            <div style={{ textAlign: "right" }}>
              <div
                style={{
                  fontSize: 10,
                  opacity: 0.7,
                  fontWeight: 600,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                Compute spent
              </div>
              <div
                style={{
                  fontFamily: "DM Mono, monospace",
                  fontSize: 16,
                  fontWeight: 700,
                }}
              >
                ${computeCost.toFixed(2)}
              </div>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: isAhead
                  ? "rgba(255,255,255,0.2)"
                  : "rgba(0,0,0,0.2)",
                padding: "6px 14px",
                borderRadius: 999,
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 800 }}>
                {isAhead ? "▲" : "▼"}
              </span>
              <span
                style={{
                  fontFamily: "DM Mono, monospace",
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                {isAhead ? "+" : ""}${netProfit.toFixed(0)} net
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* TOP: Agent Browser + Action Log */}
      <div
        style={{
          background: "var(--bg-white)",
          borderBottom: "1px solid var(--border-light)",
        }}
      >
        <div
          style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 2.5rem" }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <span className="pill pill-live">Live agent</span>
            <span
              style={{
                fontSize: 13,
                color: "var(--ink-muted)",
                fontFamily: "DM Mono, monospace",
              }}
            >
              {agentStatus} — {currentUrl}
            </span>
            <div style={{ flex: 1 }} />
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontFamily: "DM Mono, monospace",
                fontSize: 13,
                fontWeight: 600,
                color: isAhead ? "#16A34A" : "#DC2626",
                background: isAhead
                  ? "rgba(34,197,94,0.08)"
                  : "rgba(239,68,68,0.08)",
                padding: "4px 12px",
                borderRadius: 999,
              }}
            >
              <span>{isAhead ? "▲" : "▼"}</span>
              <span>
                {isAhead ? "+" : ""}${netProfit.toFixed(0)} net
              </span>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 360px",
              gap: 16,
            }}
          >
            {/* VM Browser */}
            <div className="vm-window" style={{ height: 400 }}>
              <div className="vm-titlebar">
                <div className="vm-dot vm-dot-red" />
                <div className="vm-dot vm-dot-yellow" />
                <div className="vm-dot vm-dot-green" />
                <div className="vm-url-bar">{currentUrl}</div>
                <div
                  style={{
                    fontFamily: "DM Mono, monospace",
                    fontSize: 10,
                    fontWeight: 600,
                    color: agentStatus === "Error" ? "#DC2626" : accent,
                    padding: "2px 8px",
                    background:
                      agentStatus === "Error"
                        ? "rgba(239,68,68,0.1)"
                        : `${accent}15`,
                    borderRadius: 4,
                  }}
                >
                  {agentStatus}
                </div>
              </div>
              <div
                style={{
                  height: "calc(100% - 44px)",
                  background: "#FAFAFA",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <div style={{ padding: "20px 24px" }}>
                  <div
                    style={{
                      background: "white",
                      borderRadius: 10,
                      padding: 16,
                      marginBottom: 14,
                      border: "1px solid var(--border-light)",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        gap: 10,
                        alignItems: "center",
                        marginBottom: 12,
                      }}
                    >
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          background: `${accent}20`,
                        }}
                      />
                      <div>
                        <div
                          style={{
                            width: 120,
                            height: 10,
                            background: "var(--bg-cream-dark)",
                            borderRadius: 4,
                            marginBottom: 6,
                          }}
                        />
                        <div
                          style={{
                            width: 80,
                            height: 8,
                            background: "var(--border-light)",
                            borderRadius: 4,
                          }}
                        />
                      </div>
                    </div>
                    {[180, 220, 160, 200, 140].map((w, i) => (
                      <div
                        key={i}
                        style={{
                          width: w,
                          height: 8,
                          background: "var(--bg-cream-dark)",
                          borderRadius: 4,
                          marginBottom: 6,
                        }}
                      />
                    ))}
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 10,
                    }}
                  >
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        style={{
                          background: "white",
                          borderRadius: 8,
                          padding: "10px 12px",
                          border: "1px solid var(--border-light)",
                        }}
                      >
                        <div
                          style={{
                            width: "70%",
                            height: 8,
                            background: "var(--bg-cream-dark)",
                            borderRadius: 3,
                            marginBottom: 8,
                          }}
                        />
                        <div
                          style={{
                            width: "50%",
                            height: 6,
                            background: "var(--border-light)",
                            borderRadius: 3,
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
                {/* Cursor */}
                <div
                  style={{
                    position: "absolute",
                    top: "40%",
                    left: "35%",
                    animation: "cursor-move 4s ease-in-out infinite",
                    pointerEvents: "none",
                  }}
                >
                  <svg width="16" height="20" viewBox="0 0 16 20" fill="none">
                    <path
                      d="M0 0L0 16L4.5 12L7 18L9 17L6.5 11L12 11L0 0Z"
                      fill={accent}
                      fillOpacity="0.8"
                    />
                  </svg>
                </div>
                {/* Status bar */}
                <div
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background:
                      "linear-gradient(to top, rgba(250,250,250,0.98), transparent)",
                    padding: "20px 16px 12px",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: accent,
                      animation: "pulse-purple 1.5s ease-in-out infinite",
                    }}
                  />
                  <span
                    style={{
                      fontFamily: "DM Mono, monospace",
                      fontSize: 11,
                      color: accent,
                      fontWeight: 500,
                    }}
                  >
                    {actionLog[0]?.action ?? "Initializing..."}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Log */}
            <div
              className="card-white"
              style={{
                overflow: "hidden",
                height: 400,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  padding: "12px 16px",
                  borderBottom: "1px solid var(--border-light)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span
                  style={{
                    fontWeight: 700,
                    fontSize: 13,
                    color: "var(--ink)",
                  }}
                >
                  Action log
                </span>
                <span
                  style={{
                    fontFamily: "DM Mono, monospace",
                    fontSize: 10,
                    color: "var(--ink-muted)",
                  }}
                >
                  {actionLog.length} events
                </span>
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: "4px 0" }}>
                {actionLog.map((entry, i) => (
                  <div
                    key={i}
                    style={{
                      padding: "8px 16px",
                      borderBottom: "1px solid var(--border-light)",
                      display: "flex",
                      gap: 10,
                      alignItems: "flex-start",
                      opacity: Math.max(0.35, 1 - i * 0.07),
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "DM Mono, monospace",
                        fontSize: 10,
                        color: "var(--ink-muted)",
                        minWidth: 36,
                        paddingTop: 1,
                      }}
                    >
                      {entry.time}
                    </span>
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background:
                          actionTypeColor[entry.type] ?? "var(--ink-faint)",
                        marginTop: 5,
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        fontFamily: "DM Mono, monospace",
                        fontSize: 11,
                        color:
                          i === 0
                            ? actionTypeColor[entry.type]
                            : "var(--ink-light)",
                        lineHeight: 1.5,
                      }}
                    >
                      {entry.action}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div
        style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 2.5rem" }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 360px",
            gap: 24,
          }}
        >
          {/* LEFT: Chart + Markets */}
          <div>
            {/* Probability card */}
            <div className="card-white" style={{ padding: 24, marginBottom: 20 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  marginBottom: 20,
                }}
              >
                <div>
                  <div className="label-caps" style={{ marginBottom: 8 }}>
                    Survival probability
                  </div>
                  <div
                    style={{
                      fontFamily: "DM Mono, monospace",
                      fontSize: 52,
                      fontWeight: 700,
                      color: survivalProb >= 50 ? accent : "#DC2626",
                      letterSpacing: "-0.03em",
                      lineHeight: 1,
                    }}
                  >
                    {survivalProb.toFixed(1)}%
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--ink-muted)",
                      marginTop: 6,
                    }}
                  >
                    {survivalProb >= 50
                      ? "↑ Likely to survive"
                      : "↓ At risk of bankruptcy"}
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                    alignItems: "flex-end",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      gap: 3,
                      background: "var(--bg-cream)",
                      borderRadius: 8,
                      padding: 3,
                    }}
                  >
                    {(["1h", "6h", "all"] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        style={{
                          padding: "4px 10px",
                          borderRadius: 6,
                          border: "none",
                          background:
                            activeTab === tab ? "white" : "transparent",
                          color:
                            activeTab === tab
                              ? "var(--ink)"
                              : "var(--ink-muted)",
                          fontFamily: "DM Mono, monospace",
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: "pointer",
                          boxShadow:
                            activeTab === tab
                              ? "0 1px 3px rgba(0,0,0,0.08)"
                              : "none",
                        }}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div className="label-caps" style={{ marginBottom: 4 }}>
                      Compute burn
                    </div>
                    <div
                      style={{
                        fontFamily: "DM Mono, monospace",
                        fontSize: 16,
                        fontWeight: 600,
                        color: "#DC2626",
                      }}
                    >
                      ${computeCost.toFixed(2)}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color: "var(--ink-muted)",
                        marginTop: 2,
                      }}
                    >
                      ${baseChallenge.computeBurnRate.toFixed(2)}/min
                    </div>
                  </div>
                </div>
              </div>

              <ProbChart history={probHistory} color={accent} />

              <div style={{ marginTop: 20 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 8,
                  }}
                >
                  <div>
                    <div className="label-caps" style={{ marginBottom: 3 }}>
                      Current
                    </div>
                    <div
                      style={{
                        fontFamily: "DM Mono, monospace",
                        fontSize: 18,
                        fontWeight: 700,
                        color: accent,
                      }}
                    >
                      {isFollowers
                        ? `${(currentValue / 1000).toFixed(1)}k`
                        : `$${currentValue.toLocaleString()}`}
                    </div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div className="label-caps" style={{ marginBottom: 3 }}>
                      Net
                    </div>
                    <div
                      style={{
                        fontFamily: "DM Mono, monospace",
                        fontSize: 18,
                        fontWeight: 700,
                        color: isAhead ? "#16A34A" : "#DC2626",
                      }}
                    >
                      {isAhead ? "+" : ""}${netProfit.toFixed(0)}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div className="label-caps" style={{ marginBottom: 3 }}>
                      Goal
                    </div>
                    <div
                      style={{
                        fontFamily: "DM Mono, monospace",
                        fontSize: 18,
                        fontWeight: 700,
                        color: "var(--ink-light)",
                      }}
                    >
                      {isFollowers
                        ? `${(baseChallenge.goalValue / 1000).toFixed(0)}k`
                        : `$${baseChallenge.goalValue.toLocaleString()}`}
                    </div>
                  </div>
                </div>
                <div className="progress-track" style={{ height: 6 }}>
                  <div
                    className="progress-fill-purple"
                    style={{ width: `${progressPct}%`, background: accent }}
                  />
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginTop: 5,
                    fontFamily: "DM Mono, monospace",
                    fontSize: 10,
                    color: "var(--ink-muted)",
                  }}
                >
                  <span>{progressPct.toFixed(1)}% complete</span>
                  <span>
                    {isFollowers
                      ? `${(currentValue / 1000).toFixed(1)}k / ${(baseChallenge.goalValue / 1000).toFixed(0)}k`
                      : `$${currentValue.toLocaleString()} / $${baseChallenge.goalValue.toLocaleString()}`}
                  </span>
                </div>
              </div>
            </div>

            {/* Markets */}
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 14,
                }}
              >
                <h2
                  style={{
                    fontSize: 18,
                    fontWeight: 800,
                    letterSpacing: "-0.02em",
                    color: "var(--ink)",
                  }}
                >
                  Open markets
                </h2>
                <span
                  style={{
                    fontFamily: "DM Mono, monospace",
                    fontSize: 11,
                    color: "var(--ink-muted)",
                  }}
                >
                  {markets.filter((m) => m.status === "open").length} open · $
                  {(
                    markets.reduce((s, m) => s + m.volume, 0) / 1000
                  ).toFixed(0)}
                  k vol
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                {markets.map((market) => (
                  <MarketRow
                    key={market.id}
                    market={market}
                    onBet={handleBet}
                    accent={accent}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT: Sidebar */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Quick bet */}
            <div
              className="card-white"
              style={{ padding: 20, border: `1.5px solid ${accent}30` }}
            >
              <div
                className="label-caps"
                style={{ marginBottom: 12, color: accent }}
              >
                Quick bet — Survival
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 6,
                  marginBottom: 16,
                  flexWrap: "wrap",
                }}
              >
                {[10, 25, 50, 100, 250].map((v) => (
                  <button
                    key={v}
                    style={{
                      flex: 1,
                      minWidth: 40,
                      padding: "8px 0",
                      borderRadius: 8,
                      border: "1.5px solid var(--border-light)",
                      background: "var(--bg-cream)",
                      color: "var(--ink-light)",
                      fontFamily: "DM Mono, monospace",
                      fontSize: 12,
                      cursor: "pointer",
                      fontWeight: 500,
                    }}
                  >
                    ${v}
                  </button>
                ))}
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 10,
                }}
              >
                <button
                  style={{
                    padding: 14,
                    borderRadius: 12,
                    border: "1.5px solid rgba(34,197,94,0.25)",
                    background: "rgba(34,197,94,0.06)",
                    color: "#16A34A",
                    fontWeight: 700,
                    fontSize: 15,
                    cursor: "pointer",
                    fontFamily: "DM Sans, sans-serif",
                  }}
                >
                  YES
                  <br />
                  <span
                    style={{
                      fontSize: 11,
                      fontFamily: "DM Mono, monospace",
                      fontWeight: 400,
                    }}
                  >
                    {survivalProb.toFixed(0)}¢
                  </span>
                </button>
                <button
                  style={{
                    padding: 14,
                    borderRadius: 12,
                    border: "1.5px solid rgba(239,68,68,0.25)",
                    background: "rgba(239,68,68,0.06)",
                    color: "#DC2626",
                    fontWeight: 700,
                    fontSize: 15,
                    cursor: "pointer",
                    fontFamily: "DM Sans, sans-serif",
                  }}
                >
                  NO
                  <br />
                  <span
                    style={{
                      fontSize: 11,
                      fontFamily: "DM Mono, monospace",
                      fontWeight: 400,
                    }}
                  >
                    {(100 - survivalProb).toFixed(0)}¢
                  </span>
                </button>
              </div>
            </div>

            {/* Session stats */}
            <div className="card-white" style={{ padding: 20 }}>
              <div className="label-caps" style={{ marginBottom: 14 }}>
                Session stats
              </div>
              {[
                { label: "Session", value: `#${baseChallenge.sessionNumber}` },
                { label: "Elapsed", value: formatTime(elapsed) },
                { label: "Compute cost", value: `$${computeCost.toFixed(2)}` },
                {
                  label: "Burn rate",
                  value: `$${baseChallenge.computeBurnRate}/min`,
                },
                {
                  label: "Viewers",
                  value: baseChallenge.viewers.toLocaleString(),
                },
                { label: "Your bets", value: `$${totalBets}` },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 0",
                    borderBottom: "1px solid var(--border-light)",
                  }}
                >
                  <span style={{ fontSize: 12, color: "var(--ink-muted)" }}>
                    {label}
                  </span>
                  <span
                    style={{
                      fontFamily: "DM Mono, monospace",
                      fontSize: 12,
                      color: "var(--ink)",
                      fontWeight: 600,
                    }}
                  >
                    {value}
                  </span>
                </div>
              ))}
            </div>

            {/* Operator record */}
            <div className="card-white" style={{ padding: 20 }}>
              <div className="label-caps" style={{ marginBottom: 14 }}>
                The Operator — career
              </div>
              {[
                {
                  label: "Sessions run",
                  value: `${baseChallenge.lifetimeSessions}`,
                },
                {
                  label: "Survivals",
                  value: `${baseChallenge.lifetimeSurvivals}`,
                },
                {
                  label: "Win rate",
                  value: `${((baseChallenge.lifetimeSurvivals / baseChallenge.lifetimeSessions) * 100).toFixed(0)}%`,
                },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 0",
                    borderBottom: "1px solid var(--border-light)",
                  }}
                >
                  <span style={{ fontSize: 12, color: "var(--ink-muted)" }}>
                    {label}
                  </span>
                  <span
                    style={{
                      fontFamily: "DM Mono, monospace",
                      fontSize: 14,
                      color: accent,
                      fontWeight: 700,
                    }}
                  >
                    {value}
                  </span>
                </div>
              ))}
            </div>

            {/* Other challenge */}
            <div className="card-cream" style={{ padding: 16 }}>
              <div className="label-caps" style={{ marginBottom: 10 }}>
                Also live
              </div>
              <Link
                href={`/challenge/${isFollowers ? "revenue" : "followers"}`}
                style={{ textDecoration: "none" }}
              >
                <div
                  style={{
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: 13,
                        color: "var(--ink)",
                        marginBottom: 3,
                      }}
                    >
                      {isFollowers ? "Earn $10,000" : "Grow to 10k followers"}
                    </div>
                    <div
                      style={{ fontSize: 11, color: "var(--ink-muted)" }}
                    >
                      {isFollowers
                        ? "Revenue challenge"
                        : "Social growth challenge"}
                    </div>
                  </div>
                  <span
                    style={{
                      color: accent,
                      fontSize: 16,
                      fontWeight: 700,
                    }}
                  >
                    →
                  </span>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
