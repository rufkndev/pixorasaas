import { Artwork, boxOfWidth, loadArtwork, pickAsset, place } from '../artwork';
import { bullets, label, paragraph, plate, title } from '../blocks';
import { chrome } from '../chrome';
import { BrandbookDoc, PageContext, PageModule } from '../document';
import { Box, line, page, rect, text } from '../svg';
import { SIZE } from '../theme';
import { BODY_TOP, CONTENT } from '../units';

const LEFT = { x: CONTENT.x, width: 132 };
const RIGHT = { x: 168, width: CONTENT.right - 168 };

// Свободное поле задаётся долей от большей стороны логотипа. Так правило можно
// проверить линейкой на любом размере, и оно не зависит от того, какая версия
// логотипа в макете. Формулировка на полосе совпадает с тем, что нарисовано.
const CLEAR_RATIO = 0.1;

const PRINT_MIN = 20;
const MARK_MIN = 10;

// Размерная линия с засечками: без неё «20 мм» — просто подпись, а с ней это
// проверяемое утверждение
const caliper = (
  doc: BrandbookDoc,
  x: number,
  y: number,
  width: number,
  content: string
): string => {
  const { theme } = doc;

  return [
    line({ x1: x, y1: y, x2: x + width, y2: y, stroke: theme.color.accent, width: 0.3 }),
    line({ x1: x, y1: y - 1.5, x2: x, y2: y + 1.5, stroke: theme.color.accent, width: 0.3 }),
    line({
      x1: x + width,
      y1: y - 1.5,
      x2: x + width,
      y2: y + 1.5,
      stroke: theme.color.accent,
      width: 0.3,
    }),
    text({
      x: x + width / 2,
      y: y + 5,
      content,
      family: theme.body.family,
      size: SIZE.caption,
      weight: 600,
      fill: theme.color.accent,
      anchor: 'middle',
    }),
  ].join('');
};

const clearSpaceDrawing = (doc: BrandbookDoc, artwork: Artwork | null, logo: Box): string => {
  const { theme } = doc;
  const unit = Math.max(logo.width, logo.height) * CLEAR_RATIO;

  const frame: Box = {
    x: logo.x - unit,
    y: logo.y - unit,
    width: logo.width + unit * 2,
    height: logo.height + unit * 2,
  };

  return [
    rect({
      ...frame,
      fill: 'none',
      stroke: theme.color.accent,
      strokeWidth: 0.3,
      radius: 0.5,
    }),
    // Квадрат со стороной X в углу: по нему поле измеряется на глаз
    rect({ x: frame.x, y: frame.y, width: unit, height: unit, fill: theme.color.accent, opacity: 0.18 }),
    rect({
      x: frame.x + frame.width - unit,
      y: frame.y + frame.height - unit,
      width: unit,
      height: unit,
      fill: theme.color.accent,
      opacity: 0.18,
    }),
    text({
      x: frame.x + unit / 2,
      y: frame.y + unit / 2 + 1,
      content: 'X',
      family: doc.theme.body.family,
      size: SIZE.caption,
      weight: 700,
      fill: theme.color.accent,
      anchor: 'middle',
    }),
    rect({ ...logo, fill: 'none', stroke: theme.color.neutral, strokeWidth: 0.2 }),
    place(artwork, logo),
  ].join('');
};

const render = async (doc: BrandbookDoc, ctx: PageContext): Promise<string> => {
  const { theme } = doc;
  const wide = pickAsset(doc.logoAssets, 'horizontal', 'primary', 'stacked');
  const mark = pickAsset(doc.logoAssets, 'mark', 'primary');

  const wideArt = await loadArtwork(wide);
  const markArt = await loadArtwork(mark);

  // Логотип рисуется в собственных пропорциях, а не вписывается в бокс: иначе
  // рамка охранного поля обвела бы пустые поля вписывания, а не логотип
  const logo = boxOfWidth(wideArt, 0, 0, 74);
  const unit = Math.max(logo.width, logo.height) * CLEAR_RATIO;
  const stage = { x: LEFT.x, y: BODY_TOP, width: LEFT.width, height: 118 };

  // По центру плашки ставится рамка вместе с полем, а не сам логотип
  const placed: Box = {
    ...logo,
    x: stage.x + (stage.width - logo.width) / 2,
    y: stage.y + (stage.height - logo.height - unit * 2) / 2 + unit,
  };

  const parts: string[] = [
    chrome(doc, ctx, 'Охранное поле и минимальный размер'),
    plate(theme, stage),
    clearSpaceDrawing(doc, wideArt, placed),
    label(theme, LEFT.x, BODY_TOP + 130, 'Свободное поле'),
  ];

  const rule = paragraph(theme, {
    x: LEFT.x,
    y: BODY_TOP + 138,
    width: LEFT.width,
    content:
      'X — десятая часть большей стороны логотипа. Внутри рамки не должно быть ничего: ни текста, ни картинок, ни края макета. На больших размерах поле растёт вместе с логотипом.',
    size: SIZE.small,
    maxLines: 4,
  });

  parts.push(rule.svg);

  let y = BODY_TOP;
  parts.push(title(theme, RIGHT.x, y, 'Минимальный размер'));
  y += 12;

  const printBox = boxOfWidth(wideArt, RIGHT.x, y, PRINT_MIN);
  parts.push(place(wideArt, printBox), caliper(doc, RIGHT.x, y + printBox.height + 5, PRINT_MIN, `${PRINT_MIN} мм`));
  y += printBox.height + 14;

  parts.push(
    text({
      x: RIGHT.x,
      y,
      content: 'Логотип с надписью — в печати',
      family: theme.body.family,
      size: SIZE.small,
      fill: theme.muted,
    })
  );
  y += 12;

  const markBox = boxOfWidth(markArt, RIGHT.x, y, MARK_MIN);
  parts.push(place(markArt, markBox), caliper(doc, RIGHT.x, y + markBox.height + 5, MARK_MIN, `${MARK_MIN} мм`));
  y += markBox.height + 14;

  parts.push(
    text({
      x: RIGHT.x,
      y,
      content: 'Знак без надписи — в печати',
      family: theme.body.family,
      size: SIZE.small,
      fill: theme.muted,
    })
  );
  y += 12;

  parts.push(
    bullets(theme, {
      x: RIGHT.x,
      y,
      width: RIGHT.width,
      items: [
        'На экране: 80 px по ширине для логотипа с надписью, 32 px для знака.',
        'Меньше этих размеров надпись перестаёт читаться — берите версию «только знак».',
        'Логотип напечатан здесь в натуральную величину: приложите линейку.',
      ],
    }).svg
  );

  return page(theme.paper, parts.join(''));
};

export const clearspacePage: PageModule = {
  key: 'clearspace',
  section: 'Логотип',
  title: 'Охранное поле и размеры',
  enabled: (doc) => doc.logoAssets.length > 0,
  render,
};
