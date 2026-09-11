import { BrandColor } from '../brand/paletteService';
import { BrandFont } from '../brand/typographyService';
import { LogoAsset } from '../brand/logoAssetService';
import { BrandGuidelines } from '../content/guidelinesService';
import { Mockup } from '../mockups';
import { BrandbookDoc, formatDate, renderPages } from '../layout/document';
import { PAGES } from '../layout/pages';
import { buildTheme } from '../layout/theme';
import { assetName, newToken, saveAsset } from './assets';
import { svgsToPdf } from './rsvg';

export interface PdfInput {
  brandbookId: number;
  orderId: string;
  name: string;
  slogan: string;
  keywords: string;
  industry: string;
  style: string;
  colors: BrandColor[];
  fonts: BrandFont[];
  logoAssets: LogoAsset[];
  guidelines: BrandGuidelines | null;
  icons: any[];
  mockups: Mockup[];
}

// PDF — платный артефакт, поэтому в имени есть подстрока -source и заглушка
// перед express.static его не отдаёт. Наружу он уходит только через роут
// скачивания, после проверки оплаты.
export const buildBrandbookPdf = async (input: PdfInput): Promise<string> => {
  const doc: BrandbookDoc = {
    ...input,
    theme: buildTheme(input.colors, input.fonts),
    date: formatDate(new Date()),
  };

  const pages = await renderPages(doc, PAGES);

  if (!pages.length) {
    throw new Error('ни одна полоса не собралась');
  }

  const pdf = await svgsToPdf(pages.map((page) => page.svg));

  return saveAsset(
    pdf,
    assetName({
      brandbookId: input.brandbookId,
      token: newToken(),
      slot: 'brandbook',
      ext: 'pdf',
      paid: true,
    })
  );
};
