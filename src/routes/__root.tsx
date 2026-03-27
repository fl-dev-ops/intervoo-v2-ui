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
    <main className="not-found-shell app-screen">
      <div className="not-found-card content-card">
        <div className="hero-accent">Lost in the journey</div>
        <h1 className="section-title">
          Page not <em>found</em>
        </h1>
        <p className="section-copy">The page you are looking for is no longer part of this flow.</p>
        <div className="button-row" style={{ marginTop: "18px" }}>
          <a className="primary-button" href="/">
            Go home
          </a>
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
