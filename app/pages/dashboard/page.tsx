"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../../components/layout/Navbar';
import Footer from '../../components/layout/Footer';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { apiFetch } from '../../lib/authClient';
import DeleteAccountSection from '../../components/legal/DeleteAccountSection';
import { PRICES } from '../../lib/legal';

interface GeneratedLogo {
  id: number;
  name: string;
  keywords: string;
  logoUrl: string;
  originalLogoUrl?: string;
  hasVector?: boolean;
  isPaid: boolean;
  orderId?: string;
  createdAt: string;
}

interface Brandbook {
  id: number;
  orderId: string;
  businessName: string;
  keywords: string;
  slogan: string;
  originalLogoUrl: string;
  status: string;
  paymentStatus: string;
  isDemo: boolean;
  createdAt: string;
}

type ActiveTab = 'logos' | 'brandbooks';

export default function Dashboard() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<ActiveTab>('logos');
  const [logos, setLogos] = useState<GeneratedLogo[]>([]);
  const [brandbooks, setBrandbooks] = useState<Brandbook[]>([]);
  const [isLoadingLogos, setIsLoadingLogos] = useState(false);
  const [isLoadingBrandbooks, setIsLoadingBrandbooks] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Первый рендер должен совпасть с серверным, иначе React ругается на гидратацию
  useEffect(() => {
    setMounted(true);
  }, []);

  // Проверяем авторизацию
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/');
    }
  }, [user, isLoading, router]);

  // Загружаем данные пользователя при изменении активной вкладки
  useEffect(() => {
    if (user && mounted) {
      if (activeTab === 'logos') {
        fetchUserLogos();
      } else if (activeTab === 'brandbooks') {
        fetchUserBrandbooks();
      }
    }
  }, [user, mounted, activeTab]);

  // Функция для получения логотипов пользователя.
  // Сервер отдаёт только записи текущей сессии, id в пути — совместимость.
  const fetchUserLogos = async () => {
    if (!user) return;

    setIsLoadingLogos(true);
    try {
      const response = await apiFetch(`/api/user-logos/${user.id}`);
      const data = await response.json();

      if (data.logos) {
        setLogos(data.logos);
      }
    } catch (error) {
      console.error('Error fetching user logos:', error);
    } finally {
      setIsLoadingLogos(false);
    }
  };

  // Функция для получения брендбуков пользователя
  const fetchUserBrandbooks = async () => {
    if (!user) return;

    setIsLoadingBrandbooks(true);
    try {
      const response = await apiFetch(`/api/generate-brandbook/user-brandbooks/${user.id}`);
      const data = await response.json();

      if (data.brandbooks) {
        setBrandbooks(data.brandbooks);
      }
    } catch (error) {
      console.error('Error fetching user brandbooks:', error);
    } finally {
      setIsLoadingBrandbooks(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Оплаченный логотип скачивается только через API: там проверка оплаты и
  // чистые файлы. Раньше кабинет отдавал logoUrl — превью с водяным знаком
  const downloadLogo = async (logo: GeneratedLogo, format: 'zip' | 'svg' | 'png' | 'original') => {
    try {
      const response = await apiFetch(`/api/download-logo/${logo.id}?format=${format}`);

      if (!response.ok) {
        const details = await response.json().catch(() => null);
        throw new Error(details?.message || details?.error || 'Не удалось скачать файл');
      }

      const blob = await response.blob();
      const extension = format === 'zip' ? 'zip' : format === 'svg' ? 'svg' : 'png';
      const suffix = format === 'original' ? '_original' : '';
      const link = document.createElement('a');

      link.href = window.URL.createObjectURL(blob);
      link.download = `${logo.name.replace(/\s+/g, '_')}_logo${suffix}.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(link.href);
    } catch (error: any) {
      console.error('Ошибка при скачивании логотипа:', error);
      alert(error.message || 'Не удалось скачать файл');
    }
  };

  const downloadFile = async (url: string, filename: string) => {
    try {
      // Проверяем, является ли URL локальным файлом
      const isLocalFile = url.startsWith('/generated-logos/') || url.startsWith('./') || url.startsWith('../');
      
      if (isLocalFile) {
        // Для локальных файлов добавляем базовый URL если нужно
        const fullUrl = url.startsWith('/') ? url : `/${url}`;
        
        // Получаем файл как Blob
        const response = await fetch(fullUrl);
        if (!response.ok) {
          throw new Error(`Не удалось загрузить файл: ${response.statusText}`);
        }
        const blob = await response.blob();
        
        // Создаем временную ссылку для скачивания
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = filename;
        
        // Имитируем клик для начала скачивания
        document.body.appendChild(link);
        link.click();
        
        // Очищаемся
        document.body.removeChild(link);
        window.URL.revokeObjectURL(link.href);
      } else {
        // Для внешних URL (например, с Yandex Cloud) используем прямую ссылку
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Не удалось загрузить файл: ${response.statusText}`);
        }
        const blob = await response.blob();
        
        // Создаем временную ссылку для скачивания
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = filename;
        
        // Имитируем клик для начала скачивания
        document.body.appendChild(link);
        link.click();
        
        // Очищаемся
        document.body.removeChild(link);
        window.URL.revokeObjectURL(link.href);
      }
    } catch (error) {
      console.error('Ошибка при скачивании файла:', error);
      
      // Показываем пользователю уведомление об ошибке
      alert(`Не удалось скачать файл: ${filename}. Попробуйте открыть в новой вкладке.`);
      
      // В случае ошибки, просто откроем в новой вкладке как fallback
      try {
        window.open(url, '_blank');
      } catch (openError) {
        console.error('Не удалось открыть файл в новой вкладке:', openError);
        alert('Не удалось открыть файл. Пожалуйста, обратитесь в поддержку.');
      }
    }
  };

  const navigateToBrandbook = (orderId: string) => {
    if (!user) return;
    router.push(`/pages/brandbook/${orderId}`);
  };

  // Показываем загрузку пока проверяем аутентификацию
  if (!mounted || isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Если пользователь не авторизован, показываем заглушку
  if (!user) {
    return null;
  }

  return (
    <>
      <Navbar />
      <main className="pt-16 min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Личный кабинет
            </h1>
            <p className="text-gray-600">
              Добро пожаловать, {user.fullName || user.email.split('@')[0] || 'Пользователь'}!
            </p>
          </div>

          <div className="mb-8">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('logos')}
                  className={`${
                    activeTab === 'logos'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
                >
                  Мои логотипы
                  {logos.length > 0 && (
                    <span className="ml-2 bg-blue-100 text-blue-600 text-xs rounded-full px-2 py-1">
                      {logos.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('brandbooks')}
                  className={`${
                    activeTab === 'brandbooks'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
                >
                  Мои брендбуки
                  {brandbooks.length > 0 && (
                    <span className="ml-2 bg-blue-100 text-blue-600 text-xs rounded-full px-2 py-1">
                      {brandbooks.length}
                    </span>
                  )}
                </button>
              </nav>
            </div>
          </div>

          {activeTab === 'logos' && (
            <div className="tab-content">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">
                Сгенерированные логотипы
              </h2>
              
              {isLoadingLogos ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : logos.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-400 mb-4">
                    <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    У вас пока нет сгенерированных логотипов
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Создайте свой первый логотип, чтобы он появился здесь.
                  </p>
                  <button
                    onClick={() => router.push('/#generator')}
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  >
                    Создать логотип
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {logos.map((logo) => (
                    <div key={logo.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                      <div className="aspect-square bg-gray-100 relative">
                        <Image
                          src={logo.logoUrl}
                          alt={logo.name}
                          fill
                          className="object-contain p-4"
                          onError={(e) => {
                            // Fallback к плейсхолдеру, если изображение не загружается
                            console.warn(`Failed to load logo image: ${logo.logoUrl}`);
                            (e.target as HTMLImageElement).src = '/placeholder-logo.svg';
                          }}
                        />
                        {/* Вотермарка для неоплаченных логотипов */}
                        {!logo.isPaid && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="text-gray-400 text-xl font-bold opacity-50 rotate-[-30deg] select-none" style={{ fontSize: '3rem' }}>
                              PIXORA
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="p-4">
                        <h3 className="text-lg font-semibold text-gray-800 truncate" title={logo.name}>
                          {logo.name}
                        </h3>
                        <p className="text-sm text-gray-500 mb-2 truncate" title={logo.keywords}>
                          {logo.keywords}
                        </p>
                        <p className="text-xs text-gray-400">
                          Создан: {formatDate(logo.createdAt)}
                        </p>
                        <div className="mt-4 flex flex-col space-y-2">
                          {!logo.isPaid ? (
                            <button 
                              onClick={() => router.push(`/pages/payment?product=logo&name=${encodeURIComponent(logo.name)}&keywords=${encodeURIComponent(logo.keywords)}&logoUrl=${encodeURIComponent(logo.logoUrl)}`)}
                              className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                            >
                              Купить за {PRICES.logo} ₽
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => downloadLogo(logo, 'zip')}
                                className="w-full bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors"
                              >
                                Скачать всё (ZIP)
                              </button>
                              <div className="flex gap-2">
                                {logo.hasVector && (
                                  <button
                                    onClick={() => downloadLogo(logo, 'svg')}
                                    className="flex-1 border border-gray-300 text-gray-700 px-2 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                                  >
                                    SVG
                                  </button>
                                )}
                                <button
                                  onClick={() => downloadLogo(logo, 'png')}
                                  className="flex-1 border border-gray-300 text-gray-700 px-2 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                                >
                                  PNG
                                </button>
                                <button
                                  onClick={() => downloadLogo(logo, 'original')}
                                  className="flex-1 border border-gray-300 text-gray-700 px-2 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                                  title="Кадр в том виде, в каком его сгенерировала нейросеть"
                                >
                                  Исходник
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'brandbooks' && (
            <div className="tab-content">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">
                Сгенерированные брендбуки
              </h2>
              
              {isLoadingBrandbooks ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : brandbooks.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-400 mb-4">
                    <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    У вас пока нет сгенерированных брендбуков
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Создайте свой первый брендбук, чтобы он появился здесь.
                  </p>
                  <button
                    onClick={() => router.push('/#generator')}
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  >
                    Создать брендбук
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {brandbooks.map((brandbook) => (
                    <div key={brandbook.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                      <div className="aspect-square bg-gray-100 relative">
                        <Image
                          src={brandbook.originalLogoUrl}
                          alt={brandbook.businessName}
                          fill
                          className="object-contain p-4"
                          onError={(e) => {
                            // Fallback к плейсхолдеру, если изображение не загружается
                            console.warn(`Failed to load brandbook logo image: ${brandbook.originalLogoUrl}`);
                            (e.target as HTMLImageElement).src = '/placeholder-logo.svg';
                          }}
                        />
                      </div>
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {brandbook.businessName}
                          </h3>
                          {/* Кабинет показывает и незавершённые заказы: молча пропадать
                              оплаченный брендбук не должен */}
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            brandbook.status === 'processing'
                              ? 'bg-blue-100 text-blue-800'
                              : brandbook.status === 'failed'
                                ? 'bg-amber-100 text-amber-800'
                                : brandbook.isDemo
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-green-100 text-green-800'
                          }`}>
                            {brandbook.status === 'processing'
                              ? 'Собирается'
                              : brandbook.status === 'failed'
                                ? 'Собран не полностью'
                                : brandbook.isDemo ? 'Демо' : 'Полный'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          {brandbook.slogan}
                        </p>
                        <p className="text-xs text-gray-500 mb-3">
                          {formatDate(brandbook.createdAt)}
                        </p>
                        <button
                          onClick={() => navigateToBrandbook(brandbook.orderId)}
                          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                        >
                          {brandbook.status === 'processing' ? 'Смотреть ход сборки' : 'Открыть брендбук'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <DeleteAccountSection />
        </div>
      </main>
      <Footer />
    </>
  );
}
