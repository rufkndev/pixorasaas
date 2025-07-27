"use client";

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Navbar from '../../components/layout/Navbar';
import Footer from '../../components/layout/Footer';
import { useAuth } from '../../context/AuthContext';
import React from 'react';

// Компонент страницы генерации брендбука
function BrandbookGeneratorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: isAuthLoading } = useAuth();
  
  // Получаем данные из URL параметров
  const name = searchParams.get('name') || '';
  const keywords = searchParams.get('keywords') || '';
  const logoUrl = searchParams.get('logoUrl') || '';
  const industry = searchParams.get('industry') || '';
  const style = searchParams.get('style') || '';
  
  // Состояние для отслеживания генерации брендбука
  const [isGenerating, setIsGenerating] = useState(false);
  const [brandbook, setBrandbook] = useState<any>(null);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  // Предотвращаем гидратацию
  useEffect(() => {
    setMounted(true);
    
    // Перенаправление на главную, если нет необходимых данных
    if (mounted && (!name || !keywords || !logoUrl)) {
      router.push('/');
    }
  }, [mounted, name, keywords, logoUrl]);

  // Функция для генерации брендбука
  const generateBrandbook = async () => {
    if (!user) {
      setError('Необходимо войти в систему для генерации брендбука');
      return;
    }

    setIsGenerating(true);
    setError('');
    
    try {
      // Вызов API для генерации брендбука
      const apiUrl = `/api/generate-brandbook`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          keywords,
          logoUrl,
          userId: user.id,
          industry,
          brandStyle: style,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Ошибка при генерации брендбука');
      }
      
      // Устанавливаем сгенерированный брендбук
      setBrandbook(data.brandbook);
      
    } catch (err: any) {
      setError(`Произошла ошибка при генерации брендбука: ${err.message || 'Неизвестная ошибка'}. Пожалуйста, попробуйте еще раз.`);
    } finally {
      setIsGenerating(false);
    }
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
                Предпросмотр брендбука
              </h1>
              <p className="mt-4 text-lg text-gray-700">
                Полный брендбук для вашего бизнеса с фирменным стилем
              </p>
            </div>

            <div className="mt-12 max-w-6xl mx-auto">
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
                <div className="space-y-8">
                  {/* Информация о бизнесе */}
                  <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Информация о бренде</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
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

                  {/* Кнопка генерации */}
                  <div className="flex justify-center">
                    <button
                      onClick={generateBrandbook}
                      disabled={isGenerating}
                      className="py-3 px-8 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
                    >
                      {isGenerating ? 'Генерация...' : 'Сгенерировать демо-брендбук'}
                    </button>
                  </div>

                  {/* Основной логотип */}
                  <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Основной логотип</h2>
                    <div className="bg-gray-50 rounded-lg p-8 flex items-center justify-center min-h-[400px]">
                      <div className="relative">
                        <Image
                          src={logoUrl}
                          alt={`Логотип ${name}`}
                          width={400}
                          height={400}
                          className="max-h-80 max-w-full object-contain"
                        />
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="text-gray-400 text-xl font-bold opacity-50 rotate-[-30deg] select-none" style={{ fontSize: '5rem' }}>
                            Pixora
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Слоган */}
                  <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-xl font-bold text-gray-900">Фирменный слоган</h2>
                      {brandbook?.slogan && (
                        <button
                          onClick={generateBrandbook}
                          disabled={isGenerating}
                          className="py-2 px-4 flex items-center border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none disabled:opacity-50"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          {isGenerating ? 'Генерация...' : 'Сгенерировать заново'}
                        </button>
                      )}
                    </div>
                    <div className="bg-gray-50 rounded-lg p-6">
                      <div className="text-center">
                        {isGenerating ? (
                          <div className="flex flex-col items-center">
                            <svg className="animate-spin h-8 w-8 text-gray-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <p className="text-xl italic text-gray-600 mb-2">Генерация слогана...</p>
                            <p className="text-sm text-gray-500">
                              ИИ-маркетолог создает уникальный слоган для вашего бизнеса
                            </p>
                          </div>
                        ) : (
                          <div>
                            <p className="text-xl italic text-gray-700 mb-2">
                              {brandbook?.slogan || '"[Нажмите кнопку для генерации слогана]"'}
                            </p>
                            <p className="text-sm text-gray-500">
                              {brandbook?.slogan 
                                ? 'Уникальный слоган, созданный ИИ-маркетологом специально для вашего бизнеса'
                                : 'Уникальный слоган будет создан с помощью ИИ-маркетолога специально для вашего бизнеса'
                              }
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Вариации логотипа */}
                  <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-xl font-bold text-gray-900">Вариации логотипа</h2>
                      {brandbook?.logoVariants && brandbook.logoVariants.length > 0 && (
                        <button
                          onClick={generateBrandbook}
                          disabled={isGenerating}
                          className="py-2 px-4 flex items-center border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none disabled:opacity-50"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          {isGenerating ? 'Генерация...' : 'Сгенерировать заново'}
                        </button>
                      )}
                    </div>
                    
                    {isGenerating ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Скелетоны для состояния загрузки */}
                        {[1, 2, 3].map((index) => (
                          <div key={index} className="text-center">
                            <div className="bg-gray-100 border border-gray-300 rounded-lg p-6 h-32 flex items-center justify-center mb-2">
                              <div className="flex flex-col items-center">
                                <svg className="animate-spin h-6 w-6 text-gray-400 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <div className="text-gray-400 text-xs">Создание вариации...</div>
                              </div>
                            </div>
                            <div className="h-4 w-3/4 mx-auto bg-gray-200 animate-pulse rounded"></div>
                          </div>
                        ))}
                      </div>
                    ) : brandbook?.logoVariants && brandbook.logoVariants.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                        {brandbook.logoVariants.map((variant: any, index: number) => (
                          <div key={index} className="text-center">
                            <div className={`
                              ${variant.type === 'inverted' ? 'bg-gray-900' : 'bg-gray-50'} 
                              border border-gray-200 rounded-lg p-6 mb-3 min-h-32 flex items-center justify-center
                            `}>
                              <div className="relative">
                                <Image
                                  src={variant.url}
                                  alt={variant.name}
                                  width={120}
                                  height={120}
                                  className="max-h-24 max-w-full object-contain"
                                />
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                  <div className="text-gray-400 font-bold opacity-50 rotate-[-30deg] select-none" style={{ fontSize: '1.5rem' }}>
                                    Pixora
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <p className="text-sm font-medium text-gray-900">{variant.name}</p>
                              <p className="text-xs text-gray-600">{variant.description}</p>
                              <p className="text-xs text-gray-500 italic">{variant.usage}</p>
                            </div>
                          </div>
                        ))}
                        
                        {/* Дополнительные вариации доступные после оплаты */}
                        <div className="text-center">
                          <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-6 mb-3 min-h-32 flex items-center justify-center">
                            <div className="text-gray-400 text-xs flex flex-col items-center">
                              <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                              </svg>
                              <span>После оплаты</span>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-gray-500">Логотип с названием</p>
                            <p className="text-xs text-gray-400">Горизонтальная версия с названием компании</p>
                            <p className="text-xs text-gray-400 italic">Для фирменных бланков, презентаций, веб-сайта</p>
                          </div>
                        </div>
                        
                        <div className="text-center">
                          <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-6 mb-3 min-h-32 flex items-center justify-center">
                            <div className="text-gray-400 text-xs flex flex-col items-center">
                              <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                              </svg>
                              <span>После оплаты</span>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-gray-500">Логотип-аббревиатура</p>
                            <p className="text-xs text-gray-400">Упрощенная версия с инициалами</p>
                            <p className="text-xs text-gray-400 italic">Для фавиконок, мобильных приложений, соцсетей</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                        {[
                          { 
                            name: 'Монохромная версия', 
                            bg: 'bg-gray-100', 
                            border: 'border-gray-300',
                            description: 'Черно-белая версия для универсального использования',
                            usage: 'Идеально подходит для печати, факсов, документов'
                          },
                          { 
                            name: 'Инвертированная версия', 
                            bg: 'bg-gray-900', 
                            border: 'border-gray-700',
                            description: 'Версия для использования на темных фонах',
                            usage: 'Используется на темных фонах, в ночных режимах'
                          },
                          { 
                            name: 'Оригинальная версия', 
                            bg: 'bg-white', 
                            border: 'border-gray-200',
                            description: 'Основная цветная версия логотипа',
                            usage: 'Используется в основных материалах бренда'
                          },
                          { 
                            name: 'Логотип с названием', 
                            bg: 'bg-white', 
                            border: 'border-gray-200',
                            description: 'Горизонтальная версия с названием компании',
                            usage: 'Для фирменных бланков, презентаций, веб-сайта'
                          },
                          { 
                            name: 'Логотип-аббревиатура', 
                            bg: 'bg-white', 
                            border: 'border-gray-200',
                            description: 'Упрощенная версия с инициалами',
                            usage: 'Для фавиконок, мобильных приложений, соцсетей'
                          }
                        ].map((variant, index) => (
                          <div key={index} className="text-center">
                            <div className={`${variant.bg} ${variant.border} border rounded-lg p-6 h-32 flex items-center justify-center mb-3`}>
                              <div className="text-gray-400 text-xs flex flex-col items-center">
                                <svg className="w-8 h-8 mb-2" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                                </svg>
                                <span>Нажмите "Сгенерировать демо-брендбук"</span>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <p className="text-sm font-medium text-gray-700">{variant.name}</p>
                              <p className="text-xs text-gray-600">{variant.description}</p>
                              <p className="text-xs text-gray-500 italic">{variant.usage}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Цветовая палитра */}
                  <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Цветовая палитра</h2>
                    
                    <div className="space-y-4">
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
                        <p className="text-sm text-yellow-800 font-medium">
                          🎨 Полная цветовая палитра с точными кодами цветов будет доступна в полном брендбуке
                        </p>
                      </div>
                      
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">Основные цвета</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {[1, 2, 3, 4].map((color) => (
                            <div key={color} className="text-center">
                              <div className="w-full h-20 bg-gray-300 rounded-lg mb-2 flex items-center justify-center">
                                <span className="text-gray-500 text-xs">[Цвет {color}]</span>
                              </div>
                              <p className="text-sm font-medium text-gray-700">#FFFFFF</p>
                              <p className="text-xs text-gray-500">RGB(255, 255, 255)</p>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">Дополнительные цвета</h3>
                        <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                          {[1, 2, 3, 4, 5, 6].map((color) => (
                            <div key={color} className="text-center">
                              <div className="w-full h-16 bg-gray-200 rounded-lg mb-2 flex items-center justify-center">
                                <span className="text-gray-400 text-xs">[{color}]</span>
                              </div>
                              <p className="text-xs font-medium text-gray-600">#CCCCCC</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Фирменные шрифты */}
                  <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Фирменные шрифты</h2>
                    <div className="space-y-6">
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
                        <p className="text-sm text-yellow-800 font-medium">
                          📝 Точные названия шрифтов и ссылки для скачивания будут доступны в полном брендбуке
                        </p>
                      </div>
                      
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">Основные шрифты</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="border border-gray-200 rounded-lg p-4">
                            <h4 className="text-md font-semibold text-gray-700 mb-2">Основной шрифт №1 (Заголовки)</h4>
                            <div className="mb-3">
                              <p className="text-2xl font-bold text-gray-900">[Название шрифта]</p>
                              <p className="text-sm text-gray-500 mt-1">Семейство шрифтов</p>
                            </div>
                            <div className="text-gray-700">
                              <p className="text-xl font-bold">АБВГДабвгд 123</p>
                              <p className="text-lg font-semibold">АБВГДабвгд 123</p>
                              <p className="text-md font-medium">АБВГДабвгд 123</p>
                            </div>
                          </div>
                          
                          <div className="border border-gray-200 rounded-lg p-4">
                            <h4 className="text-md font-semibold text-gray-700 mb-2">Основной шрифт №2 (Заголовки)</h4>
                            <div className="mb-3">
                              <p className="text-2xl font-bold text-gray-900">[Название шрифта]</p>
                              <p className="text-sm text-gray-500 mt-1">Семейство шрифтов</p>
                            </div>
                            <div className="text-gray-700">
                              <p className="text-xl font-bold">АБВГДабвгд 123</p>
                              <p className="text-lg font-semibold">АБВГДабвгд 123</p>
                              <p className="text-md font-medium">АБВГДабвгд 123</p>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">Дополнительные шрифты</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="border border-gray-200 rounded-lg p-4">
                            <h4 className="text-md font-semibold text-gray-700 mb-2">Дополнительный шрифт №1 (Текст)</h4>
                            <div className="mb-3">
                              <p className="text-xl text-gray-900">[Название шрифта]</p>
                              <p className="text-sm text-gray-500 mt-1">Семейство шрифтов</p>
                            </div>
                            <div className="text-gray-700">
                              <p className="text-md">АБВГДабвгд 123 - Regular</p>
                              <p className="text-md font-medium">АБВГДабвгд 123 - Medium</p>
                              <p className="text-md font-bold">АБВГДабвгд 123 - Bold</p>
                            </div>
                          </div>
                          
                          <div className="border border-gray-200 rounded-lg p-4">
                            <h4 className="text-md font-semibold text-gray-700 mb-2">Дополнительный шрифт №2 (Текст)</h4>
                            <div className="mb-3">
                              <p className="text-xl text-gray-900">[Название шрифта]</p>
                              <p className="text-sm text-gray-500 mt-1">Семейство шрифтов</p>
                            </div>
                            <div className="text-gray-700">
                              <p className="text-md">АБВГДабвгд 123 - Regular</p>
                              <p className="text-md font-medium">АБВГДабвгд 123 - Medium</p>
                              <p className="text-md font-bold">АБВГДабвгд 123 - Bold</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Фирменные иконки и элементы */}
                  <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Фирменные иконки и элементы</h2>
                    
                    <div className="space-y-6">
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
                        <p className="text-sm text-yellow-800 font-medium">
                          🎯 Уникальные иконки и элементы, созданные под ваш бизнес, будут доступны в полном брендбуке
                        </p>
                      </div>
                      
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">Фирменные иконки</h3>
                        <div className="grid grid-cols-5 gap-4">
                          {[1, 2, 3, 4, 5].map((index) => (
                            <div key={index} className="text-center">
                              <div className="w-16 h-16 mx-auto bg-gray-200 rounded-lg flex items-center justify-center mb-2">
                                <span className="text-gray-400 text-xs">[ICON]</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">Фирменные элементы</h3>
                        <div className="grid grid-cols-5 gap-4">
                          {[
                            { name: 'Рамка', type: 'frame' },
                            { name: 'Паттерн', type: 'pattern' },
                            { name: 'Разделитель', type: 'divider' },
                            { name: 'Декор', type: 'decoration' },
                            { name: 'Фон', type: 'background' }
                          ].map((element, index) => (
                            <div key={index} className="text-center">
                              <div className="w-16 h-16 mx-auto bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center mb-2">
                                <span className="text-gray-400 text-xs">[{element.type.toUpperCase()}]</span>
                              </div>
                              <p className="text-xs text-gray-600">{element.name}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-500 mt-6">
                        Набор фирменных иконок и графических элементов в едином стиле для использования в маркетинговых материалах, 
                        презентациях и цифровых продуктах
                      </p>
                    </div>
                  </div>

                  {/* Руководство по стилю */}
                  <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Руководство по стилю</h2>
                    <div className="space-y-6">
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
                        <p className="text-sm text-yellow-800 font-medium">
                          📋 Подробное руководство с техническими требованиями и примерами использования брендинга будет доступно в полном брендбуке
                        </p>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="border border-gray-200 rounded-lg p-4">
                          <h3 className="text-lg font-semibold text-gray-800 mb-3">Правила использования логотипа</h3>
                          <ul className="space-y-2 text-sm text-gray-700">
                            <li>• Минимальный размер: 24px</li>
                            <li>• Защитная зона: 1x высота логотипа</li>
                            <li>• Не искажать пропорции</li>
                            <li>• Не менять цвета без разрешения</li>
                          </ul>
                        </div>
                        
                        <div className="border border-gray-200 rounded-lg p-4">
                          <h3 className="text-lg font-semibold text-gray-800 mb-3">Применение цветов</h3>
                          <ul className="space-y-2 text-sm text-gray-700">
                            <li>• Основные цвета для логотипа</li>
                            <li>• Дополнительные для акцентов</li>
                            <li>• Соотношение 60-30-10</li>
                            <li>• Контрастность не менее 4.5:1</li>
                          </ul>
                        </div>
                        
                        <div className="border border-gray-200 rounded-lg p-4">
                          <h3 className="text-lg font-semibold text-gray-800 mb-3">Типографика</h3>
                          <ul className="space-y-2 text-sm text-gray-700">
                            <li>• Заголовки: Основной шрифт</li>
                            <li>• Текст: Дополнительный шрифт</li>
                            <li>• Размеры: 16px минимум для текста</li>
                            <li>• Межстрочный интервал: 1.5</li>
                          </ul>
                        </div>
                        
                        <div className="border border-gray-200 rounded-lg p-4">
                          <h3 className="text-lg font-semibold text-gray-800 mb-3">Примеры применения</h3>
                          <ul className="space-y-2 text-sm text-gray-700">
                            <li>• Визитные карточки</li>
                            <li>• Фирменные бланки</li>
                            <li>• Веб-сайт и соцсети</li>
                            <li>• Рекламные материалы</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Действия */}
                  <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                    <div className="text-center space-y-4">
                      <h2 className="text-xl font-bold text-gray-900">Готовы получить полный брендбук?</h2>
                      <p className="text-gray-600">
                        Этот предпросмотр показывает структуру вашего будущего брендбука. 
                        Полная версия будет содержать все элементы в высоком качестве.
                      </p>
                      
                      <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link
                          href={{
                            pathname: '/pages/payment',
                            query: { 
                              product: 'brandbook', 
                              name: name,
                              keywords: keywords,
                              logoUrl: logoUrl,
                              slogan: brandbook?.slogan || '',
                              industry: industry,
                              brandStyle: style
                            },
                          }}
                          className="py-3 px-6 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                        >
                          Заказать полный брендбук - 999 ₽
                        </Link>
                        
                        <Link
                          href={{
                            pathname: '/logo-generator',
                            query: { 
                              name: name,
                              keywords: keywords
                            },
                          }}
                          className="py-3 px-6 border border-gray-300 rounded-md shadow-sm text-base font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                        >
                          Вернуться к логотипу
                        </Link>
                      </div>
                    </div>
                  </div>
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

export default function BrandbookGeneratorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Загрузка генератора брендбука...</h2>
          <p className="text-gray-600">Пожалуйста, подождите</p>
        </div>
      </div>
    }>
      <BrandbookGeneratorContent />
    </Suspense>
  );
}
