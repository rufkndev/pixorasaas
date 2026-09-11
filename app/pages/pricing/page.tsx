import Link from 'next/link';

import Navbar from '../../components/layout/Navbar';
import Footer from '../../components/layout/Footer';
import { PRICES, FREE_GENERATIONS, QUOTA_WINDOW_DAYS } from '../../lib/legal';
export default function PricingPage() {
  return (
    <>
    <Navbar />
    <main className="pt-16">
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
                  {PRICES.logo} ₽
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
                    <span className="ml-3 text-gray-700">Скачивание без вотермарки</span>
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
                  {PRICES.brandbook} ₽
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
                    <span className="ml-3 text-gray-700">Генерация уникального логотипа</span>
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
                    <span className="ml-3 text-gray-700">Руководство по использованию брендинга</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="h-6 w-6 text-green-500 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="ml-3 text-gray-700">Примеры применения бренда(макеты и шаблоны)</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="h-6 w-6 text-green-500 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="ml-3 text-gray-700">Скачивание в SVG и PNG, без вотермарки, в высоком разрешении</span>
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

          {/* Правила бесплатных генераций: пользователь должен понимать,
              почему счётчик закончился и когда вернётся */}
          <div className="mt-16 max-w-3xl mx-auto bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-3">Бесплатные генерации</h2>
            <p className="text-gray-700 mb-4">
              Попробовать сервис можно бесплатно и без оплаты картой: каждому аккаунту доступно{' '}
              <strong>{FREE_GENERATIONS} генераций названий</strong> и{' '}
              <strong>{FREE_GENERATIONS} генераций логотипа</strong>. Этого достаточно, чтобы
              оценить качество до покупки.
            </p>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start">
                <span className="mr-2 text-gray-400">—</span>
                Счётчик <strong>обновляется автоматически раз в {QUOTA_WINDOW_DAYS} дней</strong>.
                Отсчёт идёт от первой генерации, дату обновления видно прямо в генераторе.
              </li>
              <li className="flex items-start">
                <span className="mr-2 text-gray-400">—</span>
                Оплата логотипа или брендбука <strong>сразу возвращает все генерации</strong> и
                начинает новый период.
              </li>
              <li className="flex items-start">
                <span className="mr-2 text-gray-400">—</span>
                Бесплатные логотипы показываются с водяным знаком. Файлы без него, в высоком
                разрешении и в векторе, открываются после оплаты.
              </li>
            </ul>
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
    <Footer />
    </>
  );
} 