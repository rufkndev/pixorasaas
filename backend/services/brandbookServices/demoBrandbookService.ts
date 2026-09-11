import { sloganService } from './sloganService';
import { buildPalette } from './brand/paletteService';
import { LogoAsset, logoAssetService } from './brand/logoAssetService';

export interface DemoBrandbook {
  slogan: string;
  logoVariants: LogoAsset[];
}

export class DemoBrandbookService {
  // Предпросмотр до оплаты: слоган и версии логотипа, собранные из превью
  // с водяным знаком. Чистых файлов здесь не появляется.
  async generateDemoBrandbook(
    name: string,
    keywords: string,
    logoUrl: string,
    style = 'modern',
    existingSlogan?: string
  ): Promise<DemoBrandbook> {
    const slogan =
      existingSlogan || (await sloganService.generateSlogan(name, keywords, style));

    // Палитра нужна только для тёмной подложки под выворотку
    const colors = buildPalette({ logoPalette: null, style });

    return {
      slogan,
      logoVariants: await logoAssetService.previewVariants(logoUrl, colors),
    };
  }
}

export const demoBrandbookService = new DemoBrandbookService();
