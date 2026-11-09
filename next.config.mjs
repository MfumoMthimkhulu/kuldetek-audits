/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // ✅ Allow build to complete even if there are TS errors
    ignoreBuildErrors: true,
  },
  eslint: {
    // ✅ Allow build to complete even if there are ESLint errors
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;