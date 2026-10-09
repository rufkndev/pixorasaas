// Корневой макет: общая структура HTML, метаданные, AuthProvider, баннер cookie.
// Шрифт системный: next/font/google скачивал файлы во время next build,
// из-за чего сборка образа на российском сервере падала.

import React from 'react';
import './globals.css';
import type { Metadata } from 'next';
import { AuthProvider } from './context/AuthContext';
import CookieBanner from './components/legal/CookieBanner';
import Telemetry from './components/common/Telemetry';

export const metadata: Metadata = {
  title: {
    default: 'Pixora - AI генератор названий, логотипов и брендбуков | pixora-ai.ru',
    template: '%s | Pixora - AI брендинг',
  },
  description: 'Создайте уникальный бренд с ИИ за 5 минут! Генерация названий, логотипов и брендбуков. Более 10,000 довольных клиентов. Цены от 299₽.',
  keywords: [
    'генератор логотипов',
    'создание бренда',
    'ИИ логотип',
    'брендбук онлайн',
    'название для бизнеса',
    'фирменный стиль',
    'искусственный интеллект брендинг',
    'логотип за 5 минут',
    'дизайн логотипа',
    'корпоративная айдентика'
  ],
  authors: [{ name: 'Pixora Labs' }],
  creator: 'Pixora Labs',
  publisher: 'Pixora Labs',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://pixora-ai.ru'),
  alternates: {
    canonical: '/',
  },
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
    url: 'https://pixora-ai.ru',
    siteName: 'Pixora',
    title: 'Pixora - AI генератор названий, логотипов и брендбуков',
    description: 'Создайте уникальный бренд с ИИ за 5 минут! Генерация названий, логотипов и брендбуков. Более 10,000 довольных клиентов.',
    images: [
      {
        url: '/logo.svg',
        width: 1200,
        height: 630,
        alt: 'Pixora - AI генератор логотипов',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pixora - AI генератор названий, логотипов и брендбуков',
    description: 'Создайте уникальный бренд с ИИ за 5 минут! Генерация названий, логотипов и брендбуков.',
    images: ['/logo.svg'],
    creator: '@pixora_labs',
  },
  verification: {
    google: '8zBpq3SeL2SyOL_EXaX09iJTg7pHgnxTNcaXnoxIRoY',
    yandex: '34f4c7628ceddfc6',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Pixora",
    "url": "https://pixora-ai.ru",
    "logo": "https://pixora-ai.ru/logo.svg",
    "description": "Создание уникального брендинга с помощью искусственного интеллекта - логотипы, названия и брендбуки за 5 минут",
    "foundingDate": "2024",
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "customer service",
      "url": "https://pixora-ai.ru/pages/contact"
    },
    "sameAs": [
      "https://github.com/rufkndev/pixorasaas"
    ],
    "offers": [
      {
        "@type": "Offer",
        "name": "Генерация логотипа",
        "price": "299",
        "priceCurrency": "RUB",
        "description": "Профессиональный логотип для вашего бизнеса с ИИ"
      },
      {
        "@type": "Offer", 
        "name": "Полный брендбук",
        "price": "499",
        "priceCurrency": "RUB",
        "description": "Комплексное решение для вашего бренда включая логотип, цвета и руководство"
      }
    ],
    "applicationCategory": "Design Tool",
    "operatingSystem": "Web Browser"
  };

  return (
    <html lang="ru">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData),
          }}
        />
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