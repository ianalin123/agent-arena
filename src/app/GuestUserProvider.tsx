"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

const GUEST_EMAIL = "guest-v2@agentarena.local";
const GUEST_NAME = "Arena Guest";

interface GuestUserCtx {
  userId: Id<"users"> | null;
  email: string;
  balance: number;
  isReady: boolean;
}

const GuestUserContext = createContext<GuestUserCtx>({
  userId: null,
  email: GUEST_EMAIL,
  balance: 0,
  isReady: false,
});

export function useGuestUser() {
  return useContext(GuestUserContext);
}

export function GuestUserProvider({ children }: { children: ReactNode }) {
  const ensureUser = useMutation(api.users.ensureTestUser);
  const [userId, setUserId] = useState<Id<"users"> | null>(null);

  const user = useQuery(api.users.get, userId ? { userId } : "skip");

  useEffect(() => {
    let cancelled = false;
    ensureUser({ name: GUEST_NAME, email: GUEST_EMAIL }).then((id) => {
      if (!cancelled) setUserId(id);
    });
    return () => {
      cancelled = true;
    };
    // Run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <GuestUserContext.Provider
      value={{
        userId,
        email: GUEST_EMAIL,
        balance: user?.balance ?? 0,
        isReady: userId !== null,
      }}
    >
      {children}
    </GuestUserContext.Provider>
  );
}
