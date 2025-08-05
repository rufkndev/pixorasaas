import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Генератор логотипов с ИИ - Создать логотип онлайн за 5 минут | Pixora',
  description: 'Создайте уникальный логотип с помощью ИИ за 5 минут! Генератор логотипов Pixora - высокое качество, SVG/PNG форматы, без вотермарков. Попробуйте бесплатно!',
  keywords: [
    'генератор логотипов',
    'создать логотип онлайн',
    'ИИ логотип',
    'искусственный интеллект дизайн',
    'логотип за 5 минут',
    'онлайн конструктор логотипов',
    'дизайн логотипа',
    'создание фирменного знака',
    'векторный логотип',
    'профессиональный логотип'
  ],
  openGraph: {
    title: 'Генератор логотипов с ИИ - Создать логотип онлайн за 5 минут',
    description: 'Создайте уникальный логотип с помощью ИИ за 5 минут! Высокое качество, без вотермарков.',
    url: 'https://pixora-labs.ru/pages/logo-generator',
    images: [
      {
        url: 'https://pixora-labs.ru/logo.svg',
        width: 1200,
        height: 630,
        alt: 'Генератор логотипов Pixora',
      },
    ],
  },
  twitter: {
    title: 'Генератор логотипов с ИИ - Создать логотип онлайн за 5 минут',
    description: 'Создайте уникальный логотип с помощью ИИ за 5 минут! Высокое качество, без вотермарков.',
  },
  alternates: {
    canonical: 'https://pixora-labs.ru/pages/logo-generator',
  },
};

export default function LogoGeneratorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}