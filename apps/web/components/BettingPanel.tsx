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
        userId: "placeholder" as Id<"users">,
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
    <div className="rounded-xl border border-border bg-bg-card p-5">
      <h3 className="text-sm font-medium text-text-secondary uppercase tracking-wider mb-3">
        Betting
      </h3>
      <p className="text-base font-medium mb-4">Will it hit the goal?</p>

      <div className="space-y-2 mb-4">
        <button
          onClick={() => setPosition("yes")}
          className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${
            position === "yes"
              ? "border-accent-green bg-accent-green/10"
              : "border-border hover:border-border-bright"
          }`}
        >
          <div className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full border-2 ${
                position === "yes"
                  ? "border-accent-green bg-accent-green"
                  : "border-text-muted"
              }`}
            />
            <span className="font-medium text-accent-green">YES</span>
          </div>
          <div className="text-right">
            <span className="text-sm font-mono">{yesPct}%</span>
            <span className="text-xs text-text-muted ml-2">
              ${yesTotal.toLocaleString()} · {yesOdds}x
            </span>
          </div>
        </button>

        <button
          onClick={() => setPosition("no")}
          className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${
            position === "no"
              ? "border-accent-red bg-accent-red/10"
              : "border-border hover:border-border-bright"
          }`}
        >
          <div className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full border-2 ${
                position === "no"
                  ? "border-accent-red bg-accent-red"
                  : "border-text-muted"
              }`}
            />
            <span className="font-medium text-accent-red">NO</span>
          </div>
          <div className="text-right">
            <span className="text-sm font-mono">{noPct}%</span>
            <span className="text-xs text-text-muted ml-2">
              ${noTotal.toLocaleString()} · {noOdds}x
            </span>
          </div>
        </button>
      </div>

      {bettingOpen ? (
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm">
              $
            </span>
            <input
              type="number"
              min="1"
              step="1"
              value={betAmount}
              onChange={(e) => setBetAmount(e.target.value)}
              placeholder="Amount"
              className="w-full bg-bg-tertiary border border-border rounded-lg pl-7 pr-3 py-2 text-sm placeholder:text-text-muted focus:outline-none focus:border-accent-purple transition-colors"
              onKeyDown={(e) => e.key === "Enter" && handlePlaceBet()}
            />
          </div>
          <button
            onClick={handlePlaceBet}
            disabled={placing || !betAmount}
            className="px-4 py-2 rounded-lg bg-accent-purple text-white text-sm font-medium hover:bg-accent-purple/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {placing ? "..." : "Bet"}
          </button>
        </div>
      ) : (
        <div className="text-center py-2 px-3 rounded-lg bg-bg-tertiary">
          <p className="text-sm text-text-muted">Betting is closed</p>
        </div>
      )}

      {totalPool > 0 && (
        <p className="text-xs text-text-muted text-center mt-3">
          Total pool: ${totalPool.toLocaleString()}
        </p>
      )}
    </div>
  );
}
