/* Страница "Связаться с нами" (Contact Us)
 * 
 * Этот файл содержит компонент страницы контактов, который позволяет пользователям
 * связаться с компанией через контактную форму. Страница также отображает
 * контактную информацию и часто задаваемые вопросы.*/

"use client";
import React from 'react';
import { useState } from 'react';
import Link from 'next/link';
import axios from 'axios';


// Компонент страницы "Связаться с нами"
export default function ContactPage() {
  // Состояния для управления формой
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Обработчик отправки формы
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await axios.post('/api/send-contact', {
        name,
        email,
        message
      });

      if (response.data.success) {
        setSubmitted(true);
        // Очищаем поля формы
        setName('');
        setEmail('');
        setMessage('');
      }
    } catch (error: any) {
      console.error('Error sending contact message:', error);
      setError(error.response?.data?.error || 'Произошла ошибка при отправке сообщения');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="pt-16">
      {/* Секция с заголовком */}
      <div className="bg-gray-50 py-12 sm:py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl lg:text-5xl">
              Связаться с нами
            </h1>
            <p className="mt-4 text-lg text-gray-700 max-w-3xl mx-auto">
              У вас есть вопросы или предложения? Мы всегда рады помочь!
            </p>
          </div>
        </div>
      </div>

      {/* Основное содержимое страницы */}
      <div className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Левая колонка: контактная информация и FAQ */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Контактная информация</h2>
              <p className="mt-4 text-lg text-gray-700">
                Мы стремимся ответить на все запросы в течение 24 часов.
              </p>

              {/* Блок с контактной информацией */}
              <div className="mt-8 space-y-6">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-gray-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="ml-3 text-gray-700">
                    <p className="text-sm font-medium text-gray-900">Email</p>
                    <p className="mt-1">
                      <a href="mailto:arttaranovbusiness@gmail.com" className="hover:text-gray-900">
                        arttaranovbusiness@gmail.com
                      </a>
                    </p>
                  </div>
                </div>

                {/* Телефон */}
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-gray-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h2l2 7h6l2-7h2" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 15a4 4 0 01-8 0" />
                    </svg>
                  </div>
                  <div className="ml-3 text-gray-700">
                    <p className="text-sm font-medium text-gray-900">Телефон</p>
                    <p className="mt-1">
                      <a href="tel:+79621206360" className="hover:text-gray-900">+7 (962) 120-63-60</a>
                    </p>
                  </div>
                </div>

                {/* Адрес */}
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-gray-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 21l-5-5-5 5V5a2 2 0 012-2h6a2 2 0 012 2z" />
                    </svg>
                  </div>
                  <div className="ml-3 text-gray-700">
                    <p className="text-sm font-medium text-gray-900">Адрес</p>
                    <p className="mt-1">693006, Россия, Сахалинская Обл, г. Южно-Сахалинск, ул. Ленина, д. 327А, кв. 4</p>
                  </div>
                </div>

                {/* Реквизиты */}
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-gray-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l2-2 4 4m0 0l2-2 4 4" />
                    </svg>
                  </div>
                  <div className="ml-3 text-gray-700 text-sm">
                    <p className="font-medium text-gray-900">Реквизиты ИП Таранов Артём Игоревич</p>
                    <p className="mt-1">ИНН: 650302923331</p>
                    <p>ОГРНИП: 325650000017843</p>
                  </div>
                </div>
              </div>

              {/* Раздел с часто задаваемыми вопросами */}
              <div className="mt-12">
                <h3 className="text-lg font-medium text-gray-900">Часто задаваемые вопросы</h3>
                <div className="mt-4 space-y-6">
                  {/* FAQ 1 */}
                  <div>
                    <h4 className="text-base font-medium text-gray-900">Как быстро я получу результаты?</h4>
                    <p className="mt-2 text-gray-700">
                      Генерация названий и логотипов происходит в течение нескольких минут. Полный брендбук обычно готов в течение 5-10 минут.
                    </p>
                  </div>
                  {/* FAQ 2 */}
                  <div>
                    <h4 className="text-base font-medium text-gray-900">Могу ли я запросить изменения?</h4>
                    <p className="mt-2 text-gray-700">
                      Да, во время генерации, вы сможете запросить до 10 изменений, чего вполне достаточно для того, чтобы получить результат, который вам нравится.
                    </p>
                  </div>
                  {/* FAQ 3 */}
                  <div>
                    <h4 className="text-base font-medium text-gray-900">Какие форматы файлов я получу?</h4>
                    <p className="mt-2 text-gray-700">
                      Мы предоставляем исходные файлы в форматах SVG и PNG.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Правая колонка: форма обратной связи или сообщение об успешной отправке */}
            <div>
              {submitted ? (
                // Сообщение об успешной отправке формы
                <div className="bg-green-50 p-8 rounded-lg border border-green-200 text-center">
                  <svg className="h-12 w-12 text-green-500 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="mt-4 text-xl font-medium text-gray-900">Сообщение отправлено</h3>
                  <p className="mt-2 text-gray-700">
                    Спасибо за ваше сообщение! Мы свяжемся с вами в ближайшее время.
                  </p>
                  <button
                    onClick={() => {
                      setName('');
                      setEmail('');
                      setMessage('');
                      setSubmitted(false);
                      setError('');
                    }}
                    className="mt-6 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gray-900 hover:bg-gray-800"
                  >
                    Отправить еще сообщение
                  </button>
                </div>
              ) : (
                // Форма обратной связи
                <form onSubmit={handleSubmit} className="bg-gray-50 p-8 rounded-lg border border-gray-200">
                  <h2 className="text-2xl font-bold text-gray-900">Отправить сообщение</h2>
                  {error && (
                    <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-4">
                      <p className="text-sm text-red-600">{error}</p>
                    </div>
                  )}
                  <div className="mt-6 space-y-6">
                    {/* Поле для ввода имени */}
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                        Ваше имя
                      </label>
                      <div className="mt-1">
                        <input
                          type="text"
                          id="name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="shadow-sm focus:ring-gray-500 focus:border-gray-500 block w-full sm:text-sm border-gray-300 rounded-md p-3"
                          required
                        />
                      </div>
                    </div>
                    {/* Поле для ввода email */}
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                        Ваш email
                      </label>
                      <div className="mt-1">
                        <input
                          type="email"
                          id="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="shadow-sm focus:ring-gray-500 focus:border-gray-500 block w-full sm:text-sm border-gray-300 rounded-md p-3"
                          required
                        />
                      </div>
                    </div>
                    {/* Поле для ввода сообщения */}
                    <div>
                      <label htmlFor="message" className="block text-sm font-medium text-gray-700">
                        Ваше сообщение
                      </label>
                      <div className="mt-1">
                        <textarea
                          id="message"
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          rows={6}
                          className="shadow-sm focus:ring-gray-500 focus:border-gray-500 block w-full sm:text-sm border-gray-300 rounded-md p-3"
                          required
                        />
                      </div>
                    </div>
                    {/* Кнопка отправки формы */}
                    <div>
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isLoading ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Отправляется...
                          </>
                        ) : (
                          'Отправить'
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* Кнопка для возврата на главную страницу */}
          <div className="mt-16 text-center">
            <Link 
              href="/"
              className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-white bg-gray-900 hover:bg-gray-800"
            >
              Вернуться на главную
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
} 