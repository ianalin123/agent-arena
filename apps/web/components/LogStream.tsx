"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/api";
import type { Id } from "@/convex/types";
import { deriveEventLabel, formatTimestamp } from "@/lib/event-labels";

interface LogStreamProps {
  sandboxId?: string;
  maxHeight?: string;
}

const LogEntry = React.memo(function LogEntry({ event }: { event: any }) {
  const [expanded, setExpanded] = useState(false);
  const rawPayload = typeof event.payload === "string" ? event.payload : JSON.stringify(event.payload ?? {});
  const { label, pillClass, summary, fullPayload } = deriveEventLabel(event.eventType, rawPayload);

  return (
    <div
      className="group px-3 py-1.5 cursor-pointer"
      style={{
        fontFamily: "var(--font-dm-mono)",
        fontSize: 12,
        lineHeight: 1.6,
        background: "white",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--bg-cream)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "white";
      }}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start gap-2">
        <span
          className="shrink-0 select-none w-[62px]"
          style={{ color: "var(--ink-faint)" }}
        >
          {formatTimestamp(event.timestamp)}
        </span>
        <span className={`shrink-0 pill ${pillClass}`}>{label}</span>
        <span
          className="break-all"
          style={{ color: "var(--ink-light)" }}
        >
          {summary}
        </span>
        {fullPayload.length > summary.length + 20 && (
          <span
            className="shrink-0 transition-opacity text-[10px] mt-0.5 opacity-0 group-hover:opacity-100"
            style={{ color: "var(--ink-faint)" }}
          >
            {expanded ? "▼" : "▶"}
          </span>
        )}
      </div>
      {expanded && fullPayload !== "(base64 image data)" && (
        <pre
          className="mt-1 ml-[70px] text-[11px] rounded p-2 overflow-x-auto whitespace-pre-wrap max-h-48 overflow-y-auto"
          style={{
            background: "var(--bg-cream)",
            border: "1px solid var(--border-light)",
            color: "var(--ink-muted)",
          }}
        >
          {fullPayload}
        </pre>
      )}
    </div>
  );
});

export function LogStream({ sandboxId, maxHeight = "24rem" }: LogStreamProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [pinned, setPinned] = useState(true);

  const perSandboxEvents = useQuery(
    sandboxId ? api.events.recent : api.events.recentAll,
    sandboxId
      ? { sandboxId: sandboxId as Id<"sandboxes">, limit: 50 }
      : { limit: 50 }
  );

  const events = useMemo(() => {
    if (!perSandboxEvents) return [];
    return [...perSandboxEvents].reverse();
  }, [perSandboxEvents]);

  useEffect(() => {
    if (pinned && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events, pinned]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const atBottom = scrollHeight - scrollTop - clientHeight < 40;
    setPinned(atBottom);
  };

  return (
    <div className="card-white overflow-hidden rounded-xl">
      <div
        className="px-4 py-2.5 flex items-center justify-between"
        style={{
          background: "white",
          borderBottom: "1px solid var(--border-light)",
        }}
      >
        <div className="flex items-center gap-2">
          <svg
            className="w-3.5 h-3.5"
            style={{ color: "var(--purple)" }}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path d="M4 17l6-6-6-6M12 19h8" />
          </svg>
          <h3 className="label-caps">
            {sandboxId ? "Event Log" : "Live Event Stream"}
          </h3>
          {events.length > 0 && (
            <span
              className="text-[10px] font-mono"
              style={{ color: "var(--ink-faint)" }}
            >
              ({events.length} events)
            </span>
          )}
        </div>
        <button
          onClick={() => {
            setPinned(true);
            if (scrollRef.current) {
              scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }
          }}
          className={`pill text-[10px] px-2 py-0.5 font-medium transition-colors ${
            pinned ? "pill-green" : "pill-neutral"
          }`}
        >
          {pinned ? "AUTO-SCROLL" : "SCROLL TO BOTTOM"}
        </button>
      </div>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="overflow-y-auto"
        style={{ maxHeight }}
      >
        {events.length === 0 ? (
          <div
            className="flex items-center justify-center py-12 font-mono text-xs"
            style={{ color: "var(--ink-faint)" }}
          >
            <span className="animate-pulse mr-2" style={{ color: "var(--purple)" }}>_</span>
            Waiting for agent events…
          </div>
        ) : (
          <div>
            {events.map((event: any, i: number) => (
              <div
                key={event._id ?? `${event.timestamp}-${i}`}
                style={
                  i < events.length - 1
                    ? { borderBottom: "1px solid var(--border-light)" }
                    : undefined
                }
              >
                <LogEntry event={event} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
