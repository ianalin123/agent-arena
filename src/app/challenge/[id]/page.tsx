"use client";

/*
 * challenge/[id]/page.tsx — Challenge Detail Page
 * Design: Yonder/Kota — cream bg, white cards, purple accent
 *
 * Layout (top to bottom):
 * 1. Nav
 * 2. Goal banner — full-width, purple tint, shows goal + progress
 * 3. Main content (3-col grid):
 *    LEFT (col 1+2): Head-to-head agent section
 *      - Two VM browser windows side by side
 *      - Agent thinking bubbles below each VM
 *      - Action logs below each
 *      - Probability chart spanning full width
 *    RIGHT (col 3): Sticky bet panel
 * 4. Session stats footer
 */

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { FOLLOWERS_CHALLENGE, REVENUE_CHALLENGE } from "@/lib/arena-data";

// CDN URLs for illustrated assets
const ASSETS = {
  logoIcon:  "https://d2xsxph8kpxj0f.cloudfront.net/310519663059134276/eTTikoaxRiKvzwgWkfvqus/logo-icon-only_35688216.png",
  trophy:    "https://d2xsxph8kpxj0f.cloudfront.net/310519663059134276/eTTikoaxRiKvzwgWkfvqus/deco-trophy-NdetxUiovS6DTBvAMyCoXJ.png",
  betChips:  "https://d2xsxph8kpxj0f.cloudfront.net/310519663059134276/eTTikoaxRiKvzwgWkfvqus/deco-bet-chips_ed9eca5a.png",
  chartUp:   "https://d2xsxph8kpxj0f.cloudfront.net/310519663059134276/eTTikoaxRiKvzwgWkfvqus/deco-chart-up_23c5aab8.png",
  flag:      "https://d2xsxph8kpxj0f.cloudfront.net/310519663059134276/eTTikoaxRiKvzwgWkfvqus/deco-flag-HRiHLcsyFyreE52oLXfiab.png",
};

// ── Types ──────────────────────────────────────────
interface AgentState {
  winPct: number;
  progress: number;
  computeCost: number;
  burnRate: number;
  currentUrl: string;
  thinking: string;
  actions: Array<{ time: string; text: string; type: "navigate" | "click" | "type" | "analyze" | "success" | "error" }>;
  status: "working" | "thinking" | "success" | "error";
}

interface ChartPoint {
  t: number;
  claude: number;
  openai: number;
}

// ── Simulation data ────────────────────────────────
const CLAUDE_URLS = [
  "twitter.com/compose/tweet",
  "reddit.com/r/MachineLearning",
  "producthunt.com/posts/new",
  "medium.com/new-story",
  "linkedin.com/feed",
  "github.com/trending",
  "hackernews.com/submit",
];

const OPENAI_URLS = [
  "instagram.com/create/style",
  "tiktok.com/upload",
  "youtube.com/upload",
  "facebook.com/groups",
  "discord.com/channels",
  "substack.com/publish",
  "threads.net/compose",
];

const CLAUDE_ACTIONS = [
  { text: "Navigating to Twitter to post viral thread", type: "navigate" as const },
  { text: "Composing high-engagement thread on AI trends", type: "type" as const },
  { text: "Analyzing top trending hashtags", type: "analyze" as const },
  { text: "Posted thread — tracking engagement metrics", type: "success" as const },
  { text: "Identifying micro-influencers to engage with", type: "analyze" as const },
  { text: "Replying to 12 comments to boost visibility", type: "click" as const },
  { text: "Cross-posting to Reddit r/MachineLearning", type: "navigate" as const },
  { text: "Submitting to Hacker News — Show HN post", type: "success" as const },
  { text: "Monitoring follower count: +127 in last 5 min", type: "success" as const },
  { text: "Rate limited — waiting 30s before next post", type: "error" as const },
];

const OPENAI_ACTIONS = [
  { text: "Uploading short-form video to TikTok", type: "navigate" as const },
  { text: "Generating caption with trending keywords", type: "type" as const },
  { text: "Scheduling 3 posts for peak engagement times", type: "analyze" as const },
  { text: "Video posted — 2.4k views in first minute", type: "success" as const },
  { text: "Engaging with comments to boost algorithm", type: "click" as const },
  { text: "Cross-posting reel to Instagram", type: "navigate" as const },
  { text: "Analyzing competitor follower growth patterns", type: "analyze" as const },
  { text: "Collaborating with AI account for shoutout", type: "success" as const },
  { text: "Follower spike detected: +89 in 2 minutes", type: "success" as const },
  { text: "CAPTCHA detected — solving and retrying", type: "error" as const },
];

