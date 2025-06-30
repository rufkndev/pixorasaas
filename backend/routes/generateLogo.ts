import { Router } from 'express';
import { aiService } from '../services/aiService';
import { getSupabaseClient } from '../index';

const router = Router();

// Маршрут для генерации логотипа
router.post('/generate-logo', async (req: any, res: any) => {
  try {
    const { name, keywords, userId, selectedName } = req.body;

    // Проверка обязательных параметров
    if (!name || !keywords) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!process.env.GENAPI_KEY) {
      return res.status(500).json({ error: 'Server configuration error: GenAPI key is missing' });
    }

    const businessName = selectedName || name;

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
    const logoUrl = await aiService.generateLogo(businessName, keywords);

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
        })
        .select()
        .single();
        
      if (insertError) {
        console.error('Error saving logo:', insertError);
        return res.status(200).json({ 
          success: true,
          logoUrl: logoUrl,
          name: businessName,
          warning: 'Logo generated but could not be saved to database'
        });
      }
      
      return res.status(200).json({ 
        success: true,
        logoId: logoData.id,
        logoUrl: logoUrl,
        name: businessName,
        keywords: keywords
      });
    } catch (dbError) {
      console.error('Database error:', dbError);
      return res.status(200).json({ 
        success: true,
        logoUrl: logoUrl,
        name: businessName,
        warning: 'Logo generated but could not be saved to database'
      });
    }
  } catch (error: any) {
    console.error('Error generating logo:', error);
    return res.status(500).json({ 
      error: 'Something went wrong',
      message: error.message
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