import Link from 'next/link';
import { FREE_GENERATIONS, PRICES } from '../../lib/legal';
import { BRANDBOOK_SAMPLE_PAGES, BRANDBOOK_SAMPLE_URL } from '../../lib/site';

// Заменил блок с отзывами: отзывы были выдуманы, а это риск по закону о рекламе
// и минус доверия у поисковиков. Здесь только то, что сервис делает на самом деле
const STEPS = [
  {
    title: 'Название',
    text: 'Опишите нишу и пару ключевых слов — получите шесть названий разными приёмами нейминга, у каждого короткое пояснение.',
    href: '/name-generator',
    link: 'Генератор названий',
  },
  {
    title: 'Логотип',
    text: 'ИИ рисует знак, а название набирается настоящим шрифтом, поэтому буквы всегда правильные, в том числе кириллица.',
    href: '/logo-generator',
    link: 'Генератор логотипов',
  },
  {
    title: 'Брендбук',
    text: 'Из купленного логотипа собирается PDF: версии логотипа, цвета, шрифты, иконки, макеты визитки и соцсетей.',
    href: BRANDBOOK_SAMPLE_URL,
    link: `Образец брендбука, PDF на ${BRANDBOOK_SAMPLE_PAGES} страниц`,
  },
];

export default function HowItWorks() {
  return (
    <section className="bg-white py-12 sm:py-16 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">Как это работает</h2>
          <p className="mt-4 text-lg text-gray-700">
            {FREE_GENERATIONS} генераций названий и {FREE_GENERATIONS} генераций логотипа бесплатно. Платите, только
            если результат понравился: логотип — {PRICES.logo} ₽, брендбук — {PRICES.brandbook} ₽.
          </p>
        </div>

        <ol className="mt-12 grid gap-8 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step.title} className="rounded-lg bg-gray-50 p-6 border border-gray-200">
              <p className="text-sm font-semibold text-gray-500">Шаг {index + 1}</p>
              <h3 className="mt-1 text-xl font-bold text-gray-900">{step.title}</h3>
              <p className="mt-3 text-gray-700">{step.text}</p>
              <Link href={step.href} className="mt-4 inline-block font-medium text-gray-900 underline underline-offset-4">
                {step.link}
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
