import { boxWithin, place } from '../layout/artwork';
import { line, rect, text } from '../layout/svg';
import { fitSize } from '../layout/textMetrics';
import { MockupBuild, MockupContext, canvasMm } from './canvas';

// Обрез 90 × 50 мм — российский стандарт. Плюс по 3 мм вылетов с каждой
// стороны: типография режет с допуском, и фон должен уходить под нож.
const TRIM = { width: 90, height: 50 };
const BLEED = 3;
const SIZE = { width: TRIM.width + BLEED * 2, height: TRIM.height + BLEED * 2 };

// Безопасное поле: ближе 4 мм к обрезу текст ставить нельзя
const SAFE = BLEED + 4;

// Настоящих контактов у нас нет, поэтому это заглушки — и они должны читаться
// как заглушки, а не как чьи-то реальные данные
const CONTACTS = [
  ['Имя Фамилия', 'Должность'],
  ['+7 900 000-00-00', 'hello@example.ru'],
  ['example.ru', ''],
];

const front = (ctx: MockupContext): string => {
  const { ink } = ctx;
  const art = ctx.darkArt || ctx.primaryArt;
  const sloganSize = ctx.slogan ? fitSize(ctx.slogan, { font: ink.body, size: 2.8 }, TRIM.width - 16, 2) : 0;
  const sloganBaseline = SIZE.height - BLEED - 9;

  // Логотип занимает место от безопасного поля до строки слогана (или до
  // полосы внизу) и стоит по центру этого места
  const top = SAFE;
  const bottom = ctx.slogan ? sloganBaseline - sloganSize - 3 : SIZE.height - BLEED - 3 - 4;
  const box = boxWithin(art, 0, 0, 44, bottom - top);

  return canvasMm(
    SIZE.width,
    SIZE.height,
    ink.dark,
    [
      rect({ x: 0, y: SIZE.height - BLEED - 3, width: SIZE.width, height: 3, fill: ink.accent }),
      place(art, {
        ...box,
        x: (SIZE.width - box.width) / 2,
        y: top + (bottom - top - box.height) / 2,
      }),
      ctx.slogan
        ? text({
            x: SIZE.width / 2,
            y: sloganBaseline,
            content: ctx.slogan,
            family: ink.body.family,
            size: sloganSize,
            fill: ink.onDark,
            opacity: 0.75,
            anchor: 'middle',
          })
        : '',
    ].join('')
  );
};

const back = (ctx: MockupContext): string => {
  const { ink } = ctx;
  const art = ctx.wideArt || ctx.primaryArt;

  const rows: string[] = [];
  const filled = CONTACTS.filter(([left]) => left);
  const ruleY = SIZE.height - SAFE - filled.length * 5 - 4;
  const box = boxWithin(art, SAFE, SAFE, 32, ruleY - 4 - SAFE);
  // Контакты прижаты к низу, логотип к верху: по центру они оставляли
  // пустую нижнюю треть, и карточка выглядела недовёрстанной
  let y = SIZE.height - SAFE - (filled.length - 1) * 5;

  for (const [left, right] of CONTACTS) {
    if (!left) continue;

    rows.push(
      text({
        x: SAFE,
        y,
        content: left,
        family: ink.body.family,
        size: 2.6,
        weight: left === CONTACTS[0][0] ? 600 : 400,
        fill: ink.dark,
      })
    );

    if (right) {
      rows.push(
        text({
          x: SIZE.width - SAFE,
          y,
          content: right,
          family: ink.body.family,
          size: 2.6,
          fill: '#6b7280',
          anchor: 'end',
        })
      );
    }

    y += 5;
  }

  return canvasMm(
    SIZE.width,
    SIZE.height,
    '#ffffff',
    [
      place(art, box),
      line({
        x1: SAFE,
        y1: ruleY,
        x2: SAFE + 14,
        y2: ruleY,
        stroke: ink.accent,
        width: 0.6,
      }),
      rows.join(''),
    ].join('')
  );
};

export const businessCard = (ctx: MockupContext): MockupBuild => ({
  id: 'business-card',
  name: 'Визитка',
  description: 'Две стороны: знак на фирменном фоне и контакты',
  usage: 'Отдавайте в типографию файл с вылетами. Контакты в файле — заглушки, замените на свои',
  size: `${TRIM.width} × ${TRIM.height} мм + ${BLEED} мм вылетов`,
  previewWidth: 1200,
  svg: front(ctx),
  back: back(ctx),
  print: true,
});
