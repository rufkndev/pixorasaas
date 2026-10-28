import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import Faq, { FaqItem } from '../components/landing/Faq';
import JsonLd from '../components/seo/JsonLd';
import { FREE_GENERATIONS, PRICES } from '../lib/legal';
import { absoluteUrl, BRANDBOOK_SAMPLE_PAGES, BRANDBOOK_SAMPLE_URL, pageMetadata, SITE_URL } from '../lib/site';

// Витрина брендбука для поиска. Рабочий шаг — /pages/brandbook-generator, он под noindex
// и без логотипа пустой, поэтому продающей страницы под «брендбук онлайн» у сайта не было
export const metadata: Metadata = pageMetadata({
  title: `Брендбук онлайн для малого бизнеса за ${PRICES.brandbook} ₽`,
  description:
    `Брендбук от вашего логотипа за несколько минут: PDF на ${BRANDBOOK_SAMPLE_PAGES} страниц, семь версий логотипа, фирменные цвета ` +
    `с HEX, RGB и CMYK, шрифты с кириллицей, иконки и макеты визитки, постов и презентации. ${PRICES.brandbook} ₽, разовая оплата.`,
  path: '/brandbook-generator',
});

// Тот же состав, что в BRANDBOOK_PDF на шаге /pages/logo-generator (по полосам PDF).
// Меняется состав полос — правьте оба списка
const PDF_PAGES = [
  'О бренде: слоган, кому это нужно, характер и голос бренда с примерами «так — да / так — нет»',
  'Логотип в 7 версиях: основная, горизонтальная, вертикальная, только знак, чёрная, белая и в фирменном цвете',
  'Охранное поле и минимальный размер логотипа в печати',
  'Недопустимое использование логотипа — наглядно, на примерах',
  '6 фирменных цветов от вашего логотипа: HEX, RGB, CMYK и пропорции в макете',
  'Контраст и сочетания: какой текст читается на каждом цвете',
  'Пара шрифтов с кириллицей: размерная шкала и правила набора',
  '12 иконок в одном стиле, паттерны, разделители и подложки в фирменных цветах',
  'Носители: визитка для типографии, пост, сторис, обложка ВКонтакте, слайд презентации, подпись письма',
];

// Сверено со структурой архива download-brandbook
const ARCHIVE = [
  { folder: 'brandbook.pdf', text: 'Сам брендбук — правила для вас и подрядчиков' },
  { folder: 'logo/', text: 'Все версии логотипа в SVG и PNG' },
  { folder: 'mockups/', text: 'Макеты в SVG и PNG: визитка 90 × 50 мм с PDF для типографии, соцсети, слайд презентации, HTML-подпись письма' },
  { folder: 'icons/', text: 'Иконки и паттерны в SVG с файлом лицензии набора' },
  { folder: 'fonts/', text: 'Шрифты бренда в TTF для компьютера и WOFF2 для сайта, с лицензией SIL OFL' },
];

const HOW = [
  {
    title: 'Цвета считаются от логотипа',
    text:
      'Палитра строится от тех цветов, которыми нарисован ваш знак: к ним добавляются акцент, тёмный, светлый и нейтральный. ' +
      'Контраст для текста проверяется по настоящей формуле WCAG, а не на глаз.',
  },
  {
    title: 'Шрифт тот же, что на логотипе',
    text:
      'Документ не советует один шрифт, пока логотип набран другим. Заголовочный шрифт брендбука — тот, которым набрано название, ' +
      'все шрифты с кириллицей и открытой лицензией.',
  },
  {
    title: 'Иконки из одного набора',
    text:
      'Двенадцать иконок подбираются под вашу нишу из одного набора и одного начертания — смесь стилей видна сразу и выглядит ' +
      'небрежно.',
  },
  {
    title: 'Макеты в настоящих размерах',
    text:
      'Визитка — 90 × 50 мм с вылетами для типографии, обложка ВКонтакте — с безопасной зоной для телефона, подпись письма — ' +
      'табличной вёрсткой, которую понимают почтовые клиенты.',
  },
];

const FAQ: FaqItem[] = [
  {
    q: 'Можно ли сделать брендбук для логотипа, который у меня уже есть?',
    a:
      'Нет. Брендбук собирается из логотипа, созданного в Pixora: версии логотипа, палитра и шрифт выводятся из его исходников. ' +
      'Для чужого логотипа эти данные взять неоткуда.',
  },
  {
    q: 'Сколько времени собирается брендбук?',
    a:
      'Обычно несколько минут после оплаты. Ход сборки виден на странице заказа, а когда всё готово, на почту приходит письмо ' +
      'со ссылкой — со страницы можно уйти.',
  },
  {
    q: 'Чем это отличается от брендбука из студии?',
    a:
      'Студия добавляет исследование аудитории и конкурентов, платформу бренда и ручную работу дизайнера, поэтому стоит в сотни раз ' +
      `дороже. Здесь — базовый гайдлайн: правила использования логотипа, цвета, шрифты, графика и макеты. Для старта и небольшого ` +
      'бизнеса этого обычно хватает.',
  },
  {
    q: 'Нужно ли отдельно покупать логотип?',
    a: `Нет. Брендбук за ${PRICES.brandbook} ₽ уже включает все файлы логотипа — SVG, PNG и JPG без водяного знака.`,
  },
  {
    q: 'Что будет с контактами на визитке?',
    a:
      'В макетах стоят заглушки, и это сказано в самом файле: настоящих контактов бренда у нас нет. Впишите свои в любом ' +
      'редакторе перед печатью — макеты открываются в Figma, Illustrator и Inkscape.',
  },
];

