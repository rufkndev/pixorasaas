import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'О компании Pixora - Инновационные решения для брендинга с ИИ',
  description: 'Узнайте о миссии Pixora - сделать профессиональный брендинг доступным всем. Передовые технологии ИИ для создания логотипов, названий и брендбуков.',
  keywords: [
    'о компании pixora',
    'миссия pixora',
    'технологии искусственного интеллекта',
    'автоматизация брендинга',
    'команда pixora',
    'инновации в дизайне',
    'профессиональный брендинг',
    'доступный дизайн'
  ],
  openGraph: {
    title: 'О компании Pixora - Инновационные решения для брендинга с ИИ',
    description: 'Узнайте о миссии Pixora - сделать профессиональный брендинг доступным всем. Передовые технологии ИИ для создания логотипов.',
    url: 'https://pixora-labs.ru/pages/about',
    images: [
      {
        url: 'https://pixora-labs.ru/logo.svg',
        width: 1200,
        height: 630,
        alt: 'О компании Pixora',
      },
    ],
  },
  twitter: {
    title: 'О компании Pixora - Инновационные решения для брендинга с ИИ',
    description: 'Узнайте о миссии Pixora - сделать профессиональный брендинг доступным всем.',
  },
  alternates: {
    canonical: 'https://pixora-labs.ru/pages/about',
  },
};

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}