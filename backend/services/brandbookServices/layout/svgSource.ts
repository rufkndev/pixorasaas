export interface SvgSource {
  inner: string;
  viewBox: string;
  aspect: number;
  // Презентационные атрибуты корня: дети их наследуют, и потерять их нельзя
  attrs: string;
}

// Атрибуты, которые наследуются вниз по дереву. Штриховые наборы иконок
// (Lucide, Tabler) держат на корне fill="none" stroke="currentColor", и без
// переноса этих атрибутов иконка приезжает залитым чёрным пятном.
const INHERITED = [
  'fill',
  'stroke',
  'stroke-width',
  'stroke-linecap',
  'stroke-linejoin',
  'stroke-miterlimit',
  'fill-rule',
  'clip-rule',
  'opacity',
];

// Разбор чужого SVG для вставки внутрь полосы: корень отбрасывается, потому
// что размер и положение задаём мы, а viewBox и наследуемые атрибуты остаются
export const parseSvg = (svg: string): SvgSource | null => {
  const open = svg.match(/<svg\b[^>]*>/i);
  const viewBox = open?.[0].match(/viewBox="([^"]+)"/i)?.[1];

  if (!open || !viewBox) return null;

  const [, , width, height] = viewBox.trim().split(/[\s,]+/).map(Number);

  if (!width || !height) return null;

  const inner = svg
    .replace(/^[\s\S]*?<svg\b[^>]*>/i, '')
    .replace(/<\/svg>\s*$/i, '')
    .trim();

  if (!inner) return null;

  const attrs = INHERITED.map((name) => {
    const value = open[0].match(new RegExp(`\\b${name}="([^"]*)"`, 'i'))?.[1];
    return value ? `${name}="${value}"` : '';
  })
    .filter(Boolean)
    .join(' ');

  return { inner, viewBox, aspect: width / height, attrs };
};
