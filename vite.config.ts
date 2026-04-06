import { defineConfig } from "vite-plus";
import { devtools } from "@tanstack/devtools-vite";

import { tanstackStart } from "@tanstack/react-start/plugin/vite";

import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";

const isVitest = Boolean(process.env.VITEST);

const config = defineConfig({
  server: {
    cors: true,
    allowedHosts: ["mendy-undelectable-dinah.ngrok-free.dev"],
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
  staged: {
    "*.{js,jsx,ts,tsx,mjs,cjs,mts,cts,json,css,scss,md,mdx,html,yml,yaml}": "vp fmt --write",
    "*.{js,jsx,ts,tsx,mjs,cjs,mts,cts}": "vp lint --fix",
  },
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [
    devtools(),
    !isVitest && nitro({ rollupConfig: { external: [/^@sentry\//] } }),
    tailwindcss(),
    tanstackStart({
      spa: {
        enabled: true,
      },
    }),
    viteReact(),
  ],
});

export default config;
