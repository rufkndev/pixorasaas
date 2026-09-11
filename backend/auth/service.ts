import { Request, Response } from 'express';
import { sessionsRepo, usersRepo } from '../db/repositories';
import { User } from '../db/types';
import { setAuthCookies } from './cookies';
import {
  REFRESH_TOKEN_TTL_DAYS,
  addDays,
  generateOpaqueToken,
  hashToken,
  signAccessToken,
} from './tokens';

// Нужны для журнала согласий и списка сессий
export const clientMeta = (req: Request) => ({
  ip: req.ip || null,
  userAgent: (req.headers['user-agent'] as string | undefined)?.slice(0, 500) || null,
});

// Форма пользователя, уходящая на фронтенд
export const publicUser = (user: User) => ({
  id: user.id,
  email: user.email,
  fullName: user.fullName,
  emailVerified: Boolean(user.emailVerifiedAt),
  createdAt: user.createdAt,
});

// Создаёт сессию и выставляет обе куки
export const issueSession = async (
  req: Request,
  res: Response,
  user: { id: string; email: string }
): Promise<void> => {
  const refreshToken = generateOpaqueToken();
  const meta = clientMeta(req);

  const sessionId = await sessionsRepo.create({
    userId: user.id,
    refreshTokenHash: hashToken(refreshToken),
    expiresAt: addDays(REFRESH_TOKEN_TTL_DAYS),
    ip: meta.ip,
    userAgent: meta.userAgent,
  });

  setAuthCookies(res, {
    accessToken: signAccessToken({ sub: user.id, sid: sessionId, email: user.email }),
    refreshToken,
  });
};

// null означает, что токен неизвестен, просрочен или уже использован —
// вызывающий в этом случае чистит куки.
export const rotateSession = async (
  req: Request,
  res: Response,
  refreshToken: string
): Promise<User | null> => {
  const oldHash = hashToken(refreshToken);
  const session = await sessionsRepo.findByTokenHash(oldHash);

  if (!session) return null;

  const user = await usersRepo.findById(session.userId);

  // Аккаунт мог быть удалён после выдачи токена
  if (!user) {
    await sessionsRepo.deleteByTokenHash(oldHash);
    return null;
  }

  const newToken = generateOpaqueToken();
  const rotated = await sessionsRepo.rotate({
    id: session.id,
    oldTokenHash: oldHash,
    newTokenHash: hashToken(newToken),
    expiresAt: addDays(REFRESH_TOKEN_TTL_DAYS),
  });

  if (!rotated) return null;

  setAuthCookies(res, {
    accessToken: signAccessToken({ sub: user.id, sid: session.id, email: user.email }),
    refreshToken: newToken,
  });

  return user;
};
