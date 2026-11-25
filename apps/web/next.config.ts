import path from "node:path";
import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";

// The monorepo keeps one .env.local at the repo root; Next only looks in the app folder.
// forceReload: Next has already loaded (and cached) the app folder's env by now.
loadEnvConfig(path.resolve(process.cwd(), "../.."), process.env.NODE_ENV !== "production", undefined, true);

const nextConfig: NextConfig = {
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
