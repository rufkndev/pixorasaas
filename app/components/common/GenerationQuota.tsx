"use client";

export interface QuotaLimits {
  limit: number;
  windowDays: number;
  names: number;
  logos: number;
  renewsAt: string | null;
}

const formatDate = (value: string): string =>
  new Date(value).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });

// Одна и та же плашка над генератором названий и над генератором логотипа:
// текст про возобновление должен быть в обоих местах одинаковым
export default function GenerationQuota({
  remaining,
  limits,
  kind,
}: {
  remaining: number | null;
  limits: QuotaLimits | null;
  kind: 'names' | 'logos';
}) {
  if (remaining === null) return null;

  const word = kind === 'names' ? 'названий' : 'логотипа';
  const windowDays = limits?.windowDays ?? 14;
  const renewsAt = limits?.renewsAt ? formatDate(limits.renewsAt) : null;

  if (remaining > 0) {
    const limit = limits?.limit ?? 5;
    // Админ может подарить генерации сверх квоты, и «7 из 5» читалось бы как сбой
    return (
      <p className="mb-4 text-sm text-gray-600">
        Бесплатных генераций {word} осталось: <strong>{remaining}</strong>
        {remaining <= limit ? ` из ${limit}` : ''}.{' '}
        {renewsAt
          ? `Счётчик обнулится ${renewsAt}.`
          : `Счётчик обнуляется через ${windowDays} дней после первой генерации.`}
      </p>
    );
  }

  return (
    <p className="mb-4 text-sm text-gray-600">
      Бесплатные генерации {word} закончились.{' '}
      {renewsAt ? `Новые появятся ${renewsAt}.` : `Они вернутся через ${windowDays} дней.`}{' '}
      Оплата логотипа или брендбука возвращает их сразу.
    </p>
  );
}
