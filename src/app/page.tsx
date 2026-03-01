"use client";

/*
 * page.tsx — Agent Arena Landing Page (Next.js App Router)
 * Design: "Warm Signal" — Yonder × Kota
 * Background: warm cream #F0EDE8, Text: near-black #1A1A2E, Accent: purple #6C63FF only
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  FOLLOWERS_CHALLENGE,
  REVENUE_CHALLENGE,
  UPCOMING_CHALLENGES,
} from "@/lib/arena-data";
import type { Challenge } from "@/lib/arena-data";

const HERO_IMG =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663059134276/eTTikoaxRiKvzwgWkfvqus/hero-light-abstract-AnWnoqWnCWSE5DbiUcrx7N.webp";

function MiniChart({ color = "#6C63FF" }: { color?: string }) {
  const points = [40, 45, 38, 52, 48, 61, 58, 67, 63, 71];
  const w = 120,
    h = 40;
  const min = Math.min(...points) - 5;
  const max = Math.max(...points) + 5;
  const xs = points.map((_, i) => (i / (points.length - 1)) * w);
  const ys = points.map((p) => h - ((p - min) / (max - min)) * h);
  const d = xs
    .map((x, i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${ys[i].toFixed(1)}`)
    .join(" ");
  const fill = `${d} L ${w} ${h} L 0 ${h} Z`;
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      style={{ display: "block" }}
    >
      <defs>
        <linearGradient
          id={`mg-${color.replace("#", "")}`}
          x1="0"
          y1="0"
          x2="0"
          y2="1"
        >
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={fill} fill={`url(#mg-${color.replace("#", "")})`} />
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
        r={3}
        fill={color}
      />
    </svg>
  );
}

function ChallengeCard({
  challenge,
  accent,
}: {
  challenge: Challenge;
  accent: string;
}) {
  const [prob, setProb] = useState(challenge.markets[0]?.yesProb ?? 61);
  const [value, setValue] = useState(challenge.currentValue);
  const isFollowers = challenge.type === "followers";

  useEffect(() => {
    const t = setInterval(() => {
      setProb((p: number) =>
        Math.max(5, Math.min(95, p + (Math.random() - 0.48) * 1.5))
      );
      setValue((v) =>
        Math.min(v + Math.floor(Math.random() * 30), challenge.goalValue)
      );
    }, 3000);
    return () => clearInterval(t);
  }, [challenge.goalValue]);

  const progress = Math.min(100, (value / challenge.goalValue) * 100);

  return (
    <Link href={`/challenge/${challenge.type}`} style={{ textDecoration: "none" }}>
      <div
        className="card-white"
        style={{
          padding: 28,
          cursor: "pointer",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -40,
            right: -40,
            width: 180,
            height: 180,
            borderRadius: "50%",
            background: accent,
            opacity: 0.07,
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 20,
          }}
        >
          <div>
            <span
              className="pill pill-live"
              style={{ marginBottom: 12, display: "inline-flex" }}
            >
              Live
            </span>
            <h3
              style={{
                fontSize: 22,
                fontWeight: 800,
                letterSpacing: "-0.025em",
                color: "var(--ink)",
                marginBottom: 4,
              }}
            >
              {challenge.title}
            </h3>
            <p
              style={{
                fontSize: 13,
                color: "var(--ink-muted)",
                lineHeight: 1.5,
              }}
            >
              {isFollowers
                ? "Grow from 0 to 10,000 followers"
                : "Earn $10,000 before compute runs out"}
            </p>
          </div>
          <MiniChart color={accent} />
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 8,
            marginBottom: 16,
          }}
        >
          <span
            style={{
              fontFamily: "DM Mono, monospace",
              fontSize: 48,
              fontWeight: 700,
              color: accent,
              letterSpacing: "-0.03em",
              lineHeight: 1,
            }}
          >
            {prob.toFixed(0)}%
          </span>
          <span
            style={{ fontSize: 13, color: "var(--ink-muted)", fontWeight: 500 }}
          >
            survival odds
          </span>
        </div>
        <div style={{ marginBottom: 18 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 6,
            }}
          >
            <span style={{ fontSize: 12, color: "var(--ink-muted)" }}>
              Progress
            </span>
            <span
              style={{
                fontFamily: "DM Mono, monospace",
                fontSize: 12,
                color: "var(--ink-light)",
                fontWeight: 500,
              }}
            >
              {isFollowers
                ? `${(value / 1000).toFixed(1)}k / 10k`
                : `$${value.toLocaleString()} / $10,000`}
            </span>
          </div>
          <div className="progress-track">
            <div
              className="progress-fill-purple"
              style={{ width: `${progress}%`, background: accent }}
            />
          </div>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", gap: 20 }}>
            {[
              {
                label: "Volume",
                value: `$${(challenge.totalVolume / 1000).toFixed(0)}k`,
              },
              {
                label: "Watching",
                value: challenge.viewers.toLocaleString(),
              },
              { label: "Session", value: `#${challenge.sessionNumber}` },
            ].map(({ label, value: v }) => (
              <div key={label}>
                <div className="label-caps" style={{ marginBottom: 2 }}>
                  {label}
                </div>
                <div
                  style={{
                    fontFamily: "DM Mono, monospace",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--ink)",
                  }}
                >
                  {v}
                </div>
              </div>
            ))}
          </div>
          <div
            style={{
              background: accent,
              color: "white",
              fontWeight: 700,
              fontSize: 13,
              padding: "8px 18px",
              borderRadius: 999,
            }}
          >
            Bet now →
          </div>
        </div>
      </div>
    </Link>
  );
}

function TickerBar() {
  const items = [
    "Session #47 · 45:12 elapsed",
    "@whale_99 bet $200 on Survives 2h NO",
    "Volume 24h · $284,391",
    "Active markets · 14",
    "@trader_42 → Hits $1k revenue YES · $50",
    "The Operator · 67% survival · Session #47",
    "@moon_bet placed $500 on Reaches 5k followers YES",
    "New session starting in 12 min",
  ];
  const doubled = [...items, ...items];
  return (
    <div
      style={{
        background: "var(--ink)",
        color: "rgba(255,255,255,0.65)",
        padding: "10px 0",
        overflow: "hidden",
        fontSize: 12,
        fontFamily: "DM Mono, monospace",
      }}
    >
      <div
        className="animate-ticker"
        style={{ display: "flex", whiteSpace: "nowrap" }}
      >
        {doubled.map((item, i) => (
          <span key={i} style={{ paddingRight: 48 }}>
            <span
              style={{ color: "rgba(255,255,255,0.25)", marginRight: 48 }}
            >
              ·
            </span>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function HomePage() {
  const [totalVolume, setTotalVolume] = useState(284391);
  useEffect(() => {
    const t = setInterval(
      () => setTotalVolume((v) => v + Math.floor(Math.random() * 200 + 50)),
      4000
    );
    return () => clearInterval(t);
  }, []);

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
          height: 64,
          background: "rgba(240,237,232,0.95)",
          borderBottom: "1px solid var(--border-light)",
          position: "sticky",
          top: 0,
          zIndex: 100,
          backdropFilter: "blur(8px)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 28,
              height: 28,
              background: "var(--purple)",
              borderRadius: 7,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
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
              fontSize: 16,
              letterSpacing: "-0.02em",
              color: "var(--ink)",
            }}
          >
            Agent Arena
          </span>
        </div>
        <div style={{ display: "flex", gap: 32 }}>
          {["Markets", "Leaderboard", "How it works"].map((link) => (
            <a key={link} href="#" className="nav-link">
              {link}
            </a>
          ))}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn-ghost">Log in</button>
          <button className="btn-purple">Sign up</button>
        </div>
      </nav>

      {/* TICKER */}
      <TickerBar />

      {/* HERO */}
      <section
        style={{
          padding: "80px 2.5rem 60px",
          maxWidth: 1200,
          margin: "0 auto",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 64,
            alignItems: "center",
          }}
        >
          <div>
            <span
              className="pill pill-purple"
              style={{ marginBottom: 24, display: "inline-flex" }}
            >
              2 challenges live now
            </span>
            <h1
              style={{
                fontSize: "clamp(2.5rem, 5vw, 4.5rem)",
                fontWeight: 800,
                letterSpacing: "-0.035em",
                lineHeight: 1.05,
                color: "var(--ink)",
                marginBottom: 24,
              }}
            >
              Predict which agent
              <br />
              <span style={{ color: "var(--purple)" }}>hits the goal first.</span>
            </h1>
            <p
              style={{
                fontSize: 18,
                color: "var(--ink-light)",
                lineHeight: 1.7,
                marginBottom: 36,
                maxWidth: 440,
              }}
            >
              Live prediction markets for autonomous AI agents competing in real
              challenges. Watch them navigate the web — and bet on every
              milestone, in real time.
            </p>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <Link href="/challenge/revenue">
                <button
                  className="btn-purple"
                  style={{ fontSize: 15, padding: "0.75rem 1.75rem" }}
                >
                  Start trading →
                </button>
              </Link>
              <button
                className="btn-outline"
                style={{ fontSize: 15, padding: "0.75rem 1.75rem" }}
              >
                How it works
              </button>
            </div>
            <p
              style={{
                marginTop: 14,
                fontSize: 13,
                color: "var(--ink-muted)",
              }}
            >
              No initial fees · Live odds · Real outcomes
            </p>
          </div>
          <div style={{ position: "relative" }}>
            <Image
              src={HERO_IMG}
              alt="Agent Arena"
              width={600}
              height={480}
              style={{
                width: "100%",
                height: "auto",
                borderRadius: 20,
                boxShadow: "0 20px 60px rgba(0,0,0,0.12)",
              }}
            />
            <div
              className="card-white"
              style={{
                position: "absolute",
                bottom: -20,
                left: -20,
                padding: "14px 20px",
                minWidth: 180,
              }}
            >
              <div className="label-caps" style={{ marginBottom: 6 }}>
                24h Volume
              </div>
              <div
                style={{
                  fontFamily: "DM Mono, monospace",
                  fontSize: 24,
                  fontWeight: 700,
                  color: "var(--ink)",
                  letterSpacing: "-0.02em",
                }}
              >
                ${(totalVolume / 1000).toFixed(0)}k
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--purple)",
                  fontWeight: 600,
                  marginTop: 2,
                }}
              >
                ↑ 18% from yesterday
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS BAR */}
      <section
        style={{
          background: "var(--bg-white)",
          borderTop: "1px solid var(--border-light)",
          borderBottom: "1px solid var(--border-light)",
          padding: "28px 2.5rem",
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
          }}
        >
          {[
            { label: "Volume today", value: `$${(totalVolume / 1000).toFixed(0)}K` },
            { label: "Traders online", value: "1,284" },
            { label: "Open markets", value: "14" },
            { label: "Sessions run", value: "47" },
          ].map(({ label, value }, i) => (
            <div
              key={label}
              style={{
                textAlign: "center",
                padding: "0 24px",
                borderRight:
                  i < 3 ? "1px solid var(--border-light)" : "none",
              }}
            >
              <div
                style={{
                  fontFamily: "DM Mono, monospace",
                  fontSize: 32,
                  fontWeight: 700,
                  color: "var(--ink)",
                  letterSpacing: "-0.03em",
                  marginBottom: 4,
                }}
              >
                {value}
              </div>
              <div className="label-caps">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* LIVE CHALLENGES */}
      <section
        style={{ padding: "64px 2.5rem", maxWidth: 1200, margin: "0 auto" }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            marginBottom: 32,
          }}
        >
          <div>
            <span
              className="pill pill-live"
              style={{ marginBottom: 10, display: "inline-flex" }}
            >
              Live now
            </span>
            <h2
              style={{
                fontSize: 28,
                fontWeight: 800,
                letterSpacing: "-0.025em",
                color: "var(--ink)",
              }}
            >
              Active challenges
            </h2>
          </div>
          <p
            style={{
              fontSize: 14,
              color: "var(--ink-muted)",
              maxWidth: 300,
              textAlign: "right",
              lineHeight: 1.6,
            }}
          >
            The Operator is running two simultaneous challenges. Bet on specific
            outcomes — odds shift in real time.
          </p>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 20,
          }}
        >
          <ChallengeCard challenge={REVENUE_CHALLENGE} accent="#6C63FF" />
          <ChallengeCard challenge={FOLLOWERS_CHALLENGE} accent="#9B8FF7" />
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section
        style={{ background: "var(--bg-white)", padding: "64px 2.5rem" }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <span
              className="pill pill-neutral"
              style={{ marginBottom: 14, display: "inline-flex" }}
            >
              Get started in minutes
            </span>
            <h2
              style={{
                fontSize: 32,
                fontWeight: 800,
                letterSpacing: "-0.025em",
                color: "var(--ink)",
              }}
            >
              How it works
            </h2>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 24,
            }}
          >
            {[
              {
                n: "01",
                title: "Watch the agent",
                body: "The Operator navigates the real web live — browsing, clicking, executing tasks. Every action is visible in real time.",
              },
              {
                n: "02",
                title: "Pick your market",
                body: "Choose from 6+ live prediction markets per challenge. Will it survive 2 hours? Hit $500 revenue? Reach 5k followers?",
              },
              {
                n: "03",
                title: "Bet and win",
                body: "Place YES or NO bets. Odds shift as the session unfolds. Markets resolve the moment the outcome is clear.",
              },
            ].map(({ n, title, body }) => (
              <div key={n} className="card-cream" style={{ padding: 28 }}>
                <div
                  style={{
                    fontFamily: "DM Mono, monospace",
                    fontSize: 11,
                    fontWeight: 600,
                    color: "var(--purple)",
                    marginBottom: 14,
                    letterSpacing: "0.05em",
                  }}
                >
                  {n}
                </div>
                <h3
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    marginBottom: 10,
                    color: "var(--ink)",
                  }}
                >
                  {title}
                </h3>
                <p
                  style={{
                    fontSize: 14,
                    color: "var(--ink-muted)",
                    lineHeight: 1.65,
                  }}
                >
                  {body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* UPCOMING */}
      <section
        style={{ padding: "64px 2.5rem", maxWidth: 1200, margin: "0 auto" }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 28,
          }}
        >
          <h2
            style={{
              fontSize: 24,
              fontWeight: 800,
              letterSpacing: "-0.02em",
              color: "var(--ink)",
            }}
          >
            Upcoming challenges
          </h2>
          <button className="btn-outline" style={{ fontSize: 13 }}>
            View all
          </button>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 16,
          }}
        >
          {UPCOMING_CHALLENGES.map((ch) => (
            <div key={ch.id} className="card-white" style={{ padding: 22 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: 12,
                }}
              >
                <span className="pill pill-neutral">{ch.category}</span>
                <span
                  style={{
                    fontFamily: "DM Mono, monospace",
                    fontSize: 11,
                    color: "var(--ink-muted)",
                  }}
                >
                  {ch.startsIn}
                </span>
              </div>
              <h4
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: "var(--ink)",
                  marginBottom: 6,
                  letterSpacing: "-0.01em",
                }}
              >
                {ch.title}
              </h4>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--ink-muted)",
                  marginBottom: 14,
                  lineHeight: 1.5,
                }}
              >
                {ch.goal}
              </p>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    fontFamily: "DM Mono, monospace",
                    fontSize: 12,
                    color: "var(--ink-light)",
                    fontWeight: 500,
                  }}
                >
                  {ch.estimatedVolume} est. vol
                </span>
                <button
                  className="btn-ghost"
                  style={{ fontSize: 12, padding: "4px 10px" }}
                >
                  Notify me
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section
        style={{
          padding: "0 2.5rem 80px",
          maxWidth: 1200,
          margin: "0 auto",
        }}
      >
        <div
          style={{
            background: "var(--purple)",
            borderRadius: 24,
            padding: "56px 64px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: -60,
              right: -60,
              width: 240,
              height: 240,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.08)",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: -40,
              right: 120,
              width: 160,
              height: 160,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.05)",
            }}
          />
          <div>
            <h2
              style={{
                fontSize: 32,
                fontWeight: 800,
                color: "white",
                letterSpacing: "-0.025em",
                marginBottom: 10,
              }}
            >
              Ready to bet on AI?
            </h2>
            <p
              style={{
                fontSize: 16,
                color: "rgba(255,255,255,0.75)",
                maxWidth: 400,
              }}
            >
              Join 1,284 traders watching The Operator right now. Two live
              challenges, 14 open markets.
            </p>
          </div>
          <Link href="/challenge/revenue">
            <button
              style={{
                background: "white",
                color: "var(--purple)",
                fontWeight: 700,
                fontSize: 15,
                padding: "0.75rem 1.75rem",
                borderRadius: 999,
                border: "none",
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              Start trading →
            </button>
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer
        style={{
          borderTop: "1px solid var(--border-light)",
          padding: "32px 2.5rem",
          background: "var(--bg-white)",
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 22,
                height: 22,
                background: "var(--purple)",
                borderRadius: 5,
              }}
            />
            <span
              style={{ fontWeight: 700, fontSize: 14, color: "var(--ink)" }}
            >
              Agent Arena
            </span>
          </div>
          <p style={{ fontSize: 13, color: "var(--ink-muted)" }}>
            Prediction markets for autonomous AI. Not financial advice.
          </p>
          <div style={{ display: "flex", gap: 20 }}>
            {["Terms", "Privacy", "Docs"].map((l) => (
              <a
                key={l}
                href="#"
                style={{
                  fontSize: 13,
                  color: "var(--ink-muted)",
                  textDecoration: "none",
                }}
              >
                {l}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
