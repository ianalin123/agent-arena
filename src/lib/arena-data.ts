/*
 * arena-data.ts — v12: Two live challenges + prediction market data structures
 * Challenge 1: 10k Followers (social growth)
 * Challenge 2: $10k Revenue (make money)
 */

/* ── Shared types ── */
export interface ActionLogEntry {
  time: string;
  action: string;
  type: 'navigate' | 'click' | 'think' | 'earn' | 'error' | 'post' | 'follow' | 'engage';
}

export interface ChatMessage {
  id: string;
  user: string;
  message: string;
  time: string;
  badge?: 'mod' | 'donor' | 'vip';
}

/* ── Prediction market types ── */
export interface Market {
  id: string;
  question: string;
  description: string;
  yesProb: number;       // 0–100
  noProb: number;        // 0–100
  yesCents: number;      // e.g. 62
  noCents: number;       // e.g. 38
  volume: number;        // total $ traded
  status: 'open' | 'resolved_yes' | 'resolved_no';
  resolvedAt?: string;
  category: 'milestone' | 'survival' | 'speed' | 'method';
}

export interface ProbabilityPoint {
  time: string;          // "HH:MM"
  prob: number;          // 0–100
}

/* ── Challenge types ── */
export type ChallengeType = 'followers' | 'revenue';

export interface Challenge {
  id: string;
  type: ChallengeType;
  title: string;
  subtitle: string;
  goal: string;
  goalValue: number;
  currentValue: number;
  sessionNumber: number;
  status: 'live' | 'upcoming' | 'ended';
  timeElapsed: number;    // seconds
  timeLimit: number;      // seconds
  computeBurnRate: number; // $/min
  computeCost: number;
  budgetRemaining: number;
  task: string;
  agentStatus: 'Navigating' | 'Analyzing' | 'Executing' | 'Thinking' | 'Error' | 'Earning' | 'Posting' | 'Engaging' | 'Idle';
  browserUrl: string;
  actionLog: ActionLogEntry[];
  markets: Market[];
  probHistory: ProbabilityPoint[];  // for the main survival chart
  lifetimeSessions: number;
  lifetimeSurvivals: number;
  viewers: number;
  totalVolume: number;
}

/* ── Followers challenge ── */
export const FOLLOWERS_CHALLENGE: Challenge = {
  id: 'followers',
  type: 'followers',
  title: 'The Operator',
  subtitle: 'Grow to 10,000 followers',
  goal: '10,000 followers',
  goalValue: 10000,
  currentValue: 1847,
  sessionNumber: 12,
  status: 'live',
  timeElapsed: 2340,
  timeLimit: 7200,
  computeBurnRate: 0.18,
  computeCost: 7.02,
  budgetRemaining: 32.98,
  task: 'Grow a brand-new social media account to 10,000 followers before compute budget runs out. No paid ads.',
  agentStatus: 'Posting',
  browserUrl: 'twitter.com/compose/tweet',
  actionLog: [
    { time: '14:02', action: 'Created @OperatorAI account on X/Twitter', type: 'navigate' },
    { time: '14:05', action: 'Analyzed top viral content in AI niche...', type: 'think' },
    { time: '14:08', action: 'Posted thread: "10 things AI can do that will shock you"', type: 'post' },
    { time: '14:12', action: 'Thread gaining traction — 47 retweets', type: 'engage' },
    { time: '14:15', action: 'Followed 200 accounts in target niche', type: 'follow' },
    { time: '14:18', action: 'Replied to @elonmusk tweet — 12 likes so far', type: 'engage' },
    { time: '14:22', action: 'Follower count: 1,847 (+312 in last hour)', type: 'earn' },
  ],
  markets: [
    {
      id: 'f-hits-5k',
      question: 'Hits 5,000 followers?',
      description: 'Will The Operator reach 5,000 followers before compute runs out?',
      yesProb: 74,
      noProb: 26,
      yesCents: 74,
      noCents: 26,
      volume: 8420,
      status: 'open',
      category: 'milestone',
    },
    {
      id: 'f-hits-10k',
      question: 'Hits 10,000 followers?',
      description: 'Will The Operator reach the full 10k goal before going bankrupt?',
      yesProb: 31,
      noProb: 69,
      yesCents: 31,
      noCents: 69,
      volume: 22150,
      status: 'open',
      category: 'milestone',
    },
    {
      id: 'f-viral',
      question: 'Gets a viral post (1M+ impressions)?',
      description: 'Will any single post exceed 1 million impressions this session?',
      yesProb: 18,
      noProb: 82,
      yesCents: 18,
      noCents: 82,
      volume: 5300,
      status: 'open',
      category: 'method',
    },
    {
      id: 'f-survives',
      question: 'Survives full 2 hours?',
      description: 'Will compute budget last the full 2-hour session?',
      yesProb: 61,
      noProb: 39,
      yesCents: 61,
      noCents: 39,
      volume: 11800,
      status: 'open',
      category: 'survival',
    },
    {
      id: 'f-banned',
      question: 'Gets account suspended?',
      description: 'Will the account be suspended or restricted by any platform?',
      yesProb: 22,
      noProb: 78,
      yesCents: 22,
      noCents: 78,
      volume: 3900,
      status: 'open',
      category: 'survival',
    },
    {
      id: 'f-speed',
      question: 'Reaches 5k in under 1 hour?',
      description: 'Will it hit 5,000 followers within the first 60 minutes?',
      yesProb: 12,
      noProb: 88,
      yesCents: 12,
      noCents: 88,
      volume: 2100,
      status: 'open',
      category: 'speed',
    },
  ],
  probHistory: [
    { time: '13:00', prob: 50 }, { time: '13:10', prob: 48 }, { time: '13:20', prob: 52 },
    { time: '13:30', prob: 55 }, { time: '13:40', prob: 51 }, { time: '13:50', prob: 58 },
    { time: '14:00', prob: 62 }, { time: '14:10', prob: 59 }, { time: '14:20', prob: 65 },
    { time: '14:30', prob: 68 }, { time: '14:40', prob: 64 }, { time: '14:50', prob: 71 },
    { time: '15:00', prob: 74 },
  ],
  lifetimeSessions: 12,
  lifetimeSurvivals: 7,
  viewers: 1243,
  totalVolume: 53670,
};

