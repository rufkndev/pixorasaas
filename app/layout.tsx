// Корневой макет: общая структура HTML, метаданные, AuthProvider, баннер cookie.
// Шрифт системный: next/font/google скачивал файлы во время next build,
// из-за чего сборка образа на российском сервере падала.

import React from 'react';
import './globals.css';
import type { Metadata } from 'next';
import { AuthProvider } from './context/AuthContext';
import CookieBanner from './components/legal/CookieBanner';
import Telemetry from './components/common/Telemetry';
import JsonLd from './components/seo/JsonLd';
import { FREE_GENERATIONS, PRICES, REQUISITES } from './lib/legal';
import { OG_IMAGE, SITE_NAME, SITE_URL } from './lib/site';

const DESCRIPTION =
  `Название, логотип и брендбук для бизнеса с помощью ИИ. ${FREE_GENERATIONS} бесплатных генераций, ` +
  `логотип в SVG и PNG — ${PRICES.logo} ₽, брендбук в PDF — ${PRICES.brandbook} ₽.`;

// canonical здесь не задаём: его унаследовала бы каждая страница без своего
// canonical, и поисковик склеил бы её с главной
export const metadata: Metadata = {
  title: {
    default: 'Pixora — генератор названий, логотипов и брендбуков с ИИ',
    template: '%s | Pixora',
  },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(SITE_URL),
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/logo.svg',
    apple: '/logo.svg',
    shortcut: '/logo.svg',
  },
  manifest: '/manifest.json',
  openGraph: {
    type: 'website',
    locale: 'ru_RU',
    siteName: SITE_NAME,
    title: 'Pixora — название, логотип и брендбук с ИИ',
    description: DESCRIPTION,
    images: [OG_IMAGE],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pixora — название, логотип и брендбук с ИИ',
    description: DESCRIPTION,
    images: [OG_IMAGE.url],
  },
  verification: {
    google: 'v2-aXR4y3k-FVGzXsJ5amp9GkSHMSq9V8Mkp3p4TzQY',
    yandex: '34f4c7628ceddfc6',
  },
};

// Только проверяемые факты: ИИ-поисковики сверяют разметку с текстом страницы
const structuredData = [
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organization`,
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/logo.svg`,
    email: REQUISITES.email,
    telephone: REQUISITES.phoneHref,
    description: 'Онлайн-сервис, который с помощью ИИ генерирует названия, логотипы и брендбуки для малого бизнеса.',
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      email: REQUISITES.email,
      url: `${SITE_URL}/pages/contact`,
      availableLanguage: 'ru',
    },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    name: SITE_NAME,
    url: SITE_URL,
    inLanguage: 'ru-RU',
    publisher: { '@id': `${SITE_URL}/#organization` },
  },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <head>
        <JsonLd data={structuredData} />
      </head>
      <body>
        <AuthProvider>
          {children}
          <CookieBanner />
          <Telemetry />
        </AuthProvider>
      </body>
    </html>
  );
}
