import { Router } from 'express';
import rateLimit from 'express-rate-limit';

import { consentsRepo } from '../db/repositories';
import { LEGAL_VERSIONS } from '../legal';
import { contactSchema, firstError } from '../auth/schemas';
import { clientMeta } from '../auth/service';
import { optionalAuth } from '../auth/middleware';
import { mailService } from '../services/mailService';
import { escapeHtml, escapeHtmlMultiline } from '../utils/html';
import { renderLayout } from '../emails/layout';
import { log } from '../logger';

const router = Router();

// Форма открыта всем, поэтому лимит жёсткий: иначе ей можно завалить наш ящик
// и сжечь квоту Postbox, которой пользуются письма о заказах.
const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Слишком много сообщений. Попробуйте позже.' },
});

router.post('/send-contact', contactLimiter, optionalAuth, async (req: any, res: any) => {
  const parsed = contactSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ error: firstError(parsed.error) });
  }

  const { name, email, message } = parsed.data;
  const meta = clientMeta(req);

  const recipient = process.env.CONTACT_EMAIL;

  if (!recipient) {
    log.error('CONTACT_EMAIL не задан — сообщение из формы отправить некуда');
    return res.status(500).json({ error: 'Форма временно недоступна' });
  }

  try {
    // Фиксируем до отправки: обращение уже содержит имя и email
    await consentsRepo.record({
      userId: req.user?.id ?? null,
      subject: email,
      kind: 'pdn',
      docVersion: LEGAL_VERSIONS.pdn,
      source: 'contact_form',
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    // Без экранирования чужая разметка попала бы в наше письмо. Подтверждения
    // отправителю нет намеренно: оно уходило на любой адрес с текстом из формы,
    // и форма работала как рассылка спама от нашего домена
    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safeMessage = escapeHtmlMultiline(message);

    // Письмо владельцу
    await mailService.send({
      to: recipient,
      replyTo: email,
      subject: `Новое сообщение с сайта — ${name}`,
      html: renderLayout({
        title: 'Новое сообщение из формы обратной связи',
        body: `
          <strong>Имя:</strong> ${safeName}<br>
          <strong>Email:</strong> ${safeEmail}<br><br>
          <strong>Сообщение:</strong><br>
          ${safeMessage}
        `,
      }),
      text: `Имя: ${name}\nEmail: ${email}\n\nСообщение:\n${message}`,
    });

    return res.status(200).json({ success: true, message: 'Сообщение отправлено' });
  } catch (error: any) {
    log.error('Ошибка отправки сообщения из формы:', error.message);
    return res.status(500).json({ error: 'Не удалось отправить сообщение' });
  }
});

export default router;
