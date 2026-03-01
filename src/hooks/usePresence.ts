"use client";

import { useEffect, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

/**
 * Fires a presence heartbeat on mount and every 30 seconds.
 * Keeps the current user's session alive in the Convex presence table.
 *
 * @param path - The current page path (e.g. "/" or "/challenge/abc123")
 */
export function usePresence(path: string) {
  const heartbeat = useMutation(api.presence.heartbeat);
  const sessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Generate a stable session ID for this browser tab
    if (!sessionIdRef.current) {
      const stored = sessionStorage.getItem("aa_session_id");
      if (stored) {
        sessionIdRef.current = stored;
      } else {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        sessionStorage.setItem("aa_session_id", id);
        sessionIdRef.current = id;
      }
    }

    const fire = () => {
      if (sessionIdRef.current) {
        heartbeat({ sessionId: sessionIdRef.current, path }).catch(() => {
          // Silently ignore — presence is best-effort
        });
      }
    };

    // Fire immediately on mount
    fire();

    // Then fire every 30 seconds
    const interval = setInterval(fire, 30_000);
    return () => clearInterval(interval);
  }, [path, heartbeat]);
}
