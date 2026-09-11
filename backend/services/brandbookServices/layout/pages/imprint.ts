import { OPERATOR } from '../../../../legal';
import { iconSetService } from '../../brand/iconSetService';
import { quoted } from '../../../../utils/slug';
import { label, paragraph, title } from '../blocks';
import { chrome } from '../chrome';
import { BrandbookDoc, PageContext, PageModule } from '../document';
import { line, page, text } from '../svg';
import { SIZE } from '../theme';
import { BODY_TOP, CONTENT, colWidth, colX } from '../units';

const STYLE_NAMES: Record<string, string> = {
  modern: 'Современный',
  classic: 'Классический',
  creative: 'Креативный',
  professional: 'Деловой',
  playful: 'Дружелюбный',
};

const field = (doc: BrandbookDoc, x: number, y: number, name: string, value: string): string =>
  [
    label(doc.theme, x, y, name),
    text({
      x,
      y: y + 6,
      content: value,
      family: doc.theme.body.family,
      size: SIZE.body,
      fill: doc.theme.ink,
    }),
  ].join('');

const render = async (doc: BrandbookDoc, ctx: PageContext): Promise<string> => {
  const { theme } = doc;
  const parts: string[] = [chrome(doc, ctx, 'Выходные данные')];

  let y = BODY_TOP + 4;

  parts.push(
    field(doc, colX(0), y, 'Бренд', doc.name),
    field(doc, colX(4), y, 'Номер заказа', doc.orderId),
    field(doc, colX(8), y, 'Дата выпуска', doc.date)
  );
  y += 20;

  parts.push(
    field(doc, colX(0), y, 'Стиль', STYLE_NAMES[doc.style] || doc.style || '—'),
    field(doc, colX(4), y, 'Ниша', doc.industry || doc.keywords || '—'),
    field(doc, colX(8), y, 'Версий логотипа', String(doc.logoAssets.length))
  );
  y += 26;

  parts.push(line({ x1: CONTENT.x, y1: y, x2: CONTENT.right, y2: y, stroke: theme.hair, width: 0.25 }));
  y += 10;

  // Лицензии — не украшение полосы, а требование OFL: шрифты отдаются
  // покупателю вместе с текстом лицензии, и об этом надо сказать прямо
  parts.push(title(theme, colX(0), y, 'Шрифты'));

  const fonts = doc.fonts.map((font) => `${font.family} — ${font.licence}`).join(', ');

  parts.push(
    paragraph(theme, {
      x: colX(0),
      y: y + 8,
      width: colWidth(3),
      content:
        `${fonts}. Шрифты распространяются по открытой лицензии SIL Open Font License 1.1: ` +
        'их можно ставить на компьютеры сотрудников, использовать в макетах и на сайте, включая коммерческие проекты. ' +
        'Файлы и текст лицензии лежат в архиве в папке fonts.',
      size: SIZE.small,
      maxLines: 8,
    }).svg
  );

  // Лицензии наборов иконок обязательны так же, как шрифтовые: Apache-2.0
  // прямо требует прикладывать текст лицензии к распространяемым файлам
  const sets = iconSetService.licences(doc.icons || []);

  if (sets.length) {
    parts.push(title(theme, colX(4), y, 'Иконки'));

    parts.push(
      paragraph(theme, {
        x: colX(4),
        y: y + 8,
        width: colWidth(3),
        content:
          `${sets.map((set) => `${set.title} — ${set.licence}`).join(', ')}. ` +
          'Паттерны, разделители и подложки нарисованы для этого бренда и принадлежат покупателю. ' +
          'Файлы и лицензии наборов лежат в архиве в папке icons.',
        size: SIZE.small,
        maxLines: 8,
      }).svg
    );
  }

  parts.push(title(theme, colX(8), y, 'Права на логотип'));

  parts.push(
    paragraph(theme, {
      x: colX(8),
      y: y + 8,
      width: colWidth(4),
      content:
        `Исключительное право на логотип и фирменный стиль ${quoted(doc.name)} переходит покупателю в полном объёме ` +
        'после оплаты заказа. Использование не ограничено ни сроком, ни территорией, ни способом.',
      size: SIZE.small,
      maxLines: 8,
    }).svg
  );

  parts.push(
    line({ x1: CONTENT.x, y1: 168, x2: CONTENT.right, y2: 168, stroke: theme.hair, width: 0.25 }),
    label(theme, CONTENT.x, 176, 'Документ подготовлен'),
    text({
      x: CONTENT.x,
      y: 182,
      content: `${OPERATOR.name} · ИНН ${OPERATOR.inn} · ОГРНИП ${OPERATOR.ogrnip}`,
      family: theme.body.family,
      size: SIZE.small,
      fill: theme.ink,
    }),
    text({
      x: CONTENT.right,
      y: 182,
      content: 'pixora-ai.ru',
      family: theme.heading.family,
      size: SIZE.small,
      weight: 700,
      fill: theme.color.primary,
      anchor: 'end',
    })
  );

  return page(theme.paper, parts.join(''));
};

export const imprintPage: PageModule = {
  key: 'imprint',
  section: 'Документ',
  title: 'Выходные данные',
  render,
};
