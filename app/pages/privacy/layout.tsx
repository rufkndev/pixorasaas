import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Политика конфиденциальности - Pixora Labs',
  description: 'Политика конфиденциальности Pixora Labs. Узнайте, как мы защищаем ваши данные при создании логотипов и брендбуков с помощью ИИ.',
  robots: {
    index: true,
    follow: false,
  },
  alternates: {
    canonical: 'https://pixora-labs.ru/pages/privacy',
  },
};

export default function PrivacyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}