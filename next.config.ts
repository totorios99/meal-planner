import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  // Allow dev server access from LAN devices (home/office private networks)
  allowedDevOrigins: ['192.168.*.*', '10.*.*.*'],
};

export default nextConfig;
