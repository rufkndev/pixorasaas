import { Theme, LEADING, SIZE } from './theme';
import { Box, rect, text, textBlock } from './svg';
import { measure, wrap } from './textMetrics';

// Блоки, которые повторяются на большинстве полос. Каждый возвращает разметку и
// занятую высоту: полосы выстраивают содержимое потоком, а не по зашитым y.
export interface Flow {
  svg: string;
  height: number;
}

export const label = (theme: Theme, x: number, y: number, content: string): string =>
  text({
    x,
    y,
    content,
    family: theme.body.family,
    size: SIZE.caption,
    fill: theme.muted,
    tracking: 0.35,
    uppercase: true,
  });

export const title = (theme: Theme, x: number, y: number, content: string): string =>
  text({
    x,
    y,
    content,
    family: theme.heading.family,
    size: SIZE.h3,
    weight: 700,
    fill: theme.ink,
  });

export interface ParagraphOptions {
  x: number;
  y: number;
  width: number;
  content: string;
  size?: number;
  fill?: string;
  maxLines?: number;
}

export const paragraph = (theme: Theme, options: ParagraphOptions): Flow => {
  const size = options.size ?? SIZE.body;
  const lineHeight = size * LEADING.normal;
  const lines = wrap(options.content, { font: theme.body, size }, options.width).slice(
    0,
    options.maxLines ?? 12
  );

  return {
    svg: textBlock({
      x: options.x,
      y: options.y,
      lines,
      family: theme.body.family,
      size,
      fill: options.fill ?? theme.ink,
      lineHeight,
    }),
    height: lines.length * lineHeight,
  };
};

export interface ListOptions {
  x: number;
  y: number;
  width: number;
  items: string[];
  size?: number;
  marker?: string;
  markerFill?: string;
  gap?: number;
}

export const bullets = (theme: Theme, options: ListOptions): Flow => {
  const size = options.size ?? SIZE.small;
  const lineHeight = size * LEADING.normal;
  const marker = options.marker ?? '—';
  const indent = size * 1.8;
  const gap = options.gap ?? 1.6;

  const parts: string[] = [];
  let y = options.y;

  for (const item of options.items) {
    const lines = wrap(item, { font: theme.body, size }, options.width - indent);

    parts.push(
      text({
        x: options.x,
        y,
        content: marker,
        family: theme.body.family,
        size,
        fill: options.markerFill ?? theme.color.accent,
        weight: 600,
      }),
      textBlock({
        x: options.x + indent,
        y,
        lines,
        family: theme.body.family,
        size,
        fill: theme.ink,
        lineHeight,
      })
    );

    y += lines.length * lineHeight + gap;
  }

  return { svg: parts.join(''), height: Math.max(0, y - options.y - gap) };
};

// Светлая плашка под содержимое. Фон — светлый цвет палитры, чтобы страница
// не выглядела набранной чужими серыми блоками
export const plate = (theme: Theme, box: Box, fill?: string): string =>
  rect({ ...box, fill: fill ?? theme.color.light, radius: 2 });

export const hairlinePlate = (theme: Theme, box: Box): string =>
  rect({ ...box, fill: theme.paper, stroke: theme.hair, strokeWidth: 0.25, radius: 2 });

// Слова-качества бренда набором плашек. Ширина считается по метрикам, иначе
// длинное слово выезжает из плашки
export const chips = (
  theme: Theme,
  x: number,
  y: number,
  items: string[],
  maxWidth: number
): Flow => {
  const size = SIZE.small;
  const padding = 3;
  const height = 7;
  const parts: string[] = [];

  let cursorX = x;
  let cursorY = y;

  for (const item of items) {
    const width = measure(item, { font: theme.body, size, weight: 600 }) + padding * 2;

    if (cursorX + width > x + maxWidth) {
      cursorX = x;
      cursorY += height + 2.5;
    }

    parts.push(
      rect({
        x: cursorX,
        y: cursorY,
        width,
        height,
        fill: theme.paper,
        stroke: theme.color.accent,
        strokeWidth: 0.3,
        radius: 3.5,
      }),
      text({
        x: cursorX + width / 2,
        y: cursorY + height / 2 + 1,
        content: item,
        family: theme.body.family,
        size,
        weight: 600,
        fill: theme.ink,
        anchor: 'middle',
      })
    );

    cursorX += width + 2.5;
  }

  return { svg: parts.join(''), height: cursorY + height - y };
};
