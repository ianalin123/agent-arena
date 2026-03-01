/**
 * Derives display labels and pill styles from backend agent events.
 *
 * The agent runtime emits 4 event types: status, reasoning, email, payment.
 * Browser actions, errors, and progress signals are nested inside "reasoning"
 * payloads. This utility inspects the payload to produce granular UI labels.
 */

export interface EventLabel {
  label: string;
  pillClass: string;
  summary: string;
  fullPayload: string;
}

export function deriveEventLabel(eventType: string, rawPayload: string): EventLabel {
  let payload: Record<string, any> = {};
  let fullPayload = rawPayload;

  try {
    payload = JSON.parse(rawPayload);
    fullPayload = JSON.stringify(payload, null, 2);
  } catch {
    return {
      label: eventType,
      pillClass: "pill-neutral",
      summary: rawPayload.slice(0, 140),
      fullPayload: rawPayload,
    };
  }

  if (eventType === "status") {
    const status = payload.status ?? "unknown";
    if (status === "thinking") {
      return {
        label: "Thinking",
        pillClass: "pill-purple",
        summary: `Step ${payload.step ?? "?"} — thinking…`,
        fullPayload,
      };
    }
    const actionSummary = payload.action_summary ?? payload.action_type ?? "";
    return {
      label: "Executing",
      pillClass: "pill-blue",
      summary: actionSummary ? `Step ${payload.step ?? "?"} — ${actionSummary}` : `Step ${payload.step ?? "?"} — executing`,
      fullPayload,
    };
  }

  if (eventType === "email") {
    const dir = payload.direction === "sent" ? "Sent to" : "Received from";
    const target = payload.to || payload.from || "unknown";
    const subject = payload.subject ? ` — "${payload.subject}"` : "";
    return {
      label: "Email",
      pillClass: "pill-cyan",
      summary: `${dir} ${target}${subject}`,
      fullPayload,
    };
  }

  if (eventType === "payment") {
    const amount = payload.amount != null ? `$${Number(payload.amount).toFixed(2)}` : "$?";
    const memo = payload.memo || payload.description || "";
    const method = payload.method === "email" ? "via email" : "on-chain";
    return {
      label: "Payment",
      pillClass: "pill-amber",
      summary: `${amount} ${method}${memo ? ` — ${memo}` : ""}`,
      fullPayload,
    };
  }

  if (eventType === "reasoning") {
    const actionType = payload.action_type ?? "";
    const result = payload.result ?? {};
    const hasError = result.error || result.status === "error";

    if (hasError) {
      return {
        label: "Error",
        pillClass: "pill-red",
        summary: result.error || "Action failed",
        fullPayload,
      };
    }

    if (actionType === "browser_task") {
      const task = typeof payload.action === "object"
        ? (payload.action.task || payload.action.url || "")
        : String(payload.action ?? "");
      const taskLower = task.toLowerCase();

      let label = "Browse";
      if (taskLower.includes("navigate") || taskLower.includes("go to") || taskLower.includes("open")) {
        label = "Navigate";
      } else if (taskLower.includes("click") || taskLower.includes("press") || taskLower.includes("tap")) {
        label = "Click";
      } else if (taskLower.includes("type") || taskLower.includes("enter") || taskLower.includes("fill") || taskLower.includes("write")) {
        label = "Type";
      } else if (taskLower.includes("scroll")) {
        label = "Scroll";
      } else if (taskLower.includes("post") || taskLower.includes("publish") || taskLower.includes("tweet") || taskLower.includes("submit")) {
        label = "Post";
      }

      return {
        label,
        pillClass: "pill-blue",
        summary: task.slice(0, 140) || "Browser action",
        fullPayload,
      };
    }

    if (actionType === "finish_reasoning") {
      const reasoning = payload.reasoning ?? "Agent reasoning step";
      return {
        label: "Think",
        pillClass: "pill-violet",
        summary: reasoning.slice(0, 140),
        fullPayload,
      };
    }

    if (actionType === "send_email") {
      return {
        label: "Email",
        pillClass: "pill-cyan",
        summary: payload.reasoning?.slice(0, 140) ?? "Sending email",
        fullPayload,
      };
    }

    if (actionType === "send_usdc" || actionType === "send_usdc_email") {
      return {
        label: "Payment",
        pillClass: "pill-amber",
        summary: payload.reasoning?.slice(0, 140) ?? "Making payment",
        fullPayload,
      };
    }

    const reasoning = payload.reasoning ?? "";
    const progress = payload.progress;
    if (progress != null && progress > 0) {
      return {
        label: "Progress",
        pillClass: "pill-green",
        summary: reasoning ? `${reasoning.slice(0, 100)} (progress: ${progress})` : `Progress: ${progress}`,
        fullPayload,
      };
    }

    return {
      label: "Agent Step",
      pillClass: "pill-neutral",
      summary: reasoning.slice(0, 140) || `${actionType || "step"}`,
      fullPayload,
    };
  }

  const flat = JSON.stringify(payload);
  return {
    label: eventType,
    pillClass: "pill-neutral",
    summary: flat.length > 140 ? flat.slice(0, 140) + "…" : flat,
    fullPayload,
  };
}

export function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
