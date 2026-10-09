import { NextFunction, Request, Response } from 'express';
import { requireAuth } from '../auth/middleware';
import { adminActionsRepo } from '../db/repositories';
import { log } from '../logger';

// Список адресов в env, а не роль в базе: админ один-два человека, и права
// не должны выдаваться запросом к базе, который можно случайно выполнить
const adminEmails = (): Set<string> =>
  new Set(
    (process.env.ADMIN_EMAILS || '')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );

export const isAdminEmail = (email: string | undefined): boolean =>
  Boolean(email) && adminEmails().has(email!.toLowerCase());

// Поверх обычной сессии: выход и блокировка срабатывают здесь так же сразу
export const requireAdmin = [
  requireAuth,
  (req: Request, res: Response, next: NextFunction): void => {
    if (!isAdminEmail(req.user?.email)) {
      res.status(403).json({ error: 'Нет доступа к админке', code: 'NOT_ADMIN' });
      return;
    }
    next();
  },
];

export const audit = async (
  req: Request,
  action: string,
  targetType: string,
  targetId: string | null,
  details: Record<string, unknown> = {}
): Promise<void> => {
  try {
    await adminActionsRepo.record({
      adminId: req.user!.id,
      adminEmail: req.user!.email,
      action,
      targetType,
      targetId,
      details,
    });
  } catch (error: any) {
    log.error('Не удалось записать действие админа:', error.message);
  }
};
