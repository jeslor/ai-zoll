import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // This repo generates AGENTS.md/CLAUDE.md itself as a product feature —
  // don't let Next.js auto-generate its own generic copies here.
  agentRules: false,
};

export default nextConfig;
