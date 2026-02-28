"use client";

import { useParams } from "next/navigation";
import { BrowserStream } from "../../../components/BrowserStream";
import { BettingPanel } from "../../../components/BettingPanel";
import { AgentThinking } from "../../../components/AgentThinking";
import { GoalProgress } from "../../../components/GoalProgress";
import { ActivityFeed } from "../../../components/ActivityFeed";
import { PromptInput } from "../../../components/PromptInput";

export default function SandboxPage() {
  const params = useParams();
  const sandboxId = params.id as string;

  // TODO: Subscribe to Convex sandboxes.get query with sandboxId

  return (
    <main>
      <div>
        <section>
          <BrowserStream sandboxId={sandboxId} />
          <AgentThinking sandboxId={sandboxId} />
          <ActivityFeed sandboxId={sandboxId} />
        </section>

        <aside>
          <GoalProgress sandboxId={sandboxId} />
          <BettingPanel sandboxId={sandboxId} />
          <PromptInput sandboxId={sandboxId} />
        </aside>
      </div>
    </main>
  );
}
