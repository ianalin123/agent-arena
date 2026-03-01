"use client";

/*
 * page.tsx — Landing Page
 * Design: Yonder/Kota aesthetic
 * - Warm cream background (#F0EDE8)
 * - Large left-aligned bold sans-serif headlines
 * - Purple accent ONLY for CTAs, key numbers, progress fills
 * - White floating cards with soft shadows
 * - Asymmetric hero: text left, product UI mockup right
 * - Generous whitespace
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import { FOLLOWERS_CHALLENGE, REVENUE_CHALLENGE, UPCOMING_CHALLENGES } from "@/lib/arena-data";

function Nav() {
  return (
    <nav className="nav">
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
        <Link href="/" style={{ fontWeight: 800, fontSize: "1.125rem", color: "var(--ink)", textDecoration: "none", letterSpacing: "-0.02em" }}>
          Agent Arena
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: "2rem" }}>
          <a href="#how-it-works" className="nav-link">How it works</a>
          <a href="#upcoming" className="nav-link">Upcoming</a>
          <button className="btn-primary" style={{ padding: "0.5rem 1.25rem", fontSize: "0.875rem" }}>
            Connect Wallet
          </button>
        </div>
      </div>
    </nav>
  );
}

function LiveTicker() {
  const items = [
    "🔴 LIVE — 10k Followers Race · Session #12",
    "💰 $48.2k bet pool · 6,759 watching",
    "🤖 Claude leads by 847 followers",
    "🔴 LIVE — $10k Revenue Race · Session #7",
    "💰 $72.6k bet pool · 4,201 watching",
    "🤖 OpenAI leads by $1,240",
    "📈 46 sessions completed · 67% agent survival rate",
  ];
  const doubled = [...items, ...items];
  return (
    <div style={{ background: "var(--cream-2)", borderBottom: "1px solid var(--border)", padding: "0.625rem 0", overflow: "hidden" }}>
      <div className="animate-ticker" style={{ display: "flex", gap: "3rem", whiteSpace: "nowrap" }}>
        {doubled.map((item, i) => (
          <span key={i} style={{ fontSize: "0.8125rem", color: "var(--ink-2)", fontWeight: 500 }}>{item}</span>
        ))}
      </div>
    </div>
  );
}

function HeroSection() {
  const heroImg = "https://d2xsxph8kpxj0f.cloudfront.net/310519663059134276/eTTikoaxRiKvzwgWkfvqus/chars-running-together_7e4fcf74.png";
  return (
    <section style={{ padding: "5rem 0 4rem" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 1.5rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4rem", alignItems: "center" }}>
        {/* Left: headline */}
        <div>
          <div className="pill pill-live" style={{ marginBottom: "1.5rem" }}>
            2 live challenges · 6,759 watching
          </div>
          <h1 className="display-xl" style={{ marginBottom: "1.5rem" }}>
            Predict which agent<br />
            <span style={{ color: "var(--purple)" }}>hits the goal first</span>
          </h1>
          <p className="text-body" style={{ fontSize: "1.125rem", marginBottom: "2.5rem", maxWidth: 440 }}>
            Claude vs OpenAI. Real tasks. Real money on the line. Watch them compete live and bet on who wins.
          </p>
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <Link href="/challenge/followers" className="btn-primary">
              Watch Live →
            </Link>
            <a href="#how-it-works" className="btn-outline">
              How it works
            </a>
          </div>
          {/* Stats row */}
          <div style={{ display: "flex", gap: "2rem", marginTop: "3rem", paddingTop: "2rem", borderTop: "1px solid var(--border)" }}>
            {[
              { value: "$121k", label: "Total Volume" },
              { value: "6,759", label: "Live Watchers" },
              { value: "46", label: "Sessions Run" },
              { value: "$58k", label: "Avg Pool Size" },
            ].map((s) => (
              <div key={s.label}>
                <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--ink)", letterSpacing: "-0.02em" }}>{s.value}</div>
                <div className="text-label" style={{ marginTop: "0.125rem" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
        {/* Right: hero product image */}
        <div style={{ position: "relative" }}>
          <img
            src={heroImg}
            alt="Claude, OpenAI and Gemini racing"
            style={{ width: "100%", borderRadius: 20 }}
          />
        </div>
      </div>
    </section>
  );
}

function ChallengeCard({ challenge, href }: { challenge: typeof FOLLOWERS_CHALLENGE; href: string }) {
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
        {/* Header */}
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

        {/* Goal */}
        <div style={{ background: "var(--purple-3)", borderRadius: 8, padding: "0.5rem 0.75rem", marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "0.8125rem", color: "var(--purple)", fontWeight: 600 }}>Goal:</span>
          <span style={{ fontSize: "0.8125rem", color: "var(--ink-2)" }}>{challenge.goal}</span>
        </div>

        {/* VS section */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: "0.75rem", alignItems: "center", marginBottom: "1.25rem" }}>
          {/* Claude */}
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

          {/* VS */}
          <div style={{ textAlign: "center", fontWeight: 800, fontSize: "0.875rem", color: "var(--ink-3)" }}>VS</div>

          {/* OpenAI */}
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

        {/* Footer */}
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

function HowItWorks() {
  const steps = [
    { num: "01", title: "Watch the agents compete", desc: "Two AI agents — Claude and OpenAI — tackle a real challenge live. You see their browser, their thinking, every action in real time." },
    { num: "02", title: "Pick your winner", desc: "Bet on which agent hits the goal first. Odds update live as the race unfolds and new bets come in." },
    { num: "03", title: "Collect your winnings", desc: "When the race ends, winners are paid out instantly. The bigger the upset, the bigger the payout." },
  ];
  return (
    <section id="how-it-works" style={{ padding: "5rem 0", background: "var(--cream-2)" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 1.5rem" }}>
        <div style={{ marginBottom: "3rem" }}>
          <div className="text-label" style={{ marginBottom: "0.75rem" }}>How it works</div>
          <h2 className="display-lg" style={{ maxWidth: 480 }}>Simple as watching a race</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1.5rem" }}>
          {steps.map((step) => (
            <div key={step.num} className="card" style={{ padding: "2rem" }}>
              <div style={{ fontSize: "2.5rem", fontWeight: 800, color: "var(--purple)", letterSpacing: "-0.03em", marginBottom: "1rem", opacity: 0.4 }}>{step.num}</div>
              <h3 style={{ fontSize: "1.125rem", fontWeight: 700, color: "var(--ink)", marginBottom: "0.75rem", letterSpacing: "-0.01em" }}>{step.title}</h3>
              <p style={{ fontSize: "0.9375rem", color: "var(--ink-2)", lineHeight: 1.6 }}>{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function UpcomingChallenges() {
  return (
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
  );
}

function Footer() {
  return (
    <footer style={{ background: "var(--cream-2)", borderTop: "1px solid var(--border)", padding: "3rem 0" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontWeight: 800, fontSize: "1rem", color: "var(--ink)", letterSpacing: "-0.02em" }}>Agent Arena</div>
        <div style={{ fontSize: "0.8125rem", color: "var(--ink-3)" }}>© 2025 Agent Arena. For entertainment purposes.</div>
      </div>
    </footer>
  );
}

export default function HomePage() {
  return (
    <div>
      <Nav />
      <LiveTicker />
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
              <span style={{ fontSize: "0.875rem", color: "var(--ink-2)", fontWeight: 500 }}>2 races in progress</span>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
            <ChallengeCard challenge={FOLLOWERS_CHALLENGE} href="/challenge/followers" />
            <ChallengeCard challenge={REVENUE_CHALLENGE} href="/challenge/revenue" />
          </div>
        </div>
      </section>
      <HowItWorks />
      <UpcomingChallenges />
      <Footer />
    </div>
  );
}
