import { PHASE_DEVELOPMENT_SERVER } from "next/constants";
import type { NextConfig } from "next";

const nextConfig = (phase: string): NextConfig => ({
  output: phase === PHASE_DEVELOPMENT_SERVER ? undefined : "standalone",
  experimental: {
    serverActions: {
      bodySizeLimit: "8mb"
    }
  }
});

export default nextConfig;
