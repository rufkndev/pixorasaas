"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { ApiError, authApi } from '../../lib/authClient';
import { LEGAL_LINKS } from '../../lib/legal';

// Отозвать согласие можно в любой момент, поэтому механизм должен быть
// в интерфейсе, а не только по письменному запросу.
export default function DeleteAccountSection() {
  const [isOpen, setIsOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleDelete = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await authApi.deleteAccount(password);
      // Сессии уже нет, уводим на главную
      window.location.href = '/';
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось удалить аккаунт');
      setIsSubmitting(false);
    }
  };

  return (
    <section className="mt-16 border-t border-gray-200 pt-8">
      <h2 className="text-lg font-semibold text-gray-900">Управление данными</h2>
      <p className="mt-2 max-w-2xl text-sm text-gray-600">
        Вы можете в любой момент отозвать согласие на обработку персональных данных и удалить
        аккаунт. Вместе с ним будут удалены все сгенерированные названия, логотипы и брендбуки —
        восстановить их будет нельзя. Сведения о совершённых платежах сохраняются в обезличенном
        виде: этого требует законодательство о применении контрольно-кассовой техники. Подробнее —
        в{' '}
        <Link href={LEGAL_LINKS.personalData} className="underline hover:no-underline">
          политике обработки персональных данных
        </Link>
        .
      </p>

      {!isOpen ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="mt-4 rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
        >
          Удалить аккаунт и отозвать согласие
        </button>
      ) : (
        <form onSubmit={handleDelete} className="mt-4 max-w-sm space-y-3">
          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-800">
              {error}
            </div>
          )}

          <label htmlFor="delete-password" className="block text-sm font-medium text-gray-700">
            Подтвердите паролем
          </label>
          <input
            id="delete-password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
          />

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            >
              {isSubmitting ? 'Удаляем…' : 'Удалить навсегда'}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setPassword('');
                setError('');
              }}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Отмена
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
