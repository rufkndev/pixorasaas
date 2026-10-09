import { Router } from 'express';
import rateLimit from 'express-rate-limit';

import { authTokensRepo, consentsRepo, sessionsRepo, usersRepo } from '../db/repositories';
import { isUniqueViolation } from '../db/pool';
import { LEGAL_VERSIONS } from '../legal';
import { burnPasswordCheck, hashPassword, verifyPassword } from '../auth/password';
import { clearAuthCookies, REFRESH_COOKIE } from '../auth/cookies';
import { clientMeta, issueSession, publicUser, rotateSession } from '../auth/service';
import { requireAuth } from '../auth/middleware';
import {
  EMAIL_VERIFY_TTL_HOURS,
  PASSWORD_RESET_TTL_MINUTES,
  addHours,
  addMinutes,
  generateOpaqueToken,
  hashToken,
} from '../auth/tokens';
import {
  deleteAccountSchema,
  emailOnlySchema,
  firstError,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  tokenSchema,
} from '../auth/schemas';
import { mailService } from '../services/mailService';
import { verifyEmailTemplate } from '../emails/verifyEmail';
import { resetPasswordTemplate } from '../emails/resetPassword';
import { isDisposableEmail } from '../utils/disposableEmail';
import { ipLimitKey } from '../utils/ipRange';
import { blockedIpsRepo } from '../db/repositories/adminRepo';
import { log } from '../logger';

const router = Router();

// Против подбора пароля и перебора токенов. Вешается на конкретные роуты,
// а не на весь router: /me и /refresh дёргаются при каждой загрузке страницы.
const credentialsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Слишком много попыток. Повторите через несколько минут.' },
});

// Жёстче: всё, что отправляет письмо
const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Слишком много запросов. Повторите через час.' },
});

// Широкий предохранитель для сессионных роутов, с запасом на обычную навигацию
const sessionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Слишком много запросов. Повторите позже.' },
});

// Писем одного вида на один адрес в час. Лимит по IP не спасает адресата:
// злоумышленник меняет адреса и заваливает чужой ящик, а заодно портит
// репутацию нашего домена в Postbox
const EMAILS_PER_HOUR = 3;

const canSendAgain = async (userId: string, kind: 'email_verify' | 'password_reset') =>
  (await authTokensRepo.countRecent(userId, kind, 60)) < EMAILS_PER_HOUR;

// Выпускает токен подтверждения и отправляет письмо
const sendVerificationEmail = async (user: {
  id: string;
  email: string;
  fullName: string | null;
}): Promise<void> => {
  // Гасим предыдущие ссылки, чтобы действовала только последняя
  await authTokensRepo.invalidateAll(user.id, 'email_verify');

  const token = generateOpaqueToken();

  await authTokensRepo.create({
    userId: user.id,
    kind: 'email_verify',
    tokenHash: hashToken(token),
    expiresAt: addHours(EMAIL_VERIFY_TTL_HOURS),
  });

  const message = verifyEmailTemplate({ fullName: user.fullName, token });
  await mailService.sendQuietly({ to: user.email, ...message });
};

router.post('/register', emailLimiter, async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ error: firstError(parsed.error) });
  }

  const { email, password, fullName, consents, attribution } = parsed.data;
  const meta = clientMeta(req);

  if (await blockedIpsRepo.isBlocked(ipLimitKey(req.ip)).catch(() => false)) {
    return res.status(403).json({
      error: 'Регистрация с вашей сети недоступна. Напишите нам через форму обратной связи.',
      code: 'BLOCKED',
    });
  }

  // Одноразовая почта — главный способ завести десятки аккаунтов под бесплатные генерации
  if (isDisposableEmail(email)) {
    return res.status(400).json({
      error: 'Регистрация с временных почтовых адресов недоступна. Укажите постоянный адрес.',
      code: 'DISPOSABLE_EMAIL',
    });
  }

  // Ответ одинаков всегда: по нему нельзя узнать, занят ли адрес
  const genericResponse = {
    success: true,
    message: 'Если адрес свободен, мы отправили на него письмо с подтверждением.',
  };

  try {
    const existing = await usersRepo.findByEmailWithSecret(email);

    if (existing) {
      // Почта не подтверждена — шлём письмо ещё раз. Подтверждённому не пишем.
      if (!existing.emailVerifiedAt && (await canSendAgain(existing.id, 'email_verify'))) {
        await sendVerificationEmail(existing);
      }
      return res.status(200).json(genericResponse);
    }

    const user = await usersRepo.create({
      email,
      passwordHash: await hashPassword(password),
      fullName: fullName ?? null,
      signupSource: attribution ?? null,
    });

    // Версия документа берётся с сервера, не от клиента
    await consentsRepo.record({
      userId: user.id,
      subject: user.email,
      kind: 'pdn',
      docVersion: LEGAL_VERSIONS.pdn,
      source: 'registration',
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    if (consents.marketing) {
      await consentsRepo.record({
        userId: user.id,
        subject: user.email,
        kind: 'marketing',
        docVersion: LEGAL_VERSIONS.marketing,
        source: 'registration',
        ip: meta.ip,
        userAgent: meta.userAgent,
      });
    }

    await sendVerificationEmail(user);

    return res.status(200).json(genericResponse);
  } catch (error: any) {
    // Две одновременные регистрации на один адрес
    if (isUniqueViolation(error)) {
      return res.status(200).json(genericResponse);
    }

    log.error('Ошибка регистрации:', error.message);
    return res.status(500).json({ error: 'Не удалось завершить регистрацию' });
  }
});

