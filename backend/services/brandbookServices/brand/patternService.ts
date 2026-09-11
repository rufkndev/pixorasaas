import { BrandColor, ColorKey } from './paletteService';

// Паттерны рисуются кодом, а не ищутся в чужом наборе: они обязаны быть
// сделаны из фирменных цветов, иначе это не фирменная графика.
export interface BrandPattern {
  id: string;
  name: string;
  description: string;
  usage: string;
  svg: string;
  // То же поле, что у иконок: страница и архив читают их одним списком
  category: 'pattern' | 'divider' | 'background';
}

const TILE = 120;
const DIVIDER = { width: 240, height: 12 };
const BACK = { width: 320, height: 180 };

// Вариации берутся из номера заказа, а не из Math.random: повтор сборки должен
// давать тот же документ, иначе покупатель получит другой архив при пересборке
const hashOf = (value: string): number => {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return Math.abs(hash);
};

const wrap = (width: number, height: number, body: string): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" ` +
  `viewBox="0 0 ${width} ${height}">${body}</svg>`;

// Плитка объявляется через <pattern>, поэтому файл из архива можно растянуть
// на любой размер и он останется бесшовным
const tiled = (id: string, size: number, background: string, marks: string): string =>
  wrap(
    TILE,
    TILE,
    `<defs><pattern id="${id}" width="${size}" height="${size}" patternUnits="userSpaceOnUse">` +
      `${marks}</pattern></defs>` +
      `<rect width="${TILE}" height="${TILE}" fill="${background}"/>` +
      `<rect width="${TILE}" height="${TILE}" fill="url(#${id})"/>`
  );

interface Ink {
  primary: string;
  secondary: string;
  accent: string;
  light: string;
  neutral: string;
  dark: string;
}

const dots = (ink: Ink, seed: number): string => {
  const size = 16 + (seed % 3) * 4;
  const radius = size / 8;

  return tiled(
    'p-dots',
    size,
    ink.light,
    `<circle cx="${size / 4}" cy="${size / 4}" r="${radius}" fill="${ink.primary}"/>` +
      `<circle cx="${(size * 3) / 4}" cy="${(size * 3) / 4}" r="${radius}" fill="${ink.accent}"/>`
  );
};

const stripes = (ink: Ink, seed: number): string => {
  const size = 14 + (seed % 4) * 3;

  return tiled(
    'p-stripes',
    size,
    ink.light,
    // Углы плитки закрываются отдельными отрезками, иначе полосы рвутся на
    // стыках и превращаются в россыпь штрихов
    `<path d="M-1 1 L1 -1 M0 ${size} L${size} 0 M${size - 1} ${size + 1} L${size + 1} ${size - 1}" ` +
      `stroke="${ink.primary}" stroke-width="${size / 6}" fill="none"/>`
  );
};

const grid = (ink: Ink, seed: number): string => {
  const size = 20 + (seed % 3) * 6;

  return tiled(
    'p-grid',
    size,
    ink.light,
    // Нейтральный цвет на светлом фоне почти не виден: плитка читалась пустой
    `<path d="M0 0 H${size} M0 0 V${size}" stroke="${ink.primary}" stroke-width="1" ` +
      `stroke-opacity="0.35" fill="none"/>` +
      `<circle cx="0" cy="0" r="1.6" fill="${ink.accent}"/>`
  );
};

const rings = (ink: Ink, seed: number): string => {
  const size = 24 + (seed % 3) * 8;

  return tiled(
    'p-rings',
    size,
    ink.light,
    `<circle cx="${size / 2}" cy="${size / 2}" r="${size / 3}" fill="none" ` +
      `stroke="${ink.primary}" stroke-width="1.6"/>`
  );
};

const chevron = (ink: Ink, seed: number): string => {
  const size = 18 + (seed % 3) * 4;

  return tiled(
    'p-chevron',
    size,
    ink.light,
    `<path d="M0 ${size} L${size / 2} ${size / 2} L${size} ${size}" fill="none" ` +
      `stroke="${ink.secondary}" stroke-width="${size / 8}" stroke-linecap="square"/>`
  );
};

const mosaic = (ink: Ink, seed: number): string => {
  const size = 20 + (seed % 4) * 5;
  const half = size / 2;

  return tiled(
    'p-mosaic',
    size,
    ink.light,
    `<rect width="${half}" height="${half}" fill="${ink.primary}" opacity="0.85"/>` +
      `<rect x="${half}" y="${half}" width="${half}" height="${half}" fill="${ink.accent}" opacity="0.7"/>`
  );
};

