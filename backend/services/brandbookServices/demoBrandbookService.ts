import { GeneratedLogo } from '../../db/types';
import { logosRepo } from '../../db/repositories';
import { checkBudget, recordSpend } from '../freeGenerationGuard';
import { sloganService } from './sloganService';
import { buildPalette } from './brand/paletteService';
import { LogoAsset, logoAssetService } from './brand/logoAssetService';
import { log } from '../../logger';

export interface DemoBrandbook {
  slogan: string;
  logoVariants: LogoAsset[];
}

export class DemoBrandbookService {
  // Предпросмотр до оплаты: слоган и версии логотипа, собранные из превью
  // с водяным знаком. Считается один раз на логотип и дальше берётся из базы:
  // роут открыт любому пользователю, и без кэша каждый клик стоил бы вызова модели.
  async generateDemoBrandbook(logo: GeneratedLogo): Promise<DemoBrandbook> {
    if (logo.demoSlogan && Array.isArray(logo.demoVariants)) {
      return { slogan: logo.demoSlogan, logoVariants: logo.demoVariants as LogoAsset[] };
    }

    const style = logo.style || 'modern';
    // Бюджет бесплатного исчерпан — предпросмотр показывается без слогана, а не падает
    let slogan = '';
    if (await checkBudget('slogan')) {
      slogan = await sloganService.generateSlogan(logo.name || '', logo.keywords || '', style);
      if (slogan) await recordSpend('slogan');
    }

    // Палитра нужна только для тёмной подложки под выворотку
    const colors = buildPalette({ logoPalette: null, style });
    const logoVariants = await logoAssetService.previewVariants(logo, colors);

    // Пустой слоган — сбой модели, его не кэшируем: следующий заход попробует снова
    if (!slogan) return { slogan, logoVariants };

    try {
      await logosRepo.setDemo(logo.id, { slogan, variants: logoVariants });
    } catch (error: any) {
      log.error('Не удалось сохранить предпросмотр брендбука:', error.message);
    }

    return { slogan, logoVariants };
  }
}

export const demoBrandbookService = new DemoBrandbookService();
