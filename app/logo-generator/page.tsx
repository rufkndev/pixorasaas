import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import Faq, { FaqItem } from '../components/landing/Faq';
import LogoStartForm from '../components/landing/LogoStartForm';
import JsonLd from '../components/seo/JsonLd';
import { FREE_GENERATIONS, PRICES, QUOTA_WINDOW_DAYS } from '../lib/legal';
import { BRANDBOOK_SAMPLE_PAGES, BRANDBOOK_SAMPLE_URL, pageMetadata, SITE_URL } from '../lib/site';
import { NICHES } from './_niches';

// Серверная страница без входа: поисковик и ИИ-ассистенты видят весь текст сразу.
// Сам генератор — шаг /pages/logo-generator, он закрыт от индекса
export const metadata: Metadata = pageMetadata({
  title: 'Генератор логотипов онлайн с ИИ',
  description:
    `Создайте логотип для бизнеса с помощью нейросети: ${FREE_GENERATIONS} вариантов бесплатно, название набирается настоящим шрифтом, ` +
    `кириллица без ошибок. Файлы SVG и PNG без водяного знака — ${PRICES.logo} ₽.`,
  path: '/logo-generator',
});

const STEPS = [
  { title: 'Концепция', text: 'Модель выбирает приём (монограмма, предметный знак, эмблема и другие), предмет и палитру под вашу нишу и стиль.' },
  { title: 'Знак', text: 'Нейросеть рисует знак по концепции. Фон убирается, поля обрезаются автоматически.' },
  { title: 'Надпись', text: 'Название набирается настоящим шрифтом с кириллицей, поэтому буквы всегда правильные — нейросеть их не рисует.' },
  { title: 'Вектор', text: 'После оплаты логотип переводится в SVG: его можно масштабировать без потери качества и отдавать в типографию.' },
];

const FILES = [
  'SVG — вектор для печати, сайта и вывесок',
  'PNG 3072 px с прозрачным фоном',
  'JPG на белом фоне',
  'Исходный кадр нейросети',
];

const COMPARISON = [
  { who: 'Pixora', price: `${PRICES.logo} ₽`, time: 'Около минуты на вариант', edits: `${FREE_GENERATIONS} вариантов бесплатно, правок вручную нет` },
  { who: 'Фрилансер', price: 'Обычно от нескольких тысяч ₽', time: 'Несколько дней', edits: 'Правки по договорённости' },
  { who: 'Студия', price: 'Обычно от десятков тысяч ₽', time: 'Недели', edits: 'Бриф, исследование, правки' },
];

const FAQ: FaqItem[] = [
  {
    q: 'Можно ли создать логотип бесплатно?',
    a: `Да. Каждому аккаунту доступно ${FREE_GENERATIONS} генераций логотипа, счётчик обновляется раз в ${QUOTA_WINDOW_DAYS} дней. Бесплатные варианты показываются с водяным знаком. Файлы без него, в высоком разрешении и в векторе стоят ${PRICES.logo} ₽.`,
  },
  {
    q: 'Нейросеть напишет название с ошибками?',
    a: 'Нет. Нейросеть рисует только знак, а название мы набираем настоящим шрифтом на сервере. Поэтому буквы всегда правильные, в том числе кириллица.',
  },
  {
    q: 'В каких форматах я получу логотип?',
    a: 'Векторный SVG, PNG 3072 px с прозрачным фоном, JPG на белом фоне и исходный кадр нейросети. Всё можно скачать одним архивом из личного кабинета.',
  },
  {
    q: 'Что делать, если ни один вариант не понравился?',
    a: 'Ничего не платить и сгенерировать ещё: каждый раз модель берёт другой приём и другой предмет. Помогает сменить стиль или ключевые слова. Ручных правок готового логотипа в сервисе нет.',
  },
  {
    q: 'Можно ли зарегистрировать такой логотип как товарный знак?',
    a: 'Подать заявку в Роспатент можно: способ создания логотипа роли не играет. Роспатент проверяет, не похож ли знак на уже зарегистрированные, поэтому перед подачей стоит проверить сходство. Подробно — в статье блога о товарном знаке из нейросети.',
  },
  {
    q: 'Чем это отличается от работы дизайнера?',
    a: 'Дешевле и быстрее, но без брифа, исследования конкурентов и ручных правок. Для старта, тестовой ниши или небольшого бизнеса этого обычно хватает. Если нужен уникальный фирменный стиль с позиционированием — лучше идти к дизайнеру или в студию.',
  },
  {
    q: 'Что такое брендбук и нужен ли он?',
    a: `Брендбук — правила использования логотипа, цвета, шрифты и макеты носителей. Он стоит ${PRICES.brandbook} ₽ и уже включает файлы логотипа. Можно скачать образец — PDF на ${BRANDBOOK_SAMPLE_PAGES} страниц.`,
  },
];

const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Генератор логотипов Pixora',
  url: `${SITE_URL}/logo-generator`,
  applicationCategory: 'DesignApplication',
  operatingSystem: 'Любой браузер',
  inLanguage: 'ru-RU',
  offers: {
    '@type': 'Offer',
    name: 'Логотип в SVG и PNG',
    price: String(PRICES.logo),
    priceCurrency: 'RUB',
    availability: 'https://schema.org/InStock',
  },
};

