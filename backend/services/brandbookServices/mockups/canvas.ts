import { BrandColor } from '../brand/paletteService';
import { BrandFont } from '../brand/typographyService';
import { Artwork } from '../layout/artwork';
import { FontRef } from '../layout/textMetrics';

// Примитивы из layout/svg работают в любых единицах — они просто печатают
// числа. Разной остаётся только обёртка: у экранных макетов это пиксели,
// у печатных — миллиметры с вылетами.
export const canvas = (width: number, height: number, background: string, children: string): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ` +
  `width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
  `<rect x="0" y="0" width="${width}" height="${height}" fill="${background}"/>` +
  children +
  `</svg>`;

export const canvasMm = (width: number, height: number, background: string, children: string): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ` +
  `width="${width}mm" height="${height}mm" viewBox="0 0 ${width} ${height}">` +
  `<rect x="0" y="0" width="${width}" height="${height}" fill="${background}"/>` +
  children +
  `</svg>`;

export interface MockupInk {
  primary: string;
  secondary: string;
  accent: string;
  light: string;
  neutral: string;
  dark: string;
  onDark: string;
  onPrimary: string;
  heading: FontRef;
  body: FontRef;
}

// Что макетам нужно от заказа. Контакты подставляются заглушками: настоящих
// у нас нет, а выдумывать их в файле, который пойдёт в типографию, нельзя.
export interface MockupContext {
  brandbookId: number;
  name: string;
  slogan: string;
  industry: string;
  colors: BrandColor[];
  fonts: BrandFont[];
  ink: MockupInk;
  primaryArt: Artwork | null;
  darkArt: Artwork | null;
  markArt: Artwork | null;
  wideArt: Artwork | null;
  patterns: Record<string, string>;
  // Три пункта контентного слайда: заголовки — качества бренда из
  // рекомендаций, текст — заглушка, иконки — из подобранного набора
  points: Array<{ title: string; text: string; svg?: string }>;
}

export interface MockupBuild {
  id: string;
  name: string;
  description: string;
  usage: string;
  size: string;
  // Ширина превью в пикселях
  previewWidth: number;
  svg: string;
  // Вторая сторона визитки: печатается в тот же PDF вторым листом
  back?: string;
  // Печатный макет уходит покупателю ещё и как PDF в физическом размере
  print?: boolean;
}
