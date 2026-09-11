import sharp from 'sharp';

export type LockupLayout = 'markOnly' | 'stacked' | 'horizontal';

// Знак приходит либо растром от картинной модели, либо вектором после оплаты.
// Вектор вкладывается вложенным <svg>, и тогда локап целиком остаётся вектором:
// его можно перекрасить в одну краску и положить в PDF без растеризации.
export type LockupMark =
  | { kind: 'raster'; png: Buffer; side: number }
  | { kind: 'vector'; inner: string; viewBox: string; side: number };

interface LogoFont {
  family: string;
  weight: number;
  // Разрядка в долях кегля: у крупных надписей она собирает слово в блок
  tracking: number;
  uppercase: boolean;
}

// Те же семейства, что рекомендует брендбук (PAIRS в typographyService), —
// иначе документ советовал бы один шрифт, а логотип был бы набран другим.
// Все вендорены в public/fonts и стоят в образе, все покрывают кириллицу.
// Брать весь FONT_INFO из fontService нельзя: там есть Satoshi и Didot,
// которых нет ни в Debian, ни на Google Fonts.
const LOGO_FONTS: Record<string, LogoFont> = {
  modern: { family: 'Inter', weight: 700, tracking: 0.02, uppercase: false },
  professional: { family: 'IBM Plex Sans', weight: 700, tracking: 0.04, uppercase: true },
  classic: { family: 'Playfair Display', weight: 700, tracking: 0.06, uppercase: true },
  playful: { family: 'Comfortaa', weight: 700, tracking: 0.01, uppercase: false },
  creative: { family: 'Unbounded', weight: 700, tracking: 0.03, uppercase: true },
};

// Кегль подписи относительно ширины знака
const TEXT_SHARE = 0.2;
const GAP_SHARE = 0.12;
// Опорный кегль, на котором меряется ширина слова
const REF_SIZE = 200;