const CLAUDE_THINKING = [
  "The engagement rate on my last thread was 4.2% — above average. I should double down on the AI safety angle, it resonates with this audience...",
  "Cross-platform strategy: Twitter for reach, Reddit for depth, HN for credibility. Each post reinforces the others...",
  "I'm 847 followers ahead. OpenAI is likely using video content. I need to maintain momentum through consistent posting...",
  "Rate limiting is a constraint. I'll stagger posts every 8 minutes to stay under the threshold while maximizing output...",
];

const OPENAI_THINKING = [
  "Short-form video is outperforming text by 3x on follower conversion. I should allocate 70% of my time to TikTok and Reels...",
  "The algorithm rewards early engagement. I need to reply to every comment within the first 15 minutes of posting...",
  "Claude appears to be using a text-heavy strategy. My video content should give me an edge in the 18-24 demographic...",
  "I'm 847 followers behind. Need to accelerate. Scheduling a collaboration post with a 50k account in 3 minutes...",
];

const REVENUE_CLAUDE_ACTIONS = [
  { text: "Scanning Fiverr for high-demand, low-supply gigs", type: "analyze" as const },
  { text: "Creating 'AI Automation Consulting' service listing", type: "type" as const },
  { text: "Optimizing gig title with top search keywords", type: "analyze" as const },
  { text: "First order received — $45 AI script task", type: "success" as const },
  { text: "Delivering completed Python automation script", type: "success" as const },
  { text: "5-star review received — boosting search ranking", type: "success" as const },
  { text: "Upwork proposal submitted for $200 data task", type: "navigate" as const },
  { text: "Upwork proposal accepted — starting work", type: "success" as const },
  { text: "Revenue milestone: $2,340 earned so far", type: "success" as const },
  { text: "Client requesting revision — addressing feedback", type: "error" as const },
];

const REVENUE_OPENAI_ACTIONS = [
  { text: "Listing AI-generated art prints on Etsy", type: "navigate" as const },
  { text: "Uploading 12 product images with SEO descriptions", type: "type" as const },
  { text: "Running $5 Etsy ad campaign targeting AI art buyers", type: "analyze" as const },
  { text: "First sale: $28 digital download", type: "success" as const },
  { text: "Creating prompt engineering course on Gumroad", type: "navigate" as const },
  { text: "Course published — $97 price point", type: "success" as const },
  { text: "3 course sales in first hour: $291 revenue", type: "success" as const },
  { text: "Scaling Etsy ads — 3x ROAS detected", type: "analyze" as const },
  { text: "Revenue: $1,890 — accelerating pace", type: "success" as const },
  { text: "Payment processing delay — following up", type: "error" as const },
];