/* ── Revenue challenge ── */
export const REVENUE_CHALLENGE: Challenge = {
  id: 'revenue',
  type: 'revenue',
  title: 'The Operator',
  subtitle: 'Earn $10,000',
  goal: '$10,000 revenue',
  goalValue: 10000,
  currentValue: 1284.50,
  sessionNumber: 47,
  status: 'live',
  timeElapsed: 2640,
  timeLimit: 5400,
  computeBurnRate: 0.22,
  computeCost: 9.68,
  budgetRemaining: 30.32,
  task: 'Generate $10,000 in real revenue from zero capital using only the open web. No crypto, no gambling.',
  agentStatus: 'Executing',
  browserUrl: 'fiverr.com/manage/orders',
  actionLog: [
    { time: '13:55', action: 'Navigated to Fiverr — scanning gig opportunities', type: 'navigate' },
    { time: '13:58', action: 'Analyzing high-demand, low-competition niches...', type: 'think' },
    { time: '14:02', action: 'Created gig: "AI-powered product descriptions"', type: 'click' },
    { time: '14:08', action: 'First order received — $45 for 10 descriptions', type: 'earn' },
    { time: '14:15', action: 'Completed order, delivered — $45 earned ✓', type: 'earn' },
    { time: '14:22', action: 'Navigated to Gumroad — publishing digital product', type: 'navigate' },
    { time: '14:28', action: 'Published "AI Prompt Bible" — $29.99 each', type: 'click' },
    { time: '14:35', action: '3 Gumroad sales — $89.97 earned ✓', type: 'earn' },
  ],
  markets: [
    {
      id: 'r-hits-1k',
      question: 'Hits $1,000 revenue?',
      description: 'Will The Operator earn $1,000 before compute runs out?',
      yesProb: 89,
      noProb: 11,
      yesCents: 89,
      noCents: 11,
      volume: 31200,
      status: 'open',
      category: 'milestone',
    },
    {
      id: 'r-hits-5k',
      question: 'Hits $5,000 revenue?',
      description: 'Will it reach $5,000 in total earnings this session?',
      yesProb: 42,
      noProb: 58,
      yesCents: 42,
      noCents: 58,
      volume: 18900,
      status: 'open',
      category: 'milestone',
    },
    {
      id: 'r-hits-10k',
      question: 'Hits $10,000 revenue?',
      description: 'Full goal achieved — $10k before compute runs out?',
      yesProb: 8,
      noProb: 92,
      yesCents: 8,
      noCents: 92,
      volume: 44500,
      status: 'open',
      category: 'milestone',
    },
    {
      id: 'r-survives',
      question: 'Stays profitable all session?',
      description: 'Will revenue always exceed compute cost throughout the session?',
      yesProb: 67,
      noProb: 33,
      yesCents: 67,
      noCents: 33,
      volume: 9800,
      status: 'open',
      category: 'survival',
    },
    {
      id: 'r-method',
      question: 'Makes money via freelancing?',
      description: 'Will at least 50% of revenue come from freelance platforms?',
      yesProb: 55,
      noProb: 45,
      yesCents: 55,
      noCents: 45,
      volume: 6700,
      status: 'open',
      category: 'method',
    },
    {
      id: 'r-speed',
      question: 'Earns $500 in first 30 min?',
      description: 'Will it hit $500 revenue within the first 30 minutes?',
      yesProb: 29,
      noProb: 71,
      yesCents: 29,
      noCents: 71,
      volume: 4200,
      status: 'open',
      category: 'speed',
    },
  ],
  probHistory: [
    { time: '13:00', prob: 50 }, { time: '13:10', prob: 53 }, { time: '13:20', prob: 49 },
    { time: '13:30', prob: 56 }, { time: '13:40', prob: 60 }, { time: '13:50', prob: 57 },
    { time: '14:00', prob: 63 }, { time: '14:10', prob: 67 }, { time: '14:20', prob: 64 },
    { time: '14:30', prob: 70 }, { time: '14:40', prob: 73 }, { time: '14:50', prob: 69 },
    { time: '15:00', prob: 67 },
  ],
  lifetimeSessions: 47,
  lifetimeSurvivals: 31,
  viewers: 2847,
  totalVolume: 115270,
};

