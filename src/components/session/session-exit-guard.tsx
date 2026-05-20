"use client";

import { useEffect, useRef } from "react";

export type SessionExitGuardProps = {
  active: boolean;
  onExitAttempt: () => void;
  children: React.ReactNode;
};

export function SessionExitGuard({
  active,
  onExitAttempt,
  children,
}: SessionExitGuardProps) {
  const activeRef = useRef(active);
  // Keep ref in sync without waiting for effect
  activeRef.current = active;

  useEffect(() => {
    if (!active) return;

    // Push a synthetic history entry so back button doesn't leave immediately.
    const state = window.history.state;
    if (!state?.sessionExitGuard) {
      window.history.pushState(
        { sessionExitGuard: true },
        "",
        window.location.href,
      );
    }
  }, [active]);

  useEffect(() => {
    if (!active) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!activeRef.current) return;

      event.preventDefault();
      // Required for legacy browsers
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [active]);

  useEffect(() => {
    if (!active) return;

    const handlePopState = (event: PopStateEvent) => {
      if (!activeRef.current) return;

      // The user pressed back and the current state is the synthetic one.
      // Re-push current URL and open our custom dialog.
      if (
        event.state &&
        (event.state as Record<string, unknown>).sessionExitGuard
      ) {
        // Re-instate the guard state immediately
        window.history.pushState(
          { sessionExitGuard: true },
          "",
          window.location.href,
        );
        onExitAttempt();
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [active, onExitAttempt]);

  return children;
}
