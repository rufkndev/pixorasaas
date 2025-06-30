import { Router } from 'express';
import { aiService } from '../services/aiService';
import { getSupabaseClient } from '../index';

const router = Router();

// Маршрут для генерации названий компаний
router.post('/generate-names', async (req: any, res: any) => {
  try {
    console.log('Received request for name generation:', req.body);
    
    const { industry, keywords, style, preferences, userId } = req.body;

    console.log('Generating names using AI service...');

    try {
      // Генерируем названия через AI сервис
      const generatedNames = await aiService.generateNames(industry, keywords, style, preferences);
      
      console.log('Generated names:', generatedNames);

      // Проверяем, что хотя бы одно название было сгенерировано
      if (generatedNames.length === 0) {
        console.error('No names were generated');
        return res.status(500).json({ error: 'No names were generated' });
      }

      // Сохраняем сгенерированные названия в Supabase
      try {
        const supabase = getSupabaseClient();
        
        // Проверяем, что userId передан
        if (!userId) {
          console.error('UserId is missing');
          return res.status(200).json({ 
            names: generatedNames,
            warning: 'Names were generated but could not be saved: user not authenticated'
          });
        }
        
        console.log('Attempting to save to database with userId:', userId);
        
        // Прямая вставка в таблицу
        const { data: insertData, error: insertError } = await supabase
          .from('generated_names')
          .insert({
            user_id: userId,
            industry,
            keywords,
            style,
            preferences: preferences || '',
            names: generatedNames,
            created_at: new Date().toISOString()
          });
          
        if (insertError) {
          console.error('Error inserting to database:', insertError);
          console.error('Error details:', JSON.stringify(insertError, null, 2));
          
          // Проверяем, используется ли Service Role Key
          const isServiceRole = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
          console.log('Using Service Role Key:', isServiceRole);
          
          // Если не используется Service Role Key, то проблема в RLS политиках
          if (!isServiceRole) {
            console.error('Service Role Key is not configured. Database operations may fail due to RLS policies.');
          }
          
          // Возвращаем названия с предупреждением
          return res.status(200).json({ 
            names: generatedNames,
            warning: 'Names were generated but could not be saved to database. Please check server configuration.'
          });
        }

        console.log('Successfully saved to database:', insertData);
        // Если все прошло успешно, возвращаем сгенерированные названия
        return res.status(200).json({ names: generatedNames });
      } catch (supabaseError) {
        console.error('Supabase connection error:', supabaseError);
        // Даже если сохранение не удалось, возвращаем сгенерированные названия
        return res.status(200).json({ 
          names: generatedNames,
          warning: 'Names were generated but could not be saved to database due to connection error'
        });
      }
    } catch (apiError: any) {
      // Обработка ошибок при запросе к AI сервису
      console.error('AI service request error:', apiError.message);
      return res.status(500).json({ 
        error: 'Failed to generate names',
        message: apiError.message
      });
    }
  } catch (error: any) {
    // Общий обработчик ошибок для маршрута
    console.error('Error generating names:', error);
    return res.status(500).json({ 
      error: 'Something went wrong',
      message: error.message
    });
  }
});

// Маршрут для получения истории сгенерированных названий для конкретного пользователя
router.get('/user-names/:userId', async (req: any, res: any) => {
  try {
    const { userId } = req.params;
    console.log(`Received request for user names with userId: ${userId}`);

    // Проверяем наличие userId
    if (!userId) {
      console.log('User ID is missing in request');
      return res.status(400).json({ error: 'User ID is required' });
    }

    const supabase = getSupabaseClient();
    
    // Прямой запрос к таблице
    console.log(`Querying generated_names table for userId: ${userId}`);
    const { data: selectData, error: selectError } = await supabase
      .from('generated_names')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
      
    // Обрабатываем ошибку
    if (selectError) {
      console.error('Error fetching user names:', selectError);
      console.error('Error details:', JSON.stringify(selectError, null, 2));
      
      // Проверяем, используется ли Service Role Key
      const isServiceRole = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
      console.log('Using Service Role Key:', isServiceRole);
      
      if (!isServiceRole) {
        console.error('Service Role Key is not configured. Database queries may fail due to RLS policies.');
      }
      
      return res.status(500).json({ error: 'Failed to fetch generated names' });
    }
    
    // Возвращаем результаты
    console.log(`Successfully retrieved ${selectData?.length || 0} records`);
    return res.status(200).json({ history: selectData || [] });
  } catch (error: any) {
    // Обработка общих ошибок
    console.error('Error fetching user names:', error);
    return res.status(500).json({ error: 'Something went wrong' });
  }
});

export default router; 