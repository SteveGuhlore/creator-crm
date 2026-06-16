/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Prisma + bcryptjs are server-only; keep them external to the server bundle.
  serverExternalPackages: ['@prisma/client', 'bcryptjs', 'bullmq', 'ioredis'],
};

export default nextConfig;
