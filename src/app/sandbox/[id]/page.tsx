"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Nav } from "@/components/Nav";
import { NavAuth } from "@/components/NavAuth";
import { VMWindow } from "@/components/VMWindow";
import { useGuestUser } from "../../GuestUserProvider";

function formatTimeRemaining(expiresAt: number): string {
  const diff = expiresAt - Date.now();
  if (diff <= 0) return "Expired";
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1_000);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function modelAgent(model: string): "claude" | "openai" {
  const lower = model.toLowerCase();
  if (lower.includes("claude") || lower.includes("sonnet") || lower.includes("opus") || lower.includes("haiku")) {
    return "claude";
  }
  return "openai";
}

function modelLabel(model: string): string {
  const lower = model.toLowerCase();
  if (lower.includes("sonnet")) return "Claude Sonnet";
  if (lower.includes("opus")) return "Claude Opus";
  if (lower.includes("haiku")) return "Claude Haiku";
  if (lower.includes("gpt-4o")) return "GPT-4o";
  if (lower.includes("gpt-4")) return "GPT-4";
  if (lower.includes("o1")) return "o1";
  if (lower.includes("o3")) return "o3";
  return model;
}

function statusColor(status: string): { bg: string; color: string; border: string } {
  switch (status) {
    case "active":
      return { bg: "rgba(22,163,74,0.08)", color: "var(--green)", border: "rgba(22,163,74,0.2)" };
    case "completed":
      return { bg: "var(--purple-2)", color: "var(--purple)", border: "rgba(124,111,247,0.25)" };
    case "failed":
      return { bg: "var(--red-bg)", color: "var(--red)", border: "rgba(220,38,38,0.2)" };
    case "pending":
      return { bg: "var(--cream-2)", color: "var(--ink-3)", border: "var(--border)" };
    default:
      return { bg: "var(--cream-2)", color: "var(--ink-3)", border: "var(--border)" };
  }
}

