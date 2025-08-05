import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Пользовательское соглашение - Pixora Labs',
  description: 'Условия использования сервиса Pixora Labs. Права и обязанности при создании логотипов и брендбуков с помощью искусственного интеллекта.',
  robots: {
    index: true,
    follow: false,
  },
  alternates: {
    canonical: 'https://pixora-labs.ru/pages/terms',
  },
};

export default function TermsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}