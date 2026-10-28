import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import NameGenerator from '../components/home/NameGenerator';
import Faq, { FaqItem } from '../components/landing/Faq';
import JsonLd from '../components/seo/JsonLd';
import { FREE_GENERATIONS, QUOTA_WINDOW_DAYS } from '../lib/legal';
import { pageMetadata, SITE_URL } from '../lib/site';

export const metadata: Metadata = pageMetadata({
  title: 'Генератор названий для бизнеса с ИИ',
  description:
    'Придумайте название для компании, магазина или ООО с помощью нейросети: шесть вариантов разными приёмами нейминга, ' +
    `кириллица или латиница, пояснение к каждому. ${FREE_GENERATIONS} генераций бесплатно.`,
  path: '/name-generator',
});

const TECHNIQUES = [
  { title: 'Неологизм', text: 'Новое слово из знакомых корней — легко зарегистрировать и найти свободный домен.' },
  { title: 'Составное деловое', text: 'Два понятных слова, которые сразу объясняют, чем вы заняты. Хорошо звучит в связке ООО «…».' },
  { title: 'Фамильное', text: 'Название от имени или фамилии — для мастерских, бюро, частной практики.' },
  { title: 'Аббревиатура', text: 'Короткая форма для компаний, которые работают с другим бизнесом.' },
  { title: 'Метафора', text: 'Образ, связанный с ценностью для клиента, а не с самим товаром.' },
  { title: 'Географическое', text: 'Привязка к месту — для локального бизнеса: кафе, сервисов, магазинов.' },
];

const CHECKLIST = [
  'Нет ли компании с похожим названием в той же сфере — в ЕГРЮЛ',
  'Не зарегистрирован ли похожий товарный знак — в базах Роспатента',
  'Свободен ли домен в зоне .ru и аккаунты в нужных соцсетях',
  'Как название читается вслух и не значит ли что-то неприятное на других языках',
];

const FAQ: FaqItem[] = [
  {
    q: 'Это бесплатно?',
    a: `Да. Каждому аккаунту доступно ${FREE_GENERATIONS} генераций названий, счётчик обновляется раз в ${QUOTA_WINDOW_DAYS} дней. За одну генерацию вы получаете шесть названий. Платить за названия не нужно — платными бывают только файлы логотипа и брендбук.`,
  },
  {
    q: 'Почему названия получаются разными?',
    a: 'Мы не просим нейросеть «придумать шесть названий». Сервер раздаёт ей разные приёмы нейминга — неологизм, составное слово, аббревиатуру и другие, — и каждое название делается своим приёмом. Кнопка «Ещё варианты» не повторяет уже показанное.',
  },
  {
    q: 'Можно ли получить название латиницей для ООО?',
    a: 'Да, в генераторе можно выбрать латиницу. Но полное наименование ООО по закону должно быть на русском языке: иностранное слово записывается русскими буквами, например «Пиксора». Латинское написание можно указать в уставе дополнительно.',
  },
  {
    q: 'Сервис проверяет, свободно ли название?',
    a: 'Нет, проверку занятости мы не делаем. Перед регистрацией проверьте название в ЕГРЮЛ, в базах товарных знаков Роспатента и среди доменов. Как это сделать за 15 минут — в статье блога.',
  },
  {
    q: 'Что делать после выбора названия?',
    a: 'Нажмите «Перейти к генерации логотипа» — название и ключевые слова перейдут в генератор логотипов автоматически.',
  },
];

const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Генератор названий Pixora',
  url: `${SITE_URL}/name-generator`,
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Любой браузер',
  inLanguage: 'ru-RU',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'RUB' },
};

export default function NameGeneratorLanding() {
  return (
    <>
      <Navbar />
      <main className="pt-16">
        {/* Тот же фон, что у формы: заголовок и генератор читаются одним блоком */}
        <section className="bg-gray-50">
          <div className="mx-auto max-w-3xl px-4 pt-12 text-center sm:px-6 lg:px-8 lg:pt-20">
            <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
              Генератор названий для бизнеса с ИИ
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg text-gray-700">
              Опишите нишу, выберите стиль логотипа и укажите дополнительную информацию — получите шесть названий
              разными приёмами нейминга
            </p>
          </div>
        </section>

        <NameGenerator withHeading={false} />

        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <section className="py-12">
            <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">Какими приёмами придумываются названия</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {TECHNIQUES.map((item) => (
                <div key={item.title} className="rounded-lg border border-gray-200 p-5">
                  <h3 className="font-bold text-gray-900">{item.title}</h3>
                  <p className="mt-2 text-sm text-gray-700">{item.text}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-gray-700">
              Стиль меняет и тон, и набор приёмов: у «профессионального» названия должны хорошо звучать в связке
              ООО «…», у «игривого» — легко запоминаться.{' '}
              <Link href="/blog/kak-pridumat-nazvanie-dlya-ooo" className="font-medium text-gray-900 underline underline-offset-4">
                Как придумать название для ООО
              </Link>
            </p>
          </section>

          <section className="py-12">
            <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">Что проверить, прежде чем регистрировать</h2>
            <ul className="mt-6 space-y-3 text-gray-700">
              {CHECKLIST.map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="text-gray-400">—</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-gray-700">
              Пошагово —{' '}
              <Link href="/blog/kak-proverit-nazvanie-biznesa" className="font-medium text-gray-900 underline underline-offset-4">
                как проверить название бизнеса перед регистрацией
              </Link>
              . Когда название выбрано, переходите к{' '}
              <Link href="/logo-generator" className="font-medium text-gray-900 underline underline-offset-4">
                генератору логотипов
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
