import type { Metadata } from 'next';
import { pageMetadata } from '../../lib/site';

export const metadata: Metadata = pageMetadata({
  title: 'О сервисе Pixora',
  description:
    'Pixora — онлайн-сервис, который с помощью ИИ подбирает название, рисует логотип и собирает брендбук для малого бизнеса. Как он устроен и кто за ним стоит.',
  path: '/pages/about',
});

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
