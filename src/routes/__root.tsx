import { Outlet, HeadContent, Scripts, createRootRouteWithContext } from "@tanstack/react-router";

import TanStackQueryProvider from "../integrations/tanstack-query/root-provider";

import appCss from "../styles.css?url";

import type { QueryClient } from "@tanstack/react-query";

import type { TRPCRouter } from "#/integrations/trpc/router";
import type { TRPCOptionsProxy } from "@trpc/tanstack-react-query";

interface MyRouterContext {
  queryClient: QueryClient;
  trpc: TRPCOptionsProxy<TRPCRouter>;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Intervoo" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  component: RootLayout,
  notFoundComponent: () => (
    <main className="min-h-screen bg-[#F5F3F7] px-4 text-[#201a2c]">
      <div className="mx-auto flex min-h-screen w-full max-w-md items-center py-10">
        <div className="w-full overflow-hidden rounded-[1.5rem] bg-white shadow-[0_20px_56px_rgba(40,28,82,0.12)]">
          <div className="bg-[linear-gradient(180deg,#100725_0%,#3C2390_100%)] px-6 py-8 text-center">
            <img alt="Intervoo" className="mx-auto h-12 w-24 invert" src="/intervoo-logo.svg" />
          </div>

          <div className="px-6 py-6 text-center">
            <p className="text-xs font-bold tracking-[0.14em] text-[#6A4DF5] uppercase">
              Lost in the journey
            </p>
            <h1 className="mt-3 text-xl font-semibold tracking-[-0.02em] text-[#16111d]">
              Page not found
            </h1>
            <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-[#777281]">
              The page you are looking for is no longer part of this flow.
            </p>
            <a
              className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-full bg-[linear-gradient(90deg,#4F33A3_0%,#6A4DF5_100%)] px-5 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(93,72,220,0.24)] transition hover:opacity-95"
              href="/"
            >
              Go home
            </a>
          </div>
        </div>
      </div>
    </main>
  ),
});

function RootLayout() {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <TanStackQueryProvider>
          <Outlet />
        </TanStackQueryProvider>
        <Scripts />
      </body>
    </html>
  );
}
