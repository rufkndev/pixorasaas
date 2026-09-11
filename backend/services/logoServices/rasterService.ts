import sharp from 'sharp';

// Насколько цвет может отличаться от фонового, чтобы всё ещё считаться фоном
const BACKGROUND_TOLERANCE = 26;
// Сколько пикселей у границы знака сглаживаем. Узкая полоса: широкая
// превращала шумный фон модели в полупрозрачный квадрат
const FEATHER = 2;
// Доля знака в кадре: остальное — ровное поле по краям
const MARK_SHARE = 0.86;

export interface NormalizedMark {
  png: Buffer;
  width: number;
  height: number;
}

export class RasterService {
  // Убирает фон в прозрачность и обрезает поля. До этого логотип уходил
  // клиенту непрозрачным белым квадратом, который читался как рамка
  async toTransparentMark(input: Buffer): Promise<NormalizedMark> {
    const flat = await sharp(input).flatten({ background: '#ffffff' }).png().toBuffer();
    const withAlpha = await this.dropBackground(flat);
    const trimmed = await this.trimToContent(withAlpha);

    const meta = await sharp(trimmed).metadata();
    return { png: trimmed, width: meta.width || 0, height: meta.height || 0 };
  }

  // Прозрачным становится только фон, связанный с краем кадра.
  // Прежний глобальный порог по яркости съедал светлые детали внутри знака
  // и оставлял от шумного фона модели полупрозрачный квадрат
  private async dropBackground(flat: Buffer): Promise<Buffer> {
    const { data, info } = await sharp(flat)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const { width, height, channels } = info;
    const background = this.sampleBackground(data, info);
    const distance = (p: number) =>
      Math.max(
        Math.abs(data[p * channels] - background[0]),
        Math.abs(data[p * channels + 1] - background[1]),
        Math.abs(data[p * channels + 2] - background[2])
      );

    // 0 — сам фон, 1..FEATHER — кайма вокруг него, 255 — тело знака
    const depth = new Uint8Array(width * height).fill(255);
    const queue: number[] = [];

    for (let x = 0; x < width; x++) {
      queue.push(x, (height - 1) * width + x);
    }
    for (let y = 0; y < height; y++) {
      queue.push(y * width, y * width + width - 1);
    }

    // Заливка от краёв: внутренние белые детали до неё не дотягиваются
    for (let head = 0; head < queue.length; head++) {
      const p = queue[head];
      if (depth[p] === 0 || distance(p) > BACKGROUND_TOLERANCE) continue;

      depth[p] = 0;
      const x = p % width;
      const y = (p - x) / width;

      if (x > 0) queue.push(p - 1);
      if (x < width - 1) queue.push(p + 1);
      if (y > 0) queue.push(p - width);
      if (y < height - 1) queue.push(p + width);
    }

    this.growFeather(depth, width, height);

    const alpha = Buffer.alloc(width * height);
    for (let p = 0; p < alpha.length; p++) {
      if (depth[p] === 0) {
        alpha[p] = 0;
      } else if (depth[p] <= FEATHER) {
        // Сглаживание контура: чем ближе цвет к фону, тем прозрачнее
        alpha[p] = Math.min(255, Math.round((distance(p) / BACKGROUND_TOLERANCE) * 255));
      } else {
        alpha[p] = 255;
      }
    }

    return sharp(flat)
      .ensureAlpha()
      .joinChannel(alpha, { raw: { width, height, channels: 1 } })
      .png()
      .toBuffer();
  }

  // Помечает FEATHER колец вокруг залитого фона — только они смягчаются
  private growFeather(depth: Uint8Array, width: number, height: number): void {
    for (let ring = 1; ring <= FEATHER; ring++) {
      const found: number[] = [];

      for (let p = 0; p < depth.length; p++) {
        if (depth[p] !== 255) continue;

        const x = p % width;
        const y = (p - x) / width;
        const near =
          (x > 0 && depth[p - 1] === ring - 1) ||
          (x < width - 1 && depth[p + 1] === ring - 1) ||
          (y > 0 && depth[p - width] === ring - 1) ||
          (y < height - 1 && depth[p + width] === ring - 1);

        if (near) found.push(p);
      }

      for (const p of found) depth[p] = ring;
    }
  }

  // Цвет фона берём по краям кадра, а не считаем белым: модель кладёт знак
  // на слегка кремовую или сероватую подложку
  private sampleBackground(data: Buffer, info: { width: number; height: number; channels: number }): [number, number, number] {
    const { width, height, channels } = info;
    const points: number[] = [];

    for (let x = 0; x < width; x += Math.max(1, Math.floor(width / 64))) {
      points.push(x, (height - 1) * width + x);
    }
    for (let y = 0; y < height; y += Math.max(1, Math.floor(height / 64))) {
      points.push(y * width, y * width + width - 1);
    }

    const median = (offset: number) => {
      const values = points.map((p) => data[p * channels + offset]).sort((a, b) => a - b);
      return values[Math.floor(values.length / 2)] ?? 255;
    };

    return [median(0), median(1), median(2)];
  }

  // Обрезаем по фактической непрозрачности и центрируем на квадрате.
  // Знак не увеличиваем: растягивание давало видимые пиксели
  private async trimToContent(image: Buffer): Promise<Buffer> {
    const box = await this.contentBox(image);
    if (!box) return image;

    const mark = await sharp(image).extract(box).png().toBuffer();
    const side = Math.round(Math.max(box.width, box.height) / MARK_SHARE);

    return sharp({
      create: { width: side, height: side, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    })
      .composite([{ input: mark, gravity: 'centre' }])
      .png()
      .toBuffer();
  }

  private async contentBox(image: Buffer) {
    const { data, info } = await sharp(image).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

    let left = info.width;
    let top = info.height;
    let right = -1;
    let bottom = -1;

    for (let y = 0; y < info.height; y++) {
      for (let x = 0; x < info.width; x++) {
        if (data[(y * info.width + x) * info.channels + 3] > 12) {
          if (x < left) left = x;
          if (x > right) right = x;
          if (y < top) top = y;
          if (y > bottom) bottom = y;
        }
      }
    }

    // Пустой кадр — лучше вернуть как есть, чем обрезать в ничто
    if (right < 0 || bottom < 0 || right - left < 16 || bottom - top < 16) return null;

    return { left, top, width: right - left + 1, height: bottom - top + 1 };
  }

  // Доля непрозрачных пикселей — по ней видно, что модель отдала пустой кадр
  async inkShare(image: Buffer): Promise<number> {
    const { data, info } = await sharp(image)
      .resize(128, 128, { fit: 'inside' })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    let ink = 0;
    const total = info.width * info.height;

    for (let p = 0; p < total; p++) {
      if (data[p * info.channels + 3] > 12) ink++;
    }

    return ink / total;
  }
}

export const rasterService = new RasterService();
