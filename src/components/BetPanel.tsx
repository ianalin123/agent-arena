"use client";

import { useState } from "react";

export interface BetPanelProps {
  claudeWinPct: number;
  openaiWinPct: number;
  totalPool: number;
  viewers: number;
  bettingOpen: boolean;
  balance?: number;
  onPlaceBet?: (agent: "claude" | "openai", amount: number) => Promise<void> | void;
  onAddFunds?: (amountDollars: number) => Promise<void> | void;
}

export function BetPanel({
  claudeWinPct,
  openaiWinPct,
  totalPool,
  viewers,
  bettingOpen,
  balance,
  onPlaceBet,
  onAddFunds,
}: BetPanelProps) {
  const [selected, setSelected] = useState<"claude" | "openai" | null>(null);
  const MAX_BET = 500;
  const [amount, setAmount] = useState("10");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const claudeOdds = (100 / claudeWinPct).toFixed(2);
  const openaiOdds = (100 / openaiWinPct).toFixed(2);
  const payout = selected && amount
    ? (parseFloat(amount) * (selected === "claude" ? parseFloat(claudeOdds) : parseFloat(openaiOdds))).toFixed(2)
    : "0.00";

  const parsedAmount = parseFloat(amount);
  const needsFunds = balance !== undefined && !isNaN(parsedAmount) && parsedAmount > 0 && balance < parsedAmount;

  async function handlePlace() {
    if (status === "loading") return;
    if (!selected || !amount) {
      setErrorMsg("Pick an agent and enter an amount.");
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
      return;
    }
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMsg("Enter a valid amount.");
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
      return;
    }

    const capped = Math.min(parsedAmount, MAX_BET);

    if (needsFunds && onAddFunds) {
      setStatus("loading");
      setErrorMsg("");
      try {
        await onAddFunds(capped);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to open checkout";
        setErrorMsg(msg);
        setStatus("error");
        setTimeout(() => setStatus("idle"), 4000);
      }
      return;
    }

    if (!onPlaceBet) {
      setErrorMsg("Betting is not available.");
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
      return;
    }
    if (!bettingOpen) {
      setErrorMsg("Betting is closed for this round.");
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
      return;
    }

    setStatus("loading");
    setErrorMsg("");
    try {
      await onPlaceBet(selected, capped);
      setStatus("success");
      setTimeout(() => setStatus("idle"), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Bet failed";
      setErrorMsg(msg);
      setStatus("error");
      setTimeout(() => setStatus("idle"), 4000);
    }
  }

  const canAct = selected && amount && parsedAmount > 0;
  const isDisabled = status === "loading";

  const buttonLabel =
    status === "loading" ? (needsFunds ? "Opening checkout..." : "Placing bet...") :
    status === "success" ? "Bet placed!" :
    status === "error" ? "Failed" :
    needsFunds ? `Add $${parsedAmount.toFixed(0)} to bet` :
    `Bet on ${selected === "claude" ? "Claude" : selected === "openai" ? "OpenAI" : "..."}`;

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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
          <span className="text-label">Amount (USD)</span>
          {balance !== undefined && (
            <span style={{ fontSize: "0.75rem", fontWeight: 600, color: needsFunds ? "#e74c3c" : "var(--ink-3)" }}>
              Balance: ${balance.toFixed(2)}
            </span>
          )}
        </div>
        <input
          type="number"
          className="bet-amount-input"
          value={amount}
          onChange={(e) => {
            const val = parseFloat(e.target.value);
            if (!isNaN(val) && val > MAX_BET) setAmount(String(MAX_BET));
            else setAmount(e.target.value);
          }}
          placeholder="$0.00"
          min="1"
          max={MAX_BET}
        />
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
          {["10", "25", "100", "500"].map((v) => (
            <button key={v} className="quick-amount" onClick={() => setAmount(v)}>${v}</button>
          ))}
          <span style={{ fontSize: "0.75rem", color: "var(--ink-3)", alignSelf: "center", marginLeft: "0.25rem" }}>Max $500</span>
        </div>
      </div>

      {selected && amount && parsedAmount > 0 && (
        <div style={{ background: "var(--cream-2)", borderRadius: 10, padding: "0.75rem 1rem", marginBottom: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
            <span style={{ fontSize: "0.8125rem", color: "var(--ink-3)" }}>Potential payout</span>
            <span style={{ fontSize: "0.9375rem", fontWeight: 700, color: "var(--green)" }}>${payout}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: "0.8125rem", color: "var(--ink-3)" }}>Profit if win</span>
            <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--ink-2)" }}>
              +${(parseFloat(payout) - parsedAmount).toFixed(2)}
            </span>
          </div>
        </div>
      )}

      <button
        type="button"
        className="btn-primary"
        style={{
          width: "100%",
          opacity: isDisabled ? 0.5 : 1,
          cursor: isDisabled ? "not-allowed" : "pointer",
          background:
            status === "success" ? "var(--green)" :
            status === "error" ? "#e74c3c" :
            needsFunds && canAct ? "#7C6FF7" : undefined,
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handlePlace();
        }}
        disabled={isDisabled}
      >
        {buttonLabel}
      </button>

      {status === "error" && errorMsg && (
        <div style={{ marginTop: "0.5rem", fontSize: "0.8125rem", color: "#e74c3c", textAlign: "center" }}>
          {errorMsg}
        </div>
      )}

      <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--border)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.375rem" }}>
          <span className="text-label">Total pool</span>
          <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--ink)" }}>
            ${totalPool >= 1000 ? (totalPool / 1000).toFixed(1) + "k" : totalPool.toFixed(0)}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span className="text-label">Watchers</span>
          <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--ink)" }}>0</span>
        </div>
      </div>
    </div>
  );
}
