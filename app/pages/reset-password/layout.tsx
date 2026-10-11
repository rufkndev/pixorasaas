import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Смена пароля',
  description: 'Установка нового пароля по ссылке из письма.',
  robots: { index: false, follow: false },
};

export default function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
