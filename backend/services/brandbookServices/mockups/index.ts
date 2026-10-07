import { BrandColor, textOn } from '../brand/paletteService';
import { BrandFont } from '../brand/typographyService';
import { LogoAsset } from '../brand/logoAssetService';
import { BrandGuidelines } from '../content/guidelinesService';
import { boxOfWidth, loadArtwork, pickAsset, place } from '../layout/artwork';
import { assetName, newToken, saveAsset } from '../render/assets';
import { svgToPng, svgsToPdf } from '../render/rsvg';
import { MockupBuild, MockupContext, MockupInk } from './canvas';
import { businessCard } from './businessCard';
import { emailSignature } from './emailSignature';
import { presentation } from './presentation';
import { socialPost, socialStory, vkCover } from './social';
import { log } from '../../../logger';

export interface Mockup {
  id: string;
  name: string;
  description: string;
  usage: string;
  size: string;
  // Открытое превью для страницы брендбука
  previewUrl: string;
  // Закрытые файлы: уходят только в архив после проверки оплаты
  files: {
    svg?: string;
    svgBack?: string;
    png?: string;
    pngBack?: string;
    pdf?: string;
    html?: string;
  };
}

export interface MockupsInput {
  brandbookId: number;
  name: string;
  slogan: string;
  industry: string;
  keywords: string;
  colors: BrandColor[];
  fonts: BrandFont[];
  logoAssets: LogoAsset[];
  icons: any[];
  guidelines: BrandGuidelines | null;
}

const PREVIEW_WIDTH = 640;

const POINT_TEXT = 'Короткое описание в две-три строки. Замените на свой текст.';

const inkOf = (input: MockupsInput): MockupInk => {
  const get = (key: string, fallback: string) =>
    input.colors.find((color) => color.key === key)?.hex || fallback;

  const dark = get('dark', '#111827');
  const primary = get('primary', '#1f6feb');
  const heading = input.fonts.find((font) => font.role === 'heading');
  const body = input.fonts.find((font) => font.role === 'body');

  return {
    primary,
    secondary: get('secondary', '#0f172a'),
    accent: get('accent', '#f59e0b'),
    light: get('light', '#eef2f7'),
    neutral: get('neutral', '#b6bdc7'),
    dark,
    onDark: textOn(dark),
    onPrimary: textOn(primary),
    heading: {
      family: heading?.family || 'Inter',
      slug: heading?.slug || 'inter',
      files: heading?.files || [],
    },
    body: {
      family: body?.family || 'Golos Text',
      slug: body?.slug || 'golos-text',
      files: body?.files || [],
    },
  };
};

// Логотип для подписи письма: прозрачный PNG, потому что почтовые клиенты
// не показывают SVG вовсе
const signatureLogo = async (ctx: MockupContext): Promise<Buffer | null> => {
  const art = ctx.wideArt || ctx.primaryArt;
  if (!art) return null;

  const box = boxOfWidth(art, 0, 0, 300);

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ` +
    `width="300" height="${box.height.toFixed(0)}" viewBox="0 0 300 ${box.height.toFixed(0)}">` +
    `${place(art, box)}</svg>`;

  return svgToPng(svg, 600);
};

const buildContext = async (input: MockupsInput): Promise<MockupContext> => {
  const patterns: Record<string, string> = {};

  for (const item of input.icons || []) {
    if (item?.svg && item.category === 'pattern') patterns[item.id] = item.svg;
  }

  const iconItems = (input.icons || []).filter((item) => item?.svg && item.category === 'icon');
  const personality = input.guidelines?.personality || [];

  return {
    brandbookId: input.brandbookId,
    name: input.name,
    slogan: input.slogan,
    industry: input.industry || input.keywords,
    colors: input.colors,
    fonts: input.fonts,
    ink: inkOf(input),
    primaryArt: await loadArtwork(pickAsset(input.logoAssets, 'primary', 'stacked')),
    darkArt: await loadArtwork(pickAsset(input.logoAssets, 'mono-white', 'primary')),
    markArt: await loadArtwork(pickAsset(input.logoAssets, 'mark', 'primary')),
    wideArt: await loadArtwork(pickAsset(input.logoAssets, 'horizontal', 'primary', 'stacked')),
    patterns,
    points: [0, 1, 2].map((index) => ({
      title: personality[index] || `Пункт ${index + 1}`,
      text: POINT_TEXT,
      svg: iconItems[index]?.svg,
    })),
  };
};

const RECIPES = [businessCard, socialPost, socialStory, vkCover, presentation];

export const buildMockups = async (input: MockupsInput): Promise<Mockup[]> => {
  const ctx = await buildContext(input);
  const token = newToken();
  const mockups: Mockup[] = [];

  const store = (slot: string, ext: string, content: Buffer | string, paid = true) =>
    saveAsset(content, assetName({ brandbookId: input.brandbookId, token, slot, ext, paid }));

  for (const recipe of RECIPES) {
    try {
      const build: MockupBuild = recipe(ctx);
      const files: Mockup['files'] = {
        svg: store(`mockup-${build.id}`, 'svg', build.svg),
        png: store(`mockup-${build.id}`, 'png', await svgToPng(build.svg, build.previewWidth)),
      };

      if (build.back) {
        files.svgBack = store(`mockup-${build.id}-back`, 'svg', build.back);
        files.pngBack = store(
          `mockup-${build.id}-back`,
          'png',
          await svgToPng(build.back, build.previewWidth)
        );
      }

      // Печатный макет уходит ещё и PDF в физическом размере: типографии
      // нужен вектор с вылетами, а не картинка
      if (build.print) {
        const pages = build.back ? [build.svg, build.back] : [build.svg];
        files.pdf = store(`mockup-${build.id}`, 'pdf', await svgsToPdf(pages));
      }

      const previewUrl = saveAsset(
        await svgToPng(build.svg, PREVIEW_WIDTH),
        assetName({
          brandbookId: input.brandbookId,
          token,
          slot: `mockup-${build.id}-preview`,
          ext: 'png',
          paid: false,
        })
      );

      mockups.push({
        id: build.id,
        name: build.name,
        description: build.description,
        usage: build.usage,
        size: build.size,
        previewUrl,
        files,
      });
    } catch (error: any) {
      // Один сбойный макет не должен унести остальные
      log.error(`Макет не собрался:`, error.message);
    }
  }

  // Подпись письма — единственный носитель, который отдаётся не картинкой:
  // её вставляют в почтовый клиент как разметку
  try {
    const logo = await signatureLogo(ctx);

    if (logo) {
      const dataUri = `data:image/png;base64,${logo.toString('base64')}`;
      const html = emailSignature(ctx, dataUri);

      mockups.push({
        id: 'email-signature',
        name: 'Подпись письма',
        description: 'HTML с табличной вёрсткой и логотипом',
        usage: 'Вставьте в настройки подписи почтового клиента. Контакты — заглушки',
        size: '150 px по ширине логотипа',
        previewUrl: '',
        files: {
          html: store('mockup-email-signature', 'html', html),
          png: store('mockup-email-signature-logo', 'png', logo),
        },
      });
    }
  } catch (error: any) {
    log.error('Подпись письма не собралась:', error.message);
  }

  return mockups;
};
