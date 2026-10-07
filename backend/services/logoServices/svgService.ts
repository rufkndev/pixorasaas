import sharp from 'sharp';
import { log } from '../../logger';

// Recraft всегда отдаёт квадрат 2048, но опираться на это вслепую нельзя
const DEFAULT_VIEWBOX = 2048;
// Доля знака в кадре: остальное — ровное поле по краям
const MARK_SHARE = 0.86;

export interface NormalizedSvg {
  svg: string;
  // Сколько путей осталось после чистки — по этому числу видно пустой ответ
  paths: number;
}

interface PathInfo {
  tag: string;
  left: number;
  top: number;
  right: number;
  bottom: number;
  points: number;
}

const pathInfo = (tag: string): PathInfo | null => {
  const d = tag.match(/\bd="([^"]+)"/i)?.[1];
  if (!d) return null;

  const nums = d.match(/-?\d+(?:\.\d+)?/g);
  if (!nums || nums.length < 4) return null;

  const xs = nums.filter((_, i) => i % 2 === 0).map(Number);
  const ys = nums.filter((_, i) => i % 2 === 1).map(Number);

  return {
    tag,
    left: Math.min(...xs),
    top: Math.min(...ys),
    right: Math.max(...xs),
    bottom: Math.max(...ys),
    points: nums.length / 2,
  };
};

// Recraft кладёт первым path прямоугольник на весь холст. Это и есть та самая
// «квадратная рамка»: залитый фон, из-за которого логотип непрозрачный.
// Матчим по геометрии, а не по цвету — заливка плавает от 252,252,249 до 255,255,255
const isBackgroundPath = (d: string, width: number, height: number): boolean => {
  const nums = d.match(/-?\d+(?:\.\d+)?/g);
  if (!nums || nums.length < 8 || nums.length > 128) return false;

  const xs = nums.filter((_, i) => i % 2 === 0).map(Number);
  const ys = nums.filter((_, i) => i % 2 === 1).map(Number);
  const tol = Math.max(width, height) * 0.02;

  const spansX = Math.min(...xs) <= tol && Math.max(...xs) >= width - tol;
  const spansY = Math.min(...ys) <= tol && Math.max(...ys) >= height - tol;

  if (!spansX || !spansY) return false;

  // Считать по числу точек нельзя: обводчик рисует фон то отрезками (5 точек),
  // то кривыми Безье (14 и больше). Отличаем по тому, что все точки фона лежат
  // на границе кадра, а у знака, занимающего весь кадр, они идут внутри
  const onBorder = xs.filter((x, i) => {
    const y = ys[i];
    return x <= tol || x >= width - tol || y <= tol || y >= height - tol;
  }).length;

  return onBorder >= xs.length * 0.9;
};

// Модель любит подкладывать под знак сплошную плашку — шестиугольник, круг,
// скруглённый квадрат. Именно её пользователь видит как «рамку вокруг логотипа».
// Убираем, только когда это точно плашка, а не сам знак:
//   — рисуется первой, то есть позади всего;
//   — закрывает почти весь знак по обеим осям;
//   — простая по форме: у силуэта предмета точек в разы больше;
//   — поверх неё есть содержимое.
const isBackingPlate = (first: PathInfo, rest: PathInfo[]): boolean => {
  if (rest.length < 2 || first.points > 20) return false;

  const left = Math.min(...rest.map((p) => p.left));
  const top = Math.min(...rest.map((p) => p.top));
  const right = Math.max(...rest.map((p) => p.right));
  const bottom = Math.max(...rest.map((p) => p.bottom));

  const coversX = (first.right - first.left) >= (right - left) * 0.85;
  const coversY = (first.bottom - first.top) >= (bottom - top) * 0.85;

  return coversX && coversY;
};

