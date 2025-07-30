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
      {
        protocol: 'https',
        hostname: 'images.gen-api.ru',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.pixora-labs.ru',
        port: '',
        pathname: '/generated-logos/**',
      },
    ],
    // Разрешаем локальные изображения
    unoptimized: false,
    domains: ['localhost', 'www.pixora-labs.ru'],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3001/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig; 