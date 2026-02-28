"use client";

import Link from "next/link";

interface SandboxCardProps {
  sandbox: {
    _id: string;
    goalDescription: string;
    model: string;
    currentProgress: number;
    targetValue: number;
    status: string;
  };
}

export function SandboxCard({ sandbox }: SandboxCardProps) {
  const progressPct = Math.min(
    100,
    (sandbox.currentProgress / sandbox.targetValue) * 100
  );

  return (
    <Link href={`/sandbox/${sandbox._id}`}>
      <div>
        <h3>{sandbox.goalDescription}</h3>
        <span>{sandbox.model}</span>
        <span>{sandbox.status}</span>

        <div>
          <div style={{ width: `${progressPct}%` }} />
        </div>
        <p>
          {sandbox.currentProgress} / {sandbox.targetValue}
        </p>
      </div>
    </Link>
  );
}
