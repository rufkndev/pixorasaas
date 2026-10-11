import type { Metadata } from 'next';
import { pageMetadata } from '../../lib/site';

export const metadata: Metadata = pageMetadata({
  title: 'Контакты и реквизиты',
  description:
    'Как связаться с Pixora: форма обратной связи, почта, телефон и реквизиты ИП. Вопросы по заказам, оплате и файлам логотипа.',
  path: '/pages/contact',
});

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
