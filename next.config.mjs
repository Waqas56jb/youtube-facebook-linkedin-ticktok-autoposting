/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    // Explicitly set to avoid undefined path issues during verification
    tsconfigPath: './tsconfig.json',
  },
  async rewrites() {
    const backend = process.env.BACKEND_BASE || 'https://youtube-automation.fly.dev';
    return [
      { source: '/api/:path*', destination: `${backend}/api/:path*` },
      { source: '/transcript/:path*', destination: `${backend}/transcript/:path*` },
      { source: '/story/:path*', destination: `${backend}/story/:path*` },
      { source: '/videos/:path*', destination: `${backend}/videos/:path*` },
      { source: '/youtube/:path*', destination: `${backend}/youtube/:path*` },
      { source: '/video/:path*', destination: `${backend}/video/:path*` },
    ];
  },
};

export default nextConfig;