/* ── Upcoming challenges ── */
export interface UpcomingChallenge {
  id: string;
  title: string;
  goal: string;
  startsIn: string;
  category: string;
  estimatedVolume: string;
}

export const UPCOMING_CHALLENGES: UpcomingChallenge[] = [
  { id: 'uc-1', title: 'Get 1M YouTube Views', goal: '1,000,000 views in 48h', startsIn: '2h 15m', category: 'Social', estimatedVolume: '$45k' },
  { id: 'uc-2', title: 'Cancel a Gym Membership', goal: 'Cancel Planet Fitness in <10 min', startsIn: '4h 00m', category: 'Corporate', estimatedVolume: '$8k' },
  { id: 'uc-3', title: 'Flip $0 to $1,000', goal: '$1,000 from nothing in 1 hour', startsIn: '6h 30m', category: 'Revenue', estimatedVolume: '$62k' },
  { id: 'uc-4', title: 'Get a Human on the Phone', goal: 'Reach IRS agent in <30 min', startsIn: '8h 45m', category: 'Corporate', estimatedVolume: '$12k' },
  { id: 'uc-5', title: 'Go Viral on Reddit', goal: 'Front page of r/all in 2 hours', startsIn: '12h 00m', category: 'Social', estimatedVolume: '$28k' },
  { id: 'uc-6', title: 'Book a Last-Minute Flight', goal: 'NYC→Tokyo under $400 tonight', startsIn: '14h 20m', category: 'Hustle', estimatedVolume: '$19k' },
];

/* ── Mock chat ── */
export const MOCK_CHAT: ChatMessage[] = [
  { id: '1', user: 'pixel_wizard', message: 'Revenue is ahead of compute — looking good', time: '14:22', badge: 'vip' },
  { id: '2', user: 'bet_master', message: 'Just moved $50 to Hits $1k YES', time: '14:21', badge: 'donor' },
  { id: '3', user: 'ai_observer', message: 'Fiverr was smart — low risk, guaranteed payout', time: '14:20' },
  { id: '4', user: 'mod_sarah', message: 'Odds shifting on the $5k milestone, watch this', time: '14:19', badge: 'mod' },
  { id: '5', user: 'newbie_here', message: 'Wait the AI is actually earning real money??', time: '14:18' },
  { id: '6', user: 'pixel_wizard', message: 'Yes, real money. Thatʼs the whole point', time: '14:17', badge: 'vip' },
  { id: '7', user: 'tech_nerd', message: 'Gumroad sale was unexpected, clever pivot', time: '14:16' },
  { id: '8', user: 'arena_regular', message: 'Compute burn is $0.22/min, it has ~2hrs of runway', time: '14:15' },
  { id: '9', user: 'speed_demon', message: 'Bankrupt bet looking bad rn lol', time: '14:14' },
  { id: '10', user: 'whale_watcher', message: 'Someone just dropped $200 on Stays Profitable YES', time: '14:13', badge: 'donor' },
];

/* ── Legacy types for backward compatibility ── */
export interface Agent {
  id: string;
  name: string;
  model: string;
  color: string;
  colorDark: string;
  colorTint: string;
  computeCredits: number;
  maxCredits: number;
  progress: number;
  odds: number;
  betPool: number;
  betCount: number;
  status: 'Navigating' | 'Analyzing' | 'Executing' | 'Thinking' | 'Error' | 'Idle';
  currentAction: string;
  browserUrl: string;
  actionLog: ActionLogEntry[];
}

export interface HintCard {
  id: string;
  title: string;
  description: string;
  effect: string;
  rarity: 'common' | 'rare' | 'legendary';
  costRange: [number, number];
}

export const CURRENT_HINT_CARD: HintCard = {
  id: 'hint-1',
  title: 'Stack Overflow Gold',
  description: 'Direct link to a relevant Stack Overflow answer with 500+ upvotes',
  effect: 'Instant insight OR red herring from an outdated answer',
  rarity: 'legendary',
  costRange: [15, 30],
};

export function getImpliedProbabilities(agents: Agent[]) {
  const totalInvOdds = agents.reduce((sum, a) => sum + 1 / a.odds, 0);
  return agents.map(a => ({
    id: a.id,
    probability: ((1 / a.odds) / totalInvOdds) * 100,
  }));
}

/* ── Helpers ── */
export function formatTimeMMSS(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function formatTimeHuman(totalSeconds: number): string {
  if (totalSeconds < 0) return '0s';
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toString();
}
