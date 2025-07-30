"use client";

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Navbar from '../../components/layout/Navbar';
import Footer from '../../components/layout/Footer';
import { useAuth } from '../../context/AuthContext';
import React from 'react';

// Стили для иконок
const iconStyles = `
  .icon-display svg {
    width: 100% !important;
    height: 100% !important;
    max-width: 100% !important;
    max-height: 100% !important;
  }
`;

// Добавляем стили в head
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = iconStyles;
  document.head.appendChild(styleElement);
}

function BrandbookContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: isAuthLoading } = useAuth();
  
  // Получаем данные из URL параметров
  const orderId = searchParams.get('orderId') || '';
  
  // Состояние для загрузки брендбука
  const [isLoading, setIsLoading] = useState(true);
  const [brandbook, setBrandbook] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const [activeSection, setActiveSection] = useState('overview');

  // Функция для загрузки Google Fonts
  const loadGoogleFonts = (fonts: any[]) => {
    if (!fonts || fonts.length === 0) return;
    
    const fontUrls = fonts
      .filter(font => font.googleFontUrl)
      .map(font => font.googleFontUrl);
    
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

  // Загрузка данных брендбука
  const loadBrandbook = async (userId: string) => {
    setIsLoading(true);
    
    try {
      // Загружаем данные брендбука из API
      const apiUrl = `/api/generate-brandbook/brandbook/${orderId}?userId=${userId}`;
      
      const response = await fetch(apiUrl);
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
            type: variant.type,
            description: variant.description,
            usage: variant.usage
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
        downloadLinks: {
          logoPackage: '/downloads/logo-package.zip',
          colorPalette: '/downloads/color-palette.ase',
          fonts: '/downloads/fonts.zip',
          fullBrandbook: '/downloads/brandbook-full.pdf'
        }
      };
      
      setBrandbook(transformedBrandbook);
      
      // Загружаем Google Fonts для шрифтов брендбука
      if (data.brandbook.fonts && data.brandbook.fonts.length > 0) {
        loadGoogleFonts(data.brandbook.fonts);
      }
    } catch (error) {
      console.error('Error loading brandbook:', error);
      router.push('/');
    } finally {
      setIsLoading(false);
    }
  };


  // Предотвращаем гидратацию и загружаем данные
  useEffect(() => {
    setMounted(true);

    if (isAuthLoading) {
      return; // Ждем окончания загрузки пользователя
    }

    if (!orderId) {
      router.push('/');
      return;
    }

    if (user) {
      loadBrandbook(user.id);
    } else {
      // Если пользователь не авторизован, можно перенаправить на страницу входа
      router.push('/pages/login'); 
    }
  }, [mounted, orderId, user, isAuthLoading, router]);


  // Функция скачивания файлов
  const downloadFile = (type: string) => {
    const apiUrl = 'https://www.pixora-labs.ru';
    
    // Разделяем тип и параметры запроса
    const [endpoint, queryParams] = type.split('?');
    const baseUrl = `${apiUrl}/api/download-${endpoint}/${orderId}`;
    const fullUrl = queryParams ? `${baseUrl}?userId=${user?.id}&${queryParams}` : `${baseUrl}?userId=${user?.id}`;
    
    // Создаем временную ссылку для скачивания
    const link = document.createElement('a');
    link.href = fullUrl;
    link.download = `${brandbook.businessName}_${endpoint}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

  if (!brandbook) {
    return (
      <>
        <Navbar />
        <main className="pt-16">
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Брендбук не найден</h1>
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
        {/* Заголовок */}
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
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-2xl font-bold text-gray-900">Варианты логотипа</h2>
                      <div className="flex gap-2">
                        <button
                          onClick={() => downloadFile(`logo-variants`)}
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Скачать PNG
                        </button>
                        <button
                          onClick={() => downloadFile(`logo-variants?format=both`)}
                          className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                        >
                          Скачать всё
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                      {brandbook.logo.variants.map((variant: any, index: number) => (
                        <div key={index} className="border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition-shadow">
                          <div className={`
                            p-8 flex items-center justify-center min-h-48 
                            ${variant.type === 'inverted' ? 'bg-gray-900' : 'bg-gray-50'}
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
                            <div className="mb-4">
                              <h3 className="text-xl font-bold text-gray-900">{font.name}</h3>
                              <p className="text-sm text-gray-600 mt-1">
                                {font.type === 'primary' ? 'Основной шрифт для заголовков' : 
                                 font.type === 'secondary' ? 'Дополнительный шрифт для текста' : 
                                 'Альтернативный шрифт'}
                              </p>
                            </div>
                            
                            <div className="space-y-3">
                              <p className="text-gray-700 text-sm">
                                <strong>Семейство:</strong> {font.family}
                              </p>
                              <p className="text-gray-700 text-sm">
                                <strong>Категория:</strong> {font.category}
                              </p>
                              <p className="text-gray-700 text-sm">
                                <strong>Доступные начертания:</strong> {font.weights.join(', ')}
                              </p>
                              
                              <div className="space-y-2 mt-4">
                                <p className="text-3xl font-bold" style={{ fontFamily: font.family }}>
                                  {brandbook.businessName}
                                </p>
                                <p className="text-2xl font-semibold" style={{ fontFamily: font.family }}>
                                  {brandbook.slogan}
                                </p>
                                <p className="text-xl" style={{ fontFamily: font.family }}>
                                  АБВГДабвгд 123
                                </p>
                                <p className="text-lg" style={{ fontFamily: font.family }}>
                                  Качество, надёжность, профессионализм
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
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-2xl font-bold text-gray-900">Фирменные иконки и элементы</h2>
                      <div className="flex gap-2">
                        <button
                          onClick={() => downloadFile(`icons`)}
                          className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors"
                        >
                          Скачать иконки (SVG)
                        </button>
                      </div>
                    </div>
                    
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
                                    className="w-16 h-16 icon-display"
                                    dangerouslySetInnerHTML={{ __html: icon.svg }}
                                    style={{ filter: 'contrast(1.2)' }}
                                  />
                                </div>
                                <h4 className="text-sm font-medium text-gray-900 mb-1">{icon.name}</h4>
                                <p className="text-xs text-gray-600 mb-2">{icon.description}</p>
                                <p className="text-xs text-gray-500 italic">{icon.usage}</p>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Фирменные элементы */}
                        <div>
                          <h3 className="text-lg font-semibold text-gray-800 mb-4">Фирменные элементы</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {brandbook.icons.filter((icon: any) => icon.category !== 'icon').map((element: any, index: number) => (
                              <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow">
                                <div className="flex items-center space-x-4 mb-3">
                                  <div className="w-20 h-20 bg-gray-50 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <div 
                                      className="w-16 h-16 icon-display"
                                      dangerouslySetInnerHTML={{ __html: element.svg }}
                                      style={{ filter: 'contrast(1.2)' }}
                                    />
                                  </div>
                                  <div className="flex-1">
                                    <h4 className="text-sm font-semibold text-gray-900 mb-1">{element.name}</h4>
                                    <span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                                      {element.category}
                                    </span>
                                  </div>
                                </div>
                                <p className="text-xs text-gray-600 mb-2">{element.description}</p>
                                <p className="text-xs text-gray-500 italic">{element.usage}</p>
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
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Рекомендации по использованию</h2>
                    
                    {brandbook.guidelines ? (
                      <div className="space-y-10">
                        {/* Рекомендации по шрифтам */}
                        {brandbook.guidelines.fonts && brandbook.guidelines.fonts.length > 0 && (
                          <div>
                            <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
                              <span className="text-blue-500 mr-3">📝</span>
                              Фирменные шрифты
                            </h3>
                            <div className="space-y-6">
                              {brandbook.guidelines.fonts.map((font: any, index: number) => (
                                <div key={index} className="border border-gray-200 rounded-lg p-6">
                                  <div className="flex items-start justify-between mb-4">
                                    <div>
                                      <h4 className="text-lg font-bold text-gray-900" style={{ fontFamily: font.fontFamily }}>
                                        {font.fontFamily}
                                      </h4>
                                      <span className="inline-block px-3 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                                        {font.title}
                                      </span>
                                    </div>
                                  </div>
                                  
                                  <p className="text-gray-700 mb-4">{font.description}</p>
                                  
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                      <h5 className="font-semibold text-gray-800 mb-2">Использование:</h5>
                                      <p className="text-sm text-gray-600 mb-3">{font.usage}</p>
                                      
                                      <h5 className="font-semibold text-gray-800 mb-2">Рекомендуемые размеры:</h5>
                                      <ul className="text-sm text-gray-600 space-y-1">
                                        {font.recommendedSizes.map((size: string, i: number) => (
                                          <li key={i} className="flex items-center">
                                            <span className="text-green-500 mr-2">•</span>
                                            {size}
                                </li>
                              ))}
                            </ul>
                                    </div>
                                    
                                    <div>
                                      <h5 className="font-semibold text-gray-800 mb-2">Что нельзя делать:</h5>
                                      <ul className="text-sm text-gray-600 space-y-1">
                                        {font.prohibitions.map((prohibition: string, i: number) => (
                                          <li key={i} className="flex items-start">
                                            <span className="text-red-500 mr-2 mt-1">✗</span>
                                            {prohibition}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  </div>
                                  
                                  <div className="mt-4 pt-4 border-t border-gray-200">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div>
                                        <h6 className="text-sm font-semibold text-green-800 mb-1">✓ Правильно:</h6>
                                        <p className="text-xs text-gray-600">{font.examples.correct}</p>
                                      </div>
                                      <div>
                                        <h6 className="text-sm font-semibold text-red-800 mb-1">✗ Неправильно:</h6>
                                        <p className="text-xs text-gray-600">{font.examples.incorrect}</p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Рекомендации по цветам */}
                        {brandbook.guidelines.colors && brandbook.guidelines.colors.length > 0 && (
                          <div>
                            <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
                              <span className="text-purple-500 mr-3">🎨</span>
                              Цветовая палитра
                            </h3>
                            <div className="space-y-6">
                              {brandbook.guidelines.colors.map((color: any, index: number) => (
                                <div key={index} className="border border-gray-200 rounded-lg p-6">
                                  <div className="flex items-start gap-4 mb-4">
                                    <div 
                                      className="w-20 h-20 rounded-lg border border-gray-200"
                                      style={{ backgroundColor: color.hex }}
                                    ></div>
                                    <div className="flex-1">
                                      <h4 className="text-lg font-bold text-gray-900">{color.colorName}</h4>
                                      <div className="flex items-center gap-3 text-sm text-gray-600 mb-2">
                                        <span>{color.hex}</span>
                                        <span>•</span>
                                        <span>{color.rgb}</span>
                                      </div>
                                      <span className="inline-block px-3 py-1 text-xs bg-purple-100 text-purple-800 rounded-full">
                                        {color.role}
                                      </span>
                                    </div>
                                  </div>
                                  
                                  <p className="text-gray-700 mb-4">{color.description}</p>
                                  
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                      <h5 className="font-semibold text-gray-800 mb-2">Использование:</h5>
                                      <p className="text-sm text-gray-600 mb-3">{color.usage}</p>
                                      
                                      <h5 className="font-semibold text-gray-800 mb-2">Доступность:</h5>
                                      <div className="text-sm text-gray-600">
                                        <p>{color.accessibility.contrast}</p>
                                        <p className="font-medium">WCAG: {color.accessibility.wcag}</p>
                                      </div>
                                    </div>
                                    
                                    <div>
                                      <h5 className="font-semibold text-gray-800 mb-2">Ограничения:</h5>
                                      <ul className="text-sm text-gray-600 space-y-1">
                                        {color.prohibitions.map((prohibition: string, i: number) => (
                                          <li key={i} className="flex items-start">
                                            <span className="text-red-500 mr-2 mt-1">✗</span>
                                            {prohibition}
                                </li>
                              ))}
                            </ul>
                                    </div>
                                  </div>
                                  
                                  {color.combinations && color.combinations.length > 0 && (
                                    <div className="mt-4 pt-4 border-t border-gray-200">
                                      <h6 className="font-semibold text-gray-800 mb-2">Рекомендуемые сочетания:</h6>
                                      <div className="flex flex-wrap gap-2">
                                        {color.combinations.slice(0, 3).map((combo: string, i: number) => (
                                          <span key={i} className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                                            {combo}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Рекомендации по логотипу */}
                        {brandbook.guidelines.logo && brandbook.guidelines.logo.length > 0 && (
                          <div>
                            <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
                              <span className="text-green-500 mr-3">📐</span>
                              Логотип и его использование
                            </h3>
                            <div className="space-y-6">
                              {brandbook.guidelines.logo.map((logo: any, index: number) => (
                                <div key={index} className="border border-gray-200 rounded-lg p-6">
                                  <h4 className="text-lg font-bold text-gray-900 mb-4">{logo.variant}</h4>
                                  
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                      <h5 className="font-semibold text-gray-800 mb-2">Технические требования:</h5>
                                      <ul className="text-sm text-gray-600 space-y-1">
                                        <li><strong>Минимальный размер:</strong> {logo.minSize}</li>
                                        <li><strong>Защитное поле:</strong> {logo.clearSpace}</li>
                                        <li><strong>Размещение:</strong> {logo.placement.join(', ')}</li>
                                      </ul>
                                      
                                      <h5 className="font-semibold text-gray-800 mb-2 mt-4">Допустимые фоны:</h5>
                                      <ul className="text-sm text-gray-600 space-y-1">
                                        {logo.allowedBackgrounds.map((bg: string, i: number) => (
                                          <li key={i} className="flex items-center">
                                            <span className="text-green-500 mr-2">•</span>
                                            {bg}
                                </li>
                              ))}
                            </ul>
                                    </div>
                                    
                                    <div>
                                      <h5 className="font-semibold text-gray-800 mb-2">Запрещено:</h5>
                                      <ul className="text-sm text-gray-600 space-y-1">
                                        {logo.prohibitions.map((prohibition: string, i: number) => (
                                          <li key={i} className="flex items-start">
                                            <span className="text-red-500 mr-2 mt-1">✗</span>
                                            {prohibition}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  </div>
                                  
                                  <div className="mt-4 pt-4 border-t border-gray-200">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div>
                                        <h6 className="text-sm font-semibold text-green-800 mb-2">✓ Правильные примеры:</h6>
                                        <ul className="text-xs text-gray-600 space-y-1">
                                          {logo.examples.correct.map((example: string, i: number) => (
                                            <li key={i}>• {example}</li>
                                          ))}
                                        </ul>
                                      </div>
                                      <div>
                                        <h6 className="text-sm font-semibold text-red-800 mb-2">✗ Неправильные примеры:</h6>
                                        <ul className="text-xs text-gray-600 space-y-1">
                                          {logo.examples.incorrect.map((example: string, i: number) => (
                                            <li key={i}>• {example}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Рекомендации по иконкам */}
                        {brandbook.guidelines.icons && (
                          <div>
                            <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
                              <span className="text-orange-500 mr-3">⭐</span>
                              Иконки и элементы
                            </h3>
                            <div className="border border-gray-200 rounded-lg p-6">
                              <p className="text-gray-700 mb-4">{brandbook.guidelines.icons.style}</p>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                  <h5 className="font-semibold text-gray-800 mb-2">Где использовать:</h5>
                                  <ul className="text-sm text-gray-600 space-y-1">
                                    {brandbook.guidelines.icons.usage.map((usage: string, i: number) => (
                                      <li key={i} className="flex items-center">
                                        <span className="text-green-500 mr-2">•</span>
                                        {usage}
                                      </li>
                                    ))}
                                  </ul>
                                  
                                  <h5 className="font-semibold text-gray-800 mb-2 mt-4">Контексты применения:</h5>
                                  <ul className="text-sm text-gray-600 space-y-1">
                                    {brandbook.guidelines.icons.contexts.map((context: string, i: number) => (
                                      <li key={i} className="flex items-center">
                                        <span className="text-blue-500 mr-2">•</span>
                                        {context}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                                
                                <div>
                                  <h5 className="font-semibold text-gray-800 mb-2">Недопустимо:</h5>
                                  <ul className="text-sm text-gray-600 space-y-1">
                                    {brandbook.guidelines.icons.prohibitions.map((prohibition: string, i: number) => (
                                      <li key={i} className="flex items-start">
                                        <span className="text-red-500 mr-2 mt-1">✗</span>
                                        {prohibition}
                                      </li>
                                    ))}
                                  </ul>
                                  
                                  <h5 className="font-semibold text-gray-800 mb-2 mt-4">Правила окраски:</h5>
                                  <ul className="text-sm text-gray-600 space-y-1">
                                    {brandbook.guidelines.icons.colorRules.map((rule: string, i: number) => (
                                      <li key={i} className="flex items-start">
                                        <span className="text-purple-500 mr-2 mt-1">•</span>
                                        {rule}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Тональность и голос бренда */}
                        {brandbook.guidelines.toneOfVoice && (
                          <div>
                            <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
                              <span className="text-indigo-500 mr-3">🎭</span>
                              Тональность и голос бренда
                            </h3>
                            <div className="border border-gray-200 rounded-lg p-6">
                              <div className="mb-6">
                                <h4 className="text-lg font-bold text-gray-900 mb-3">Характер бренда</h4>
                                <div className="flex flex-wrap gap-2 mb-4">
                                  {brandbook.guidelines.toneOfVoice.personality.map((trait: string, i: number) => (
                                    <span key={i} className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm">
                                      {trait}
                                    </span>
                                  ))}
                                </div>
                                <p className="text-gray-700">
                                  Стиль общения: <span className="font-semibold">{brandbook.guidelines.toneOfVoice.style}</span>
                                </p>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                  <h5 className="font-semibold text-gray-800 mb-3">Основные характеристики:</h5>
                                  <ul className="text-sm text-gray-600 space-y-1">
                                    {brandbook.guidelines.toneOfVoice.characteristics.map((char: string, i: number) => (
                                      <li key={i} className="flex items-center">
                                        <span className="text-indigo-500 mr-2">•</span>
                                        {char}
                                      </li>
                                    ))}
                                  </ul>
                                  
                                  <h5 className="font-semibold text-gray-800 mb-3 mt-4">Рекомендации:</h5>
                                  <ul className="text-sm text-gray-600 space-y-1">
                                    {brandbook.guidelines.toneOfVoice.doList.map((item: string, i: number) => (
                                      <li key={i} className="flex items-start">
                                        <span className="text-green-500 mr-2 mt-1">✓</span>
                                        {item}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                                
                                <div>
                                  <h5 className="font-semibold text-gray-800 mb-3">Чего избегать:</h5>
                                  <ul className="text-sm text-gray-600 space-y-1">
                                    {brandbook.guidelines.toneOfVoice.dontList.map((item: string, i: number) => (
                                      <li key={i} className="flex items-start">
                                        <span className="text-red-500 mr-2 mt-1">✗</span>
                                        {item}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                              
                              <div className="mt-6 pt-6 border-t border-gray-200">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  <div>
                                    <h6 className="text-sm font-semibold text-green-800 mb-2">✓ Правильные примеры:</h6>
                                    <div className="space-y-2">
                                      {brandbook.guidelines.toneOfVoice.examples.correct.map((example: string, i: number) => (
                                        <div key={i} className="bg-green-50 border border-green-200 rounded p-2">
                                          <p className="text-xs text-green-800">{example}</p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                  <div>
                                    <h6 className="text-sm font-semibold text-red-800 mb-2">✗ Неправильные примеры:</h6>
                                    <div className="space-y-2">
                                      {brandbook.guidelines.toneOfVoice.examples.incorrect.map((example: string, i: number) => (
                                        <div key={i} className="bg-red-50 border border-red-200 rounded p-2">
                                          <p className="text-xs text-red-800">{example}</p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-gray-500">Рекомендации загружаются...</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Применение */}
              {activeSection === 'applications' && (
                <div className="space-y-8">
                  <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-2xl font-bold text-gray-900">Примеры применения</h2>
                      <div className="flex gap-2">
                        <button
                          onClick={() => downloadFile(`applications`)}
                          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                        >
                          Скачать макеты (SVG)
                        </button>
                      </div>
                    </div>
                    
                    {brandbook.applications ? (
                      <div className="space-y-10">
                        {/* Визитная карточка */}
                        {brandbook.applications.businessCard && (
                          <div>
                            <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
                              <span className="text-blue-500 mr-3">💼</span>
                              Визитная карточка
                            </h3>
                            <div className="border border-gray-200 rounded-lg p-6">
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div>
                                  <h4 className="font-semibold text-gray-800 mb-4">Макет визитки</h4>
                                  <div 
                                    className="border border-gray-300 rounded-lg overflow-hidden"
                                    dangerouslySetInnerHTML={{ __html: brandbook.applications.businessCard.template }}
                                  />
                            </div>
                                <div>
                                  <h4 className="font-semibold text-gray-800 mb-4">Спецификации</h4>
                                  <div className="space-y-3 text-sm">
                                    <div>
                                      <span className="font-medium text-gray-700">Размер:</span>
                                      <span className="text-gray-600 ml-2">85×55 мм (стандарт)</span>
                          </div>
                                    <div>
                                      <span className="font-medium text-gray-700">Основной цвет:</span>
                                      <span className="text-gray-600 ml-2">{brandbook.applications.businessCard.primaryColor}</span>
                                    </div>
                                    <div>
                                      <span className="font-medium text-gray-700">Основной шрифт:</span>
                                      <span className="text-gray-600 ml-2">{brandbook.applications.businessCard.fontPrimary}</span>
                                    </div>
                                    <div>
                                      <span className="font-medium text-gray-700">Вспомогательный шрифт:</span>
                                      <span className="text-gray-600 ml-2">{brandbook.applications.businessCard.fontSecondary}</span>
                                    </div>
                                    <div>
                                      <span className="font-medium text-gray-700">Размещение логотипа:</span>
                                      <span className="text-gray-600 ml-2">{brandbook.applications.businessCard.logoPlacement}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Презентация */}
                        {brandbook.applications.presentation && (
                          <div>
                            <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
                              <span className="text-green-500 mr-3">📊</span>
                              Презентация
                            </h3>
                            <div className="border border-gray-200 rounded-lg p-6">
                              <div className="space-y-6">
                                <div>
                                  <h4 className="font-semibold text-gray-800 mb-4">Обложка презентации</h4>
                                  <div 
                                    className="border border-gray-300 rounded-lg overflow-hidden"
                                    dangerouslySetInnerHTML={{ __html: brandbook.applications.presentation.coverTemplate }}
                                  />
                                </div>
                                
                                <div>
                                  <h4 className="font-semibold text-gray-800 mb-4">Слайд презентации</h4>
                                  <div 
                                    className="border border-gray-300 rounded-lg overflow-hidden"
                                    dangerouslySetInnerHTML={{ __html: brandbook.applications.presentation.slideTemplate }}
                                  />
                                </div>
                                
                                <div>
                                  <h4 className="font-semibold text-gray-800 mb-4">Рекомендации</h4>
                                  <ul className="space-y-2 text-sm text-gray-600">
                                    {brandbook.applications.presentation.guidelines.map((guideline: string, index: number) => (
                                      <li key={index} className="flex items-start">
                                        <span className="text-green-500 mr-2 mt-1">•</span>
                                        {guideline}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Социальные сети */}
                        {brandbook.applications.socialMedia && (
                          <div>
                            <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
                              <span className="text-purple-500 mr-3">📱</span>
                              Социальные сети
                            </h3>
                            <div className="border border-gray-200 rounded-lg p-6">
                              <div className="space-y-8">
                                <div className="flex flex-col gap-8 items-center">
                                  <div className="w-full max-w-md">
                                    <h4 className="font-semibold text-gray-800 mb-4 text-center">Пост</h4>
                                    <div 
                                      className="border border-gray-300 rounded-lg overflow-hidden flex justify-center"
                                      dangerouslySetInnerHTML={{ __html: brandbook.applications.socialMedia.templates.post }}
                                    />
                                  </div>
                                  <div className="w-full max-w-xs">
                                    <h4 className="font-semibold text-gray-800 mb-4 text-center">Stories</h4>
                                    <div 
                                      className="border border-gray-300 rounded-lg overflow-hidden flex justify-center"
                                      dangerouslySetInnerHTML={{ __html: brandbook.applications.socialMedia.templates.story }}
                                    />
                                  </div>
                                  <div className="w-full max-w-2xl">
                                    <h4 className="font-semibold text-gray-800 mb-4 text-center">Обложка</h4>
                                    <div 
                                      className="border border-gray-300 rounded-lg overflow-hidden flex justify-center"
                                      dangerouslySetInnerHTML={{ __html: brandbook.applications.socialMedia.templates.cover }}
                                    />
                                  </div>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  <div>
                                    <h5 className="font-semibold text-gray-800 mb-3">Рекомендации по цветам</h5>
                                    <ul className="text-sm text-gray-600 space-y-1">
                                      {brandbook.applications.socialMedia.colorGuidelines.map((guideline: string, index: number) => (
                                        <li key={index} className="flex items-start">
                                          <span className="text-purple-500 mr-2 mt-1">•</span>
                                          {guideline}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                  
                                  <div>
                                    <h5 className="font-semibold text-gray-800 mb-3">Рекомендации по шрифтам</h5>
                                    <ul className="text-sm text-gray-600 space-y-1">
                                      {brandbook.applications.socialMedia.fontGuidelines.map((guideline: string, index: number) => (
                                        <li key={index} className="flex items-start">
                                          <span className="text-blue-500 mr-2 mt-1">•</span>
                                          {guideline}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                </div>
                                
                                <div>
                                  <h5 className="font-semibold text-gray-800 mb-3">Поддерживаемые платформы</h5>
                                  <div className="flex flex-wrap gap-2">
                                    {brandbook.applications.socialMedia.platforms.map((platform: string, index: number) => (
                                      <span key={index} className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm capitalize">
                                        {platform}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Email подпись */}
                        {brandbook.applications.emailSignature && (
                          <div>
                            <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
                              <span className="text-orange-500 mr-3">📧</span>
                              Email подпись
                            </h3>
                            <div className="border border-gray-200 rounded-lg p-6">
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div>
                                  <h4 className="font-semibold text-gray-800 mb-4">Шаблон подписи</h4>
                                  <div 
                                    className="border border-gray-300 rounded-lg overflow-hidden bg-white"
                                    dangerouslySetInnerHTML={{ __html: brandbook.applications.emailSignature.template }}
                                  />
                                </div>
                                <div>
                                  <h4 className="font-semibold text-gray-800 mb-4">Инструкция по использованию</h4>
                                  <div className="space-y-3 text-sm text-gray-600">
                                    <div>
                                      <span className="font-medium text-gray-700">Основной цвет:</span>
                                      <span className="ml-2">{brandbook.applications.emailSignature.colors.primary}</span>
                                    </div>
                                    <div>
                                      <span className="font-medium text-gray-700">Основной шрифт:</span>
                                      <span className="ml-2">{brandbook.applications.emailSignature.fonts.primary}</span>
                                    </div>
                                    <div>
                                      <span className="font-medium text-gray-700">Вспомогательный шрифт:</span>
                                      <span className="ml-2">{brandbook.applications.emailSignature.fonts.secondary}</span>
                                    </div>
                                    <div className="pt-2">
                                      <p className="font-medium text-gray-700 mb-2">Рекомендации:</p>
                                      <ul className="space-y-1">
                                        <li>• Используйте единый шаблон для всех сотрудников</li>
                                        <li>• Проверяйте отображение в разных email-клиентах</li>
                                        <li>• Логотип не должен превышать 60px по высоте</li>
                                        <li>• Используйте только фирменные цвета</li>
                                      </ul>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Веб-сайт */}
                        {brandbook.applications.websiteLanding && (
                          <div>
                            <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
                              <span className="text-indigo-500 mr-3">🌐</span>
                              Веб-сайт / Лендинг
                            </h3>
                            <div className="border border-gray-200 rounded-lg p-6">
                              <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  <div>
                                    <h4 className="font-semibold text-gray-800 mb-3">Хедер</h4>
                                    <div className="bg-gray-50 rounded-lg p-4 text-sm">
                                      <p><strong>Макет:</strong> {brandbook.applications.websiteLanding.sections.header.layout}</p>
                                      <p><strong>Навигация:</strong> {brandbook.applications.websiteLanding.sections.header.navigation}</p>
                                      <p><strong>Логотип:</strong> {brandbook.applications.websiteLanding.sections.header.logoPlacement}</p>
                                      <p><strong>Цвета:</strong> {brandbook.applications.websiteLanding.sections.header.colors}</p>
                                    </div>
                                  </div>
                                  
                                  <div>
                                    <h4 className="font-semibold text-gray-800 mb-3">Главный блок</h4>
                                    <div className="bg-gray-50 rounded-lg p-4 text-sm">
                                      <p><strong>Макет:</strong> {brandbook.applications.websiteLanding.sections.hero.layout}</p>
                                      <p><strong>Кнопка CTA:</strong> {brandbook.applications.websiteLanding.sections.hero.ctaButton}</p>
                                      <p><strong>Фон:</strong> {brandbook.applications.websiteLanding.sections.hero.backgroundType}</p>
                                      <p><strong>Цвета:</strong> {brandbook.applications.websiteLanding.sections.hero.colors}</p>
                                    </div>
                                  </div>
                                  
                                  <div>
                                    <h4 className="font-semibold text-gray-800 mb-3">Контент</h4>
                                    <div className="bg-gray-50 rounded-lg p-4 text-sm">
                                      <p><strong>Макет:</strong> {brandbook.applications.websiteLanding.sections.content.layout}</p>
                                      <p><strong>Иконки:</strong> {brandbook.applications.websiteLanding.sections.content.iconUsage}</p>
                                      <p><strong>Цвета:</strong> {brandbook.applications.websiteLanding.sections.content.colors}</p>
                                      <p><strong>Типографика:</strong> {brandbook.applications.websiteLanding.sections.content.typography}</p>
                                    </div>
                                  </div>
                                  
                                  <div>
                                    <h4 className="font-semibold text-gray-800 mb-3">Подвал</h4>
                                    <div className="bg-gray-50 rounded-lg p-4 text-sm">
                                      <p><strong>Макет:</strong> {brandbook.applications.websiteLanding.sections.footer.layout}</p>
                                      <p><strong>Логотип:</strong> {brandbook.applications.websiteLanding.sections.footer.logoUsage}</p>
                                      <p><strong>Цвета:</strong> {brandbook.applications.websiteLanding.sections.footer.colors}</p>
                                    </div>
                                  </div>
                                </div>
                                
                                <div>
                                  <h4 className="font-semibold text-gray-800 mb-3">Цветовая схема для сайта</h4>
                                  <div className="flex flex-wrap gap-4">
                                    <div className="flex items-center gap-2">
                                      <div 
                                        className="w-6 h-6 rounded border border-gray-300"
                                        style={{ backgroundColor: brandbook.applications.websiteLanding.colorScheme.primary }}
                                      ></div>
                                      <span className="text-sm">Основной: {brandbook.applications.websiteLanding.colorScheme.primary}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <div 
                                        className="w-6 h-6 rounded border border-gray-300"
                                        style={{ backgroundColor: brandbook.applications.websiteLanding.colorScheme.secondary }}
                                      ></div>
                                      <span className="text-sm">Вспомогательный: {brandbook.applications.websiteLanding.colorScheme.secondary}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <div 
                                        className="w-6 h-6 rounded border border-gray-300"
                                        style={{ backgroundColor: brandbook.applications.websiteLanding.colorScheme.background }}
                                      ></div>
                                      <span className="text-sm">Фон: {brandbook.applications.websiteLanding.colorScheme.background}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <div 
                                        className="w-6 h-6 rounded border border-gray-300"
                                        style={{ backgroundColor: brandbook.applications.websiteLanding.colorScheme.text }}
                                      ></div>
                                      <span className="text-sm">Текст: {brandbook.applications.websiteLanding.colorScheme.text}</span>
                                    </div>
                                  </div>
                                </div>
                                
                                <div>
                                  <h4 className="font-semibold text-gray-800 mb-3">Типографика</h4>
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="bg-gray-50 rounded-lg p-3 text-sm">
                                      <p className="font-medium text-gray-700">Заголовки</p>
                                      <p className="text-gray-600">{brandbook.applications.websiteLanding.typography.headings}</p>
                                    </div>
                                    <div className="bg-gray-50 rounded-lg p-3 text-sm">
                                      <p className="font-medium text-gray-700">Основной текст</p>
                                      <p className="text-gray-600">{brandbook.applications.websiteLanding.typography.body}</p>
                                    </div>
                                    <div className="bg-gray-50 rounded-lg p-3 text-sm">
                                      <p className="font-medium text-gray-700">Кнопки</p>
                                      <p className="text-gray-600">{brandbook.applications.websiteLanding.typography.buttons}</p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-gray-500">Примеры применения загружаются...</p>
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
