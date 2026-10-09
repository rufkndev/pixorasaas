import axios from 'axios';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

import {
  GENERATED_LOGOS_DIR,
  GENERATED_LOGOS_URL_PREFIX,
  SOURCE_LOGO_SUFFIX,
  resolveGeneratedLogoPath,
} from '../paths';
import { apiUtils } from '../utils/apiUtils';
import { conceptService, LogoConcept } from './logoServices/conceptService';
import { lockupService } from './logoServices/lockupService';
import { rasterService } from './logoServices/rasterService';
import { svgService } from './logoServices/svgService';
import { log } from '../logger';

export interface StoredLogo {
  // С водяным знаком — единственное, что видит неоплативший пользователь
  previewUrl: string;
  // Чистый файл, отдаётся только после проверки оплаты
  sourceUrl: string;
  pattern: string;
  subject: string;
  concept: string;
  palette: string[];
  // Семейство, которым набрана надпись. Брендбук рекомендует именно его,
  // поэтому выводить его заново из style нельзя: таблица может смениться
  lockupFont: string;
}

// dalle-3 даёт самый внятный знак среди проверенных: замеры показали, что
// recraft при цене 15 ₽ рисует детализированный лайн-арт, а не логотип
const MODEL = 'dalle-3';
// Вектор стоит 1 ₽ и нужен только тому, кто заплатил
const VECTOR_MODEL = 'image-2-svg';
// quality: hd стоит 14 ₽ вместо 7 и добавляет детализацию, которая логотипу
// только мешает. style: natural держит форму плоской
const QUALITY = 'standard';
const STYLE = 'natural';
const SIZE = '1024x1024';

const PREVIEW_SIZE = 1024;
const SOURCE_SIZE = 3072;
// Больше векторизатор не принимает — см. комментарий в vectorize()
const VECTOR_INPUT_SIZE = 1024;
// Столько цветов остаётся во входной картинке перед обводкой
const VECTOR_COLORS = 8;

// Настройки VTracer под плоский знак, а не под фотографию
const VECTOR_OPTIONS = {
  mode: 'spline',
  colormode: 'color',
  hierarchical: 'stacked',
  // Меньше бит на канал — меньше слоёв почти одинакового цвета
  color_precision: 4,
  // Соседние слои сливаются агрессивнее, чем при умолчании 16
  layer_difference: 32,
  // Крапины мельче этого выбрасываются: при умолчании 4 они лезли в контур
  filter_speckle: 10,
  path_precision: 4,
  corner_threshold: 60,
  length_threshold: 4,
  splice_threshold: 45,
  max_iterations: 10,
} as const;
// Ниже этого знак считается пустым кадром
const MIN_INK_SHARE = 0.02;

// dalle-3 по умолчанию переписывает промпт и добавляет отсебятину:
// сцену, фон, детали. С этой приставкой он берёт текст как есть,
// и знак выходит заметно чище — проверено сравнением
const KEEP_PROMPT =
  'I NEED to test how the tool works with extremely simple prompts. ' +
  'DO NOT add any detail, just use it AS-IS: ';

// Сырой кадр модели лежит рядом с обработанным под тем же uuid
export const rawNameFor = (sourceFile: string): string =>
  path.basename(sourceFile).replace(/\.png$/i, '-original.png');

export class LogoService {
  async generateLogo(
    businessName: string,
    keywords: string,
    industry: string,
    style?: string,
    usedPatterns: string[] = [],
    usedSubjects: string[] = []
  ): Promise<StoredLogo> {
    const resolvedStyle = style || 'modern';
    const concept = await conceptService.createConcept(
      businessName,
      keywords,
      industry,
      resolvedStyle,
      usedPatterns,
      usedSubjects
    );

    const drawn = concept.pattern.kind === 'type' ? null : await this.drawMark(concept);
    const layout = drawn ? (concept.pattern.kind === 'mark' ? 'markOnly' : 'stacked') : 'stacked';

    // До оплаты знак есть только растром: вектор стоит денег и строится позже
    const mark = drawn ? await lockupService.rasterMark(drawn.mark) : null;

    const svg = await lockupService.build(
      mark,
      businessName,
      resolvedStyle,
      this.textColor(concept.palette),
      layout
    );

    return this.storeLogo(svg, concept, drawn?.raw ?? null, resolvedStyle);
  }

