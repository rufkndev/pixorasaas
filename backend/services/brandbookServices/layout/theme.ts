import { BrandColor, ColorKey, textOn } from '../brand/paletteService';
import { BrandFont } from '../brand/typographyService';
import { FontRef } from './textMetrics';

// Кегли в миллиметрах, потому что единица полосы — миллиметр. В скобках пункты:
// основной текст 3.4 мм = 9.6 pt, заголовок полосы 7 мм = 19.8 pt, обложка
// 14 мм = 39.7 pt. Одна шкала на весь документ, иначе типографика разъезжается.
export const SIZE = {
  cover: 14,
  h1: 9,
  h2: 7,
  h3: 4.6,
  lead: 5,
  body: 3.4,
  small: 2.8,
  caption: 2.3,
};

export const LEADING = { tight: 1.2, normal: 1.45, loose: 1.6 };

export interface Theme {
  paper: string;
  ink: string;
  muted: string;
  hair: string;
  color: Record<ColorKey, string>;
  colors: BrandColor[];
  heading: FontRef;
  body: FontRef;
  // Заголовочный шрифт совпадает с надписью на логотипе — это стоит сказать
  // покупателю прямо на полосе типографики
  headingMatchesLogo: boolean;
  onDark: string;
  onPrimary: string;
}

const INK = '#111827';
const PAPER = '#ffffff';

const toRef = (font: BrandFont | undefined, fallbackFamily: string): FontRef => ({
  family: font?.family || fallbackFamily,
  slug: font?.slug || 'inter',
  files: font?.files || [],
});

// Тема — единственный источник цветов и шрифтов для полос: сами полосы не
// ищут ничего в palette и fonts, иначе каждая начнёт выбирать по-своему
export const buildTheme = (colors: BrandColor[], fonts: BrandFont[]): Theme => {
  const byKey = new Map(colors.map((color) => [color.key, color.hex]));

  const color: Record<ColorKey, string> = {
    primary: byKey.get('primary') || '#1f6feb',
    secondary: byKey.get('secondary') || '#0f172a',
    accent: byKey.get('accent') || '#f59e0b',
    dark: byKey.get('dark') || INK,
    light: byKey.get('light') || '#eef2f7',
    neutral: byKey.get('neutral') || '#b6bdc7',
  };

  const heading = fonts.find((font) => font.role === 'heading');
  const body = fonts.find((font) => font.role === 'body');

  return {
    paper: PAPER,
    ink: INK,
    muted: '#6b7280',
    hair: '#dfe3e8',
    color,
    colors,
    heading: toRef(heading, 'Inter'),
    body: toRef(body, 'Golos Text'),
    headingMatchesLogo: !!heading?.matchesLogo,
    onDark: textOn(color.dark),
    onPrimary: textOn(color.primary),
  };
};
