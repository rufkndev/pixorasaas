import { quoted } from '../../../../utils/slug';
import { bullets, chips, hairlinePlate, label, paragraph, title } from '../blocks';
import { chrome } from '../chrome';
import { BrandbookDoc, PageContext, PageModule } from '../document';
import { page, text } from '../svg';
import { SIZE } from '../theme';
import { BODY_TOP, colWidth, colX } from '../units';

const LEFT = { x: colX(0), width: colWidth(6) };
const RIGHT = { x: colX(7), width: colWidth(5) };

const render = async (doc: BrandbookDoc, ctx: PageContext): Promise<string> => {
  const { theme, guidelines } = doc;
  const parts: string[] = [chrome(doc, ctx, 'О бренде')];

  let y = BODY_TOP + 4;

  if (doc.slogan) {
    parts.push(
      text({
        x: LEFT.x,
        y,
        content: `«${doc.slogan}»`,
        family: theme.heading.family,
        size: SIZE.h3,
        weight: 700,
        fill: theme.color.primary,
      })
    );
    y += 12;
  }

  const essence = paragraph(theme, {
    x: LEFT.x,
    y,
    width: LEFT.width,
    content:
      guidelines?.essence || `${quoted(doc.name)} — ${doc.industry || doc.keywords}.`,
    size: SIZE.lead,
    maxLines: 6,
  });

  parts.push(essence.svg);
  y += essence.height + 12;

  if (guidelines?.audience) {
    parts.push(label(theme, LEFT.x, y, 'Кому это нужно'));
    y += 6;

    const audience = paragraph(theme, {
      x: LEFT.x,
      y,
      width: LEFT.width,
      content: guidelines.audience,
      maxLines: 5,
    });

    parts.push(audience.svg);
    y += audience.height + 12;
  }

  if (guidelines?.personality?.length) {
    parts.push(label(theme, LEFT.x, y, 'Характер'));
    y += 6;

    const words = chips(theme, LEFT.x, y - 5, guidelines.personality, LEFT.width);
    parts.push(words.svg);
  }

  // Голос бренда — это то, чем брендбук отличается от папки с картинками:
  // правила, как бренд разговаривает
  const voice = guidelines?.toneOfVoice;

  if (voice) {
    let right = BODY_TOP + 4;

    parts.push(title(theme, RIGHT.x, right, 'Голос бренда'));
    right += 8;

    const summary = paragraph(theme, {
      x: RIGHT.x,
      y: right,
      width: RIGHT.width,
      content: voice.summary,
      size: SIZE.small,
      maxLines: 4,
    });

    parts.push(summary.svg);
    right += summary.height + 8;

    const speak = bullets(theme, {
      x: RIGHT.x,
      y: right,
      width: RIGHT.width,
      items: voice.doList.slice(0, 3),
      marker: '+',
    });

    parts.push(label(theme, RIGHT.x, right - 5, 'Говорим'), speak.svg);
    right += speak.height + 9;

    const avoid = bullets(theme, {
      x: RIGHT.x,
      y: right,
      width: RIGHT.width,
      items: voice.dontList.slice(0, 3),
      marker: '×',
      markerFill: theme.muted,
    });

    parts.push(label(theme, RIGHT.x, right - 5, 'Не говорим'), avoid.svg);
    right += avoid.height + 10;

    // Две фразы рядом объясняют тон точнее, чем список правил
    const box = { x: RIGHT.x, y: right, width: RIGHT.width, height: 34 };
    const correct = paragraph(theme, {
      x: RIGHT.x + 4,
      y: right + 11,
      width: RIGHT.width - 8,
      content: voice.examples.correct,
      size: SIZE.small,
      maxLines: 2,
    });

    const incorrect = paragraph(theme, {
      x: RIGHT.x + 4,
      y: right + 27,
      width: RIGHT.width - 8,
      content: voice.examples.incorrect,
      size: SIZE.small,
      fill: theme.muted,
      maxLines: 2,
    });

    parts.push(
      hairlinePlate(theme, box),
      text({
        x: RIGHT.x + 4,
        y: right + 6,
        content: 'Так — да',
        family: theme.body.family,
        size: SIZE.caption,
        weight: 600,
        fill: theme.color.accent,
      }),
      correct.svg,
      text({
        x: RIGHT.x + 4,
        y: right + 22,
        content: 'Так — нет',
        family: theme.body.family,
        size: SIZE.caption,
        weight: 600,
        fill: theme.muted,
      }),
      incorrect.svg
    );
  }

  return page(theme.paper, parts.join(''));
};

export const brandPage: PageModule = {
  key: 'brand',
  section: 'Бренд',
  title: 'О бренде',
  enabled: (doc) => !!doc.guidelines,
  render,
};
