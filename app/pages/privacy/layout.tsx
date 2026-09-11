import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Политика конфиденциальности — Pixora',
  description:
    'Какие данные собирает Pixora Labs, зачем они нужны, где хранятся и как отозвать согласие на их обработку.',
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://pixora-ai.ru/pages/privacy' },
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
