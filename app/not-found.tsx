import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';

// Без своей 404 робот и человек с битой ссылки упирались в пустую страницу Next.
// Код ответа остаётся 404. robots задан явно: иначе к noindex от Next добавлялся
// index из корневого layout, и на странице было два противоречащих тега
export const metadata: Metadata = {
  title: 'Страница не найдена',
  robots: { index: false, follow: true },
};

const LINKS = [
  { href: '/logo-generator', label: 'Генератор логотипов' },
  { href: '/name-generator', label: 'Генератор названий' },
  { href: '/brandbook-generator', label: 'Брендбук онлайн' },
  { href: '/blog', label: 'Блог' },
];

export default function NotFound() {
  return (
    <>
      <Navbar />
      <main className="pt-16">
        <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
          <p className="text-sm font-semibold text-gray-500">Ошибка 404</p>
          <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-gray-900">Такой страницы нет</h1>
          <p className="mt-4 text-lg text-gray-700">Возможно, ссылка устарела или в адресе опечатка.</p>
          <ul className="mt-8 flex flex-wrap justify-center gap-3">
            {LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="block rounded-md border border-gray-300 px-4 py-2 font-medium text-gray-900 hover:border-gray-900">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </main>
      <Footer />
    </>
  );
}
