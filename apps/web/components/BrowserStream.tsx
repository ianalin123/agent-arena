"use client";

import { useState, useCallback } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/api";
import type { Id } from "@/convex/types";

interface BrowserStreamProps {
  sandboxId: string;
  events?: any[];
  liveUrl?: string | null;
  shareUrl?: string | null;
}

export function BrowserStream({ sandboxId, liveUrl, shareUrl }: BrowserStreamProps) {
  const streamUrl = shareUrl || liveUrl;
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [iframeError, setIframeError] = useState(false);

  const handleIframeLoad = useCallback(() => {
    setIframeLoaded(true);
  }, []);

  const handleIframeError = useCallback(() => {
    setIframeError(true);
  }, []);

  const latestScreenshot = useQuery(api.events.getLatestScreenshot, {
    sandboxId: sandboxId as Id<"sandboxes">,
  });

  const recentEvents = useQuery(api.events.recent, {
    sandboxId: sandboxId as Id<"sandboxes">,
    limit: 5,
  });

  const screenshotUrl = latestScreenshot?.url ?? null;

  const showIframe = streamUrl && !iframeError;
  const showScreenshot = !showIframe && screenshotUrl;
  const showPlaceholder = !showIframe && !showScreenshot;

  const isLive = streamUrl && iframeLoaded && !iframeError;

  const statusColor = isLive
    ? "var(--green)"
    : screenshotUrl
      ? "var(--amber)"
      : "var(--ink-faint)";

  return (
    <div className="vm-window">
      <div className="vm-titlebar">
        <div className="flex items-center gap-2 shrink-0">
          <span className="vm-dot vm-dot-red" />
          <span className="vm-dot vm-dot-yellow" />
          <span className="vm-dot vm-dot-green" />
        </div>
        <div className="vm-url-bar">
          {liveUrl || streamUrl || "Connecting..."}
        </div>
        <div
          className="w-2.5 h-2.5 rounded-full shrink-0 animate-pulse"
          style={{ background: statusColor }}
          title={isLive ? "Live" : screenshotUrl ? "Screenshots" : "Connecting…"}
        />
      </div>

      <div
        className="aspect-video relative flex items-center justify-center"
        style={{ background: "var(--bg-cream)" }}
      >
        {showIframe && (
          <iframe
            src={streamUrl}
            className="w-full h-full border-0"
            allow="autoplay"
            title="Agent browser live stream"
            onLoad={handleIframeLoad}
            onError={handleIframeError}
          />
        )}
        {showScreenshot && (
          <img
            src={screenshotUrl}
            alt="Agent browser view"
            className="w-full h-full object-contain transition-opacity duration-300"
          />
        )}
        {showPlaceholder && (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 min-h-[200px]">
            {recentEvents && recentEvents.length > 0 ? (
              <div className="w-full max-w-lg space-y-3">
                <div className="flex items-center gap-2 mb-4">
                  <div
                    className="w-2 h-2 rounded-full animate-pulse"
                    style={{ background: "var(--purple)" }}
                  />
                  <p
                    className="text-sm font-medium"
                    style={{ color: "var(--ink-muted)" }}
                  >
                    Agent is working — browser stream loading...
                  </p>
                </div>
                {recentEvents.slice(0, 3).map((event: any) => {
                  let payload: any = {};
                  try {
                    payload = JSON.parse(event.payload || "{}");
                  } catch {}
                  const summary =
                    payload.action_summary || payload.status || event.eventType;
                  return (
                    <div key={event._id} className="flex items-start gap-2 text-xs">
                      <span
                        className="shrink-0 tabular-nums"
                        style={{ color: "var(--ink-faint)" }}
                      >
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                      <span
                        className="truncate"
                        style={{ color: "var(--ink-muted)" }}
                      >
                        {summary}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center">
                <div
                  className="w-12 h-12 rounded-full border-2 border-t-transparent animate-spin mx-auto mb-3"
                  style={{
                    borderColor: "var(--purple)",
                    borderTopColor: "transparent",
                  }}
                />
                <p
                  className="text-sm"
                  style={{ color: "var(--ink-muted)" }}
                >
                  Initializing browser session...
                </p>
                <p
                  className="text-xs mt-1"
                  style={{ color: "var(--ink-faint)" }}
                >
                  The agent is starting up and will connect shortly
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
