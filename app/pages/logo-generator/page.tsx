"use client";

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Navbar from '../../components/layout/Navbar';
import Footer from '../../components/layout/Footer';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import { apiFetch } from '../../lib/authClient';
import { describeGenerationError } from '../../lib/generationErrors';
import { PRICES } from '../../lib/legal';
import { trackEvent } from '../../lib/telemetry';
import React from 'react';

// Сверено с архивом download-logo и кнопками кабинета: обещать можно только то,
// что покупатель действительно скачает
const LOGO_FILES = [
  'Вектор SVG — для печати, вывесок и сайта, масштабируется без потери качества',
  'PNG 3072 px с прозрачным фоном',
  'JPG на белом фоне',
  'Исходный кадр нейросети',
  'Все файлы без водяного знака, одним архивом',
  'Полные права на использование',
];

// Идёт по полосам PDF в их порядке (layout/pages/index.ts). Меняется состав
// полос — правьте и этот список
const BRANDBOOK_PDF = [
  'Обложка и содержание',
  'О бренде: слоган, кому это нужно, характер и голос бренда с примерами «так — да / так — нет»',
  'Логотип в 7 версиях: основная, горизонтальная, вертикальная, только знак, чёрная, белая и в фирменном цвете',
  'Охранное поле и минимальный размер логотипа в печати',
  'Недопустимое использование логотипа — наглядно, на примерах',
  '6 фирменных цветов от вашего логотипа: HEX, RGB, CMYK и пропорции в макете',
  'Контраст и сочетания: какой текст читается на каждом цвете',
  'Пара шрифтов с кириллицей: размерная шкала и правила набора',
  'Набор текста: иерархия заголовков и примеры «так не надо»',
  '12 иконок в одном стиле, паттерны, разделители и подложки в фирменных цветах',
  'Носители: визитка для типографии, пост, сторис, обложка ВКонтакте, слайд презентации, подпись письма',
  'Выходные данные: шрифты, наборы иконок и их лицензии',
];

function CheckList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2 mb-6">
      {items.map((item) => (
        <li key={item} className="flex items-start">
          <svg className="h-5 w-5 text-green-500 flex-shrink-0 mr-2 mt-0.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-gray-700 text-sm">{item}</span>
        </li>
      ))}
    </ul>
  );
}

// Компонент страницы генерации логотипа
function LogoGeneratorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Страница доступна только авторизованным: раньше сюда мог зайти любой
  // и отправить userId: undefined
  const { isLoading: isAuthLoading } = useRequireAuth();
  
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
  // Счётчика на странице нет, поэтому про исчерпанную квоту говорим только в ответ
  // на попытку — и рядом с логотипом, а не экраном ошибки
  const [limitMessage, setLimitMessage] = useState('');
  // Прошлые варианты не выбрасываем: к ним можно вернуться, а их предметы
  // уходят в exclude, чтобы модель не предлагала то же самое
  const [history, setHistory] = useState<string[]>([]);
  const [shownSubjects, setShownSubjects] = useState<string[]>([]);
  // Оплата и предпросмотр принимают id логотипа, а не ссылку на картинку
  const [logoIds, setLogoIds] = useState<Record<string, number>>({});
  const logoId = logoIds[logoUrl];
  // Состояние обновится только на следующем рендере, и двойной клик успевал
  // отправить два запроса — это две оплаченные генерации в GenAPI
  const inFlight = useRef(false);

  // Первый рендер должен совпасть с серверным, иначе React ругается на гидратацию
  useEffect(() => {
    setMounted(true);

    // Без названия генерировать нечего — на лендинг, там форма с названием
    if (mounted && (!name || !keywords)) {
      router.replace('/logo-generator');
    }
  }, [mounted, name, keywords]);

  // Функция для генерации логотипа
  const generateLogo = async () => {
    if (inFlight.current) return;
    inFlight.current = true;

    if (shownSubjects.length > 0) trackEvent('logo_more_variants', { shown: shownSubjects.length });

    setIsGenerating(true);
    setError('');
    setLimitMessage('');
    
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

      // При обрыве прокси приходит текст «Internal Server Error», а не JSON
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const failure: any = new Error(data.error || data.message || 'Не удалось сгенерировать логотип');
        failure.code = data.code;
        throw failure;
      }

      // Прошлый вариант уходит в историю только сейчас: при отказе он остаётся на экране
      if (logoUrl) {
        setHistory((previous) => (previous.includes(logoUrl) ? previous : [...previous, logoUrl]));
      }
      setLogoUrl(data.logoUrl);

      if (typeof data.logoId === 'number') {
        setLogoIds((previous) => ({ ...previous, [data.logoUrl]: data.logoId }));
      }

      if (data.subject) {
        setShownSubjects((previous) => [...previous, data.subject]);
      }

    } catch (err: any) {
      // Экран ошибки спрятал бы уже сгенерированные варианты
      if (err?.code === 'GENERATION_LIMIT') {
        setLimitMessage(err.message);
      } else {
        setError(describeGenerationError(err, 'Произошла ошибка при генерации логотипа'));
      }
    } finally {
      inFlight.current = false;
      setIsGenerating(false);
    }
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
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-xl font-bold text-gray-900">Ваш логотип</h2>
                      {logoUrl && (
                        <button
                          onClick={generateLogo}
                          disabled={isGenerating}
                          className="py-2 px-4 flex items-center border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none disabled:opacity-50"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Сгенерировать заново
                        </button>
                      )}
                    </div>

                    {limitMessage && (
                      <div className="p-3 mb-4 bg-red-50 text-red-700 rounded-md border border-red-200 text-sm">
                        {limitMessage}
                      </div>
                    )}

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
                        {/* flex-col и mt-auto: списки разной длины, а цена и кнопка должны стоять на одной линии */}
                        <div className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow bg-white flex flex-col">
                          <h3 className="text-lg font-bold mb-2">Только логотип</h3>
                          <p className="text-gray-700 mb-4">Файлы логотипа без водяного знака — сразу после оплаты</p>
                          <CheckList items={LOGO_FILES} />
                          <div className="text-center mt-auto">
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

                        <div className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow bg-white relative flex flex-col">
                          <div className="absolute top-0 right-0 bg-gray-900 text-white px-2 py-1 text-xs font-medium rounded-bl-lg">
                            Популярный выбор
                          </div>
                          <h3 className="text-lg font-bold mb-2">Полный брендбук</h3>
                          <p className="text-gray-700 mb-4">
                            Брендбук в PDF и архив со всеми исходниками. Соберём за несколько минут после оплаты.
                          </p>
                          <p className="text-sm font-semibold text-gray-900 mb-3">Что внутри PDF</p>
                          <CheckList items={BRANDBOOK_PDF} />
                          <p className="text-sm text-gray-600 mb-6">
                            В архиве — все версии логотипа в SVG и PNG, макеты носителей, иконки, паттерны и файлы шрифтов.
                          </p>
                          <div className="text-center mt-auto">
                            <p className="text-2xl font-bold mb-4">{PRICES.brandbook} ₽</p>
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