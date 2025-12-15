import type { NextConfig } from "next";
import { config } from "dotenv";
import { resolve } from "path";

// Load environment variables from root .env file
// This allows sharing env vars across the monorepo
config({ path: resolve(__dirname, "../../.env") });

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  turbopack: {
    // Fix workspace root detection - prevent Turbopack from using wrong lockfile
    root: __dirname,
  },
  
  // Performance optimizations (low-risk)
  swcMinify: true,  // Use SWC minifier (faster than Terser)
  compress: true,   // Enable gzip compression
  
  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

export default nextConfig;
