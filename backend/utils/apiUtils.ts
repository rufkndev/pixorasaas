import axios from 'axios';
import { log } from '../logger';
import { recordGenapiCall } from '../monitoring/genapiCalls';

export interface GeneratedResponse {
  request_id?: string;
  status?: string;
  result?: any;
  full_response?: any[];
  choices?: any[];
  output?: string;
  images?: string[];
  image_url?: string;
  url?: string;
  [key: string]: any;
}

export class ApiUtils {
  private apiKey: string;
  private baseUrl = 'https://api.gen-api.ru/api/v1';

  constructor() {
    this.apiKey = process.env.GENAPI_KEY || '';
  }

  // Постановка задачи плюс опрос. Все вызовы идут здесь, чтобы каждый попал
  // в учёт: модель, длительность, исход и смета для аналитики
  async run(model: string, label: string, body: unknown): Promise<GeneratedResponse> {
    const started = Date.now();

    try {
      // FormData уходит со своим заголовком, иначе потеряется boundary
      const headers: Record<string, string> = { Authorization: `Bearer ${this.getApiKey()}` };
      if (!(body instanceof FormData)) headers['Content-Type'] = 'application/json';

      const initial = await axios.post(`${this.baseUrl}/networks/${model}`, body, { headers });
      const result = await this.waitForResult(initial.data.request_id);

      void recordGenapiCall({ model, label, ok: true, durationMs: Date.now() - started });
      return result;
    } catch (error: any) {
      void recordGenapiCall({ model, label, ok: false, durationMs: Date.now() - started, error: error.message });
      throw error;
    }
  }

  // GenAPI отвечает асинхронно: опрашиваем задачу, пока не будет готова.
  // Умолчание с запасом: генерация картинки занимает 15-30 секунд, а текст
  // с рассуждением бывает и дольше
  async waitForResult(requestId: string, maxAttempts: number = 60, delayMs: number = 3000): Promise<GeneratedResponse> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      let data: GeneratedResponse | null = null;

      try {
        const response = await axios.get(`${this.baseUrl}/request/get/${requestId}`, {
          headers: { 'Authorization': `Bearer ${this.getApiKey()}` }
        });
        data = response.data;
      } catch (error: any) {
        // Разовый обрыв связи не повод терять уже оплаченную генерацию:
        // сдаёмся только на последней попытке
        if (attempt === maxAttempts - 1) throw error;
        log.error(`Опрос GenAPI не удался (попытка ${attempt + 1}):`, error.message);
      }

      // Отказ самой задачи разбирается вне catch: иначе собственный throw
      // попадал бы в него же и задача опрашивалась ещё шестьдесят раз
      if (data) {
        const status = (data.status || data.state || 'processing').toLowerCase();

        if (['success', 'done', 'completed', 'finished', 'ready'].includes(status)) {
          return data;
        }

        if (['failed', 'error', 'failure', 'rejected'].includes(status)) {
          const reason = Array.isArray(data.result) ? data.result[0] : data.status;
          throw new Error(`GenAPI отказал: ${reason}`);
        }
      }

      await new Promise(resolve => setTimeout(resolve, delayMs));
    }

    throw new Error(`Timeout waiting for GenAPI result after ${maxAttempts} attempts`);
  }

  extractTextFromResponse(response: GeneratedResponse): string {
    // Формат ответа зависит от линейки: gpt-4o кладёт текст в full_response[0].message,
    // линейка gpt-5 — в result[0].choices[0].message. Последний источник склеивает
    // только массив строк: массив объектов превращался в «[object Object]»
    const textSources = [
      () => response.result?.[0]?.choices?.[0]?.message?.content,
      () => response.full_response?.[0]?.choices?.[0]?.message?.content,
      () => response.full_response?.[0]?.message?.content,
      () => response.result?.choices?.[0]?.message?.content,
      () => response.result?.text,
      () => typeof response.result === 'string' ? response.result : null,
      () => Array.isArray(response.result) && response.result.every(item => typeof item === 'string')
        ? response.result.join('\n')
        : null
    ];
    
    for (const getSource of textSources) {
      const text = getSource();
      if (text && typeof text === 'string') {
        return text;
      }
    }
    
    throw new Error(`Could not extract text from response: ${JSON.stringify(response)}`);
  }

  // Ключ берётся лениво: модуль импортируется раньше, чем loadEnv успевает
  // прочитать .env.local, и в конструкторе он ещё пустой
  getApiKey(): string {
    if (!this.apiKey) {
      this.apiKey = process.env.GENAPI_KEY || '';
    }
    return this.apiKey;
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }
}

export const apiUtils = new ApiUtils(); 