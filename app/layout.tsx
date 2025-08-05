/* Корневой макет приложения (Root Layout)
 * 
 * Этот файл определяет:
 * - Общую структуру HTML для всех страниц
 * - Метаданные приложения (title, description)
 * - Подключение глобальных стилей
 * - Подключение шрифтов (Inter)
 * - Подключение AuthProvider для управления аутентификацией */

import React from 'react';
import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from './context/AuthContext';

const inter = Inter({ 
  subsets: ['latin', 'cyrillic'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Pixora - AI генератор названий, логотипов и брендбуков | pixora-labs.ru',
    template: '%s | Pixora - AI брендинг',
  },
  description: 'Создайте уникальный бренд с ИИ за 5 минут! Генерация названий, логотипов и брендбуков. Более 10,000 довольных клиентов. Цены от 499₽.',
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
  metadataBase: new URL('https://pixora-labs.ru'),
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
    url: 'https://pixora-labs.ru',
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
    "url": "https://pixora-labs.ru",
    "logo": "https://pixora-labs.ru/logo.svg",
    "description": "Создание уникального брендинга с помощью искусственного интеллекта - логотипы, названия и брендбуки за 5 минут",
    "foundingDate": "2024",
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "customer service",
      "url": "https://pixora-labs.ru/pages/contact"
    },
    "sameAs": [
      "https://github.com/rufkndev/pixorasaas"
    ],
    "offers": [
      {
        "@type": "Offer",
        "name": "Генерация логотипа",
        "price": "499",
        "priceCurrency": "RUB",
        "description": "Профессиональный логотип для вашего бизнеса с ИИ"
      },
      {
        "@type": "Offer", 
        "name": "Полный брендбук",
        "price": "999",
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
      <body className={inter.className}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
} 