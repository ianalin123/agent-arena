"use client";

import { useState } from "react";

export interface BetPanelProps {
  claudeWinPct: number;
  openaiWinPct: number;
  totalPool: number;
  viewers: number;
  bettingOpen: boolean;
  onPlaceBet?: (agent: "claude" | "openai", amount: number) => void;
}

export function BetPanel({
  claudeWinPct,
  openaiWinPct,
  totalPool,
  viewers,
  bettingOpen,
  onPlaceBet,
}: BetPanelProps) {
  const [selected, setSelected] = useState<"claude" | "openai" | null>(null);
  const [amount, setAmount] = useState("10");
  const [placed, setPlaced] = useState(false);

  const claudeOdds = (100 / claudeWinPct).toFixed(2);
  const openaiOdds = (100 / openaiWinPct).toFixed(2);
  const payout = selected && amount
    ? (parseFloat(amount) * (selected === "claude" ? parseFloat(claudeOdds) : parseFloat(openaiOdds))).toFixed(2)
    : "0.00";

  function handlePlace() {
    if (!selected || !amount || !bettingOpen) return;
    onPlaceBet?.(selected, parseFloat(amount));
    setPlaced(true);
    setTimeout(() => setPlaced(false), 3000);
  }

  return (
    <div className="bet-panel">
      <div style={{ marginBottom: "1.25rem" }}>
        <div className="text-label" style={{ marginBottom: "0.375rem" }}>Place your bet</div>
        <h3 style={{ fontSize: "1.0625rem", fontWeight: 700, color: "var(--ink)", letterSpacing: "-0.01em" }}>
          Which agent wins the race?
        </h3>
      </div>

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
            <div className="text-label">{claudeOdds}x</div>
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
            <div className="text-label">{openaiOdds}x</div>
          </div>
        </button>
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <div className="text-label" style={{ marginBottom: "0.5rem" }}>Amount (USD)</div>
        <input
          type="number"
          className="bet-amount-input"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="$0.00"
          min="1"
          disabled={!bettingOpen}
        />
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
          {["5", "10", "25", "50"].map((v) => (
            <button key={v} className="quick-amount" onClick={() => setAmount(v)} disabled={!bettingOpen}>${v}</button>
          ))}
        </div>
      </div>

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

      <button
        className="btn-primary"
        style={{ width: "100%", opacity: (!selected || !amount || !bettingOpen) ? 0.5 : 1 }}
        onClick={handlePlace}
        disabled={!selected || !amount || !bettingOpen}
      >
        {placed ? "✓ Bet placed!" : `Bet on ${selected === "claude" ? "Claude" : selected === "openai" ? "OpenAI" : "..."}`}
      </button>

      <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--border)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.375rem" }}>
          <span className="text-label">Total pool</span>
          <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--ink)" }}>${(totalPool / 1000).toFixed(1)}k</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span className="text-label">Watchers</span>
          <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--ink)" }}>{viewers.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
