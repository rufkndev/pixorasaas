import { Router } from 'express';
import { brandbookService } from '../services/brandbookService';
import { getSupabaseClient } from '../index';

const router = Router();

// Маршрут для генерации брендбука
router.post('/generate-brandbook', async (req: any, res: any) => {
  try {
    const { name, keywords, logoUrl, userId } = req.body;

    // Проверка обязательных параметров
    if (!name || !keywords || !logoUrl) {
      return res.status(400).json({ error: 'Missing required fields: name, keywords, logoUrl' });
    }

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!process.env.GENAPI_KEY) {
      return res.status(500).json({ error: 'Server configuration error: GenAPI key is missing' });
    }

    console.log('Starting brandbook generation for:', { name, keywords, userId });

    // Генерируем брендбук
    const brandbook = await brandbookService.generateBrandbook(name, keywords, logoUrl);
    
    console.log('Generated brandbook:', brandbook);

    // Сохранение в базу данных (опционально)
    try {
      const supabase = getSupabaseClient();
      
      const { data: brandbookData, error: insertError } = await supabase
        .from('generated_brandbooks')
        .insert({
          user_id: userId,
          name: name,
          keywords: keywords,
          logo_url: logoUrl,
          slogan: brandbook.slogan || '',
          brandbook_data: brandbook,
        })
        .select()
        .single();
        
      if (insertError) {
        console.error('Error saving brandbook:', insertError);
        // Продолжаем выполнение, даже если не удалось сохранить
      }
    } catch (dbError) {
      console.error('Database error:', dbError);
      // Продолжаем выполнение, даже если есть ошибка БД
    }

    return res.status(200).json({ 
      success: true,
      brandbook: brandbook,
      name: name,
      keywords: keywords,
      logoUrl: logoUrl
    });
    
  } catch (error: any) {
    console.error('Error generating brandbook:', error);
    return res.status(500).json({ 
      error: 'Ошибка при генерации брендбука',
      message: error.message || 'Неизвестная ошибка'
    });
  }
});

// Новый маршрут для генерации только вариаций логотипа
router.post('/generate-logo-variants', async (req: any, res: any) => {
  try {
    const { logoUrl, brandName, userId } = req.body;

    // Проверка обязательных параметров
    if (!logoUrl || !brandName) {
      return res.status(400).json({ error: 'Missing required fields: logoUrl, brandName' });
    }

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    console.log('Starting logo variants generation for:', { brandName, logoUrl });

    // Генерируем вариации логотипа
    const logoVariants = await brandbookService.generateLogoVariants(logoUrl, brandName);
    
    console.log('Generated logo variants:', logoVariants);

    return res.status(200).json({ 
      success: true,
      logoVariants: logoVariants,
      brandName: brandName,
      originalLogoUrl: logoUrl
    });
    
  } catch (error: any) {
    console.error('Error generating logo variants:', error);
    return res.status(500).json({ 
      error: 'Ошибка при генерации вариаций логотипа',
      message: error.message || 'Неизвестная ошибка'
    });
  }
});

export default router;
