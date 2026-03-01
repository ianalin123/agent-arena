"use client";

import { useMemo } from "react";
import { deriveEventLabel, formatTimestamp } from "@/lib/event-labels";

interface ActivityFeedProps {
  sandboxId: string;
  events?: any[];
  payments?: any[];
}

export function ActivityFeed({
  sandboxId,
  events = [],
  payments = [],
}: ActivityFeedProps) {
  const feedItems = useMemo(() => {
    const items: { id: string; label: string; pillClass: string; summary: string; timestamp: number }[] = [];

    for (const event of events) {
      if (event.eventType === "screenshot") continue;

      const rawPayload = typeof event.payload === "string" ? event.payload : JSON.stringify(event.payload ?? {});
      const { label, pillClass, summary } = deriveEventLabel(event.eventType, rawPayload);

      items.push({
        id: event._id || `${event.timestamp}-${event.eventType}`,
        label,
        pillClass,
        summary,
        timestamp: event.timestamp,
      });
    }

    return items.slice(0, 20);
  }, [events]);

  return (
    <div className="card-white" style={{ overflow: "hidden" }}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border-light)" }}>
        <h3 className="label-caps">Activity Feed</h3>
      </div>

      <div style={{ maxHeight: 288, overflowY: "auto" }}>
        {feedItems.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center" }}>
            <p style={{ fontSize: 13, color: "var(--ink-faint)" }}>No activity yet.</p>
          </div>
        ) : (
          <div>
            {feedItems.map((item, i) => (
              <div
                key={item.id}
                style={{
                  padding: "10px 16px",
                  borderBottom: i < feedItems.length - 1 ? "1px solid var(--border-light)" : "none",
                  transition: "background 0.1s",
                  cursor: "default",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-cream)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "white"; }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <span className={`pill ${item.pillClass}`} style={{ flexShrink: 0, marginTop: 1 }}>
                    {item.label}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, color: "var(--ink)", lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {item.summary}
                    </p>
                    <span style={{ fontSize: 11, color: "var(--ink-faint)" }}>
                      {formatTimestamp(item.timestamp)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
