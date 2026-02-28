"use client";

interface BrowserStreamProps {
  sandboxId: string;
}

export function BrowserStream({ sandboxId }: BrowserStreamProps) {
  // TODO: Subscribe to latest screenshot event from Convex

  return (
    <div>
      <h3>Live Browser Stream</h3>
      <div>
        {/* Screenshot image will render here, updated every 2-3 seconds */}
        <p>Waiting for browser stream...</p>
      </div>
    </div>
  );
}
