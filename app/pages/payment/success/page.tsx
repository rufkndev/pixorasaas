"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '../../../components/layout/Navbar';
import Footer from '../../../components/layout/Footer';
import { useRequireAuth } from '../../../hooks/useRequireAuth';
import { apiFetch } from '../../../lib/authClient';
import BuildProgress, { BuildProgressData } from '../../../components/common/BuildProgress';
import React from 'react';

interface OrderState {
  orderId: string;
  productType: 'logo' | 'brandbook';
  logoId?: number | null;
  status: string;
  deliveryStatus: 'pending' | 'processing' | 'completed' | 'failed';
  amount: number;
  currency: string;
  redirectUrl: string;
  // Есть только у брендбука и только пока идёт сборка
  build?: BuildProgressData | null;
}

const POLL_INTERVAL_MS = 3000;
// Брендбук собирается минутами. Дальше этого срока показываем «пишите в поддержку»,
// но заказ при этом не теряется: выдачу дожмёт уведомление ЮKassa.
const POLL_TIMEOUT_MS = 8 * 60 * 1000;

function PaymentSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: isAuthLoading } = useRequireAuth();

  // Номер заказа выдал сервер и подставил в return_url. Кроме него на этой
  // странице ничего не нужно: остальное известно по заказу.
  const orderId = searchParams.get('orderId') || '';

  const [order, setOrder] = useState<OrderState | null>(null);
  const [error, setError] = useState('');
  const [timedOut, setTimedOut] = useState(false);
  const startedAt = useRef(Date.now());

  // Скачивание идёт через API: там проверка оплаты и чистые файлы
  const downloadLogo = async (logoId: number) => {
    try {
      const response = await apiFetch(`/api/download-logo/${logoId}?format=zip`);
      if (!response.ok) throw new Error('Не удалось скачать файл');

      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(await response.blob());
      link.download = 'logo.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(link.href);
    } catch (error) {
      console.error('Ошибка при скачивании логотипа:', error);
    }
  };

  const isDone = order?.status === 'succeeded' && order.deliveryStatus === 'completed';
  const isCanceled = order?.status === 'canceled';

  const poll = useCallback(async () => {
    const response = await apiFetch(`/api/yookassa/payment/${orderId}`);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Не удалось проверить статус платежа');
    }

    setOrder(result.payment);
    return result.payment as OrderState;
  }, [orderId]);

  useEffect(() => {
    if (isAuthLoading || !user) return;

    if (!orderId) {
      setError('В ссылке нет номера заказа');
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const tick = async () => {
      try {
        const state = await poll();

        if (cancelled) return;

        if (state.status === 'canceled') return;

        if (state.status === 'succeeded' && state.deliveryStatus === 'completed') {
          setTimeout(() => router.push(state.redirectUrl), 2000);
          return;
        }

        if (Date.now() - startedAt.current > POLL_TIMEOUT_MS) {
          setTimedOut(true);
          return;
        }

        timer = setTimeout(tick, POLL_INTERVAL_MS);
      } catch (err: any) {
        if (cancelled) return;
        setError(err.message);
      }
    };

    tick();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isAuthLoading, user, orderId, poll, router]);

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  const content = () => {
    if (error || isCanceled) {
      return (
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {isCanceled ? 'Платёж не прошёл' : 'Не удалось проверить платёж'}
          </h2>
          <p className="text-gray-600 mb-6">
            {isCanceled
              ? 'Оплата была отменена. Деньги не списаны — можно попробовать ещё раз.'
              : error}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/pages/dashboard"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gray-900 hover:bg-gray-800"
            >
              В личный кабинет
            </Link>
            <Link
              href="/pages/contact"
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Написать в поддержку
            </Link>
          </div>
        </div>
      );
    }

    if (isDone) {
      const isBrandbook = order?.productType === 'brandbook';

      return (
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Готово!</h2>
          <p className="text-gray-600 mb-4">
            {isBrandbook ? 'Брендбук собран' : 'Логотип доступен без водяного знака'}. Чек отправлен
            на почту.
          </p>
          {order && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6 max-w-sm mx-auto text-left">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Сумма</span>
                <span className="font-semibold">
                  {order.amount.toLocaleString('ru-RU')} {order.currency === 'RUB' ? '₽' : order.currency}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-2 break-all">Заказ: {order.orderId}</p>
            </div>
          )}
          <div className="flex flex-col items-center gap-3">
            {!isBrandbook && order?.logoId && (
              <>
                <button
                  onClick={() => downloadLogo(order.logoId as number)}
                  className="inline-flex items-center px-5 py-3 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                >
                  Скачать логотип (SVG, PNG и исходник)
                </button>
                <p className="text-xs text-gray-500 max-w-sm">
                  В архиве вектор для печати, PNG с прозрачным фоном, JPG на белом и кадр
                  в том виде, в каком его сгенерировала нейросеть.
                </p>
              </>
            )}
            <Link
              href={order?.redirectUrl || '/pages/dashboard'}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gray-900 hover:bg-gray-800"
            >
              {isBrandbook ? 'Открыть брендбук' : 'Перейти в личный кабинет'}
            </Link>
          </div>
        </div>
      );
    }

    if (timedOut) {
      return (
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Заказ ещё готовится</h2>
          <p className="text-gray-600 mb-6">
            Оплата прошла, но сборка затянулась. Заказ не потерян — он появится в личном кабинете.
            Если через полчаса его там не будет, напишите нам, номер заказа: {orderId}
          </p>
          <Link
            href="/pages/dashboard"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gray-900 hover:bg-gray-800"
          >
            В личный кабинет
          </Link>
        </div>
      );
    }

    const paid = order?.status === 'succeeded';

    // У брендбука шаги известны поимённо, поэтому вместо одной строки
    // показываем реальный ход сборки
    if (paid && order?.build) {
      return <BuildProgress build={order.build} />;
    }

    return (
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gray-900 mx-auto mb-6"></div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {paid ? 'Готовим ваш заказ' : 'Проверяем платёж'}
        </h2>
        <p className="text-gray-600">
          {paid
            ? order?.productType === 'brandbook'
              ? 'Собираем брендбук. Это занимает пару минут — не закрывайте страницу.'
              : 'Снимаем водяной знак с логотипа, ещё несколько секунд.'
            : 'ЮKassa подтверждает оплату. Обычно это занимает несколько секунд.'}
        </p>
      </div>
    );
  };

  return (
    <>
      <Navbar />
      <main className="pt-16">
        <section className="py-12 bg-gray-50 min-h-screen">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white rounded-lg shadow-md p-8">{content()}</div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Загрузка...</h2>
          <p className="text-gray-600">Проверяем статус вашего платежа</p>
        </div>
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  );
}
