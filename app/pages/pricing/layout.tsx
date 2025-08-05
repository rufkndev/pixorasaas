import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Цены на создание логотипов и брендбуков - Тарифы Pixora от 499₽',
  description: 'Доступные цены на профессиональный брендинг с ИИ. Логотип от 499₽, полный брендбук от 999₽. Высокое качество, быстрая генерация, без вотермарок.',
  keywords: [
    'цены на логотипы',
    'стоимость брендбука',
    'тарифы pixora',
    'доступный брендинг',
    'цена логотипа 499 рублей',
    'полный брендбук 999 рублей',
    'профессиональный дизайн недорого',
    'генерация логотипа цена'
  ],
  openGraph: {
    title: 'Цены на создание логотипов и брендбуков - Тарифы Pixora от 499₽',
    description: 'Доступные цены на профессиональный брендинг с ИИ. Логотип от 499₽, полный брендбук от 999₽.',
    url: 'https://pixora-labs.ru/pages/pricing',
    images: [
      {
        url: 'https://pixora-labs.ru/logo.svg',
        width: 1200,
        height: 630,
        alt: 'Цены Pixora - от 499₽',
      },
    ],
  },
  twitter: {
    title: 'Цены на создание логотипов и брендбуков - Тарифы Pixora от 499₽',
    description: 'Доступные цены на профессиональный брендинг с ИИ. Логотип от 499₽, полный брендбук от 999₽.',
  },
  alternates: {
    canonical: 'https://pixora-labs.ru/pages/pricing',
  },
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "PriceSpecification",
    "offers": [
      {
        "@type": "Offer",
        "name": "Генерация логотипа",
        "price": "499",
        "priceCurrency": "RUB",
        "description": "Профессиональный логотип для вашего бизнеса",
        "availability": "https://schema.org/InStock",
        "seller": {
          "@type": "Organization",
          "name": "Pixora"
        }
      },
      {
        "@type": "Offer",
        "name": "Полный брендбук", 
        "price": "999",
        "priceCurrency": "RUB",
        "description": "Комплексное решение для вашего бренда",
        "availability": "https://schema.org/InStock",
        "seller": {
          "@type": "Organization",
          "name": "Pixora"
        }
      }
    ]
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData),
        }}
      />
      {children}
    </>
  );
}