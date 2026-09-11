import { Artwork, boxOfWidth, loadArtwork, pickAsset, place } from '../artwork';
import { paragraph } from '../blocks';
import { chrome } from '../chrome';
import { BrandbookDoc, PageContext, PageModule } from '../document';
import { Box, circle, group, line, page, rect, text } from '../svg';
import { SIZE } from '../theme';
import { BODY_TOP, CONTENT, colWidth, colX, round } from '../units';

const SPAN = 4;
const TILE = { width: colWidth(SPAN), height: 46 };
// Второй ряд начинается так, чтобы подписи под ним не залезли на колонтитул
const ROWS = [BODY_TOP + 10, BODY_TOP + 10 + TILE.height + 22];

// Запреты показываются на настоящем логотипе, а не на условном прямоугольнике:
// иначе полоса не отвечает на вопрос «а как это будет выглядеть у меня».
// Подпись пишется под каждый запрет отдельно и не берётся из guidelines.misuse:
// тот список модель пишет в своём порядке, и объяснения разъезжались с
// картинками — под тенью оказывался текст про перекраску.
const RULES = [
  ['Не растягивать и не сжимать', 'Пропорции логотипа неизменны. Масштабируйте только за угол.'],
  ['Не поворачивать', 'Логотип всегда стоит горизонтально, под любым углом он читается хуже.'],
  ['Не перекрашивать', 'Цвета заданы палитрой. Нужен один цвет — берите готовую однокрасочную версию.'],
  ['Не добавлять тени и объём', 'Ни теней, ни обводок, ни градиентов, ни скосов: знак плоский.'],
  ['Не ставить на пёстрый фон', 'На фотографии и узоре кладите логотип на однотонную подложку.'],
  ['Не ронять контраст', 'Логотип должен отделяться от фона. Светлый на светлом не работает.'],
];

// feDropShadow — из SVG2, и полагаться на него в librsvg 2.54 не стоит.
// Размытие со смещением работает везде и даёт ту же картинку.
const FILTERS = (accent: string): string =>
  `<defs>` +
  `<filter id="misuse-hue"><feColorMatrix type="hueRotate" values="130"/></filter>` +
  `<filter id="misuse-shadow" x="-30%" y="-30%" width="170%" height="170%">` +
  `<feGaussianBlur in="SourceAlpha" stdDeviation="1.2"/>` +
  `<feOffset dx="1.4" dy="1.8" result="shade"/>` +
  `<feFlood flood-color="${accent}" flood-opacity="0.55"/>` +
  `<feComposite in2="shade" operator="in"/>` +
  `<feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>` +
  `</filter>` +
  `</defs>`;

// Пёстрая подложка: пятна раскладываются детерминированно — повтор сборки
// должен дать тот же документ. Центры зажаты так, чтобы круг целиком остался
// внутри плашки: обрезка через clipPath в librsvg не сработала, круги вылезали
// на соседние карточки.
const busy = (box: Box, colors: string[]): string => {
  const spots: string[] = [rect({ ...box, fill: colors[0], radius: 2, opacity: 0.25 })];

  for (let index = 0; index < 12; index += 1) {
    const radius = 3 + (index % 4) * 1.8;
    const x = box.x + radius + (((index * 37) % 100) / 100) * (box.width - radius * 2);
    const y = box.y + radius + (((index * 53) % 100) / 100) * (box.height - radius * 2);
    spots.push(circle(x, y, radius, colors[index % colors.length]));
  }

  return spots.join('');
};

const tile = (doc: BrandbookDoc, artwork: Artwork | null, index: number): string => {
  const { theme } = doc;
  const x = colX((index % 3) * SPAN);
  const y = ROWS[Math.floor(index / 3)];
  const box: Box = { x, y, width: TILE.width, height: TILE.height };

  // Логотип занимает две трети плашки, чтобы искажение было видно
  const inner = boxOfWidth(artwork, 0, 0, TILE.width * 0.62);
  const placed: Box = {
    ...inner,
    x: x + (TILE.width - inner.width) / 2,
    y: y + (TILE.height - inner.height) / 2,
  };

  const parts: string[] = [
    rect({ ...box, fill: theme.paper, stroke: theme.hair, strokeWidth: 0.25, radius: 2 }),
  ];

  if (index === 0) {
    // Растяжение: fit 'none' ломает пропорции ровно так, как это делают руками
    const stretched = { x: x + 6, width: TILE.width - 12, height: inner.height * 0.6 };
    parts.push(
      place(artwork, { ...stretched, y: y + (TILE.height - stretched.height) / 2 }, 'none')
    );
  } else if (index === 1) {
    const cx = placed.x + placed.width / 2;
    const cy = placed.y + placed.height / 2;
    parts.push(group(place(artwork, placed), `rotate(-14 ${round(cx)} ${round(cy)})`));
  } else if (index === 2) {
    parts.push(`<g filter="url(#misuse-hue)">${place(artwork, placed)}</g>`);
  } else if (index === 3) {
    parts.push(`<g filter="url(#misuse-shadow)">${place(artwork, placed)}</g>`);
  } else if (index === 4) {
    parts.push(
      busy(box, [theme.color.accent, theme.color.primary, theme.color.secondary, theme.color.neutral]),
      place(artwork, placed)
    );
  } else {
    parts.push(`<g opacity="0.18">${place(artwork, placed)}</g>`);
  }

  // Косой крест поверх плашки: подпись под ней объясняет запрет, а крест виден
  // раньше, чем прочитан текст
  parts.push(
    line({
      x1: box.x + box.width - 11,
      y1: box.y + 4,
      x2: box.x + box.width - 4,
      y2: box.y + 11,
      stroke: '#c62828',
      width: 0.8,
    }),
    line({
      x1: box.x + box.width - 4,
      y1: box.y + 4,
      x2: box.x + box.width - 11,
      y2: box.y + 11,
      stroke: '#c62828',
      width: 0.8,
    }),
    text({
      x: box.x,
      y: box.y + box.height + 6,
      content: RULES[index][0],
      family: theme.body.family,
      size: SIZE.small,
      weight: 600,
      fill: theme.ink,
    }),
    paragraph(theme, {
      x: box.x,
      y: box.y + box.height + 11,
      width: box.width,
      content: RULES[index][1],
      size: SIZE.caption,
      fill: theme.muted,
      maxLines: 2,
    }).svg
  );

  return parts.join('');
};

const render = async (doc: BrandbookDoc, ctx: PageContext): Promise<string> => {
  const { theme } = doc;
  const artwork = await loadArtwork(pickAsset(doc.logoAssets, 'horizontal', 'primary', 'stacked'));

  const intro = paragraph(theme, {
    x: CONTENT.x,
    y: BODY_TOP,
    width: CONTENT.width,
    content:
      'Логотип уже нарисован — его не нужно улучшать. Всё, что показано ниже, разрушает узнаваемость и в макетах бренда недопустимо.',
    size: SIZE.body,
    fill: theme.muted,
    maxLines: 1,
  });

  const tiles = RULES.map((_, index) => tile(doc, artwork, index)).join('');

  return page(
    theme.paper,
    [chrome(doc, ctx, 'Недопустимое использование'), FILTERS(theme.ink), intro.svg, tiles].join('')
  );
};

export const misusePage: PageModule = {
  key: 'misuse',
  section: 'Логотип',
  title: 'Недопустимое использование',
  enabled: (doc) => doc.logoAssets.length > 0,
  render,
};
