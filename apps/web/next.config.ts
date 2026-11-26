import path from "node:path";
import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";

// The monorepo keeps one .env.local at the repo root; Next only looks in the app folder.
// forceReload: Next has already loaded (and cached) the app folder's env by now.
loadEnvConfig(path.resolve(process.cwd(), "../.."), process.env.NODE_ENV !== "production", undefined, true);

const nextConfig: NextConfig = {
  // The field lives on the phone (IndexedDB): screens fill in in the browser once the session is known, so the
  // server has nothing to render for them and the dev "instant navigation" check reports every page. Only check
  // pages that opt in. Screens show the ink-drop while they load, and an ink line while a page opens.
  experimental: { instantInsights: { validationLevel: "manual-warning" } },
  // Each build gets its own service worker (and caches): see public/sw.js.
  env: { NEXT_PUBLIC_BUILD: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) || String(Date.now()) },
  /* config options here */
  cacheComponents: true,
  // The curated content package ships TypeScript source.
  transpilePackages: ["@uchibatake/content"],
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