router.post('/verify-email', credentialsLimiter, async (req, res) => {
  const parsed = tokenSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ error: 'Некорректная ссылка подтверждения' });
  }

  try {
    const userId = await authTokensRepo.consume(hashToken(parsed.data.token), 'email_verify');

    if (!userId) {
      return res.status(400).json({
        error: 'Ссылка недействительна или устарела',
        code: 'INVALID_TOKEN',
      });
    }

    await usersRepo.markEmailVerified(userId);

    const user = await usersRepo.findById(userId);

    if (!user) {
      return res.status(400).json({ error: 'Аккаунт не найден', code: 'INVALID_TOKEN' });
    }

    // Пускаем сразу: владение адресом только что доказано
    await issueSession(req, res, user);

    return res.status(200).json({ success: true, user: publicUser(user) });
  } catch (error: any) {
    log.error('Ошибка подтверждения почты:', error.message);
    return res.status(500).json({ error: 'Не удалось подтвердить почту' });
  }
});

router.post('/resend-verification', emailLimiter, async (req, res) => {
  const parsed = emailOnlySchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ error: firstError(parsed.error) });
  }

  const genericResponse = {
    success: true,
    message: 'Если аккаунт существует и ещё не подтверждён, письмо отправлено повторно.',
  };

  try {
    const user = await usersRepo.findByEmailWithSecret(parsed.data.email);

    if (user && !user.emailVerifiedAt) {
      if (await canSendAgain(user.id, 'email_verify')) {
        await sendVerificationEmail(user);
      }
    }

    return res.status(200).json(genericResponse);
  } catch (error: any) {
    log.error('Ошибка повторной отправки подтверждения:', error.message);
    return res.status(200).json(genericResponse);
  }
});

router.post('/login', credentialsLimiter, async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ error: firstError(parsed.error) });
  }

  const { email, password } = parsed.data;

  try {
    const user = await usersRepo.findByEmailWithSecret(email);
    const passwordOk = user
      ? await verifyPassword(user.passwordHash, password)
      : await burnPasswordCheck(password);

    if (!user || !passwordOk) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    // Только после проверки пароля, иначе роут выдаёт, занят ли адрес
    if (user.blockedAt) {
      return res.status(403).json({
        error: 'Аккаунт заблокирован. Если это ошибка, напишите нам через форму обратной связи.',
        code: 'ACCOUNT_BLOCKED',
      });
    }

    if (!user.emailVerifiedAt) {
      return res.status(403).json({
        error: 'Подтвердите адрес электронной почты, чтобы войти',
        code: 'EMAIL_NOT_VERIFIED',
      });
    }

    await issueSession(req, res, user);

    return res.status(200).json({ success: true, user: publicUser(user) });
  } catch (error: any) {
    log.error('Ошибка входа:', error.message);
    return res.status(500).json({ error: 'Не удалось выполнить вход' });
  }
});

router.post('/refresh', sessionLimiter, async (req, res) => {
  const refreshToken = req.cookies?.[REFRESH_COOKIE];

  if (!refreshToken) {
    clearAuthCookies(res);
    return res.status(401).json({ error: 'Сессия не найдена' });
  }

  try {
    const user = await rotateSession(req, res, refreshToken);

    if (!user) {
      clearAuthCookies(res);
      return res.status(401).json({ error: 'Сессия истекла' });
    }

    return res.status(200).json({ success: true, user: publicUser(user) });
  } catch (error: any) {
    log.error('Ошибка обновления сессии:', error.message);
    clearAuthCookies(res);
    return res.status(401).json({ error: 'Сессия истекла' });
  }
});

