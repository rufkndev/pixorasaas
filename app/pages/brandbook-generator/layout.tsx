import type { Metadata } from 'next';

// Шаг после логотипа: без входа и без выбранного логотипа показывать нечего
export const metadata: Metadata = {
  title: 'Предпросмотр брендбука',
  description: 'Что войдёт в брендбук для выбранного логотипа.',
  robots: { index: false, follow: true },
};

export default function BrandbookGeneratorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
