"use client";

import { useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../context/AuthContext';

// Уводит на страницу входа, запоминая адрес целиком: состояние генератора
// живёт в query-параметрах и иначе потеряется.
// Вызывать внутри <Suspense> — этого требует useSearchParams.
export const useRequireAuth = () => {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (isLoading || user) return;

    const query = searchParams.toString();
    const next = query ? `${pathname}?${query}` : pathname;

    router.replace(`/pages/login?next=${encodeURIComponent(next)}`);
  }, [user, isLoading, router, pathname, searchParams]);

  return { user, isLoading };
};
