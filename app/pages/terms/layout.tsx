import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Пользовательское соглашение',
  description:
    'Правила использования сайта и сервисов Pixora Labs: учётная запись, права на результаты генерации, ограничение ответственности, порядок разрешения споров.',
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://pixora-ai.ru/pages/terms' },
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
