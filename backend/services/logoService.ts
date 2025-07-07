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

export interface LogoVariant {
  name: string;
  url: string;
  description: string;
  type: string;
  usage: string;
  filter?: string;
  text?: string;
  font?: string;
}

// Сервис для генерации логотипов
export class LogoService {
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

  // Генерация логотипа
  async generateLogo(businessName: string, keywords: string, industry: string): Promise<string> {
    const prompt = this.createLogoPrompt(businessName, keywords, industry);
    
    const initialResponse = await axios.post(`${this.baseUrl}/networks/dalle-3`, {
      prompt: prompt,
      size: "1024x1024",
      quality: "hd"
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      }
    });
    
    if (!initialResponse.data?.request_id) {
      throw new Error('Invalid response from GenAPI: missing request_id');
    }
    
    // Используем больше попыток для генерации изображений (они дольше обрабатываются)
    const generationResult = await this.waitForResult(initialResponse.data.request_id, 120, 5000);
    const logoUrl = this.extractLogoUrl(generationResult);
    
    if (!logoUrl) {
      throw new Error('Logo URL not found in API response');
    }
    
    return logoUrl;
  }

  // Создание промпта для логотипа
  private createLogoPrompt(name: string, keywords: string, industry: string): string {
    const formattedKeywords = keywords.split(',')
      .map(k => k.trim())
      .filter(k => k.length > 0)
      .join(', ');
    
    return `Create a minimalist, modern logo design for a business named "${name}" in the ${industry} sector.
The logo must:
- Be clean, abstract, and geometric
- Fill the entire square frame (no excessive whitespace)
- Use clever negative space, no gradients or shadows
- Be iconic and recognizable at small sizes
- Have a professional color palette that reflects ${formattedKeywords}
- Appear centered on a pure white square canvas
- Be a finalized, polished logo — not in progress
Vector-style digital rendering only.  
**Do not include** hands, people, text, handwriting, drawing tools, or any illustrative elements.
`;
  }

  // Извлечение URL логотипа из ответа
  private extractLogoUrl(response: GeneratedResponse): string | null {
    // Проверяем прямые свойства
    const directUrls = [
      response.output,
      response.result?.output,
      response.result?.images?.[0],
      response.images?.[0],
      response.image_url,
      response.url
    ];
    
    for (const url of directUrls) {
      if (url && this.isImageUrl(url)) {
        return url;
      }
    }
    
    // Рекурсивный поиск
    return this.findImageUrl(response);
  }

  // Проверка, является ли строка URL изображения
  private isImageUrl(value: any): boolean {
    if (typeof value !== 'string') return false;
    return value.startsWith('http') && 
           (value.endsWith('.png') || 
            value.endsWith('.jpg') || 
            value.endsWith('.jpeg') || 
            value.endsWith('.webp') || 
            value.endsWith('.gif') || 
            value.includes('images.gen-api.ru'));
  }

  // Рекурсивный поиск URL изображения
  private findImageUrl(obj: any, depth: number = 0): string | null {
    if (depth > 5 || !obj || typeof obj !== 'object') return null;
    
    // Проверяем известные ключи
    const knownKeys = ['output', 'url', 'image_url', 'image', 'img', 'src', 'source', 'link'];
    for (const key of knownKeys) {
      if (obj[key] && this.isImageUrl(obj[key])) {
        return obj[key];
      }
    }
    
    // Проверяем массивы
    const arrayKeys = ['images', 'outputs', 'results', 'data'];
    for (const key of arrayKeys) {
      if (Array.isArray(obj[key])) {
        for (const item of obj[key]) {
          if (this.isImageUrl(item)) {
            return item;
          }
          if (typeof item === 'object' && item !== null) {
            const nestedUrl = this.findImageUrl(item, depth + 1);
            if (nestedUrl) return nestedUrl;
          }
        }
      }
    }
    
    // Проверяем все остальные свойства
    for (const key in obj) {
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        const nestedUrl = this.findImageUrl(obj[key], depth + 1);
        if (nestedUrl) return nestedUrl;
      }
    }
    
    return null;
  }
}

// Ленивая инициализация - создаем экземпляр только при первом вызове
let logoServiceInstance: LogoService | null = null;

export const getLogoService = (): LogoService => {
  if (!logoServiceInstance) {
    logoServiceInstance = new LogoService();
  }
  return logoServiceInstance;
};

// Для обратной совместимости
export const logoService = {
  generateLogo: (businessName: string, keywords: string, industry: string) => 
    getLogoService().generateLogo(businessName, keywords, industry)
}; 