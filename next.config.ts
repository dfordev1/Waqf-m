import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Served as a multi-zone app under waqf.im/chain (proxied from the waqfchain
  // marketing site). basePath keeps all pages and /_next assets under /chain so
  // the proxy rewrite works without asset collisions.
  basePath: "/chain",
};

export default nextConfig;