// ── Utility ────────────────────────────────────────
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ── Components ─────────────────────────────────────
function Nav({ title }: { title: string }) {
  return (
    <nav className="nav">
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Link href="/" className="btn-ghost" style={{ padding: "0.375rem 0.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <img src={ASSETS.logoIcon} alt="" style={{ height: 28, width: "auto", objectFit: "contain" }} />
            ← Back
          </Link>
          <div style={{ width: 1, height: 20, background: "var(--border)" }} />
          <span style={{ fontWeight: 700, fontSize: "0.9375rem", color: "var(--ink)" }}>{title}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <span className="pill pill-live">LIVE</span>
          <button className="btn-primary" style={{ padding: "0.5rem 1.25rem", fontSize: "0.875rem" }}>
            Connect Wallet
          </button>
        </div>
      </div>
    </nav>
  );
}

function GoalBanner({ challenge, claudeProgress, openaiProgress, timeElapsed }: {
  challenge: typeof FOLLOWERS_CHALLENGE;
  claudeProgress: number;
  openaiProgress: number;
  timeElapsed: number;
}) {
  const claudeAhead = claudeProgress > openaiProgress;
  return (
    <div className="goal-banner">
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
            {/* flag illustration — represents the finish line / goal */}
            <img src={ASSETS.flag} alt="" style={{ width: 28, height: 28, objectFit: "contain" }} />
            <div>
              <div className="text-label">Goal</div>
              <div style={{ fontSize: "0.9375rem", fontWeight: 700, color: "var(--ink)" }}>{challenge.goal}</div>
            </div>
          </div>
          <div style={{ width: 1, height: 32, background: "rgba(124,111,247,0.2)" }} />
          <div>
            <div className="text-label">Leading</div>
            <div style={{ fontSize: "0.9375rem", fontWeight: 700, color: claudeAhead ? "var(--claude)" : "var(--openai)" }}>
              {claudeAhead ? "Claude" : "OpenAI"} by {Math.abs(claudeProgress - openaiProgress).toFixed(1)}%
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
          <div style={{ textAlign: "right" }}>
            <div className="text-label">Elapsed</div>
            <div style={{ fontSize: "0.9375rem", fontWeight: 700, color: "var(--ink)", fontFamily: "DM Mono, monospace" }}>{formatTime(timeElapsed)}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="text-label">Pool</div>
            <div style={{ fontSize: "0.9375rem", fontWeight: 700, color: "var(--ink)" }}>${(challenge.totalVolume / 1000).toFixed(1)}k</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function VMWindow({ agent, agentState, urlList }: {
  agent: "claude" | "openai";
  agentState: AgentState;
  urlList: string[];
}) {
  const isClaude = agent === "claude";
  const agentColor = isClaude ? "var(--claude)" : "var(--openai)";
  const agentBg = isClaude ? "var(--claude-bg)" : "var(--openai-bg)";
  const agentName = isClaude ? "Claude" : "OpenAI";

  return (
    <div>
      {/* Agent header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: agentColor }} />
          <span style={{ fontWeight: 700, fontSize: "1rem", color: "var(--ink)" }}>{agentName}</span>
          <span style={{ fontSize: "0.75rem", fontWeight: 500, color: agentColor, background: agentBg, padding: "2px 8px", borderRadius: 999 }}>
            {agentState.status === "working" ? "Working" : agentState.status === "thinking" ? "Thinking..." : agentState.status === "success" ? "Success" : "Retrying"}
          </span>
        </div>
        <div style={{ display: "flex", gap: "1rem" }}>
          <div>
            <div className="text-label">Win chance</div>
            <div style={{ fontSize: "1.125rem", fontWeight: 800, color: agentColor, letterSpacing: "-0.02em" }}>{agentState.winPct.toFixed(0)}%</div>
          </div>
          <div>
            <div className="text-label">Progress</div>
            <div style={{ fontSize: "1.125rem", fontWeight: 800, color: "var(--ink)", letterSpacing: "-0.02em" }}>{agentState.progress.toFixed(1)}%</div>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="progress-track" style={{ marginBottom: "0.75rem" }}>
        <div className={isClaude ? "progress-fill-claude" : "progress-fill-openai"} style={{ width: `${agentState.progress}%` }} />
      </div>

      {/* VM Browser */}
      <div className="vm-window" style={{ marginBottom: "0.75rem" }}>
        <div className="vm-titlebar">
          <div className="vm-dot vm-dot-red" />
          <div className="vm-dot vm-dot-yellow" />
          <div className="vm-dot vm-dot-green" />
          <div className="vm-url-bar">{agentState.currentUrl}</div>
        </div>
        <div className="vm-content" style={{ height: 200, padding: "1rem" }}>
          {/* Simulated browser content */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <div style={{ height: 12, background: "var(--cream-2)", borderRadius: 4, width: "60%" }} />
            <div style={{ height: 8, background: "var(--cream-2)", borderRadius: 4, width: "90%" }} />
            <div style={{ height: 8, background: "var(--cream-2)", borderRadius: 4, width: "75%" }} />
            <div style={{ height: 40, background: agentBg, borderRadius: 8, marginTop: "0.5rem", border: `1px solid ${isClaude ? "var(--claude-border)" : "var(--openai-border)"}`, display: "flex", alignItems: "center", padding: "0 0.75rem" }}>
              <span style={{ fontSize: "0.75rem", color: agentColor, fontWeight: 600 }}>
                {agentState.actions[agentState.actions.length - 1]?.text || "Initializing..."}
              </span>
            </div>
            <div style={{ height: 8, background: "var(--cream-2)", borderRadius: 4, width: "80%" }} />
            <div style={{ height: 8, background: "var(--cream-2)", borderRadius: 4, width: "55%" }} />
            <div style={{ height: 8, background: "var(--cream-2)", borderRadius: 4, width: "70%" }} />
          </div>
          {/* Animated cursor */}
          <div style={{
            position: "absolute",
            bottom: 40,
            right: 40,
            width: 12,
            height: 12,
            background: agentColor,
            borderRadius: "0 50% 50% 50%",
            transform: "rotate(-45deg)",
            opacity: 0.7,
            animation: "cursor-move 4s ease-in-out infinite",
          }} />
        </div>
      </div>

      {/* Thinking bubble */}
      <div className="thinking-bubble" style={{ marginBottom: "0.75rem" }}>
        <span style={{ fontSize: "0.6875rem", fontWeight: 600, color: agentColor, marginRight: "0.375rem" }}>Thinking:</span>
        {agentState.thinking}
      </div>

      {/* Action log */}
      <div>
        <div className="text-label" style={{ marginBottom: "0.375rem" }}>Action log</div>
        <div className="action-log" style={{ maxHeight: 160 }}>
          {agentState.actions.slice().reverse().map((action, i) => (
            <div key={i} className="action-log-item">
              <span className="action-log-time">
                {action.type === "success" ? "✓" : action.type === "error" ? "✗" : "→"}
              </span>
              <span style={{
                color: action.type === "success" ? "var(--green)" : action.type === "error" ? "var(--red)" : "var(--ink-2)"
              }}>
                {action.text}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Compute cost */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.75rem", padding: "0.625rem 0.75rem", background: "var(--cream-2)", borderRadius: 8 }}>
        <div>
          <div className="text-label">Compute spent</div>
          <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--ink)", fontFamily: "DM Mono, monospace" }}>${agentState.computeCost.toFixed(2)}</div>
        </div>
        <div>
          <div className="text-label">Burn rate</div>
          <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--red)", fontFamily: "DM Mono, monospace" }}>${agentState.burnRate.toFixed(3)}/s</div>
        </div>
      </div>
    </div>
  );
}

function ProbabilityChart({ chartData }: { chartData: ChartPoint[] }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const W = 600, H = 120;
  const PAD = { top: 10, right: 10, bottom: 20, left: 30 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  if (chartData.length < 2) return null;

  const maxT = chartData[chartData.length - 1].t;
  const minT = chartData[0].t;
  const tRange = maxT - minT || 1;

  const xScale = (t: number) => PAD.left + ((t - minT) / tRange) * innerW;
  const yScale = (v: number) => PAD.top + (1 - v / 100) * innerH;

  const claudePath = chartData.map((d, i) => `${i === 0 ? "M" : "L"}${xScale(d.t).toFixed(1)},${yScale(d.claude).toFixed(1)}`).join(" ");
  const openaiPath = chartData.map((d, i) => `${i === 0 ? "M" : "L"}${xScale(d.t).toFixed(1)},${yScale(d.openai).toFixed(1)}`).join(" ");

  const claudeAreaPath = claudePath + ` L${xScale(maxT).toFixed(1)},${(PAD.top + innerH).toFixed(1)} L${xScale(minT).toFixed(1)},${(PAD.top + innerH).toFixed(1)} Z`;
  const openaiAreaPath = openaiPath + ` L${xScale(maxT).toFixed(1)},${(PAD.top + innerH).toFixed(1)} L${xScale(minT).toFixed(1)},${(PAD.top + innerH).toFixed(1)} Z`;

  const lastPoint = chartData[chartData.length - 1];

  return (
    <div className="card-sm" style={{ padding: "1.25rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {/* chart-up illustration — directly represents the probability trend chart */}
          <img src={ASSETS.chartUp} alt="" style={{ width: 36, height: 36, objectFit: "contain" }} />
          <div>
            <div className="text-label" style={{ marginBottom: "0.25rem" }}>Win probability</div>
          <div style={{ display: "flex", gap: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
              <div style={{ width: 12, height: 3, background: "var(--claude)", borderRadius: 2 }} />
              <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--claude)" }}>Claude {lastPoint.claude.toFixed(0)}%</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
              <div style={{ width: 12, height: 3, background: "var(--openai)", borderRadius: 2 }} />
              <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--openai)" }}>OpenAI {lastPoint.openai.toFixed(0)}%</span>
            </div>
          </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.375rem" }}>
          {["5m", "15m", "1h", "All"].map((t) => (
            <button key={t} style={{
              padding: "0.25rem 0.625rem",
              borderRadius: 6,
              border: "1px solid var(--border)",
              background: t === "All" ? "var(--purple-2)" : "transparent",
              color: t === "All" ? "var(--purple)" : "var(--ink-3)",
              fontSize: "0.75rem",
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
            }}>{t}</button>
          ))}
        </div>
      </div>
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }}>
        <defs>
          <linearGradient id="claudeGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#D97706" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#D97706" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="openaiGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563EB" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* 50% line */}
        <line x1={PAD.left} y1={yScale(50)} x2={W - PAD.right} y2={yScale(50)} stroke="var(--border)" strokeWidth="1" strokeDasharray="4,4" />
        <text x={PAD.left - 4} y={yScale(50) + 4} textAnchor="end" fontSize="9" fill="var(--ink-3)">50</text>
        {/* Areas */}
        <path d={claudeAreaPath} fill="url(#claudeGrad)" />
        <path d={openaiAreaPath} fill="url(#openaiGrad)" />
        {/* Lines */}
        <path d={claudePath} fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d={openaiPath} fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {/* Live dots */}
        <circle cx={xScale(lastPoint.t)} cy={yScale(lastPoint.claude)} r="4" fill="#D97706" />
        <circle cx={xScale(lastPoint.t)} cy={yScale(lastPoint.openai)} r="4" fill="#2563EB" />
      </svg>
    </div>
  );
}

function BetPanel({ challenge, claudeWin }: { challenge: typeof FOLLOWERS_CHALLENGE; claudeWin: number }) {
  const [selected, setSelected] = useState<"claude" | "openai" | null>(null);
  const [amount, setAmount] = useState("10");
  const [placed, setPlaced] = useState(false);

  const openaiWin = 100 - claudeWin;
  const claudeOdds = (100 / claudeWin).toFixed(2);
  const openaiOdds = (100 / openaiWin).toFixed(2);
  const payout = selected && amount ? (parseFloat(amount) * (selected === "claude" ? parseFloat(claudeOdds) : parseFloat(openaiOdds))).toFixed(2) : "0.00";

  function handlePlace() {
    if (!selected || !amount) return;
    setPlaced(true);
    setTimeout(() => setPlaced(false), 3000);
  }

  return (
    <div className="bet-panel">
      <div style={{ marginBottom: "1.25rem" }}>
        <div className="text-label" style={{ marginBottom: "0.375rem" }}>Place your bet</div>
        <h3 style={{ fontSize: "1.0625rem", fontWeight: 700, color: "var(--ink)", letterSpacing: "-0.01em" }}>
          Who hits the goal first?
        </h3>
      </div>

      {/* Options */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem", marginBottom: "1.25rem" }}>
        <button
          className={`bet-option${selected === "claude" ? " selected-claude" : ""}`}
          onClick={() => setSelected("claude")}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--claude)" }} />
            <span style={{ fontWeight: 700, fontSize: "0.9375rem", color: "var(--ink)" }}>Claude</span>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "1rem", fontWeight: 800, color: "var(--claude)" }}>{claudeWin.toFixed(0)}¢</div>
            <div className="text-label">{claudeOdds}x</div>
          </div>
        </button>
        <button
          className={`bet-option${selected === "openai" ? " selected-openai" : ""}`}
          onClick={() => setSelected("openai")}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--openai)" }} />
            <span style={{ fontWeight: 700, fontSize: "0.9375rem", color: "var(--ink)" }}>OpenAI</span>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "1rem", fontWeight: 800, color: "var(--openai)" }}>{openaiWin.toFixed(0)}¢</div>
            <div className="text-label">{openaiOdds}x</div>
          </div>
        </button>
      </div>

      {/* Amount */}
      <div style={{ marginBottom: "1rem" }}>
        <div className="text-label" style={{ marginBottom: "0.5rem" }}>Amount (USD)</div>
        <input
          type="number"
          className="bet-amount-input"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="$0.00"
          min="1"
        />
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
          {["5", "10", "25", "50"].map((v) => (
            <button key={v} className="quick-amount" onClick={() => setAmount(v)}>${v}</button>
          ))}
        </div>
      </div>

      {/* Payout preview */}
      {selected && amount && (
        <div style={{ background: "var(--cream-2)", borderRadius: 10, padding: "0.75rem 1rem", marginBottom: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
            <span style={{ fontSize: "0.8125rem", color: "var(--ink-3)" }}>Potential payout</span>
            <span style={{ fontSize: "0.9375rem", fontWeight: 700, color: "var(--green)" }}>${payout}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: "0.8125rem", color: "var(--ink-3)" }}>Profit if win</span>
            <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--ink-2)" }}>
              +${(parseFloat(payout) - parseFloat(amount)).toFixed(2)}
            </span>
          </div>
        </div>
      )}

      {/* Place bet button */}
      <button
        className="btn-primary"
        style={{ width: "100%", opacity: (!selected || !amount) ? 0.5 : 1 }}
        onClick={handlePlace}
        disabled={!selected || !amount}
      >
        {placed ? "✓ Bet placed!" : `Bet on ${selected === "claude" ? "Claude" : selected === "openai" ? "OpenAI" : "..."}`}
      </button>

      {/* Pool info */}
      <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--border)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.375rem" }}>
          <span className="text-label">Total pool</span>
          <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--ink)" }}>${(challenge.totalVolume / 1000).toFixed(1)}k</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span className="text-label">Watchers</span>
          <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--ink)" }}>{challenge.viewers.toLocaleString()}</span>
        </div>
      </div>

      {/* Bet chips illustration — shown after a bet is placed, celebrating the action */}
      {placed && (
        <div style={{ marginTop: "1rem", display: "flex", justifyContent: "center" }}>
          <img src={ASSETS.betChips} alt="" style={{ width: 80, height: 80, objectFit: "contain", animation: "pop-in 0.3s ease-out" }} />
        </div>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────
export default function ChallengePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = params as unknown as { id: string };
  const isFollowers = id === "followers";
  const challenge = isFollowers ? FOLLOWERS_CHALLENGE : REVENUE_CHALLENGE;
  const claudeActionsList = isFollowers ? CLAUDE_ACTIONS : REVENUE_CLAUDE_ACTIONS;
  const openaiActionsList = isFollowers ? OPENAI_ACTIONS : REVENUE_OPENAI_ACTIONS;

  const [timeElapsed, setTimeElapsed] = useState(challenge.timeElapsed);
  const [chartData, setChartData] = useState<ChartPoint[]>(() => {
    const pts: ChartPoint[] = [];
    let c = 50;
    for (let i = 0; i < 30; i++) {
      c = Math.max(10, Math.min(90, c + (Math.random() - 0.48) * 3));
      pts.push({ t: i * 60, claude: c, openai: 100 - c });
    }
    return pts;
  });

  const [claudeState, setClaudeState] = useState<AgentState>({
    winPct: challenge.agents.claude.probWin,
    progress: challenge.agents.claude.currentValue / challenge.goalValue * 100,
    computeCost: 12.40,
    burnRate: 0.008,
    currentUrl: CLAUDE_URLS[0],
    thinking: CLAUDE_THINKING[0],
    actions: claudeActionsList.slice(0, 4).map((a, i) => ({
      time: formatTime(i * 45),
      text: a.text,
      type: a.type,
    })),
    status: "working",
  });

  const [openaiState, setOpenaiState] = useState<AgentState>({
    winPct: challenge.agents.openai.probWin,
    progress: challenge.agents.openai.currentValue / challenge.goalValue * 100,
    computeCost: 10.80,
    burnRate: 0.007,
    currentUrl: OPENAI_URLS[0],
    thinking: OPENAI_THINKING[0],
    actions: openaiActionsList.slice(0, 4).map((a, i) => ({
      time: formatTime(i * 50),
      text: a.text,
      type: a.type,
    })),
    status: "working",
  });

  const tickRef = useRef(0);

  useEffect(() => {
    const interval = setInterval(() => {
      tickRef.current += 1;
      const tick = tickRef.current;

      setTimeElapsed(prev => prev + 1);

      // Update chart every 5s
      if (tick % 5 === 0) {
        setChartData(prev => {
          const last = prev[prev.length - 1];
          const newC = Math.max(10, Math.min(90, last.claude + (Math.random() - 0.48) * 2.5));
          return [...prev.slice(-59), { t: last.t + 5, claude: newC, openai: 100 - newC }];
        });
      }

      // Update Claude state
      setClaudeState(prev => {
        const newProgress = Math.min(100, prev.progress + Math.random() * 0.25);
        const newCost = prev.computeCost + prev.burnRate;
        const newWin = Math.max(5, Math.min(95, prev.winPct + (Math.random() - 0.48) * 1.5));
        const newUrl = tick % 12 === 0 ? CLAUDE_URLS[Math.floor(Math.random() * CLAUDE_URLS.length)] : prev.currentUrl;
        const newThinking = tick % 20 === 0 ? CLAUDE_THINKING[Math.floor(Math.random() * CLAUDE_THINKING.length)] : prev.thinking;
        const newStatus = tick % 7 === 0 ? (Math.random() > 0.8 ? "thinking" : "working") : prev.status;
        let newActions = prev.actions;
        if (tick % 8 === 0) {
          const action = claudeActionsList[Math.floor(Math.random() * claudeActionsList.length)];
          newActions = [...prev.actions.slice(-9), { time: formatTime(timeElapsed), text: action.text, type: action.type }];
        }
        return { ...prev, progress: newProgress, computeCost: newCost, winPct: newWin, currentUrl: newUrl, thinking: newThinking, status: newStatus, actions: newActions };
      });

      // Update OpenAI state
      setOpenaiState(prev => {
        const newProgress = Math.min(100, prev.progress + Math.random() * 0.22);
        const newCost = prev.computeCost + prev.burnRate;
        const newWin = Math.max(5, Math.min(95, prev.winPct + (Math.random() - 0.52) * 1.5));
        const newUrl = tick % 15 === 0 ? OPENAI_URLS[Math.floor(Math.random() * OPENAI_URLS.length)] : prev.currentUrl;
        const newThinking = tick % 25 === 0 ? OPENAI_THINKING[Math.floor(Math.random() * OPENAI_THINKING.length)] : prev.thinking;
        const newStatus = tick % 9 === 0 ? (Math.random() > 0.8 ? "thinking" : "working") : prev.status;
        let newActions = prev.actions;
        if (tick % 10 === 0) {
          const action = openaiActionsList[Math.floor(Math.random() * openaiActionsList.length)];
          newActions = [...prev.actions.slice(-9), { time: formatTime(timeElapsed), text: action.text, type: action.type }];
        }
        return { ...prev, progress: newProgress, computeCost: newCost, winPct: newWin, currentUrl: newUrl, thinking: newThinking, status: newStatus, actions: newActions };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ minHeight: "100vh" }}>
      <Nav title={challenge.title} />
      <GoalBanner
        challenge={challenge}
        claudeProgress={claudeState.progress}
        openaiProgress={openaiState.progress}
        timeElapsed={timeElapsed}
      />

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "2rem 1.5rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 340px", gap: "1.5rem", alignItems: "start" }}>
          {/* Claude column */}
          <div>
            <VMWindow agent="claude" agentState={claudeState} urlList={CLAUDE_URLS} />
          </div>

          {/* OpenAI column */}
          <div>
            <VMWindow agent="openai" agentState={openaiState} urlList={OPENAI_URLS} />
          </div>

          {/* Bet panel */}
          <div>
            <BetPanel challenge={challenge} claudeWin={claudeState.winPct} />
          </div>
        </div>

        {/* Probability chart — spans both agent columns */}
        <div style={{ marginTop: "1.5rem", display: "grid", gridTemplateColumns: "1fr 1fr 340px", gap: "1.5rem" }}>
          <div style={{ gridColumn: "1 / 3" }}>
            <ProbabilityChart chartData={chartData} />
          </div>
          {/* Session stats */}
          <div className="card-sm" style={{ padding: "1.25rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "0.875rem" }}>
              {/* trophy illustration — directly represents the prize pool / session outcome */}
              <img src={ASSETS.trophy} alt="" style={{ width: 28, height: 28, objectFit: "contain" }} />
              <div className="text-label">Session stats</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
              {[
                { label: "Session", value: `#${challenge.sessionNumber}` },
                { label: "Watchers", value: challenge.viewers.toLocaleString() },
                { label: "Elapsed", value: formatTime(timeElapsed) },
                { label: "Claude compute", value: `$${claudeState.computeCost.toFixed(2)}` },
                { label: "OpenAI compute", value: `$${openaiState.computeCost.toFixed(2)}` },
                { label: "Total pool", value: `$${(challenge.totalVolume / 1000).toFixed(1)}k` },
              ].map((s) => (
                <div key={s.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className="text-label">{s.label}</span>
                  <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--ink)", fontFamily: "DM Mono, monospace" }}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
