import { sloganService } from './sloganService';
import { logoVariantService, LogoVariant } from './logoVariantService';

export interface DemoBrandbook {
  slogan: string;
  logoVariants: LogoVariant[];
}

// Сервис для генерации демо-брендбука
export class DemoBrandbookService {
  // Генерация демо брендбука (только слоган и базовые вариации логотипа)
  async generateDemoBrandbook(name: string, keywords: string, logoUrl: string, existingSlogan?: string): Promise<DemoBrandbook> {
    // Используем переданный слоган или генерируем новый
    const slogan = existingSlogan || await sloganService.generateSlogan(name, keywords, 'профессиональный и современный');
    
    // Для демо создаем только базовые вариации (без аббревиатуры и с текстом)
    const logoVariants = await logoVariantService.generateBasicLogoVariants(logoUrl, name);
    
    const brandbook: DemoBrandbook = {
      slogan: slogan,
      logoVariants: logoVariants
    };

    return brandbook;
  }
}

// Экспорт экземпляра для переиспользования
export const demoBrandbookService = new DemoBrandbookService(); 