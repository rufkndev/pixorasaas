"use client";

import React from 'react';
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import LoginButton from '../../components/auth/LoginButton';
import { useRouter } from 'next/navigation';

export default function NameGenerator() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const [keywords, setKeywords] = useState('');
  const [industry, setIndustry] = useState('');
  const [style, setStyle] = useState('');
  const [preferences, setPreferences] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedNames, setGeneratedNames] = useState<string[]>([]);
  const [selectedName, setSelectedName] = useState('');
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);
  const [apiWarning, setApiWarning] = useState('');

  // Предотвращаем гидратацию, устанавливая mounted только после первого рендера
  useEffect(() => {
    setMounted(true);
  }, []);

  // Функция для генерации названий через API
  const generateNames = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setApiWarning('');
    
    if (!user) {
      setError('Пожалуйста, войдите в систему, чтобы сгенерировать названия');
      return;
    }
    
    if (!industry || !keywords || !style) {
      setError('Пожалуйста, заполните все обязательные поля');
      return;
    }
    
    setIsGenerating(true);
    
    try {
      const apiUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/generate-names`;
      console.log('Sending request to:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          industry,
          keywords,
          style,
          preferences,
          userId: user.id
        }),
      });
      
      const data = await response.json();
      console.log('API response:', data);
      
      if (!response.ok) {
        let errorMessage = data.error || 'Ошибка при генерации названий';
        if (data.details) {
          errorMessage += `: ${JSON.stringify(data.details)}`;
        }
        if (data.message) {
          errorMessage += ` (${data.message})`;
        }
        throw new Error(errorMessage);
      }
      
      if (data.warning) {
        setApiWarning(data.warning);
      }
      
      if (!data.names || data.names.length === 0) {
        throw new Error('Не удалось получить названия от сервера');
      }
      
      setGeneratedNames(data.names);
    } catch (err: any) {
      console.error('Error generating names:', err);
      setError(`Произошла ошибка при генерации названий: ${err.message || 'Неизвестная ошибка'}. Пожалуйста, попробуйте еще раз.`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleNameSelection = (name: string) => {
    setSelectedName(name);
  };

  const proceedToNextStep = () => {
    if (selectedName && keywords) {
      router.push(`/pages/logo-generator?name=${encodeURIComponent(selectedName)}&keywords=${encodeURIComponent(keywords)}&industry=${encodeURIComponent(industry)}&style=${encodeURIComponent(style)}`);
    }
  };

  // Функция для проверки статуса сервера
  const checkServerStatus = async () => {
    try {
      const apiUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/health`;
      const response = await fetch(apiUrl);
      const data = await response.json();
      
      if (response.ok && data.status === 'ok') {
        console.log('Server is running:', data);
        return true;
      } else {
        console.error('Server health check failed:', data);
        return false;
      }
    } catch (err) {
      console.error('Server health check error:', err);
      return false;
    }
  };

  // Проверяем статус сервера при монтировании компонента
  useEffect(() => {
    if (mounted) {
      checkServerStatus().then(isRunning => {
        if (!isRunning) {
          setError('Сервер генерации названий недоступен. Пожалуйста, убедитесь, что сервер запущен командой "npm run server".');
        }
      });
    }
  }, [mounted]);

  // Компонент скелетона для состояния загрузки
  const LoadingSkeleton = () => (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
      <div className="h-8 w-3/4 mx-auto bg-gray-200 animate-pulse rounded-md mb-6"></div>
      <div className="space-y-4">
        <div className="h-10 w-full bg-gray-200 animate-pulse rounded-md"></div>
        <div className="h-10 w-full bg-gray-200 animate-pulse rounded-md"></div>
        <div className="h-10 w-full bg-gray-200 animate-pulse rounded-md"></div>
        <div className="h-24 w-full bg-gray-200 animate-pulse rounded-md"></div>
        <div className="h-12 w-full bg-gray-200 animate-pulse rounded-md"></div>
      </div>
    </div>
  );

  return (
    <section id="generator" className="py-12 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Создайте идеальное название для вашего бизнеса
          </h2>
          <p className="mt-4 text-lg text-gray-700">
            Введите информацию о вашем бизнесе, и мы сгенерируем уникальные названия
          </p>
        </div>

        <div className="mt-12 max-w-lg mx-auto">
          {!mounted ? (
            <LoadingSkeleton />
          ) : !user && !isAuthLoading ? (
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 text-center">
              <p className="mb-4 text-gray-700">Войдите в систему, чтобы сгенерировать названия для вашего бизнеса</p>
              <LoginButton className="mx-auto" />
            </div>
          ) : isAuthLoading ? (
            <LoadingSkeleton />
          ) : generatedNames.length === 0 ? (
            <form onSubmit={generateNames} className="space-y-6 bg-white p-6 rounded-lg shadow-md border border-gray-200">
              {error && (
                <div className="p-3 bg-red-50 text-red-700 rounded-md border border-red-200">
                  {error}
                </div>
              )}
              
              <div>
                <label htmlFor="industry" className="block text-sm font-medium text-gray-700">
                  Ниша бизнеса <span className="text-red-500">*</span>
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    id="industry"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="shadow-sm focus:ring-gray-500 focus:border-gray-500 block w-full sm:text-sm border-gray-300 rounded-md p-3"
                    placeholder="Например: IT, ресторан, салон красоты"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="keywords" className="block text-sm font-medium text-gray-700">
                  Ключевые слова <span className="text-red-500">*</span>
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    id="keywords"
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    className="shadow-sm focus:ring-gray-500 focus:border-gray-500 block w-full sm:text-sm border-gray-300 rounded-md p-3"
                    placeholder="Например: инновации, экология, технологии"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="style" className="block text-sm font-medium text-gray-700">
                  Стиль <span className="text-red-500">*</span>
                </label>
                <div className="mt-1">
                  <select
                    id="style"
                    value={style}
                    onChange={(e) => setStyle(e.target.value)}
                    className="shadow-sm focus:ring-gray-500 focus:border-gray-500 block w-full sm:text-sm border-gray-300 rounded-md p-3"
                    required
                  >
                    <option value="">Выберите стиль</option>
                    <option value="modern">Современный</option>
                    <option value="classic">Классический</option>
                    <option value="creative">Креативный</option>
                    <option value="professional">Профессиональный</option>
                    <option value="playful">Игривый</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="preferences" className="block text-sm font-medium text-gray-700">
                  Дополнительная информация
                </label>
                <div className="mt-1">
                  <textarea
                    id="preferences"
                    value={preferences}
                    onChange={(e) => setPreferences(e.target.value)}
                    rows={3}
                    className="shadow-sm focus:ring-gray-500 focus:border-gray-500 block w-full sm:text-sm border-gray-300 rounded-md p-3"
                    placeholder="Любые дополнительные пожелания или информация"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isGenerating}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
                >
                  {isGenerating ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Генерация...
                    </>
                  ) : (
                    'Сгенерировать названия'
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-6 bg-white p-6 rounded-lg shadow-md border border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Выберите название, которое вам нравится:</h3>
              
              {apiWarning && (
                <div className="p-3 bg-yellow-50 text-yellow-700 rounded-md border border-yellow-200 text-sm">
                  {apiWarning}
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                {generatedNames.map((name, index) => (
                  <div 
                    key={index}
                    onClick={() => handleNameSelection(name)}
                    className={`p-4 border rounded-md cursor-pointer transition-colors ${
                      selectedName === name 
                        ? 'border-gray-700 bg-gray-100' 
                        : 'border-gray-300 hover:border-gray-500'
                    }`}
                  >
                    <p className="text-center font-medium">{name}</p>
                  </div>
                ))}
              </div>
              
              <div className="flex justify-between pt-4">
                <button
                  onClick={() => setGeneratedNames([])}
                  className="py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Назад
                </button>
                
                <button
                  onClick={proceedToNextStep}
                  disabled={!selectedName}
                  className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
                >
                  Перейти к генерации логотипа и брендбука
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
} 