import { iconService } from './iconService';
import { colorService, ColorPalette } from './colorService';
import { fontService, Font } from './fontService';
import { sloganService } from './sloganService';
import { logoVariantService, LogoVariant, BrandColors, BrandFont } from './logoVariantService';
import { demoBrandbookService } from './demoBrandbookService';
import { guidelinesService, BrandGuidelines } from './guidelinesService';
import { applicationsService, BrandApplications } from './applicationsService';

// Интерфейс для брендбука
export interface Brandbook {
  slogan: string;
  colors: ColorPalette[];
  fonts: Font[];
  icons: BrandElement[];
  logoVariants: LogoVariant[];
  guidelines?: BrandGuidelines;
  applications?: BrandApplications;
}

export interface BrandElement {
  id: string;
  name: string;
  svg: string;
  description: string;
  usage: string;
  category: 'icon' | 'frame' | 'pattern' | 'divider' | 'decoration' | 'background';
}

// Сервис для генерации брендбука
export class BrandbookService {
  // Генерация иконок и элементов на основе стиля
  async generateIcons(brandStyle: string, industry: string, keywords: string = ''): Promise<BrandElement[]> {
    try {
      const icons = await iconService.generateIcons(brandStyle, industry, keywords);
      
      // Преобразуем иконки в формат BrandElement
      const brandElements: BrandElement[] = icons.map(icon => ({
        id: icon.id,
        name: icon.name,
        svg: icon.svg,
        description: icon.description,
        usage: icon.usage,
        category: icon.category
      }));
      
      return brandElements;
      
    } catch (error) {
      // Возвращаем пустой массив в случае ошибки
      return [];
    }
  }

  // Генерация демо брендбука (только слоган и базовые вариации логотипа)
  async generateDemoBrandbook(name: string, keywords: string, logoUrl: string, existingSlogan?: string): Promise<Partial<Brandbook>> {
    const demoBrandbook = await demoBrandbookService.generateDemoBrandbook(name, keywords, logoUrl, existingSlogan);
    
    return {
      slogan: demoBrandbook.slogan,
      logoVariants: demoBrandbook.logoVariants
    };
  }

  // Генерация полного брендбука (все вариации логотипа)
  async generateBrandbook(name: string, keywords: string, logoUrl: string, brandStyle: string, industry: string, existingSlogan?: string): Promise<Partial<Brandbook>> {
    // Используем переданный слоган или генерируем новый
    const slogan = existingSlogan || await sloganService.generateSlogan(name, keywords, 'профессиональный и современный');
    
    // Генерируем цветовую палитру на основе ключевых слов
    const colors = await colorService.generateColorPalette(keywords);
    
    // Генерируем шрифты на основе ключевых слов
    const fonts = await fontService.generateFonts(keywords, logoUrl);
    
    // Подготавливаем фирменные цвета для вариаций логотипа
    const brandColors = {
      primary: colors[0]?.hex || '#2563eb',
      secondary: colors[1]?.hex || '#1d4ed8',
      accent: colors[2]?.hex || '#ffffff',
      neutral: colors[3]?.hex || '#f8fafc',
      background: '#ffffff',
      text: colors[0]?.hex || '#2563eb'
    };
    
    // Генерируем все вариации логотипа с фирменными цветами и шрифтами
    const logoVariants = await logoVariantService.generateLogoVariants(logoUrl, name, brandColors, fonts);
    
    // Генерируем иконки и элементы
    const icons = await this.generateIcons(brandStyle, industry, keywords);
    
    // Создаем временный объект брендбука для генерации рекомендаций и примеров
    const tempBrandbook = {
      businessName: name,
      slogan: slogan,
      colors: colors,
      fonts: fonts,
      icons: icons,
      logoVariants: logoVariants,
      originalLogoUrl: logoUrl,
      keywords: keywords
    };
    
    // Генерируем рекомендации по применению
    const guidelines = await guidelinesService.generateGuidelines(tempBrandbook, keywords);
    
    // Генерируем примеры применения
    const applications = await applicationsService.generateApplications(tempBrandbook);
    
    const brandbook: Partial<Brandbook> = {
      slogan: slogan,
      colors: colors,
      fonts: fonts,
      icons: icons,
      logoVariants: logoVariants,
      guidelines: guidelines,
      applications: applications
    };
    
    return brandbook;
  }
}

// Ленивая инициализация
let brandbookServiceInstance: BrandbookService | null = null;

export const getBrandbookService = (): BrandbookService => {
  if (!brandbookServiceInstance) {
    brandbookServiceInstance = new BrandbookService();
  }
  return brandbookServiceInstance;
};

// Экспорт для удобства использования
export const brandbookService = {
  generateSlogan: (name: string, keywords: string, style: string) => 
    sloganService.generateSlogan(name, keywords, style),
  generateColorPalette: (keywords: string) => 
    colorService.generateColorPalette(keywords),
  generateFonts: (keywords: string, logoUrl?: string) => 
    fontService.generateFonts(keywords, logoUrl),
  generateIcons: (brandStyle: string, industry: string, keywords: string = '') => 
    getBrandbookService().generateIcons(brandStyle, industry, keywords),
  generateDemoBrandbook: (name: string, keywords: string, logoUrl: string, existingSlogan?: string) => 
    getBrandbookService().generateDemoBrandbook(name, keywords, logoUrl, existingSlogan),
  generateBrandbook: (name: string, keywords: string, logoUrl: string, brandStyle: string, industry: string, existingSlogan?: string) => 
    getBrandbookService().generateBrandbook(name, keywords, logoUrl, brandStyle, industry, existingSlogan)
};
