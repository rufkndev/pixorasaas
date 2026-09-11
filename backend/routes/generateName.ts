import { Router } from 'express';
import { nameService } from '../services/nameService';
import { generationUsageRepo, namesRepo } from '../db/repositories';
import { requireAuth } from '../auth/middleware';
import { generateNamesSchema, firstError } from '../auth/schemas';

const router = Router();

// Маршрут для генерации названий компаний
router.post('/generate-names', requireAuth, async (req: any, res: any) => {
  try {
    const parsed = generateNamesSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: firstError(parsed.error) });
    }

    const { industry, keywords, style, preferences, language, exclude } = parsed.data;
    // Пользователь из сессии, а не из тела запроса
    const userId = req.user.id;

    // Списываем попытку до генерации: проверка и списание в одном запросе,
    // иначе параллельные запросы пролезли бы сверх лимита
    const remaining = await generationUsageRepo.consume(userId, 'names');

    if (remaining === null) {
      return res.status(403).json({
        error: 'Бесплатные генерации названий закончились. Они обновятся автоматически, а оплата логотипа или брендбука возвращает их сразу.',
        code: 'GENERATION_LIMIT',
        remaining: 0,
      });
    }

    try {
      // История нужна, чтобы повторный заход по той же нише не выдал то же самое.
      // Её недоступность не повод отказывать в генерации
      let history: string[] = [];
      try {
        history = await namesRepo.recentNamesForIndustry(userId, industry);
      } catch (historyError: any) {
        console.error('Не удалось прочитать историю названий:', historyError.message);
      }

      const generatedNames = await nameService.generateNames({
        industry,
        keywords,
        style,
        preferences,
        language,
        exclude: [...exclude, ...history],
      });

      // Проверяем, что хотя бы одно название было сгенерировано
      if (generatedNames.length === 0) {
        console.error('No names were generated');
        await generationUsageRepo.release(userId, 'names');
        return res.status(500).json({ error: 'No names were generated' });
      }

      // Сбой записи не должен лишать уже сгенерированных названий
      try {
        await namesRepo.create({
          userId,
          industry,
          keywords,
          style,
          preferences,
          names: generatedNames,
        });

        return res.status(200).json({ names: generatedNames, remaining });
      } catch (dbError: any) {
        console.error('Не удалось сохранить названия:', dbError.message);
        return res.status(200).json({
          names: generatedNames,
          remaining,
          warning: 'Names were generated but could not be saved to database',
        });
      }
    } catch (apiError: any) {
      // Обработка ошибок при запросе к AI сервису
      console.error('AI service request error:', apiError.message);
      // Попытка не должна сгорать из-за сбоя на нашей стороне
      await generationUsageRepo.release(userId, 'names');
      return res.status(500).json({
        error: 'Failed to generate names',
        message: apiError.message,
      });
    }
  } catch (error: any) {
    // Общий обработчик ошибок для маршрута
    console.error('Error generating names:', error);
    return res.status(500).json({
      error: 'Something went wrong',
      message: error.message,
    });
  }
});

// :userId в пути оставлен для совместимости со старыми ссылками и игнорируется
router.get('/user-names/:userId', requireAuth, async (req: any, res: any) => {
  try {
    const history = await namesRepo.listByUser(req.user.id);
    return res.status(200).json({ history });
  } catch (error: any) {
    console.error('Error fetching generated names:', error.message);
    return res.status(500).json({ error: 'Failed to fetch generated names' });
  }
});

export default router;
