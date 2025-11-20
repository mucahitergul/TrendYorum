/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ['playwright']
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = Array.isArray(config.externals)
        ? [...config.externals, 'playwright']
        : config.externals;
    }
    return config;
  }
};

module.exports = nextConfig;