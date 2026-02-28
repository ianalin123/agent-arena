"use client";

import { useMemo } from "react";

interface BrowserStreamProps {
  sandboxId: string;
  events?: any[];
}

export function BrowserStream({ sandboxId, events = [] }: BrowserStreamProps) {
  const latestScreenshot = useMemo(() => {
    const screenshotEvents = events.filter(
      (e: any) => e.eventType === "screenshot"
    );
    if (screenshotEvents.length === 0) return null;

    const latest = screenshotEvents[0];
    try {
      const payload = JSON.parse(latest.payload);
      return payload.image || null;
    } catch {
      return null;
    }
  }, [events]);

  return (
    <div className="rounded-xl border border-border bg-bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-accent-green animate-pulse" />
          <h3 className="text-sm font-medium">Live Browser Stream</h3>
        </div>
        <span className="text-xs text-text-muted">~3s refresh</span>
      </div>

      <div className="aspect-video bg-bg-primary relative flex items-center justify-center">
        {latestScreenshot ? (
          <img
            src={`data:image/png;base64,${latestScreenshot}`}
            alt="Agent browser view"
            className="w-full h-full object-contain transition-opacity duration-300"
          />
        ) : (
          <div className="text-center p-8">
            <div className="w-16 h-16 rounded-full bg-bg-tertiary mx-auto mb-3 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-text-muted"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <p className="text-text-secondary text-sm">
              Waiting for browser stream...
            </p>
            <p className="text-text-muted text-xs mt-1">
              The agent is initializing its browser session
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
