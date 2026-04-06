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
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        href: "https://fonts.googleapis.com/css2?family=Figtree:ital,wght@0,300..900;1,300..900&display=swap",
        rel: "stylesheet",
      },
    ],
  }),
  component: RootLayout,
  notFoundComponent: () => (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.18),transparent_32%),radial-gradient(circle_at_left_bottom,rgba(56,189,248,0.16),transparent_24%),linear-gradient(180deg,#020617,#0f172a)] px-3 font-['Sora',sans-serif] text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-105 items-center px-4 py-6 sm:px-0">
        <div className="w-full rounded-3xl border border-slate-800/90 bg-slate-950/85 p-6 text-slate-100 shadow-[0_28px_60px_rgba(2,6,23,0.55)]">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-300">
            Lost in the journey
          </div>
          <h1 className="mt-3 text-xl leading-tight font-semibold text-slate-50">
            Page not <em className="not-italic text-amber-300">found</em>
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            The page you are looking for is no longer part of this flow.
          </p>
          <div className="mt-5">
            <a
              className="inline-flex h-12 w-full items-center justify-center rounded-2xl border border-amber-300/50 bg-amber-400 px-4 text-sm font-semibold text-slate-950 transition hover:bg-amber-300"
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
