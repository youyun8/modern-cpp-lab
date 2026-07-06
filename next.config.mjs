/** @type {import('next').NextConfig} */

// GitHub Pages serves the site under a repository sub-path. Override with
// NEXT_PUBLIC_BASE_PATH when deploying under a different repo name.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '/cpp-parallel-lab';

const nextConfig = {
  output: 'export',
  basePath: basePath || undefined,
  assetPrefix: basePath || undefined,
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
  eslint: {
    // Lint is run explicitly via `npm run lint`; do not block static export.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
