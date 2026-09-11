"use client";

import React from 'react';
import Link from 'next/link';
import { LEGAL_LINKS, REQUISITES } from '../../lib/legal';

const linkClass = 'text-base text-gray-400 hover:text-white';
const headingClass = 'text-sm font-semibold text-gray-300 tracking-wider uppercase';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className={headingClass}>О компании</h3>
            <ul className="mt-4 space-y-4">
              <li>
                <Link href="/pages/about" className={linkClass}>
                  О нас
                </Link>
              </li>
              <li>
                <Link href="/pages/pricing" className={linkClass}>
                  Цены
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className={headingClass}>Поддержка</h3>
            <ul className="mt-4 space-y-4">
              <li>
                <Link href={LEGAL_LINKS.contact} className={linkClass}>
                  Контакты и реквизиты
                </Link>
              </li>
              <li>
                <a href={`mailto:${REQUISITES.email}`} className={linkClass}>
                  {REQUISITES.email}
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className={headingClass}>Правовая информация</h3>
            <ul className="mt-4 space-y-4">
              <li>
                <Link href={LEGAL_LINKS.offer} className={linkClass}>
                  Публичная оферта
                </Link>
              </li>
              <li>
                <Link href={LEGAL_LINKS.terms} className={linkClass}>
                  Пользовательское соглашение
                </Link>
              </li>
              <li>
                <Link href={LEGAL_LINKS.personalData} className={linkClass}>
                  Обработка персональных данных
                </Link>
              </li>
              <li>
                <Link href={LEGAL_LINKS.privacy} className={linkClass}>
                  Политика конфиденциальности
                </Link>
              </li>
              <li>
                <Link href={LEGAL_LINKS.cookies} className={linkClass}>
                  Файлы cookie
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-gray-800 pt-8 space-y-2 text-sm text-gray-400">
          <p>
            {REQUISITES.name} · ИНН {REQUISITES.inn} · ОГРНИП {REQUISITES.ogrnip}
          </p>
          <p>
            Является оператором персональных данных. Обработка осуществляется в соответствии с
            Федеральным законом от 27.07.2006 № 152-ФЗ.
          </p>
          <p className="pt-4 text-gray-500">
            &copy; {currentYear} Pixora. Все права защищены.
          </p>
        </div>
      </div>
    </footer>
  );
}
