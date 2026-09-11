"use client";

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import { useAuth } from '../../context/AuthContext';
import { ApiError, authApi } from '../../lib/authClient';
import AuthShell, {
  FormError,
  FormSuccess,
  inputClass,
  labelClass,
  linkClass,
  submitClass,
} from '../../components/auth/AuthShell';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading, signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [needsVerification, setNeedsVerification] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Куда вернуть после входа. Только внутренние пути: внешний redirect
  // превратил бы страницу входа в open redirect.
  const rawNext = searchParams.get('next') || '/pages/dashboard';
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/pages/dashboard';

  useEffect(() => {
    if (!isLoading && user) {
      router.replace(next);
    }
  }, [user, isLoading, router, next]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setNotice('');
    setNeedsVerification(false);
    setIsSubmitting(true);

    try {
      await signIn(email, password);
      router.replace(next);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'EMAIL_NOT_VERIFIED') {
        setNeedsVerification(true);
      }
      setError(err instanceof ApiError ? err.message : 'Не удалось войти');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    try {
      const result = await authApi.resendVerification(email);
      setError('');
      setNeedsVerification(false);
      setNotice(result.message);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось отправить письмо');
    }
  };

  return (
    <AuthShell
      title="Вход"
      subtitle="Войдите, чтобы вернуться к своим логотипам и брендбукам."
      footer={
        <>
          Нет аккаунта?{' '}
          <Link href="/pages/register" className={linkClass}>
            Зарегистрироваться
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormError>{error}</FormError>
        <FormSuccess>{notice}</FormSuccess>

        {needsVerification && (
          <button
            type="button"
            onClick={handleResend}
            className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Отправить письмо с подтверждением ещё раз
          </button>
        )}

        <div>
          <label htmlFor="email" className={labelClass}>
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={inputClass}
            placeholder="you@example.ru"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="password" className={labelClass.replace(' mb-1', '')}>
              Пароль
            </label>
            <Link href="/pages/forgot-password" className="text-sm text-gray-600 hover:text-gray-900">
              Забыли пароль?
            </Link>
          </div>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={inputClass}
          />
        </div>

        <button type="submit" disabled={isSubmitting} className={submitClass}>
          {isSubmitting ? 'Входим…' : 'Войти'}
        </button>
      </form>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
