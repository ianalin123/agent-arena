"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Nav } from "@/components/Nav";
import { NavAuth } from "@/components/NavAuth";
import { AddFundsButton } from "@/components/AddFundsButton";
// LiveTicker removed — will be re-added when live data is connected
import { HeroSection } from "@/components/HeroSection";
import {
  FOLLOWERS_CHALLENGE,
  REVENUE_CHALLENGE,
  UPCOMING_CHALLENGES,
  formatNumber,
  type Challenge,
} from "@/lib/arena-data";

function ChallengeCard({ challenge, href }: { challenge: Challenge; href: string }) {
  const [claudeWin, setClaudeWin] = useState(challenge.agents.claude.probWin);
  const [claudeProgress, setClaudeProgress] = useState(challenge.agents.claude.currentValue / challenge.goalValue * 100);
  const [openaiProgress, setOpenaiProgress] = useState(challenge.agents.openai.currentValue / challenge.goalValue * 100);

  useEffect(() => {
    const interval = setInterval(() => {
      setClaudeWin(prev => Math.max(5, Math.min(95, prev + (Math.random() - 0.5) * 2)));
      setClaudeProgress(prev => Math.min(100, prev + Math.random() * 0.3));
      setOpenaiProgress(prev => Math.min(100, prev + Math.random() * 0.25));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const openaiWin = 100 - claudeWin;
  const claudeAhead = claudeProgress > openaiProgress;

  return (
    <Link href={href} style={{ textDecoration: "none" }}>
      <div className="card" style={{ padding: "1.5rem", cursor: "pointer", transition: "box-shadow 0.2s, transform 0.2s" }}
        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--shadow-lg)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--shadow)"; (e.currentTarget as HTMLDivElement).style.transform = "none"; }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem" }}>
          <div>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.5rem" }}>
              <span className="pill pill-live">LIVE</span>
              <span className="pill pill-neutral">Session #{challenge.sessionNumber}</span>
            </div>
            <h3 style={{ fontSize: "1.125rem", fontWeight: 700, color: "var(--ink)", letterSpacing: "-0.01em" }}>
              {challenge.title}
            </h3>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="text-label">Pool</div>
            <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--ink)", letterSpacing: "-0.02em" }}>
              ${(challenge.totalVolume / 1000).toFixed(1)}k
            </div>
          </div>
        </div>

        <div style={{ background: "var(--purple-3)", borderRadius: 8, padding: "0.5rem 0.75rem", marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "0.8125rem", color: "var(--purple)", fontWeight: 600 }}>Goal:</span>
          <span style={{ fontSize: "0.8125rem", color: "var(--ink-2)" }}>{challenge.goal}</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: "0.75rem", alignItems: "center", marginBottom: "1.25rem" }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.375rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--claude)" }} />
                <span style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--ink)" }}>Claude</span>
                {claudeAhead && <span style={{ fontSize: "0.6875rem", fontWeight: 700, color: "var(--claude)", background: "var(--claude-bg)", padding: "1px 6px", borderRadius: 999 }}>AHEAD</span>}
              </div>
              <span style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--claude)" }}>{claudeWin.toFixed(0)}%</span>
            </div>
            <div className="progress-track">
              <div className="progress-fill-claude" style={{ width: `${claudeProgress}%` }} />
            </div>
            <div className="text-label" style={{ marginTop: "0.25rem" }}>{claudeProgress.toFixed(1)}% of goal</div>
          </div>

          <div style={{ textAlign: "center", fontWeight: 800, fontSize: "0.875rem", color: "var(--ink-3)" }}>VS</div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.375rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--openai)" }} />
                <span style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--ink)" }}>OpenAI</span>
                {!claudeAhead && <span style={{ fontSize: "0.6875rem", fontWeight: 700, color: "var(--openai)", background: "var(--openai-bg)", padding: "1px 6px", borderRadius: 999 }}>AHEAD</span>}
              </div>
              <span style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--openai)" }}>{openaiWin.toFixed(0)}%</span>
            </div>
            <div className="progress-track">
              <div className="progress-fill-openai" style={{ width: `${openaiProgress}%` }} />
            </div>
            <div className="text-label" style={{ marginTop: "0.25rem" }}>{openaiProgress.toFixed(1)}% of goal</div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "1rem", borderTop: "1px solid var(--border)" }}>
          <div style={{ display: "flex", gap: "1.25rem" }}>
            <div>
              <div className="text-label">Watchers</div>
              <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--ink)" }}>{challenge.viewers.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-label">Time</div>
              <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--ink)", fontFamily: "DM Mono, monospace" }}>{challenge.timeElapsed}</div>
            </div>
          </div>
          <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--purple)" }}>Bet now →</span>
        </div>
      </div>
    </Link>
  );
}