export default function LogoGeneratorLanding() {
  return (
    <>
      <Navbar />
      <main className="pt-16">
        <section className="bg-gray-50">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-20">
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
                Генератор логотипов онлайн с ИИ
              </h1>
              <p className="mt-5 text-lg text-gray-700">
                Введите название и пару слов о бизнесе — ИИ сгенерирует логотип, сервер обработает его программно
              </p>
              <p className="mt-3 text-lg text-gray-700">На выходе — подходящее начало вашего бренда.</p>
              <ul className="mt-6 space-y-2 text-gray-700">
                <li>— Кириллица без ошибок: буквы набираются шрифтом, а не рисуются</li>
                <li>— Вектор SVG после оплаты — для печати и вывесок</li>
                <li>— Каждый новый вариант — другой приём и другой предмет</li>
              </ul>
              <p className="mt-6 text-sm text-gray-600">
                Ещё нет названия?{' '}
                <Link href="/name-generator" className="font-medium text-gray-900 underline underline-offset-4">
                  Подберите его в генераторе названий
                </Link>
                , а потом вернитесь к логотипу.
              </p>
            </div>
            <div>
              <LogoStartForm />
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <section className="py-12">
            <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">Как создаётся логотип</h2>
            <ol className="mt-6 grid gap-6 sm:grid-cols-2">
              {STEPS.map((step, index) => (
                <li key={step.title} className="rounded-lg border border-gray-200 p-5">
                  <p className="text-sm font-semibold text-gray-500">Шаг {index + 1}</p>
                  <h3 className="mt-1 text-lg font-bold text-gray-900">{step.title}</h3>
                  <p className="mt-2 text-gray-700">{step.text}</p>
                </li>
              ))}
            </ol>
          </section>

          <section className="py-12">
            <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">Логотип для вашей ниши</h2>
            <p className="mt-3 text-gray-700">
              Где будет жить логотип, какие приёмы работают и каких штампов избегать — разобрали для частых случаев.
            </p>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {NICHES.map((niche) => (
                <li key={niche.slug}>
                  <Link
                    href={`/logo-generator/${niche.slug}`}
                    className="block h-full rounded-lg border border-gray-200 p-4 font-medium text-gray-900 hover:border-gray-400"
                  >
                    {niche.h1}
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className="py-12">
            <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">Пример: логотип и брендбук CodeDash</h2>
            <div className="mt-6 grid items-center gap-8 md:grid-cols-2">
              <div className="flex items-center justify-center gap-5 rounded-lg border border-gray-200 bg-white p-10">
                <img src="/samples/codedash-mark.svg" alt="Знак логотипа CodeDash, созданный в Pixora" className="h-24 w-24" />
                <span className="text-4xl font-bold text-[#0b3d33]">CodeDash</span>
              </div>
              <div className="text-gray-700">
                <p>
                  Логотип для школы программирования, собранный нашим генератором. Из него же собран брендбук:
                  версии логотипа, палитра, шрифты, иконки и макеты носителей.
                </p>
                <a
                  href={BRANDBOOK_SAMPLE_URL}
                  target="_blank"
                  rel="noopener"
                  className="mt-4 inline-block rounded-md border border-gray-900 px-4 py-2 font-medium text-gray-900 hover:bg-gray-900 hover:text-white"
                >
                  Открыть образец брендбука (PDF, {BRANDBOOK_SAMPLE_PAGES} страниц)
                </a>
              </div>
            </div>
          </section>

          <section className="py-12">
            <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">Что входит в логотип за {PRICES.logo} ₽</h2>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {FILES.map((file) => (
                <li key={file} className="rounded-md bg-gray-50 p-4 text-gray-800">
                  {file}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-gray-700">
              Брендбук за {PRICES.brandbook} ₽ уже включает все файлы логотипа, плюс семь его версий, фирменные цвета,
              шрифты, иконки и макеты визитки, постов и презентации.{' '}
              <Link href="/pages/pricing" className="font-medium text-gray-900 underline underline-offset-4">
                Подробнее о ценах
              </Link>
            </p>
          </section>

          <section className="py-12">
            <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">Генератор, фрилансер или студия</h2>
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-300 text-gray-500">
                    <th className="py-3 pr-4 font-medium">Кто делает</th>
                    <th className="py-3 pr-4 font-medium">Цена</th>
                    <th className="py-3 pr-4 font-medium">Срок</th>
                    <th className="py-3 font-medium">Варианты и правки</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON.map((row) => (
                    <tr key={row.who} className="border-b border-gray-200 text-gray-800">
                      <td className="py-3 pr-4 font-semibold">{row.who}</td>
                      <td className="py-3 pr-4">{row.price}</td>
                      <td className="py-3 pr-4">{row.time}</td>
                      <td className="py-3">{row.edits}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-gray-700">
              Подробный разбор цен —{' '}
              <Link href="/blog/skolko-stoit-logotip" className="font-medium text-gray-900 underline underline-offset-4">
                сколько стоит логотип в 2026 году
              </Link>
              .
            </p>
          </section>

          <Faq items={FAQ} />
        </div>
      </main>
      <Footer />
      <JsonLd data={structuredData} />
    </>
  );
}
