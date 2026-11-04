import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  transpilePackages: ['lucide-react'],
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: [
          '**/data/**',
          '**/.git/**',
          '**/node_modules/**',
        ],
      };
    }
    return config;
  },
};

export default nextConfig;
