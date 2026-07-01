/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@kinos/ui",
    "@kinos/engine",
    "@kinos/db",
    "@kinos/ai",
    "@kinos/payments",
    "@kinos/config",
  ],
  experimental: {
    serverActions: {
      bodySizeLimit: "8mb",
    },
  },
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        {
          key: "Permissions-Policy",
          value: "camera=(self), microphone=(self), geolocation=(self)",
        },
      ],
    },
  ],
};

export default nextConfig;
