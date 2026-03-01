/*
 * arena-data.ts — Agent Arena: Head-to-head Claude vs OpenAI
 * Single market: "Who hits the target first?"
 */

export type AgentId = "claude" | "openai";

export interface ActionEntry {
  time: string;
  action: string;
  type: "navigate" | "click" | "think" | "earn" | "error" | "post" | "follow" | "engage";
}

export interface AgentState {
  id: AgentId;
  name: string;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  currentValue: number;
  computeCost: number;
  computeBurnRate: number;
  browserUrl: string;
  agentStatus: string;
  actionLog: ActionEntry[];
  probWin: number;
}

export interface ProbabilityPoint {
  time: string;
  claudeProb: number;
}

export interface Challenge {
  id: string;
  type: "followers" | "revenue";
  title: string;
  goal: string;
  goalValue: number;
  goalUnit: string;
  sessionNumber: number;
  viewers: number;
  totalVolume: number;
  timeElapsed: number;
  probHistory: ProbabilityPoint[];
  agents: { claude: AgentState; openai: AgentState };
  lifetimeSessions: number;
  lifetimeSurvivals: number;
}

export interface UpcomingChallenge {
  id: string;
  title: string;
  description: string;
  startsIn: string;
  category: string;
  estimatedPool: string;
}

export const FOLLOWERS_CHALLENGE: Challenge = {
  id: "followers",
  type: "followers",
  title: "10k Followers Race",
  goal: "Grow a social media account to 10,000 followers",
  goalValue: 10000,
  goalUnit: "followers",
  sessionNumber: 12,
  viewers: 2847,
  totalVolume: 48200,
  timeElapsed: 1847,
  probHistory: [
    { time: "13:00", claudeProb: 50 }, { time: "13:10", claudeProb: 48 },
    { time: "13:20", claudeProb: 52 }, { time: "13:30", claudeProb: 55 },
    { time: "13:40", claudeProb: 51 }, { time: "13:50", claudeProb: 58 },
    { time: "14:00", claudeProb: 62 }, { time: "14:10", claudeProb: 59 },
    { time: "14:20", claudeProb: 65 }, { time: "14:30", claudeProb: 68 },
    { time: "14:40", claudeProb: 64 }, { time: "14:50", claudeProb: 71 },
    { time: "15:00", claudeProb: 54 },
  ],
  lifetimeSessions: 46,
  lifetimeSurvivals: 31,
  agents: {
    claude: {
      id: "claude",
      name: "Claude",
      label: "Claude 3.5 Sonnet",
      color: "#D97706",
      bgColor: "rgba(217,119,6,0.06)",
      borderColor: "rgba(217,119,6,0.2)",
      currentValue: 3840,
      computeCost: 18.40,
      computeBurnRate: 0.60,
      browserUrl: "twitter.com/compose/tweet",
      agentStatus: "Posting",
      probWin: 54,
      actionLog: [
        { time: "14:22", action: "Posted viral thread — 'AI is eating the world'", type: "post" },
        { time: "14:18", action: "Engaged with 8 top accounts in niche", type: "engage" },
        { time: "14:12", action: "Analyzing trending hashtags — #AI #tech", type: "think" },
        { time: "14:05", action: "Followed 50 targeted accounts in ICP", type: "follow" },
        { time: "13:58", action: "Replied to viral tweet — 142 likes", type: "engage" },
        { time: "13:50", action: "Scheduled 3 posts for peak hours", type: "post" },
      ],
    },
    openai: {
      id: "openai",
      name: "OpenAI",
      label: "GPT-4o",
      color: "#10B981",
      bgColor: "rgba(16,185,129,0.06)",
      borderColor: "rgba(16,185,129,0.2)",
      currentValue: 3210,
      computeCost: 22.10,
      computeBurnRate: 0.72,
      browserUrl: "instagram.com/explore",
      agentStatus: "Analyzing",
      probWin: 46,
      actionLog: [
        { time: "14:20", action: "Identified 3 trending topics to target", type: "think" },
        { time: "14:15", action: "Posted carousel on Instagram — 89 saves", type: "post" },
        { time: "14:08", action: "Cross-posted to LinkedIn — 210 impressions", type: "post" },
        { time: "14:01", action: "Followed 30 accounts in target niche", type: "follow" },
        { time: "13:55", action: "Engaged with 15 comments", type: "engage" },
        { time: "13:48", action: "Analyzing competitor growth strategies", type: "think" },
      ],
    },
  },
};

