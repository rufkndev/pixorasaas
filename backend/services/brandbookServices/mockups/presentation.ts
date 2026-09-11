import { boxOfWidth, place } from '../layout/artwork';
import { line, rect, text, textBlock } from '../layout/svg';
import { fitSize, wrap } from '../layout/textMetrics';
import { parseSvg } from '../layout/svgSource';
import { MockupBuild, MockupContext, canvas } from './canvas';

// 16:9 в пикселях: столько же берут и PowerPoint, и Google Slides
const SLIDE = { width: 1920, height: 1080 };

const icon = (svg: string | undefined, x: number, y: number, size: number, color: string): string => {
  const parsed = svg ? parseSvg(svg) : null;

  if (!parsed) return '';

  const paint = (value: string) => value.replace(/currentColor/g, color);

  return (
    `<svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="${parsed.viewBox}" ` +
    `preserveAspectRatio="xMidYMid meet" ${paint(parsed.attrs)}>${paint(parsed.inner)}</svg>`
  );
};

const coverSlide = (ctx: MockupContext): string => {
  const { ink } = ctx;
  const art = ctx.darkArt || ctx.primaryArt;
  const box = boxOfWidth(art, 0, 0, 380);

  const size = fitSize(ctx.name, { font: ink.heading, size: 120, weight: 700 }, 1200, 56);
  const lines = wrap(ctx.name, { font: ink.heading, size, weight: 700 }, 1200);

  return canvas(
    SLIDE.width,
    SLIDE.height,
    ink.dark,
    [
      rect({ x: 0, y: 0, width: SLIDE.width, height: 12, fill: ink.accent }),
      place(art, { ...box, x: SLIDE.width - box.width - 160, y: (SLIDE.height - box.height) / 2 }),
      textBlock({
        x: 160,
        y: SLIDE.height / 2 - 20,
        lines,
        family: ink.heading.family,
        size,
        weight: 700,
        fill: ink.onDark,
        lineHeight: size * 1.15,
      }),
      ctx.slogan
        ? text({
            x: 160,
            y: SLIDE.height / 2 + size * 0.9 + 40,
            content: ctx.slogan,
            family: ink.body.family,
            size: 46,
            fill: ink.onDark,
            opacity: 0.75,
          })
        : '',
    ].join('')
  );
};

// Второй слайд показывает, как устроен контент: заголовок, три пункта с
// иконками, колонтитул с логотипом
const contentSlide = (ctx: MockupContext): string => {
  const { ink } = ctx;
  const art = ctx.wideArt || ctx.primaryArt;
  const box = boxOfWidth(art, 0, 0, 220);

  const columns = [0, 1, 2].map((index) => {
    const x = 160 + index * 540;
    const point = ctx.points[index];
    const title = point?.title || 'Пункт';
    // Одно длинное слово перенос не разобьёт, и колонка налезала на соседнюю
    const titleSize = fitSize(title, { font: ink.heading, size: 48, weight: 700 }, 460, 26);

    return [
      icon(point?.svg, x, 400, 96, ink.primary),
      textBlock({
        x,
        y: 570,
        lines: wrap(title, { font: ink.heading, size: titleSize, weight: 700 }, 460).slice(0, 2),
        family: ink.heading.family,
        size: titleSize,
        weight: 700,
        fill: ink.dark,
        lineHeight: titleSize * 1.2,
      }),
      textBlock({
        x,
        y: 660,
        lines: wrap(point?.text || '', { font: ink.body, size: 32 }, 460).slice(0, 4),
        family: ink.body.family,
        size: 32,
        fill: '#4b5563',
        lineHeight: 46,
      }),
    ].join('');
  });

  return canvas(
    SLIDE.width,
    SLIDE.height,
    '#ffffff',
    [
      text({
        x: 160,
        y: 230,
        content: ctx.industry || ctx.name,
        family: ink.heading.family,
        size: fitSize(ctx.industry || ctx.name, { font: ink.heading, size: 82, weight: 700 }, 1500, 44),
        weight: 700,
        fill: ink.dark,
      }),
      rect({ x: 160, y: 280, width: 120, height: 8, fill: ink.accent }),
      columns.join(''),
      line({ x1: 160, y1: 940, x2: SLIDE.width - 160, y2: 940, stroke: '#e5e7eb', width: 2 }),
      place(art, { ...box, x: 160, y: 970 }),
      text({
        x: SLIDE.width - 160,
        y: 1010,
        content: ctx.slogan || '',
        family: ink.body.family,
        size: 28,
        fill: '#9ca3af',
        anchor: 'end',
      }),
    ].join('')
  );
};

export const presentation = (ctx: MockupContext): MockupBuild => ({
  id: 'presentation',
  name: 'Презентация',
  description: 'Обложка и контентный слайд: заголовок, три пункта, колонтитул',
  usage: 'Коммерческие предложения, выступления. Формат 16:9',
  size: `${SLIDE.width} × ${SLIDE.height} px`,
  previewWidth: 1440,
  svg: coverSlide(ctx),
  back: contentSlide(ctx),
});