const escapeXml = (value: string): string =>
  value.replace(/[<>&'"]/g, (ch) =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[ch] as string)
  );

export class LockupService {
  getFont(style: string): LogoFont {
    return LOGO_FONTS[style] || LOGO_FONTS.modern;
  }

  // Знак приходит растром: dalle-3 отдаёт картинку, а не вектор.
  // В SVG он вкладывается как <image> с data-URI — librsvg такое рисует,
  // и векторизация при оплате обводит уже собранный логотип целиком
  async build(
    mark: LockupMark | null,
    name: string,
    style: string,
    color: string,
    layout: LockupLayout
  ): Promise<string> {
    const font = this.getFont(style);
    const text = font.uppercase ? name.toUpperCase() : name;

    const metrics = await this.measure(text, font);

    if (!mark) {
      return this.typeOnly(text, font, color, metrics);
    }

    if (layout === 'markOnly') {
      return this.wrap(mark.side, mark.side, this.embedMark(mark, 0, 0, mark.side));
    }

    return layout === 'horizontal'
      ? this.horizontal(mark, text, font, color, metrics)
      : this.stacked(mark, text, font, color, metrics);
  }

  // Растр знака приходит квадратным: rasterService сводит его на квадратный холст
  async rasterMark(png: Buffer): Promise<LockupMark> {
    const side = Math.max((await sharp(png).metadata()).width || 1024, 1);
    return { kind: 'raster', png, side };
  }

  // Корень вектора после svgService.normalize предсказуем, поэтому viewBox
  // и содержимое достаём регулярками — XML-разборщика в проекте нет
  vectorMark(svg: string, side = 1000): LockupMark | null {
    const open = svg.match(/<svg\b[^>]*>/i);
    const viewBox = open?.[0].match(/viewBox="([^"]+)"/i)?.[1];

    if (!open || !viewBox) return null;

    const inner = svg
      .replace(/^[\s\S]*?<svg\b[^>]*>/i, '')
      .replace(/<\/svg>\s*$/i, '')
      .trim();

    return inner ? { kind: 'vector', inner, viewBox, side } : null;
  }

  private embedMark(mark: LockupMark, x: number, y: number, size: number): string {
    const box =
      `x="${x.toFixed(2)}" y="${y.toFixed(2)}" ` +
      `width="${size.toFixed(2)}" height="${size.toFixed(2)}" ` +
      `preserveAspectRatio="xMidYMid meet"`;

    if (mark.kind === 'vector') {
      return `<svg ${box} viewBox="${mark.viewBox}">${mark.inner}</svg>`;
    }

    return `<image ${box} href="data:image/png;base64,${mark.png.toString('base64')}"/>`;
  }

  // Ширину слова у librsvg не спросить, поэтому меряем рендером: рисуем
  // на опорном кегле и берём габариты непрозрачных пикселей
  private async measure(text: string, font: LogoFont) {
    const width = Math.max(2000, text.length * REF_SIZE);
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${REF_SIZE * 2}">` +
      `<text x="20" y="${REF_SIZE * 1.3}" ${this.fontAttrs(font, REF_SIZE)} fill="#000000">` +
      `${escapeXml(text)}</text></svg>`;

    try {
      const { data, info } = await sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

      let minX = info.width;
      let maxX = -1;
      let minY = info.height;
      let maxY = -1;

      for (let y = 0; y < info.height; y++) {
        for (let x = 0; x < info.width; x++) {
          if (data[(y * info.width + x) * info.channels + 3] > 8) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }

      if (maxX < 0) throw new Error('надпись не отрисовалась');

      return {
        // Отношения к кеглю, а не пиксели: дальше кегль будет другим
        widthRatio: (maxX - minX + 1) / REF_SIZE,
        heightRatio: (maxY - minY + 1) / REF_SIZE,
        baselineRatio: (REF_SIZE * 1.3 - minY) / REF_SIZE,
      };
    } catch (error: any) {
      // Шрифта нет в системе — вёрстка поедет, но логотип отдать всё равно нужно
      console.error('Не удалось измерить надпись:', error.message);
      return { widthRatio: text.length * 0.6, heightRatio: 0.72, baselineRatio: 0.72 };
    }
  }

  private fontAttrs(font: LogoFont, size: number): string {
    return (
      `font-family="${font.family}" font-size="${size}" font-weight="${font.weight}" ` +
      `letter-spacing="${(size * font.tracking).toFixed(2)}"`
    );
  }

  private wrap(width: number, height: number, body: string): string {
    return (
      `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" ` +
      `viewBox="0 0 ${width.toFixed(2)} ${height.toFixed(2)}" ` +
      `width="${Math.round(width)}" height="${Math.round(height)}">${body}</svg>`
    );
  }

  // text-anchor="middle" центрирует по ширине с учётом хвостового
  // letter-spacing после последней буквы, а мерили мы чернила — без него
  // надпись уезжает влево и срезается о край холста
  private centeredText(cx: number, baseline: number, text: string, font: LogoFont, size: number, color: string): string {
    const shift = (size * font.tracking) / 2;
    return (
      `<text x="${(cx + shift).toFixed(2)}" y="${baseline.toFixed(2)}" text-anchor="middle" ` +
      `${this.fontAttrs(font, size)} fill="${color}">${escapeXml(text)}</text>`
    );
  }

  private stacked(mark: LockupMark, text: string, font: LogoFont, color: string, m: any): string {
    const side = 1000;
    const fontSize = side * TEXT_SHARE;
    const gap = side * GAP_SHARE;
    const textWidth = m.widthRatio * fontSize;
    const textHeight = m.heightRatio * fontSize;

    // Поле по краям обязательно: без него надпись упиралась в границу
    // и срезалась вместе со сглаживанием
    const pad = fontSize * 0.25;
    const width = Math.max(side, textWidth) + pad * 2;
    const height = side + gap + textHeight + pad;
    const baseline = side + gap + m.baselineRatio * fontSize;

    return this.wrap(
      width,
      height,
      this.embedMark(mark, (width - side) / 2, 0, side) +
        this.centeredText(width / 2, baseline, text, font, fontSize, color)
    );
  }

  private horizontal(mark: LockupMark, text: string, font: LogoFont, color: string, m: any): string {
    const side = 1000;
    const fontSize = side * 0.26;
    const gap = side * 0.14;
    const pad = fontSize * 0.25;
    const textWidth = m.widthRatio * fontSize;

    const width = side + gap + textWidth + pad;
    const height = side;
    const baseline = height / 2 + (m.heightRatio * fontSize) / 2;

    return this.wrap(
      width,
      height,
      this.embedMark(mark, 0, 0, side) +
        `<text x="${(side + gap).toFixed(2)}" y="${baseline.toFixed(2)}" ` +
        `${this.fontAttrs(font, fontSize)} fill="${color}">${escapeXml(text)}</text>`
    );
  }

  // Логотип-слово: знака нет вовсе, картинную модель не зовём —
  // кириллицу она всё равно рисует с ошибками
  private typeOnly(text: string, font: LogoFont, color: string, m: any): string {
    const fontSize = 400;
    const pad = fontSize * 0.3;
    const width = m.widthRatio * fontSize + pad * 2;
    const height = m.heightRatio * fontSize + pad * 2;

    return this.wrap(
      width,
      height,
      this.centeredText(width / 2, pad + m.baselineRatio * fontSize, text, font, fontSize, color)
    );
  }
}

export const lockupService = new LockupService();
