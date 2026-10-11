import fs from 'fs';
import sharp from 'sharp';

import { resolveGeneratedLogoPath } from '../../../paths';
import { AssetKind, LogoAsset } from '../brand/logoAssetService';
import { Box } from './svg';
import { parseSvg } from './svgSource';
import { round } from './units';
import { log } from '../../../logger';

// Логотип на полосе — либо вложенный вектор (тогда полоса целиком остаётся
// вектором и текст в PDF выделяется мышью), либо <image> с data-URI.
// aspect — отношение ширины к высоте. Без него нельзя нарисовать ни охранное
// поле, ни размерные линии: preserveAspectRatio вписывает логотип в бокс сам,
// и его настоящие границы внутри бокса нам иначе неизвестны.
export type Artwork =
  | { kind: 'vector'; inner: string; viewBox: string; aspect: number; attrs: string }
  | { kind: 'raster'; dataUri: string; aspect: number };

// PNG 2048 в base64 — это около 400 КБ на каждое вхождение, а логотип
// встречается на четырёх полосах. Для вставки хватает 1200 px.
const EMBED_SIDE = 1200;

const cache = new Map<string, Artwork | null>();

const asVector = (svg: string): Artwork | null => {
  const parsed = parseSvg(svg);
  return parsed ? { kind: 'vector', ...parsed } : null;
};

const asRaster = async (path: string): Promise<Artwork> => {
  const { data, info } = await sharp(fs.readFileSync(path))
    .resize(EMBED_SIDE, EMBED_SIDE, { fit: 'inside', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toBuffer({ resolveWithObject: true });

  return {
    kind: 'raster',
    dataUri: `data:image/png;base64,${data.toString('base64')}`,
    aspect: info.width / info.height,
  };
};

const read = async (asset: LogoAsset): Promise<Artwork | null> => {
  const svgPath = asset.files.svg ? resolveGeneratedLogoPath(asset.files.svg) : null;

  if (svgPath && fs.existsSync(svgPath)) {
    const vector = asVector(fs.readFileSync(svgPath, 'utf8'));
    if (vector) return vector;
  }

  const pngPath = resolveGeneratedLogoPath(asset.files.png2048);
  if (pngPath && fs.existsSync(pngPath)) return asRaster(pngPath);

  return null;
};

export const loadArtwork = async (asset: LogoAsset | undefined): Promise<Artwork | null> => {
  if (!asset) return null;

  const key = asset.files.svg || asset.files.png2048;
  if (cache.has(key)) return cache.get(key)!;

  let artwork: Artwork | null = null;

  try {
    artwork = await read(asset);
  } catch (error: any) {
    log.error(`Логотип «${asset.kind}» не удалось вставить в полосу:`, error.message);
  }

  cache.set(key, artwork);
  return artwork;
};

export const pickAsset = (assets: LogoAsset[], ...kinds: AssetKind[]): LogoAsset | undefined => {
  for (const kind of kinds) {
    const found = assets.find((asset) => asset.kind === kind);
    if (found) return found;
  }
  return undefined;
};

// Вписывание отдаётся preserveAspectRatio: и вложенный svg, и image считают
// его сами, а нам не приходится знать пропорции знака. fit: 'none' растягивает
// логотип по прямоугольнику — это нужно ровно одной полосе, «как нельзя».
export const place = (
  artwork: Artwork | null,
  box: Box,
  fit: 'meet' | 'none' = 'meet'
): string => {
  if (!artwork) return '';

  const attrs =
    `x="${round(box.x)}" y="${round(box.y)}" ` +
    `width="${round(box.width)}" height="${round(box.height)}" ` +
    `preserveAspectRatio="${fit === 'none' ? 'none' : 'xMidYMid meet'}"`;

  return artwork.kind === 'vector'
    ? `<svg ${attrs} viewBox="${artwork.viewBox}" ${artwork.attrs}>${artwork.inner}</svg>`
    : `<image ${attrs} xlink:href="${artwork.dataUri}"/>`;
};

// Настоящие границы логотипа внутри бокса: вписывание идёт по меньшей стороне
// и центрируется, значит по одной оси остаются поля
export const fitBox = (artwork: Artwork | null, box: Box): Box => {
  if (!artwork) return box;

  const scale = Math.min(box.width / artwork.aspect, box.height);
  const width = scale * artwork.aspect;

  return {
    x: box.x + (box.width - width) / 2,
    y: box.y + (box.height - scale) / 2,
    width,
    height: scale,
  };
};

// Бокс заданной ширины под пропорции логотипа — нужен, когда размер задан
// физически: «минимум 20 мм по ширине»
export const boxOfWidth = (artwork: Artwork | null, x: number, y: number, width: number): Box => ({
  x,
  y,
  width,
  height: artwork ? width / artwork.aspect : width,
});

// Бокс не шире maxWidth и не выше maxHeight. В макетах только так: вертикальная
// блокировка почти квадратная, и при вписывании по ширине наезжала на текст под ней
export const boxWithin = (
  artwork: Artwork | null,
  x: number,
  y: number,
  maxWidth: number,
  maxHeight: number
): Box => {
  const aspect = artwork?.aspect || 1;
  const width = Math.min(maxWidth, maxHeight * aspect);

  return { x, y, width, height: width / aspect };
};
