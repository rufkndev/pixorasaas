import { BrandFont } from '../../brand/typographyService';
import { quoted } from '../../../../utils/slug';
import { chrome } from '../chrome';
import { BrandbookDoc, PageContext, PageModule } from '../document';
import { line, page, text, textBlock } from '../svg';
import { LEADING, SIZE } from '../theme';
import { CONTENT, mmToPt } from '../units';
import { fitSize, wrap } from '../textMetrics';

const LEFT = { x: CONTENT.x, width: 150 };
const RIGHT = { x: 180, width: CONTENT.right - 180 };

const CYRILLIC_UPPER = 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ';
const CYRILLIC_LOWER = 'абвгдеёжзийклмнопрстуфхцчшщъыьэюя';
const LATIN = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ 0123456789 №«»—';

const ROLE: Record<string, string> = {
  heading: 'Заголовочный шрифт',
  body: 'Текстовый шрифт',
};

const CATEGORY: Record<string, string> = {
  sans: 'без засечек',
  serif: 'с засечками',
  display: 'акцидентный',
};

// Строка алфавита должна влезть в колонку целиком: разрывать её переносом
// нельзя, поэтому кегль подбирается под фактическую ширину
const alphabet = (font: BrandFont, value: string, size: number) =>
  fitSize(value, { font, size }, LEFT.width, 2.8);

const fontCard = (doc: BrandbookDoc, font: BrandFont, top: number): string => {
  const { theme } = doc;
  const weights = `${Math.min(...font.weights)}–${Math.max(...font.weights)}`;
  const upperSize = alphabet(font, CYRILLIC_UPPER, 5);
  const latinSize = alphabet(font, LATIN, 4.2);

  const parts = [
    text({
      x: LEFT.x,
      y: top,
      content: ROLE[font.role] || font.role,
      family: theme.body.family,
      size: SIZE.caption,
      fill: theme.muted,
      tracking: 0.35,
      uppercase: true,
    }),
    text({
      x: LEFT.x,
      y: top + 12,
      content: font.family,
      family: font.family,
      size: fitSize(font.family, { font, size: 11, weight: 700 }, LEFT.width, 6),
      weight: 700,
      fill: theme.ink,
    }),
    text({
      x: LEFT.x,
      y: top + 18,
      content: `${CATEGORY[font.category] || font.category} · начертания ${weights} · ${font.licence} · кириллица`,
      family: theme.body.family,
      size: SIZE.small,
      fill: theme.muted,
    }),
    text({
      x: LEFT.x,
      y: top + 27,
      content: CYRILLIC_UPPER,
      family: font.family,
      size: upperSize,
      weight: 400,
      fill: theme.ink,
    }),
    text({
      x: LEFT.x,
      y: top + 34,
      content: CYRILLIC_LOWER,
      family: font.family,
      size: upperSize,
      weight: 400,
      fill: theme.ink,
    }),
    text({
      x: LEFT.x,
      y: top + 40.5,
      content: LATIN,
      family: font.family,
      size: latinSize,
      weight: 400,
      fill: theme.muted,
    }),
    text({
      x: LEFT.x,
      y: top + 47,
      content: font.usage,
      family: theme.body.family,
      size: SIZE.caption,
      fill: theme.muted,
    }),
  ];

  // Совпадение с надписью на логотипе — довод в пользу этой пары, а не
  // случайность: шрифт локапа пишется в generated_logos.lockup_font
  if (font.matchesLogo) {
    parts.push(
      text({
        x: LEFT.x + LEFT.width - 6,
        y: top,
        content: 'Как в надписи на логотипе',
        family: theme.body.family,
        size: SIZE.caption,
        fill: theme.color.accent,
        weight: 600,
        anchor: 'end',
      })
    );
  }

  return parts.join('');
};

