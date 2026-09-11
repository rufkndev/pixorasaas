import { PAGE, round } from './units';

// Бренд-строки приходят от пользователя и попадают в разметку полосы. Прежний
// applicationsService интерполировал их в шаблоны без экранирования, и «&» в
// названии ломал файл целиком.
export const escapeXml = (value: string): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const page = (background: string, children: string): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ` +
  `width="${PAGE.width}mm" height="${PAGE.height}mm" ` +
  `viewBox="0 0 ${PAGE.width} ${PAGE.height}">` +
  `<rect x="0" y="0" width="${PAGE.width}" height="${PAGE.height}" fill="${background}"/>` +
  children +
  `</svg>`;

export interface RectOptions extends Box {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  radius?: number;
  opacity?: number;
}

export const rect = (options: RectOptions): string => {
  const attrs = [
    `x="${round(options.x)}"`,
    `y="${round(options.y)}"`,
    `width="${round(options.width)}"`,
    `height="${round(options.height)}"`,
    `fill="${options.fill ?? 'none'}"`,
  ];

  if (options.radius) attrs.push(`rx="${round(options.radius)}"`);
  if (options.stroke) attrs.push(`stroke="${options.stroke}"`);
  if (options.strokeWidth) attrs.push(`stroke-width="${round(options.strokeWidth)}"`);
  if (options.opacity !== undefined) attrs.push(`opacity="${options.opacity}"`);

  return `<rect ${attrs.join(' ')}/>`;
};

export interface LineOptions {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  stroke: string;
  width?: number;
  dash?: string;
}

export const line = (options: LineOptions): string => {
  const attrs = [
    `x1="${round(options.x1)}"`,
    `y1="${round(options.y1)}"`,
    `x2="${round(options.x2)}"`,
    `y2="${round(options.y2)}"`,
    `stroke="${options.stroke}"`,
    `stroke-width="${round(options.width ?? 0.2)}"`,
  ];

  if (options.dash) attrs.push(`stroke-dasharray="${options.dash}"`);

  return `<line ${attrs.join(' ')}/>`;
};

export const circle = (cx: number, cy: number, r: number, fill: string): string =>
  `<circle cx="${round(cx)}" cy="${round(cy)}" r="${round(r)}" fill="${fill}"/>`;

export interface TextOptions {
  x: number;
  y: number;
  content: string;
  family: string;
  size: number;
  weight?: number;
  fill: string;
  // Выравнивание отдаётся рендереру: он сам учитывает свой трекинг, а наши
  // метрики нужны только для переноса и проверки, влезает ли строка
  anchor?: 'start' | 'middle' | 'end';
  tracking?: number;
  opacity?: number;
  uppercase?: boolean;
}

export const text = (options: TextOptions): string => {
  const content = options.uppercase ? options.content.toUpperCase() : options.content;

  const attrs = [
    `x="${round(options.x)}"`,
    `y="${round(options.y)}"`,
    `font-family="${escapeXml(options.family)}"`,
    `font-size="${round(options.size)}"`,
    `font-weight="${options.weight ?? 400}"`,
    `fill="${options.fill}"`,
  ];

  if (options.anchor && options.anchor !== 'start') attrs.push(`text-anchor="${options.anchor}"`);
  if (options.tracking) attrs.push(`letter-spacing="${round(options.tracking)}"`);
  if (options.opacity !== undefined) attrs.push(`opacity="${options.opacity}"`);

  return `<text ${attrs.join(' ')}>${escapeXml(content)}</text>`;
};

export interface BlockOptions extends Omit<TextOptions, 'content'> {
  lines: string[];
  lineHeight: number;
}

// Абзац строками: перенос считается заранее в textMetrics, здесь только
// раскладка по базовым линиям
export const textBlock = ({ lines, lineHeight, ...rest }: BlockOptions): string =>
  lines
    .map((content, index) => text({ ...rest, content, y: rest.y + index * lineHeight }))
    .join('');

export const group = (children: string, transform?: string): string =>
  transform ? `<g transform="${transform}">${children}</g>` : `<g>${children}</g>`;
