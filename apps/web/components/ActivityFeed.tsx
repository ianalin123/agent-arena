"use client";

interface ActivityFeedProps {
  sandboxId: string;
}

export function ActivityFeed({ sandboxId }: ActivityFeedProps) {
  // TODO: Subscribe to Convex events.recent query

  return (
    <div>
      <h3>Activity Feed</h3>
      <div>
        {/* Event items: emails, payments, browser actions, user prompts */}
        <p>No activity yet.</p>
      </div>
    </div>
  );
}
