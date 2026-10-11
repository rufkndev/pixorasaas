import type { Metadata } from 'next';

// Адреса для метаданных, sitemap и разметки schema.org — в одном месте,
// чтобы канонический домен и картинка превью не расходились между страницами.

export const SITE_URL = 'https://pixora-ai.ru';
export const SITE_NAME = 'Pixora';

// PNG собирается при next build маршрутом app/og.png: SVG не показывают
// ни Telegram, ни ВКонтакте, ни мессенджеры
export const OG_IMAGE = {
  url: `${SITE_URL}/og.png`,
  width: 1200,
  height: 630,
  alt: 'Pixora — название, логотип и брендбук с помощью ИИ',
};

// Настоящий брендбук из нашей сборки, а не макет: обещать можно только то,
// что покупатель действительно получит
export const BRANDBOOK_SAMPLE_URL = '/samples/brandbook-sample.pdf';
export const BRANDBOOK_SAMPLE_PAGES = 15;

export const absoluteUrl = (path: string) => `${SITE_URL}${path === '/' ? '' : path}`;

// Дочерний openGraph целиком заменяет родительский, поэтому картинку и адрес
// задаём на каждой странице сразу вместе с canonical
export const pageMetadata = ({
  title,
  description,
  path,
  article,
}: {
  title: string;
  description: string;
  path: string;
  // Даты статьи ГГГГ-ММ-ДД: с ними openGraph получает тип article
  article?: { published: string; updated: string };
}): Metadata => {
  const common = {
    locale: 'ru_RU',
    siteName: SITE_NAME,
    title,
    description,
    url: absoluteUrl(path),
    images: [OG_IMAGE],
  };

  return {
    title,
    description,
    alternates: { canonical: absoluteUrl(path) },
    openGraph: article
      ? { ...common, type: 'article', publishedTime: article.published, modifiedTime: article.updated }
      : { ...common, type: 'website' },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [OG_IMAGE.url],
    },
  };
};
