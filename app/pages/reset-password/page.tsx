"use client";

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import { ApiError, authApi } from '../../lib/authClient';
import AuthShell, {
  FormError,
  inputClass,
  labelClass,
  linkClass,
  submitClass,
} from '../../components/auth/AuthShell';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (password !== confirmation) {
      setError('Пароли не совпадают');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      await authApi.resetPassword({ token, password });
      setDone(true);
      // Сброс пароля разлогинивает все устройства — заходить нужно заново
      setTimeout(() => router.replace('/pages/login'), 2000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось изменить пароль');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!token) {
    return (
      <AuthShell
        title="Ссылка неполная"
        footer={
          <Link href="/pages/forgot-password" className={linkClass}>
            Запросить новую ссылку
          </Link>
        }
      >
        <FormError>В ссылке нет токена. Откройте её из письма целиком.</FormError>
      </AuthShell>
    );
  }

  if (done) {
    return (
      <AuthShell
        title="Пароль изменён"
        subtitle="Все активные сессии завершены. Войдите с новым паролем."
      >
        <Link href="/pages/login" className={`${submitClass} inline-block text-center`}>
          Войти
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Новый пароль" subtitle="Придумайте пароль не короче 8 символов.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormError>{error}</FormError>

        <div>
          <label htmlFor="password" className={labelClass}>
            Новый пароль
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="confirmation" className={labelClass}>
            Повторите пароль
          </label>
          <input
            id="confirmation"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            className={inputClass}
          />
        </div>

        <button type="submit" disabled={isSubmitting} className={submitClass}>
          {isSubmitting ? 'Сохраняем…' : 'Сохранить пароль'}
        </button>
      </form>
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
