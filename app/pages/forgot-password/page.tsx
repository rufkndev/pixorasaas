"use client";

import React, { useState } from 'react';
import Link from 'next/link';

import { ApiError, authApi } from '../../lib/authClient';
import AuthShell, {
  FormError,
  FormSuccess,
  inputClass,
  labelClass,
  linkClass,
  submitClass,
} from '../../components/auth/AuthShell';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setNotice('');
    setIsSubmitting(true);

    try {
      // Ответ одинаков для существующего и несуществующего адреса
      const result = await authApi.forgotPassword(email);
      setNotice(result.message);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось отправить письмо');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Восстановление пароля"
      subtitle="Укажите email — пришлём ссылку для смены пароля."
      footer={
        <Link href="/pages/login" className={linkClass}>
          Вернуться ко входу
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormError>{error}</FormError>
        <FormSuccess>{notice}</FormSuccess>

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

        <button type="submit" disabled={isSubmitting} className={submitClass}>
          {isSubmitting ? 'Отправляем…' : 'Отправить ссылку'}
        </button>
      </form>
    </AuthShell>
  );
}
