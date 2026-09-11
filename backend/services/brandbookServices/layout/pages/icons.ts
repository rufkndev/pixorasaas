import { label, paragraph, plate } from '../blocks';
import { chrome } from '../chrome';
import { BrandbookDoc, PageContext, PageModule } from '../document';
import { page, rect, text } from '../svg';
import { parseSvg } from '../svgSource';
import { SIZE } from '../theme';
import { BODY_TOP, CONTENT, colWidth, colX, round } from '../units';

const LEFT = { x: CONTENT.x, width: colWidth(8) };
const RIGHT = { x: colX(9), width: colWidth(3) };

const CELL = { size: (LEFT.width - 3 * 2) / 4, plate: 30, pitch: 40 };
const ROWS = [BODY_TOP + 10, BODY_TOP + 10 + CELL.pitch, BODY_TOP + 10 + CELL.pitch * 2];

// Чужой SVG вкладывается целиком: у паттерна внутри свой <defs> с плиткой,
// и разбирать его на части нельзя
const embed = (svg: string, x: number, y: number, width: number, height: number, color?: string): string => {
  const parsed = parseSvg(svg);

  if (!parsed) return '';

  const paint = (value: string) => (color ? value.replace(/currentColor/g, color) : value);

  return (
    `<svg x="${round(x)}" y="${round(y)}" width="${round(width)}" height="${round(height)}" ` +
    `viewBox="${parsed.viewBox}" preserveAspectRatio="xMidYMid meet" ${paint(parsed.attrs)}>` +
    `${paint(parsed.inner)}</svg>`
  );
};

const byCategory = (doc: BrandbookDoc, category: string) =>
  doc.icons.filter((item) => item?.svg && item.category === category);

const iconGrid = (doc: BrandbookDoc): string => {
  const { theme } = doc;
  const icons = byCategory(doc, 'icon').slice(0, 12);
  const parts: string[] = [];

  for (const [index, icon] of icons.entries()) {
    const x = LEFT.x + (index % 4) * (CELL.size + 2);
    const y = ROWS[Math.floor(index / 4)];
    const padding = 6;

    parts.push(
      plate(theme, { x, y, width: CELL.size, height: CELL.plate }),
      embed(
        icon.svg,
        x + (CELL.size - (CELL.plate - padding * 2)) / 2,
        y + padding,
        CELL.plate - padding * 2,
        CELL.plate - padding * 2,
        theme.color.primary
      ),
      text({
        x: x + CELL.size / 2,
        y: y + CELL.plate + 5,
        content: icon.name || '',
        family: theme.body.family,
        size: SIZE.caption,
        fill: theme.muted,
        anchor: 'middle',
      })
    );
  }

  return parts.join('');
};

// Паттерны, разделители и подложки — фирменная графика, нарисованная из
// палитры этого бренда. Показываем образцы, файлы уходят в архив.
const graphics = (doc: BrandbookDoc): string => {
  const { theme } = doc;
  const patterns = byCategory(doc, 'pattern').slice(0, 4);
  const dividers = byCategory(doc, 'divider').slice(0, 2);
  const backgrounds = byCategory(doc, 'background').slice(0, 2);

  const parts: string[] = [label(theme, RIGHT.x, BODY_TOP + 2, 'Паттерны')];
  const tile = (RIGHT.width - 3) / 2;

  for (const [index, pattern] of patterns.entries()) {
    const x = RIGHT.x + (index % 2) * (tile + 3);
    const y = BODY_TOP + 8 + Math.floor(index / 2) * (tile + 3);

    parts.push(
      embed(pattern.svg, x, y, tile, tile),
      rect({ x, y, width: tile, height: tile, fill: 'none', stroke: theme.hair, strokeWidth: 0.25 })
    );
  }

  let y = BODY_TOP + 8 + (tile + 3) * 2 + 8;
  parts.push(label(theme, RIGHT.x, y, 'Разделители'));
  y += 6;

  for (const divider of dividers) {
    parts.push(embed(divider.svg, RIGHT.x, y, RIGHT.width, 3.5));
    y += 9;
  }

  y += 4;
  parts.push(label(theme, RIGHT.x, y, 'Подложки'));
  y += 5;

  for (const [index, background] of backgrounds.entries()) {
    parts.push(embed(background.svg, RIGHT.x + index * (tile + 3), y, tile, tile * 0.56));
  }

  return parts.join('');
};

const render = async (doc: BrandbookDoc, ctx: PageContext): Promise<string> => {
  const { theme } = doc;
  const sets = [...new Set(byCategory(doc, 'icon').map((icon) => icon.set).filter(Boolean))];

  const intro = paragraph(theme, {
    x: CONTENT.x,
    y: BODY_TOP,
    width: LEFT.width,
    content: `Иконки одного набора и одной толщины линии${
      sets.length ? ` (${sets.join(', ')})` : ''
    }. Смешивать наборы нельзя: разная оптика видна сразу. Цвет — основной, тёмный или выворотка, но внутри одного макета один.`,
    size: SIZE.small,
    fill: theme.muted,
    maxLines: 2,
  });

  return page(
    theme.paper,
    [
      chrome(doc, ctx, 'Иконки и графика'),
      intro.svg,
      iconGrid(doc),
      graphics(doc),
      text({
        x: CONTENT.x,
        y: 186,
        content:
          'Минимальный размер иконки — 16 px на экране и 4 мм в печати. Толщину линии не меняйте, рамками не обводите. Файлы и лицензии лежат в архиве в папке icons.',
        family: theme.body.family,
        size: SIZE.caption,
        fill: theme.muted,
      }),
    ].join('')
  );
};

export const iconsPage: PageModule = {
  key: 'icons',
  section: 'Графика',
  title: 'Иконки и графика',
  enabled: (doc) => doc.icons.some((item) => item?.svg),
  render,
};
