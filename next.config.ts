import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // output: 'export', // Disabled to support API routes
  // basePath: process.env.NODE_ENV === 'production' ? '/newsboard' : '',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
