import { Response, CookieOptions } from 'express';
import { REFRESH_TOKEN_TTL_DAYS } from './tokens';

export const ACCESS_COOKIE = 'pixora_at';
export const REFRESH_COOKIE = 'pixora_rt';

const isProduction = () => process.env.NODE_ENV === 'production';

// httpOnly: JS куки не читает, поэтому XSS не уносит сессию.
// SameSite=Lax достаточно — фронт и API живут на одном домене,
// а возврат из ЮKassa это обычный переход по ссылке.
const baseOptions = (): CookieOptions => ({
  httpOnly: true,
  sameSite: 'lax',
  secure: isProduction(),
  path: '/',
});

export const setAuthCookies = (
  res: Response,
  tokens: { accessToken: string; refreshToken: string }
): void => {
  res.cookie(ACCESS_COOKIE, tokens.accessToken, {
    ...baseOptions(),
    // Кука живёт дольше самого токена: срок проверяет подпись, а кука нужна,
    // чтобы клиент успел сходить на /refresh.
    maxAge: REFRESH_TOKEN_TTL_DAYS * 86_400_000,
  });

  res.cookie(REFRESH_COOKIE, tokens.refreshToken, {
    ...baseOptions(),
    maxAge: REFRESH_TOKEN_TTL_DAYS * 86_400_000,
  });
};

export const clearAuthCookies = (res: Response): void => {
  res.clearCookie(ACCESS_COOKIE, baseOptions());
  res.clearCookie(REFRESH_COOKIE, baseOptions());
};
