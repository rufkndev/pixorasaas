"use client";

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Navbar from '../../components/layout/Navbar';
import Footer from '../../components/layout/Footer';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import { apiFetch } from '../../lib/authClient';
import { describeGenerationError } from '../../lib/generationErrors';
import { PRICES } from '../../lib/legal';
import GenerationQuota, { QuotaLimits } from '../../components/common/GenerationQuota';
import React from 'react';

// Сверено с полосами PDF и содержимым архива: обещать можно только то,
// что сборка действительно отдаёт покупателю
const BRANDBOOK_CONTENTS: Array<[string, string]> = [
  ['Логотип в 7 версиях', 'Основная, горизонтальная, вертикальная, только знак, чёрная, белая и в фирменном цвете — SVG и PNG'],
  ['Палитра от вашего логотипа', '6 цветов с HEX, RGB и CMYK и проверенным контрастом текста'],
  ['Пара шрифтов с кириллицей', 'Файлы в архиве, лицензия разрешает коммерческое использование'],
  ['Иконки и паттерны', '12 иконок в одном стиле, паттерны и подложки в фирменных цветах'],
  ['Готовые макеты', 'Визитка для типографии, пост и сторис, обложка ВКонтакте, слайд, подпись письма'],
  ['Правила и голос бренда', 'Слоган, характер, охранное поле, что делать нельзя и как писать тексты'],
];

