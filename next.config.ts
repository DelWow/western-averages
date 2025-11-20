import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Ensure proper handling of dynamic routes
  output: undefined, // Let Netlify plugin handle this
};

export default nextConfig;