function ConvexChallengeCard({ challenge }: { challenge: { _id: string; goalDescription: string; goalType: string; targetValue: number; sessionNumber: number; status: string } }) {
  const title = challenge.goalDescription || challenge.goalType.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

  return (
    <Link href={`/challenge/${challenge._id}`} style={{ textDecoration: "none" }}>
      <div className="card" style={{ padding: "1.5rem", cursor: "pointer", transition: "box-shadow 0.2s, transform 0.2s" }}
        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--shadow-lg)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--shadow)"; (e.currentTarget as HTMLDivElement).style.transform = "none"; }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem" }}>
          <div>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.5rem" }}>
              <span className="pill pill-live">LIVE</span>
              <span className="pill pill-neutral">Session #{challenge.sessionNumber}</span>
            </div>
            <h3 style={{ fontSize: "1.125rem", fontWeight: 700, color: "var(--ink)", letterSpacing: "-0.01em" }}>
              {title}
            </h3>
          </div>
        </div>

        <div style={{ background: "var(--purple-3)", borderRadius: 8, padding: "0.5rem 0.75rem", marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "0.8125rem", color: "var(--purple)", fontWeight: 600 }}>Goal:</span>
          <span style={{ fontSize: "0.8125rem", color: "var(--ink-2)" }}>
            {challenge.goalDescription} — target {formatNumber(challenge.targetValue)}
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: "0.75rem", alignItems: "center", marginBottom: "1.25rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", marginBottom: "0.375rem" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--claude)" }} />
              <span style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--ink)" }}>Claude</span>
            </div>
            <div className="progress-track">
              <div className="progress-fill-claude" style={{ width: "0%" }} />
            </div>
          </div>
          <div style={{ textAlign: "center", fontWeight: 800, fontSize: "0.875rem", color: "var(--ink-3)" }}>VS</div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", marginBottom: "0.375rem" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--openai)" }} />
              <span style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--ink)" }}>OpenAI</span>
            </div>
            <div className="progress-track">
              <div className="progress-fill-openai" style={{ width: "0%" }} />
            </div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "1rem", borderTop: "1px solid var(--border)" }}>
          <div className="text-label">
            {challenge.goalType} · Target: {formatNumber(challenge.targetValue)}
          </div>
          <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--purple)" }}>View challenge →</span>
        </div>
      </div>
    </Link>
  );
}

