import fs from 'fs';
import path from 'path';

// Шрифты лежат в репозитории и ставятся в образ системно, см. scripts/fetch-fonts.mjs.
// Здесь нужны и пути к ttf (для метрик и для архива покупателю), и адрес css.
const FONTS_DIR = process.env.FONTS_DIR || path.join(process.cwd(), 'public', 'fonts');

export type FontRole = 'heading' | 'body';

export interface BrandFont {
  role: FontRole;
  family: string;
  slug: string;
  category: 'sans' | 'serif' | 'display';
  // Отдаётся фронту: страница брендбука грузит шрифты с нашего домена
  cssUrl: string;
  weights: number[];
  licence: 'OFL-1.1';
  // Абсолютные пути к ttf в контейнере: метрики и наполнение архива
  files: string[];
  usage: string;
  // Совпадает ли с надписью на логотипе — это стоит сказать покупателю прямо
  matchesLogo: boolean;
}

interface FontEntry {
  family: string;
  slug: string;
  category: 'sans' | 'serif' | 'display';
  weights: number[];
}

// Только вендоренные семейства. Каждое покрывает кириллицу — проверено
// рендером в образе, см. CLAUDE.md.
const CATALOG: Record<string, FontEntry> = {
  Inter: { family: 'Inter', slug: 'inter', category: 'sans', weights: [400, 500, 600, 700] },
  'Golos Text': { family: 'Golos Text', slug: 'golos-text', category: 'sans', weights: [400, 500, 600, 700] },
  Manrope: { family: 'Manrope', slug: 'manrope', category: 'sans', weights: [400, 500, 600, 700] },
  'IBM Plex Sans': { family: 'IBM Plex Sans', slug: 'ibm-plex-sans', category: 'sans', weights: [400, 500, 600, 700] },
  'PT Sans': { family: 'PT Sans', slug: 'pt-sans', category: 'sans', weights: [400, 700] },
  'PT Serif': { family: 'PT Serif', slug: 'pt-serif', category: 'serif', weights: [400, 700] },
  'Playfair Display': { family: 'Playfair Display', slug: 'playfair-display', category: 'serif', weights: [400, 500, 600, 700] },
  Unbounded: { family: 'Unbounded', slug: 'unbounded', category: 'display', weights: [400, 500, 600, 700] },
  Rubik: { family: 'Rubik', slug: 'rubik', category: 'sans', weights: [400, 500, 600, 700] },
  Oswald: { family: 'Oswald', slug: 'oswald', category: 'display', weights: [400, 500, 600, 700] },
  Nunito: { family: 'Nunito', slug: 'nunito', category: 'sans', weights: [400, 500, 600, 700] },
  Comfortaa: { family: 'Comfortaa', slug: 'comfortaa', category: 'display', weights: [400, 500, 600, 700] },
};

// Пара «заголовок + текст» на каждый стиль. Стиль выбирает пользователь, и
// раньше он на шрифты не влиял: пара угадывалась по ключевым словам, а половина
// каталога вообще не поддерживала кириллицу.
const PAIRS: Record<string, { heading: string; body: string }> = {
  modern: { heading: 'Inter', body: 'Golos Text' },
  professional: { heading: 'IBM Plex Sans', body: 'PT Sans' },
  classic: { heading: 'Playfair Display', body: 'PT Serif' },
  creative: { heading: 'Unbounded', body: 'Rubik' },
  playful: { heading: 'Comfortaa', body: 'Nunito' },
};

const USAGE: Record<FontRole, string> = {
  heading: 'Заголовки, названия разделов, крупные акценты. Начертания 600–700',
  body: 'Основной текст, подписи, таблицы. Начертания 400–500',
};

const filesFor = (slug: string): string[] => {
  const dir = path.join(FONTS_DIR, slug);

  try {
    return fs
      .readdirSync(dir)
      .filter((file) => file.endsWith('.ttf'))
      .map((file) => path.join(dir, file));
  } catch {
    // В деве каталога может не быть, если шрифты ещё не скачаны скриптом
    console.error(`Шрифт ${slug}: каталог ${dir} недоступен`);
    return [];
  }
};

const describe = (entry: FontEntry, role: FontRole, lockupFamily: string | null): BrandFont => ({
  role,
  family: entry.family,
  slug: entry.slug,
  category: entry.category,
  cssUrl: `/fonts/${entry.slug}.css`,
  weights: entry.weights,
  licence: 'OFL-1.1',
  files: filesFor(entry.slug),
  usage: USAGE[role],
  matchesLogo: !!lockupFamily && lockupFamily === entry.family,
});

// Шрифт надписи на логотипе первичен: брендбук не должен рекомендовать одно,
// а логотип быть набран другим. lockupFont пишется при генерации логотипа,
// у старых записей его нет — тогда пара берётся по стилю.
export const buildTypography = (style: string, lockupFamily?: string | null): BrandFont[] => {
  const pair = PAIRS[style] || PAIRS.modern;
  const lockup = lockupFamily && CATALOG[lockupFamily] ? lockupFamily : null;

  const headingKey = lockup || pair.heading;
  // Текстовый шрифт не должен совпасть с заголовочным: пара из одного семейства
  // не даёт иерархии
  const bodyKey = pair.body === headingKey ? (pair.heading === headingKey ? 'Golos Text' : pair.heading) : pair.body;

  return [
    describe(CATALOG[headingKey] || CATALOG.Inter, 'heading', lockup),
    describe(CATALOG[bodyKey] || CATALOG['Golos Text'], 'body', lockup),
  ];
};

// Кегли одной шкалой: полосы PDF, макеты и рекомендации берут размеры отсюда,
// чтобы в документе не разъезжалась типографика
export const typeScale = (base: number) => ({
  h1: Math.round(base * 2.6),
  h2: Math.round(base * 1.8),
  h3: Math.round(base * 1.3),
  body: base,
  caption: Math.round(base * 0.8),
  lineHeight: 1.45,
});

export const fontsCatalog = CATALOG;