const dividerLine = (ink: Ink): string =>
  wrap(
    DIVIDER.width,
    DIVIDER.height,
    `<path d="M0 6 H${DIVIDER.width}" stroke="${ink.neutral}" stroke-width="1"/>` +
      `<path d="M0 6 H56" stroke="${ink.accent}" stroke-width="3"/>`
  );

const dividerDots = (ink: Ink): string => {
  const marks: string[] = [];

  for (let index = 0; index < 12; index += 1) {
    const x = 8 + index * 20;
    marks.push(
      `<circle cx="${x}" cy="6" r="${index === 0 ? 4 : 2}" ` +
        `fill="${index === 0 ? ink.accent : ink.neutral}"/>`
    );
  }

  return wrap(DIVIDER.width, DIVIDER.height, marks.join(''));
};

const dividerZigzag = (ink: Ink): string => {
  const points: string[] = [];

  for (let x = 0; x <= DIVIDER.width; x += 12) {
    points.push(`${x} ${x % 24 === 0 ? 2 : 10}`);
  }

  return wrap(
    DIVIDER.width,
    DIVIDER.height,
    `<polyline points="${points.join(' ')}" fill="none" stroke="${ink.primary}" stroke-width="2"/>`
  );
};

const backArc = (ink: Ink): string =>
  wrap(
    BACK.width,
    BACK.height,
    `<rect width="${BACK.width}" height="${BACK.height}" fill="${ink.light}"/>` +
      `<circle cx="${BACK.width}" cy="0" r="150" fill="${ink.primary}" opacity="0.14"/>` +
      `<circle cx="${BACK.width}" cy="0" r="92" fill="${ink.accent}" opacity="0.18"/>`
  );

const backSplit = (ink: Ink): string =>
  wrap(
    BACK.width,
    BACK.height,
    `<rect width="${BACK.width}" height="${BACK.height}" fill="${ink.dark}"/>` +
      `<path d="M0 ${BACK.height} L${BACK.width} 0 L${BACK.width} ${BACK.height} Z" ` +
      `fill="${ink.primary}" opacity="0.35"/>`
  );

interface Recipe {
  id: string;
  name: string;
  usage: string;
  category: BrandPattern['category'];
  draw: (ink: Ink, seed: number) => string;
}

const RECIPES: Recipe[] = [
  { id: 'dots', name: 'Точки', usage: 'Подложка карточек, фон блока с текстом', category: 'pattern', draw: dots },
  { id: 'stripes', name: 'Диагональ', usage: 'Обложки, упаковка, крупные плоскости', category: 'pattern', draw: stripes },
  { id: 'grid', name: 'Сетка', usage: 'Схемы, презентации, техническая подача', category: 'pattern', draw: grid },
  { id: 'rings', name: 'Кольца', usage: 'Фон соцсетей, баннеры', category: 'pattern', draw: rings },
  { id: 'chevron', name: 'Зигзаг', usage: 'Акцентные полосы, разделители секций', category: 'pattern', draw: chevron },
  { id: 'mosaic', name: 'Мозаика', usage: 'Плитка на упаковке и в оформлении точки', category: 'pattern', draw: mosaic },
  { id: 'divider-line', name: 'Линия с акцентом', usage: 'Между разделами документа', category: 'divider', draw: dividerLine },
  { id: 'divider-dots', name: 'Точечный разделитель', usage: 'Между блоками на сайте', category: 'divider', draw: dividerDots },
  { id: 'divider-zigzag', name: 'Зигзаг-разделитель', usage: 'Между секциями в презентации', category: 'divider', draw: dividerZigzag },
  { id: 'background-arc', name: 'Светлая подложка', usage: 'Первый экран сайта, обложка презентации', category: 'background', draw: backArc },
  { id: 'background-split', name: 'Тёмная подложка', usage: 'Секции с вывороткой логотипа', category: 'background', draw: backSplit },
];

const inkOf = (colors: BrandColor[]): Ink => {
  const get = (key: ColorKey, fallback: string) =>
    colors.find((color) => color.key === key)?.hex || fallback;

  return {
    primary: get('primary', '#1f6feb'),
    secondary: get('secondary', '#0f172a'),
    accent: get('accent', '#f59e0b'),
    light: get('light', '#eef2f7'),
    neutral: get('neutral', '#b6bdc7'),
    dark: get('dark', '#111827'),
  };
};

export const buildPatterns = (colors: BrandColor[], orderId: string): BrandPattern[] => {
  const ink = inkOf(colors);
  const seed = hashOf(orderId);

  return RECIPES.map((recipe, index) => ({
    id: recipe.id,
    name: recipe.name,
    description: '',
    usage: recipe.usage,
    category: recipe.category,
    svg: recipe.draw(ink, seed + index),
  }));
};
