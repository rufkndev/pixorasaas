/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'gen-api.storage.yandexcloud.net',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

module.exports = nextConfig; 