/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '20mb',
    },
    // Required on Next 14.x for instrumentation.ts's register() to run on server start
    // (flag-free from Next 15 onward). Used to boot the in-process ingestion worker.
    instrumentationHook: true,
  },
  serverExternalPackages: ['pdf-parse', 'bcryptjs'],
};

export default nextConfig;
