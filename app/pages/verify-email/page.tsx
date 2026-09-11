"use client";

import React, { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import { useAuth } from '../../context/AuthContext';
import { ApiError, authApi } from '../../lib/authClient';
import AuthShell, { FormError, linkClass, submitClass } from '../../components/auth/AuthShell';

type State = 'pending' | 'success' | 'error';

function VerifyEmail() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshUser } = useAuth();

  const [state, setState] = useState<State>('pending');
  const [error, setError] = useState('');

  // React 18 в dev монтирует эффекты дважды, а токен одноразовый:
  // второй вызов погасил бы уже подтверждённую ссылку и показал ошибку
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const token = searchParams.get('token');

    if (!token) {
      setError('В ссылке нет токена подтверждения');
      setState('error');
      return;
    }

    (async () => {
      try {
        await authApi.verifyEmail(token);
        await refreshUser();
        setState('success');
        // Подтверждение сразу выдаёт сессию — уводим в кабинет
        setTimeout(() => router.replace('/pages/dashboard'), 1500);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Не удалось подтвердить почту');
        setState('error');
      }
    })();
  }, [searchParams, refreshUser, router]);

  if (state === 'pending') {
    return (
      <AuthShell title="Подтверждаем почту" subtitle="Секунду…">
        <div className="flex justify-center py-4">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900" />
        </div>
      </AuthShell>
    );
  }

  if (state === 'success') {
    return (
      <AuthShell
        title="Почта подтверждена"
        subtitle="Аккаунт активирован. Перенаправляем в личный кабинет…"
      >
        <Link href="/pages/dashboard" className={`${submitClass} inline-block text-center`}>
          Перейти в кабинет
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Ссылка не сработала"
      footer={
        <>
          Нужна новая ссылка?{' '}
          <Link href="/pages/login" className={linkClass}>
            Запросите её при входе
          </Link>
          .
        </>
      }
    >
      <div className="space-y-4">
        <FormError>{error}</FormError>
        <p className="text-sm text-gray-600">
          Ссылка действует ограниченное время и срабатывает один раз. Если вы уже подтверждали
          почту, просто войдите в аккаунт.
        </p>
        <Link href="/pages/login" className={`${submitClass} inline-block text-center`}>
          Войти
        </Link>
      </div>
    </AuthShell>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmail />
    </Suspense>
  );
}
