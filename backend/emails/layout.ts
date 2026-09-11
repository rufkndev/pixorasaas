import { OPERATOR } from '../legal';

export const getAppUrl = (): string =>
  (process.env.APP_URL || 'http://localhost:3000').replace(/\/+$/, '');

// Каркас письма. Только инлайновые стили, без внешних картинок и шрифтов:
// почтовые клиенты их режут, а лишние домены — лишняя зависимость.
export const renderLayout = (options: {
  title: string;
  body: string;
  action?: { label: string; url: string };
  footerNote?: string;
}): string => {
  const { title, body, action, footerNote } = options;

  const button = action
    ? `
      <tr>
        <td style="padding: 8px 0 24px;">
          <a href="${action.url}"
             style="display: inline-block; padding: 12px 24px; background: #111827; color: #ffffff;
                    text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px;">
            ${action.label}
          </a>
        </td>
      </tr>
      <tr>
        <td style="padding-bottom: 24px; font-size: 13px; color: #6b7280; line-height: 20px;">
          Если кнопка не работает, скопируйте ссылку в адресную строку браузера:<br>
          <span style="color: #374151; word-break: break-all;">${action.url}</span>
        </td>
      </tr>`
    : '';

  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background: #f3f4f6;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
         style="background: #f3f4f6; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
               style="max-width: 560px; background: #ffffff; border-radius: 12px; padding: 32px;
                      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
                      color: #111827;">
          <tr>
            <td style="padding-bottom: 24px; font-size: 20px; font-weight: 700; letter-spacing: -0.2px;">
              Pixora
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 16px; font-size: 18px; font-weight: 600;">
              ${title}
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 24px; font-size: 15px; line-height: 24px; color: #374151;">
              ${body}
            </td>
          </tr>
          ${button}
          <tr>
            <td style="border-top: 1px solid #e5e7eb; padding-top: 20px;
                       font-size: 12px; line-height: 18px; color: #9ca3af;">
              ${footerNote ? `${footerNote}<br><br>` : ''}
              ${OPERATOR.name} · ИНН ${OPERATOR.inn} · ОГРНИП ${OPERATOR.ogrnip}<br>
              <a href="${getAppUrl()}" style="color: #6b7280;">${getAppUrl()}</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};
