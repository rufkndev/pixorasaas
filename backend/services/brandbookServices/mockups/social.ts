import { boxWithin, place } from '../layout/artwork';
import { rect, text, textBlock } from '../layout/svg';
import { fitSize, wrap } from '../layout/textMetrics';
import { MockupBuild, MockupContext, canvas } from './canvas';

// Размеры в пикселях, как их принимают площадки. Файл отдаётся вектором и
// растром: вектор можно править, растр — публиковать.
const POST = { width: 1080, height: 1080 };
const STORY = { width: 1080, height: 1920 };
const COVER = { width: 1920, height: 768 };

// На мобильных ВКонтакте показывает не всю обложку, а центральную часть.
// Логотип и текст должны лежать внутри неё, иначе на телефоне их обрежет.
const COVER_SAFE = { x: 380, width: 1160 };

// Плитка переносится в холст макета вместе со своим <defs>, а не вкладывается
// вложенным <svg>: вложенный масштабировался целиком и обрезался посреди ряда
// колец. patternTransform увеличивает саму плитку, и она честно повторяется.
const patternBand = (
  svg: string | undefined,
  x: number,
  y: number,
  width: number,
  height: number,
  scale: number,
  background: string
): string => {
  const defs = svg?.match(/<defs>[\s\S]*?<\/defs>/i)?.[0];
  const id = defs?.match(/<pattern[^>]*\bid="([^"]+)"/i)?.[1];

  if (!defs || !id) return '';

  const scaled = defs.replace(/<pattern\b/i, `<pattern patternTransform="scale(${scale})"`);

  return (
    scaled +
    `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${background}"/>` +
    `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="url(#${id})"/>`
  );
};

const post = (ctx: MockupContext): string => {
  const { ink } = ctx;
  const art = ctx.darkArt || ctx.primaryArt;

  const headline = ctx.slogan || ctx.name;
  const size = fitSize(headline, { font: ink.heading, size: 96, weight: 700 }, POST.width - 200, 44);
  const lines = wrap(headline, { font: ink.heading, size, weight: 700 }, POST.width - 200);
  const lineHeight = size * 1.15;

  // Заголовок прижат к низу, а не поставлен по центру: иначе между логотипом
  // и текстом зияла пустота, и композиция разваливалась
  const lastBaseline = POST.height - 300;
  const firstBaseline = lastBaseline - (lines.length - 1) * lineHeight;
  const box = boxWithin(art, 0, 0, 260, firstBaseline - size - 60 - 110);

  return canvas(
    POST.width,
    POST.height,
    ink.primary,
    [
      patternBand(ctx.patterns.dots, 0, POST.height - 130, POST.width, 130, 3, ink.primary),
      rect({ x: 0, y: POST.height - 130, width: POST.width, height: 130, fill: ink.primary, opacity: 0.62 }),
      place(art, { ...box, x: 100, y: 110 }),
      textBlock({
        x: 100,
        y: firstBaseline,
        lines,
        family: ink.heading.family,
        size,
        weight: 700,
        fill: ink.onPrimary,
        lineHeight,
      }),
      rect({ x: 100, y: POST.height - 250, width: 120, height: 8, fill: ink.accent }),
      text({
        x: 100,
        y: POST.height - 190,
        content: ctx.industry || ctx.name,
        family: ink.body.family,
        size: 34,
        fill: ink.onPrimary,
        opacity: 0.8,
      }),
    ].join('')
  );
};

