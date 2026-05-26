"use client";

import { useEffect } from "react";
import posthog from "posthog-js";
import { authClient } from "@/lib/auth-client";

export function PostHogIdentify() {
  const { data: session } = authClient.useSession();

  useEffect(() => {
    if (!session?.user) return;

    posthog.identify(session.user.id, {
      name: session.user.name,
      email: session.user.email,
      phone_number: session.user.phoneNumber,
    });
  }, [session?.user?.id]);

  return null;
}
