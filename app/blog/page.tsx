import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import { pageMetadata } from '../lib/site';
import { formatDate, POSTS } from './_posts';

export const metadata: Metadata = pageMetadata({
  title: 'Блог о названиях, логотипах и брендбуках',
  description:
    'Практичные ответы для малого бизнеса: сколько стоит логотип, как придумать и проверить название, что входит в брендбук, как зарегистрировать товарный знак.',
  path: '/blog',
});

export default function BlogIndex() {
  return (
    <>
      <Navbar />
      <main className="pt-16">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:py-16">
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900">Блог Pixora</h1>
          <p className="mt-4 text-lg text-gray-700">
            Короткие практичные ответы о названиях, логотипах и фирменном стиле для малого бизнеса.
          </p>

          <ul className="mt-10 divide-y divide-gray-200 border-y border-gray-200">
            {POSTS.map((post) => (
              <li key={post.slug} className="py-6">
                <Link href={`/blog/${post.slug}`} className="group block">
                  <h2 className="text-xl font-bold text-gray-900 group-hover:underline underline-offset-4">{post.title}</h2>
                  <p className="mt-2 text-gray-700">{post.description}</p>
                  <p className="mt-2 text-sm text-gray-500">
                    {formatDate(post.updated)} · {post.readingMinutes} мин чтения
                  </p>
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
