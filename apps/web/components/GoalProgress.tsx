"use client";

interface GoalProgressProps {
  sandboxId: string;
}

export function GoalProgress({ sandboxId }: GoalProgressProps) {
  // TODO: Subscribe to sandbox state from Convex

  return (
    <div>
      <h3>Goal</h3>
      <p>Loading goal...</p>

      <div>
        <div>{/* Progress bar */}</div>
        <span>0 / 0</span>
      </div>

      <div>
        <p>Time: --:--:--</p>
        <p>Credits: $0.00</p>
        <p>Wallet: $0.00</p>
        <p>Model: --</p>
      </div>
    </div>
  );
}
