import { escapeHtml } from '../utils/html';
import { PASSWORD_RESET_TTL_MINUTES } from '../auth/tokens';
import { getAppUrl, renderLayout } from './layout';

export const resetPasswordTemplate = (input: { fullName?: string | null; token: string }) => {
  const url = `${getAppUrl()}/pages/reset-password?token=${encodeURIComponent(input.token)}`;
  const greeting = input.fullName ? `${escapeHtml(input.fullName)}, здравствуйте!` : 'Здравствуйте!';

  const html = renderLayout({
    title: 'Сброс пароля',
    body: `
      ${greeting}<br><br>
      Мы получили запрос на сброс пароля от вашего аккаунта в Pixora.
      Нажмите кнопку ниже, чтобы задать новый пароль. Ссылка действует
      ${PASSWORD_RESET_TTL_MINUTES} минут и сработает только один раз.
    `,
    action: { label: 'Задать новый пароль', url },
    footerNote:
      'Если вы не запрашивали сброс пароля, ничего делать не нужно — текущий пароль останется прежним.',
  });

  const text = [
    greeting.replace(/<br>/g, ''),
    '',
    'Мы получили запрос на сброс пароля от вашего аккаунта в Pixora.',
    'Задать новый пароль:',
    url,
    '',
    `Ссылка действует ${PASSWORD_RESET_TTL_MINUTES} минут и сработает только один раз.`,
    '',
    'Если вы не запрашивали сброс пароля, ничего делать не нужно.',
  ].join('\n');

  return {
    subject: 'Сброс пароля в Pixora',
    html,
    text,
  };
};
