import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Согласие на обработку персональных данных — Pixora',
  description:
    'Текст согласия на обработку персональных данных, которое пользователь даёт при регистрации на сайте Pixora Labs.',
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://pixora-ai.ru/pages/consent' },
};

export default function ConsentLayout({ children }: { children: React.ReactNode }) {
  return children;
}
