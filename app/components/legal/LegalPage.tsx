import React, { ReactNode } from 'react';
import Link from 'next/link';
import Navbar from '../layout/Navbar';
import Footer from '../layout/Footer';
import { REQUISITES } from '../../lib/legal';

// Каркас юридической страницы: шапка, типографика документа, реквизиты, подвал
export default function LegalPage({
  title,
  updatedAt,
  intro,
  children,
}: {
  title: string;
  updatedAt: string;
  intro?: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      <Navbar />
      <main className="pt-16">
        <div className="bg-gray-50 py-12 sm:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">{title}</h1>
            <p className="mt-4 text-sm text-gray-600">Редакция от {updatedAt}</p>
            {intro && <p className="mt-4 text-lg text-gray-700 max-w-3xl mx-auto">{intro}</p>}
          </div>
        </div>

        <div className="py-12 bg-white">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="prose prose-gray max-w-none prose-headings:font-semibold prose-h2:text-xl prose-h2:mt-10 prose-a:text-gray-900">
              {children}
            </div>

            <div className="mt-12 rounded-lg border border-gray-200 bg-gray-50 p-5 text-sm text-gray-700">
              <p className="font-medium text-gray-900">Реквизиты</p>
              <p className="mt-2">{REQUISITES.name}</p>
              <p>ИНН {REQUISITES.inn} · ОГРНИП {REQUISITES.ogrnip}</p>
              <p className="mt-2">
                <a href={`tel:${REQUISITES.phoneHref}`} className="hover:underline">
                  {REQUISITES.phone}
                </a>
                {' · '}
                <a href={`mailto:${REQUISITES.email}`} className="hover:underline">
                  {REQUISITES.email}
                </a>
              </p>
            </div>

            <div className="mt-12 text-center">
              <Link
                href="/"
                className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-white bg-gray-900 hover:bg-gray-800"
              >
                Вернуться на главную
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
