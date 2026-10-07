"use client";

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Navbar from '../../components/layout/Navbar';
import Footer from '../../components/layout/Footer';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import { apiFetch } from '../../lib/authClient';
import { OfferConsentCheckbox } from '../../components/legal/ConsentCheckbox';
import { PRICES } from '../../lib/legal';
import React from 'react';

function PaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Оплата возможна только из аккаунта: заказ привязывается к пользователю
  // на сервере, а раньше сюда мог попасть кто угодно
  const { user, isLoading: isAuthLoading } = useRequireAuth();
  
  // Получаем данные из URL параметров
  const product = searchParams.get('product') || '';
  const name = searchParams.get('name') || '';
  const keywords = searchParams.get('keywords') || '';
  const logoUrl = searchParams.get('logoUrl') || '';
  const logoId = Number(searchParams.get('logoId') || 0);
  const industry = searchParams.get('industry') || '';
  const brandStyle = searchParams.get('brandStyle') || '';
  
  // Состояние для формы оплаты
  const [isProcessing, setIsProcessing] = useState(false);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState('');

  // Первый рендер должен совпасть с серверным, иначе React ругается на гидратацию
  useEffect(() => {
    setMounted(true);
    
    // Автозаполнение email если пользователь авторизован
    if (user?.email) {
      setEmail(user.email);
    }
    
    // Перенаправление на главную, если нет необходимых данных
    if (mounted && !product) {
      router.push('/');
    }
    
    // Проверка специфичных параметров для брендбука
    if (mounted && product === 'brandbook' && (!name || !keywords || !logoUrl || !logoId || !industry || !brandStyle)) {
      router.push('/');
    }
    
    // Логотип нужен и для логотипа: сервер сверяет, что он принадлежит покупателю
    if (mounted && product === 'logo' && (!name || !keywords || !logoUrl || !logoId)) {
      router.push('/');
    }
  }, [mounted, product, name, keywords, logoUrl, logoId, industry, brandStyle, user, router]);

  const productInfo = {
    logo: {
      title: 'Логотип без вотермарки',
      price: PRICES.logo,
      description: 'Высококачественный логотип в полном разрешении',
      features: [
        'Логотип без вотермарки',
        'Высокое разрешение (PNG, SVG)',
        'Полные права на использование',
        'Возможность использования в коммерческих целях'
      ]
    },
    brandbook: {
      title: 'Полный брендбук',
      price: PRICES.brandbook,
      description: 'Комплексное руководство по фирменному стилю',
      features: [
        'Логотип в 5 вариациях',
        'Полная цветовая палитра',
        'Фирменные шрифты',
        'Набор фирменных иконок и элементов дизайна',
        'Руководство по использованию',
        'Примеры применения на материалах'
      ]
    }
  };

  const currentProduct = productInfo[product as keyof typeof productInfo];

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!acceptTerms) {
      setError('Необходимо принять условия публичной оферты');
      return;
    }

    if (!email || !email.trim()) {
      setError('Email обязателен для формирования чека');
      return;
    }
    
    setIsProcessing(true);
    setError('');

    try {
      // Ни цену, ни номер заказа, ни адрес возврата клиент не задаёт —
      // всё это считает сервер, иначе их можно подменить
      const response = await apiFetch('/api/yookassa/create-payment', {
        method: 'POST',
        body: JSON.stringify({
          productType: product,
          // Название, ключевые слова и слоган сервер берёт из записи логотипа
          productData: {
            logoId,
            email,
            phone,
            ...(product === 'brandbook' && { industry, brandStyle }),
          },
          acceptOffer: true,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Ошибка при создании платежа');
      }

      // Умный платёж: способ оплаты пользователь выбирает на форме ЮKassa
      window.location.href = result.confirmationUrl;
    } catch (err: any) {
      console.error('Payment error:', err);
      setError(err.message || 'Не удалось перейти к оплате. Попробуйте ещё раз.');
      setIsProcessing(false);
    }
  };

  if (!mounted || isAuthLoading) {
    return (
      <>
        <Navbar />
        <main className="pt-16">
          <div className="min-h-screen flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (!currentProduct) {
    return (
      <>
        <Navbar />
        <main className="pt-16">
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Продукт не найден</h1>
              <Link href="/" className="text-blue-600 hover:text-blue-800">
                Вернуться на главную
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="pt-16">
        <section className="py-12 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
                Оформление заказа
              </h1>
              <p className="mt-4 text-lg text-gray-700">
                Осталось совсем немного до получения вашего брендбука
              </p>
            </div>

            <div className="max-w-6xl mx-auto">
              <div className="lg:grid lg:grid-cols-2 lg:gap-8">
                {/* Информация о заказе */}
                <div className="space-y-6">
                  <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Ваш заказ</h2>
                    
                    {/* Информация о бренде */}
                    <div className="border-b border-gray-200 pb-4 mb-4">
                      <div className="flex items-center space-x-4">
                        {logoUrl && (
                          <div className="flex-shrink-0">
                            <Image
                              src={logoUrl}
                              alt={`Логотип ${name}`}
                              width={64}
                              height={64}
                              className="rounded-lg object-contain"
                            />
                          </div>
                        )}
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{name}</h3>
                          <p className="text-sm text-gray-600">{keywords}</p>
                          {product === 'logo' && <p className="text-xs text-gray-500 mt-1">Логотип будет без вотермарки</p>}
                        </div>
                      </div>
                    </div>

                    {/* Информация о продукте */}
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-medium text-gray-900">
                          {currentProduct.title}
                        </span>
                        <span className="text-2xl font-bold text-gray-900">
                          {currentProduct.price.toLocaleString('ru-RU')} ₽
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-600">
                        {currentProduct.description}
                      </p>
                      
                      <div className="space-y-2">
                        <h4 className="font-medium text-gray-900">Что входит в заказ:</h4>
                        <ul className="text-sm text-gray-600 space-y-1">
                          {currentProduct.features.map((feature, index) => (
                            <li key={index} className="flex items-center">
                              <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Форма оплаты */}
                <div className="mt-8 lg:mt-0">
                  <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900 mb-6">Оформление оплаты</h2>
                    
                    <form onSubmit={handlePayment} className="space-y-6">
                      {/* Контактная информация */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-medium text-gray-900">Контактная информация</h3>
                        
                        <div>
                          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                            Email для отправки {product === 'logo' ? 'логотипа' : 'брендбука'} *
                            <span className="text-xs text-gray-500 block mt-1">
                              Обязательно для формирования чека (54-ФЗ)
                            </span>
                          </label>
                          <input
                            type="email"
                            id="email"
                            value={email}
                            maxLength={254}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500"
                            placeholder="your@email.com"
                          />
                        </div>
                        
                        <div>
                          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                            Телефон (опционально)
                          </label>
                          <input
                            type="tel"
                            id="phone"
                            value={phone}
                            maxLength={30}
                            onChange={(e) => setPhone(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500"
                            placeholder="+7 (999) 999-99-99"
                          />
                        </div>
                      </div>

                      {/* Способ оплаты выбирается на стороне ЮKassa: список
                          доступных методов знает она, а не мы */}
                      <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
                        <h3 className="text-sm font-medium text-gray-900">Как пройдёт оплата</h3>
                        <p className="mt-2 text-sm text-gray-600">
                          Мы перенаправим вас на защищённую страницу ЮKassa. Там можно заплатить
                          картой, через СБП, SberPay или другим доступным способом — данные карты
                          вводятся на стороне ЮKassa и к нам не попадают.
                        </p>
                      </div>

                      {/* Согласие с офертой: акцепт публичной оферты — момент
                          заключения договора, поэтому ссылка на неё обязательна */}
                      <OfferConsentCheckbox
                        id="terms"
                        checked={acceptTerms}
                        onChange={setAcceptTerms}
                        disabled={isProcessing}
                      />

                      {error && (
                        <div className="p-4 bg-red-50 text-red-700 rounded-md border border-red-200">
                          {error}
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={isProcessing || !acceptTerms}
                        className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isProcessing ? (
                          <div className="flex items-center">
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Обработка платежа...
                          </div>
                        ) : (
                          `Оплатить ${currentProduct.price.toLocaleString('ru-RU')} ₽`
                        )}
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

export default function PaymentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Загрузка страницы оплаты...</h2>
          <p className="text-gray-600">Пожалуйста, подождите</p>
        </div>
      </div>
    }>
      <PaymentContent />
    </Suspense>
  );
}
