import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Navbar from '../../components/layout/Navbar';
import Footer from '../../components/layout/Footer';
import Faq from '../../components/landing/Faq';
import JsonLd from '../../components/seo/JsonLd';
import { absoluteUrl, OG_IMAGE, pageMetadata, SITE_URL } from '../../lib/site';
import { findPost, formatDate, POSTS } from '../_posts';

// Все статьи собираются статикой при next build, чужой адрес — сразу 404
export const dynamicParams = false;

export function generateStaticParams() {
  return POSTS.map((post) => ({ slug: post.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = findPost((await params).slug);
  if (!post) return {};

  return pageMetadata({
    title: post.title,
    description: post.description,
    path: `/blog/${post.slug}`,
    article: { published: post.published, updated: post.updated },
  });
}

// Типографики статьи нет в Tailwind без плагина, поэтому стили — на обёртке
const PROSE =
  'text-gray-800 leading-relaxed [&_p]:mt-4 [&_h2]:mt-10 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-gray-900 ' +
  '[&_h3]:mt-6 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-gray-900 [&_ul]:mt-4 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6 ' +
  '[&_ol]:mt-4 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-6 [&_a]:font-medium [&_a]:text-gray-900 [&_a]:underline ' +
  '[&_a]:underline-offset-4 [&_table]:w-full [&_table]:min-w-[480px] [&_table]:text-left [&_table]:text-sm ' +
  '[&_th]:border-b [&_th]:border-gray-300 [&_th]:py-2 [&_th]:pr-4 [&_th]:font-medium [&_th]:text-gray-500 ' +
  '[&_td]:border-b [&_td]:border-gray-200 [&_td]:py-2 [&_td]:pr-4 [&_td]:align-top';

export default async function BlogPostPage({ params }: Props) {
  const post = findPost((await params).slug);
  if (!post) notFound();

  const url = absoluteUrl(`/blog/${post.slug}`);
  const others = POSTS.filter((item) => item.slug !== post.slug).slice(0, 3);

  const structuredData = [
    {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: post.title,
      description: post.description,
      url,
      mainEntityOfPage: url,
      image: OG_IMAGE.url,
      inLanguage: 'ru-RU',
      datePublished: post.published,
      dateModified: post.updated,
      author: { '@id': `${SITE_URL}/#organization` },
      publisher: { '@id': `${SITE_URL}/#organization` },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Главная', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: 'Блог', item: absoluteUrl('/blog') },
        { '@type': 'ListItem', position: 3, name: post.title, item: url },
      ],
    },
  ];

  return (
    <>
      <Navbar />
      <main className="pt-16">
        <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:py-16">
          <nav className="text-sm text-gray-500" aria-label="Хлебные крошки">
            <Link href="/" className="hover:underline">Главная</Link>
            <span className="mx-2">/</span>
            <Link href="/blog" className="hover:underline">Блог</Link>
          </nav>

          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">{post.title}</h1>
          <p className="mt-3 text-sm text-gray-500">
            Обновлено {formatDate(post.updated)} · {post.readingMinutes} мин чтения
          </p>

          <div className="mt-8 rounded-lg border border-gray-200 bg-gray-50 p-5">
            <p className="font-semibold text-gray-900">Коротко</p>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-gray-800">
              {post.summary.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>

          <div className={`mt-8 ${PROSE}`}>{post.body}</div>

          <Faq items={post.faq} title="Вопросы и ответы" />

          <aside className="border-t border-gray-200 pt-8">
            <p className="font-semibold text-gray-900">Читайте также</p>
            <ul className="mt-3 space-y-2">
              {others.map((item) => (
                <li key={item.slug}>
                  <Link href={`/blog/${item.slug}`} className="text-gray-800 underline underline-offset-4 hover:text-gray-900">
                    {item.title}
                  </Link>
                </li>
              ))}
            </ul>
          </aside>
        </article>
      </main>
      <Footer />
      <JsonLd data={structuredData} />
    </>
  );
}
