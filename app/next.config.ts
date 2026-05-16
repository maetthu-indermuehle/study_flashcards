import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output keeps the production image small and avoids installing
  // development dependencies in the runtime container.
  output: "standalone",
};

export default nextConfig;
