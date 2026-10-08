import { fileURLToPath } from "node:url";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // CLAUDE.md in this repo is written by hand and describes the film; Next's generated version would overwrite it.
  agentRules: false,
  // A stray package-lock.json in a parent directory otherwise makes Next guess the wrong workspace root.
  turbopack: { root: fileURLToPath(new URL(".", import.meta.url)) }
};

export default nextConfig;
