import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: ["mongoose", "mongodb-memory-server", "bcryptjs"],
};

export default nextConfig;
