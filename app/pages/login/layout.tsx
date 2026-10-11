import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Вход',
  description: 'Вход в личный кабинет Pixora.',
  robots: { index: false, follow: false },
  alternates: { canonical: 'https://pixora-ai.ru/pages/login' },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
