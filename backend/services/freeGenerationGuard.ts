import { Request } from 'express';

import {
  GenerationKind,
  generationUsageRepo,
  ipUsageRepo,
  paymentsRepo,
  spendRepo,
} from '../db/repositories';
import { ESTIMATED_COST_RUB, FREE_SPEND_KINDS, IP_DAILY_LIMITS, SpendKind } from '../limits';
import { ipLimitKey } from '../utils/ipRange';
import { alertService } from './alertService';
import { settingsService } from './settingsService';
import { track } from './eventsService';
import { blockedIpsRepo } from '../db/repositories/adminRepo';
import { log } from '../logger';

// Отказ, который роут отдаёт как есть
export interface GuardRefusal {
  ok: false;
  status: number;
  body: { error: string; code: string; remaining?: number };
}

export interface GuardPass {
  ok: true;
  remaining: number;
  // Генерация не удалась — вернуть списанное. За наш сбой пользователь не платит
  release: () => Promise<void>;
  // Генерация прошла — учесть смету в суточном бюджете
  commit: () => Promise<void>;
}

// Бэкенд собирается без strict, и сужение по полю ok там не работает
export const isRefusal = (result: GuardPass | GuardRefusal): result is GuardRefusal => !result.ok;

const LIMIT_MESSAGES: Record<GenerationKind, string> = {
  names:
    'Бесплатные генерации названий закончились. Они обновятся автоматически, а оплата логотипа или брендбука возвращает их сразу.',
  logos:
    'Бесплатные генерации логотипов закончились. Они обновятся автоматически, а оплата логотипа или брендбука возвращает их сразу.',
};

const paused = (): GuardRefusal => ({
  ok: false,
  status: 503,
  body: {
    error:
      'Бесплатные генерации на сегодня приостановлены из-за высокой нагрузки. Они вернутся после полуночи по Москве, оплаченные заказы работают как обычно.',
    code: 'FREE_PAUSED',
  },
});

// Потолок трат на бесплатное. Проверка не атомарна со списанием: это предохранитель
// от лавины, и перелёт на несколько генераций в момент срабатывания не важен
export const checkBudget = async (kind: SpendKind): Promise<boolean> => {
  const { freePaused, dailyBudgetRub } = await settingsService.get();
  if (freePaused) return false;

  const spent = await spendRepo.todayTotal(FREE_SPEND_KINDS);

  if (spent + ESTIMATED_COST_RUB[kind] <= dailyBudgetRub) return true;

  await alertService.notify(
    'budget',
    'Исчерпан суточный бюджет бесплатных генераций',
    `Потрачено по смете ${spent.toFixed(2)} ₽ из ${dailyBudgetRub} ₽.\n` +
      'Бесплатные генерации на паузе до полуночи по Москве. Если это наплыв живых ' +
      'людей, поднимите бюджет в админке (Настройки); если фарм — смотрите лимиты по адресам.'
  );
  return false;
};

export const recordSpend = async (kind: SpendKind): Promise<void> => {
  try {
    await spendRepo.add(kind, ESTIMATED_COST_RUB[kind]);
  } catch (error: any) {
    log.error('Не удалось учесть трату на генерацию:', error.message);
  }
};

// Бюджет → квота аккаунта → лимит на адрес. Квота списывается до лимита на адрес,
// поэтому при отказе по адресу её приходится вернуть
export const reserveFreeGeneration = async (
  req: Request,
  kind: GenerationKind
): Promise<GuardPass | GuardRefusal> => {
  const userId = req.user!.id;
  const refuse = (refusal: GuardRefusal): GuardRefusal => {
    track('generation_refused', userId, { kind, code: refusal.body.code });
    return refusal;
  };

  const ipKeyRaw = ipLimitKey(req.ip);
  if (ipKeyRaw && (await blockedIpsRepo.isBlocked(ipKeyRaw))) {
    return refuse({
      ok: false,
      status: 403,
      body: { error: 'Генерации с вашей сети недоступны. Напишите нам через форму обратной связи.', code: 'BLOCKED' },
    });
  }

  if ((await settingsService.get()).freePaused) {
    return refuse({
      ok: false,
      status: 503,
      body: {
        error: 'Бесплатные генерации временно приостановлены. Оплаченные заказы работают как обычно.',
        code: 'FREE_PAUSED',
      },
    });
  }

  if (!(await checkBudget(kind))) return refuse(paused());

  const remaining = await generationUsageRepo.consume(userId, kind);

  if (remaining === null) {
    return refuse({
      ok: false,
      status: 403,
      body: { error: LIMIT_MESSAGES[kind], code: 'GENERATION_LIMIT', remaining: 0 },
    });
  }

  // Лимит на адрес рассчитан на фарм, а платящий клиент упираться в него не должен
  const ipKey = (await paymentsRepo.hasSucceededForUser(userId)) ? null : ipKeyRaw;

  if (ipKey && (await ipUsageRepo.consume(ipKey, kind, IP_DAILY_LIMITS[kind])) === null) {
    await generationUsageRepo.release(userId, kind);
    return refuse({
      ok: false,
      status: 429,
      body: {
        error:
          'С вашей сети сегодня сделано слишком много бесплатных генераций. Попробуйте завтра — или оформите заказ: после оплаты это ограничение снимается.',
        code: 'IP_LIMIT',
      },
    });
  }

  return {
    ok: true,
    remaining,
    release: async () => {
      await generationUsageRepo.release(userId, kind);
      if (ipKey) await ipUsageRepo.release(ipKey, kind);
    },
    commit: () => recordSpend(kind),
  };
};
