import { BrandColor } from '../brand/paletteService';
import { BrandFont } from '../brand/typographyService';
import { LogoAsset } from '../brand/logoAssetService';
import { BrandGuidelines } from '../content/guidelinesService';
import { Mockup } from '../mockups';
import { Theme } from './theme';
import { log } from '../../../logger';

// Всё, что полосы читают. Собирается один раз в render/pdf.ts: полоса не
// ходит ни в базу, ни в сервисы — она только рисует переданное.
export interface BrandbookDoc {
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
  theme: Theme;
  // Дата выпуска документа в человеческом виде
  date: string;
}

export interface OutlineEntry {
  key: string;
  section: string;
  title: string;
  page: number;
}

export interface PageContext {
  number: number;
  total: number;
  // Состав документа целиком: нужен полосе содержания
  outline: OutlineEntry[];
}

export interface PageModule {
  key: string;
  // Название раздела в шапке полосы: «Логотип», «Цвет», «Типографика».
  // Несколько полос одного раздела идут подряд и группируются в содержании.
  section: string;
  // Заголовок полосы, он же строка содержания
  title: string;
  // Полоса без содержимого не должна попасть в документ пустой. Проверка идёт
  // до нумерации, иначе в содержании остались бы дыры.
  enabled?(doc: BrandbookDoc): boolean;
  render(doc: BrandbookDoc, ctx: PageContext): Promise<string>;
}

export interface RenderedPage {
  key: string;
  svg: string;
}

// Полоса, которая упала, просто выпадает из документа: пятнадцать полос — это
// пятнадцать поводов сорвать оплаченный заказ, если каждую считать критичной
export const renderPages = async (
  doc: BrandbookDoc,
  pages: PageModule[]
): Promise<RenderedPage[]> => {
  const selected = pages.filter((module) => !module.enabled || module.enabled(doc));

  const outline: OutlineEntry[] = selected.map((module, index) => ({
    key: module.key,
    section: module.section,
    title: module.title,
    page: index + 1,
  }));

  const rendered: RenderedPage[] = [];

  for (const [index, module] of selected.entries()) {
    try {
      const svg = await module.render(doc, {
        number: index + 1,
        total: selected.length,
        outline,
      });
      rendered.push({ key: module.key, svg });
    } catch (error: any) {
      log.error(`Полоса «${module.title}» не собралась:`, error.message);
    }
  }

  return rendered;
};

export const formatDate = (date: Date): string =>
  new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
