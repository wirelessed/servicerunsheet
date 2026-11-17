/** @type {import('next').NextConfig} */
const nextConfig = {
  // Only export statically for production builds (Firebase deploy).
  // In dev mode, skip this so dynamic routes work normally.
  ...(process.env.NODE_ENV === 'production' ? { output: 'export' } : {}),
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
