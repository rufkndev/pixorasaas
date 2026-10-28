import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Navbar from '../../components/layout/Navbar';
import Footer from '../../components/layout/Footer';
import Faq from '../../components/landing/Faq';
import LogoStartForm from '../../components/landing/LogoStartForm';
import JsonLd from '../../components/seo/JsonLd';
import { PRICES } from '../../lib/legal';
import { absoluteUrl, BRANDBOOK_SAMPLE_PAGES, BRANDBOOK_SAMPLE_URL, pageMetadata, SITE_URL } from '../../lib/site';
import { findNiche, NICHES } from '../_niches';

// Все ниши собираются статикой, чужой адрес — сразу 404
export const dynamicParams = false;

export function generateStaticParams() {
  return NICHES.map((niche) => ({ niche: niche.slug }));
}

type Props = { params: Promise<{ niche: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const niche = findNiche((await params).niche);
  if (!niche) return {};

  return pageMetadata({ title: niche.title, description: niche.description, path: `/logo-generator/${niche.slug}` });
}

const linkClass = 'font-medium text-gray-900 underline underline-offset-4';

export default async function NicheLanding({ params }: Props) {
  const niche = findNiche((await params).niche);
  if (!niche) notFound();

  const url = absoluteUrl(`/logo-generator/${niche.slug}`);
  const others = NICHES.filter((item) => item.slug !== niche.slug);

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Главная', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Генератор логотипов', item: absoluteUrl('/logo-generator') },
      { '@type': 'ListItem', position: 3, name: niche.h1, item: url },
    ],
  };

  return (
    <>
      <Navbar />
      <main className="pt-16">
        <section className="bg-gray-50">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-20">
            <div>
              <nav className="text-sm text-gray-500" aria-label="Хлебные крошки">
                <Link href="/" className="hover:underline">Главная</Link>
                <span className="mx-2">/</span>
                <Link href="/logo-generator" className="hover:underline">Генератор логотипов</Link>
              </nav>
              <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">{niche.h1}</h1>
              <p className="mt-5 text-lg text-gray-700">{niche.lead}</p>
              <p className="mt-4 text-gray-700">
                Введите название — {niche.form.industry ? 'нишу и стиль' : 'стиль'} мы уже подставили. Нейросеть нарисует знак, а название наберём настоящим
                шрифтом, поэтому буквы будут без ошибок.
              </p>
            </div>
            <div>
              <LogoStartForm defaults={niche.form} />
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <section className="py-12">
            <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">Где будет работать логотип</h2>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {niche.where.map((item) => (
                <li key={item} className="rounded-md bg-gray-50 p-4 text-gray-800">
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section className="py-12">
            <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">Что важно в этой нише</h2>
            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              {niche.works.map((item) => (
                <div key={item.title} className="rounded-lg border border-gray-200 p-5">
                  <h3 className="text-lg font-bold text-gray-900">{item.title}</h3>
                  <p className="mt-2 text-gray-700">{item.text}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="py-12">
            <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">Чего лучше избежать</h2>
            <ul className="mt-6 space-y-3 text-gray-700">
              {niche.avoid.map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="text-gray-400">—</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            {niche.article && (
              <p className="mt-6 text-gray-700">
                Подробнее в блоге:{' '}
                <Link href={niche.article.href} className={linkClass}>
                  {niche.article.label}
                </Link>
                .
              </p>
            )}
          </section>

          <section className="py-12">
            <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">Что вы получите</h2>
            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <div className="rounded-lg border border-gray-200 p-5">
                <h3 className="text-lg font-bold text-gray-900">Логотип — {PRICES.logo} ₽</h3>
                <p className="mt-2 text-gray-700">
                  Вектор SVG для печати и вывесок, PNG 3072 px с прозрачным фоном, JPG на белом и исходный кадр
                  нейросети. Без водяного знака, одним архивом.
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 p-5">
                <h3 className="text-lg font-bold text-gray-900">Брендбук — {PRICES.brandbook} ₽</h3>
                <p className="mt-2 text-gray-700">
                  Все файлы логотипа плюс семь его версий — знак без надписи, одноцветные и для тёмного фона, —
                  фирменные цвета, шрифты, иконки и макеты визитки, постов и презентации.{' '}
                  <a href={BRANDBOOK_SAMPLE_URL} target="_blank" rel="noopener" className={linkClass}>
                    Образец, PDF на {BRANDBOOK_SAMPLE_PAGES} страниц
                  </a>
                </p>
              </div>
            </div>
            <p className="mt-4 text-gray-700">
              Ещё нет названия?{' '}
              <Link href="/name-generator" className={linkClass}>
                Подберите его в генераторе названий
              </Link>
              .
            </p>
          </section>

          <Faq items={niche.faq} />

          <section className="border-t border-gray-200 py-10">
            <h2 className="text-lg font-semibold text-gray-900">Логотипы для других ниш</h2>
            <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
              {others.map((item) => (
                <li key={item.slug}>
                  <Link href={`/logo-generator/${item.slug}`} className="text-gray-800 underline underline-offset-4 hover:text-gray-900">
                    {item.h1}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </main>
      <Footer />
      <JsonLd data={structuredData} />
    </>
  );
}
