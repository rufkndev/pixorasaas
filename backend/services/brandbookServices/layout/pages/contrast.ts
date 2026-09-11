import { bullets, label, paragraph } from '../blocks';
import { chrome } from '../chrome';
import { BrandbookDoc, PageContext, PageModule } from '../document';
import { page, rect, text } from '../svg';
import { SIZE } from '../theme';
import { BODY_TOP, CONTENT, colWidth, colX } from '../units';

const ROW = 13;
const COLUMN = { name: 0, sample: 52, ratio: 118, verdict: 150 };

const verdictOf = (ratio: number): { text: string; ok: boolean } => {
  if (ratio >= 7) return { text: 'AAA — любой текст', ok: true };
  if (ratio >= 4.5) return { text: 'AA — любой текст', ok: true };
  if (ratio >= 3) return { text: 'Только крупный текст', ok: true };
  return { text: 'Для текста не годится', ok: false };
};

// Контраст настоящий (colord/plugins/a11y). Прежний код считал яркость по
// формуле NTSC и ставил класс AA/AAA по её диапазону — в платном документе
// так писать нельзя.
const row = (doc: BrandbookDoc, index: number): string => {
  const color = doc.colors[index];
  const { theme } = doc;
  const y = BODY_TOP + 14 + index * ROW;
  const verdict = verdictOf(color.textOn.ratio);

  return [
    text({
      x: CONTENT.x,
      y: y + 6,
      content: color.name,
      family: theme.body.family,
      size: SIZE.small,
      weight: 600,
      fill: theme.ink,
    }),
    text({
      x: CONTENT.x,
      y: y + 10,
      content: color.hex.toUpperCase(),
      family: theme.body.family,
      size: SIZE.caption,
      fill: theme.muted,
    }),
    // Образец — настоящая пара «подложка и текст», а не абстрактное число
    rect({
      x: CONTENT.x + COLUMN.sample,
      y,
      width: 60,
      height: ROW - 3,
      fill: color.hex,
      radius: 1,
    }),
    text({
      x: CONTENT.x + COLUMN.sample + 4,
      y: y + 7,
      content: 'Текст на подложке',
      family: theme.body.family,
      size: SIZE.small,
      fill: color.textOn.hex,
    }),
    text({
      x: CONTENT.x + COLUMN.ratio,
      y: y + 7,
      content: `${color.textOn.ratio}:1`,
      family: theme.body.family,
      size: SIZE.small,
      weight: 600,
      fill: theme.ink,
    }),
    text({
      x: CONTENT.x + COLUMN.verdict,
      y: y + 7,
      content: verdict.text,
      family: theme.body.family,
      size: SIZE.small,
      fill: verdict.ok ? theme.ink : '#c62828',
    }),
  ].join('');
};

// Цвет как текст на белом — отдельный вопрос: подложка может быть отличной,
// а тот же цвет буквами на белом уже не читаться
const onWhite = (doc: BrandbookDoc): string => {
  const { theme } = doc;
  const x = 218;
  const parts: string[] = [label(theme, x, BODY_TOP + 6, 'Цвет как текст на белом')];

  for (const [index, color] of doc.colors.entries()) {
    const y = BODY_TOP + 14 + index * ROW;

    parts.push(
      text({
        x,
        y: y + 7,
        content: 'Аа Бб 123',
        family: theme.body.family,
        size: SIZE.body,
        weight: 600,
        fill: color.hex,
      }),
      text({
        x: CONTENT.right,
        y: y + 7,
        content: color.asTextOnWhite.aa
          ? `${color.asTextOnWhite.ratio}:1 AA`
          : color.asTextOnWhite.aaLarge
            ? `${color.asTextOnWhite.ratio}:1 крупный`
            : `${color.asTextOnWhite.ratio}:1 нет`,
        family: theme.body.family,
        size: SIZE.caption,
        fill: color.asTextOnWhite.aa ? theme.muted : '#c62828',
        anchor: 'end',
      })
    );
  }

  return parts.join('');
};

const render = async (doc: BrandbookDoc, ctx: PageContext): Promise<string> => {
  const { theme } = doc;

  const rows = doc.colors.map((_, index) => row(doc, index)).join('');
  const bottom = BODY_TOP + 14 + doc.colors.length * ROW + 12;

  const rules = doc.guidelines?.colorRules?.slice(0, 4) || [];

  const note = paragraph(theme, {
    x: CONTENT.x,
    y: bottom,
    width: colWidth(6),
    content:
      'Контраст посчитан по WCAG 2.1: отношение яркостей подложки и текста. 4.5:1 — порог для обычного текста, 3:1 — для крупного от 24 px или полужирного от 19 px.',
    size: SIZE.small,
    fill: theme.muted,
    maxLines: 4,
  });

  return page(
    theme.paper,
    [
      chrome(doc, ctx, 'Контраст и сочетания'),
      label(theme, CONTENT.x, BODY_TOP + 6, 'Текст на фирменной подложке'),
      rows,
      onWhite(doc),
      note.svg,
      rules.length
        ? bullets(theme, {
            x: colX(7),
            y: bottom,
            width: colWidth(5),
            items: rules,
            size: SIZE.small,
          }).svg
        : '',
    ].join('')
  );
};

export const contrastPage: PageModule = {
  key: 'contrast',
  section: 'Цвет',
  title: 'Контраст и сочетания',
  enabled: (doc) => doc.colors.length > 0,
  render,
};
