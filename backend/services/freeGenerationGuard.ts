import { Request } from 'express';

import {
  GenerationKind,
  generationUsageRepo,
  ipUsageRepo,
  paymentsRepo,
  spendRepo,
} from '../db/repositories';
import {
  ESTIMATED_COST_RUB,
  FREE_SPEND_KINDS,
  GENAPI_DAILY_BUDGET_RUB,
  IP_DAILY_LIMITS,
  SpendKind,
} from '../limits';
import { ipLimitKey } from '../utils/ipRange';
import { alertService } from './alertService';
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
  const spent = await spendRepo.todayTotal(FREE_SPEND_KINDS);

  if (spent + ESTIMATED_COST_RUB[kind] <= GENAPI_DAILY_BUDGET_RUB) return true;

  await alertService.notify(
    'budget',
    'Исчерпан суточный бюджет бесплатных генераций',
    `Потрачено по смете ${spent.toFixed(2)} ₽ из ${GENAPI_DAILY_BUDGET_RUB} ₽.\n` +
      'Бесплатные генерации на паузе до полуночи по Москве. Если это наплыв живых ' +
      'людей, поднимите GENAPI_DAILY_BUDGET_RUB; если фарм — смотрите ip_generation_usage.'
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

  if (!(await checkBudget(kind))) return paused();

  const remaining = await generationUsageRepo.consume(userId, kind);

  if (remaining === null) {
    return {
      ok: false,
      status: 403,
      body: { error: LIMIT_MESSAGES[kind], code: 'GENERATION_LIMIT', remaining: 0 },
    };
  }

  // Лимит на адрес рассчитан на фарм, а платящий клиент упираться в него не должен
  const ipKey = (await paymentsRepo.hasSucceededForUser(userId)) ? null : ipLimitKey(req.ip);

  if (ipKey && (await ipUsageRepo.consume(ipKey, kind, IP_DAILY_LIMITS[kind])) === null) {
    await generationUsageRepo.release(userId, kind);
    return {
      ok: false,
      status: 429,
      body: {
        error:
          'С вашей сети сегодня сделано слишком много бесплатных генераций. Попробуйте завтра — или оформите заказ: после оплаты это ограничение снимается.',
        code: 'IP_LIMIT',
      },
    };
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