function tryParsePayload(payload: string): Record<string, unknown> | null {
  try {
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

export default function SandboxDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);

  const data = useQuery(api.sandboxes.get, { sandboxId: id as Id<"sandboxes"> });
  const events = useQuery(api.events.listBySandbox, { sandboxId: id as Id<"sandboxes">, limit: 50 });
  const screenshot = useQuery(api.events.getLatestScreenshot, { sandboxId: id as Id<"sandboxes"> });
  const odds = useQuery(api.betting.getOdds, { sandboxId: id as Id<"sandboxes"> });
  const currentUser = useQuery(api.users.currentUser);
  const { userId: guestUserId, balance: guestBalance } = useGuestUser();
  const placeBet = useMutation(api.betting.placeBet);
  const placeBetAsGuestForSandbox = useMutation(api.betting.placeBetAsGuestForSandbox);

  const [betPosition, setBetPosition] = useState<"yes" | "no" | null>(null);
  const [betAmount, setBetAmount] = useState("10");
  const [betPlaced, setBetPlaced] = useState(false);
  const [betError, setBetError] = useState<string | null>(null);

  if (data === undefined || events === undefined) {
    return (
      <div style={{ minHeight: "100vh" }}>
        <Nav authSlot={<NavAuth />} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "calc(100vh - 64px)" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
            <div style={{
              width: 32, height: 32, border: "3px solid var(--purple-2)",
              borderTopColor: "var(--purple)", borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }} />
            <span style={{ color: "var(--ink-3)", fontSize: "0.875rem" }}>Loading sandbox…</span>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        </div>
      </div>
    );
  }

  const sandbox = data?.sandbox;

  if (!sandbox) {
    return (
      <div style={{ minHeight: "100vh" }}>
        <Nav authSlot={<NavAuth />} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "calc(100vh - 64px)" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--ink)", marginBottom: "0.5rem" }}>
              Sandbox not found
            </div>
            <Link href="/" style={{ color: "var(--purple)", fontWeight: 600, textDecoration: "none" }}>
              ← Back to Arena
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const agent = modelAgent(sandbox.model);
  const agentColor = agent === "claude" ? "var(--claude)" : "var(--openai)";
  const progress = sandbox.targetValue > 0
    ? Math.min(100, (sandbox.currentProgress / sandbox.targetValue) * 100)
    : 0;
  const sc = statusColor(sandbox.status);
  const screenshotUrl = screenshot?.url ?? null;

  const balance = currentUser?.balance ?? guestBalance ?? 0;

  async function handlePlaceBet() {
    if (!betPosition || !betAmount) return;
    const amt = parseFloat(betAmount);
    if (isNaN(amt) || amt <= 0) return;
    setBetError(null);
    try {
      if (currentUser?._id) {
        await placeBet({ sandboxId: id as Id<"sandboxes">, amount: amt, position: betPosition });
      } else if (guestUserId) {
        await placeBetAsGuestForSandbox({ sandboxId: id as Id<"sandboxes">, amount: amt, position: betPosition, userId: guestUserId });
      } else {
        throw new Error("Sign in or refresh to place a bet");
      }
      setBetPlaced(true);
      setTimeout(() => setBetPlaced(false), 3000);
    } catch (err: unknown) {
      setBetError(err instanceof Error ? err.message : "Failed to place bet");
    }
  }

  const yesOdds = odds?.yesOdds ?? 1;
  const noOdds = odds?.noOdds ?? 1;
  const potentialPayout = betPosition && betAmount
    ? (parseFloat(betAmount) * (betPosition === "yes" ? yesOdds : noOdds)).toFixed(2)
    : "0.00";

  return (
    <div style={{ minHeight: "100vh" }}>
      <Nav authSlot={<NavAuth />} />

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "1.5rem 1.5rem 3rem" }}>
        {/* Back link */}
        <Link
          href="/"
          style={{
            display: "inline-flex", alignItems: "center", gap: "0.375rem",
            color: "var(--ink-2)", fontSize: "0.875rem", fontWeight: 500,
            textDecoration: "none", marginBottom: "1.25rem",
          }}
        >
          ← Back to Arena
        </Link>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 380px", gap: "1.5rem", alignItems: "start" }}>
          {/* ── LEFT COLUMN ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", minWidth: 0 }}>
            {/* Browser view */}
            <div className="card-sm" style={{ padding: "1.25rem" }}>
              <VMWindow
                agent={agent}
                liveUrl={sandbox.liveUrl}
                shareUrl={sandbox.shareUrl}
                screenshotUrl={screenshotUrl}
                agentStatus={sandbox.status === "active" ? "working" : sandbox.status}
              />
            </div>

            {/* Event log */}
            <div className="card-sm" style={{ padding: "1.25rem" }}>
              <div className="text-label" style={{ marginBottom: "0.75rem" }}>Agent Event Log</div>
              <div style={{
                maxHeight: 400, overflowY: "auto",
                background: "var(--cream-2)", borderRadius: 10, padding: "0.625rem",
                scrollbarWidth: "thin", scrollbarColor: "var(--border) transparent",
              }}>
                {events && events.length > 0 ? events.map((evt) => {
                  const parsed = tryParsePayload(evt.payload);
                  return (
                    <div key={evt._id} style={{
                      display: "flex", gap: "0.625rem", padding: "0.5rem 0.375rem",
                      borderBottom: "1px solid var(--border)", fontSize: "0.8125rem",
                      lineHeight: 1.4,
                    }}>
                      <span style={{
                        fontFamily: "DM Mono, monospace", fontSize: "0.6875rem",
                        color: "var(--ink-3)", flexShrink: 0, paddingTop: 1, minWidth: 70,
                      }}>
                        {formatTimestamp(evt.timestamp)}
                      </span>
                      <span style={{
                        fontWeight: 600, fontSize: "0.75rem", flexShrink: 0,
                        color: evt.eventType === "error" ? "var(--red)"
                          : evt.eventType === "success" || evt.eventType === "goal_complete" ? "var(--green)"
                          : "var(--purple)",
                        minWidth: 80,
                      }}>
                        {evt.eventType}
                      </span>
                      <span style={{ color: "var(--ink-2)", wordBreak: "break-word" }}>
                        {parsed
                          ? (parsed.message as string) ?? (parsed.text as string) ?? JSON.stringify(parsed)
                          : evt.payload}
                      </span>
                    </div>
                  );
                }) : (
                  <div style={{ padding: "1rem", textAlign: "center", color: "var(--ink-3)", fontSize: "0.8125rem" }}>
                    No events yet
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── RIGHT COLUMN (380px sidebar) ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", position: "sticky", top: 80 }}>
            {/* Goal Progress Card */}
            <div className="card-sm" style={{ padding: "1.25rem" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
                <div className="text-label">Goal Progress</div>
                <span className="pill" style={{
                  background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`,
                }}>
                  {sandbox.status === "active" && (
                    <span style={{
                      width: 6, height: 6, borderRadius: "50%", background: sc.color,
                      display: "inline-block", marginRight: 4, animation: "pulse-dot 1.5s ease-in-out infinite",
                    }} />
                  )}
                  {sandbox.status}
                </span>
              </div>

              <div style={{ fontSize: "0.9375rem", fontWeight: 600, color: "var(--ink)", marginBottom: "0.375rem", lineHeight: 1.4 }}>
                {sandbox.goalDescription}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--ink-3)", marginBottom: "1rem" }}>
                Type: {sandbox.goalType}
              </div>

              {/* Progress bar */}
              <div style={{ marginBottom: "0.75rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.375rem" }}>
                  <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--ink)" }}>
                    {sandbox.currentProgress} / {sandbox.targetValue}
                  </span>
                  <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: agentColor }}>
                    {progress.toFixed(1)}%
                  </span>
                </div>
                <div className="progress-track">
                  <div
                    className={agent === "claude" ? "progress-fill-claude" : "progress-fill-openai"}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* Model label */}
              <div style={{
                display: "flex", alignItems: "center", gap: "0.5rem",
                padding: "0.5rem 0.75rem", background: agent === "claude" ? "var(--claude-bg)" : "var(--openai-bg)",
                borderRadius: 8, border: `1px solid ${agent === "claude" ? "var(--claude-border)" : "var(--openai-border)"}`,
              }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: agentColor }} />
                <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: agentColor }}>
                  {modelLabel(sandbox.model)}
                </span>
              </div>

              {/* Time remaining */}
              {sandbox.status === "active" && (
                <div style={{ marginTop: "0.75rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className="text-label">Time remaining</span>
                  <span style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--ink)", fontFamily: "DM Mono, monospace" }}>
                    {formatTimeRemaining(sandbox.expiresAt)}
                  </span>
                </div>
              )}
            </div>

            {/* Betting Panel */}
            <div className="card-sm" style={{ padding: "1.25rem" }}>
              <div className="text-label" style={{ marginBottom: "0.375rem" }}>Place a Bet</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <div style={{ fontSize: "0.9375rem", fontWeight: 700, color: "var(--ink)" }}>
                  Will this agent hit the goal?
                </div>
                <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--ink-3)" }}>
                  Balance: ${balance.toFixed(2)}
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem", marginBottom: "1rem" }}>
                <button
                  onClick={() => { setBetPosition("yes"); setBetError(null); }}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "0.75rem 1rem", borderRadius: 10,
                    border: `2px solid ${betPosition === "yes" ? "var(--green)" : "var(--border)"}`,
                    background: betPosition === "yes" ? "var(--green-bg)" : "transparent",
                    cursor: odds?.bettingOpen ? "pointer" : "not-allowed",
                    opacity: odds?.bettingOpen ? 1 : 0.5,
                    width: "100%", textAlign: "left", fontFamily: "inherit",
                    transition: "border-color 0.15s, background 0.15s",
                  }}
                  disabled={!odds?.bettingOpen}
                >
                  <span style={{ fontWeight: 700, fontSize: "0.9375rem", color: "var(--ink)" }}>Yes</span>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "0.9375rem", fontWeight: 800, color: "var(--green)" }}>
                      {((odds?.yesPct ?? 0.5) * 100).toFixed(0)}¢
                    </div>
                    <div className="text-label">{yesOdds.toFixed(2)}x</div>
                  </div>
                </button>
                <button
                  onClick={() => { setBetPosition("no"); setBetError(null); }}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "0.75rem 1rem", borderRadius: 10,
                    border: `2px solid ${betPosition === "no" ? "var(--red)" : "var(--border)"}`,
                    background: betPosition === "no" ? "var(--red-bg)" : "transparent",
                    cursor: odds?.bettingOpen ? "pointer" : "not-allowed",
                    opacity: odds?.bettingOpen ? 1 : 0.5,
                    width: "100%", textAlign: "left", fontFamily: "inherit",
                    transition: "border-color 0.15s, background 0.15s",
                  }}
                  disabled={!odds?.bettingOpen}
                >
                  <span style={{ fontWeight: 700, fontSize: "0.9375rem", color: "var(--ink)" }}>No</span>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "0.9375rem", fontWeight: 800, color: "var(--red)" }}>
                      {((odds?.noPct ?? 0.5) * 100).toFixed(0)}¢
                    </div>
                    <div className="text-label">{noOdds.toFixed(2)}x</div>
                  </div>
                </button>
              </div>

              {/* Amount */}
              <div style={{ marginBottom: "1rem" }}>
                <div className="text-label" style={{ marginBottom: "0.5rem" }}>Amount (USD)</div>
                <input
                  type="number"
                  className="bet-amount-input"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  placeholder="$0.00"
                  min="1"
                />
                <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                  {["5", "10", "25", "50"].map((v) => (
                    <button key={v} className="quick-amount" onClick={() => setBetAmount(v)}>${v}</button>
                  ))}
                </div>
              </div>

              {/* Payout preview */}
              {betPosition && betAmount && (
                <div style={{ background: "var(--cream-2)", borderRadius: 10, padding: "0.75rem 1rem", marginBottom: "1rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                    <span style={{ fontSize: "0.8125rem", color: "var(--ink-3)" }}>Potential payout</span>
                    <span style={{ fontSize: "0.9375rem", fontWeight: 700, color: "var(--green)" }}>${potentialPayout}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "0.8125rem", color: "var(--ink-3)" }}>Profit if win</span>
                    <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--ink-2)" }}>
                      +${(parseFloat(potentialPayout) - parseFloat(betAmount)).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              {betError && (
                <div style={{ fontSize: "0.8125rem", color: "var(--red)", marginBottom: "0.75rem" }}>{betError}</div>
              )}

              <button
                className="btn-primary"
                style={{ width: "100%", opacity: (!betPosition || !betAmount || !odds?.bettingOpen) ? 0.5 : 1 }}
                onClick={handlePlaceBet}
                disabled={!betPosition || !betAmount || !odds?.bettingOpen}
              >
                {!odds?.bettingOpen ? "Betting Closed" : betPlaced ? "✓ Bet placed!" : `Bet ${betPosition === "yes" ? "Yes" : betPosition === "no" ? "No" : "..."}`}
              </button>

              <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--border)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.375rem" }}>
                  <span className="text-label">Total pool</span>
                  <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--ink)", fontFamily: "DM Mono, monospace" }}>
                    ${(odds?.totalPool ?? 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Sandbox Info Card */}
            <div className="card-sm" style={{ padding: "1.25rem" }}>
              <div className="text-label" style={{ marginBottom: "0.75rem" }}>Sandbox Info</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                {[
                  { label: "Daytona ID", value: sandbox.daytonaSandboxId || "—" },
                  { label: "Model", value: modelLabel(sandbox.model) },
                  { label: "Status", value: sandbox.status },
                  { label: "Created", value: new Date(sandbox.createdAt).toLocaleString() },
                  { label: "Expires", value: new Date(sandbox.expiresAt).toLocaleString() },
                  { label: "Credits", value: String(sandbox.creditsRemaining ?? "—") },
                  { label: "Wallet", value: sandbox.walletBalance != null ? `$${sandbox.walletBalance.toFixed(2)}` : "—" },
                ].map((row) => (
                  <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span className="text-label">{row.label}</span>
                    <span style={{
                      fontSize: "0.8125rem", fontWeight: 600, color: "var(--ink)",
                      fontFamily: "DM Mono, monospace", maxWidth: 200,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
