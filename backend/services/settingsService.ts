import { query } from '../db/pool';
import { GENAPI_DAILY_BUDGET_RUB } from '../limits';

// Переключатели, которые админ меняет без деплоя. Env задаёт умолчание,
// строка в app_settings его перекрывает
export interface AppSettings {
  freePaused: boolean;
  dailyBudgetRub: number;
  // Для экономики в аналитике: этого в коде нигде нет, а без них прибыль — фикция
  yookassaFeePct: number;
  taxPct: number;
  monthlyFixedRub: number;
  // Ниже этого остатка на GenAPI — алерт
  genapiBalanceAlertRub: number;
}

export const SETTING_DEFAULTS = (): AppSettings => ({
  freePaused: false,
  dailyBudgetRub: GENAPI_DAILY_BUDGET_RUB,
  yookassaFeePct: 3.5,
  taxPct: 6,
  monthlyFixedRub: 0,
  genapiBalanceAlertRub: 300,
});

// Описание для формы в админке. Тип проверяется при сохранении
export const SETTING_FIELDS: Array<{
  key: keyof AppSettings;
  label: string;
  hint: string;
  type: 'boolean' | 'number';
}> = [
  { key: 'freePaused', label: 'Бесплатные генерации на паузе', hint: 'Оплаченные заказы работают как обычно', type: 'boolean' },
  { key: 'dailyBudgetRub', label: 'Суточный бюджет бесплатного, ₽', hint: 'По смете, сутки по Москве', type: 'number' },
  { key: 'yookassaFeePct', label: 'Комиссия ЮKassa, %', hint: 'По тарифу магазина', type: 'number' },
  { key: 'taxPct', label: 'Налог, % от выручки', hint: 'УСН «доходы» — 6 %', type: 'number' },
  { key: 'monthlyFixedRub', label: 'Постоянные расходы в месяц, ₽', hint: 'Сервер, домен, почта', type: 'number' },
  { key: 'genapiBalanceAlertRub', label: 'Порог алерта по балансу GenAPI, ₽', hint: 'Ниже — письмо-алерт', type: 'number' },
];

// Настройки читаются на каждой бесплатной генерации, поэтому держим копию
// в памяти. Полминуты задержки после правки не страшны
const TTL_MS = 30_000;
let cached: { value: AppSettings; at: number } | null = null;

export const settingsService = {
  async get(): Promise<AppSettings> {
    if (cached && Date.now() - cached.at < TTL_MS) return cached.value;

    const value = SETTING_DEFAULTS();
    try {
      const rows = await query<{ key: string; value: any }>('SELECT key, value FROM app_settings');
      for (const row of rows) {
        const field = SETTING_FIELDS.find((f) => f.key === row.key);
        if (!field || typeof row.value !== field.type) continue;
        (value as any)[row.key] = row.value;
      }
    } catch {
      // База недоступна — живём на умолчаниях
    }

    cached = { value, at: Date.now() };
    return value;
  },

  async set(key: keyof AppSettings, value: boolean | number, by: string): Promise<void> {
    await query(
      `INSERT INTO app_settings (key, value, updated_by) VALUES ($1, $2::jsonb, $3)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now(), updated_by = EXCLUDED.updated_by`,
      [key, JSON.stringify(value), by]
    );
    cached = null;
  },
};