// Лестница кеглей рисуется настоящими размерами: таблица с числами не
// показывает разницу между 19.8 pt и 13 pt, а строка показывает
const scale = (doc: BrandbookDoc): string => {
  const { theme } = doc;
  const rows: Array<{ label: string; size: number; weight: number; family: string }> = [
    { label: 'Заголовок', size: SIZE.h1, weight: 700, family: theme.heading.family },
    { label: 'Подзаголовок', size: SIZE.h2, weight: 700, family: theme.heading.family },
    { label: 'Раздел', size: SIZE.h3, weight: 600, family: theme.heading.family },
    { label: 'Основной текст', size: SIZE.body, weight: 400, family: theme.body.family },
    { label: 'Подпись', size: SIZE.caption, weight: 400, family: theme.body.family },
  ];

  const parts: string[] = [
    text({
      x: RIGHT.x,
      y: 48,
      content: 'Размерная шкала',
      family: theme.body.family,
      size: SIZE.caption,
      fill: theme.muted,
      tracking: 0.35,
      uppercase: true,
    }),
  ];

  let y = 60;

  for (const row of rows) {
    parts.push(
      text({
        x: RIGHT.x,
        y,
        content: row.label,
        family: row.family,
        size: row.size,
        weight: row.weight,
        fill: theme.ink,
      }),
      text({
        x: RIGHT.x + RIGHT.width,
        y,
        content: `${mmToPt(row.size)} pt`,
        family: theme.body.family,
        size: SIZE.caption,
        fill: theme.muted,
        anchor: 'end',
      }),
      line({
        x1: RIGHT.x,
        y1: y + 3,
        x2: RIGHT.x + RIGHT.width,
        y2: y + 3,
        stroke: theme.hair,
        width: 0.2,
      })
    );

    y += row.size * LEADING.tight + 6;
  }

  const rules = doc.guidelines?.typographyRules?.slice(0, 4) || [];

  if (rules.length) {
    parts.push(
      text({
        x: RIGHT.x,
        y: y + 6,
        content: 'Правила набора',
        family: theme.body.family,
        size: SIZE.caption,
        fill: theme.muted,
        tracking: 0.35,
        uppercase: true,
      })
    );

    let ruleY = y + 14;

    for (const rule of rules) {
      const lines = wrap(rule, { font: theme.body, size: SIZE.small }, RIGHT.width - 4);

      parts.push(
        text({
          x: RIGHT.x,
          y: ruleY,
          content: '—',
          family: theme.body.family,
          size: SIZE.small,
          fill: theme.color.accent,
        }),
        textBlock({
          x: RIGHT.x + 4,
          y: ruleY,
          lines,
          family: theme.body.family,
          size: SIZE.small,
          fill: theme.ink,
          lineHeight: SIZE.small * LEADING.normal,
        })
      );

      ruleY += lines.length * SIZE.small * LEADING.normal + 1.5;
    }
  }

  return parts.join('');
};

// Пара показывается на настоящем тексте бренда, а не на «lorem ipsum»:
// заголовок заголовочным шрифтом, суть бренда — текстовым
const specimen = (doc: BrandbookDoc): string => {
  const { theme } = doc;
  const value =
    doc.guidelines?.essence ||
    doc.slogan ||
    `${quoted(doc.name)} — ${doc.industry || doc.keywords}. Так выглядит основной текст в макетах бренда.`;

  const lines = wrap(value, { font: theme.body, size: SIZE.body }, LEFT.width).slice(0, 3);

  return [
    line({ x1: LEFT.x, y1: 158, x2: LEFT.x + LEFT.width, y2: 158, stroke: theme.hair, width: 0.25 }),
    text({
      x: LEFT.x,
      y: 167,
      content: 'Пара в работе',
      family: theme.heading.family,
      size: SIZE.h3,
      weight: 700,
      fill: theme.ink,
    }),
    textBlock({
      x: LEFT.x,
      y: 174,
      lines,
      family: theme.body.family,
      size: SIZE.body,
      fill: theme.ink,
      lineHeight: SIZE.body * LEADING.normal,
    }),
  ].join('');
};

const render = async (doc: BrandbookDoc, ctx: PageContext): Promise<string> => {
  const { theme } = doc;
  const heading = doc.fonts.find((font) => font.role === 'heading');
  const body = doc.fonts.find((font) => font.role === 'body');

  return page(
    theme.paper,
    [
      chrome(doc, ctx, 'Типографика'),
      heading ? fontCard(doc, heading, 48) : '',
      body ? fontCard(doc, body, 110) : '',
      line({
        x1: LEFT.x,
        y1: 102,
        x2: LEFT.x + LEFT.width,
        y2: 102,
        stroke: theme.hair,
        width: 0.25,
      }),
      line({ x1: 168, y1: 42, x2: 168, y2: 186, stroke: theme.hair, width: 0.25 }),
      scale(doc),
      specimen(doc),
    ].join('')
  );
};

export const typographyPage: PageModule = {
  key: 'typography',
  section: 'Типографика',
  title: 'Типографика',
  render,
};
