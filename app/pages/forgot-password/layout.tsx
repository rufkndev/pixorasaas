import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Восстановление пароля — Pixora',
  description: 'Запрос ссылки для смены пароля.',
  robots: { index: false, follow: false },
};

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