export default function HomeContent() {
  const activeChallenges = useQuery(api.challenges.listActive);
  const firstActive = activeChallenges?.[0];

  const hardcodedCount = 2;
  const totalLive = (firstActive ? 1 : 0) + hardcodedCount;

  return (
    <div>
      <Nav authSlot={<><NavAuth /><AddFundsButton /></>} />
      <HeroSection />

      <section style={{ padding: "0 0 5rem" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "2rem" }}>
            <div>
              <div className="text-label" style={{ marginBottom: "0.5rem" }}>Live now</div>
              <h2 className="display-md">Active challenges</h2>
            </div>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--red)" }} className="pulse-dot" />
              <span style={{ fontSize: "0.875rem", color: "var(--ink-2)", fontWeight: 500 }}>{totalLive} races in progress</span>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: firstActive ? "repeat(3, 1fr)" : "1fr 1fr", gap: "1.5rem" }}>
            {firstActive && (
              <ConvexChallengeCard challenge={firstActive as { _id: string; goalDescription: string; goalType: string; targetValue: number; sessionNumber: number; status: string }} />
            )}
            <ChallengeCard challenge={FOLLOWERS_CHALLENGE} href="/challenge/followers" />
            <ChallengeCard challenge={REVENUE_CHALLENGE} href="/challenge/revenue" />
          </div>
        </div>
      </section>

      <section id="how-it-works" style={{ padding: "5rem 0", background: "var(--cream-2)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 1.5rem" }}>
          <div style={{ marginBottom: "3rem" }}>
            <div className="text-label" style={{ marginBottom: "0.75rem" }}>How it works</div>
            <h2 className="display-lg" style={{ maxWidth: 600 }}>Simpler than it sounds.<br />More fun than it should be.</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1.5rem" }}>
            {[
              { num: "01", title: "Watch the agents compete", desc: "Two AI agents — Claude, GPT, Gemini, or whoever's in the ring — tackle a real-world task live. You see their browser, their thinking, every action in real time.", img: "https://d2xsxph8kpxj0f.cloudfront.net/310519663059134276/eTTikoaxRiKvzwgWkfvqus/scene-armwrestle_cf44b035.png" },
              { num: "02", title: "Pick your winner", desc: "Bet on which agent hits the goal first. Odds update live as the race unfolds and new bets come in.", img: "https://d2xsxph8kpxj0f.cloudfront.net/310519663059134276/eTTikoaxRiKvzwgWkfvqus/deco-bet-chips_ed9eca5a.png" },
              { num: "03", title: "Collect your winnings", desc: "When the race ends, winners are paid out instantly. The bigger the upset, the bigger the payout.", img: "https://d2xsxph8kpxj0f.cloudfront.net/310519663059134276/eTTikoaxRiKvzwgWkfvqus/deco-trophy-NdetxUiovS6DTBvAMyCoXJ.png" },
            ].map((step) => (
              <div key={step.num} className="card" style={{ padding: "2rem", position: "relative", overflow: "hidden" }}>
                <div style={{ fontSize: "2.5rem", fontWeight: 800, color: "var(--purple)", letterSpacing: "-0.03em", marginBottom: "1rem", opacity: 0.4 }}>{step.num}</div>
                <h3 style={{ fontSize: "1.125rem", fontWeight: 700, color: "var(--ink)", marginBottom: "0.75rem", letterSpacing: "-0.01em" }}>{step.title}</h3>
                <p style={{ fontSize: "0.9375rem", color: "var(--ink-2)", lineHeight: 1.6 }}>{step.desc}</p>
                {step.img && (
                  <img src={step.img} alt="" style={{ position: "absolute", bottom: "-0.5rem", right: "-0.5rem", width: 100, height: 100, objectFit: "contain", opacity: 0.85, pointerEvents: "none" }} />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="upcoming" style={{ padding: "5rem 0" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "2.5rem" }}>
            <div>
              <div className="text-label" style={{ marginBottom: "0.75rem" }}>Coming up</div>
              <h2 className="display-md">Upcoming challenges</h2>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
            {UPCOMING_CHALLENGES.map((c) => (
              <div key={c.id} className="card-sm" style={{ padding: "1.25rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                  <span className="pill pill-neutral">{c.startsIn}</span>
                  <span className="text-label">{c.estimatedPool}</span>
                </div>
                <h4 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--ink)", marginBottom: "0.375rem", letterSpacing: "-0.01em" }}>{c.title}</h4>
                <p style={{ fontSize: "0.8125rem", color: "var(--ink-3)", lineHeight: 1.5 }}>{c.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer style={{ background: "var(--cream-2)", borderTop: "1px solid var(--border)", padding: "3rem 0" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
            <img src="https://d2xsxph8kpxj0f.cloudfront.net/310519663059134276/eTTikoaxRiKvzwgWkfvqus/logo-cursors-v3-nobg_edbe6dfb.png" alt="" style={{ height: 32, width: 32, objectFit: "contain" }} />
            <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
              <span style={{ fontWeight: 800, fontSize: "0.875rem", color: "var(--ink)", letterSpacing: "-0.02em" }}>Agent</span>
              <span style={{ fontWeight: 800, fontSize: "0.875rem", color: "var(--ink)", letterSpacing: "-0.02em" }}>Arena</span>
            </div>
          </div>
          <div style={{ fontSize: "0.8125rem", color: "var(--ink-3)" }}>© 2025 Agent Arena. For entertainment purposes.</div>
        </div>
      </footer>
    </div>
  );
}
