import { colord, extend, Colord } from 'colord';
import a11yPlugin from 'colord/plugins/a11y';
import cmykPlugin from 'colord/plugins/cmyk';
import harmoniesPlugin from 'colord/plugins/harmonies';
import mixPlugin from 'colord/plugins/mix';

extend([a11yPlugin, cmykPlugin, harmoniesPlugin, mixPlugin]);

export type ColorKey = 'primary' | 'secondary' | 'accent' | 'dark' | 'light' | 'neutral';

export interface BrandColor {
  key: ColorKey;
  name: string;
  hex: string;
  rgb: string;
  cmyk: string;
  usage: string;
  // Какой текст читается на этом цвете и с каким контрастом
  textOn: { hex: string; ratio: number; aa: boolean };
  // Годится ли сам цвет как текст на белом фоне
  asTextOnWhite: { ratio: number; aa: boolean; aaLarge: boolean };
}

const WHITE = '#ffffff';
const INK = '#111827';

// Логотип рисуется по концепции, где цветов ровно два, и если их почему-то нет
// (записи до перехода на вектор), палитру задаёт стиль
const STYLE_FALLBACK: Record<string, [string, string]> = {
  modern: ['#1f6feb', '#0f172a'],
  classic: ['#0b264e', '#c08a2e'],
  creative: ['#7c3aed', '#f59e0b'],
  professional: ['#1e40af', '#334155'],
  playful: ['#f97316', '#0ea5e9'],
};

// Акцент — поворот тона основного цвета на столько градусов. Насыщенность и
// светлота сохраняются: готовые гармонии colord их пересчитывают и выдавали
// кислотную зелень (#0def51) от спокойного оранжевого.
// Значения подобраны замером на реальных палитрах логотипов, а не наугад:
// 210° от синего давало жёлто-зелёный, 60° от оранжевого — кислотный лайм.
const STYLE_ROTATION: Record<string, number> = {
  modern: 25,
  classic: 150,
  creative: 180,
  professional: 25,
  playful: 300,
};

const USAGE: Record<ColorKey, string> = {
  primary: 'Логотип, заголовки, кнопки — главный цвет бренда',
  secondary: 'Подзаголовки, иконки, вспомогательные блоки',
  accent: 'Призывы к действию и выделения. Не больше десятой части площади',
  dark: 'Текст, подложки под выворотку логотипа, тёмные секции',
  light: 'Фоны карточек и секций, подложки под текст',
  neutral: 'Рамки, разделители, неактивные элементы',
};

const NAME: Record<ColorKey, string> = {
  primary: 'Основной',
  secondary: 'Дополнительный',
  accent: 'Акцентный',
  dark: 'Тёмный',
  light: 'Светлый',
  neutral: 'Нейтральный',
};

const isHex = (value: unknown): value is string =>
  typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value.trim());

const cmykOf = (color: Colord): string => {
  const { c, m, y, k } = color.toCmyk();
  return `C${c} M${m} Y${y} K${k}`;
};

const describe = (key: ColorKey, color: Colord): BrandColor => {
  const onWhite = color.contrast(WHITE);
  const onInk = color.contrast(INK);
  // На самом цвете читается тот из двух, с кем контраст выше
  const useWhiteText = onWhite >= onInk;
  const ratio = Math.round((useWhiteText ? onWhite : onInk) * 100) / 100;

  return {
    key,
    name: NAME[key],
    hex: color.toHex(),
    rgb: color.toRgbString(),
    cmyk: cmykOf(color),
    usage: USAGE[key],
    textOn: { hex: useWhiteText ? WHITE : INK, ratio, aa: ratio >= 4.5 },
    asTextOnWhite: {
      ratio: Math.round(onWhite * 100) / 100,
      aa: onWhite >= 4.5,
      aaLarge: onWhite >= 3,
    },
  };
};

// Тон поворачиваем, насыщенность и светлоту оставляем — так акцент остаётся
// членом той же семьи. Совсем тёмный или совсем светлый основной цвет
// подтягиваем к середине, иначе акцент выходит неразличимым.
const rotateInFamily = (base: Colord, degrees: number): Colord => {
  const { h, s, l } = base.toHsl();

  return colord({
    h: (h + degrees) % 360,
    s: Math.min(90, Math.max(35, s)),
    l: Math.min(62, Math.max(38, l)),
  });
};

const hueGap = (first: number, second: number): number => {
  const diff = Math.abs(((first - second) % 360 + 360) % 360);
  return Math.min(diff, 360 - diff);
};

