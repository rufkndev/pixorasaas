import { ColorKey } from '../../brand/paletteService';
import { chrome } from '../chrome';
import { BrandbookDoc, PageContext, PageModule } from '../document';
import { page, rect, text, textBlock } from '../svg';
import { LEADING, SIZE } from '../theme';
import { CONTENT, colWidth, colX } from '../units';
import { fitSize, wrap } from '../textMetrics';

const SWATCH = { y: 42, height: 52 };
const CARD_SPAN = 2;

// Доли площади макета. Это правило дизайна, а не свойство цвета, поэтому
// живёт здесь, а не в палитре: акцент теряет силу, если его много.
const SHARE: Record<ColorKey, number> = {
  primary: 45,
  secondary: 20,
  dark: 12,
  light: 12,
  accent: 8,
  neutral: 3,
};

const BAR = { y: 166, height: 13 };

// «Дополнительный» и «Нейтральный» в широком акцидентном шрифте не влезают в
// колонку и налезали на соседнюю. Кегль один на всю строку карточек — по самому
// длинному названию: разнокалиберные подписи в справочной таблице выглядят сбоем.
const nameSizeFor = (doc: BrandbookDoc): number =>
  Math.min(
    ...doc.colors.map((color) =>
      fitSize(
        color.name,
        { font: doc.theme.heading, size: SIZE.h3, weight: 700 },
        colWidth(CARD_SPAN),
        3
      )
    )
  );

const swatchCard = (doc: BrandbookDoc, index: number, nameSize: number): string => {
  const color = doc.colors[index];
  const { theme } = doc;
  const x = colX(index * CARD_SPAN);
  const width = colWidth(CARD_SPAN);

  const usage = wrap(color.usage, { font: theme.body, size: SIZE.small }, width);
  const contrast = `${color.textOn.hex === '#ffffff' ? 'Белый' : 'Тёмный'} текст · ${color.textOn.ratio}:1${
    color.textOn.aa ? ' AA' : ''
  }`;

  return [
    rect({ x, y: SWATCH.y, width, height: SWATCH.height, fill: color.hex, radius: 1.5 }),
    // Hex внутри плашки тем цветом, который на ней действительно читается:
    // контраст настоящий, из colord/plugins/a11y
    text({
      x: x + 4,
      y: SWATCH.y + SWATCH.height - 5,
      content: color.hex.toUpperCase(),
      family: theme.body.family,
      size: SIZE.body,
      weight: 600,
      fill: color.textOn.hex,
    }),
    text({
      x,
      y: SWATCH.y + SWATCH.height + 8,
      content: color.name,
      family: theme.heading.family,
      size: nameSize,
      weight: 700,
      fill: theme.ink,
    }),
    text({
      x,
      y: SWATCH.y + SWATCH.height + 13,
      content: color.key,
      family: theme.body.family,
      size: SIZE.caption,
      fill: theme.muted,
      tracking: 0.3,
      uppercase: true,
    }),
    text({
      x,
      y: SWATCH.y + SWATCH.height + 21,
      content: color.rgb.replace('rgb(', 'RGB ').replace(')', ''),
      family: theme.body.family,
      size: SIZE.small,
      fill: theme.ink,
    }),
    text({
      x,
      y: SWATCH.y + SWATCH.height + 25.5,
      content: color.cmyk,
      family: theme.body.family,
      size: SIZE.small,
      fill: theme.ink,
    }),
    text({
      x,
      y: SWATCH.y + SWATCH.height + 32,
      content: contrast,
      family: theme.body.family,
      size: SIZE.caption,
      fill: theme.muted,
    }),
    textBlock({
      x,
      y: SWATCH.y + SWATCH.height + 39,
      lines: usage.slice(0, 4),
      family: theme.body.family,
      size: SIZE.small,
      fill: theme.muted,
      lineHeight: SIZE.small * LEADING.normal,
    }),
  ].join('');
};

// Полоса пропорций: сколько площади макета отдавать каждому цвету. Одной
// картинкой это объясняется лучше, чем абзацем текста.
const shareBar = (doc: BrandbookDoc): string => {
  const parts: string[] = [];
  let x = CONTENT.x;

  for (const color of doc.colors) {
    const share = SHARE[color.key] ?? 0;
    const width = (CONTENT.width * share) / 100;

    parts.push(rect({ x, y: BAR.y, width, height: BAR.height, fill: color.hex }));

    if (width > 14) {
      parts.push(
        text({
          x: x + width / 2,
          y: BAR.y + BAR.height / 2 + 1.2,
          content: `${share}%`,
          family: doc.theme.body.family,
          size: SIZE.small,
          weight: 600,
          fill: color.textOn.hex,
          anchor: 'middle',
        })
      );
    }

    x += width;
  }

  return parts.join('');
};

const render = async (doc: BrandbookDoc, ctx: PageContext): Promise<string> => {
  const { theme } = doc;

  const nameSize = nameSizeFor(doc);
  const cards = doc.colors.slice(0, 6).map((_, index) => swatchCard(doc, index, nameSize));

  return page(
    theme.paper,
    [
      chrome(doc, ctx, 'Фирменные цвета'),
      cards.join(''),
      text({
        x: CONTENT.x,
        y: BAR.y - 5,
        content: 'Пропорции в макете',
        family: theme.heading.family,
        size: SIZE.h3,
        weight: 700,
        fill: theme.ink,
      }),
      shareBar(doc),
      text({
        x: CONTENT.x,
        y: BAR.y + BAR.height + 6,
        content:
          'Основной цвет держит макет, акцентный работает только в малой доле — от частого повторения он перестаёт выделять.',
        family: theme.body.family,
        size: SIZE.caption,
        fill: theme.muted,
      }),
    ].join('')
  );
};

export const palettePage: PageModule = {
  key: 'palette',
  section: 'Цвет',
  title: 'Фирменные цвета',
  render,
};
