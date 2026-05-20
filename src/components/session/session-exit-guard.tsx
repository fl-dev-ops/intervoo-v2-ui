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

  // Intercept refresh shortcuts BEFORE beforeunload fires so we can show our
  // dialog and keep the WebSocket alive. beforeunload alone cannot prevent
  // the browser from closing connections.
  useEffect(() => {
    if (!active) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!activeRef.current) return;

      const isRefreshShortcut =
        event.key === "F5" ||
        ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "r");

      if (!isRefreshShortcut) return;

      event.preventDefault();
      onExitAttempt();
    };

    // Capture phase so we receive the event even if an input calls stopPropagation()
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [active, onExitAttempt]);

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
