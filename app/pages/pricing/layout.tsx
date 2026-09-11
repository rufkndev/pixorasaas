import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Цены на создание логотипов и брендбуков - Тарифы Pixora от 299₽',
  description: 'Доступные цены на профессиональный брендинг с ИИ. Логотип от 299₽, полный брендбук от 499₽. Высокое качество, быстрая генерация, без вотермарок.',
  keywords: [
    'цены на логотипы',
    'стоимость брендбука',
    'тарифы pixora',
    'доступный брендинг',
    'цена логотипа 299 рублей',
    'полный брендбук 499 рублей',
    'профессиональный дизайн недорого',
    'генерация логотипа цена'
  ],
  openGraph: {
    title: 'Цены на создание логотипов и брендбуков - Тарифы Pixora от 299₽',
    description: 'Доступные цены на профессиональный брендинг с ИИ. Логотип от 299₽, полный брендбук от 499₽.',
    url: 'https://pixora-ai.ru/pages/pricing',
    images: [
      {
        url: 'https://pixora-ai.ru/logo.svg',
        width: 1200,
        height: 630,
        alt: 'Цены Pixora - от 299₽',
      },
    ],
  },
  twitter: {
    title: 'Цены на создание логотипов и брендбуков - Тарифы Pixora от 299₽',
    description: 'Доступные цены на профессиональный брендинг с ИИ. Логотип от 299₽, полный брендбук от 499₽.',
  },
  alternates: {
    canonical: 'https://pixora-ai.ru/pages/pricing',
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
        "price": "299",
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
        "price": "499",
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