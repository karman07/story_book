import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Demo only: exposes the key to the browser bundle. Move calls server-side before deploying.
  env: { VITE_GEMINI_API_KEY: process.env.VITE_GEMINI_API_KEY ?? "" },
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
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
