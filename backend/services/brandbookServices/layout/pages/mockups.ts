import fs from 'fs';

import { resolveGeneratedLogoPath } from '../../../../paths';
import { Mockup } from '../../mockups';
import { paragraph } from '../blocks';
import { chrome } from '../chrome';
import { BrandbookDoc, PageContext, PageModule } from '../document';
import { Box, page, rect, text } from '../svg';
import { parseSvg } from '../svgSource';
import { fitSize } from '../textMetrics';
import { SIZE } from '../theme';
import { BODY_TOP, CONTENT, colWidth, colX, round } from '../units';

// Два ряда по три должны уложиться между шапкой и колонтитулом: при
// плашке в 62 мм подписи второго ряда наезжали на колонтитул
const CARD = { top: BODY_TOP + 10, plate: 46, pitch: 68 };

// Макет вкладывается вектором: он и собран вектором, значит в PDF попадёт
// без растеризации и останется резким на любом увеличении
const embed = (svg: string, box: Box): string => {
  const parsed = parseSvg(svg);

  if (!parsed) return '';

  return (
    `<svg x="${round(box.x)}" y="${round(box.y)}" width="${round(box.width)}" ` +
    `height="${round(box.height)}" viewBox="${parsed.viewBox}" ` +
    `preserveAspectRatio="xMidYMid meet" ${parsed.attrs}>${parsed.inner}</svg>`
  );
};

const readSvg = (url: string | undefined): string | null => {
  const path = url ? resolveGeneratedLogoPath(url) : null;

  if (!path || !fs.existsSync(path)) return null;

  try {
    return fs.readFileSync(path, 'utf8');
  } catch {
    return null;
  }
};

const card = (doc: BrandbookDoc, mockup: Mockup, index: number): string => {
  const { theme } = doc;
  const span = 4;
  const x = colX((index % 3) * span);
  const y = CARD.top + Math.floor(index / 3) * CARD.pitch;
  const width = colWidth(span);

  const plate: Box = { x, y, width, height: CARD.plate };
  const svg = readSvg(mockup.files.svg);

  // Рядом с названием стоит размер, поэтому длинное название прижимается
  // к нему вплотную — кегль подбирается под оставшуюся ширину
  const nameSize = fitSize(
    mockup.name,
    { font: theme.heading, size: SIZE.h3, weight: 700 },
    width - 26,
    3
  );

  return [
    rect({ ...plate, fill: theme.color.light, radius: 2 }),
    svg
      ? embed(svg, { x: x + 4, y: y + 4, width: width - 8, height: CARD.plate - 8 })
      : text({
          x: x + width / 2,
          y: y + CARD.plate / 2,
          content: 'HTML',
          family: theme.body.family,
          size: SIZE.body,
          fill: theme.muted,
          anchor: 'middle',
        }),
    text({
      x,
      y: y + CARD.plate + 7,
      content: mockup.name,
      family: theme.heading.family,
      size: nameSize,
      weight: 700,
      fill: theme.ink,
    }),
    text({
      x: x + width,
      y: y + CARD.plate + 7,
      content: mockup.size,
      family: theme.body.family,
      size: SIZE.caption,
      fill: theme.color.accent,
      anchor: 'end',
    }),
    paragraph(theme, {
      x,
      y: y + CARD.plate + 12,
      width,
      content: mockup.usage,
      size: SIZE.caption,
      fill: theme.muted,
      maxLines: 2,
    }).svg,
  ].join('');
};

const render = async (doc: BrandbookDoc, ctx: PageContext): Promise<string> => {
  const { theme } = doc;

  const intro = paragraph(theme, {
    x: CONTENT.x,
    y: BODY_TOP,
    width: CONTENT.width,
    content:
      'Макеты собраны в рабочих размерах: визитка — с вылетами под нож, экранные — в тех пикселях, которые принимают площадки. Исходники в SVG правятся в любом редакторе, контакты в них — заглушки. Все файлы лежат в архиве в папке mockups.',
    size: SIZE.small,
    fill: theme.muted,
    maxLines: 2,
  });

  const cards = doc.mockups.slice(0, 6).map((mockup, index) => card(doc, mockup, index));

  return page(
    theme.paper,
    [
      chrome(doc, ctx, 'Носители'),
      intro.svg,
      cards.join(''),
    ].join('')
  );
};

export const mockupsPage: PageModule = {
  key: 'mockups',
  section: 'Носители',
  title: 'Носители',
  enabled: (doc) => doc.mockups.length > 0,
  render,
};
