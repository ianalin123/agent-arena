"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/api";
import type { Id } from "@/convex/types";

interface LogStreamProps {
  sandboxId?: string;
  maxHeight?: string;
}

const EVENT_COLORS: Record<string, string> = {
  reasoning: "text-violet-400",
  browser_action: "text-blue-400",
  email: "text-cyan-400",
  payment: "text-yellow-400",
  screenshot: "text-zinc-500",
  error: "text-red-400",
  progress: "text-green-400",
};

const EVENT_BADGES: Record<string, string> = {
  reasoning: "bg-violet-500/20 text-violet-300",
  browser_action: "bg-blue-500/20 text-blue-300",
  email: "bg-cyan-500/20 text-cyan-300",
  payment: "bg-yellow-500/20 text-yellow-300",
  screenshot: "bg-zinc-500/20 text-zinc-400",
  error: "bg-red-500/20 text-red-300",
  progress: "bg-green-500/20 text-green-300",
};

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatPayload(raw: string): { summary: string; full: string } {
  try {
    const parsed = JSON.parse(raw);
    const full = JSON.stringify(parsed, null, 2);

    if (parsed.reasoning) {
      return { summary: parsed.reasoning.slice(0, 140), full };
    }
    if (parsed.error || parsed.message) {
      return { summary: parsed.error || parsed.message, full };
    }
    if (parsed.action?.type) {
      const url = parsed.action.url ? ` → ${parsed.action.url}` : "";
      return { summary: `${parsed.action.type}${url}`, full };
    }
    if (parsed.direction) {
      const target = parsed.to || parsed.from || "";
      return {
        summary: `${parsed.direction} ${target} — ${parsed.subject || ""}`,
        full,
      };
    }
    if (parsed.description) {
      return {
        summary: `$${parsed.amount?.toFixed(2) || "?"} — ${parsed.description}`,
        full,
      };
    }
    if (parsed.image) {
      return { summary: "[screenshot captured]", full: "(base64 image data)" };
    }

    const flat = JSON.stringify(parsed);
    return { summary: flat.length > 120 ? flat.slice(0, 120) + "…" : flat, full };
  } catch {
    return { summary: raw.slice(0, 120), full: raw };
  }
}

function LogEntry({ event }: { event: any }) {
  const [expanded, setExpanded] = useState(false);
  const badge = EVENT_BADGES[event.eventType] ?? "bg-zinc-500/20 text-zinc-400";
  const color = EVENT_COLORS[event.eventType] ?? "text-zinc-400";
  const { summary, full } = formatPayload(event.payload);

  return (
    <div
      className="group px-3 py-1.5 hover:bg-white/[0.02] font-mono text-xs leading-relaxed cursor-pointer"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start gap-2">
        <span className="text-zinc-600 shrink-0 select-none w-[62px]">
          {formatTimestamp(event.timestamp)}
        </span>
        <span
          className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${badge}`}
        >
          {event.eventType.replace("_", " ")}
        </span>
        <span className={`${color} break-all`}>{summary}</span>
        {full.length > summary.length + 20 && (
          <span className="shrink-0 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] mt-0.5">
            {expanded ? "▼" : "▶"}
          </span>
        )}
      </div>
      {expanded && full !== "(base64 image data)" && (
        <pre className="mt-1 ml-[70px] text-[11px] text-zinc-500 bg-black/30 rounded p-2 overflow-x-auto whitespace-pre-wrap max-h-48 overflow-y-auto">
          {full}
        </pre>
      )}
    </div>
  );
}

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
    <div className="rounded-xl border border-border bg-[#0c0c14] overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border flex items-center justify-between bg-[#0e0e18]">
        <div className="flex items-center gap-2">
          <svg
            className="w-3.5 h-3.5 text-accent-green"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path d="M4 17l6-6-6-6M12 19h8" />
          </svg>
          <h3 className="text-xs font-semibold tracking-wider uppercase text-zinc-400">
            {sandboxId ? "Event Log" : "Live Event Stream"}
          </h3>
          {events.length > 0 && (
            <span className="text-[10px] text-zinc-600 font-mono">
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
          className={`text-[10px] px-2 py-0.5 rounded font-medium transition-colors ${
            pinned
              ? "bg-accent-green/15 text-accent-green"
              : "bg-zinc-800 text-zinc-500 hover:text-zinc-300"
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
          <div className="flex items-center justify-center py-12 text-zinc-600 font-mono text-xs">
            <span className="animate-pulse mr-2">_</span>
            Waiting for agent events…
          </div>
        ) : (
          <div className="divide-y divide-white/[0.03]">
            {events.map((event: any, i: number) => (
              <LogEntry key={event._id ?? `${event.timestamp}-${i}`} event={event} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
