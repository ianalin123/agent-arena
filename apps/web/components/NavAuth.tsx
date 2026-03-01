"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { Authenticated, Unauthenticated, AuthLoading, useQuery } from "convex/react";
import { api } from "@/convex/api";

export function NavAuth() {
  return (
    <>
      <AuthLoading>
        <div
          className="pill pill-neutral"
          style={{ fontSize: 12, minWidth: 80, textAlign: "center" }}
        >
          ...
        </div>
      </AuthLoading>

      <Unauthenticated>
        <SignInButton />
      </Unauthenticated>

      <Authenticated>
        <UserMenu />
      </Authenticated>
    </>
  );
}

function SignInButton() {
  const { signIn } = useAuthActions();

  return (
    <button
      className="btn-purple"
      style={{ fontSize: 13, padding: "6px 16px" }}
      onClick={() => void signIn("google")}
    >
      Sign in with Google
    </button>
  );
}

function UserMenu() {
  const { signOut } = useAuthActions();
  const user = useQuery(api.users.currentUser);

  const displayName = user?.name ?? "User";
  const balance = user?.balance ?? 0;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <span
        className="pill pill-neutral"
        style={{ fontSize: 12 }}
      >
        ${balance.toLocaleString()}
      </span>
      <span style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>
        {displayName}
      </span>
      <button
        className="btn-ghost"
        style={{ fontSize: 12, padding: "4px 10px" }}
        onClick={() => void signOut()}
      >
        Sign out
      </button>
    </div>
  );
}
