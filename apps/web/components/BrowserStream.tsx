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

  return (
    <div className="rounded-xl border border-border bg-bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${isLive ? "bg-accent-green" : screenshotUrl ? "bg-yellow-500" : "bg-text-muted"} animate-pulse`} />
          <h3 className="text-sm font-medium">Live Browser Stream</h3>
        </div>
        <span className="text-xs text-text-muted">
          {isLive ? "Live via Browser Use" : screenshotUrl ? "Screenshots" : "Connecting…"}
        </span>
      </div>

      <div className="aspect-video bg-bg-primary relative flex items-center justify-center">
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
                  <div className="w-2 h-2 rounded-full bg-accent-purple animate-pulse" />
                  <p className="text-text-secondary text-sm font-medium">
                    Agent is working — browser stream loading...
                  </p>
                </div>
                {recentEvents.slice(0, 3).map((event: any) => {
                  let payload: any = {};
                  try { payload = JSON.parse(event.payload || "{}"); } catch {}
                  const summary = payload.action_summary || payload.status || event.eventType;
                  return (
                    <div key={event._id} className="flex items-start gap-2 text-xs">
                      <span className="text-text-muted shrink-0 tabular-nums">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                      <span className="text-text-secondary truncate">
                        {summary}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center">
                <div className="w-12 h-12 rounded-full border-2 border-accent-purple border-t-transparent animate-spin mx-auto mb-3" />
                <p className="text-text-secondary text-sm">
                  Initializing browser session...
                </p>
                <p className="text-text-muted text-xs mt-1">
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
