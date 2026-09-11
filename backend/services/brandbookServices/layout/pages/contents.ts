import { quoted } from '../../../../utils/slug';
import { label } from '../blocks';
import { chrome } from '../chrome';
import { BrandbookDoc, PageContext, PageModule } from '../document';
import { line, page, text } from '../svg';
import { SIZE } from '../theme';
import { BODY_TOP, CONTENT, colWidth, colX } from '../units';

const COLUMN = { width: colWidth(5) };
const ROW = 7.5;

// Содержание строится из состава документа, а не из зашитого списка: полоса
// без содержимого выпадает до нумерации, и дыр в оглавлении не появляется
const render = async (doc: BrandbookDoc, ctx: PageContext): Promise<string> => {
  const { theme } = doc;
  const entries = ctx.outline.filter((entry) => entry.key !== 'contents' && entry.key !== 'cover');

  // Раздел печатается один раз перед своими полосами
  const rows: Array<{ kind: 'section' | 'page'; text: string; page?: number }> = [];
  let section = '';

  for (const entry of entries) {
    if (entry.section !== section) {
      section = entry.section;
      rows.push({ kind: 'section', text: section });
    }
    rows.push({ kind: 'page', text: entry.title, page: entry.page });
  }

  // Название раздела не должно остаться последней строкой колонки, оторванным
  // от своих полос
  let half = Math.ceil(rows.length / 2);
  if (rows[half - 1]?.kind === 'section') half -= 1;

  const parts: string[] = [chrome(doc, ctx, 'Содержание')];

  for (const [index, row] of rows.entries()) {
    const column = index < half ? 0 : 1;
    const x = column === 0 ? colX(0) : colX(6);
    const y = BODY_TOP + (index - column * half) * ROW + (row.kind === 'section' ? 2 : 0);

    if (row.kind === 'section') {
      parts.push(label(theme, x, y, row.text));
      continue;
    }

    parts.push(
      text({
        x,
        y,
        content: row.text,
        family: theme.body.family,
        size: SIZE.body,
        fill: theme.ink,
      }),
      text({
        x: x + COLUMN.width,
        y,
        content: String(row.page),
        family: theme.body.family,
        size: SIZE.body,
        weight: 600,
        fill: theme.color.primary,
        anchor: 'end',
      }),
      line({
        x1: x,
        y1: y + 2.6,
        x2: x + COLUMN.width,
        y2: y + 2.6,
        stroke: theme.hair,
        width: 0.2,
      })
    );
  }

  parts.push(
    text({
      x: CONTENT.x,
      y: 190,
      content: `Документ описывает фирменный стиль ${quoted(doc.name)}. Все файлы — логотип, шрифты, иконки и макеты — лежат в архиве рядом с этим PDF.`,
      family: theme.body.family,
      size: SIZE.small,
      fill: theme.muted,
    })
  );

  return page(theme.paper, parts.join(''));
};

export const contentsPage: PageModule = {
  key: 'contents',
  section: 'Документ',
  title: 'Содержание',
  render,
};
