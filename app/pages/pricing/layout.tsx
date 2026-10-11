import type { Metadata } from 'next';
import JsonLd from '../../components/seo/JsonLd';
import { FREE_GENERATIONS, PRICES } from '../../lib/legal';
import { pageMetadata, SITE_URL } from '../../lib/site';

export const metadata: Metadata = pageMetadata({
  title: `Цены: логотип ${PRICES.logo} ₽, брендбук ${PRICES.brandbook} ₽`,
  description:
    `Сколько стоит Pixora: ${FREE_GENERATIONS} бесплатных генераций названий и логотипов, логотип в SVG и PNG без водяного знака — ${PRICES.logo} ₽, ` +
    `брендбук в PDF с архивом файлов — ${PRICES.brandbook} ₽. Разовая оплата, без подписки.`,
  path: '/pages/pricing',
});

const offer = (name: string, price: number, description: string) => ({
  '@type': 'Offer',
  name,
  description,
  price: String(price),
  priceCurrency: 'RUB',
  availability: 'https://schema.org/InStock',
  url: `${SITE_URL}/pages/pricing`,
  seller: { '@id': `${SITE_URL}/#organization` },
});

const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Pixora',
  url: SITE_URL,
  applicationCategory: 'DesignApplication',
  operatingSystem: 'Любой браузер',
  inLanguage: 'ru-RU',
  offers: [
    offer('Логотип', PRICES.logo, 'Логотип в SVG и PNG без водяного знака'),
    offer('Брендбук', PRICES.brandbook, 'Брендбук в PDF и архив с версиями логотипа, шрифтами, иконками и макетами'),
  ],
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <JsonLd data={structuredData} />
      {children}
    </>
  );
}
