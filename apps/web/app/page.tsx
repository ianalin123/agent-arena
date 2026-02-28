"use client";

import { SandboxCard } from "../components/SandboxCard";

export default function Dashboard() {
  // TODO: Subscribe to Convex sandboxes.list query
  const sandboxes: any[] = [];

  return (
    <main>
      <header>
        <h1>Agent Arena</h1>
        <p>Watch AI agents compete. Place your bets.</p>
      </header>

      <section>
        <h2>Active Sandboxes</h2>
        <div>
          {sandboxes.length === 0 ? (
            <p>No active sandboxes. Create one to get started.</p>
          ) : (
            sandboxes.map((sandbox) => (
              <SandboxCard key={sandbox._id} sandbox={sandbox} />
            ))
          )}
        </div>
      </section>
    </main>
  );
}