// Компонент страницы генерации логотипа
function LogoGeneratorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Страница доступна только авторизованным: раньше сюда мог зайти любой
  // и отправить userId: undefined
  const { user, isLoading: isAuthLoading } = useRequireAuth();
  
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
  // null — остаток ещё не известен (не загружен или запрос не удался)
  const [remaining, setRemaining] = useState<number | null>(null);
  const [limits, setLimits] = useState<QuotaLimits | null>(null);
  // Прошлые варианты не выбрасываем: к ним можно вернуться, а их предметы
  // уходят в exclude, чтобы модель не предлагала то же самое
  const [history, setHistory] = useState<string[]>([]);
  const [shownSubjects, setShownSubjects] = useState<string[]>([]);
  // Оплата и предпросмотр принимают id логотипа, а не ссылку на картинку
  const [logoIds, setLogoIds] = useState<Record<string, number>>({});
  const logoId = logoIds[logoUrl];

  // Первый рендер должен совпасть с серверным, иначе React ругается на гидратацию
  useEffect(() => {
    setMounted(true);

    // Перенаправление на главную, если нет названия или ключевых слов
    if (mounted && (!name || !keywords)) {
      router.push('/');
    }
  }, [mounted, name, keywords]);

  useEffect(() => {
    if (!user) return;

    // Остаток — справочная информация, его недоступность не мешает генерации
    apiFetch('/api/generation-limits')
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data) {
          setRemaining(data.logos);
          setLimits(data);
        }
      })
      .catch(() => {});
  }, [user]);

  // Функция для генерации логотипа
  const generateLogo = async () => {
    
    setIsGenerating(true);
    setError('');
    
    try {
      // Вызов API для генерации логотипа
      const apiUrl = `/api/generate-logo`;
      
      const response = await apiFetch(apiUrl, {
        method: 'POST',
        body: JSON.stringify({
          name,
          keywords,
          industry,
          style,
          selectedName: name,
          // Сервер добавит к этому списку историю из базы
          exclude: shownSubjects.slice(-20),
        }),
      });

      const data = await response.json();

      if (typeof data.remaining === 'number') {
        setRemaining(data.remaining);
      }

      if (!response.ok) {
        const failure: any = new Error(data.error || data.message || 'Не удалось сгенерировать логотип');
        failure.code = data.code;
        throw failure;
      }

      // Устанавливаем URL сгенерированного логотипа
      setLogoUrl(data.logoUrl);

      if (typeof data.logoId === 'number') {
        setLogoIds((previous) => ({ ...previous, [data.logoUrl]: data.logoId }));
      }

      if (data.subject) {
        setShownSubjects((previous) => [...previous, data.subject]);
      }

    } catch (err: any) {
      // Про лимит сообщает блок с остатком: экран ошибки увёл бы со страницы
      if (err?.code === 'GENERATION_LIMIT') {
        setRemaining(0);
      } else {
        setError(describeGenerationError(err, 'Произошла ошибка при генерации логотипа'));
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // Кнопка для повторной генерации логотипа
  const regenerateLogo = async () => {
    // Прошлый вариант уходит в историю, а не в корзину: пользователь может
    // вернуться к нему, не тратя ещё одну генерацию
    if (logoUrl) {
      setHistory((previous) => (previous.includes(logoUrl) ? previous : [...previous, logoUrl]));
    }
    setLogoUrl('');
    await generateLogo();
  };

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
                    <GenerationQuota remaining={remaining} limits={limits} kind="logos" />

                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-xl font-bold text-gray-900">Ваш логотип</h2>
                      {logoUrl && (
                        <button
                          onClick={regenerateLogo}
                          disabled={remaining === 0}
                          className="py-2 px-4 flex items-center border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none disabled:opacity-50"
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
                      <>
                        {/* Фон именно белый: логотип прозрачный, и на сером
                            его собственный квадрат читался бы как рамка */}
                        <div className="relative bg-white border border-gray-200 rounded-md h-96 flex items-center justify-center overflow-hidden">
                          {/* Водяной знак вшит в файл на сервере: раньше он рисовался
                              поверх картинки на клиенте и снимался одним кликом */}
                          <Image
                            src={logoUrl}
                            alt={`Логотип ${name}`}
                            width={1024}
                            height={1024}
                            className="max-h-full max-w-full object-contain p-4"
                          />
                        </div>

                        {history.length > 0 && (
                          <div className="mt-4">
                            <p className="text-sm font-medium text-gray-500 mb-2">Предыдущие варианты</p>
                            <div className="flex flex-wrap gap-3">
                              {history.map((url) => (
                                <button
                                  key={url}
                                  onClick={() => setLogoUrl(url)}
                                  className="w-20 h-20 bg-white border border-gray-200 rounded-md hover:border-gray-900 flex items-center justify-center overflow-hidden"
                                  title="Вернуться к этому варианту"
                                >
                                  <Image
                                    src={url}
                                    alt="Предыдущий вариант логотипа"
                                    width={160}
                                    height={160}
                                    className="max-h-full max-w-full object-contain p-1"
                                  />
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="bg-gray-100 rounded-md flex items-center justify-center h-96">
                        <button
                          onClick={generateLogo}
                          disabled={remaining === 0}
                          className="py-3 px-6 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
                        >
                          Сгенерировать логотип
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {/* Выбор пакета услуг */}
                  {logoUrl && logoId && (
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
                            <p className="text-2xl font-bold mb-4">{PRICES.logo} ₽</p>
                            <Link
                              href={{
                                pathname: '/pages/payment',
                                query: { 
                                  product: 'logo', 
                                  name: name,
                                  keywords: keywords,
                                  logoUrl: logoUrl,
                                  logoId: logoId
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
                           <p className="text-2xl font-bold mb-4">{PRICES.brandbook} ₽</p>
                            <div className="flex flex-col space-y-2">
                              <Link
                                href={{
                                  pathname: '/pages/brandbook-generator',
                                  query: {
                                    name: name,
                                    keywords: keywords,
                                    logoUrl: logoUrl,
                                    logoId: logoId,
                                    industry: industry,
                                    style: style
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
                      
                      {/* Только то, что сборка действительно кладёт в архив */}
                      <div className="mt-8 border border-gray-200 rounded-lg p-6 bg-white">
                        <h3 className="text-lg font-bold">Что входит в полный брендбук</h3>
                        <p className="text-sm text-gray-600 mt-1 mb-5">
                          PDF на ~15 страниц и архив с исходниками. Готово через несколько минут после оплаты.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                          {BRANDBOOK_CONTENTS.map(([title, text]) => (
                            <div key={title} className="flex gap-3">
                              <svg className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              <div>
                                <p className="font-semibold text-gray-900">{title}</p>
                                <p className="text-sm text-gray-600">{text}</p>
                              </div>
                            </div>
                          ))}
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