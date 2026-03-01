"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export interface BetPanelProps {
  claudeWinPct: number;
  openaiWinPct: number;
  claudeOdds?: number;
  openaiOdds?: number;
  totalPool: number;
  viewers: number;
  bettingOpen: boolean;
  oddsUpdatedAt?: number | null;
  onPlaceBet?: (agent: "claude" | "openai", amount: number) => void;
}

const BET_WINDOW = 10; // seconds

function PieTimer({ secondsLeft, total = BET_WINDOW }: { secondsLeft: number; total?: number }) {
  const pct = secondsLeft / total;
  const r = 10;
  const cx = 12;
  const cy = 12;

  if (pct >= 1) {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" style={{ display: "block" }}>
        <circle cx={cx} cy={cy} r={r} fill="rgba(255,255,255,0.35)" />
      </svg>
    );
  }
  if (pct <= 0) {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" style={{ display: "block" }}>
        <circle cx={cx} cy={cy} r={r} fill="rgba(0,0,0,0.25)" />
      </svg>
    );
  }

  const angle = (1 - pct) * 2 * Math.PI;
  const startX = cx;
  const startY = cy - r;
  const endX = cx + r * Math.sin(angle);
  const endY = cy - r * Math.cos(angle);
  const largeArc = angle > Math.PI ? 1 : 0;

  return (
    <svg width="24" height="24" viewBox="0 0 24 24" style={{ display: "block" }}>
      <path
        d={`M ${cx} ${cy} L ${startX} ${startY} A ${r} ${r} 0 ${largeArc} 1 ${endX} ${endY} Z`}
        fill="rgba(0,0,0,0.22)"
      />
      <path
        d={`M ${cx} ${cy} L ${endX} ${endY} A ${r} ${r} 0 ${1 - largeArc} 1 ${startX} ${startY} Z`}
        fill="rgba(255,255,255,0.35)"
      />
    </svg>
  );
}

