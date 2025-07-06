import axios from 'axios';

// Интерфейс для ответа от GenAPI
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

// Базовые методы для работы с API
export class ApiUtils {
  private apiKey: string;
  private baseUrl = 'https://api.gen-api.ru/api/v1';

  constructor() {
    this.apiKey = process.env.GENAPI_KEY || '';
    if (!this.apiKey) {
      console.error('GENAPI_KEY is missing!');
    }
  }

  // Универсальная функция ожидания результата
  async waitForResult(requestId: string, maxAttempts: number = 20, delayMs: number = 1500): Promise<GeneratedResponse> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const statusUrl = `${this.baseUrl}/request/get/${requestId}`;
      
      const response = await axios.get(statusUrl, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` }
      });
      
      const status = response.data.status || response.data.state || 'processing';
      
      if (['success', 'done', 'completed', 'finished', 'ready'].includes(status.toLowerCase())) {
        return response.data;
      } 
      
      if (['failed', 'error', 'failure', 'rejected'].includes(status.toLowerCase())) {
        throw new Error(`GenAPI request failed: ${JSON.stringify(response.data)}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
    
    throw new Error(`Timeout waiting for GenAPI result after ${maxAttempts} attempts`);
  }

  // Извлечение текста из ответа GenAPI
  extractTextFromResponse(response: GeneratedResponse): string {
    // Проверяем наиболее вероятные места расположения текста
    const textSources = [
      () => response.full_response?.[0]?.message?.content,
      () => response.result?.choices?.[0]?.message?.content,
      () => response.result?.text,
      () => typeof response.result === 'string' ? response.result : null,
      () => Array.isArray(response.result) ? response.result.join('\n') : null
    ];
    
    for (const getSource of textSources) {
      const text = getSource();
      if (text && typeof text === 'string') {
        return text;
      }
    }
    
    throw new Error(`Could not extract text from response: ${JSON.stringify(response)}`);
  }

  // Получение API ключа
  getApiKey(): string {
    return this.apiKey;
  }

  // Получение базового URL
  getBaseUrl(): string {
    return this.baseUrl;
  }
}

// Экспорт экземпляра для переиспользования
export const apiUtils = new ApiUtils(); 