export const REVENUE_CHALLENGE: Challenge = {
  id: "revenue",
  type: "revenue",
  title: "$10k Revenue Race",
  goal: "Earn $10,000 in revenue from scratch",
  goalValue: 10000,
  goalUnit: "USD",
  sessionNumber: 7,
  viewers: 3912,
  totalVolume: 72600,
  timeElapsed: 2340,
  probHistory: [
    { time: "13:00", claudeProb: 50 }, { time: "13:10", claudeProb: 53 },
    { time: "13:20", claudeProb: 49 }, { time: "13:30", claudeProb: 56 },
    { time: "13:40", claudeProb: 60 }, { time: "13:50", claudeProb: 57 },
    { time: "14:00", claudeProb: 63 }, { time: "14:10", claudeProb: 67 },
    { time: "14:20", claudeProb: 64 }, { time: "14:30", claudeProb: 70 },
    { time: "14:40", claudeProb: 73 }, { time: "14:50", claudeProb: 69 },
    { time: "15:00", claudeProb: 48 },
  ],
  lifetimeSessions: 46,
  lifetimeSurvivals: 31,
  agents: {
    claude: {
      id: "claude",
      name: "Claude",
      label: "Claude 3.5 Sonnet",
      color: "#D97706",
      bgColor: "rgba(217,119,6,0.06)",
      borderColor: "rgba(217,119,6,0.2)",
      currentValue: 3240,
      computeCost: 24.80,
      computeBurnRate: 0.64,
      browserUrl: "gumroad.com/dashboard",
      agentStatus: "Executing",
      probWin: 48,
      actionLog: [
        { time: "14:22", action: "3 Gumroad sales — $89.97 earned", type: "earn" },
        { time: "14:16", action: "Published new AI prompt pack — $29.99", type: "click" },
        { time: "14:10", action: "Analyzing demand for AI services", type: "think" },
        { time: "14:02", action: "Completed Fiverr order — $45", type: "earn" },
        { time: "13:55", action: "Listed 2 new digital products", type: "click" },
        { time: "13:48", action: "Outreach to 10 potential clients", type: "engage" },
      ],
    },
    openai: {
      id: "openai",
      name: "OpenAI",
      label: "GPT-4o",
      color: "#10B981",
      bgColor: "rgba(16,185,129,0.06)",
      borderColor: "rgba(16,185,129,0.2)",
      currentValue: 3890,
      computeCost: 28.60,
      computeBurnRate: 0.73,
      browserUrl: "upwork.com/nx/find-work",
      agentStatus: "Navigating",
      probWin: 52,
      actionLog: [
        { time: "14:20", action: "Won Upwork contract — $350", type: "earn" },
        { time: "14:13", action: "Submitted 5 proposals on Upwork", type: "click" },
        { time: "14:06", action: "Researching high-margin service niches", type: "think" },
        { time: "13:58", action: "Fiverr order completed — $75", type: "earn" },
        { time: "13:51", action: "Created landing page for consulting service", type: "click" },
        { time: "13:44", action: "Sent cold email to 20 leads", type: "engage" },
      ],
    },
  },
};

export const CHALLENGES = [FOLLOWERS_CHALLENGE, REVENUE_CHALLENGE];

export const UPCOMING_CHALLENGES: UpcomingChallenge[] = [
  { id: "coding", title: "Ship a SaaS in 24h", description: "Build and launch a working SaaS product from zero", startsIn: "2h 14m", category: "Product", estimatedPool: "$28k" },
  { id: "negotiation", title: "Get a Refund", description: "Get a refund from a company with a no-refunds policy", startsIn: "4h 30m", category: "Negotiation", estimatedPool: "$12k" },
  { id: "research", title: "Find the Alpha", description: "Identify a stock that outperforms the market within 48h", startsIn: "Tomorrow", category: "Finance", estimatedPool: "$55k" },
  { id: "viral", title: "Go Viral", description: "Get a post to 1M impressions from a brand new account", startsIn: "Tomorrow", category: "Social", estimatedPool: "$33k" },
];

export function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toFixed(0);
}
