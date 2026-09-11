import { Router } from 'express';
import { demoBrandbookService } from '../services/brandbookServices';
import { toProgress } from '../services/brandbookServices/progress';
import { brandbooksRepo } from '../db/repositories';
import { Brandbook } from '../db/types';
import { requireAuth } from '../auth/middleware';
import { BRAND_STYLES } from '../auth/schemas';

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

// Демо-брендбук для предпросмотра. Ничего не сохраняет.
router.post('/', requireAuth, async (req: any, res: any) => {
  try {
    const { name, keywords, logoUrl, brandStyle } = req.body;

    // Проверка обязательных параметров
    if (!name || !keywords || !logoUrl) {
      return res.status(400).json({ error: 'Missing required fields: name, keywords, logoUrl' });
    }

    // Стиль влияет на тон слогана, поэтому он тоже идёт в демо
    const style = BRAND_STYLES.includes(brandStyle) ? brandStyle : 'modern';

    const brandbook = await demoBrandbookService.generateDemoBrandbook(
      name,
      keywords,
      logoUrl,
      style
    );

    return res.status(200).json({
      success: true,
      brandbook,
      name,
      keywords,
      logoUrl,
    });
  } catch (error: any) {
    console.error('Error generating demo brandbook:', error);
    return res.status(500).json({
      error: 'Ошибка при генерации брендбука',
      message: error.message || 'Неизвестная ошибка',
    });
  }
});

// Полный брендбук собирается только выдачей оплаченного заказа
// (backend/routes/yookassaPayments.ts). Отдельного маршрута для этого нет
// намеренно: раньше он существовал, требовал лишь авторизации и не проверял
// оплату — брендбук можно было получить бесплатно, подставив любой orderId.

// Брендбук по номеру заказа
router.get('/brandbook/:orderId', requireAuth, async (req: any, res: any) => {
  try {
    const brandbook = await brandbooksRepo.findByOrderIdForUser(
      req.params.orderId,
      req.user.id
    );

    if (!brandbook) {
      return res.status(404).json({ error: 'Brandbook not found' });
    }

    return res.status(200).json({
      success: true,
      brandbook: toResponse(brandbook),
    });
  } catch (error: any) {
    console.error('Error fetching brandbook:', error.message);
    return res.status(500).json({
      error: 'Ошибка при получении брендбука',
      message: error.message || 'Неизвестная ошибка',
    });
  }
});

// :userId в пути оставлен для совместимости со старыми ссылками и игнорируется
router.get('/user-brandbooks/:userId', requireAuth, async (req: any, res: any) => {
  try {
    const brandbooks = await brandbooksRepo.listByUser(req.user.id);
    return res.status(200).json({ brandbooks: brandbooks.map(toResponse) });
  } catch (error: any) {
    console.error('Error fetching user brandbooks:', error.message);
    return res.status(500).json({ error: 'Failed to fetch brandbooks' });
  }
});

// Отдельного маршрута для вариаций логотипа больше нет: его никто не вызывал,
// а версии логотипа теперь собираются только внутри оплаченного брендбука.

export default router;
