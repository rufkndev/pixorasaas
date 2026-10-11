import type { MetadataRoute } from 'next';
import { absoluteUrl } from './lib/site';
import { POSTS } from './blog/_posts';

// Только страницы, открытые для индекса. Шаги генератора, вход, кабинет и оплата
// сюда не входят. priority и changefreq не задаём: Яндекс и Google их игнорируют
const PAGES: Array<{ path: string; updated: string }> = [
  { path: '/', updated: '2026-10-10' },
  { path: '/logo-generator', updated: '2026-10-10' },
  { path: '/name-generator', updated: '2026-10-10' },
  { path: '/pages/pricing', updated: '2026-10-10' },
  { path: '/blog', updated: '2026-10-10' },
  { path: '/pages/about', updated: '2026-10-10' },
  { path: '/pages/contact', updated: '2026-08-27' },
  { path: '/pages/offer', updated: '2026-08-27' },
  { path: '/pages/terms', updated: '2026-08-27' },
  { path: '/pages/personal-data', updated: '2026-10-08' },
  { path: '/pages/consent', updated: '2026-10-08' },
  { path: '/pages/privacy', updated: '2026-10-08' },
  { path: '/pages/cookies', updated: '2026-10-08' },
];

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    ...PAGES.map((page) => ({ url: absoluteUrl(page.path), lastModified: page.updated })),
    ...POSTS.map((post) => ({ url: absoluteUrl(`/blog/${post.slug}`), lastModified: post.updated })),
  ];
}
