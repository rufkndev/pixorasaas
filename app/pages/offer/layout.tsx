import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Публичная оферта',
  description:
    'Публичная оферта Pixora Labs: предмет договора, стоимость услуг, порядок оказания, права на результат, условия возврата денежных средств и реквизиты.',
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://pixora-ai.ru/pages/offer' },
};

export default function OfferLayout({ children }: { children: React.ReactNode }) {
  return children;
}