const structuredData = [
  {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: 'Брендбук Pixora',
    description: `Брендбук в PDF на ${BRANDBOOK_SAMPLE_PAGES} страниц и архив с версиями логотипа, шрифтами, иконками и макетами носителей.`,
    brand: { '@id': `${SITE_URL}/#organization` },
    offers: {
      '@type': 'Offer',
      price: String(PRICES.brandbook),
      priceCurrency: 'RUB',
      availability: 'https://schema.org/InStock',
      url: absoluteUrl('/brandbook-generator'),
      seller: { '@id': `${SITE_URL}/#organization` },
    },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Главная', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Брендбук онлайн', item: absoluteUrl('/brandbook-generator') },
    ],
  },
];

const linkClass = 'font-medium text-gray-900 underline underline-offset-4';

export default function BrandbookLanding() {
  return (
    <>
      <Navbar />
      <main className="pt-16">
        <section className="bg-gray-50">
          <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-20">
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
                Брендбук онлайн для малого бизнеса
              </h1>
              <p className="mt-5 text-lg text-gray-700">
                Правила использования логотипа, фирменные цвета, шрифты, иконки и готовые макеты — одним PDF и архивом
                рабочих файлов. Собирается от вашего логотипа за несколько минут, стоит {PRICES.brandbook} ₽.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/logo-generator"
                  className="rounded-md bg-gray-900 px-5 py-3 text-sm font-medium text-white shadow-sm hover:bg-gray-800"
                >
                  Начать с логотипа
                </Link>
                <a
                  href={BRANDBOOK_SAMPLE_URL}
                  target="_blank"
                  rel="noopener"
                  className="rounded-md border border-gray-900 px-5 py-3 text-sm font-medium text-gray-900 hover:bg-gray-900 hover:text-white"
                >
                  Открыть образец (PDF)
                </a>
              </div>
              <p className="mt-4 text-sm text-gray-600">
                Сначала создаётся логотип — {FREE_GENERATIONS} вариантов бесплатно. Брендбук покупается к понравившемуся.
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-md">
              <p className="text-sm font-semibold text-gray-500">Пример</p>
              <div className="mt-4 flex items-center gap-4">
                <img src="/samples/codedash-mark.svg" alt="Знак логотипа CodeDash из образца брендбука" className="h-16 w-16" />
                <span className="text-3xl font-bold text-[#0b3d33]">CodeDash</span>
              </div>
              <p className="mt-4 text-gray-700">
                Брендбук школы программирования, собранный нашим конвейером без ручных правок: {BRANDBOOK_SAMPLE_PAGES}{' '}
                страниц A4, архив из 66 файлов.
              </p>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <section className="py-12">
            <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">Что внутри PDF</h2>
            <ul className="mt-6 space-y-3 text-gray-700">
              {PDF_PAGES.map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="text-gray-400">—</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="py-12">
            <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">Что лежит в архиве</h2>
            <p className="mt-3 text-gray-700">
              PDF — это правила, а работают по ним с файлами. Без них брендбук пришлось бы «распиливать» вручную.
            </p>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {ARCHIVE.map((item) => (
                <li key={item.folder} className="rounded-md bg-gray-50 p-4 text-gray-800">
                  <code className="font-mono text-sm font-semibold text-gray-900">{item.folder}</code>
                  <span className="mt-1 block">{item.text}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="py-12">
            <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">Как собирается брендбук</h2>
            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              {HOW.map((item) => (
                <div key={item.title} className="rounded-lg border border-gray-200 p-5">
                  <h3 className="text-lg font-bold text-gray-900">{item.title}</h3>
                  <p className="mt-2 text-gray-700">{item.text}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="py-12">
            <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">Чего в брендбуке нет</h2>
            <p className="mt-4 text-gray-700">
              Исследования аудитории, анализа конкурентов, миссии и ценностей — платформы бренда, которую делают студии.
              Ручных правок дизайнера тоже нет. Это базовый гайдлайн: он отвечает на вопрос «как правильно использовать
              логотип, цвета и шрифты», а не «каким должен быть бренд».{' '}
              <Link href="/blog/chto-vhodit-v-brendbuk" className={linkClass}>
                Что обычно входит в брендбук
              </Link>
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
