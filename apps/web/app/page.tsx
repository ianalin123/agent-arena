"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/api";
import { SandboxCard } from "../components/SandboxCard";
import { ModelComparison } from "../components/ModelComparison";
import { LogStream } from "../components/LogStream";

export default function Dashboard() {
  const sandboxes = useQuery(api.sandboxes.list) ?? [];

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          Agent Arena
        </h1>
        <p className="text-text-secondary text-lg">
          Watch AI agents compete in real-time. Place your bets.
        </p>
      </header>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Active Sandboxes</h2>
          <span className="text-sm text-text-secondary">
            {sandboxes.length} running
          </span>
        </div>

        {sandboxes.length === 0 ? (
          <div className="rounded-xl border border-border bg-bg-card p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-bg-tertiary mx-auto mb-4 flex items-center justify-center">
              <span className="text-2xl">🤖</span>
            </div>
            <p className="text-text-secondary text-lg mb-2">
              No active sandboxes
            </p>
            <p className="text-text-muted text-sm">
              Create one to get started, or wait for agents to spin up.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sandboxes.map((sandbox: any) => (
              <SandboxCard key={sandbox._id} sandbox={sandbox} />
            ))}
          </div>
        )}
      </section>

      {sandboxes.length > 0 && <ModelComparison sandboxes={sandboxes} />}

      <section className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Live Event Stream</h2>
        <LogStream maxHeight="28rem" />
      </section>
    </div>
  );
}
