import { Router } from 'express';
import { logoService } from '../services/logoService';
import { generationUsageRepo, logosRepo } from '../db/repositories';
import { requireAuth } from '../auth/middleware';
import { generateLogoSchema, firstError } from '../auth/schemas';

const router = Router();

// Маршрут для генерации логотипа
router.post('/generate-logo', requireAuth, async (req: any, res: any) => {
  try {
    // Старый клиент шлёт название в selectedName, новый — в name
    const parsed = generateLogoSchema.safeParse({
      ...req.body,
      name: req.body?.name || req.body?.selectedName,
    });

    if (!parsed.success) {
      return res.status(400).json({ error: firstError(parsed.error) });
    }

    const { name: businessName, keywords, style, exclude } = parsed.data;
    const logoIndustry = parsed.data.industry || 'general';
    const userId = req.user.id;

    // Списываем попытку до генерации: проверка и списание в одном запросе,
    // иначе параллельные запросы пролезли бы сверх лимита
    const remaining = await generationUsageRepo.consume(userId, 'logos');

    if (remaining === null) {
      return res.status(403).json({
        error: 'Бесплатные генерации логотипов закончились. Они обновятся автоматически, а оплата логотипа или брендбука возвращает их сразу.',
        code: 'GENERATION_LIMIT',
        remaining: 0,
      });
    }

    // История нужна, чтобы повторная генерация не выдала тот же знак.
    // Её недоступность не повод отказывать в генерации
    let history = { patterns: [] as string[], subjects: [] as string[] };
    try {
      history = await logosRepo.recentConcepts(userId, businessName);
    } catch (historyError: any) {
      console.error('Не удалось прочитать историю логотипов:', historyError.message);
    }

    // Генерация логотипа. Наружу уходит только превью с водяным знаком —
    // чистый файл выдаёт /api/download-logo после проверки оплаты
    let stored: Awaited<ReturnType<typeof logoService.generateLogo>>;
    try {
      stored = await logoService.generateLogo(
        businessName,
        keywords,
        logoIndustry,
        style,
        history.patterns,
        [...exclude, ...history.subjects]
      );
    } catch (generationError: any) {
      // Попытка не должна сгорать из-за сбоя на нашей стороне
      await generationUsageRepo.release(userId, 'logos');
      throw generationError;
    }

    // Логотип уже сгенерирован — сбой записи не повод возвращать ошибку
    try {
      const logo = await logosRepo.create({
        userId,
        name: businessName,
        keywords,
        logoUrl: stored.previewUrl,
        originalLogoUrl: stored.sourceUrl,
        industry: logoIndustry,
        isPaid: false,
        style,
        pattern: stored.pattern,
        subject: stored.subject,
        concept: stored.concept,
        palette: stored.palette,
        lockupFont: stored.lockupFont,
      });

      return res.status(200).json({
        success: true,
        logoId: logo.id,
        logoUrl: stored.previewUrl,
        name: businessName,
        keywords,
        industry: logoIndustry,
        subject: stored.subject,
        pattern: stored.pattern,
        remaining,
      });
    } catch (dbError: any) {
      console.error('Не удалось сохранить логотип:', dbError.message);
      return res.status(200).json({
        success: true,
        logoUrl: stored.previewUrl,
        name: businessName,
        keywords,
        industry: logoIndustry,
        subject: stored.subject,
        pattern: stored.pattern,
        remaining,
        warning: 'Logo generated but could not be saved to database',
      });
    }
  } catch (error: any) {
    console.error('Error generating logo:', error);

    return res.status(500).json({
      error: 'Something went wrong',
      message: error.message,
      details: error.response?.data || null,
    });
  }
});

// :userId в пути оставлен для совместимости со старыми ссылками и игнорируется
router.get('/user-logos/:userId', requireAuth, async (req: any, res: any) => {
  try {
    const logos = await logosRepo.listByUser(req.user.id);

    // Отдаём только то, что нужно кабинету: email, телефон и id платежа — нет.
    // Ссылка на чистый файл уходит клиенту только после оплаты
    return res.status(200).json({
      success: true,
      logos: logos.map((logo) => ({
        id: logo.id,
        name: logo.name,
        keywords: logo.keywords,
        logoUrl: logo.logoUrl,
        originalLogoUrl: logo.isPaid ? logo.originalLogoUrl : null,
        // Кабинет по этому флагу решает, показывать ли кнопку SVG:
        // у логотипов, сделанных до перехода на вектор, его нет
        hasVector: Boolean(logo.isPaid && logo.originalSvgUrl),
        isPaid: logo.isPaid,
        orderId: logo.orderId,
        createdAt: logo.createdAt,
      })),
    });
  } catch (error: any) {
    console.error('Error fetching user logos:', error.message);
    return res.status(500).json({ error: 'Failed to fetch logos' });
  }
});

export default router;
