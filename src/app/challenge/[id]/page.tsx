"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { FOLLOWERS_CHALLENGE, REVENUE_CHALLENGE } from "@/lib/arena-data";
import { Nav } from "@/components/Nav";
import { NavAuth } from "@/components/NavAuth";
import { GoalBanner } from "@/components/GoalBanner";
import { VMWindow } from "@/components/VMWindow";
import { BetPanel } from "@/components/BetPanel";
import { ProbabilityChart } from "@/components/ProbabilityChart";
import { SessionStats } from "@/components/SessionStats";
import { deriveEventLabel } from "@/lib/event-labels";
import type { ActionItem } from "@/components/ActionLog";

interface DemoAgentState {
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
  eventLabel?: string;
}

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

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function toDisplayText(value: unknown): string {
  if (typeof value === "string") return value;
  if (value == null) return "";
  return JSON.stringify(value);
}

function eventsToActions(events: Array<{ eventType: string; payload: string; timestamp: number }>): ActionItem[] {
  return events
    .filter(e => e.eventType !== "status")
    .map(e => {
      const raw = typeof e.payload === "string" ? e.payload : JSON.stringify(e.payload ?? {});
      const info = deriveEventLabel(e.eventType, raw);
      const type =
        info.pillClass.includes("red")    ? "error" :
        info.pillClass.includes("green")  ? "success" :
        info.pillClass.includes("violet") || info.pillClass.includes("purple") ? "analyze" :
        info.pillClass.includes("blue")   ? "navigate" :
        "click";
      return {
        time: new Date(e.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        text: info.summary,
        type,
        label: info.label,
        pillClass: info.pillClass,
      };
    });
}

function DemoChallengePage({ id }: { id: string }) {
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

  const [claudeState, setClaudeState] = useState<DemoAgentState>({
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

  const [openaiState, setOpenaiState] = useState<DemoAgentState>({
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

      if (tick % 5 === 0) {
        setChartData(prev => {
          const last = prev[prev.length - 1];
          const newC = Math.max(10, Math.min(90, last.claude + (Math.random() - 0.48) * 2.5));
          return [...prev.slice(-59), { t: last.t + 5, claude: newC, openai: 100 - newC }];
        });
      }

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ minHeight: "100vh" }}>
      <Nav authSlot={<NavAuth />} />
      <GoalBanner
        title={challenge.title}
        goal={challenge.goal}
        goalUnit={challenge.goalUnit}
        goalValue={challenge.goalValue}
        claudeProgress={claudeState.progress}
        openaiProgress={openaiState.progress}
        timeElapsed={timeElapsed}
      />

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "2rem 1.5rem", overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr) 272px", gap: "1.5rem", alignItems: "start" }}>
          <div style={{ minWidth: 0 }}>
            <VMWindow
              agent="claude"
              agentStatus={claudeState.status}
              computeCost={claudeState.computeCost}
              burnRate={claudeState.burnRate}
              thinking={claudeState.thinking}
              actions={claudeState.actions}
            />
          </div>

          <div style={{ minWidth: 0 }}>
            <VMWindow
              agent="openai"
              agentStatus={openaiState.status}
              computeCost={openaiState.computeCost}
              burnRate={openaiState.burnRate}
              thinking={openaiState.thinking}
              actions={openaiState.actions}
            />
          </div>

          <div>
            <BetPanel
              claudeWinPct={claudeState.winPct}
              openaiWinPct={100 - claudeState.winPct}
              totalPool={challenge.totalVolume}
              viewers={challenge.viewers}
              bettingOpen={true}
            />
          </div>
        </div>

        <div style={{ marginTop: "1.5rem", display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr) 272px", gap: "1.5rem" }}>
          <div style={{ gridColumn: "1 / 3" }}>
            <ProbabilityChart chartData={chartData} />
          </div>
          <SessionStats
            sessionNumber={challenge.sessionNumber}
            viewers={challenge.viewers}
            timeElapsed={timeElapsed}
            claudeComputeCost={claudeState.computeCost}
            openaiComputeCost={openaiState.computeCost}
            totalPool={challenge.totalVolume}
          />
        </div>
      </div>
    </div>
  );
}

function ConvexChallengePage({ id }: { id: string }) {
  const challengeId = id as Id<"challenges">;

  const challengeData = useQuery(api.challenges.get, { challengeId });
  const odds = useQuery(api.betting.getOddsByChallenge, { challengeId });
  const oddsHistory = useQuery(api.oddsHistory.list, { challengeId });

  const claudeSandboxId = challengeData?.claudeSandbox?._id;
  const openaiSandboxId = challengeData?.openaiSandbox?._id;

  const claudeEvents = useQuery(
    api.events.recent,
    claudeSandboxId ? { sandboxId: claudeSandboxId, limit: 20 } : "skip"
  );
  const openaiEvents = useQuery(
    api.events.recent,
    openaiSandboxId ? { sandboxId: openaiSandboxId, limit: 20 } : "skip"
  );
  const claudeScreenshot = useQuery(
    api.events.getLatestScreenshot,
    claudeSandboxId ? { sandboxId: claudeSandboxId } : "skip"
  );
  const openaiScreenshot = useQuery(
    api.events.getLatestScreenshot,
    openaiSandboxId ? { sandboxId: openaiSandboxId } : "skip"
  );

  const placeBet = useMutation(api.betting.placeBetOnChallenge);

  const [timeElapsed, setTimeElapsed] = useState(0);

  useEffect(() => {
    if (!challengeData?.challenge) return;
    const createdAt = challengeData.challenge.createdAt;
    setTimeElapsed(Math.floor((Date.now() - createdAt) / 1000));

    const interval = setInterval(() => {
      setTimeElapsed(Math.floor((Date.now() - createdAt) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [challengeData?.challenge]);

  if (challengeData === undefined) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
          <div style={{
            width: 32, height: 32, border: "3px solid var(--border)",
            borderTopColor: "var(--purple)", borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }} />
          <span style={{ color: "var(--ink-3)", fontSize: "0.875rem" }}>Loading challenge…</span>
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      </div>
    );
  }

  if (challengeData === null) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <h2 style={{ color: "var(--ink)", marginBottom: "0.5rem" }}>Challenge not found</h2>
          <Link href="/" className="btn-ghost">← Back to Arena</Link>
        </div>
      </div>
    );
  }

  const { challenge, claudeSandbox, openaiSandbox } = challengeData;

  const claudeProgress = claudeSandbox && challenge.targetValue > 0
    ? (claudeSandbox.currentProgress / challenge.targetValue) * 100
    : 0;
  const openaiProgress = openaiSandbox && challenge.targetValue > 0
    ? (openaiSandbox.currentProgress / challenge.targetValue) * 100
    : 0;

  const claudeWinPct = odds ? odds.claudePct * 100 : 50;
  const openaiWinPct = odds ? odds.openaiPct * 100 : 50;
  const totalPool = odds?.totalPool ?? 0;
  const bettingOpen = odds?.bettingOpen ?? false;

  const claudeActions = claudeEvents ? eventsToActions(claudeEvents as Array<{ eventType: string; payload: string; timestamp: number }>) : [];
  const openaiActions = openaiEvents ? eventsToActions(openaiEvents as Array<{ eventType: string; payload: string; timestamp: number }>) : [];

  const claudeThinkEvent = claudeEvents?.find((e: { eventType: string }) => e.eventType.includes("think"));
  const openaiThinkEvent = openaiEvents?.find((e: { eventType: string }) => e.eventType.includes("think"));
  const claudeThinking = claudeThinkEvent
    ? (() => { try { const p = typeof claudeThinkEvent.payload === "string" ? JSON.parse(claudeThinkEvent.payload) : claudeThinkEvent.payload; return toDisplayText(p?.message ?? p?.thought ?? ""); } catch { return ""; } })()
    : undefined;
  const openaiThinking = openaiThinkEvent
    ? (() => { try { const p = typeof openaiThinkEvent.payload === "string" ? JSON.parse(openaiThinkEvent.payload) : openaiThinkEvent.payload; return toDisplayText(p?.message ?? p?.thought ?? ""); } catch { return ""; } })()
    : undefined;

  const chartData: ChartPoint[] = oddsHistory
    ? oddsHistory.map((h: { timestamp: number; claudePct: number; openaiPct: number; eventLabel?: string }) => ({
        t: h.timestamp,
        claude: h.claudePct,
        openai: h.openaiPct,
        ...(h.eventLabel ? { eventLabel: h.eventLabel } : {}),
      }))
    : [];

  const handlePlaceBet = async (agent: "claude" | "openai", amount: number) => {
    await placeBet({ challengeId, amount, position: agent });
  };

  return (
    <div style={{ minHeight: "100vh" }}>
      <Nav authSlot={<NavAuth />} />
      <GoalBanner
        title={challenge.goalDescription}
        goal={challenge.goalDescription}
        goalUnit={challenge.goalType}
        goalValue={challenge.targetValue}
        claudeProgress={claudeProgress}
        openaiProgress={openaiProgress}
        timeElapsed={timeElapsed}
      />

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "2rem 1.5rem", overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr) 272px", gap: "1.5rem", alignItems: "start" }}>
          <div style={{ minWidth: 0 }}>
            <VMWindow
              agent="claude"
              liveUrl={claudeSandbox?.liveUrl || null}
              shareUrl={claudeSandbox?.shareUrl || null}
              screenshotUrl={claudeScreenshot?.url}
              agentStatus={claudeSandbox?.status === "completed" ? "success" : claudeSandbox?.status === "failed" ? "error" : "working"}
              computeCost={claudeSandbox ? claudeSandbox.creditsRemaining : undefined}
              thinking={claudeThinking}
              actions={claudeActions}
            />
            {claudeSandboxId && (
              <Link
                href={`/sandbox/${claudeSandboxId}`}
                style={{ display: "block", marginTop: "0.75rem", fontSize: "0.8125rem", color: "var(--purple)", fontWeight: 600, textDecoration: "none" }}
              >
                View details →
              </Link>
            )}
          </div>

          <div style={{ minWidth: 0 }}>
            <VMWindow
              agent="openai"
              liveUrl={openaiSandbox?.liveUrl || null}
              shareUrl={openaiSandbox?.shareUrl || null}
              screenshotUrl={openaiScreenshot?.url}
              agentStatus={openaiSandbox?.status === "completed" ? "success" : openaiSandbox?.status === "failed" ? "error" : "working"}
              computeCost={openaiSandbox ? openaiSandbox.creditsRemaining : undefined}
              thinking={openaiThinking}
              actions={openaiActions}
            />
            {openaiSandboxId && (
              <Link
                href={`/sandbox/${openaiSandboxId}`}
                style={{ display: "block", marginTop: "0.75rem", fontSize: "0.8125rem", color: "var(--purple)", fontWeight: 600, textDecoration: "none" }}
              >
                View details →
              </Link>
            )}
          </div>

          <div>
            <BetPanel
              claudeWinPct={claudeWinPct}
              openaiWinPct={openaiWinPct}
              totalPool={totalPool}
              viewers={0}
              bettingOpen={bettingOpen}
              onPlaceBet={handlePlaceBet}
            />
          </div>
        </div>

        <div style={{ marginTop: "1.5rem", display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr) 272px", gap: "1.5rem" }}>
          <div style={{ gridColumn: "1 / 3" }}>
            <ProbabilityChart chartData={chartData} />
          </div>
          <SessionStats
            sessionNumber={challenge.sessionNumber}
            viewers={0}
            timeElapsed={timeElapsed}
            claudeComputeCost={claudeSandbox?.creditsRemaining ?? 0}
            openaiComputeCost={openaiSandbox?.creditsRemaining ?? 0}
            totalPool={totalPool}
          />
        </div>
      </div>
    </div>
  );
}

const SLUG_TO_CONVEX_ID: Record<string, string | undefined> = {
  followers: process.env.NEXT_PUBLIC_CHALLENGE_FOLLOWERS,
  revenue: process.env.NEXT_PUBLIC_CHALLENGE_REVENUE,
};

export default function ChallengePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);

  const mappedId = SLUG_TO_CONVEX_ID[id];
  if (mappedId) {
    return <ConvexChallengePage id={mappedId} />;
  }

  const isDemo = id === "followers" || id === "revenue";
  if (isDemo) {
    return <DemoChallengePage id={id} />;
  }

  return <ConvexChallengePage id={id} />;
}
