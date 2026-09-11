import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Политика в отношении обработки персональных данных — Pixora',
  description:
    'Политика обработки персональных данных Pixora Labs: оператор, цели и правовые основания обработки, сроки хранения, права субъекта персональных данных, меры защиты.',
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://pixora-ai.ru/pages/personal-data' },
};

export default function PersonalDataLayout({ children }: { children: React.ReactNode }) {
  return children;
}
