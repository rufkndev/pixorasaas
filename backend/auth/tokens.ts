import crypto from 'crypto';
import jwt from 'jsonwebtoken';

export const ACCESS_TOKEN_TTL = process.env.ACCESS_TOKEN_TTL || '15m';
export const REFRESH_TOKEN_TTL_DAYS = Number(process.env.REFRESH_TOKEN_TTL_DAYS || 30);

// Сроки жизни ссылок в письмах
export const EMAIL_VERIFY_TTL_HOURS = 24;
export const PASSWORD_RESET_TTL_MINUTES = 60;

const getSecret = (): string => {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error(
      'JWT_SECRET не задан или короче 32 символов. Сгенерируйте: openssl rand -hex 32'
    );
  }

  return secret;
};

export interface AccessTokenPayload {
  sub: string; // id пользователя
  sid: string; // id сессии
  email: string;
}

export const signAccessToken = (payload: AccessTokenPayload): string =>
  jwt.sign(payload, getSecret(), {
    algorithm: 'HS256',
    expiresIn: ACCESS_TOKEN_TTL as any,
  });

// Истёкший и подделанный токен для вызывающего неразличимы
export const verifyAccessToken = (token: string): AccessTokenPayload | null => {
  try {
    return jwt.verify(token, getSecret(), { algorithms: ['HS256'] }) as AccessTokenPayload;
  } catch {
    return null;
  }
};

// Случайный токен для сессий и ссылок в письмах.
// В базу кладётся только его SHA-256.
export const generateOpaqueToken = (): string => crypto.randomBytes(32).toString('base64url');

export const hashToken = (token: string): string =>
  crypto.createHash('sha256').update(token).digest('hex');

export const addDays = (days: number): Date => new Date(Date.now() + days * 86_400_000);

export const addHours = (hours: number): Date => new Date(Date.now() + hours * 3_600_000);

export const addMinutes = (minutes: number): Date => new Date(Date.now() + minutes * 60_000);
