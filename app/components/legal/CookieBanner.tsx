"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { LEGAL_LINKS, LEGAL_VERSIONS } from '../../lib/legal';

const STORAGE_KEY = 'pixora-cookie-consent';

// Баннер информационный: аналитики и трекеров нет, единственные cookie —
// сессионные, а они не требуют предварительного согласия.
// Появится Метрика — баннер придётся переделать в блокирующий.
export default function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);

      if (!stored) {
        setIsVisible(true);
        return;
      }

      // Согласие привязано к версии документа: при её изменении спрашиваем заново
      const parsed = JSON.parse(stored);
      if (parsed?.version !== LEGAL_VERSIONS.cookies) {
        setIsVisible(true);
      }
    } catch {
      // Приватный режим или запрет хранения — показываем, но не ломаем страницу
      setIsVisible(true);
    }
  }, []);

  const accept = () => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ version: LEGAL_VERSIONS.cookies, acceptedAt: new Date().toISOString() })
      );
    } catch {
      // Не сохранилось — баннер появится снова, не критично
    }
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div
      role="region"
      aria-label="Уведомление об использовании cookie"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-gray-200 bg-white/98 backdrop-blur-sm shadow-[0_-4px_16px_rgba(0,0,0,0.06)]"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-gray-700">
          Мы используем только те cookie, без которых сайт не работает: они хранят вашу сессию
          входа. Аналитики и рекламных трекеров у нас нет. Подробнее — в{' '}
          <Link href={LEGAL_LINKS.cookies} className="underline hover:no-underline">
            политике использования cookie
          </Link>
          .
        </p>
        <button
          type="button"
          onClick={accept}
          className="shrink-0 rounded-md bg-gray-900 px-5 py-2 text-sm font-semibold text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900"
        >
          Понятно
        </button>
      </div>
    </div>
  );
}
