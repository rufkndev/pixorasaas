import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Генератор брендбуков с ИИ - Создать брендбук онлайн | Pixora',
  description: 'Создайте полный брендбук с ИИ: логотип, цвета, шрифты, руководство по использованию. Профессиональный фирменный стиль за 999₽. Скачать в PDF.',
  keywords: [
    'генератор брендбуков',
    'создать брендбук онлайн',
    'фирменный стиль',
    'корпоративная айдентика',
    'руководство по фирменному стилю',
    'брендбук с ИИ',
    'автоматический брендинг',
    'цветовая палитра',
    'типографика бренда',
    'гайдлайны бренда'
  ],
  openGraph: {
    title: 'Генератор брендбуков с ИИ - Создать брендбук онлайн',
    description: 'Создайте полный брендбук с ИИ: логотип, цвета, шрифты, руководство по использованию.',
    url: 'https://pixora-labs.ru/pages/brandbook-generator',
    images: [
      {
        url: 'https://pixora-labs.ru/logo.svg',
        width: 1200,
        height: 630,
        alt: 'Генератор брендбуков Pixora',
      },
    ],
  },
  twitter: {
    title: 'Генератор брендбуков с ИИ - Создать брендбук онлайн',
    description: 'Создайте полный брендбук с ИИ: логотип, цвета, шрифты, руководство по использованию.',
  },
  alternates: {
    canonical: 'https://pixora-labs.ru/pages/brandbook-generator',
  },
};

export default function BrandbookGeneratorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}