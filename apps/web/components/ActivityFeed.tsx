"use client";

import { useMemo } from "react";

interface ActivityFeedProps {
  sandboxId: string;
  events?: any[];
  payments?: any[];
}

const EVENT_ICONS: Record<string, { icon: string; color: string }> = {
  browser_action: { icon: "🌐", color: "text-accent-blue" },
  email: { icon: "📧", color: "text-accent-cyan" },
  payment: { icon: "💰", color: "text-accent-yellow" },
  reasoning: { icon: "💡", color: "text-accent-purple" },
  screenshot: { icon: "📷", color: "text-text-muted" },
  error: { icon: "⚠️", color: "text-accent-red" },
  progress: { icon: "📈", color: "text-accent-green" },
};

export function ActivityFeed({
  sandboxId,
  events = [],
  payments = [],
}: ActivityFeedProps) {
  const feedItems = useMemo(() => {
    const items: any[] = [];

    for (const event of events) {
      if (event.eventType === "screenshot") continue;

      let payload: any = {};
      try {
        payload = JSON.parse(event.payload);
      } catch { /* empty */ }

      const meta = EVENT_ICONS[event.eventType] ?? EVENT_ICONS.reasoning;

      let description = "";
      if (event.eventType === "email") {
        description = `${payload.direction === "sent" ? "Sent email to" : "Received email from"} ${payload.to || payload.from || "unknown"}`;
        if (payload.subject) description += ` — "${payload.subject}"`;
      } else if (event.eventType === "payment") {
        description = `${payload.status === "completed" ? "Spent" : "Attempted"} $${payload.amount?.toFixed(2) || "0"} — ${payload.description || "payment"}`;
      } else if (event.eventType === "reasoning") {
        const action = payload.action;
        if (action?.type === "navigate") {
          description = `Navigated to ${action.url}`;
        } else if (action?.type === "click") {
          description = `Clicked: ${action.selector}`;
        } else if (action?.type === "type") {
          description = `Typed into: ${action.selector}`;
        } else {
          description = payload.reasoning?.slice(0, 120) || "Agent step";
        }
      } else if (event.eventType === "error") {
        description = payload.error || payload.message || "Error occurred";
      } else {
        description = JSON.stringify(payload).slice(0, 100);
      }

      items.push({
        id: event._id || `${event.timestamp}-${event.eventType}`,
        icon: meta.icon,
        color: meta.color,
        description,
        timestamp: event.timestamp,
        type: event.eventType,
      });
    }

    return items.slice(0, 20);
  }, [events]);

  return (
    <div className="rounded-xl border border-border bg-bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-sm font-medium">Activity Feed</h3>
      </div>

      <div className="max-h-72 overflow-y-auto">
        {feedItems.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-text-muted text-sm">No activity yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {feedItems.map((item) => (
              <div
                key={item.id}
                className="px-4 py-3 hover:bg-bg-card-hover transition-colors"
              >
                <div className="flex items-start gap-3">
                  <span className="text-base mt-0.5 shrink-0">
                    {item.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary leading-snug truncate">
                      {item.description}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`text-xs font-medium ${item.color}`}
                      >
                        {item.type}
                      </span>
                      <span className="text-xs text-text-muted">
                        {new Date(item.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
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