router.post('/logout', sessionLimiter, async (req, res) => {
  const refreshToken = req.cookies?.[REFRESH_COOKIE];

  try {
    if (refreshToken) {
      await sessionsRepo.deleteByTokenHash(hashToken(refreshToken));
    }
  } catch (error: any) {
    log.error('Ошибка выхода:', error.message);
  }

  // Куки чистим даже если удалить сессию не вышло
  clearAuthCookies(res);
  return res.status(200).json({ success: true });
});

router.get('/me', sessionLimiter, requireAuth, async (req, res) => {
  try {
    const user = await usersRepo.findById(req.user!.id);

    if (!user) {
      clearAuthCookies(res);
      return res.status(401).json({ error: 'Аккаунт не найден' });
    }

    return res.status(200).json({ user: publicUser(user) });
  } catch (error: any) {
    log.error('Ошибка получения профиля:', error.message);
    return res.status(500).json({ error: 'Не удалось получить профиль' });
  }
});

router.post('/forgot-password', emailLimiter, async (req, res) => {
  const parsed = emailOnlySchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ error: firstError(parsed.error) });
  }

  const genericResponse = {
    success: true,
    message: 'Если аккаунт с таким адресом существует, мы отправили письмо для сброса пароля.',
  };

  try {
    const user = await usersRepo.findByEmailWithSecret(parsed.data.email);

    if (user && (await canSendAgain(user.id, 'password_reset'))) {
      await authTokensRepo.invalidateAll(user.id, 'password_reset');

      const token = generateOpaqueToken();

      await authTokensRepo.create({
        userId: user.id,
        kind: 'password_reset',
        tokenHash: hashToken(token),
        expiresAt: addMinutes(PASSWORD_RESET_TTL_MINUTES),
      });

      const message = resetPasswordTemplate({ fullName: user.fullName, token });
      await mailService.sendQuietly({ to: user.email, ...message });
    }

    return res.status(200).json(genericResponse);
  } catch (error: any) {
    log.error('Ошибка запроса сброса пароля:', error.message);
    return res.status(200).json(genericResponse);
  }
});

router.post('/reset-password', credentialsLimiter, async (req, res) => {
  const parsed = resetPasswordSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ error: firstError(parsed.error) });
  }

  const { token, password } = parsed.data;

  try {
    const userId = await authTokensRepo.consume(hashToken(token), 'password_reset');

    if (!userId) {
      return res.status(400).json({
        error: 'Ссылка недействительна или устарела',
        code: 'INVALID_TOKEN',
      });
    }

    await usersRepo.updatePassword(userId, await hashPassword(password));

    // Разлогинивает все устройства, включая то, с которого аккаунт могли увести
    await sessionsRepo.deleteAllForUser(userId);

    // Успешный сброс заодно подтверждает владение адресом
    await usersRepo.markEmailVerified(userId);

    clearAuthCookies(res);

    return res.status(200).json({
      success: true,
      message: 'Пароль изменён. Войдите с новым паролем.',
    });
  } catch (error: any) {
    log.error('Ошибка сброса пароля:', error.message);
    return res.status(500).json({ error: 'Не удалось изменить пароль' });
  }
});

router.delete('/account', credentialsLimiter, requireAuth, async (req, res) => {
  const parsed = deleteAccountSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ error: firstError(parsed.error) });
  }

  try {
    const user = await usersRepo.findByIdWithSecret(req.user!.id);

    if (!user || !(await verifyPassword(user.passwordHash, parsed.data.password))) {
      return res.status(403).json({ error: 'Неверный пароль' });
    }

    await consentsRepo.revokeAll(user.id);

    // Удаляет контент и сессии, обезличивает аккаунт и контакты в платежах
    await usersRepo.deleteAccount(user.id);

    clearAuthCookies(res);

    return res.status(200).json({
      success: true,
      message: 'Аккаунт удалён, согласие на обработку персональных данных отозвано.',
    });
  } catch (error: any) {
    log.error('Ошибка удаления аккаунта:', error.message);
    return res.status(500).json({ error: 'Не удалось удалить аккаунт' });
  }
});

export default router;
