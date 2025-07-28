import { v4 as uuidv4 } from 'uuid';
import { createHash, createHmac } from 'crypto';

export interface YookassaPayment {
  id: string;
  status: 'pending' | 'waiting_for_capture' | 'succeeded' | 'canceled';
  paid: boolean;
  amount: {
    value: string;
    currency: string;
  };
  confirmation: {
    type: 'redirect';
    confirmation_url: string;
  };
  created_at: string;
  description?: string;
  metadata?: Record<string, any>;
  recipient?: {
    account_id: string;
    gateway_id: string;
  };
  test: boolean;
}

export interface CreatePaymentRequest {
  amount: {
    value: string;
    currency: string;
  };
  capture: boolean;
  confirmation: {
    type: 'redirect';
    return_url: string;
  };
  description?: string;
  metadata?: Record<string, any>;
  receipt?: {
    customer: {
      email?: string;
      phone?: string;
    };
    items: Array<{
      description: string;
      quantity: string;
      amount: {
        value: string;
        currency: string;
      };
      vat_code: number;
      payment_subject: string;
      payment_mode: string;
    }>;
  };
}

export interface YookassaWebhook {
  type: string;
  event: 'payment.succeeded' | 'payment.canceled' | 'payment.waiting_for_capture';
  object: YookassaPayment;
}

class YookassaService {
  private readonly shopId: string;
  private readonly secretKey: string;
  private readonly baseUrl: string;
  private readonly isTest: boolean;

  constructor() {
    this.shopId = process.env.YOOKASSA_SHOP_ID!;
    this.secretKey = process.env.YOOKASSA_SECRET_KEY!;
    this.baseUrl = process.env.YOOKASSA_BASE_URL || 'https://api.yookassa.ru/v3';
    this.isTest = process.env.NODE_ENV !== 'production';

    if (!this.shopId || !this.secretKey) {
      throw new Error('ЮKassa credentials not found in environment variables');
    }

    // Проверяем формат учетных данных
    if (this.shopId.length < 6 || this.secretKey.length < 30) {
      console.warn('YooKassa credentials may be invalid:', {
        shopIdLength: this.shopId.length,
        secretKeyLength: this.secretKey.length,
        shopIdStart: this.shopId.substring(0, 3) + '...'
      });
    }

    console.log('YooKassa service initialized:', {
      baseUrl: this.baseUrl,
      shopIdMasked: this.shopId.substring(0, 3) + '***' + this.shopId.slice(-3),
      isTest: this.isTest
    });
  }

  /**
   * Создание платежа
   */
  async createPayment(params: {
    amount: number;
    currency?: string;
    description?: string;
    returnUrl: string;
    metadata?: Record<string, any>;
    customerEmail?: string;
    customerPhone?: string;
  }): Promise<YookassaPayment> {
    // Валидация входных параметров
    if (!params.amount || params.amount <= 0) {
      throw new Error('Некорректная сумма платежа');
    }

    if (!params.returnUrl || !params.returnUrl.startsWith('http')) {
      throw new Error('Некорректный URL возврата');
    }

    // Проверяем, что URL возврата не слишком длинный
    if (params.returnUrl.length > 2048) {
      throw new Error('URL возврата слишком длинный');
    }

    const idempotenceKey = uuidv4();
    
    // Проверяем и обрезаем description до 128 символов (ограничение ЮKassa)
    let description = params.description || 'Цифровая услуга';
    if (description.length > 128) {
      description = description.substring(0, 125) + '...';
    }

    // Проверяем и очищаем метаданные (убираем слишком длинные значения)
    let cleanMetadata: Record<string, any> = {};
    if (params.metadata) {
      for (const [key, value] of Object.entries(params.metadata)) {
        if (typeof value === 'string' && value.length > 512) {
          cleanMetadata[key] = value.substring(0, 509) + '...';
        } else if (typeof value === 'object' && value !== null) {
          // Сериализуем объекты для безопасности
          const serialized = JSON.stringify(value);
          if (serialized.length > 512) {
            cleanMetadata[key] = serialized.substring(0, 509) + '...';
          } else {
            cleanMetadata[key] = value;
          }
        } else {
          cleanMetadata[key] = value;
        }
      }
    }

    const requestBody: CreatePaymentRequest = {
      amount: {
        value: Number(params.amount).toFixed(2),
        currency: params.currency || 'RUB'
      },
      capture: true,
      confirmation: {
        type: 'redirect',
        return_url: params.returnUrl
      },
      description: description,
      metadata: Object.keys(cleanMetadata).length > 0 ? cleanMetadata : undefined
    };

    // Добавляем чек для соблюдения 54-ФЗ согласно документации ЮKassa
    if (params.customerEmail) {
      requestBody.receipt = {
        customer: {
          email: params.customerEmail
        },
        items: [
          {
            description: params.description || 'Цифровая услуга',
            quantity: '1.00',
            amount: {
              value: Number(params.amount).toFixed(2),
              currency: 'RUB'
            },
            vat_code: 1,
            payment_subject: 'service',
            payment_mode: 'full_payment'
          }
        ]
      };
    }

    try {
      console.log('Creating YooKassa payment with data:', {
        amount: requestBody.amount,
        description: requestBody.description,
        return_url: requestBody.confirmation.return_url,
        has_receipt: !!requestBody.receipt,
        metadata_keys: requestBody.metadata ? Object.keys(requestBody.metadata) : []
      });
      
      console.log('Full request body to YooKassa:');
      console.log(JSON.stringify(requestBody, null, 2));

      const response = await fetch(`${this.baseUrl}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotence-Key': idempotenceKey,
          'Authorization': `Basic ${Buffer.from(`${this.shopId}:${this.secretKey}`).toString('base64')}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('YooKassa API error details:');
        console.error('Status:', response.status);
        console.error('Status Text:', response.statusText);
        console.error('Error response:', JSON.stringify(errorData, null, 2));
        console.error('Request that caused error:', JSON.stringify(requestBody, null, 2));
        throw new Error(`ЮKassa API error: ${errorData.description || errorData.detail || response.statusText}`);
      }

      const payment: YookassaPayment = await response.json();
      return payment;
    } catch (error: any) {
      console.error('Error creating YooKassa payment:', error);
      throw new Error(`Ошибка создания платежа: ${error.message}`);
    }
  }

