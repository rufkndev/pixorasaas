import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Регистрация — Pixora',
  description: 'Создание аккаунта Pixora.',
  robots: { index: false, follow: false },
  alternates: { canonical: 'https://pixora-ai.ru/pages/register' },
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
