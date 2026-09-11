import { bullets, hairlinePlate, label, paragraph, title } from '../blocks';
import { chrome } from '../chrome';
import { BrandbookDoc, PageContext, PageModule } from '../document';
import { line, page, text, textBlock } from '../svg';
import { LEADING, SIZE } from '../theme';
import { BODY_TOP, CONTENT, mmToPt } from '../units';
import { measure, wrap } from '../textMetrics';

const LEFT = { x: CONTENT.x, width: 150 };
const RIGHT = { x: 180, width: CONTENT.right - 180 };

// Длина строки в знаках, а не в миллиметрах: миллиметры зависят от кегля,
// а глазу важно число знаков
const MEASURE_MIN = 45;
const MEASURE_MAX = 75;

const SAMPLE =
  'Основной текст набирается ровным блоком без выключки по формату и без переносов. ' +
  'Абзацы отделяются отбивкой, а не красной строкой: так текст лучше читается на экране.';

// Ширина колонки, при которой в строке оказывается нужное число знаков.
// Считается по средней ширине знака этого шрифта, а не по правилу большого пальца.
const measureWidth = (doc: BrandbookDoc, chars: number): number => {
  const probe = 'авторстроканабора ';
  const perChar = measure(probe, { font: doc.theme.body, size: SIZE.body }) / probe.length;

  return perChar * chars;
};

const render = async (doc: BrandbookDoc, ctx: PageContext): Promise<string> => {
  const { theme } = doc;
  const good = Math.min(LEFT.width, measureWidth(doc, MEASURE_MAX));

  const parts: string[] = [chrome(doc, ctx, 'Набор текста')];

  let y = BODY_TOP + 4;

  parts.push(
    text({
      x: LEFT.x,
      y,
      content: 'Как набирать',
      family: theme.heading.family,
      size: SIZE.h2,
      weight: 700,
      fill: theme.ink,
    })
  );
  y += 10;

  parts.push(
    text({
      x: LEFT.x,
      y,
      content: doc.slogan || doc.name,
      family: theme.heading.family,
      size: SIZE.h3,
      weight: 600,
      fill: theme.color.primary,
    })
  );
  y += 8;

  const body = paragraph(theme, { x: LEFT.x, y, width: good, content: SAMPLE, maxLines: 6 });
  parts.push(body.svg);
  y += body.height + 4;

  // Размерная линия по фактической ширине колонки: правило «45–75 знаков»
  // становится проверяемым прямо в документе
  parts.push(
    line({ x1: LEFT.x, y1: y, x2: LEFT.x + good, y2: y, stroke: theme.color.accent, width: 0.3 }),
    text({
      x: LEFT.x,
      y: y + 5,
      content: `Длина строки ${MEASURE_MIN}–${MEASURE_MAX} знаков · кегль ${mmToPt(
        SIZE.body
      )} pt · интерлиньяж ${LEADING.normal}`,
      family: theme.body.family,
      size: SIZE.caption,
      fill: theme.color.accent,
    })
  );
  y += 14;

  // Тот же текст, набранный неправильно: пример «как нельзя» рядом объясняет
  // правило быстрее, чем его формулировка
  parts.push(label(theme, LEFT.x, y, 'Так не надо'));
  y += 6;

  const tight = wrap(SAMPLE, { font: theme.body, size: SIZE.body }, LEFT.width - 6).slice(0, 3);

  parts.push(
    hairlinePlate(theme, {
      x: LEFT.x,
      y: y - 4,
      width: LEFT.width,
      height: tight.length * SIZE.body * 1.05 + 8,
    }),
    textBlock({
      x: LEFT.x + 3,
      y: y + 2,
      lines: tight,
      family: theme.body.family,
      size: SIZE.body,
      fill: theme.muted,
      lineHeight: SIZE.body * 1.05,
    }),
    text({
      x: LEFT.x,
      y: y + tight.length * SIZE.body * 1.05 + 11,
      content: 'Строка длиннее нормы, интерлиньяж 1.05 — строки слипаются, глаз теряет начало следующей.',
      family: theme.body.family,
      size: SIZE.caption,
      fill: theme.muted,
    })
  );

  y += tight.length * SIZE.body * 1.05 + 22;

  // Знаки набираются на месте, а не описываются словами: правило про «ёлочки»
  // бесполезно, если не видно, как они выглядят в этом шрифте
  parts.push(label(theme, LEFT.x, y, 'Знаки'));
  y += 8;

  const marks: Array<[string, string]> = [
    ['«Ёлочки» и „лапки“', 'кавычки'],
    ['тире — вот такое', 'не дефис'],
    ['№ 5, 10 %, 2026 г.', 'неразрывный пробел'],
    ['«Вектор» — 1200 ₽', 'валюта после числа'],
  ];

  for (const [sample, note] of marks) {
    parts.push(
      text({
        x: LEFT.x,
        y,
        content: sample,
        family: theme.body.family,
        size: SIZE.body,
        fill: theme.ink,
      }),
      text({
        x: LEFT.x + 62,
        y,
        content: note,
        family: theme.body.family,
        size: SIZE.caption,
        fill: theme.muted,
      })
    );
    y += 7;
  }

  // Правая колонка — иерархия заголовков на настоящем содержании документа
  let right = BODY_TOP + 4;
  parts.push(title(theme, RIGHT.x, right, 'Иерархия'));
  right += 12;

  const levels: Array<{ role: string; content: string; size: number; weight: number; family: string }> = [
    {
      role: 'Заголовок раздела',
      content: doc.name,
      size: SIZE.h2,
      weight: 700,
      family: theme.heading.family,
    },
    {
      role: 'Подзаголовок',
      content: doc.industry || doc.keywords || 'Направление работы',
      size: SIZE.h3,
      weight: 600,
      family: theme.heading.family,
    },
    {
      role: 'Основной текст',
      content: 'Абзац текста в две строки, набранный текстовым шрифтом пары.',
      size: SIZE.body,
      weight: 400,
      family: theme.body.family,
    },
    {
      role: 'Подпись',
      content: 'Сноска, подпись к картинке, служебная строка',
      size: SIZE.caption,
      weight: 400,
      family: theme.body.family,
    },
  ];

  for (const level of levels) {
    parts.push(label(theme, RIGHT.x, right, level.role));
    right += 5;

    const lines = wrap(level.content, { font: theme.body, size: level.size }, RIGHT.width).slice(0, 2);

    parts.push(
      textBlock({
        x: RIGHT.x,
        y: right + level.size * 0.8,
        lines,
        family: level.family,
        size: level.size,
        weight: level.weight,
        fill: theme.ink,
        lineHeight: level.size * LEADING.tight,
      })
    );

    right += level.size * 0.8 + (lines.length - 1) * level.size * LEADING.tight + 9;
  }

  right += 6;
  parts.push(label(theme, RIGHT.x, right, 'Ещё три правила'));

  parts.push(
    bullets(theme, {
      x: RIGHT.x,
      y: right + 8,
      width: RIGHT.width,
      items: [
        'Абзацы отделяйте отбивкой в половину строки, красную строку не используйте.',
        'Не выключайте текст по формату: в русском наборе это даёт дыры между словами.',
        'Заголовок и текст под ним — одно целое: не разрывайте их колонкой или страницей.',
      ],
      size: SIZE.small,
    }).svg
  );

  return page(theme.paper, parts.join(''));
};

export const textsettingPage: PageModule = {
  key: 'textsetting',
  section: 'Типографика',
  title: 'Набор текста',
  render,
};
