/**
 * Страница "О нас" (About Us)
 * 
 * Этот файл содержит компонент страницы "О нас", который предоставляет информацию
 * о компании Pixora, ее миссии, ценностях и используемых технологиях.
 * 
 * Страница включает:
 * - Заголовок и подзаголовок
 * - Раздел о миссии компании
 * - Информацию о технологиях, используемых в сервисе
 * - Кнопку для возврата на главную страницу
 * 
 * Эта страница помогает пользователям понять ценности компании и технологии,
 * лежащие в основе сервиса, что повышает доверие к бренду.
 */

import Link from 'next/link';
import Image from 'next/image';

/**
 * Компонент страницы "О нас"
 * 
 * @returns {JSX.Element} Компонент страницы "О нас"
 */
export default function AboutPage() {
  return (
    <main className="pt-16">
      {/* Секция с заголовком */}
      <div className="bg-gray-50 py-12 sm:py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl lg:text-5xl">
              О компании Pixora
            </h1>
            <p className="mt-4 text-lg text-gray-700 max-w-3xl mx-auto">
              Мы создаем инновационные решения для брендинга с использованием искусственного интеллекта
            </p>
          </div>
        </div>
      </div>

      {/* Основное содержимое страницы */}
      <div className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Раздел о миссии компании */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">
                Наша миссия
              </h2>
              <p className="mt-4 text-lg text-gray-700">
                Pixora была основана с целью сделать профессиональный брендинг доступным для всех. 
                Мы верим, что каждый бизнес заслуживает качественного визуального представления, 
                независимо от его размера или бюджета.
              </p>
              <p className="mt-4 text-lg text-gray-700">
                Используя передовые технологии искусственного интеллекта, мы автоматизировали процесс 
                создания названий, логотипов и брендбуков, сохраняя при этом высокое качество и уникальность результатов.
              </p>
            </div>
            {/* Изображение логотипа */}
            <div className="relative h-64 lg:h-96 rounded-lg overflow-hidden shadow-lg">
              <div className="absolute inset-0 bg-gradient-to-r from-gray-800 to-gray-900 flex items-center justify-center">
                <div className="relative h-32 w-32">
                  <Image
                    src="/logo.svg"
                    alt="Pixora Logo"
                    fill
                    className="object-contain"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Раздел о технологиях */}
          <div className="mt-16">
            <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl text-center">
              Наши технологии
            </h2>
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Карточка технологии: Генерация названий */}
              <div className="bg-gray-50 p-6 rounded-lg shadow-sm">
                <h3 className="text-xl font-semibold text-gray-900">Генерация названий</h3>
                <p className="mt-2 text-gray-700">
                  Наши алгоритмы анализируют тысячи успешных брендов и создают уникальные, 
                  запоминающиеся названия, соответствующие вашей нише и ценностям.
                </p>
              </div>
              {/* Карточка технологии: Создание логотипов */}
              <div className="bg-gray-50 p-6 rounded-lg shadow-sm">
                <h3 className="text-xl font-semibold text-gray-900">Создание логотипов</h3>
                <p className="mt-2 text-gray-700">
                  Используя нейронные сети, мы генерируем профессиональные логотипы, 
                  которые отражают сущность вашего бренда и выделяются среди конкурентов.
                </p>
              </div>
              {/* Карточка технологии: Разработка брендбуков */}
              <div className="bg-gray-50 p-6 rounded-lg shadow-sm">
                <h3 className="text-xl font-semibold text-gray-900">Разработка брендбуков</h3>
                <p className="mt-2 text-gray-700">
                  Мы создаем полноценные руководства по использованию бренда, включая 
                  цветовые палитры, типографику и правила применения логотипа.
                </p>
              </div>
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