const story = (ctx: MockupContext): string => {
  const { ink } = ctx;
  const art = ctx.primaryArt || ctx.wideArt;

  const headline = ctx.slogan || ctx.name;
  const size = fitSize(headline, { font: ink.heading, size: 104, weight: 700 }, STORY.width - 200, 52);
  const lines = wrap(headline, { font: ink.heading, size, weight: 700 }, STORY.width - 200);
  const box = boxWithin(art, 0, 0, 420, 1220 - size - 60 - 760);

  return canvas(
    STORY.width,
    STORY.height,
    ink.light,
    [
      patternBand(ctx.patterns.rings, 0, 0, STORY.width, 620, 3, ink.light),
      place(art, { ...box, x: (STORY.width - box.width) / 2, y: 760 }),
      textBlock({
        x: 100,
        y: 1220,
        lines,
        family: ink.heading.family,
        size,
        weight: 700,
        fill: ink.dark,
        lineHeight: size * 1.15,
      }),
      text({
        x: 100,
        y: 1220 + lines.length * size * 1.15 + 30,
        content: ctx.industry || ctx.name,
        family: ink.body.family,
        size: 40,
        fill: '#6b7280',
      }),
      // Кнопка внизу: у сторис нижняя треть — единственное место, где палец
      // достаёт до экрана
      rect({ x: 100, y: STORY.height - 340, width: STORY.width - 200, height: 130, fill: ink.primary, radius: 65 }),
      text({
        x: STORY.width / 2,
        y: STORY.height - 255,
        content: 'Подробнее',
        family: ink.body.family,
        size: 44,
        weight: 600,
        fill: ink.onPrimary,
        anchor: 'middle',
      }),
    ].join('')
  );
};

const cover = (ctx: MockupContext): string => {
  const { ink } = ctx;
  const art = ctx.darkArt || ctx.wideArt;
  const sloganSize = ctx.slogan ? fitSize(ctx.slogan, { font: ink.body, size: 46 }, COVER_SAFE.width - 40, 26) : 0;
  const sloganBaseline = COVER.height - 150;
  // Ниже логотипа — слоган или, без него, акцентная полоска
  const bottom = ctx.slogan ? sloganBaseline - sloganSize - 40 : COVER.height - 110 - 40;
  const box = boxWithin(art, 0, 0, 460, bottom - 130);
  const patternWidth = 520;

  return canvas(
    COVER.width,
    COVER.height,
    ink.dark,
    [
      patternBand(ctx.patterns.stripes, COVER.width - patternWidth, 0, patternWidth, COVER.height, 4, ink.light),
      place(art, { ...box, x: COVER_SAFE.x, y: 130 }),
      ctx.slogan
        ? text({
            x: COVER_SAFE.x,
            y: sloganBaseline,
            content: ctx.slogan,
            family: ink.body.family,
            size: sloganSize,
            fill: ink.onDark,
            opacity: 0.85,
          })
        : '',
      rect({ x: COVER_SAFE.x, y: COVER.height - 110, width: 100, height: 6, fill: ink.accent }),
    ].join('')
  );
};

export const socialPost = (ctx: MockupContext): MockupBuild => ({
  id: 'social-post',
  name: 'Пост для соцсетей',
  description: 'Квадрат с логотипом, слоганом и фирменным паттерном',
  usage: 'ВКонтакте, Telegram, Instagram — везде, где нужен квадрат',
  size: `${POST.width} × ${POST.height} px`,
  previewWidth: 1080,
  svg: post(ctx),
});

export const socialStory = (ctx: MockupContext): MockupBuild => ({
  id: 'social-story',
  name: 'Сторис',
  description: 'Вертикальный формат с кнопкой в нижней трети',
  usage: 'Истории ВКонтакте и Telegram, вертикальная реклама',
  size: `${STORY.width} × ${STORY.height} px`,
  previewWidth: 720,
  svg: story(ctx),
});

export const vkCover = (ctx: MockupContext): MockupBuild => ({
  id: 'vk-cover',
  name: 'Обложка сообщества',
  description: 'Логотип в безопасной зоне: на телефоне обложка обрезается по краям',
  usage: 'Шапка сообщества ВКонтакте, обложка канала',
  size: `${COVER.width} × ${COVER.height} px`,
  previewWidth: 1440,
  svg: cover(ctx),
});
