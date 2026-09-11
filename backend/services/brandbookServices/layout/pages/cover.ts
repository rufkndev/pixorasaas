import { loadArtwork, pickAsset, place } from '../artwork';
import { BrandbookDoc, PageContext, PageModule } from '../document';
import { line, page, rect, text, textBlock } from '../svg';
import { LEADING, SIZE } from '../theme';
import { PAGE } from '../units';
import { fitSize, wrap } from '../textMetrics';

const TEXT_X = 24;
const TEXT_WIDTH = 128;

// Отступы между строками обложки. Ими же считается высота блока для центровки
const GAP = { eyebrow: 16, slogan: 14, rule: 12, date: 9 };

// Название набирается в две строки максимум: с третьей обложка перестаёт
// читаться. Кегль подбирается под фактическую ширину, а не берётся на глаз.
const nameLayout = (doc: BrandbookDoc) => {
  const style = { font: doc.theme.heading, weight: 700, size: SIZE.cover };

  for (const size of [SIZE.cover, 11.5, 9.5, 8]) {
    const lines = wrap(doc.name, { ...style, size }, TEXT_WIDTH);
    if (lines.length <= 2) return { size, lines };
  }

  const size = fitSize(doc.name, style, TEXT_WIDTH, 6);
  return { size, lines: wrap(doc.name, { ...style, size }, TEXT_WIDTH) };
};

// Обложка на тёмном цвете палитры: он всегда сохраняет тон бренда, и на нём
// работает выворотка логотипа — та самая версия, которую мы собрали
const render = async (doc: BrandbookDoc, _ctx: PageContext): Promise<string> => {
  const { theme } = doc;
  const ink = theme.onDark;

  const artwork = await loadArtwork(pickAsset(doc.logoAssets, 'mono-white', 'mark', 'primary'));
  const name = nameLayout(doc);

  const sloganLines = doc.slogan
    ? wrap(doc.slogan, { font: theme.body, size: SIZE.lead }, TEXT_WIDTH)
    : [];

  const nameLine = name.size * LEADING.tight;
  const sloganLine = SIZE.lead * LEADING.normal;

  // Блок ставится по центру полосы, и его высота складывается из тех же
  // отступов, которыми он потом рисуется. Считать по числу строк нельзя:
  // расстояние между первой и последней базовой линией на одну строку меньше,
  // и обложка уезжала вверх на десяток миллиметров.
  const span =
    GAP.eyebrow +
    (name.lines.length - 1) * nameLine +
    (sloganLines.length ? GAP.slogan + (sloganLines.length - 1) * sloganLine : 0) +
    GAP.rule +
    GAP.date;

  const top = Math.max(46, (PAGE.height - span) / 2);

  let y = top + GAP.eyebrow;
  const parts: string[] = [
    rect({ x: 0, y: 0, width: PAGE.width, height: 2.5, fill: theme.color.accent }),
    text({
      x: TEXT_X,
      y: top,
      content: 'Брендбук',
      family: theme.body.family,
      size: SIZE.small,
      fill: ink,
      opacity: 0.6,
      tracking: 0.8,
      uppercase: true,
    }),
    textBlock({
      x: TEXT_X,
      y,
      lines: name.lines,
      family: theme.heading.family,
      size: name.size,
      weight: 700,
      fill: ink,
      lineHeight: nameLine,
    }),
  ];

  y += (name.lines.length - 1) * nameLine;

  if (sloganLines.length) {
    y += GAP.slogan;

    parts.push(
      textBlock({
        x: TEXT_X,
        y,
        lines: sloganLines,
        family: theme.body.family,
        size: SIZE.lead,
        fill: ink,
        opacity: 0.85,
        lineHeight: sloganLine,
      })
    );

    y += (sloganLines.length - 1) * sloganLine;
  }

  y += GAP.rule;

  parts.push(
    line({ x1: TEXT_X, y1: y, x2: TEXT_X + 24, y2: y, stroke: theme.color.accent, width: 0.8 }),
    text({
      x: TEXT_X,
      y: y + GAP.date,
      content: `Выпущен ${doc.date}`,
      family: theme.body.family,
      size: SIZE.small,
      fill: ink,
      opacity: 0.6,
    }),
    text({
      x: TEXT_X,
      y: PAGE.height - 16,
      content: `Заказ ${doc.orderId}`,
      family: theme.body.family,
      size: SIZE.caption,
      fill: ink,
      opacity: 0.45,
    }),
    place(artwork, { x: 172, y: 48, width: 101, height: 114 })
  );

  return page(theme.color.dark, parts.join(''));
};

export const coverPage: PageModule = {
  key: 'cover',
  section: 'Документ',
  title: 'Обложка',
  render,
};
