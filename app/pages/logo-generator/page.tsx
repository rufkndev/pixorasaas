"use client";

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import LogoImage from '../../components/LogoImage';
import Navbar from '../../components/layout/Navbar';
import Footer from '../../components/layout/Footer';
import { useAuth } from '../../context/AuthContext';
import React from 'react';

// Компонент страницы генерации логотипа
function LogoGeneratorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: isAuthLoading } = useAuth();
  
  // Получаем название и ключевые слова из URL параметров
  const name = searchParams.get('name') || '';
  const keywords = searchParams.get('keywords') || '';
  const industry = searchParams.get('industry') || '';
  const style = searchParams.get('style') || '';
  
  // Состояние для отслеживания генерации логотипа
  const [isGenerating, setIsGenerating] = useState(false);
  const [logoUrl, setLogoUrl] = useState('');
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  // Предотвращаем гидратацию, устанавливая mounted только после первого рендера
  useEffect(() => {
    setMounted(true);
    
    // Перенаправление на главную, если нет названия или ключевых слов
    if (mounted && (!name || !keywords)) {
      router.push('/');
    }
  }, [mounted, name, keywords]);

  // Функция для генерации логотипа
  const generateLogo = async () => {
    
    setIsGenerating(true);
    setError('');
    
    try {
      // Вызов API для генерации логотипа
      const apiUrl = `/api/generate-logo`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          keywords,
          userId: user?.id,
          industry,
          selectedName: name
        }),
      });
      
      const data = await response.json();
      
      // Устанавливаем URL сгенерированного логотипа
      setLogoUrl(data.logoUrl);
      
    } catch (err: any) {
      setError(`Произошла ошибка при генерации логотипа: ${err.message || 'Неизвестная ошибка'}. Пожалуйста, попробуйте еще раз.`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Кнопка для повторной генерации логотипа
  const regenerateLogo = async () => {
    // Сбрасываем URL логотипа перед повторной генерацией
    setLogoUrl('');
    // Запускаем процесс генерации
    await generateLogo();
  };

  // Компонент скелетона для состояния загрузки
  const LoadingSkeleton = () => (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
      <div className="h-8 w-3/4 mx-auto bg-gray-200 animate-pulse rounded-md mb-6"></div>
      <div className="space-y-4">
        <div className="h-10 w-full bg-gray-200 animate-pulse rounded-md"></div>
        <div className="h-80 w-full bg-gray-200 animate-pulse rounded-md mb-6"></div>
        <div className="h-12 w-full bg-gray-200 animate-pulse rounded-md"></div>
      </div>
    </div>
  );

  return (
    <>
      <Navbar />
      <main className="pt-16">
        <section className="py-12 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
                Ваш логотип
              </h1>
              <p className="mt-4 text-lg text-gray-700">
                Логотип будет создан на основе названия и ключевых слов вашего бизнеса
              </p>
            </div>

            <div className="mt-12 max-w-3xl mx-auto">
              {!mounted || isAuthLoading ? (
                <LoadingSkeleton />
              ) : error ? (
                <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                  <div className="p-4 bg-red-50 text-red-700 rounded-md border border-red-200 mb-4">
                    {error}
                  </div>
                  <Link
                    href="/"
                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                  >
                    Вернуться на главную страницу
                  </Link>
                </div>
              ) : (
                <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                  {/* Информация о бизнесе */}
                  <div className="mb-8">
                    <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                      <h2 className="text-xl font-bold text-gray-900 mb-2">Информация о бизнесе</h2>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm font-medium text-gray-500">Название</p>
                          <p className="text-lg font-medium text-gray-900">{name}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Ключевые слова</p>
                          <p className="text-lg font-medium text-gray-900">{keywords}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Ниша бизнеса</p>
                          <p className="text-lg font-medium text-gray-900">{industry}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Превью логотипа */}
                  <div className="mb-8">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-xl font-bold text-gray-900">Ваш логотип</h2>
                      {logoUrl && (
                        <button
                          onClick={regenerateLogo}
                          className="py-2 px-4 flex items-center border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Сгенерировать заново
                        </button>
                      )}
                    </div>
                    
                    {isGenerating ? (
                      <div className="bg-gray-100 rounded-md flex items-center justify-center h-96">
                        <div className="flex flex-col items-center">
                          <svg className="animate-spin h-10 w-10 text-gray-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <p className="text-gray-700">Генерация логотипа...</p>
                        </div>
                      </div>
                    ) : logoUrl ? (
                      <div className="relative bg-gray-100 rounded-md h-96 flex items-center justify-center overflow-hidden">
                        <LogoImage
                          src={logoUrl}
                          alt={`Логотип ${name}`}
                          width={400}
                          height={400}
                          className="max-h-full max-w-full object-contain"
                          showWatermark={true}
                        />
                      </div>
                    ) : (
                      <div className="bg-gray-100 rounded-md flex items-center justify-center h-96">
                        <button
                          onClick={generateLogo}
                          className="py-3 px-6 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                        >
                          Сгенерировать логотип
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {/* Выбор пакета услуг */}
                  {logoUrl && (
                    <div className="space-y-6">
                      <h2 className="text-xl font-bold text-gray-900 mb-2">Выберите пакет услуг</h2>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Пакет "Только логотип" */}
                        <div className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow bg-white">
                          <h3 className="text-lg font-bold mb-2">Только логотип</h3>
                          <p className="text-gray-700 mb-4">Получите высококачественный логотип для вашего бизнеса</p>
                          <ul className="space-y-2 mb-6">
                            <li className="flex items-start">
                              <svg className="h-5 w-5 text-green-500 flex-shrink-0 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              <span className="text-gray-700">Высокое разрешение (SVG, PNG)</span>
                            </li>
                            <li className="flex items-start">
                              <svg className="h-5 w-5 text-green-500 flex-shrink-0 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              <span className="text-gray-700">Полные права на использование</span>
                            </li>
                          </ul>
                          <div className="text-center">
                            <p className="text-2xl font-bold mb-4">499 ₽</p>
                            <Link
                              href={{
                                pathname: '/pages/payment',
                                query: { 
                                  product: 'logo', 
                                  name: name,
                                  keywords: keywords,
                                  logoUrl: logoUrl
                                },
                              }}
                              className="block w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                            >
                              Оплатить
                            </Link>
                          </div>
                        </div>
                        
                        {/* Пакет "Полный брендбук" */}
                        <div className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow bg-white relative">
                          <div className="absolute top-0 right-0 bg-gray-900 text-white px-2 py-1 text-xs font-medium rounded-bl-lg">
                            Популярный выбор
                          </div>
                          <h3 className="text-lg font-bold mb-2">Полный брендбук</h3>
                          <p className="text-gray-700 mb-4">Комплексное решение для вашего бренда</p>
                          <ul className="space-y-2 mb-6">
                            <li className="flex items-start">
                              <svg className="h-5 w-5 text-green-500 flex-shrink-0 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              <span className="text-gray-700">Логотип в высоком разрешении</span>
                            </li>
                            <li className="flex items-start">
                              <svg className="h-5 w-5 text-green-500 flex-shrink-0 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              <span className="text-gray-700">Фирменные цвета и шрифты</span>
                            </li>
                            <li className="flex items-start">
                              <svg className="h-5 w-5 text-green-500 flex-shrink-0 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              <span className="text-gray-700">Примеры применения бренда</span>
                            </li>
                          </ul>
                          <div className="text-center">
                           <p className="text-2xl font-bold mb-4">999 ₽</p>
                            <div className="flex flex-col space-y-2">
                              <Link
                                href={{
                                  pathname: '/pages/brandbook-generator',
                                  query: {
                                    name: name,
                                    keywords: keywords,
                                    logoUrl: logoUrl,
                                    industry: industry,
                                    style: style,
                                    slogan: '', 
                                    isDemo: 'true'
                                  },
                                }}
                                className="block w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 focus:outline-none"
                              >
                                Предпросмотр брендбука
                              </Link>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Описание содержимого брендбука */}
                      <div className="mt-8 border border-gray-200 rounded-lg p-6 bg-white">
                        <h3 className="text-lg font-bold mb-4">Что входит в полный брендбук?</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Левая колонка */}
                          <div className="space-y-5">
                            {/* Логотип и название */}
                            <div>
                              <h4 className="text-md font-semibold mb-2 flex items-center">
                                <svg className="w-5 h-5 mr-2 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                Варианты логотипа
                              </h4>
                              <ul className="pl-7 space-y-1 text-sm text-gray-700">
                                <li>Основная версия логотипа</li>
                                <li>Монохромная версия (черно-белая)</li>
                                <li>Инвертированная версия</li>
                                <li>Упрощенная версия</li>
                                <li>Логотип с названием</li>
                              </ul>
                            </div>
                            
                            {/* Слоган */}
                            <div>
                              <h4 className="text-md font-semibold mb-2 flex items-center">
                                <svg className="w-5 h-5 mr-2 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                </svg>
                                Уникальный слоган
                              </h4>
                              <p className="pl-7 text-sm text-gray-700">
                                Генерация слогана с помощью искусственного интеллекта, который отражает ценности вашего бренда и запоминается клиентам.
                              </p>
                            </div>
                            
                            {/* Фирменные элементы и иконки */}
                            <div>
                              <h4 className="text-md font-semibold mb-2 flex items-center">
                                <svg className="w-5 h-5 mr-2 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                </svg>
                                Фирменные элементы и иконки
                              </h4>
                              <p className="pl-7 text-sm text-gray-700">
                                Набор дополнительных графических элементов и иконок в фирменном стиле для использования в маркетинговых материалах и веб-дизайне.
                              </p>
                            </div>
                          </div>
                          
                          {/* Правая колонка */}
                          <div className="space-y-5">
                            {/* Шрифты */}
                            <div>
                              <h4 className="text-md font-semibold mb-2 flex items-center">
                                <svg className="w-5 h-5 mr-2 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                                </svg>
                                Фирменные шрифты
                              </h4>
                              <p className="pl-7 text-sm text-gray-700">
                                Подбор идеальных шрифтов для вашего бренда с помощью ИИ, которые сочетаются с логотипом и передают характер бизнеса.
                              </p>
                            </div>
                            
                            {/* Цветовая палитра */}
                            <div>
                              <h4 className="text-md font-semibold mb-2 flex items-center">
                                <svg className="w-5 h-5 mr-2 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                                </svg>
                                Цветовая палитра
                              </h4>
                              <p className="pl-7 text-sm text-gray-700">
                                Разработка гармоничной цветовой палитры, основанной на логотипе и названии, с основными и дополнительными цветами в различных форматах (HEX, RGB, CMYK).
                              </p>
                            </div>
                            
                            {/* Руководство по использованию */}
                            <div>
                              <h4 className="text-md font-semibold mb-2 flex items-center">
                                <svg className="w-5 h-5 mr-2 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                                Руководство по использованию
                              </h4>
                              <p className="pl-7 text-sm text-gray-700">
                                Подробные инструкции по правильному использованию всех элементов бренда для поддержания единого стиля во всех материалах.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="text-center mt-6">
                        <button
                          onClick={() => router.push('/')}
                          className="text-gray-600 hover:text-gray-900 font-medium"
                        >
                          Вернуться на главную страницу
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

export default function LogoGeneratorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Загрузка генератора логотипа...</h2>
          <p className="text-gray-600">Пожалуйста, подождите</p>
        </div>
      </div>
    }>
      <LogoGeneratorContent />
    </Suspense>
  );
}