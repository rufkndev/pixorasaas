import { Router } from 'express';

import { brandbooksRepo } from '../db/repositories';
import { requireAuth } from '../auth/middleware';
import { streamBrandbookArchive } from '../services/brandbookServices/archive';

const router = Router();

// Один архив вместо трёх кнопок. Прежние роуты отдавали вариации логотипа,
// иконки и макеты по отдельности, причём макеты — как HTML в <foreignObject>,
// который не открывается ни в одном редакторе.
router.get('/download-brandbook/:orderId', requireAuth, async (req, res) => {
  try {
    const brandbook = await brandbooksRepo.findByOrderIdForUser(req.params.orderId, req.user!.id);

    if (!brandbook) {
      return res.status(404).json({ error: 'Брендбук не найден' });
    }

    if (brandbook.paymentStatus !== 'completed') {
      return res.status(403).json({
        error: 'Требуется оплата',
        message: 'Архив доступен после оплаты заказа',
      });
    }

    // Недособранный заказ — это не ошибка, а «ещё рано»: страница показывает
    // ход сборки и повторит запрос сама
    if (brandbook.status !== 'completed') {
      return res.status(409).json({
        error: 'Брендбук ещё собирается',
        message: 'Архив будет готов, когда сборка закончится',
      });
    }

    return streamBrandbookArchive(res, brandbook);
  } catch (error: any) {
    console.error('Не удалось отдать архив брендбука:', error.message);
    return res.status(500).json({ error: 'Не удалось собрать архив' });
  }
});

export default router;
