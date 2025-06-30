/**
 * Страница "Цены" (Pricing)
 * 
 * Этот файл содержит компонент страницы с информацией о тарифах и ценах на услуги Pixora.
 * Страница отображает доступные тарифные планы с подробным описанием включенных функций
 * и преимуществ каждого плана.
 * 
 * Страница включает:
 * - Заголовок и подзаголовок
 * - Карточки тарифов (Логотип за 999₽ и Полный брендбук за 1999₽)
 * - Списки включенных функций для каждого тарифа
 * - Кнопки для выбора тарифа
 * - Секцию с призывом связаться для получения дополнительной информации
 * 
 * Эта страница помогает пользователям понять ценовую политику сервиса и выбрать
 * подходящий тарифный план в соответствии с их потребностями.
 */

import Link from 'next/link';

// Компонент страницы "Цены"
export default function PricingPage() {
  return (
    <main className="pt-16">
      {/* Секция с заголовком */}
      <div className="bg-gray-50 py-12 sm:py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl lg:text-5xl">
              Цены
            </h1>
            <p className="mt-4 text-lg text-gray-700 max-w-3xl mx-auto">
              Доступные тарифы для создания профессионального бренда
            </p>
          </div>
        </div>
      </div>

      {/* Основное содержимое страницы с тарифами */}
      <div className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
            {/* Тарифный план: Логотип */}
            <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
              <div className="px-6 py-8">
                <h2 className="text-2xl font-bold text-gray-900 text-center">Логотип</h2>
                <p className="mt-4 text-gray-700 text-center">
                  Профессиональный логотип для вашего бизнеса
                </p>
                <p className="mt-4 text-5xl font-extrabold text-gray-900 text-center">
                  999 ₽
                </p>
                {/* Список включенных функций */}
                <ul className="mt-8 space-y-4">
                  <li className="flex items-start">
                    <svg className="h-6 w-6 text-green-500 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="ml-3 text-gray-700">Генерация уникального логотипа</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="h-6 w-6 text-green-500 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="ml-3 text-gray-700">Высокое разрешение (SVG, PNG)</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="h-6 w-6 text-green-500 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="ml-3 text-gray-700">Неограниченные правки</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="h-6 w-6 text-green-500 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="ml-3 text-gray-700">Полные права на использование</span>
                  </li>
                </ul>
              </div>
              {/* Кнопка выбора тарифа */}
              <div className="px-6 py-8 bg-gray-50 border-t border-gray-200">
                <Link
                  href="/"
                  className="block w-full text-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-white bg-gray-900 hover:bg-gray-800"
                >
                  Выбрать
                </Link>
              </div>
            </div>

            {/* Тарифный план: Полный брендбук */}
            <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200 relative">
              {/* Метка "Популярный выбор" */}
              <div className="absolute top-0 right-0 bg-gray-900 text-white px-4 py-1 rounded-bl-lg text-sm font-medium">
                Популярный выбор
              </div>
              <div className="px-6 py-8">
                <h2 className="text-2xl font-bold text-gray-900 text-center">Полный брендбук</h2>
                <p className="mt-4 text-gray-700 text-center">
                  Комплексное решение для вашего бренда
                </p>
                <p className="mt-4 text-5xl font-extrabold text-gray-900 text-center">
                  1999 ₽
                </p>
                {/* Список включенных функций */}
                <ul className="mt-8 space-y-4">
                  <li className="flex items-start">
                    <svg className="h-6 w-6 text-green-500 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="ml-3 text-gray-700">Генерация названия бизнеса</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="h-6 w-6 text-green-500 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="ml-3 text-gray-700">Уникальный логотип</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="h-6 w-6 text-green-500 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="ml-3 text-gray-700">Фирменные цвета и шрифты</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="h-6 w-6 text-green-500 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="ml-3 text-gray-700">Руководство по использованию</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="h-6 w-6 text-green-500 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="ml-3 text-gray-700">Примеры применения бренда</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="h-6 w-6 text-green-500 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="ml-3 text-gray-700">Приоритетная поддержка</span>
                  </li>
                </ul>
              </div>
              {/* Кнопка выбора тарифа */}
              <div className="px-6 py-8 bg-gray-50 border-t border-gray-200">
                <Link
                  href="/"
                  className="block w-full text-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-white bg-gray-900 hover:bg-gray-800"
                >
                  Выбрать
                </Link>
              </div>
            </div>
          </div>

          {/* Секция с призывом связаться для получения дополнительной информации */}
          <div className="mt-16 text-center">
            <p className="text-gray-700 mb-4">
              Остались вопросы по тарифам? Свяжитесь с нами!
            </p>
            <Link 
              href="/pages/contact"
              className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-white bg-gray-900 hover:bg-gray-800"
            >
              Связаться с нами
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
} 