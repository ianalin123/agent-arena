"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/api";
import type { Id } from "@/convex/types";


interface BettingPanelProps {
  sandboxId: string;
  pool?: any;
}

export function BettingPanel({ sandboxId, pool }: BettingPanelProps) {
  const [betAmount, setBetAmount] = useState("");
  const [position, setPosition] = useState<"yes" | "no">("yes");
  const [placing, setPlacing] = useState(false);
  const placeBet = useMutation(api.betting.placeBet);

  const yesTotal = pool?.yesTotal ?? 0;
  const noTotal = pool?.noTotal ?? 0;
  const totalPool = yesTotal + noTotal;

  const yesPct = totalPool > 0 ? ((yesTotal / totalPool) * 100).toFixed(0) : "--";
  const noPct = totalPool > 0 ? ((noTotal / totalPool) * 100).toFixed(0) : "--";

  const yesOdds =
    totalPool > 0 && yesTotal > 0 ? (totalPool / yesTotal).toFixed(2) : "--";
  const noOdds =
    totalPool > 0 && noTotal > 0 ? (totalPool / noTotal).toFixed(2) : "--";

  const bettingOpen = pool?.bettingOpen ?? false;

  const handlePlaceBet = async () => {
    const amount = parseFloat(betAmount);
    if (!amount || amount <= 0 || !bettingOpen) return;

    setPlacing(true);
    try {
      await placeBet({
        sandboxId: sandboxId as Id<"sandboxes">,
        amount,
        position,
      });
      setBetAmount("");
    } catch (err: any) {
      console.error("Failed to place bet:", err);
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className="card-white p-5">
      <h3 className="label-caps mb-3">Betting</h3>
      <p className="text-base font-medium mb-4">Will it hit the goal?</p>

      <div className="space-y-2 mb-4">
        <button
          onClick={() => setPosition("yes")}
          className="w-full flex items-center justify-between p-3 rounded-lg border transition-all"
          style={
            position === "yes"
              ? {
                  background: "var(--green)",
                  border: "1.5px solid var(--green)",
                  color: "white",
                }
              : {
                  background: "rgba(22,163,74,0.08)",
                  color: "var(--green)",
                  border: "1.5px solid rgba(22,163,74,0.2)",
                }
          }
        >
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full border-2 shrink-0"
              style={
                position === "yes"
                  ? { borderColor: "white", background: "white" }
                  : { borderColor: "var(--green)", background: "var(--green)" }
              }
            />
            <span className="font-medium">YES</span>
            <span className="text-xl font-mono font-semibold">{yesPct}%</span>
          </div>
          <div className="text-right text-sm" style={{ color: "var(--ink-muted)" }}>
            ${yesTotal.toLocaleString()} · {yesOdds}x
          </div>
        </button>

        <button
          onClick={() => setPosition("no")}
          className="w-full flex items-center justify-between p-3 rounded-lg border transition-all"
          style={
            position === "no"
              ? {
                  background: "var(--red)",
                  border: "1.5px solid var(--red)",
                  color: "white",
                }
              : {
                  background: "rgba(220,38,38,0.08)",
                  color: "var(--red)",
                  border: "1.5px solid rgba(220,38,38,0.2)",
                }
          }
        >
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full border-2 shrink-0"
              style={
                position === "no"
                  ? { borderColor: "white", background: "white" }
                  : { borderColor: "var(--red)", background: "var(--red)" }
              }
            />
            <span className="font-medium">NO</span>
            <span className="text-xl font-mono font-semibold">{noPct}%</span>
          </div>
          <div className="text-right text-sm" style={{ color: "var(--ink-muted)" }}>
            ${noTotal.toLocaleString()} · {noOdds}x
          </div>
        </button>
      </div>

      {bettingOpen ? (
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span
              className="absolute left-3 top-1/2 -translate-y-1/2 text-sm"
              style={{ color: "var(--ink-muted)" }}
            >
              $
            </span>
            <input
              type="number"
              min="1"
              step="1"
              value={betAmount}
              onChange={(e) => setBetAmount(e.target.value)}
              placeholder="Amount"
              className="input-warm w-full pl-7 pr-3 py-2"
              onKeyDown={(e) => e.key === "Enter" && handlePlaceBet()}
            />
          </div>
          <button
            onClick={handlePlaceBet}
            disabled={placing || !betAmount}
            className="btn-purple disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none disabled:hover:shadow-none"
          >
            {placing ? "..." : "Bet"}
          </button>
        </div>
      ) : (
        <div className="card-cream text-center py-2 px-3">
          <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
            Betting is closed
          </p>
        </div>
      )}

      {totalPool > 0 && (
        <p
          className="text-xs text-center mt-3"
          style={{ color: "var(--ink-muted)" }}
        >
          Total pool: ${totalPool.toLocaleString()}
        </p>
      )}
    </div>
  );
}
