import { NextFunction, Request, Response } from 'express';
import { sessionsRepo } from '../db/repositories';
import { ACCESS_COOKIE } from './cookies';
import { verifyAccessToken } from './tokens';
import { log } from '../logger';

export interface AuthenticatedUser {
  id: string;
  email: string;
  sessionId: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

const readAccessToken = (req: Request): string | null => {
  const fromCookie = req.cookies?.[ACCESS_COOKIE];
  if (fromCookie) return fromCookie;

  // Bearer — для отладки и не-браузерных клиентов
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7);

  return null;
};

// Кроме подписи проверяем, что сессия ещё жива: токен действует 15 минут и сам
// не отзывается, а выход и смена пароля должны срабатывать сразу.
const resolveUser = async (req: Request): Promise<AuthenticatedUser | null> => {
  const token = readAccessToken(req);
  if (!token) return null;

  const payload = verifyAccessToken(token);
  if (!payload?.sid) return null;

  if (!(await sessionsRepo.isActive(payload.sid))) return null;

  return { id: payload.sub, email: payload.email, sessionId: payload.sid };
};

// Кладёт req.user, если сессия валидна. Запрос не отклоняет.
export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await resolveUser(req);
    if (user) req.user = user;
  } catch (error: any) {
    log.error('Ошибка проверки сессии:', error.message);
  }

  next();
};

// Код TOKEN_EXPIRED — сигнал фронту сходить на /api/auth/refresh и повторить запрос
export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!readAccessToken(req)) {
    res.status(401).json({ error: 'Unauthorized', code: 'NO_TOKEN' });
    return;
  }

  try {
    const user = await resolveUser(req);

    if (!user) {
      res.status(401).json({ error: 'Unauthorized', code: 'TOKEN_EXPIRED' });
      return;
    }

    req.user = user;
    next();
  } catch (error: any) {
    log.error('Ошибка проверки сессии:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
};
