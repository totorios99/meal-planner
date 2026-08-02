import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  // Allow dev server access from LAN devices (home/office private networks)
  allowedDevOrigins: ['192.168.*.*', '10.*.*.*', 'theoffice.lab', '*.theoffice.lab'],
  // Uploaded images are served from this same origin, so never let a browser sniff a
  // stored file into something executable, and never let the app be framed.
  //
  // The Content-Security-Policy is NOT set here: it is emitted by clerkMiddleware in
  // proxy.ts. Clerk's Frontend API lives on a per-instance host (`*.clerk.accounts.dev` in
  // development, `clerk.<your-domain>` in production), which a static allowlist in this file
  // cannot know — hardcoding the dev domain would have blocked sign-in on the deployed app.
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
