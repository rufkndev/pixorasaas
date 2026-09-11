// Клиент API ЮKassa для сценария «Умный платёж»: способ оплаты мы не передаём,
// пользователь выбирает его сам на форме ЮKassa.
// https://yookassa.ru/developers/payment-acceptance/integration-scenarios/smart-payment

import { ipInAnyCidr } from '../utils/ipRange';

export type PaymentStatus = 'pending' | 'waiting_for_capture' | 'succeeded' | 'canceled';

export interface YookassaPayment {
  id: string;
  status: PaymentStatus;
  paid: boolean;
  amount: { value: string; currency: string };
  confirmation?: { type: string; confirmation_url?: string };
  created_at: string;
  captured_at?: string;
  description?: string;
  metadata?: Record<string, string>;
  cancellation_details?: { party: string; reason: string };
  test: boolean;
}

export interface YookassaNotification {
  type: string;
  event: string;
  object: { id?: string; metadata?: Record<string, string> };
}

export interface ReceiptItem {
  description: string;
  quantity: string;
  amount: { value: string; currency: string };
  vat_code: number;
  payment_subject: string;
  payment_mode: string;
}

// Адреса, с которых ЮKassa шлёт уведомления. Подписи у вебхука нет, поэтому
// подлинность проверяется адресом отправителя плюс перезапросом платежа.
// https://yookassa.ru/developers/using-api/webhooks
const NOTIFICATION_IPS = [
  '185.71.76.0/27',
  '185.71.77.0/27',
  '77.75.153.0/25',
  '77.75.156.11',
  '77.75.156.35',
  '77.75.154.128/25',
  '2a02:5180::/32',
] as const;

const API_TIMEOUT_MS = 20_000;
const MAX_ATTEMPTS = 3;

// ЮKassa режет описание платежа и наименование товара в чеке на 128 символах
const MAX_DESCRIPTION = 128;

export const trimDescription = (text: string): string =>
  text.length > MAX_DESCRIPTION ? `${text.slice(0, MAX_DESCRIPTION - 1)}…` : text;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class YookassaError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly code?: string
  ) {
    super(message);
    this.name = 'YookassaError';
  }
}

class YookassaService {
  private readonly baseUrl = (process.env.YOOKASSA_BASE_URL || 'https://api.yookassa.ru/v3')
    .replace(/\/+$/, '');

  // Ключи читаются лениво: раньше конструктор бросал исключение на импорте
  // и без настроенной ЮKassa не поднимался вообще весь бэкенд
  private authHeader(): string {
    const shopId = process.env.YOOKASSA_SHOP_ID;
    const secretKey = process.env.YOOKASSA_SECRET_KEY;

    if (!shopId || !secretKey) {
      throw new YookassaError('ЮKassa не настроена: нет YOOKASSA_SHOP_ID или YOOKASSA_SECRET_KEY');
    }

    return `Basic ${Buffer.from(`${shopId}:${secretKey}`).toString('base64')}`;
  }

  // Повтор с тем же Idempotence-Key безопасен: ЮKassa вернёт тот же платёж,
  // а не создаст второй. Поэтому сеть и 5xx можно спокойно перезапрашивать.
  private async request<T>(
    path: string,
    init: { method: 'GET' | 'POST'; body?: unknown; idempotenceKey?: string }
  ): Promise<T> {
    const headers: Record<string, string> = { Authorization: this.authHeader() };

    if (init.body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }
    if (init.idempotenceKey) {
      headers['Idempotence-Key'] = init.idempotenceKey;
    }

    let lastError: Error = new YookassaError('ЮKassa не ответила');

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const response = await fetch(`${this.baseUrl}${path}`, {
          method: init.method,
          headers,
          body: init.body === undefined ? undefined : JSON.stringify(init.body),
          signal: AbortSignal.timeout(API_TIMEOUT_MS),
        });

        if (response.ok) {
          return (await response.json()) as T;
        }

        const details = await response.json().catch(() => ({}) as any);
        const error = new YookassaError(
          details.description || details.detail || response.statusText,
          response.status,
          details.code
        );

        // 4xx означает, что запрос неверен сам по себе — повтор не поможет
        if (response.status < 500 && response.status !== 429) throw error;
        lastError = error;
      } catch (error: any) {
        if (error instanceof YookassaError && error.status && error.status < 500) throw error;
        lastError = error;
      }

      if (attempt < MAX_ATTEMPTS) await sleep(attempt * 500);
    }

    throw new YookassaError(`ЮKassa недоступна: ${lastError.message}`);
  }

  async createPayment(params: {
    amount: number;
    currency: string;
    description: string;
    returnUrl: string;
    idempotenceKey: string;
    metadata: Record<string, string>;
    receiptEmail: string;
    receiptPhone?: string;
    receiptItems: ReceiptItem[];
  }): Promise<YookassaPayment> {
    const body = {
      amount: {
        value: params.amount.toFixed(2),
        currency: params.currency,
      },
      // Одностадийный платёж: деньги списываются сразу, подтверждать нечего
      capture: true,
      confirmation: {
        type: 'redirect',
        return_url: params.returnUrl,
      },
      description: trimDescription(params.description),
      metadata: params.metadata,
      // Чек обязателен по 54-ФЗ, без email его некуда отправить
      receipt: {
        customer: {
          email: params.receiptEmail,
          ...(params.receiptPhone ? { phone: params.receiptPhone } : {}),
        },
        items: params.receiptItems,
      },
    };

    const payment = await this.request<YookassaPayment>('/payments', {
      method: 'POST',
      body,
      idempotenceKey: params.idempotenceKey,
    });

    if (!payment.confirmation?.confirmation_url) {
      throw new YookassaError('ЮKassa не вернула ссылку на оплату');
    }

    return payment;
  }

  async getPayment(paymentId: string): Promise<YookassaPayment> {
    return this.request<YookassaPayment>(`/payments/${encodeURIComponent(paymentId)}`, {
      method: 'GET',
    });
  }

  isNotificationIp(ip: string | undefined): boolean {
    if (!ip) return false;
    return ipInAnyCidr(ip, NOTIFICATION_IPS);
  }
}

export const yookassaService = new YookassaService();
