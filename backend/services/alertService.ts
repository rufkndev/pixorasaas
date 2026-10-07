import { mailService } from './mailService';
import { renderLayout } from '../emails/layout';
import { escapeHtmlMultiline } from '../utils/html';
import { log } from '../logger';

// Один и тот же сбой не должен заваливать ящик: досборщик повторяет заказы
// каждые несколько минут, и без паузы каждое повторение давало бы письмо
const THROTTLE_MS = 60 * 60 * 1000;
const lastSent = new Map<string, number>();

const recipient = (): string | undefined => process.env.ALERT_EMAIL || process.env.CONTACT_EMAIL;

export const alertService = {
  // key — что именно сломалось (например, delivery:<orderId>). Письмо с тем же
  // ключом уходит не чаще раза в час. Сбой почты не должен ронять вызывающего.
  async notify(key: string, subject: string, details: string): Promise<void> {
    log.error(`[ALERT] ${subject}: ${details}`);

    const to = recipient();
    if (!to) return;

    const now = Date.now();
    if (now - (lastSent.get(key) ?? 0) < THROTTLE_MS) return;
    lastSent.set(key, now);

    await mailService.sendQuietly({
      to,
      subject: `[Pixora] ${subject}`,
      html: renderLayout({ title: subject, body: escapeHtmlMultiline(details) }),
      text: details,
    });
  },
};
