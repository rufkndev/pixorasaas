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

const router = Router();

// Форма открыта всем, поэтому лимит жёсткий: иначе через неё можно рассылать
// письма на любые адреса от нашего домена.
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
    console.error('CONTACT_EMAIL не задан — сообщение из формы отправить некуда');
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

    // Без экранирования чужая разметка попадёт и в наше письмо,
    // и в подтверждение на указанный отправителем адрес
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

    // Подтверждение отправителю. Сбой здесь не повод просить его писать снова.
    await mailService.sendQuietly({
      to: email,
      subject: 'Мы получили ваше сообщение — Pixora',
      html: renderLayout({
        title: 'Спасибо за обращение',
        body: `
          ${safeName}, здравствуйте!<br><br>
          Мы получили ваше сообщение и ответим в течение рабочего дня.<br><br>
          <strong>Текст обращения:</strong><br>
          ${safeMessage}
        `,
        footerNote: 'Это письмо отправлено автоматически, отвечать на него не нужно.',
      }),
      text: `${name}, здравствуйте!\n\nМы получили ваше сообщение и ответим в течение рабочего дня.\n\nТекст обращения:\n${message}`,
    });

    return res.status(200).json({ success: true, message: 'Сообщение отправлено' });
  } catch (error: any) {
    console.error('Ошибка отправки сообщения из формы:', error.message);
    return res.status(500).json({ error: 'Не удалось отправить сообщение' });
  }
});

export default router;
