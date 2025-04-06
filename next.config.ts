import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  eslint: {
    // Ignorar erros de ESLint durante o build de produção
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Ignorar erros de TypeScript durante o build de produção
    ignoreBuildErrors: true,
  },
  /* config options here */
};

export default nextConfig;
