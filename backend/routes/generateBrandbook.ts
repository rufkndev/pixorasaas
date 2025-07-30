import { Router } from 'express';
import { brandbookService } from '../services/brandbookServices';
import { getSupabaseClient } from '../index';

const router = Router();

// Маршрут для генерации демо-брендбука (только для предпросмотра)
router.post('/', async (req: any, res: any) => {
  try {
    const { name, keywords, logoUrl, userId, brandStyle, industry } = req.body;

    // Проверка обязательных параметров
    if (!name || !keywords || !logoUrl) {
      return res.status(400).json({ error: 'Missing required fields: name, keywords, logoUrl' });
    }

    // Генерируем демо-брендбук (только слоган и базовые вариации логотипа)  
    const brandbook = await brandbookService.generateDemoBrandbook(name, keywords, logoUrl);

    return res.status(200).json({ 
      success: true,
      brandbook: brandbook,
      name: name,
      keywords: keywords,
      logoUrl: logoUrl
    });
    
  } catch (error: any) {
    console.error('Error generating demo brandbook:', error);
    return res.status(500).json({ 
      error: 'Ошибка при генерации брендбука',
      message: error.message || 'Неизвестная ошибка'
    });
  }
});

// Новый маршрут для создания полного брендбука после оплаты
router.post('/create-full-brandbook', async (req: any, res: any) => {
  try {
    const { orderId, name, keywords, logoUrl, slogan, userId, brandStyle, industry } = req.body;

    // Проверка обязательных параметров
    if (!orderId || !name || !keywords || !logoUrl) {
      return res.status(400).json({ 
        error: 'Missing required fields: orderId, name, keywords, logoUrl' 
      });
    }

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!brandStyle || !industry) {
      return res.status(400).json({ 
        error: 'Missing required fields: brandStyle, industry' 
      });
    };

    const supabase = getSupabaseClient();

    // Проверяем, не создан ли уже брендбук с таким orderId
    const { data: existingBrandbook, error: checkError } = await supabase
      .from('brandbooks')
      .select('id, order_id')
      .eq('order_id', orderId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = не найдено
      console.error('Error checking existing brandbook:', checkError);
      return res.status(500).json({ 
        error: 'Database error while checking existing brandbook' 
      });
    }

    if (existingBrandbook) {
      return res.status(409).json({ 
        error: 'Brandbook with this order ID already exists',
        brandbookId: existingBrandbook.id
      });
    }

    // Генерируем содержимое брендбука (используем переданный слоган или генерируем новый)
    const brandbook = await brandbookService.generateBrandbook(
      name, 
      keywords, 
      logoUrl, 
      brandStyle, 
      industry, 
      slogan
    );
    
    // Сохраняем в базу данных
    const { data: savedBrandbook, error: insertError } = await supabase
      .from('brandbooks')
      .insert({
        user_id: userId,
        order_id: orderId,
        business_name: name,
        keywords: keywords,
        slogan: slogan || brandbook.slogan || '',
        original_logo_url: logoUrl,
        logo_variants: brandbook.logoVariants || [],
        fonts: brandbook.fonts || [],
        color_palette: brandbook.colors || [],
        icons: brandbook.icons || [],
        guidelines: brandbook.guidelines || null,
        applications: brandbook.applications || null,
        status: 'processing',
        payment_status: 'completed',
        is_demo: false
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error saving brandbook:', insertError);
      return res.status(500).json({ 
        error: 'Failed to save brandbook to database',
        details: insertError.message
      });
    }

    // Обновляем статус на completed
    const { error: updateError } = await supabase
      .from('brandbooks')
      .update({ 
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', savedBrandbook.id);


    // Обновляем статус логотипа на купленный
    try {
      // Пытаемся найти и обновить логотип по основному URL
      const { data: logoUpdateData, error: logoUpdateError } = await supabase
        .from('generated_logos')
        .update({ 
          is_paid: true,
          order_id: orderId,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('logo_url', logoUrl)
        .select();

      // Если логотип не найден по основному URL, попробуем найти по original_logo_url
      if (logoUpdateError || !logoUpdateData || logoUpdateData.length === 0) {
        const { data: originalLogoUpdateData, error: originalLogoUpdateError } = await supabase
          .from('generated_logos')
          .update({ 
            is_paid: true,
            order_id: orderId,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)
          .eq('original_logo_url', logoUrl)
          .select();

          if (originalLogoUpdateError) {
            console.error('Error updating logo status by original URL:', originalLogoUpdateError);
          } else if (originalLogoUpdateData && originalLogoUpdateData.length > 0) {
        } else {
        }
      } else {
      }
    } catch (logoError) {
      console.error('Error updating logo status:', logoError);
    }

    return res.status(201).json({
      success: true,
      brandbook: {
        id: savedBrandbook.id,
        orderId: savedBrandbook.order_id,
        businessName: savedBrandbook.business_name,
        keywords: savedBrandbook.keywords,
        slogan: savedBrandbook.slogan,
        originalLogoUrl: savedBrandbook.original_logo_url,
        logoVariants: savedBrandbook.logo_variants,
        fonts: savedBrandbook.fonts,
        colorPalette: savedBrandbook.color_palette,
        icons: savedBrandbook.icons,
        guidelines: savedBrandbook.guidelines,
        applications: savedBrandbook.applications,
        status: savedBrandbook.status,
        createdAt: savedBrandbook.created_at
      }
    });
    
  } catch (error: any) {
    console.error('Error creating full brandbook:', error);
    return res.status(500).json({ 
      error: 'Ошибка при создании полного брендбука',
      message: error.message || 'Неизвестная ошибка'
    });
  }
});

// Маршрут для получения брендбука по ID заказа
router.get('/brandbook/:orderId', async (req: any, res: any) => {
  try {
    const { orderId } = req.params;
    const userId = req.query.userId; // Получаем из query параметров

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const supabase = getSupabaseClient();

    const { data: brandbook, error } = await supabase
      .from('brandbooks')
      .select('*')
      .eq('order_id', orderId)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Brandbook not found' });
      }
      console.error('Error fetching brandbook:', error);
      return res.status(500).json({ error: 'Database error' });
    }

    return res.status(200).json({
      success: true,
      brandbook: {
        id: brandbook.id,
        orderId: brandbook.order_id,
        businessName: brandbook.business_name,
        keywords: brandbook.keywords,
        slogan: brandbook.slogan,
        originalLogoUrl: brandbook.original_logo_url,
        logoVariants: brandbook.logo_variants,
        colorPalette: brandbook.color_palette,
        fonts: brandbook.fonts,
        icons: brandbook.icons,
        guidelines: brandbook.guidelines,
        applications: brandbook.applications,
        status: brandbook.status,
        paymentStatus: brandbook.payment_status,
        createdAt: brandbook.created_at,
        updatedAt: brandbook.updated_at,
        completedAt: brandbook.completed_at
      }
    });
    
  } catch (error: any) {
    console.error('Error fetching brandbook:', error);
    return res.status(500).json({ 
      error: 'Ошибка при получении брендбука',
      message: error.message || 'Неизвестная ошибка'
    });
  }
});

// Маршрут для получения всех брендбуков пользователя
router.get('/user-brandbooks/:userId', async (req: any, res: any) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('brandbooks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    return res.status(200).json({ brandbooks: data || [] });
  } catch (error: any) {
    console.error('Error fetching user brandbooks:', error);
    return res.status(200).json({ brandbooks: [], error: 'Something went wrong' });
  }
});

// Маршрут для генерации только вариаций логотипа
router.post('/generate-logo-variants', async (req: any, res: any) => {
  try {
    const { logoUrl, brandName, userId } = req.body;

    // Проверка обязательных параметров
    if (!logoUrl || !brandName) {
      return res.status(400).json({ error: 'Missing required fields: logoUrl, brandName' });
    }

    // Генерируем базовые вариации логотипа (для демо используем простые варианты)
    const { logoVariantService } = await import('../services/brandbookServices/logoVariantService');
    const logoVariants = await logoVariantService.generateBasicLogoVariants(logoUrl, brandName);
    
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
