"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        refetchOnWindowFocus: false,
        retry: 3,
      },
    },
  });
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  // One client per browser session; created lazily so it is never shared
  // across requests during SSR.
  const [queryClient] = useState(makeQueryClient);

  // Devtools are off by default; set NEXT_PUBLIC_DEV_DEBUG=true to enable.
  const showDevtools = process.env.NEXT_PUBLIC_DEV_DEBUG === "true";

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {showDevtools && (
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
      )}
    </QueryClientProvider>
  );
}
