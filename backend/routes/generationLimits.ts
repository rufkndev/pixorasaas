import { Router } from 'express';
import { FREE_GENERATIONS, QUOTA_WINDOW_DAYS, generationUsageRepo } from '../db/repositories';
import { requireAuth } from '../auth/middleware';

const router = Router();

// Остаток бесплатных генераций для кабинета и форм генерации
router.get('/generation-limits', requireAuth, async (req: any, res: any) => {
  try {
    const usage = await generationUsageRepo.getUsage(req.user.id);

    return res.status(200).json({
      limit: FREE_GENERATIONS,
      windowDays: QUOTA_WINDOW_DAYS,
      names: Math.max(FREE_GENERATIONS - usage.namesUsed, 0),
      logos: Math.max(FREE_GENERATIONS - usage.logosUsed, 0),
      // Когда счётчики обнулятся сами. null — окно ещё не начиналось
      renewsAt: usage.renewsAt,
    });
  } catch (error: any) {
    console.error('Не удалось прочитать лимиты генераций:', error.message);
    return res.status(500).json({ error: 'Не удалось получить лимиты' });
  }
});

export default router;
