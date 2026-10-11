import type { Metadata } from 'next';

// Рабочий шаг генератора, а не витрина: без названия в адресе страница пустая,
// а без входа уводит на /pages/login. В поиск идёт лендинг /logo-generator
export const metadata: Metadata = {
  title: 'Генерация логотипа',
  description: 'Генерация логотипа по выбранному названию.',
  robots: { index: false, follow: true },
};

export default function LogoGeneratorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