  // Пустой кадр — брак модели, одна повторная попытка.
  // Сырой кадр возвращаем вместе с обработанным: покупатель получает и его
  private async drawMark(concept: LogoConcept): Promise<{ mark: Buffer; raw: Buffer } | null> {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const raw = await this.requestImage(concept, attempt > 0);
        const mark = await rasterService.toTransparentMark(raw);

        if (await rasterService.inkShare(mark.png) >= MIN_INK_SHARE) {
          return { mark: mark.png, raw };
        }

        log.error('Знак пришёл пустым, повторяем');
      } catch (error: any) {
        log.error(`Не удалось получить знак (попытка ${attempt + 1}):`, error.message);
        if (attempt === 1) throw error;
      }
    }

    return null;
  }

  private async requestImage(concept: LogoConcept, retry: boolean): Promise<Buffer> {
    const result = await apiUtils.run(MODEL, 'знак логотипа', {
      prompt: KEEP_PROMPT + this.buildPrompt(concept, retry),
      size: SIZE,
      quality: QUALITY,
      style: STYLE,
      n: 1,
    });
    const url = this.extractUrl(result);

    if (!url) {
      throw new Error(`Ссылка на логотип не найдена: ${JSON.stringify(result).slice(0, 300)}`);
    }

    const file = await axios.get(url, { responseType: 'arraybuffer' });
    return Buffer.from(file.data);
  }

  private buildPrompt(concept: LogoConcept, retry: boolean): string {
    const parts = [
      `Minimal flat vector logo icon of a ${concept.subject}.`,
      concept.pattern.promptShape ? `${concept.pattern.promptShape}.` : '',
      concept.concept.endsWith('.') ? concept.concept : `${concept.concept}.`,
      `Exactly two solid colors: ${this.colorWords(concept.palette)}.`,
      'Bold silhouette, geometric simplification, app icon simplicity.',
      'Flat front view, no perspective, no 3d, no depth, no shadow, no highlight,',
      'no gradient, no texture, no outline stroke around shapes.',
      'One single centered symbol filling the frame, plain pure white background.',
    ];

    // Замкнутый контур — смысл этих приёмов, для остальных он и есть та самая
    // «рамка», на которую жаловались
    if (concept.pattern.id === 'emblem' || concept.pattern.id === 'badge') {
      parts.push('The enclosing outline is part of the mark itself.');
    } else {
      parts.push('No background panel, no card, no frame, no border, no circle enclosing the symbol.');
    }

    if (concept.pattern.id === 'lettermark' && concept.monogram) {
      parts.push(`The mark is the capital latin letter ${concept.monogram}.`);
    } else if (concept.pattern.kind === 'mark') {
      parts.push('No text, no letters, no words.');
    }

    if (retry) {
      parts.push('Very simple, very bold, large in frame.');
    }

    return parts.filter(Boolean).join(' ');
  }

  // Модель слушается названий цветов надёжнее, чем hex-кодов
  private colorWords(palette: string[]): string {
    const words = palette.slice(0, 2).map((hex) => this.describeColor(hex)).filter(Boolean);
    return words.length > 0 ? words.join(' and ') : 'deep navy and warm gold';
  }

  private describeColor(hex: string): string {
    const rgb = this.toRgb(hex);
    if (!rgb) return '';

    const { r, g, b } = rgb;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;

    if (max - min < 24) {
      if (luma < 60) return 'near black';
      if (luma < 140) return 'graphite grey';
      return 'light grey';
    }

    let hue = 0;
    if (max === r) hue = ((g - b) / (max - min) + 6) % 6;
    else if (max === g) hue = (b - r) / (max - min) + 2;
    else hue = (r - g) / (max - min) + 4;
    hue *= 60;

    const tone = luma < 90 ? 'deep ' : luma > 190 ? 'light ' : '';
    const names: [number, string][] = [
      [15, 'red'], [45, 'orange'], [70, 'gold'], [160, 'green'],
      [200, 'teal'], [250, 'blue'], [290, 'violet'], [335, 'magenta'], [360, 'red'],
    ];

    return tone + (names.find(([limit]) => hue <= limit)?.[1] || 'blue');
  }

  private toRgb(hex: string): { r: number; g: number; b: number } | null {
    const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
    if (!match) return null;

    const value = parseInt(match[1], 16);
    return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
  }

  // Подпись набирается самым тёмным цветом палитры: светлый на белом не читается
  private textColor(palette: string[]): string {
    let best = '#111827';
    let darkest = Infinity;

    for (const hex of palette) {
      const rgb = this.toRgb(hex);
      if (!rgb) continue;

      const luma = 0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b;
      if (luma < darkest) {
        darkest = luma;
        best = hex;
      }
    }

    return darkest > 200 ? '#111827' : best;
  }

  private async storeLogo(
    svg: string,
    concept: LogoConcept,
    raw: Buffer | null,
    style: string
  ): Promise<StoredLogo> {
    if (!fs.existsSync(GENERATED_LOGOS_DIR)) {
      fs.mkdirSync(GENERATED_LOGOS_DIR, { recursive: true });
    }

    const id = crypto.randomUUID();
    const sourceName = `${id}${SOURCE_LOGO_SUFFIX}.png`;
    const previewName = `${id}-preview.png`;

    const sourceBuffer = await svgService.toPng(svg, SOURCE_SIZE);
    fs.writeFileSync(path.join(GENERATED_LOGOS_DIR, sourceName), sourceBuffer);

    // Кадр ровно в том виде, в каком его отдала модель: покупатель получает
    // и его тоже. Суффикс -source в имени закрывает файл от статики.
    // Отдельной колонки в базе нет — файл лежит рядом с основным и находится
    // по имени, потому что создаётся всегда вместе с ним
    if (raw) {
      fs.writeFileSync(path.join(GENERATED_LOGOS_DIR, rawNameFor(sourceName)), raw);
    }

    // Превью — на белом: плитка водяного знака на прозрачном фоне не читается,
    // а превью существует только для показа
    const preview = await svgService.toPng(svg, PREVIEW_SIZE);
    const previewBuffer = await sharp(preview)
      .flatten({ background: '#ffffff' })
      .composite([{ input: this.buildWatermark(PREVIEW_SIZE, PREVIEW_SIZE), top: 0, left: 0 }])
      .png()
      .toBuffer();
    fs.writeFileSync(path.join(GENERATED_LOGOS_DIR, previewName), previewBuffer);

    return {
      previewUrl: `${GENERATED_LOGOS_URL_PREFIX}${previewName}`,
      sourceUrl: `${GENERATED_LOGOS_URL_PREFIX}${sourceName}`,
      pattern: concept.pattern.id,
      subject: concept.subject,
      concept: concept.concept,
      palette: concept.palette,
      lockupFont: lockupService.getFont(style).family,
    };
  }

  // Вектор строится только после оплаты: 1 ₽ за обводку не должен тратиться
  // на бесплатные превью, которые пользователь пролистывает
  async vectorize(sourceUrl: string): Promise<string | null> {
    const sourcePath = resolveGeneratedLogoPath(sourceUrl);

    if (!sourcePath || !fs.existsSync(sourcePath)) return null;

    const svgPath = sourcePath.replace(/\.png$/i, '.svg');
    if (fs.existsSync(svgPath)) {
      return `${GENERATED_LOGOS_URL_PREFIX}${path.basename(svgPath)}`;
    }

    // Векторизатор отбивает кадры крупнее 1024 сообщением «Изображение не прошло
    // модерацию контента» — на деле это ограничение по размеру, а не по содержимому:
    // 3072 и 2048 отказ, 1024 проходит. Для обводки плоского знака этого хватает,
    // на выходе всё равно вектор. Фон белый: фоновый path снимет санитайзер.
    //
    // Квантование без дизеринга обязательно: обводчик разбирает сглаженные края
    // на десятки почти одинаковых слоёв — из двухцветного логотипа получалось
    // 66 цветов. Плоские заливки он обводит одним контуром
    const flat = await sharp(fs.readFileSync(sourcePath))
      .resize(VECTOR_INPUT_SIZE, VECTOR_INPUT_SIZE, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      })
      .flatten({ background: '#ffffff' })
      .png({ palette: true, colours: VECTOR_COLORS, dither: 0 })
      .toBuffer();

    // Файл уходит загрузкой, а не ссылкой: чистый логотип статикой не раздаётся,
    // и в деве наш адрес для GenAPI всё равно недостижим
    const form = new FormData();
    form.append('image_url', new Blob([new Uint8Array(flat)], { type: 'image/png' }), path.basename(sourcePath));

    // Под капотом VTracer, и GenAPI отдаёт весь его набор настроек.
    // Умолчания рассчитаны на фотографии: мало цветов на слой и мелкие
    // крапины давали рваный контур на плоском знаке
    for (const [key, value] of Object.entries(VECTOR_OPTIONS)) {
      form.append(key, String(value));
    }

    const result = await apiUtils.run(VECTOR_MODEL, 'векторизация', form);
    const url = this.extractUrl(result);

    if (!url) {
      throw new Error(`Векторизация не вернула файл: ${JSON.stringify(result).slice(0, 300)}`);
    }

    const file = await axios.get(url, { responseType: 'text' });
    const { svg } = await svgService.normalize(file.data as string);

    fs.writeFileSync(svgPath, svg);
    return `${GENERATED_LOGOS_URL_PREFIX}${path.basename(svgPath)}`;
  }

  // Брендбук существует только после оплаты, и его страница показывает логотип
  // в браузере. Исходник статикой закрыт, поэтому кладём рядом открытую копию
  releaseSource(sourceUrl: string): string {
    if (!sourceUrl.includes(SOURCE_LOGO_SUFFIX)) {
      return sourceUrl;
    }

    const sourcePath = resolveGeneratedLogoPath(sourceUrl);
    if (!sourcePath || !fs.existsSync(sourcePath)) {
      return sourceUrl;
    }

    const releasedName = path.basename(sourcePath).replace(SOURCE_LOGO_SUFFIX, '-full');
    const releasedPath = path.join(GENERATED_LOGOS_DIR, releasedName);

    if (!fs.existsSync(releasedPath)) {
      fs.copyFileSync(sourcePath, releasedPath);
    }

    // Рядом с растром открываем и вектор, если он уже построен
    const svgSource = sourcePath.replace(/\.png$/i, '.svg');
    if (fs.existsSync(svgSource)) {
      const svgReleased = path.join(
        GENERATED_LOGOS_DIR,
        path.basename(svgSource).replace(SOURCE_LOGO_SUFFIX, '-full')
      );
      if (!fs.existsSync(svgReleased)) {
        fs.copyFileSync(svgSource, svgReleased);
      }
    }

    return `${GENERATED_LOGOS_URL_PREFIX}${releasedName}`;
  }

  // Плитка из повёрнутых надписей: одну метку по центру легко закрасить,
  // сетку по всей площади — уже нет
  private buildWatermark(width: number, height: number): Buffer {
    const fontSize = Math.round(width / 14);
    const stepX = Math.round(width / 2);
    const stepY = Math.round(height / 5);
    const marks: string[] = [];

    for (let y = -stepY; y < height + stepY * 2; y += stepY) {
      for (let x = -stepX; x < width + stepX * 2; x += stepX) {
        marks.push(
          // DejaVu Sans ставится в образ явно: на голом slim шрифтов нет вовсе
          `<text x="${x}" y="${y}" font-family="DejaVu Sans, Helvetica, Arial, sans-serif" ` +
            `font-size="${fontSize}" font-weight="700" fill="#0f172a" fill-opacity="0.25">PIXORA</text>`
        );
      }
    }

    return Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">` +
        `<g transform="rotate(-30 ${width / 2} ${height / 2})">${marks.join('')}</g>` +
        `</svg>`
    );
  }

  private extractUrl(response: any): string | null {
    const candidates = [
      Array.isArray(response?.result) ? response.result[0] : null,
      response?.full_response?.[0]?.url,
      response?.result?.[0]?.url,
      response?.output,
      response?.url,
    ];

    for (const value of candidates) {
      if (typeof value === 'string' && value.startsWith('http')) {
        return value;
      }
    }

    return null;
  }
}

// Создаём экземпляр при первом обращении, чтобы импорт не требовал ключа
let logoServiceInstance: LogoService | null = null;

export const getLogoService = (): LogoService => {
  if (!logoServiceInstance) {
    logoServiceInstance = new LogoService();
  }
  return logoServiceInstance;
};

export const logoService = {
  generateLogo: (
    businessName: string,
    keywords: string,
    industry: string,
    style?: string,
    usedPatterns: string[] = [],
    usedSubjects: string[] = []
  ) => getLogoService().generateLogo(businessName, keywords, industry, style, usedPatterns, usedSubjects),
  vectorize: (sourceUrl: string) => getLogoService().vectorize(sourceUrl),
  releaseSource: (sourceUrl: string) => getLogoService().releaseSource(sourceUrl),
};
