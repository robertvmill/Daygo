/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  // Configure request body size limits for image processing
  // This allows larger images to be processed by the vision API
  experimental: {
    serverComponentsExternalPackages: ['sharp'],
  },
  // API route configuration to handle larger request bodies
  async headers() {
    return [
      {
        source: '/api/vision/extract-text',
        headers: [
          {
            key: 'Content-Length',
            value: '52428800', // 50MB limit for vision API
          },
        ],
      },
    ];
  },
}

module.exports = nextConfig 