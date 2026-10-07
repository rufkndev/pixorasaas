"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { useAuth } from '../../context/AuthContext';
import { ApiError, authApi } from '../../lib/authClient';
import AuthShell, {
  FormError,
  inputClass,
  labelClass,
  linkClass,
  submitClass,
} from '../../components/auth/AuthShell';
import {
  MarketingConsentCheckbox,
  PdnConsentCheckbox,
} from '../../components/legal/ConsentCheckbox';

export default function RegisterPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pdn, setPdn] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!isLoading && user) {
      router.replace('/pages/dashboard');
    }
  }, [user, isLoading, router]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    // Дублирует серверную проверку, чтобы не гонять запрос впустую
    if (!pdn) {
      setError('Без согласия на обработку персональных данных регистрация невозможна');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      await authApi.register({
        email,
        password,
        fullName: fullName.trim() || undefined,
        consents: { pdn: true, marketing },
      });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось зарегистрироваться');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Ответ сервера одинаков для свободного и занятого адреса, поэтому экран
  // подтверждения показывается в любом случае — так адрес не проверишь перебором
  if (submitted) {
    return (
      <AuthShell
        title="Проверьте почту"
        subtitle={
          <>
            Мы отправили письмо на <strong className="text-gray-900">{email}</strong>. Перейдите по
            ссылке из письма, чтобы подтвердить адрес и войти в аккаунт.
          </>
        }
        footer={
          <>
            Письмо не пришло? Проверьте папку «Спам» или{' '}
            <Link href="/pages/login" className={linkClass}>
              запросите его повторно при входе
            </Link>
            .
          </>
        }
      >
        <Link href="/" className={`${submitClass} inline-block text-center`}>
          На главную
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Регистрация"
      subtitle="Создайте аккаунт, чтобы сохранять логотипы и брендбуки."
      footer={
        <>
          Уже есть аккаунт?{' '}
          <Link href="/pages/login" className={linkClass}>
            Войти
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormError>{error}</FormError>

        <div>
          <label htmlFor="fullName" className={labelClass}>
            Имя <span className="text-gray-400 font-normal">— необязательно</span>
          </label>
          <input
            id="fullName"
            type="text"
            autoComplete="name"
            value={fullName}
            maxLength={120}
            onChange={(event) => setFullName(event.target.value)}
            className={inputClass}
          />
        </div>

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
            maxLength={254}
            onChange={(event) => setEmail(event.target.value)}
            className={inputClass}
            placeholder="you@example.ru"
          />
        </div>

        <div>
          <label htmlFor="password" className={labelClass}>
            Пароль
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            maxLength={128}
            onChange={(event) => setPassword(event.target.value)}
            className={inputClass}
          />
          <p className="mt-1 text-xs text-gray-500">Не короче 8 символов.</p>
        </div>

        <div className="space-y-3 pt-1">
          <PdnConsentCheckbox checked={pdn} onChange={setPdn} disabled={isSubmitting} />
          <MarketingConsentCheckbox
            checked={marketing}
            onChange={setMarketing}
            disabled={isSubmitting}
          />
        </div>

        <button type="submit" disabled={isSubmitting} className={submitClass}>
          {isSubmitting ? 'Отправляем…' : 'Зарегистрироваться'}
        </button>
      </form>
    </AuthShell>
  );
}
