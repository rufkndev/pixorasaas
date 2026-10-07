import axios from 'axios';
import { z } from 'zod';

import { apiUtils } from '../../utils/apiUtils';
import { CLIENT_DATA_RULE, clientData } from '../../utils/llmJson';
import { LogoPattern, pickPattern, pickVector } from '../../utils/logoPatterns';
import { getStyleProfile } from '../../utils/styleLabels';
import { log } from '../../logger';

const MODEL = 'gpt-5-6-luna';

export interface LogoConcept {
  pattern: LogoPattern;
  vector: string;
  // Что именно нарисовано, одним существительным — по нему же отсеиваем повторы
  subject: string;
  // Как знак построен, для картинной модели
  concept: string;
  palette: string[];
  monogram?: string;
}

// Ограничения только там, где они защищают промпт. На monogram их нет вовсе:
// модель пишет туда пояснение вместо букв, и любой max отбраковывал концепцию
// целиком из-за необязательного поля — хороший знак заменялся фолбэком
const conceptSchema = z.object({
  subject: z.string().min(2).max(80),
  concept: z.string().min(15).max(600),
  palette: z.array(z.string().regex(/^#[0-9a-fA-F]{6}$/)).min(1).max(4),
  monogram: z.unknown().optional(),
});

// Слова, которыми модель отделывается вместо конкретного предмета
const VAGUE = ['abstract', 'shape', 'form', 'symbol', 'swoosh', 'wave', 'element', 'design', 'mark'];

export class ConceptService {
  private baseUrl = apiUtils.getBaseUrl();

  async createConcept(
    name: string,
    keywords: string,
    industry: string,
    style: string,
    usedPatterns: string[] = [],
    usedSubjects: string[] = []
  ): Promise<LogoConcept> {
    const profile = getStyleProfile(style);
    const pattern = pickPattern(profile.logoPatterns, usedPatterns);
    const vector = pickVector();

    const brief = this.buildBrief(name, keywords, industry, pattern, vector, style, usedSubjects);

    try {
      const initial = await axios.post(
        `${this.baseUrl}/networks/${MODEL}`,
        { messages: [{ role: 'user', content: brief }], max_completion_tokens: 900 },
        { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiUtils.getApiKey()}` } }
      );

      const completed = await apiUtils.waitForResult(initial.data.request_id);
      const parsed = this.parse(apiUtils.extractTextFromResponse(completed));

      if (parsed) {
        return { pattern, vector, ...parsed };
      }
    } catch (error: any) {
      log.error('Не удалось получить концепцию логотипа:', error.message);
    }

    return { pattern, vector, ...this.fallback(pattern, industry, keywords) };
  }

  private buildBrief(
    name: string,
    keywords: string,
    industry: string,
    pattern: LogoPattern,
    vector: string,
    style: string,
    usedSubjects: string[]
  ): string {
    const profile = getStyleProfile(style);

    const lines = [
      'Ты арт-директор брендингового агентства. Придумай логотип для конкретной компании.',
      CLIENT_DATA_RULE,
      '',
      clientData([
        ['Название', name],
        ['Ниша', industry],
        ['Ключевые слова', keywords],
      ]),
      `Характер: ${profile.tone}`,
      `Палитра: ${profile.logoPalette}`,
      '',
      `Приём: ${pattern.label}. ${pattern.instruction}`,
      `Творческая задача: ${vector}.`,
      '',
      'Требования:',
      '- subject — то, что нарисовано, одним-двумя английскими существительными.',
      '  Это должен быть называемый предмет, а не «фигура» и не «форма».',
      '- Знак должен быть связан именно с этой компанией: с её нишей, названием или тем, что она делает.',
      '- concept — по-английски, 25-40 слов: из каких форм собран знак и как они соединены.',
      '- Это логотип, а не иллюстрация: 2-3 сплошные формы, вид строго спереди.',
      '  Не описывай штриховку, тени, объём, перспективу, блики и мелкие детали.',
      '- palette — ровно 2 цвета в формате #rrggbb.',
    ];

    if (pattern.id === 'lettermark' || pattern.id === 'emblem') {
      lines.push('- monogram — 1-2 латинские буквы для названия из данных клиента (транслитерируй первую букву).');
    }

    if (usedSubjects.length > 0) {
      lines.push(
        '',
        `Уже показано клиенту, повторять нельзя: ${usedSubjects.join(', ')}.`,
        'Придумай принципиально другой предмет, а не вариацию прежнего.'
      );
    }

    lines.push(
      '',
      `Слова ${VAGUE.join(', ')} в поле subject запрещены.`,
      'Ответ — только JSON вида {"subject":"","concept":"","palette":["#000000"],"monogram":""}.',
      'Без markdown, без пояснений.'
    );

    return lines.join('\n');
  }

  private parse(raw: string): Omit<LogoConcept, 'pattern' | 'vector'> | null {
    // Модель периодически оборачивает JSON в ```json, несмотря на запрет
    const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');

    if (start === -1 || end <= start) return null;

    try {
      const parsed = conceptSchema.parse(JSON.parse(cleaned.slice(start, end + 1)));
      const subject = parsed.subject.trim().toLowerCase();

      // Отговорка вместо предмета — лучше уйти в фолбэк, там хотя бы ниша названа
      if (VAGUE.some((word) => subject === word || subject.endsWith(` ${word}`))) {
        return null;
      }

      return {
        subject: parsed.subject.trim(),
        concept: parsed.concept.trim(),
        palette: parsed.palette.slice(0, 2),
        // Модель охотно пишет сюда пояснение вместо букв — берём только буквы
        monogram:
          (typeof parsed.monogram === 'string' ? parsed.monogram : '')
            .replace(/[^A-Za-z]/g, '')
            .slice(0, 2)
            .toUpperCase() || undefined,
      };
    } catch (error: any) {
      log.error('Концепция логотипа не разобралась:', error.message);
      return null;
    }
  }

  // Без концепции логотип хуже, но генерация не должна падать.
  // Русский текст сюда попадать не должен: он уходит в английский промпт
  // картинной модели и та начинает рисовать надписи вместо знака
  private fallback(pattern: LogoPattern, industry: string, keywords: string) {
    const hint = [industry, keywords]
      .filter(Boolean)
      .join(', ')
      .slice(0, 60);

    return {
      subject: 'craft tool',
      concept:
        `A clear ${pattern.label} built from two solid flat shapes, front view, no shading.` +
        (hint ? ` The business works with: ${hint}.` : ''),
      palette: ['#0b264e', '#d4a017'],
      monogram: undefined,
    };
  }
}

export const conceptService = new ConceptService();
