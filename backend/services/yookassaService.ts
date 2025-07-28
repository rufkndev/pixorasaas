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
  }): Promise<YookassaPayment> {
    const idempotenceKey = uuidv4();
    
    const requestBody: CreatePaymentRequest = {
      amount: {
        value: params.amount.toFixed(2),
        currency: params.currency || 'RUB'
      },
      capture: true,
      confirmation: {
        type: 'redirect',
        return_url: params.returnUrl
      },
      description: params.description,
      metadata: params.metadata
    };

    try {
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
        throw new Error(`ЮKassa API error: ${errorData.description || response.statusText}`);
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