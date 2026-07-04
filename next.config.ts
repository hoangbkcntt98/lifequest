import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: "/lifequest",
  env: {
    NEXT_PUBLIC_BASE_PATH: "/lifequest",
  },
  experimental: {
    proxyClientMaxBodySize: "500mb",
  },
};

export default nextConfig;
