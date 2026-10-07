import { Router } from 'express';
import { demoBrandbookService } from '../services/brandbookServices';
import { toProgress } from '../services/brandbookServices/progress';
import { brandbooksRepo, logosRepo } from '../db/repositories';
import { Brandbook } from '../db/types';
import { requireAuth } from '../auth/middleware';
import { demoBrandbookSchema, firstError, orderIdSchema } from '../auth/schemas';
import { log } from '../logger';

const router = Router();

// Форма брендбука для ответа. Отдаётся и недособранный: страница показывает
// ход сборки и то, что уже готово, а не «Брендбук не найден».
const toResponse = (brandbook: Brandbook) => ({
  id: brandbook.id,
  orderId: brandbook.orderId,
  businessName: brandbook.businessName,
  keywords: brandbook.keywords,
  slogan: brandbook.slogan,
  originalLogoUrl: brandbook.originalLogoUrl,
  logoVariants: brandbook.logoVariants,
  fonts: brandbook.fonts,
  colorPalette: brandbook.colorPalette,
  icons: brandbook.icons,
  guidelines: brandbook.guidelines,
  applications: brandbook.applications,
  status: brandbook.status,
  paymentStatus: brandbook.paymentStatus,
  isDemo: brandbook.isDemo,
  style: brandbook.style,
  industry: brandbook.industry,
  pdfUrl: brandbook.pdfUrl,
  assets: brandbook.assets,
  build: toProgress(brandbook),
  createdAt: brandbook.createdAt,
  updatedAt: brandbook.updatedAt,
  completedAt: brandbook.completedAt,
});

// Демо-брендбук для предпросмотра. Клиент присылает только id своего логотипа:
// URL от клиента позволял прочитать с диска чистый файл (см. previewVariants).
router.post('/', requireAuth, async (req: any, res: any) => {
  const parsed = demoBrandbookSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ error: firstError(parsed.error) });
  }

  try {
    const logo = await logosRepo.findByIdForUser(parsed.data.logoId, req.user.id);

    if (!logo) {
      return res.status(404).json({ error: 'Логотип не найден' });
    }

    const brandbook = await demoBrandbookService.generateDemoBrandbook(logo);

    return res.status(200).json({ success: true, brandbook });
  } catch (error: any) {
    log.error('Error generating demo brandbook:', error);
    return res.status(500).json({ error: 'Ошибка при генерации брендбука' });
  }
});

// Полный брендбук собирается только выдачей оплаченного заказа
// (backend/routes/yookassaPayments.ts). Отдельного маршрута для этого нет
// намеренно: раньше он существовал, требовал лишь авторизации и не проверял
// оплату — брендбук можно было получить бесплатно, подставив любой orderId.

// Брендбук по номеру заказа
router.get('/brandbook/:orderId', requireAuth, async (req: any, res: any) => {
  // Невалидный номер иначе доходил до Postgres и превращался в 500
  const orderId = orderIdSchema.safeParse(req.params.orderId);

  if (!orderId.success) {
    return res.status(404).json({ error: 'Brandbook not found' });
  }

  try {
    const brandbook = await brandbooksRepo.findByOrderIdForUser(orderId.data, req.user.id);

    if (!brandbook) {
      return res.status(404).json({ error: 'Brandbook not found' });
    }

    return res.status(200).json({
      success: true,
      brandbook: toResponse(brandbook),
    });
  } catch (error: any) {
    log.error('Error fetching brandbook:', error.message);
    return res.status(500).json({ error: 'Ошибка при получении брендбука' });
  }
});

// :userId в пути оставлен для совместимости со старыми ссылками и игнорируется
router.get('/user-brandbooks/:userId', requireAuth, async (req: any, res: any) => {
  try {
    const brandbooks = await brandbooksRepo.listByUser(req.user.id);
    return res.status(200).json({ brandbooks: brandbooks.map(toResponse) });
  } catch (error: any) {
    log.error('Error fetching user brandbooks:', error.message);
    return res.status(500).json({ error: 'Failed to fetch brandbooks' });
  }
});

// Отдельного маршрута для вариаций логотипа больше нет: его никто не вызывал,
// а версии логотипа теперь собираются только внутри оплаченного брендбука.

export default router;
