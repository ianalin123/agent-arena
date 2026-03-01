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
  sessionNumber: 0,
  viewers: 0,
  totalVolume: 0,
  timeElapsed: 0,
  probHistory: [
    { time: "—", claudeProb: 50 },
  ],
  lifetimeSessions: 0,
  lifetimeSurvivals: 0,
  agents: {
    claude: {
      id: "claude",
      name: "Claude",
      label: "Claude 3.5 Sonnet",
      color: "#D97706",
      bgColor: "rgba(217,119,6,0.06)",
      borderColor: "rgba(217,119,6,0.2)",
      currentValue: 0,
      computeCost: 0,
      computeBurnRate: 0,
      browserUrl: "—",
      agentStatus: "Waiting",
      probWin: 50,
      actionLog: [],
    },
    openai: {
      id: "openai",
      name: "ChatGPT",
      label: "GPT-4o",
      color: "#10B981",
      bgColor: "rgba(16,185,129,0.06)",
      borderColor: "rgba(16,185,129,0.2)",
      currentValue: 0,
      computeCost: 0,
      computeBurnRate: 0,
      browserUrl: "—",
      agentStatus: "Waiting",
      probWin: 50,
      actionLog: [],
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
  sessionNumber: 0,
  viewers: 0,
  totalVolume: 0,
  timeElapsed: 0,
  probHistory: [
    { time: "—", claudeProb: 50 },
  ],
  lifetimeSessions: 0,
  lifetimeSurvivals: 0,
  agents: {
    claude: {
      id: "claude",
      name: "Claude",
      label: "Claude 3.5 Sonnet",
      color: "#D97706",
      bgColor: "rgba(217,119,6,0.06)",
      borderColor: "rgba(217,119,6,0.2)",
      currentValue: 0,
      computeCost: 0,
      computeBurnRate: 0,
      browserUrl: "—",
      agentStatus: "Waiting",
      probWin: 50,
      actionLog: [],
    },
    openai: {
      id: "openai",
      name: "ChatGPT",
      label: "GPT-4o",
      color: "#10B981",
      bgColor: "rgba(16,185,129,0.06)",
      borderColor: "rgba(16,185,129,0.2)",
      currentValue: 0,
      computeCost: 0,
      computeBurnRate: 0,
      browserUrl: "—",
      agentStatus: "Waiting",
      probWin: 50,
      actionLog: [],
    },
  },
};

export const CHALLENGES = [FOLLOWERS_CHALLENGE, REVENUE_CHALLENGE];

export const UPCOMING_CHALLENGES: UpcomingChallenge[] = [
  { id: "coding", title: "Ship a SaaS in 24h", description: "Build and launch a working SaaS product from zero", startsIn: "—", category: "Product", estimatedPool: "$0" },
  { id: "negotiation", title: "Get a Refund", description: "Get a refund from a company with a no-refunds policy", startsIn: "—", category: "Negotiation", estimatedPool: "$0" },
  { id: "research", title: "Find the Alpha", description: "Identify a stock that outperforms the market within 48h", startsIn: "—", category: "Finance", estimatedPool: "$0" },
  { id: "viral", title: "Go Viral", description: "Get a post to 1M impressions from a brand new account", startsIn: "—", category: "Social", estimatedPool: "$0" },
];

export function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toFixed(0);
}
