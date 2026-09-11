"use client";

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Navbar from '../../components/layout/Navbar';
import Footer from '../../components/layout/Footer';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import { apiFetch } from '../../lib/authClient';
import BuildProgress, { BuildProgressData } from '../../components/common/BuildProgress';
import React from 'react';

// Реже, чем на странице оплаты: сюда попадают и после сборки, опрос нужен
// только тем, кто открыл заказ, пока он ещё собирается
const BUILD_POLL_MS = 4000;

// Разделы правил идут списками строк одного вида, поэтому рисуются циклом
const RULE_SECTIONS = [
  { key: 'logoRules', title: 'Логотип' },
  { key: 'misuse', title: 'Чего делать нельзя' },
  { key: 'colorRules', title: 'Цвет' },
  { key: 'typographyRules', title: 'Типографика' },
] as const;

const iconStyles = `
  .icon-display svg {
    width: 100% !important;
    height: 100% !important;
    max-width: 100% !important;
    max-height: 100% !important;
  }
`;

if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = iconStyles;
  document.head.appendChild(styleElement);
}

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
  const [activeSection, setActiveSection] = useState('overview');
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  // Шрифты грузятся с нашего домена, а не с fonts.googleapis.com: помимо
  // доступности без VPN это убирает передачу IP посетителя в Google
  const loadBrandFonts = (fonts: any[]) => {
    if (!fonts || fonts.length === 0) return;

    const fontUrls = fonts
      .map(font => font.cssUrl)
      .filter(Boolean);

    // Удаляем предыдущие ссылки на шрифты
    document.querySelectorAll('link[data-font-loader]').forEach(link => link.remove());
    
    // Добавляем новые ссылки на шрифты
    fontUrls.forEach(url => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = url;
      link.setAttribute('data-font-loader', 'true');
      document.head.appendChild(link);
    });
  };

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

      if (data.brandbook.fonts && data.brandbook.fonts.length > 0) {
        loadBrandFonts(data.brandbook.fonts);
      }

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

  const sections = [
    { id: 'overview', name: 'Обзор', icon: '📋' },
    { id: 'logo', name: 'Логотип', icon: '🎨' },
    { id: 'colors', name: 'Цвета', icon: '🎯' },
    { id: 'fonts', name: 'Шрифты', icon: '📝' },
    { id: 'icons', name: 'Иконки', icon: '⭐' },
    { id: 'guidelines', name: 'Рекомендации', icon: '📖' },
    { id: 'applications', name: 'Применение', icon: '💼' },
  ];

  return (
    <>
      <Navbar />
      <main className="pt-16">
        <section className="bg-gradient-to-r from-gray-900 to-gray-700 text-white py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <div className="flex items-center justify-center mb-6">
                <Image
                  src={brandbook.logo.main}
                  alt={`Логотип ${brandbook.businessName}`}
                  width={80}
                  height={80}
                  className="rounded-lg bg-white p-2"
                  unoptimized
                />
              </div>
              <h1 className="text-4xl font-bold mb-4">
                Брендбук для {brandbook.businessName}
              </h1>
              <p className="text-xl text-gray-200 mb-2">
                {brandbook.slogan}
              </p>
              <p className="text-gray-300">
                Заказ #{brandbook.id} • Создан {new Date(brandbook.createdAt).toLocaleDateString('ru-RU')}
              </p>

              <div className="mt-8">
                <button
                  onClick={downloadArchive}
                  disabled={isDownloading}
                  className="bg-white text-gray-900 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors disabled:opacity-60"
                >
                  {isDownloading ? 'Собираем архив…' : 'Скачать всё одним архивом'}
                </button>
                <p className="text-gray-400 text-sm mt-3">
                  PDF, логотип, шрифты, иконки и макеты носителей
                </p>
                {downloadError && <p className="text-red-300 text-sm mt-2">{downloadError}</p>}
              </div>
            </div>
          </div>
        </section>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="lg:grid lg:grid-cols-4 lg:gap-8">
            {/* Навигационное меню */}
            <div className="lg:col-span-1">
              <div className="sticky top-24">
                <nav className="space-y-2">
                  {sections.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                        activeSection === section.id
                          ? 'bg-gray-900 text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <span className="mr-3">{section.icon}</span>
                      {section.name}
                    </button>
                  ))}
                </nav>
              </div>
            </div>

            {/* Основное содержимое */}
            <div className="lg:col-span-3 mt-8 lg:mt-0">
              {/* Обзор */}
              {activeSection === 'overview' && (
                <div className="space-y-8">
                  <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">Обзор брендбука</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">Основная информация</h3>
                        <ul className="space-y-2 text-gray-600">
                          <li><strong>Название:</strong> {brandbook.businessName}</li>
                          <li><strong>Ключевые слова:</strong> {brandbook.keywords}</li>
                          <li><strong>Слоган:</strong> {brandbook.slogan}</li>
                          <li><strong>Дата создания:</strong> {new Date(brandbook.createdAt).toLocaleDateString('ru-RU')}</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Логотип */}
              {activeSection === 'logo' && (
                <div className="space-y-8">
                  <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Варианты логотипа</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                      {brandbook.logo.variants.map((variant: any, index: number) => (
                        <div key={index} className="border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition-shadow">
                          <div className={`
                            p-8 flex items-center justify-center min-h-48 
                            ${variant.onDark ? 'bg-gray-900' : 'bg-gray-50'}
                          `}>
                            <Image
                              src={variant.url}
                              alt={variant.name}
                              width={150}
                              height={150}
                              className="max-h-32 max-w-full object-contain"
                              unoptimized
                            />
                          </div>
                          <div className="p-6">
                            <h4 className="text-lg font-semibold text-gray-800 mb-2">{variant.name}</h4>
                            <p className="text-sm text-gray-600 mb-4">{variant.description}</p>
                            <p className="text-xs text-gray-500 italic">Применение: {variant.usage}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Цвета */}
              {activeSection === 'colors' && (
                <div className="space-y-8">
                  <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Цветовая палитра</h2>
                    
                    {brandbook.colors && Array.isArray(brandbook.colors) && brandbook.colors.length > 0 ? (
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {brandbook.colors.map((color: any, index: number) => (
                            <div key={index} className="border border-gray-200 rounded-lg p-4">
                              <div className="flex items-center space-x-4">
                                <div 
                                  className="w-20 h-20 rounded-lg border border-gray-200 flex-shrink-0"
                                  style={{ backgroundColor: color.hex }}
                                ></div>
                                <div className="flex-1">
                                  <h4 className="font-semibold text-gray-900 mb-1">{color.name}</h4>
                                  <p className="text-sm text-gray-600 mb-1">{color.hex}</p>
                                  <p className="text-xs text-gray-500 mb-2">{color.rgb}</p>
                                  <p className="text-xs text-gray-400 italic">{color.usage}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-gray-500">Цветовая палитра загружается...</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Шрифты */}
              {activeSection === 'fonts' && (
                <div className="space-y-8">
                  <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Фирменные шрифты</h2>
                    
                    {brandbook.fonts && Array.isArray(brandbook.fonts) && brandbook.fonts.length > 0 ? (
                      <div className="space-y-8">
                        {brandbook.fonts.map((font: any, index: number) => (
                          <div key={index} className="border border-gray-200 rounded-lg p-6">
                            <div className="mb-4 flex items-start justify-between gap-4">
                              <div>
                                <h3 className="text-xl font-bold text-gray-900">{font.family}</h3>
                                <p className="text-sm text-gray-600 mt-1">
                                  {font.role === 'heading'
                                    ? 'Заголовочный шрифт'
                                    : 'Текстовый шрифт'}
                                </p>
                              </div>
                              {/* Совпадение со шрифтом логотипа стоит показать прямо:
                                  это главный признак связности брендбука */}
                              {font.matchesLogo && (
                                <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 whitespace-nowrap">
                                  Как в логотипе
                                </span>
                              )}
                            </div>

                            <div className="space-y-3">
                              <p className="text-gray-700 text-sm">{font.usage}</p>
                              <p className="text-gray-700 text-sm">
                                <strong>Начертания:</strong> {(font.weights || []).join(', ')}
                              </p>
                              <p className="text-gray-700 text-sm">
                                <strong>Лицензия:</strong> {font.licence} — шрифт можно
                                использовать в коммерческих проектах, файлы лежат в архиве
                              </p>

                              <div className="space-y-2 mt-4">
                                <p className="text-3xl" style={{ fontFamily: font.family, fontWeight: 700 }}>
                                  {brandbook.businessName}
                                </p>
                                {brandbook.slogan && (
                                  <p className="text-2xl" style={{ fontFamily: font.family, fontWeight: 500 }}>
                                    {brandbook.slogan}
                                  </p>
                                )}
                                <p className="text-xl" style={{ fontFamily: font.family }}>
                                  Съешь же ещё этих мягких французских булок
                                </p>
                                <p className="text-lg" style={{ fontFamily: font.family }}>
                                  АБВГДЕЁЖЗ абвгдеёжз 0123456789
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-gray-500">Шрифты загружаются...</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Иконки */}
              {activeSection === 'icons' && (
                <div className="space-y-8">
                  <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Фирменные иконки и графика</h2>
                    
                    {brandbook.icons && Array.isArray(brandbook.icons) && brandbook.icons.length > 0 ? (
                      <div className="space-y-8">
                        {/* Фирменные иконки */}
                        <div>
                          <h3 className="text-lg font-semibold text-gray-800 mb-4">Фирменные иконки</h3>
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                            {brandbook.icons.filter((icon: any) => icon.category === 'icon').map((icon: any, index: number) => (
                              <div key={index} className="text-center border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow">
                                <div className="w-20 h-20 mx-auto bg-gray-50 rounded-lg flex items-center justify-center mb-3 hover:bg-gray-100 transition-colors">
                                  <div
                                    className="w-16 h-16 icon-display text-gray-900"
                                    dangerouslySetInnerHTML={{ __html: icon.svg }}
                                  />
                                </div>
                                <h4 className="text-sm font-medium text-gray-900">{icon.name}</h4>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Фирменные элементы */}
                        <div>
                          <h3 className="text-lg font-semibold text-gray-800 mb-4">Паттерны, разделители, подложки</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {brandbook.icons.filter((icon: any) => icon.category !== 'icon').map((element: any, index: number) => (
                              <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow">
                                <div className="flex items-center space-x-4 mb-3">
                                  <div className="w-20 h-20 bg-gray-50 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <div
                                      className="w-16 h-16 icon-display"
                                      dangerouslySetInnerHTML={{ __html: element.svg }}
                                    />
                                  </div>
                                  <div className="flex-1">
                                    <h4 className="text-sm font-semibold text-gray-900 mb-1">{element.name}</h4>
                                    <span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                                      {element.category}
                                    </span>
                                  </div>
                                </div>
                                <p className="text-xs text-gray-500">{element.usage}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-gray-500">Иконки и элементы загружаются...</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Рекомендации */}
              {activeSection === 'guidelines' && (
                <div className="space-y-8">
                  <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Рекомендации</h2>

                    {brandbook.guidelines ? (
                      <div className="space-y-8">
                        {brandbook.guidelines.essence && (
                          <p className="text-lg text-gray-800 leading-relaxed">
                            {brandbook.guidelines.essence}
                          </p>
                        )}

                        {brandbook.guidelines.audience && (
                          <div>
                            <h3 className="font-semibold text-gray-900 mb-2">Кому это нужно</h3>
                            <p className="text-gray-700">{brandbook.guidelines.audience}</p>
                          </div>
                        )}

                        {Array.isArray(brandbook.guidelines.personality) &&
                          brandbook.guidelines.personality.length > 0 && (
                            <div>
                              <h3 className="font-semibold text-gray-900 mb-3">Характер</h3>
                              <div className="flex flex-wrap gap-2">
                                {brandbook.guidelines.personality.map((trait: string, index: number) => (
                                  <span
                                    key={index}
                                    className="px-3 py-1 rounded-full border border-gray-300 text-sm text-gray-800"
                                  >
                                    {trait}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                        {RULE_SECTIONS.map(({ key, title }) => {
                          const items = brandbook.guidelines?.[key];
                          if (!Array.isArray(items) || items.length === 0) return null;

                          return (
                            <div key={key}>
                              <h3 className="font-semibold text-gray-900 mb-3">{title}</h3>
                              <ul className="space-y-2">
                                {items.map((item: string, index: number) => (
                                  <li key={index} className="flex gap-3 text-gray-700">
                                    <span className="text-gray-400">—</span>
                                    <span>{item}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          );
                        })}

                        {brandbook.guidelines.toneOfVoice && (
                          <div className="border-t border-gray-200 pt-8">
                            <h3 className="font-semibold text-gray-900 mb-3">Голос бренда</h3>
                            <p className="text-gray-700 mb-4">
                              {brandbook.guidelines.toneOfVoice.summary}
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div>
                                <h4 className="text-sm font-semibold text-gray-900 mb-2">Говорим</h4>
                                <ul className="space-y-1 text-sm text-gray-700">
                                  {(brandbook.guidelines.toneOfVoice.doList || []).map(
                                    (item: string, index: number) => (
                                      <li key={index}>+ {item}</li>
                                    )
                                  )}
                                </ul>
                              </div>
                              <div>
                                <h4 className="text-sm font-semibold text-gray-900 mb-2">Не говорим</h4>
                                <ul className="space-y-1 text-sm text-gray-500">
                                  {(brandbook.guidelines.toneOfVoice.dontList || []).map(
                                    (item: string, index: number) => (
                                      <li key={index}>× {item}</li>
                                    )
                                  )}
                                </ul>
                              </div>
                            </div>

                            {brandbook.guidelines.toneOfVoice.examples && (
                              <div className="mt-6 border border-gray-200 rounded-lg p-4 space-y-3">
                                <div>
                                  <p className="text-xs font-semibold text-green-700 mb-1">Так — да</p>
                                  <p className="text-sm text-gray-800">
                                    {brandbook.guidelines.toneOfVoice.examples.correct}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-gray-500 mb-1">Так — нет</p>
                                  <p className="text-sm text-gray-500">
                                    {brandbook.guidelines.toneOfVoice.examples.incorrect}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-gray-500">Рекомендации ещё собираются…</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Применение */}
              {activeSection === 'applications' && (
                <div className="space-y-8">
                  <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Носители</h2>
                    <p className="text-gray-600 mb-6">
                      Макеты собраны в рабочих размерах. Исходники, печатные PDF и картинки
                      лежат в архиве.
                    </p>

                    {Array.isArray(brandbook.applications) && brandbook.applications.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {brandbook.applications.map((mockup: any) => (
                          <div key={mockup.id} className="border border-gray-200 rounded-lg overflow-hidden">
                            {mockup.previewUrl ? (
                              <img
                                src={mockup.previewUrl}
                                alt={mockup.name}
                                className="w-full bg-white object-contain"
                              />
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
                      <div className="text-center py-8">
                        <p className="text-gray-500">Носители ещё собираются…</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

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
