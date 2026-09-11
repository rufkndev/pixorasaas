import nodemailer, { Transporter } from 'nodemailer';

export interface MailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}

let transporter: Transporter | null = null;

// SMTP Яндекс Cloud Postbox. На 587 шифрование поднимается после EHLO,
// поэтому secure: false; на 465 — сразу, поэтому true.
const getTransporter = (): Transporter => {
  if (!transporter) {
    const host = process.env.POSTBOX_SMTP_HOST || 'postbox.cloud.yandex.net';
    const port = Number(process.env.POSTBOX_SMTP_PORT || 587);
    const user = process.env.POSTBOX_SMTP_USER;
    const pass = process.env.POSTBOX_SMTP_PASSWORD;

    if (!user || !pass) {
      throw new Error('POSTBOX_SMTP_USER / POSTBOX_SMTP_PASSWORD не заданы');
    }

    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      requireTLS: port !== 465,
      auth: { user, pass },
    });
  }

  return transporter;
};

const getFrom = (): string => process.env.MAIL_FROM || 'Pixora <noreply@localhost>';

export const mailService = {
  async send(message: MailMessage): Promise<void> {
    await getTransporter().sendMail({
      from: getFrom(),
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
      replyTo: message.replyTo,
    });
  },

  // Регистрация и сброс пароля не должны падать из-за недоступного SMTP:
  // пользователь просто запросит письмо повторно.
  async sendQuietly(message: MailMessage): Promise<boolean> {
    try {
      await this.send(message);
      return true;
    } catch (error: any) {
      console.error(`Не удалось отправить письмо «${message.subject}»:`, error.message);
      return false;
    }
  },

  // Для диагностики: проверяет, отвечает ли SMTP
  async verify(): Promise<boolean> {
    try {
      await getTransporter().verify();
      return true;
    } catch (error: any) {
      console.error('SMTP недоступен:', error.message);
      return false;
    }
  },
};
