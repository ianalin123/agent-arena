"use client";

interface BettingPanelProps {
  sandboxId: string;
}

export function BettingPanel({ sandboxId }: BettingPanelProps) {
  // TODO: Subscribe to Convex betting.getPool query
  // TODO: Wire placeBet mutation

  return (
    <div>
      <h3>Betting</h3>
      <p>Will it hit the goal?</p>

      <div>
        <div>
          <span>YES</span>
          <span>--% ($0)</span>
        </div>
        <div>
          <span>NO</span>
          <span>--% ($0)</span>
        </div>
      </div>

      <button>Place Bet</button>
    </div>
  );
}
