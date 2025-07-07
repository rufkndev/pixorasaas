import { Router } from 'express';
import { logoService } from '../services/logoService';
import { getSupabaseClient } from '../index';

const router = Router();

// Маршрут для генерации логотипа
router.post('/generate-logo', async (req: any, res: any) => {
  try {
    const { name, keywords, userId, selectedName, industry } = req.body;

    // Логирование для диагностики
    console.log('Generate logo request body:', req.body);
    
    // Валидация обязательных полей
    if (!name && !selectedName) {
      return res.status(400).json({ 
        error: 'Name is required',
        message: 'Business name is required for logo generation'
      });
    }
    
    if (!keywords) {
      return res.status(400).json({ 
        error: 'Keywords are required',
        message: 'Keywords are required for logo generation'
      });
    }
    
    if (!userId) {
      return res.status(400).json({ 
        error: 'User ID is required',
        message: 'User authentication is required'
      });
    }

    const businessName = selectedName || name;
    const logoIndustry = industry || 'general';

    // Проверка лимита генераций
    try {
      const supabase = getSupabaseClient();
      const { data: userStats } = await supabase
        .from('user_logo_stats')
        .select('remaining_generations')
        .eq('user_id', userId)
        .single();
        
      const remainingGenerations = userStats ? userStats.remaining_generations : 10;
      
      if (remainingGenerations <= 0) {
        return res.status(403).json({ 
          error: 'Generation limit exceeded', 
          message: 'You have used all your free logo generations. Please purchase a plan to continue.'
        });
      }
    } catch (statsError) {
      console.error('Error checking user stats:', statsError);
    }

    // Генерация логотипа
    console.log('Generating logo with:', { businessName, keywords, logoIndustry });
    const logoUrl = await logoService.generateLogo(businessName, keywords, logoIndustry);

    // Сохранение в базу данных
    try {
      const supabase = getSupabaseClient();
      
      const { data: logoData, error: insertError } = await supabase
        .from('generated_logos')
        .insert({
          user_id: userId,
          name: selectedName,
          keywords: keywords,
          logo_url: logoUrl,
          industry: logoIndustry,
        })
        .select()
        .single();
        
      if (insertError) {
        console.error('Error saving logo:', insertError);
        return res.status(200).json({ 
          success: true,
          logoUrl: logoUrl,
          name: businessName,
          keywords: keywords,
          industry: logoIndustry,
          warning: 'Logo generated but could not be saved to database'
        });
      }
      
      return res.status(200).json({ 
        success: true,
        logoId: logoData.id,
        logoUrl: logoUrl,
        name: businessName,
        keywords: keywords,
        industry: logoIndustry
      });
    } catch (dbError) {
      console.error('Database error:', dbError);
      return res.status(200).json({ 
        success: true,
        logoUrl: logoUrl,
        name: businessName,
        keywords: keywords,
        industry: logoIndustry,
        warning: 'Logo generated but could not be saved to database'
      });
    }
  } catch (error: any) {
    console.error('Error generating logo:', error);
    
    // Более подробное логирование ошибок
    if (error.response) {
      console.error('API Error Response:', error.response.data);
      console.error('API Error Status:', error.response.status);
    }
    
    return res.status(500).json({ 
      error: 'Something went wrong',
      message: error.message,
      details: error.response?.data || null
    });
  }
});

// Маршрут для получения логотипов пользователя
router.get('/user-logos/:userId', async (req: any, res: any) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('generated_logos')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error('Error fetching logos:', error);
      return res.status(200).json({ logos: [] });
    }
    
    return res.status(200).json({ logos: data || [] });
  } catch (error: any) {
    console.error('Error fetching user logos:', error);
    return res.status(200).json({ logos: [], error: 'Something went wrong' });
  }
});

export default router; 