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
    // Разрешаем локальные изображения
    unoptimized: false,
    domains: ['localhost'],
  },
};

module.exports = nextConfig; 