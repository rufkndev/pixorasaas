import axios from 'axios';
import { z } from 'zod';

import { apiUtils } from './apiUtils';

// Одна модель на весь брендинг: названия, концепция логотипа, слоган, рекомендации.
// Слаги GenAPI пишутся через дефис и без точек, неизвестное имя даёт 404 на POST.
export const BRAND_MODEL = 'gpt-5-6-luna';

export interface LlmRequest {
  // Идёт в логи: «слоган», «рекомендации» — чтобы по сбою было видно, что упало
  label: string;
  prompt: string;
  system?: string;
  model?: string;
  maxTokens?: number;
}

// У линейки gpt-5 параметр называется max_completion_tokens, и запас нужен
// с учётом токенов на рассуждение: иначе на видимый ответ ничего не остаётся
const post = async (req: LlmRequest): Promise<string | null> => {
  const messages = req.system
    ? [
        { role: 'system', content: req.system },
        { role: 'user', content: req.prompt },
      ]
    : [{ role: 'user', content: req.prompt }];

  const initial = await axios.post(
    `${apiUtils.getBaseUrl()}/networks/${req.model || BRAND_MODEL}`,
    { messages, max_completion_tokens: req.maxTokens || 1200 },
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiUtils.getApiKey()}`,
      },
    }
  );

  const completed = await apiUtils.waitForResult(initial.data.request_id);
  const text = apiUtils.extractTextFromResponse(completed);

  return text ? text.trim() : null;
};

// Возвращает null вместо исключения: вызывающий обязан иметь запасной вариант,
// иначе один сбой модели рушит уже оплаченный заказ
export const requestText = async (req: LlmRequest): Promise<string | null> => {
  try {
    return await post(req);
  } catch (error: any) {
    console.error(`Модель не ответила (${req.label}):`, error.message);
    return null;
  }
};

// Модель периодически заворачивает JSON в ```-блок или дописывает пояснение
// до и после, поэтому берём кусок по крайним фигурным скобкам
const sliceJson = (raw: string): string | null => {
  const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');

  return start === -1 || end <= start ? null : cleaned.slice(start, end + 1);
};

export const requestJson = async <T>(
  req: LlmRequest & { schema: z.ZodType<T> }
): Promise<T | null> => {
  const raw = await requestText(req);
  if (!raw) return null;

  const json = sliceJson(raw);

  if (!json) {
    console.error(`Ответ без JSON (${req.label}):`, raw.slice(0, 200));
    return null;
  }

  try {
    return req.schema.parse(JSON.parse(json));
  } catch (error: any) {
    console.error(`Ответ не прошёл разбор (${req.label}):`, error.message);
    return null;
  }
};

// Ограничивать длину полей нужно и схемой, и здесь: max() в схеме отбраковал бы
// весь объект из-за одной длинной строки, а вёрстку полосы ломает любая
export const clamp = (value: string, limit: number): string => {
  const trimmed = value.trim();
  return trimmed.length <= limit ? trimmed : `${trimmed.slice(0, limit - 1).trimEnd()}…`;
};