export function BetPanel({
  claudeWinPct,
  openaiWinPct,
  claudeOdds,
  openaiOdds,
  totalPool,
  viewers,
  bettingOpen,
  oddsUpdatedAt,
  onPlaceBet,
}: BetPanelProps) {
  const [selected, setSelected] = useState<"claude" | "openai" | null>(null);
  const MAX_BET = 500;
  const [amount, setAmount] = useState("10");
  const [placed, setPlaced] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(BET_WINDOW);
  const [expired, setExpired] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const windowStartRef = useRef<number>(Date.now());

  const amountNum = parseFloat(amount) || 0;
  const overMax = amountNum > MAX_BET;

  const cOdds = claudeOdds ?? (claudeWinPct > 0 ? parseFloat((100 / claudeWinPct).toFixed(2)) : 2);
  const oOdds = openaiOdds ?? (openaiWinPct > 0 ? parseFloat((100 / openaiWinPct).toFixed(2)) : 2);

  const payout = selected && amount
    ? (parseFloat(amount) * (selected === "claude" ? cOdds : oOdds)).toFixed(2)
    : "0.00";

  const resetWindow = useCallback(() => {
    windowStartRef.current = Date.now();
    setSecondsLeft(BET_WINDOW);
    setExpired(false);
  }, []);

  useEffect(() => {
    if (oddsUpdatedAt) {
      resetWindow();
    }
  }, [oddsUpdatedAt, resetWindow]);

  useEffect(() => {
    if (!bettingOpen) return;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const elapsed = (Date.now() - windowStartRef.current) / 1000;
      const remaining = Math.max(0, BET_WINDOW - elapsed);
      setSecondsLeft(Math.ceil(remaining));
      if (remaining <= 0) {
        setExpired(true);
        setSelected(null);
        setAmount("10");
        setTimeout(() => {
          setExpired(false);
          windowStartRef.current = Date.now();
          setSecondsLeft(BET_WINDOW);
        }, 800);
      }
    }, 250);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [bettingOpen]);

  function handlePlace() {
    if (!selected || !amount || !bettingOpen || overMax || expired) return;
    onPlaceBet?.(selected, amountNum);
    setPlaced(true);
    setSelected(null);
    setAmount("10");
    resetWindow();
    setTimeout(() => setPlaced(false), 3000);
  }

  const canBet = selected && amount && bettingOpen && !overMax && !expired && !placed;
  const timerUrgent = secondsLeft <= 3;

  return (
    <div className="bet-panel">
      {/* Header */}
      <div style={{ marginBottom: "1.25rem" }}>
        <div className="text-label" style={{ marginBottom: "0.375rem" }}>Place your bet</div>
        <h3 style={{ fontSize: "1.0625rem", fontWeight: 700, color: "var(--ink)", letterSpacing: "-0.01em" }}>
          Which agent wins the race?
        </h3>
      </div>

      {/* Agent selector */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem", marginBottom: "1.25rem" }}>
        <button
          className={`bet-option${selected === "claude" ? " selected-claude" : ""}`}
          onClick={() => setSelected("claude")}
          disabled={!bettingOpen}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--claude)" }} />
            <span style={{ fontWeight: 700, fontSize: "0.9375rem", color: "var(--ink)" }}>Claude</span>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "1rem", fontWeight: 800, color: "var(--claude)" }}>{claudeWinPct.toFixed(0)}¢</div>
            <div className="text-label">{cOdds.toFixed(2)}x</div>
          </div>
        </button>
        <button
          className={`bet-option${selected === "openai" ? " selected-openai" : ""}`}
          onClick={() => setSelected("openai")}
          disabled={!bettingOpen}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--openai)" }} />
            <span style={{ fontWeight: 700, fontSize: "0.9375rem", color: "var(--ink)" }}>OpenAI</span>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "1rem", fontWeight: 800, color: "var(--openai)" }}>{openaiWinPct.toFixed(0)}¢</div>
            <div className="text-label">{oOdds.toFixed(2)}x</div>
          </div>
        </button>
      </div>

      {/* Amount input */}
      <div style={{ marginBottom: "1rem" }}>
        <div className="text-label" style={{ marginBottom: "0.5rem" }}>Amount (USD)</div>
        <input
          type="number"
          className="bet-amount-input"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="$0.00"
          min="1"
          max={MAX_BET}
          disabled={!bettingOpen}
          style={{ borderColor: overMax ? "var(--red)" : undefined }}
        />
        {/* Quick amounts row */}
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
          {["10", "25", "100", "500"].map((v) => (
            <button key={v} className="quick-amount" onClick={() => setAmount(v)} disabled={!bettingOpen}>${v}</button>
          ))}
        </div>
        {/* Max bet warning — sits below the row, never clips */}
        {overMax && (
          <div style={{ marginTop: "0.375rem", fontSize: "0.75rem", color: "var(--red)", fontWeight: 600 }}>
            Max bet is $500
          </div>
        )}
      </div>

      {/* Payout preview */}
      {selected && amount && !expired && (
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

      {/* Bet button with pie timer */}
      <button
        className="btn-primary"
        style={{
          width: "100%",
          opacity: !canBet ? 0.5 : 1,
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.5rem",
          transition: "background 0.2s",
          background: expired ? "var(--ink-3)" : timerUrgent && canBet ? "var(--red)" : undefined,
        }}
        onClick={handlePlace}
        disabled={!canBet}
      >
        {bettingOpen && selected && !placed && !expired && (
          <span style={{ flexShrink: 0, lineHeight: 0 }}>
            <PieTimer secondsLeft={secondsLeft} />
          </span>
        )}
        <span>
          {placed
            ? "✓ Bet placed!"
            : expired
            ? "Odds updated — re-select"
            : `Bet on ${selected === "claude" ? "Claude" : selected === "openai" ? "OpenAI" : "..."}`}
        </span>
        {bettingOpen && selected && !placed && !expired && (
          <span style={{
            position: "absolute",
            right: "0.75rem",
            fontSize: "0.75rem",
            fontWeight: 700,
            opacity: 0.85,
            color: timerUrgent ? "#fff" : "rgba(255,255,255,0.7)",
            fontVariantNumeric: "tabular-nums",
          }}>
            {secondsLeft}s
          </span>
        )}
      </button>

      {/* Odds refresh pulse */}
      {bettingOpen && (
        <div style={{ marginTop: "0.5rem", display: "flex", alignItems: "center", gap: "0.375rem", justifyContent: "center" }}>
          <div style={{
            width: 6, height: 6, borderRadius: "50%",
            background: timerUrgent ? "var(--red)" : "var(--green)",
            animation: "pulse 1s infinite",
          }} />
          <span style={{ fontSize: "0.6875rem", color: "var(--ink-3)", fontWeight: 500 }}>
            Odds refresh every {BET_WINDOW}s
          </span>
        </div>
      )}

      {/* Footer stats */}
      <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--border)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.375rem" }}>
          <span className="text-label">Total pool</span>
          <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--ink)" }}>${(totalPool / 1000).toFixed(1)}k</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span className="text-label">Watchers</span>
          <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--ink)" }}>0</span>
        </div>
      </div>
    </div>
  );
}
