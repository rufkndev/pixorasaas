import axios from 'axios';

// Интерфейсы для типизации
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

// Сервис для генерации названий
export class NameService {
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
      try {
        const statusUrl = `${this.baseUrl}/request/get/${requestId}`;
        console.log(`Checking request status (attempt ${attempt + 1}/${maxAttempts}): ${statusUrl}`);
        
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
      } catch (error: any) {
        console.error(`Error checking request status (attempt ${attempt + 1}):`, error.message);
        
        if (attempt === maxAttempts - 1) {
          throw error;
        }
        
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
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

  // Генерация названий компаний
  async generateNames(industry: string, keywords: string, style: string, preferences?: string): Promise<string[]> {
    const prompt = `Сгенерируй 6 уникальных и креативных названий для бизнеса в нише "${industry}". 
    Используй следующие ключевые слова: ${keywords}. 
    Стиль названий должен быть: ${style}. 
    Дополнительные пожелания: ${preferences || 'нет'}. 
    Названия должны быть краткими, запоминающимися и уникальными. 
    Верни только список названий, каждое название с новой строки, без нумерации и дополнительных пояснений.`;

    const initialResponse = await axios.post(`${this.baseUrl}/networks/gpt-4o`, {
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 200
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      }
    });

    if (!initialResponse.data.request_id) {
      throw new Error('No request_id in response');
    }

    const completedResponse = await this.waitForResult(initialResponse.data.request_id);
    const generatedText = this.extractTextFromResponse(completedResponse);
    
    const generatedNames = generatedText
      .split('\n')
      .map(name => name.trim())
      .filter(name => name.length > 0);

    if (generatedNames.length === 0) {
      throw new Error('No names were generated');
    }

    return generatedNames;
  }
}

// Ленивая инициализация - создаем экземпляр только при первом вызове
let nameServiceInstance: NameService | null = null;

export const getNameService = (): NameService => {
  if (!nameServiceInstance) {
    nameServiceInstance = new NameService();
  }
  return nameServiceInstance;
};

// Для обратной совместимости
export const nameService = {
  generateNames: (industry: string, keywords: string, style: string, preferences?: string) => 
    getNameService().generateNames(industry, keywords, style, preferences)
}; 