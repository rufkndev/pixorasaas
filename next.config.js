/** @type {import('next').NextConfig} */

// В докере подставляется имя сервиса (api / api-dev), иначе localhost
const apiInternalUrl = process.env.API_INTERNAL_URL || 'http://localhost:3001';

const nextConfig = {
  // Компактный рантайм-образ: только сервер и реально нужные зависимости
  output: 'standalone',

  // Прокси rewrites по умолчанию обрывает запрос на 30 секундах и отдаёт 500,
  // а генерация логотипа занимает около 45 — бэкенд при этом продолжает работать
  experimental: {
    proxyTimeout: 180_000,
  },

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
    ],
    unoptimized: false,
    domains: ['localhost'],
  },

  // Прокси на бэкенд для запуска без Caddy — дев и next start напрямую.
  // В проде эти пути перехватывает Caddy, иначе бэкенд не видит IP клиента.
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${apiInternalUrl}/api/:path*`,
      },
      {
        source: '/generated-logos/:path*',
        destination: `${apiInternalUrl}/generated-logos/:path*`,
      },
    ];
  },

  // Дублируют заголовки Caddy — работают, когда запуск идёт без него
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'geolocation=(), microphone=(), camera=()' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
