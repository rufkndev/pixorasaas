import { Router } from 'express';
import { nameService } from '../services/nameService';
import { namesRepo } from '../db/repositories';
import { isRefusal, reserveFreeGeneration } from '../services/freeGenerationGuard';
import { requireAuth } from '../auth/middleware';
import { generateNamesSchema, firstError } from '../auth/schemas';
import { log } from '../logger';

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

    // Попытка списывается до генерации, вместе с лимитом на адрес и бюджетом
    const pass = await reserveFreeGeneration(req, 'names');

    if (isRefusal(pass)) {
      return res.status(pass.status).json(pass.body);
    }

    const { remaining } = pass;

    try {
      // История нужна, чтобы повторный заход по той же нише не выдал то же самое.
      // Её недоступность не повод отказывать в генерации
      let history: string[] = [];
      try {
        history = await namesRepo.recentNamesForIndustry(userId, industry);
      } catch (historyError: any) {
        log.error('Не удалось прочитать историю названий:', historyError.message);
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
        log.error('No names were generated');
        await pass.release();
        return res.status(500).json({ error: 'Не удалось придумать названия. Попробуйте ещё раз.' });
      }

      await pass.commit();

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
        log.error('Не удалось сохранить названия:', dbError.message);
        return res.status(200).json({
          names: generatedNames,
          remaining,
          warning: 'Names were generated but could not be saved to database',
        });
      }
    } catch (apiError: any) {
      // Обработка ошибок при запросе к AI сервису
      log.error('AI service request error:', apiError.message);
      // Попытка не должна сгорать из-за сбоя на нашей стороне
      await pass.release();
      return res.status(500).json({ error: 'Не удалось придумать названия. Попробуйте ещё раз.' });
    }
  } catch (error: any) {
    // Общий обработчик ошибок для маршрута
    log.error('Error generating names:', error);
    return res.status(500).json({ error: 'Не удалось придумать названия. Попробуйте ещё раз.' });
  }
});

// :userId в пути оставлен для совместимости со старыми ссылками и игнорируется
router.get('/user-names/:userId', requireAuth, async (req: any, res: any) => {
  try {
    const history = await namesRepo.listByUser(req.user.id);
    return res.status(200).json({ history });
  } catch (error: any) {
    log.error('Error fetching generated names:', error.message);
    return res.status(500).json({ error: 'Failed to fetch generated names' });
  }
});

export default router;
