import fs from 'fs';
import path from 'path';
import opentype from 'opentype.js';
import { log } from '../../../logger';

// Ширины читаются из самих ttf, а не растровым трюком: lockupService.measure()
// рендерит полный растр и сканирует пиксели на каждую строку, а на пятнадцати
// полосах строк сотни.
export interface FontRef {
  family: string;
  slug: string;
  // Абсолютные пути к ttf, их даёт typographyService
  files: string[];
}

export interface TextStyle {
  font: FontRef;
  size: number;
  weight?: number;
  tracking?: number;
}

interface Face {
  weight: number;
  font: opentype.Font;
}

// Замерено в образе: rsvg-convert против предсказания opentype.js на строке
// «Фирменный стиль Brandbook 2026». У вариативных шрифтов opentype.js отдаёт
// метрики экземпляра по умолчанию — HVAR он разбирает, но к advanceWidth не
// применяет, поэтому болд оказывается шире предсказания. Rubik, Nunito и
// Manrope расходятся уже на 400: их экземпляр по умолчанию — 300, 200 и 200.
const WIDTH_FACTOR: Record<string, Record<number, number>> = {
  inter: { 400: 1, 500: 1.005, 600: 1.015, 700: 1.026 },
  'golos-text': { 400: 1, 500: 1, 600: 1.008, 700: 1.018 },
  'playfair-display': { 400: 1, 500: 1.012, 600: 1.029, 700: 1.046 },
  unbounded: { 400: 1, 500: 1.019, 600: 1.032, 700: 1.044 },
  comfortaa: { 400: 1, 500: 1, 600: 1.002, 700: 1.007 },
  'ibm-plex-sans': { 400: 1, 500: 1.013, 600: 1.025, 700: 1.038 },
  rubik: { 400: 1.024, 500: 1.059, 600: 1.076, 700: 1.096 },
  nunito: { 400: 1.025, 500: 1.033, 600: 1.042, 700: 1.062 },
  manrope: { 400: 1.03, 500: 1.048, 600: 1.066, 700: 1.083 },
  oswald: { 400: 1, 500: 1.061, 600: 1.097, 700: 1.125 },
};

// Перенос обязан ошибаться в сторону запаса: недооценка ширины выносит строку
// за поле полосы, переоценка лишь чуть раньше её ломает
const WRAP_SAFETY = 1.01;

const faces = new Map<string, Face[]>();
const complained = new Set<string>();

const weightFromName = (file: string): number => {
  const matched = path.basename(file).match(/-(\d{3})\.ttf$/i);
  return matched ? Number(matched[1]) : 400;
};

// Загрузка ленивая и один раз на семейство: разбор ttf стоит десятки
// миллисекунд, а полос пятнадцать
const load = (font: FontRef): Face[] => {
  const cached = faces.get(font.slug);
  if (cached) return cached;

  const loaded: Face[] = [];

  for (const file of font.files) {
    try {
      const buffer = fs.readFileSync(file);
      loaded.push({
        weight: weightFromName(file),
        font: opentype.parse(
          buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
        ),
      });
    } catch (error: any) {
      log.error(`Метрики шрифта ${font.family}: ${file} не читается — ${error.message}`);
    }
  }

  loaded.sort((first, second) => first.weight - second.weight);
  faces.set(font.slug, loaded);
  return loaded;
};

// У статических семейств (PT Sans, PT Serif) на диске лежат отдельные 400 и
// 700 — тогда метрики точны и поправка не нужна
const pickFace = (loaded: Face[], weight: number): Face | null => {
  if (!loaded.length) return null;

  return loaded.reduce((best, face) =>
    Math.abs(face.weight - weight) < Math.abs(best.weight - weight) ? face : best
  );
};

const factorFor = (font: FontRef, weight: number, exactFace: boolean): number => {
  if (exactFace) return 1;

  const table = WIDTH_FACTOR[font.slug];
  if (!table) return 1;

  const steps = Object.keys(table).map(Number).sort((a, b) => a - b);
  const nearest = steps.reduce((best, step) =>
    Math.abs(step - weight) < Math.abs(best - weight) ? step : best
  );

  return table[nearest];
};

// getAdvanceWidth() из opentype.js не годится: он идёт через разбор GSUB и на
// Inter падает с «substFormat: 2 is not yet supported». Идём по кодовым
// точкам и складываем advanceWidth с кернингом.
const advance = (font: opentype.Font, value: string): number => {
  let total = 0;
  let previous: number | null = null;

  for (const char of value) {
    const index = font.charToGlyphIndex(char) || 0;
    const glyph = font.glyphs.get(index);

    if (previous !== null) {
      try {
        total += font.getKerningValue(font.glyphs.get(previous), glyph);
      } catch {
        // Кернинга может не быть — на ширину это влияет в пределах процента
      }
    }

    total += glyph?.advanceWidth || 0;
    previous = index;
  }

  return total / font.unitsPerEm;
};

export const measure = (value: string, style: TextStyle): number => {
  const weight = style.weight ?? 400;
  const tracking = (style.tracking ?? 0) * Math.max(0, [...value].length - 1);
  const face = pickFace(load(style.font), weight);

  if (!face) {
    // Шрифты не скачаны (в деве бывает) — грубая оценка вместо падения
    if (!complained.has(style.font.slug)) {
      complained.add(style.font.slug);
      log.error(`Метрики шрифта ${style.font.family}: файлов нет, ширина оценивается грубо`);
    }
    return [...value].length * style.size * 0.55 + tracking;
  }

  const factor = factorFor(style.font, weight, face.weight === weight);
  return advance(face.font, value) * style.size * factor + tracking;
};

// Высота прописной буквы в долях кегля. Нужна и для вертикальной центровки
// строки в плашке, и для охранного поля: оно равно высоте прописной.
export const capHeight = (font: FontRef): number => {
  const face = pickFace(load(font), 400);
  const declared = face?.font.tables?.os2?.sCapHeight;

  return face && declared ? declared / face.font.unitsPerEm : 0.7;
};

export const wrap = (value: string, style: TextStyle, maxWidth: number): string[] => {
  const words = value.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;

    if (current && measure(candidate, style) * WRAP_SAFETY > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }

  if (current) lines.push(current);
  return lines.length ? lines : [''];
};

// Строка обязана влезть в отведённую ширину: заголовок с длинным названием
// иначе выезжает за поле. Кегль уменьшается шагами, ниже min не опускается.
export const fitSize = (
  value: string,
  style: TextStyle,
  maxWidth: number,
  minSize: number
): number => {
  let size = style.size;

  while (size > minSize && measure(value, { ...style, size }) > maxWidth) {
    size -= Math.max(0.2, size * 0.04);
  }

  return Math.max(minSize, Math.round(size * 100) / 100);
};