export class SvgService {
  // Приводит ответ модели к чистому знаку на прозрачном фоне.
  // keepEnclosure — для эмблем и штампов, где замкнутый контур и есть знак
  async normalize(raw: string, keepEnclosure: boolean = false): Promise<NormalizedSvg> {
    let svg = raw.replace(/<metadata>[\s\S]*?<\/metadata>/gi, '');

    const root = svg.match(/<svg[^>]*>/i)?.[0] || '';
    const viewBox = root.match(/viewBox="([^"]+)"/i)?.[1];
    const [, , vbWidth, vbHeight] = viewBox
      ? viewBox.split(/[\s,]+/).map(Number)
      : [0, 0, DEFAULT_VIEWBOX, DEFAULT_VIEWBOX];

    const width = vbWidth || DEFAULT_VIEWBOX;
    const height = vbHeight || DEFAULT_VIEWBOX;

    // Удаляем только первый подходящий path: внутри знака тоже бывают
    // крупные заливки, и вырезать их все — значит разобрать логотип
    let removed = false;
    svg = svg.replace(/<path\b[^>]*\/>/gi, (tag) => {
      if (removed) return tag;
      const d = tag.match(/\bd="([^"]+)"/i)?.[1];
      if (d && isBackgroundPath(d, width, height)) {
        removed = true;
        return '';
      }
      return tag;
    });

    if (!keepEnclosure) {
      svg = this.stripBackingPlate(svg);
    }

    // preserveAspectRatio="none" вместе с width=1024 при viewBox=2048
    // растягивает знак, поэтому корневой тег переписываем целиком
    svg = svg.replace(
      /<svg[^>]*>/i,
      `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" ` +
        `viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">`
    );

    const paths = (svg.match(/<path\b/gi) || []).length;
    if (paths === 0) {
      return { svg, paths };
    }

    return { svg: await this.tighten(svg, width, height), paths };
  }

  private stripBackingPlate(svg: string): string {
    const tags = svg.match(/<path\b[^>]*\/>/gi) || [];
    const infos = tags.map(pathInfo).filter(Boolean) as PathInfo[];

    if (infos.length < 3 || !isBackingPlate(infos[0], infos.slice(1))) {
      return svg;
    }

    return svg.replace(infos[0].tag, '');
  }

  // Обрезает поля по фактическому содержимому. Операция векторная: правим
  // viewBox, а не ресайзим растр, поэтому качество не теряется
  private async tighten(svg: string, width: number, height: number): Promise<string> {
    try {
      const box = await this.contentBox(svg, width, height);
      if (!box) return svg;

      const side = Math.max(box.width, box.height) / MARK_SHARE;
      const minX = box.left + box.width / 2 - side / 2;
      const minY = box.top + box.height / 2 - side / 2;

      return svg.replace(
        /<svg[^>]*>/i,
        `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" ` +
          `viewBox="${minX.toFixed(2)} ${minY.toFixed(2)} ${side.toFixed(2)} ${side.toFixed(2)}" ` +
          `width="${Math.round(side)}" height="${Math.round(side)}">`
      );
    } catch (error: any) {
      log.error('Не удалось обрезать поля логотипа:', error.message);
      return svg;
    }
  }

  // Габариты непрозрачных пикселей. Считаем по уменьшенному рендеру:
  // на полном размере это лишние секунды без выигрыша в точности
  private async contentBox(svg: string, width: number, height: number) {
    const probe = 512;
    const { data, info } = await sharp(Buffer.from(svg))
      .resize(probe, probe, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    let minX = info.width;
    let minY = info.height;
    let maxX = -1;
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

    if (maxX < 0 || maxY < 0) return null;

    const scale = width / info.width;
    return {
      left: minX * scale,
      top: minY * (height / info.height),
      width: (maxX - minX + 1) * scale,
      height: (maxY - minY + 1) * (height / info.height),
    };
  }

  // Любой размер рендерится из вектора, поэтому края чистые всегда
  async toPng(svg: string, size: number): Promise<Buffer> {
    return sharp(Buffer.from(svg), { density: 300 })
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png({ compressionLevel: 9 })
      .toBuffer();
  }
}

export const svgService = new SvgService();
