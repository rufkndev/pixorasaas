"use client";

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '../../../components/layout/Navbar';
import Footer from '../../../components/layout/Footer';
import { useAuth } from '../../../context/AuthContext';
import React from 'react';

function PaymentSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: isAuthLoading } = useAuth();
  
  const [paymentStatus, setPaymentStatus] = useState<'loading' | 'success' | 'failed' | 'processing'>('loading');
  const [paymentInfo, setPaymentInfo] = useState<any>(null);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  // Получаем параметры из URL
  const product = searchParams.get('product') || '';
  const userId = searchParams.get('userId') || '';
  const paymentId = searchParams.get('payment_id') || '';

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || isAuthLoading) return;

    // Проверяем авторизацию
    if (!user || user.id !== userId) {
      router.push('/');
      return;
    }

    // Проверяем наличие необходимых параметров
    if (!product || !userId) {
      setError('Отсутствуют необходимые параметры');
      setPaymentStatus('failed');
      return;
    }

    // Если есть payment_id, проверяем статус платежа
    if (paymentId) {
      checkPaymentStatus(paymentId);
    } else {
      // Если payment_id нет, возможно платеж еще обрабатывается
      setPaymentStatus('processing');
      // Можно добавить периодическую проверку статуса
      setTimeout(() => {
        // Перенаправляем в дашборд через некоторое время
        if (product === 'logo') {
          router.push('/pages/dashboard');
        } else if (product === 'brandbook') {
          router.push('/pages/dashboard');
        }
      }, 3000);
    }
  }, [mounted, isAuthLoading, user, userId, product, paymentId]);

  const checkPaymentStatus = async (paymentId: string) => {
    try {
      const response = await fetch(`/api/yookassa/payment/${paymentId}?userId=${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Ошибка при проверке статуса платежа');
      }

      setPaymentInfo(result.payment);

      if (result.payment.status === 'succeeded' && result.payment.paid) {
        setPaymentStatus('success');
        
        // Через несколько секунд перенаправляем пользователя
        setTimeout(() => {
          if (product === 'logo') {
            router.push('/pages/dashboard');
          } else if (product === 'brandbook') {
            router.push('/pages/dashboard');
          }
        }, 3000);
      } else if (result.payment.status === 'canceled') {
        setPaymentStatus('failed');
        setError('Платеж был отменен');
      } else {
        setPaymentStatus('processing');
        // Повторно проверяем статус через некоторое время
        setTimeout(() => checkPaymentStatus(paymentId), 5000);
      }

    } catch (err: any) {
      console.error('Error checking payment status:', err);
      setError(err.message || 'Ошибка при проверке статуса платежа');
      setPaymentStatus('failed');
    }
  };

  if (!mounted || isAuthLoading) {
    return (
      <>
        <Navbar />
        <main className="pt-16">
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const getStatusContent = () => {
    switch (paymentStatus) {
      case 'loading':
        return (
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Проверяем статус платежа</h2>
            <p className="text-gray-600">Пожалуйста, подождите...</p>
          </div>
        );

      case 'processing':
        return (
          <div className="text-center">
            <div className="animate-pulse">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Платеж обрабатывается</h2>
            <p className="text-gray-600 mb-4">Ваш платеж обрабатывается. Это может занять несколько минут.</p>
            <p className="text-sm text-gray-500">
              Вы будете автоматически перенаправлены после обработки платежа
            </p>
          </div>
        );

      case 'success':
        return (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Оплата прошла успешно!</h2>
            <p className="text-gray-600 mb-4">
              Спасибо за покупку! Ваш {product === 'logo' ? 'логотип' : 'брендбук'} готовится.
            </p>
            {paymentInfo && (
              <div className="bg-gray-50 rounded-lg p-4 mb-4 max-w-md mx-auto">
                <p className="text-sm text-gray-600 mb-1">Сумма платежа:</p>
                <p className="font-semibold text-lg">{paymentInfo.amount.value} {paymentInfo.amount.currency}</p>
                <p className="text-xs text-gray-500 mt-2">ID платежа: {paymentInfo.id}</p>
              </div>
            )}
            <p className="text-sm text-gray-500 mb-4">
              Вы будете автоматически перенаправлены в личный кабинет через несколько секунд
            </p>
            <Link 
              href="/pages/dashboard" 
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              Перейти в личный кабинет
            </Link>
          </div>
        );

      case 'failed':
        return (
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Ошибка оплаты</h2>
            <p className="text-gray-600 mb-4">
              {error || 'Произошла ошибка при обработке платежа'}
            </p>
            <div className="space-y-3">
              <Link 
                href={`/pages/payment?product=${product}&name=${searchParams.get('name') || ''}&keywords=${searchParams.get('keywords') || ''}&logoUrl=${searchParams.get('logoUrl') || ''}&slogan=${searchParams.get('slogan') || ''}&industry=${searchParams.get('industry') || ''}&brandStyle=${searchParams.get('brandStyle') || ''}`}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 mr-3"
              >
                Повторить оплату
              </Link>
              <Link 
                href="/" 
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                На главную
              </Link>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <Navbar />
      <main className="pt-16">
        <section className="py-12 bg-gray-50 min-h-screen">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white rounded-lg shadow-md p-8">
              {getStatusContent()}
            </div>
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