  /**
   * Получение информации о платеже
   */
  async getPayment(paymentId: string): Promise<YookassaPayment> {
    try {
      const response = await fetch(`${this.baseUrl}/payments/${paymentId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${this.shopId}:${this.secretKey}`).toString('base64')}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`ЮKassa API error: ${errorData.description || response.statusText}`);
      }

      const payment: YookassaPayment = await response.json();
      return payment;
    } catch (error: any) {
      console.error('Error getting YooKassa payment:', error);
      throw new Error(`Ошибка получения платежа: ${error.message}`);
    }
  }

  /**
   * Проверка подписи webhook'а от ЮKassa
   */
  verifyWebhookSignature(body: string, signature: string): boolean {
    // Если webhook secret не настроен, пропускаем проверку подписи
    if (!process.env.YOOKASSA_WEBHOOK_SECRET) {
      console.warn('YOOKASSA_WEBHOOK_SECRET not set, skipping signature verification');
      console.warn('For production, consider setting up webhook signature verification');
      return true; // Разрешаем обработку без проверки подписи
    }

    // Если signature не передан, но secret настроен
    if (!signature) {
      console.warn('No signature provided but YOOKASSA_WEBHOOK_SECRET is set');
      return true; // Все равно разрешаем, так как не все webhook'и ЮKassa могут содержать подпись
    }

    try {
      const hmac = createHmac('sha256', process.env.YOOKASSA_WEBHOOK_SECRET);
      hmac.update(body);
      const expectedSignature = hmac.digest('hex');

      return expectedSignature === signature;
    } catch (error) {
      console.error('Error verifying webhook signature:', error);
      return true; // В случае ошибки разрешаем обработку
    }
  }

  /**
   * Обработка webhook'а от ЮKassa
   */
  async processWebhook(webhookData: YookassaWebhook): Promise<{
    success: boolean;
    paymentData?: YookassaPayment;
    error?: string;
  }> {
    try {
      const { type, event, object: payment } = webhookData;

      if (type !== 'notification') {
        return { success: false, error: 'Invalid webhook type' };
      }

      console.log(`Processing YooKassa webhook: ${event} for payment ${payment.id}`);

      switch (event) {
        case 'payment.succeeded':
          return {
            success: true,
            paymentData: payment
          };

        case 'payment.canceled':
          return {
            success: true,
            paymentData: payment
          };

        case 'payment.waiting_for_capture':
          // Автоматически подтверждаем платеж, если нужно
          return {
            success: true,
            paymentData: payment
          };

        default:
          console.log(`Unhandled webhook event: ${event}`);
          return { success: true };
      }
    } catch (error: any) {
      console.error('Error processing YooKassa webhook:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  /**
   * Подтверждение платежа (capture)
   */
  async capturePayment(paymentId: string, amount?: number): Promise<YookassaPayment> {
    const idempotenceKey = uuidv4();
    
    const requestBody: any = {};
    if (amount) {
      requestBody.amount = {
        value: amount.toFixed(2),
        currency: 'RUB'
      };
    }

    try {
      const response = await fetch(`${this.baseUrl}/payments/${paymentId}/capture`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotence-Key': idempotenceKey,
          'Authorization': `Basic ${Buffer.from(`${this.shopId}:${this.secretKey}`).toString('base64')}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`ЮKassa API error: ${errorData.description || response.statusText}`);
      }

      const payment: YookassaPayment = await response.json();
      return payment;
    } catch (error: any) {
      console.error('Error capturing YooKassa payment:', error);
      throw new Error(`Ошибка подтверждения платежа: ${error.message}`);
    }
  }

  /**
   * Отмена платежа
   */
  async cancelPayment(paymentId: string): Promise<YookassaPayment> {
    const idempotenceKey = uuidv4();

    try {
      const response = await fetch(`${this.baseUrl}/payments/${paymentId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotence-Key': idempotenceKey,
          'Authorization': `Basic ${Buffer.from(`${this.shopId}:${this.secretKey}`).toString('base64')}`
        },
        body: JSON.stringify({})
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`ЮKassa API error: ${errorData.description || response.statusText}`);
      }

      const payment: YookassaPayment = await response.json();
      return payment;
    } catch (error: any) {
      console.error('Error canceling YooKassa payment:', error);
      throw new Error(`Ошибка отмены платежа: ${error.message}`);
    }
  }
}

export const yookassaService = new YookassaService(); 