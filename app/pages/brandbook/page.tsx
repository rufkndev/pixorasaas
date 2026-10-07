"use client";

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '../../components/layout/Navbar';
import Footer from '../../components/layout/Footer';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import { apiFetch } from '../../lib/authClient';
import BuildProgress, { BuildProgressData } from '../../components/common/BuildProgress';
import {
  BRANDBOOK_SECTIONS,
  BrandSection,
  FontSpecimens,
  IconGrid,
  LogoVariantGrid,
  MoreInFile,
  PaletteGrid,
  PatternGrid,
  RuleList,
  useBrandFonts,
} from '../../components/brandbook/BrandbookBlocks';
import React from 'react';

// Реже, чем на странице оплаты: сюда попадают и после сборки, опрос нужен
// только тем, кто открыл заказ, пока он ещё собирается
const BUILD_POLL_MS = 4000;

const IN_FILE_TITLE = 'Полностью — в PDF и архиве';

// Чем PDF и архив богаче страницы. Сверено с полосами документа и структурой
// архива: здесь нельзя обещать файл, которого сборка не кладёт
const IN_FILE = {
  logo: ['Схема охранного поля и минимальные размеры', 'Наглядные примеры недопустимого использования', 'SVG и PNG 2048 px каждой версии — папка logo/'],
  colors: ['Таблица контраста: цвет как текст и текст на цвете', 'Пропорции цветов в макете'],
  typography: ['Размерная шкала и иерархия', 'Примеры набора «так не надо»', 'Файлы TTF и WOFF2 с лицензией — папка fonts/'],
  graphics: ['SVG каждой иконки и паттерна — папка icons/', 'Лицензии наборов иконок'],
  mockups: ['Визитка в PDF с вылетами для типографии', 'PNG для соцсетей и HTML-подпись письма — папка mockups/'],
};

function BrandbookContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: isAuthLoading } = useRequireAuth();

  // Получаем данные из URL параметров
  const orderId = searchParams.get('orderId') || '';
  
  // Состояние для загрузки брендбука
  const [isLoading, setIsLoading] = useState(true);
  const [brandbook, setBrandbook] = useState<any>(null);
  const [build, setBuild] = useState<BuildProgressData | null>(null);
  const [loadError, setLoadError] = useState('');
  const [mounted, setMounted] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  // isLoading здесь не поднимаем: начальное значение уже true, а повторные
  // опросы во время сборки иначе мигали бы спиннером поверх готовых шагов
  const loadBrandbook = async () => {
    try {
      // Владельца брендбука сервер определяет по сессии
      const response = await apiFetch(`/api/generate-brandbook/brandbook/${orderId}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Ошибка при загрузке брендбука');
      }
      
      // Преобразуем данные из API в формат для отображения
      const transformedBrandbook = {
        id: data.brandbook.id,
        businessName: data.brandbook.businessName,
        keywords: data.brandbook.keywords,
        logo: {
          main: data.brandbook.originalLogoUrl,
          variants: (data.brandbook.logoVariants || []).map((variant: any) => ({
            name: variant.name,
            url: variant.url,
            kind: variant.kind,
            description: variant.description,
            usage: variant.usage,
            // Выворотку показываем на тёмном: на белом её просто не видно
            onDark: !!variant.onDark
          }))
        },
        colors: data.brandbook.colorPalette || [],
        fonts: data.brandbook.fonts || [],
        slogan: data.brandbook.slogan || '',
        icons: data.brandbook.icons || [],
        guidelines: data.brandbook.guidelines || {
          logoUsage: [],
          colorUsage: [],
          typography: []
        },
        applications: data.brandbook.applications || [],
        createdAt: data.brandbook.createdAt,
      };
      
      setBrandbook(transformedBrandbook);
      setBuild(data.brandbook.build || null);
      setLoadError('');

      return data.brandbook.build?.status as string | undefined;
    } catch (error: any) {
      // Раньше любая ошибка уводила на главную — вместе с ней уходил и
      // оплаченный заказ, который просто ещё собирался. Неавторизованного
      // уводит useRequireAuth, остальным показываем причину.
      console.error('Error loading brandbook:', error);
      setLoadError(error?.message || 'Не удалось загрузить брендбук');
      return undefined;
    } finally {
      setIsLoading(false);
    }
  };

  useBrandFonts(brandbook?.fonts);

  // Первый рендер должен совпасть с серверным, иначе React ругается на гидратацию
  useEffect(() => {
    setMounted(true);

    if (isAuthLoading) {
      return; // Ждем окончания загрузки пользователя
    }

    if (!orderId) {
      router.push('/');
      return;
    }

    // Неавторизованного уводит на вход useRequireAuth
    if (!user) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    // Пока идёт сборка, страница перезапрашивает заказ: шаги дописываются в
    // строку по мере готовности, и покупатель видит их без перезагрузки
    const tick = async () => {
      const status = await loadBrandbook();

      if (cancelled || status !== 'processing') return;

      timer = setTimeout(tick, BUILD_POLL_MS);
    };

    tick();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [mounted, orderId, user, isAuthLoading, router]);

  // Один архив вместо трёх кнопок. Качаем через apiFetch, а не ссылкой:
  // при неоплаченном или недособранном заказе роут отвечает JSON, и по
  // прямой ссылке пользователь увидел бы его текстом в новой вкладке.
  const downloadArchive = async () => {
    setDownloadError(null);
    setIsDownloading(true);

    try {
      const response = await apiFetch(`/api/download-brandbook/${orderId}`);

      if (!response.ok) {
        const details = await response.json().catch(() => ({}));
        setDownloadError(details.message || details.error || 'Не удалось скачать архив');
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');

      link.href = url;
      link.download = `${brandbook.businessName}-brandbook.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      setDownloadError(error?.message || 'Не удалось скачать архив');
    } finally {
      setIsDownloading(false);
    }
  };

  if (!mounted || isAuthLoading || isLoading) {
    return (
      <>
        <Navbar />
        <main className="pt-16">
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gray-900 mx-auto mb-4"></div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                {isLoading ? 'Подготавливаем ваш брендбук...' : 'Загрузка...'}
              </h2>
              <p className="text-gray-600">
                {isLoading ? 'Осталось совсем немного' : 'Пожалуйста, подождите'}
              </p>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  // Заказ оплачен, но сборка ещё идёт: показываем шаги, а не «не найден».
  // Раньше страница в этот момент уводила покупателя на главную.
  if (brandbook && build && build.status === 'processing') {
    return (
      <>
        <Navbar />
        <main className="pt-16">
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="bg-white rounded-lg shadow-md p-8 max-w-lg w-full mx-4">
              <BuildProgress build={build} title={`Собираем брендбук «${brandbook.businessName}»`} />
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (!brandbook) {
    return (
      <>
        <Navbar />
        <main className="pt-16">
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center px-4">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Брендбук не найден</h1>
              {loadError && <p className="text-gray-600 mb-4">{loadError}</p>}
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

  const guidelines = brandbook.guidelines || {};
  const tone = guidelines.toneOfVoice;
  const icons = (brandbook.icons || []).filter((icon: any) => icon.category === 'icon');
  const patterns = (brandbook.icons || []).filter((icon: any) => icon.category !== 'icon');

  return (
    <>
      <Navbar />
      <main className="pt-16 bg-gray-50">
        <section className="bg-gradient-to-r from-gray-900 to-gray-700 text-white py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <div className="w-28 h-28 mx-auto bg-white rounded-xl p-3 flex items-center justify-center mb-6">
                <img
                  src={brandbook.logo.main}
                  alt={`Логотип ${brandbook.businessName}`}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
              <h1 className="text-4xl font-bold mb-4">
                Брендбук {brandbook.businessName}
              </h1>
              {brandbook.slogan && <p className="text-xl text-gray-200 mb-2">{brandbook.slogan}</p>}
              <p className="text-gray-300">
                Заказ #{brandbook.id} • Создан {new Date(brandbook.createdAt).toLocaleDateString('ru-RU')}
              </p>

              <div className="mt-8">
                <button
                  onClick={downloadArchive}
                  disabled={isDownloading}
                  className="bg-white text-gray-900 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors disabled:opacity-60"
                >
                  {isDownloading ? 'Собираем архив…' : 'Скачать брендбук: PDF и исходники'}
                </button>
                <p className="text-gray-400 text-sm mt-3 max-w-xl mx-auto">
                  На этой странице — главное. Полный брендбук — файл brandbook.pdf на ~15 страниц
                  в архиве, рядом логотип во всех версиях, шрифты, иконки и макеты.
                </p>
                {downloadError && <p className="text-red-300 text-sm mt-2">{downloadError}</p>}
              </div>
            </div>
          </div>
        </section>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="lg:grid lg:grid-cols-4 lg:gap-8">
            {/* Одна лента вместо вкладок: страница читается как документ, а
                меню только переносит к разделу */}
            <div className="hidden lg:block lg:col-span-1">
              <nav className="sticky top-24 space-y-1">
                {BRANDBOOK_SECTIONS.map((section, index) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className="block px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100"
                  >
                    <span className="text-gray-400 mr-3">{String(index + 1).padStart(2, '0')}</span>
                    {section.title}
                  </a>
                ))}
                <div className="mt-6 p-4 rounded-lg border border-gray-200 bg-white">
                  <p className="text-sm text-gray-700 mb-3">Полная версия — в PDF</p>
                  <button
                    onClick={downloadArchive}
                    disabled={isDownloading}
                    className="w-full py-2 rounded-md bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-60"
                  >
                    {isDownloading ? 'Собираем…' : 'Скачать архив'}
                  </button>
                </div>
              </nav>
            </div>

            <div className="lg:col-span-3 space-y-8">
              <BrandSection id="brand">
                {guidelines.essence && (
                  <p className="text-lg text-gray-800 leading-relaxed">{guidelines.essence}</p>
                )}

                {guidelines.audience && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Кому это нужно</h3>
                    <p className="text-gray-700">{guidelines.audience}</p>
                  </div>
                )}

                {Array.isArray(guidelines.personality) && guidelines.personality.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Характер</h3>
                    <div className="flex flex-wrap gap-2">
                      {guidelines.personality.map((trait: string, index: number) => (
                        <span key={index} className="px-3 py-1 rounded-full border border-gray-300 text-sm text-gray-800">
                          {trait}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {tone && (
                  <div className="border-t border-gray-200 pt-8">
                    <h3 className="font-semibold text-gray-900 mb-3">Голос бренда</h3>
                    <p className="text-gray-700 mb-4">{tone.summary}</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900 mb-2">Говорим</h4>
                        <ul className="space-y-1 text-sm text-gray-700">
                          {(tone.doList || []).map((item: string, index: number) => (
                            <li key={index}>+ {item}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900 mb-2">Не говорим</h4>
                        <ul className="space-y-1 text-sm text-gray-500">
                          {(tone.dontList || []).map((item: string, index: number) => (
                            <li key={index}>× {item}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {tone.examples && (
                      <div className="mt-6 border border-gray-200 rounded-lg p-4 space-y-3">
                        <div>
                          <p className="text-xs font-semibold text-green-700 mb-1">Так — да</p>
                          <p className="text-sm text-gray-800">{tone.examples.correct}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-500 mb-1">Так — нет</p>
                          <p className="text-sm text-gray-500">{tone.examples.incorrect}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {!guidelines.essence && !tone && (
                  <p className="text-gray-500">Описание бренда не собралось — остальные разделы на месте.</p>
                )}
              </BrandSection>

              <BrandSection id="logo">
                <LogoVariantGrid variants={brandbook.logo.variants} />
                {/* Правило то же, что нарисовано на полосе охранного поля */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Охранное поле</h3>
                  <p className="text-gray-700">
                    Вокруг логотипа остаётся свободное поле не меньше десятой части его большей стороны.
                    В эту зону не заходят текст, края макета и другие элементы.
                  </p>
                </div>
                <RuleList title="Правила" items={guidelines.logoRules} />
                <RuleList title="Чего делать нельзя" items={guidelines.misuse} />
                <MoreInFile title={IN_FILE_TITLE} items={IN_FILE.logo} />
              </BrandSection>

              <BrandSection id="colors">
                {brandbook.colors.length > 0 ? (
                  <PaletteGrid colors={brandbook.colors} detailed />
                ) : (
                  <p className="text-gray-500">Палитра не собралась.</p>
                )}
                <RuleList title="Как применять" items={guidelines.colorRules} />
                <MoreInFile title={IN_FILE_TITLE} items={IN_FILE.colors} />
              </BrandSection>

              <BrandSection id="typography">
                {brandbook.fonts.length > 0 ? (
                  <FontSpecimens
                    fonts={brandbook.fonts}
                    businessName={brandbook.businessName}
                    slogan={brandbook.slogan}
                    detailed
                  />
                ) : (
                  <p className="text-gray-500">Шрифты не собрались.</p>
                )}
                <RuleList title="Как набирать" items={guidelines.typographyRules} />
                <MoreInFile title={IN_FILE_TITLE} items={IN_FILE.typography} />
              </BrandSection>

              <BrandSection id="graphics">
                {icons.length > 0 && <IconGrid icons={icons} />}
                {patterns.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-4">Паттерны, разделители, подложки</h3>
                    <PatternGrid patterns={patterns} />
                  </div>
                )}
                {icons.length === 0 && patterns.length === 0 && (
                  <p className="text-gray-500">Иконки и графика не собрались.</p>
                )}
                <MoreInFile title={IN_FILE_TITLE} items={IN_FILE.graphics} />
              </BrandSection>

              <BrandSection id="mockups">
                {Array.isArray(brandbook.applications) && brandbook.applications.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {brandbook.applications.map((mockup: any) => (
                      <div key={mockup.id} className="border border-gray-200 rounded-lg overflow-hidden">
                        {mockup.previewUrl ? (
                          <img src={mockup.previewUrl} alt={mockup.name} className="w-full bg-white object-contain" />
                        ) : (
                          <div className="bg-gray-50 py-10 text-center text-gray-400 text-sm">
                            HTML-файл, превью нет
                          </div>
                        )}
                        <div className="p-4">
                          <div className="flex items-baseline justify-between gap-3">
                            <h3 className="font-semibold text-gray-900">{mockup.name}</h3>
                            <span className="text-xs text-gray-500 whitespace-nowrap">{mockup.size}</span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{mockup.description}</p>
                          <p className="text-xs text-gray-500 mt-2">{mockup.usage}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">Носители не собрались.</p>
                )}
                <MoreInFile title={IN_FILE_TITLE} items={IN_FILE.mockups} />
              </BrandSection>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

export default function BrandbookPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Загрузка брендбука...</h2>
          <p className="text-gray-600">Пожалуйста, подождите</p>
        </div>
      </div>
    }>
      <BrandbookContent />
    </Suspense>
  );
}
