import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  // Allow dev server access from LAN devices (home/office private networks)
  allowedDevOrigins: ['192.168.*.*', '10.*.*.*', 'theoffice.lab', '*.theoffice.lab'],
  // Uploaded images are served from this same origin, so never let a browser sniff a
  // stored file into something executable, and never let the app be framed.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'same-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
