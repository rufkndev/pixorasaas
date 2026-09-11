import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Политика использования файлов cookie — Pixora',
  description:
    'Какие файлы cookie использует сайт Pixora Labs, зачем они нужны, сколько хранятся и как ими управлять.',
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://pixora-ai.ru/pages/cookies' },
};

export default function CookiesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
