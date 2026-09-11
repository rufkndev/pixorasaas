import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

import { GeneratedLogo } from '../../../db/types';
import { logosRepo } from '../../../db/repositories';
import { resolveGeneratedLogoPath } from '../../../paths';
import { LockupMark, LockupLayout, lockupService } from '../../logoServices/lockupService';
import { rasterService } from '../../logoServices/rasterService';
import { logoService, rawNameFor } from '../../logoService';
import { BrandColor } from './paletteService';
import { assetName, assetUrl, newToken, saveAsset } from '../render/assets';

export type AssetKind =
  | 'primary'
  | 'horizontal'
  | 'stacked'
  | 'mark'
  | 'mono-black'
  | 'mono-white'
  | 'one-color';

export interface LogoAsset {
  kind: AssetKind;
  name: string;
  description: string;
  usage: string;
  // Открытое превью 512 px — его показывает страница брендбука
  url: string;
  // Закрытые файлы: попадают только в архив после проверки оплаты
  files: { svg?: string; png2048: string };
  // Показывать на тёмной подложке: выворотка на белом не видна
  onDark: boolean;
}

const PREVIEW = 512;
const EXPORT = 2048;

const META: Record<AssetKind, { name: string; description: string; usage: string; onDark: boolean }> = {
  primary: {
    name: 'Основная версия',
    description: 'Логотип в том виде, в каком вы его купили',
    usage: 'Везде по умолчанию: сайт, документы, вывеска',
    onDark: false,
  },
  horizontal: {
    name: 'Горизонтальная блокировка',
    description: 'Знак и название в строку',
    usage: 'Шапка сайта, подпись письма, обложка соцсетей — везде, где мало высоты',
    onDark: false,
  },
  stacked: {
    name: 'Вертикальная блокировка',
    description: 'Знак над названием',
    usage: 'Печати, упаковка, квадратные форматы',
    onDark: false,
  },
  mark: {
    name: 'Только знак',
    description: 'Знак без названия',
    usage: 'Аватар, иконка приложения, мелкие размеры, где название не читается',
    onDark: false,
  },
  'mono-black': {
    name: 'Однокрасочная версия',
    description: 'Полностью чёрный логотип, без полутонов',
    usage: 'Печать в одну краску, гравировка, штамп, факс',
    onDark: false,
  },
  'mono-white': {
    name: 'Выворотка',
    description: 'Полностью белый логотип на прозрачном фоне',
    usage: 'Тёмные подложки, фотографии, тёмная тема интерфейса',
    onDark: true,
  },
  'one-color': {
    name: 'В основном цвете',
    description: 'Логотип целиком в основном цвете бренда',
    usage: 'Тиснение, шелкография, любые ограничения по числу красок',
    onDark: false,
  },
};

