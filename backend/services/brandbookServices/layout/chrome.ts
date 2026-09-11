import { BrandbookDoc, PageContext } from './document';
import { SIZE } from './theme';
import { line, text } from './svg';
import { CONTENT, PAGE } from './units';

// Одна шапка и один колонтитул на все полосы: иначе каждая начинает ставить
// заголовок на свой лад и документ рассыпается
export const chrome = (
  doc: BrandbookDoc,
  ctx: PageContext,
  title: string,
  section?: string
): string => {
  const { theme } = doc;

  return [
    text({
      x: CONTENT.x,
      y: 21,
      content: section || ctx.outline.find((entry) => entry.page === ctx.number)?.section || '',
      family: theme.body.family,
      size: SIZE.caption,
      fill: theme.muted,
      tracking: 0.35,
      uppercase: true,
    }),
    text({
      x: CONTENT.x,
      y: 31,
      content: title,
      family: theme.heading.family,
      size: SIZE.h2,
      weight: 700,
      fill: theme.ink,
    }),
    // Тонкая линия под шапкой и акцентный отрезок на ней: единственный
    // повторяющийся фирменный элемент документа
    line({ x1: CONTENT.x, y1: 35.5, x2: CONTENT.right, y2: 35.5, stroke: theme.hair, width: 0.25 }),
    line({
      x1: CONTENT.x,
      y1: 35.5,
      x2: CONTENT.x + 24,
      y2: 35.5,
      stroke: theme.color.accent,
      width: 0.8,
    }),
    line({
      x1: CONTENT.x,
      y1: PAGE.height - 18,
      x2: CONTENT.right,
      y2: PAGE.height - 18,
      stroke: theme.hair,
      width: 0.25,
    }),
    text({
      x: CONTENT.x,
      y: PAGE.height - 13.5,
      content: `${doc.name} · Брендбук`,
      family: theme.body.family,
      size: SIZE.caption,
      fill: theme.muted,
    }),
    text({
      x: CONTENT.right,
      y: PAGE.height - 13.5,
      content: String(ctx.number),
      family: theme.body.family,
      size: SIZE.caption,
      fill: theme.muted,
      anchor: 'end',
    }),
  ].join('');
};
