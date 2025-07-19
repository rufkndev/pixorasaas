import { Router } from 'express';
import { nameService } from '../services/nameService';
import { getSupabaseClient } from '../index';

const router = Router();

// Маршрут для генерации названий компаний
router.post('/generate-names', async (req: any, res: any) => {
  try {
    
    const { industry, keywords, style, preferences, userId } = req.body;

    try {
      // Генерируем названия через AI сервис
      const generatedNames = await nameService.generateNames(industry, keywords, style, preferences);

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
          console.error('Error details:', JSON.stringify(insertError, null, 2));
        }

        // Если все прошло успешно, возвращаем сгенерированные названия
        return res.status(200).json({ names: generatedNames });
      } catch (supabaseError) {
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

    const supabase = getSupabaseClient();
    
    // Прямой запрос к таблице
    const { data: selectData, error: selectError } = await supabase
      .from('generated_names')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
      
    // Обрабатываем ошибку
    if (selectError) {
      return res.status(500).json({ error: 'Failed to fetch generated names' });
    }
    
    // Возвращаем результаты
    return res.status(200).json({ history: selectData || [] });
  } catch (error: any) {
    // Обработка общих ошибок
    return res.status(500).json({ error: 'Something went wrong' });
  }
});

export default router; 