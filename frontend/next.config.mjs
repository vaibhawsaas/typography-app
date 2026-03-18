/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required for Docker multi-stage build – produces a self-contained server.js
  output: "standalone",
};

export default nextConfig;
