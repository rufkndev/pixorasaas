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
      console.log('Generating icons with params:', { brandStyle, industry, keywords });
      const icons = await iconService.generateIcons(brandStyle, industry, keywords);
      
      if (!icons || !Array.isArray(icons)) {
        console.warn('iconService.generateIcons returned invalid data:', icons);
        return [];
      }
      
      // Преобразуем иконки в формат BrandElement
      const brandElements: BrandElement[] = icons.map(icon => ({
        id: icon.id || `icon-${Date.now()}-${Math.random()}`,
        name: icon.name || 'Без названия',
        svg: icon.svg || '',
        description: icon.description || 'Описание отсутствует',
        usage: icon.usage || 'Общее применение',
        category: icon.category || 'icon'
      }));
      
      console.log(`Successfully generated ${brandElements.length} brand elements`);
      return brandElements;
      
    } catch (error: any) {
      console.error('Error generating icons:', error);
      console.error('Icon generation error details:', {
        message: error.message,
        brandStyle,
        industry,
        keywords
      });
      
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
    console.log('Starting brandbook generation:', { name, keywords, logoUrl, brandStyle, industry, existingSlogan });
    
    try {
      // Используем переданный слоган или генерируем новый
      console.log('Generating slogan...');
      const slogan = existingSlogan || await sloganService.generateSlogan(name, keywords, 'профессиональный и современный');
      console.log('Slogan generated:', slogan);
      
      // Генерируем цветовую палитру на основе ключевых слов
      console.log('Generating color palette...');
      const colors = await colorService.generateColorPalette(keywords);
      console.log('Colors generated:', colors?.length || 0, 'colors');
      
      // Генерируем шрифты на основе ключевых слов
      console.log('Generating fonts...');
      const fonts = await fontService.generateFonts(keywords, logoUrl);
      console.log('Fonts generated:', fonts?.length || 0, 'fonts');
      
      // Подготавливаем фирменные цвета для вариаций логотипа
      const brandColors = {
        primary: colors[0]?.hex || '#2563eb',
        secondary: colors[1]?.hex || '#1d4ed8',
        accent: colors[2]?.hex || '#ffffff',
        neutral: colors[3]?.hex || '#f8fafc',
        background: '#ffffff',
        text: colors[0]?.hex || '#2563eb'
      };
      console.log('Brand colors prepared:', brandColors);
      
      // Генерируем все вариации логотипа с фирменными цветами и шрифтами
      console.log('Generating logo variants...');
      const logoVariants = await logoVariantService.generateLogoVariants(logoUrl, name, brandColors, fonts);
      console.log('Logo variants generated:', logoVariants?.length || 0, 'variants');
      
      // Генерируем иконки и элементы
      console.log('Generating icons...');
      const icons = await this.generateIcons(brandStyle, industry, keywords);
      console.log('Icons generated:', icons?.length || 0, 'icons');
      
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
      console.log('Generating guidelines...');
      const guidelines = await guidelinesService.generateGuidelines(tempBrandbook, keywords);
      console.log('Guidelines generated');
      
      // Генерируем примеры применения
      console.log('Generating applications...');
      const applications = await applicationsService.generateApplications(tempBrandbook);
      console.log('Applications generated');
      
      const brandbook: Partial<Brandbook> = {
        slogan: slogan,
        colors: colors,
        fonts: fonts,
        icons: icons,
        logoVariants: logoVariants,
        guidelines: guidelines,
        applications: applications
      };
      
      console.log('Brandbook generation completed successfully');
      return brandbook;
      
    } catch (error: any) {
      console.error('Error in brandbook generation:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name,
        keywords,
        logoUrl,
        brandStyle,
        industry
      });
      
      // Возвращаем минимальный брендбук с базовыми данными в случае ошибки
      const fallbackBrandbook: Partial<Brandbook> = {
        slogan: existingSlogan || `${name} - Ваш надежный партнер`,
        colors: [{
          name: 'Primary',
          hex: '#2563eb',
          rgb: { r: 37, g: 99, b: 235 },
          usage: 'Основной цвет бренда'
        }],
        fonts: [{
          name: 'Inter',
          category: 'sans-serif',
          usage: 'Основной шрифт',
          weights: ['400', '500', '600', '700'],
          fallback: 'Arial, sans-serif'
        }],
        icons: [],
        logoVariants: [],
        guidelines: null,
        applications: null
      };
      
      console.log('Returning fallback brandbook due to error');
      return fallbackBrandbook;
    }
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
