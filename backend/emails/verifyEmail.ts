import { escapeHtml } from '../utils/html';
import { EMAIL_VERIFY_TTL_HOURS } from '../auth/tokens';
import { getAppUrl, renderLayout } from './layout';

export const verifyEmailTemplate = (input: { fullName?: string | null; token: string }) => {
  const url = `${getAppUrl()}/pages/verify-email?token=${encodeURIComponent(input.token)}`;
  const greeting = input.fullName ? `${escapeHtml(input.fullName)}, здравствуйте!` : 'Здравствуйте!';

  const html = renderLayout({
    title: 'Подтвердите адрес электронной почты',
    body: `
      ${greeting}<br><br>
      Вы зарегистрировались в Pixora. Чтобы войти в аккаунт, подтвердите почту —
      нажмите кнопку ниже. Ссылка действует ${EMAIL_VERIFY_TTL_HOURS} часа.
    `,
    action: { label: 'Подтвердить почту', url },
    footerNote:
      'Если вы не регистрировались в Pixora, просто удалите это письмо — аккаунт не будет активирован.',
  });

  const text = [
    greeting.replace(/<br>/g, ''),
    '',
    'Вы зарегистрировались в Pixora. Чтобы войти в аккаунт, подтвердите почту по ссылке:',
    url,
    '',
    `Ссылка действует ${EMAIL_VERIFY_TTL_HOURS} часа.`,
    '',
    'Если вы не регистрировались в Pixora, просто удалите это письмо.',
  ].join('\n');

  return {
    subject: 'Подтверждение регистрации в Pixora',
    html,
    text,
  };
};