const MIN_HUE_GAP = 25;

// Одинаковая светлота в HSL даёт совершенно разную яркость на глаз: жёлто-зелёный
// при l=58 вдвое ярче синего при том же l. Замерено: поворот фиолетового #7c3aed
// на 180° давал #aced3b с яркостью 0.69 против 0.13 у основного — кислотное пятно
// в палитре. Держим яркость акцента в коридоре: сверху он перестаёт быть
// кислотным, снизу — не сливается в почти чёрный.
const ACCENT_LUMINANCE = { min: 0.12, max: 0.42 };

const inLuminanceBand = (color: Colord): Colord => {
  let result = color;

  for (let step = 0; step < 30; step += 1) {
    const luminance = result.luminance();

    if (luminance > ACCENT_LUMINANCE.max) result = result.darken(0.02);
    else if (luminance < ACCENT_LUMINANCE.min) result = result.lighten(0.02);
    else break;
  }

  return result;
};

// Акцент не должен совпасть по тону с дополнительным цветом, иначе в палитре
// оказываются два почти одинаковых пятна. Сравниваем именно тон: проверка по
// контрасту при тёмном дополнительном уводила синий в мадженту.
const pickAccent = (primary: Colord, secondary: Colord, style: string): Colord => {
  const rotation = STYLE_ROTATION[style] ?? 25;
  const secondaryHsl = secondary.toHsl();

  // Ненасыщенный дополнительный — это нейтраль, с ней тон акцента не спорит
  if (secondaryHsl.s < 25) return inLuminanceBand(rotateInFamily(primary, rotation));

  // Зеркальный поворот при 180° совпадает с прямым, поэтому в запасе ещё и
  // смещения: без них акцент прилипал по тону к дополнительному цвету
  const candidates = [rotation, 360 - rotation, rotation + 60, rotation - 60].map((degrees) =>
    rotateInFamily(primary, ((degrees % 360) + 360) % 360)
  );

  const clear = candidates.find(
    (candidate) => hueGap(candidate.toHsl().h, secondaryHsl.h) >= MIN_HUE_GAP
  );

  if (clear) return inLuminanceBand(clear);

  // Ничего не подошло — берём самый далёкий по тону
  const farthest = candidates.reduce((best, candidate) =>
    hueGap(candidate.toHsl().h, secondaryHsl.h) > hueGap(best.toHsl().h, secondaryHsl.h)
      ? candidate
      : best
  );

  return inLuminanceBand(farthest);
};

// Тёмный цвет обязан сохранить тон бренда: прямой darken() при уже тёмном
// основном схлопывался в чистый чёрный и палитра теряла характер
const toDark = (base: Colord): Colord => {
  const { h, s } = base.toHsl();
  return colord({ h, s: Math.min(70, Math.max(20, s)), l: 14 });
};

// Нейтральный оставляем чуть подкрашенным: полностью серый #999999 в фирменной
// палитре выглядит как чужой элемент
const toNeutral = (base: Colord): Colord => {
  const { h } = base.toHsl();
  return colord({ h, s: 10, l: 72 });
};

export interface PaletteInput {
  // generated_logos.palette — цвета, которыми модель рисовала знак
  logoPalette?: string[] | null;
  style: string;
}

// Палитра строится от логотипа, а не угадывается по ключевым словам: раньше
// у оранжевого логотипа «фирменные цвета» могли выйти синими
export const buildPalette = ({ logoPalette, style }: PaletteInput): BrandColor[] => {
  const fromLogo = (logoPalette || []).filter(isHex).map((hex) => hex.trim().toLowerCase());
  const fallback = STYLE_FALLBACK[style] || STYLE_FALLBACK.modern;

  const primary = colord(fromLogo[0] || fallback[0]);
  const secondary = colord(fromLogo[1] || primary.rotate(20).darken(0.12).toHex());
  const accent = pickAccent(primary, secondary, style);

  return [
    describe('primary', primary),
    describe('secondary', secondary),
    describe('accent', accent),
    // Тёмный, светлый и нейтральный выводим из основного, чтобы вся палитра
    // читалась как одна семья
    describe('dark', toDark(primary)),
    describe('light', primary.mix(WHITE, 0.9)),
    describe('neutral', toNeutral(primary)),
  ];
};

// Цвет текста для произвольной подложки — нужен и вёрстке полос, и макетам
export const textOn = (background: string): string =>
  colord(background).contrast(WHITE) >= colord(background).contrast(INK) ? WHITE : INK;
