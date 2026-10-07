import { brandbooksRepo, BrandbookPatch } from '../../db/repositories';
import { BUILD_STEPS, StepKey, StepMeta, progressBefore } from './progress';

import { GeneratedLogo } from '../../db/types';
import { sloganService } from './sloganService';
import { BrandColor, buildPalette } from './brand/paletteService';
import { iconSetService } from './brand/iconSetService';
import { buildPatterns } from './brand/patternService';
import { BrandFont, buildTypography } from './brand/typographyService';
import { LogoAsset, logoAssetService } from './brand/logoAssetService';
import { BrandGuidelines, guidelinesService } from './content/guidelinesService';
import { Mockup, buildMockups } from './mockups';
import { buildBrandbookPdf } from './render/pdf';
import { log } from '../../logger';

export interface BuildInput {
  brandbookId: number;
  // Номер заказа печатается в выходных данных документа
  orderId: string;
  name: string;
  keywords: string;
  industry: string;
  style: string;
  logoUrl: string;
  slogan: string;
  // Запись купленного логотипа: из неё берутся палитра знака, шрифт надписи и
  // кадр модели, из которого заново выводится знак для блокировок
  logo: GeneratedLogo | null;
}

// Собранное к текущему моменту. Шаги дописывают сюда, следующие читают —
// поэтому порядок в BUILD_STEPS менять нельзя.
interface BuildContext extends BuildInput {
  colors: BrandColor[];
  fonts: BrandFont[];
  logoAssets: LogoAsset[];
  icons: any[];
  guidelines: BrandGuidelines | null;
  mockups: Mockup[];
}

// Шаг возвращает то, что нужно сразу положить в строку. Возврат undefined
// означает «шаг отработал, но писать нечего».
type StepRun = (ctx: BuildContext) => Promise<BrandbookPatch | undefined>;

const withTimeout = async <T>(promise: Promise<T>, ms: number, label: string): Promise<T> => {
  let timer: NodeJS.Timeout | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label}: превышено время ожидания`)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

const RUNNERS: Record<StepKey, StepRun> = {
  async palette(ctx) {
    ctx.colors = buildPalette({ logoPalette: ctx.logo?.palette ?? null, style: ctx.style });
    return { colorPalette: ctx.colors };
  },

  async typography(ctx) {
    ctx.fonts = buildTypography(ctx.style, ctx.logo?.lockupFont ?? null);
    return { fonts: ctx.fonts };
  },

  async logo(ctx) {
    ctx.logoAssets = await logoAssetService.buildLogoAssets({
      brandbookId: ctx.brandbookId,
      logo: ctx.logo,
      sourceLogoUrl: ctx.logoUrl,
      name: ctx.name,
      style: ctx.style,
      colors: ctx.colors,
    });

    if (!ctx.logoAssets.length) {
      throw new Error('не удалось собрать ни одной версии логотипа');
    }

    return { logoVariants: ctx.logoAssets };
  },

  // Слоган обычно уже выбран на шаге логотипа и приходит в заказе — тогда
  // модель не дёргаем вовсе
  async slogan(ctx) {
    if (ctx.slogan) return undefined;

    ctx.slogan = await sloganService.generateSlogan(
      ctx.name,
      ctx.keywords,
      'профессиональный и современный'
    );
    return { slogan: ctx.slogan };
  },

  // Ни одного сетевого запроса: набор иконок лежит в node_modules, паттерны
  // рисуются кодом из фирменных цветов
  async icons(ctx) {
    ctx.icons = [
      ...iconSetService.pickIcons(ctx.style, ctx.industry, ctx.keywords),
      ...buildPatterns(ctx.colors, ctx.orderId),
    ];
    return { icons: ctx.icons };
  },

  async guidelines(ctx) {
    ctx.guidelines = await guidelinesService.generateGuidelines({
      name: ctx.name,
      slogan: ctx.slogan,
      keywords: ctx.keywords,
      industry: ctx.industry,
      style: ctx.style,
      colors: ctx.colors,
      fonts: ctx.fonts,
    });
    return { guidelines: ctx.guidelines };
  },

  async mockups(ctx) {
    ctx.mockups = await buildMockups({
      brandbookId: ctx.brandbookId,
      name: ctx.name,
      slogan: ctx.slogan,
      industry: ctx.industry,
      keywords: ctx.keywords,
      colors: ctx.colors,
      fonts: ctx.fonts,
      logoAssets: ctx.logoAssets,
      icons: ctx.icons,
      guidelines: ctx.guidelines,
    });

    if (!ctx.mockups.length) throw new Error('не собрался ни один носитель');

    // Колонка называется applications с самого начала — переименовывать её
    // ради нового содержимого не стоит миграции
    return { applications: ctx.mockups };
  },

  async pdf(ctx) {
    const pdfUrl = await buildBrandbookPdf({
      brandbookId: ctx.brandbookId,
      orderId: ctx.orderId,
      name: ctx.name,
      slogan: ctx.slogan,
      keywords: ctx.keywords,
      industry: ctx.industry,
      style: ctx.style,
      colors: ctx.colors,
      fonts: ctx.fonts,
      logoAssets: ctx.logoAssets,
      guidelines: ctx.guidelines,
      icons: ctx.icons,
      mockups: ctx.mockups,
    });

    return { pdfUrl };
  },
};

const runStep = async (meta: StepMeta, ctx: BuildContext): Promise<void> => {
  await brandbooksRepo.startStep(ctx.brandbookId, meta.key, meta.label, progressBefore(meta.key));

  try {
    const patch = await withTimeout(RUNNERS[meta.key](ctx), meta.timeoutMs, meta.label);

    if (patch) await brandbooksRepo.patch(ctx.brandbookId, patch);
    await brandbooksRepo.finishStep(ctx.brandbookId, meta.key, patch ? 'done' : 'skipped');
  } catch (error: any) {
    const message = error?.message || 'неизвестная ошибка';
    log.error(`Брендбук ${ctx.brandbookId}, шаг «${meta.label}»:`, message);
    await brandbooksRepo.finishStep(ctx.brandbookId, meta.key, 'failed', message);

    if (meta.critical) throw error;
  }
};

// Сборка идёт строго последовательно: каждый шаг пишет результат в строку сразу,
// поэтому падение в середине оставляет частично собранный брендбук, а не пустоту.
export const buildBrandbook = async (input: BuildInput): Promise<void> => {
  const ctx: BuildContext = {
    ...input,
    colors: [],
    fonts: [],
    logoAssets: [],
    icons: [],
    guidelines: null,
    mockups: [],
  };

  try {
    for (const meta of BUILD_STEPS) {
      await runStep(meta, ctx);
    }
  } catch (error: any) {
    await brandbooksRepo.markFailed(input.brandbookId, error?.message || 'сборка сорвалась');
    throw error;
  }

  await brandbooksRepo.markCompleted(input.brandbookId);
};
