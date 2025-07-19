"use client";

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Navbar from '../../components/layout/Navbar';
import Footer from '../../components/layout/Footer';
import { useAuth } from '../../context/AuthContext';

function PaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: isAuthLoading } = useAuth();
  
  // Получаем данные из URL параметров
  const product = searchParams.get('product') || '';
  const name = searchParams.get('name') || '';
  const keywords = searchParams.get('keywords') || '';
  const logoUrl = searchParams.get('logoUrl') || '';
  const slogan = searchParams.get('slogan') || '';
  const industry = searchParams.get('industry') || '';
  const brandStyle = searchParams.get('brandStyle') || '';
  
  // Состояние для формы оплаты
  const [isProcessing, setIsProcessing] = useState(false);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState('');

  // Предотвращаем гидратацию
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
    if (mounted && product === 'brandbook' && (!name || !keywords || !logoUrl || !industry || !brandStyle)) {
      router.push('/');
    }
    
    // Проверка специфичных параметров для логотипа
    if (mounted && product === 'logo' && (!name || !keywords)) {
      router.push('/');
    }
  }, [mounted, product, name, keywords, logoUrl, industry, brandStyle, user]);

  // Информация о продуктах
  const productInfo = {
    logo: {
      title: 'Логотип без вотермарки',
      price: 499,
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
      price: 999,
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

  // Обработка оплаты
  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!acceptTerms) {
      setError('Необходимо согласиться с условиями использования');
      return;
    }
    
    setIsProcessing(true);
    setError('');
    
    try {
      // Здесь будет интеграция с системой оплаты (например, Stripe, YooKassa)
      // Пока делаем имитацию
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Генерируем уникальный ID заказа
      const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      if (product === 'logo') {
        // Обработка оплаты логотипа
        const apiUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/purchase-logo`;
        
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            orderId,
            name,
            keywords,
            logoUrl,
            userId: user.id,
            paymentMethod,
            email,
            phone,
          }),
        });
        
        const responseData = await response.json();
        
        if (!response.ok) {
          throw new Error(responseData.error || 'Ошибка при обработке оплаты логотипа');
        }
        
        // Перенаправляем в дашборд
        router.push('/pages/dashboard');
        
      } else if (product === 'brandbook') {
        // Обработка оплаты брендбука 
        const apiUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/create-full-brandbook`;
        
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            orderId,
            name,
            keywords,
            logoUrl,
            slogan,
            userId: user.id,
            industry,
            brandStyle,
          }),
        });
        
        const responseData = await response.json();
        
        if (!response.ok) {
          throw new Error(responseData.error || 'Ошибка при создании брендбука');
        }
        
        // Перенаправляем на страницу с готовым брендбуком
        router.push(`/pages/brandbook?orderId=${orderId}&userId=${user.id}&product=${product}`);
      }
      
    } catch (err: any) {
      console.error('Payment error:', err);
      setError(`Ошибка при обработке платежа: ${err.message || 'Неизвестная ошибка'}`);
    } finally {
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
                    <h2 className="text-xl font-bold text-gray-900 mb-6">Способ оплаты</h2>
                    
                    <form onSubmit={handlePayment} className="space-y-6">
                      {/* Контактная информация */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-medium text-gray-900">Контактная информация</h3>
                        
                        <div>
                          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                            Email для отправки {product === 'logo' ? 'логотипа' : 'брендбука'}
                          </label>
                          <input
                            type="email"
                            id="email"
                            value={email}
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
                            onChange={(e) => setPhone(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500"
                            placeholder="+7 (999) 999-99-99"
                          />
                        </div>
                      </div>

                      {/* Способы оплаты */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-medium text-gray-900">Способ оплаты</h3>
                        
                        <div className="space-y-3">
                          <div className="flex items-center">
                            <input
                              id="card"
                              type="radio"
                              value="card"
                              checked={paymentMethod === 'card'}
                              onChange={(e) => setPaymentMethod(e.target.value)}
                              className="h-4 w-4 text-gray-600 focus:ring-gray-500 border-gray-300"
                            />
                            <label htmlFor="card" className="ml-3 block text-sm font-medium text-gray-700">
                              Банковская карта
                            </label>
                          </div>
                          
                          <div className="flex items-center">
                            <input
                              id="yookassa"
                              type="radio"
                              value="yookassa"
                              checked={paymentMethod === 'yookassa'}
                              onChange={(e) => setPaymentMethod(e.target.value)}
                              className="h-4 w-4 text-gray-600 focus:ring-gray-500 border-gray-300"
                            />
                            <label htmlFor="yookassa" className="ml-3 block text-sm font-medium text-gray-700">
                              ЮKassa (СБП, Qiwi, WebMoney)
                            </label>
                          </div>
                        </div>
                      </div>

                      {/* Согласие с условиями */}
                      <div className="flex items-center">
                        <input
                          id="terms"
                          type="checkbox"
                          checked={acceptTerms}
                          onChange={(e) => setAcceptTerms(e.target.checked)}
                          className="h-4 w-4 text-gray-600 focus:ring-gray-500 border-gray-300 rounded"
                        />
                        <label htmlFor="terms" className="ml-2 block text-sm text-gray-700">
                          Я согласен с{' '}
                          <Link href="/pages/terms" className="text-blue-600 hover:text-blue-800">
                            условиями использования
                          </Link>
                          {' '}и{' '}
                          <Link href="/pages/privacy" className="text-blue-600 hover:text-blue-800">
                            политикой конфиденциальности
                          </Link>
                        </label>
                      </div>

                      {/* Ошибка */}
                      {error && (
                        <div className="p-4 bg-red-50 text-red-700 rounded-md border border-red-200">
                          {error}
                        </div>
                      )}

                      {/* Кнопка оплаты */}
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