// Перекраска идёт по вектору: fill="none" сохраняем, иначе у знака пропадут
// вырезы и он превратится в залитое пятно
const recolor = (svg: string, hex: string): string =>
  svg
    .replace(/fill="(?!none")[^"]*"/gi, `fill="${hex}"`)
    .replace(/stroke="(?!none")[^"]*"/gi, `stroke="${hex}"`)
    .replace(/fill:\s*(?!none)[^;"']+/gi, `fill:${hex}`)
    .replace(/stroke:\s*(?!none)[^;"']+/gi, `stroke:${hex}`);

// Запасной путь для растрового знака: перекрасить <image> нельзя, поэтому
// альфа рендера становится маской, а под неё подкладывается плашка цвета.
// Это и есть настоящая однокрасочность — прежний .grayscale() превращал
// двухцветный знак в два серых, что не годится ни для печати в одну краску,
// ни для гравировки, ни для вышивки.
const paintByAlpha = async (png: Buffer, hex: string): Promise<Buffer> => {
  const { width = EXPORT, height = EXPORT } = await sharp(png).metadata();
  const alpha = await sharp(png).ensureAlpha().extractChannel('alpha').raw().toBuffer();

  return sharp({ create: { width, height, channels: 3, background: hex } })
    .joinChannel(alpha, { raw: { width, height, channels: 1 } })
    .png({ compressionLevel: 9 })
    .toBuffer();
};

// Свой рендер, а не svgService.toPng: тот сводит вывод в квадрат, и
// горизонтальная блокировка получала бы широкие пустые поля
const renderPng = async (svg: string, maxSide: number): Promise<Buffer> =>
  sharp(Buffer.from(svg), { density: 300 })
    .resize({
      width: maxSide,
      height: maxSide,
      fit: 'inside',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({ compressionLevel: 9 })
    .toBuffer();

export interface LogoAssetsInput {
  brandbookId: number;
  logo: GeneratedLogo | null;
  // Открытая копия исходника: на ней строится основная версия
  sourceLogoUrl: string;
  name: string;
  style: string;
  colors: BrandColor[];
}

export class LogoAssetService {
  // Знак выводится заново из кадра модели — того самого, что logoService
  // всегда сохраняет рядом с обработанным файлом. Обращений к модели нет.
  private async loadMark(logo: GeneratedLogo | null): Promise<LockupMark | null> {
    const sourceUrl = logo?.originalLogoUrl;
    const sourcePath = sourceUrl ? resolveGeneratedLogoPath(sourceUrl) : null;

    if (!sourcePath) return null;

    const rawPath = path.join(path.dirname(sourcePath), rawNameFor(sourcePath));
    if (!fs.existsSync(rawPath)) return null;

    try {
      const mark = await rasterService.toTransparentMark(fs.readFileSync(rawPath));
      const vector = await this.vectorMarkFor(logo!, mark.png);

      return vector || (await lockupService.rasterMark(mark.png));
    } catch (error: any) {
      console.error('Не удалось выделить знак из кадра модели:', error.message);
      return null;
    }
  }

  // Обводка стоит денег за вызов, поэтому результат кэшируется в базе:
  // повтор упавшей сборки не платит за неё второй раз
  private async vectorMarkFor(logo: GeneratedLogo, markPng: Buffer): Promise<LockupMark | null> {
    try {
      let svgUrl = logo.markSvgUrl;

      if (!svgUrl) {
        // Имя привязано к логотипу, а не к заказу, и не содержит случайного
        // хвоста: файл — кэш, он должен находиться при повторной сборке.
        // Подстрока -source закрывает чистый знак от статики
        const markUrl = saveAsset(markPng, `logo-${logo.id}-mark-source.png`);

        svgUrl = await logoService.vectorize(markUrl);
        if (svgUrl) await logosRepo.setMarkSvgUrl(logo.id, svgUrl);
      }

      const svgPath = svgUrl ? resolveGeneratedLogoPath(svgUrl) : null;
      if (!svgPath || !fs.existsSync(svgPath)) return null;

      return lockupService.vectorMark(fs.readFileSync(svgPath, 'utf8'));
    } catch (error: any) {
      // Без вектора локапы соберутся растром: хуже, но заказ выдан
      console.error('Не удалось получить вектор знака:', error.message);
      return null;
    }
  }

  private async render(
    input: LogoAssetsInput,
    token: string,
    kind: AssetKind,
    svg: string,
    rasterFallback?: Buffer
  ): Promise<LogoAsset> {
    const vector = !!svg;
    const png = vector ? await renderPng(svg, EXPORT) : rasterFallback!;

    const files: LogoAsset['files'] = {
      png2048: saveAsset(
        png,
        assetName({ brandbookId: input.brandbookId, token, slot: kind, ext: 'png', paid: true })
      ),
    };

    if (vector) {
      files.svg = saveAsset(
        svg,
        assetName({ brandbookId: input.brandbookId, token, slot: kind, ext: 'svg', paid: true })
      );
    }

    // Превью открытое: страница брендбука показывает его в браузере.
    // Выворотку кладём на тёмное, иначе в превью будет пустой квадрат.
    const dark = input.colors.find((color) => color.key === 'dark')?.hex || '#111827';
    const preview = await sharp(png)
      .resize(PREVIEW, PREVIEW, { fit: 'inside', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .flatten({ background: META[kind].onDark ? dark : '#ffffff' })
      .png()
      .toBuffer();

    const url = saveAsset(
      preview,
      assetName({ brandbookId: input.brandbookId, token, slot: `${kind}-preview`, ext: 'png', paid: false })
    );

    return { kind, ...META[kind], url, files };
  }

  async buildLogoAssets(input: LogoAssetsInput): Promise<LogoAsset[]> {
    const token = newToken();
    const mark = await this.loadMark(input.logo);
    const primaryColor = input.colors.find((color) => color.key === 'primary')?.hex || '#111827';
    const inkColor = input.colors.find((color) => color.key === 'dark')?.hex || '#111827';

    const lockup = (layout: LockupLayout, color: string) =>
      lockupService.build(mark, input.name, input.style, color, layout);

    const assets: LogoAsset[] = [];

    // Основная версия — ровно то, что купили: тот же файл, что отдавался
    // как логотип, поэтому берём готовый исходник, а не пересобираем
    const sourcePath = resolveGeneratedLogoPath(input.sourceLogoUrl);
    const sourcePng = sourcePath && fs.existsSync(sourcePath) ? fs.readFileSync(sourcePath) : null;

    if (sourcePng) {
      const primary = await this.render(input, token, 'primary', '', sourcePng);

      // Вектор целого локапа обводится при выдаче заказа (buildVector) —
      // отдаём покупателю именно его, а не пересобранный
      const lockupSvg = input.logo?.originalSvgUrl
        ? resolveGeneratedLogoPath(input.logo.originalSvgUrl)
        : null;

      if (lockupSvg && fs.existsSync(lockupSvg)) {
        primary.files.svg = saveAsset(
          fs.readFileSync(lockupSvg),
          assetName({ brandbookId: input.brandbookId, token, slot: 'primary', ext: 'svg', paid: true })
        );
      }

      assets.push(primary);
    }

    // Блокировки собираются заново из знака и надписи. Горизонтальная нужна
    // в шапке сайта, подписи письма и обложке соцсетей — до этого раскладка
    // была написана, но ни разу не использовалась
    if (mark) {
      for (const [kind, layout] of [
        ['horizontal', 'horizontal'],
        ['stacked', 'stacked'],
        ['mark', 'markOnly'],
      ] as Array<[AssetKind, LockupLayout]>) {
        try {
          assets.push(await this.render(input, token, kind, await lockup(layout, inkColor)));
        } catch (error: any) {
          console.error(`Блокировка «${kind}» не собралась:`, error.message);
        }
      }
    }

    // Цветовые версии: по вектору — точная перекраска, по растру — маска
    // из альфы. Оба пути дают настоящую одну краску, а не серый.
    for (const [kind, color] of [
      ['mono-black', '#000000'],
      ['mono-white', '#ffffff'],
      ['one-color', primaryColor],
    ] as Array<[AssetKind, string]>) {
      try {
        if (mark?.kind === 'vector') {
          const svg = recolor(await lockup('stacked', color), color);
          assets.push(await this.render(input, token, kind, svg));
        } else if (sourcePng) {
          assets.push(await this.render(input, token, kind, '', await paintByAlpha(sourcePng, color)));
        }
      } catch (error: any) {
        console.error(`Версия «${kind}» не собралась:`, error.message);
      }
    }

    return assets;
  }

  // Демо до оплаты: варианты строятся из превью с водяным знаком, чистых
  // файлов здесь не появляется
  async previewVariants(previewUrl: string, colors: BrandColor[]): Promise<LogoAsset[]> {
    const previewPath = resolveGeneratedLogoPath(previewUrl);

    const original: LogoAsset = {
      kind: 'primary',
      ...META.primary,
      url: previewUrl,
      files: { png2048: previewUrl },
      onDark: false,
    };

    if (!previewPath || !fs.existsSync(previewPath)) return [original];

    try {
      const buffer = fs.readFileSync(previewPath);
      const dark = colors.find((color) => color.key === 'dark')?.hex || '#111827';

      const mono = await sharp(buffer).grayscale().png().toBuffer();
      const inverted = await sharp(buffer).flatten({ background: dark }).negate({ alpha: false }).png().toBuffer();

      const name = (slot: string) =>
        assetName({ brandbookId: 0, token: newToken(), slot, ext: 'png', paid: false });

      const monoUrl = saveAsset(mono, name('demo-mono'));
      const invertedUrl = saveAsset(inverted, name('demo-inverted'));

      return [
        original,
        { kind: 'mono-black', ...META['mono-black'], url: monoUrl, files: { png2048: monoUrl } },
        { kind: 'mono-white', ...META['mono-white'], url: invertedUrl, files: { png2048: invertedUrl } },
      ];
    } catch (error: any) {
      console.error('Демо-варианты логотипа не собрались:', error.message);
      return [original];
    }
  }
}

export const logoAssetService = new LogoAssetService();
