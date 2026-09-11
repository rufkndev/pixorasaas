import axios from 'axios';
import { z } from 'zod';
import { NameSuggestion } from '../db/types';
import { apiUtils } from '../utils/apiUtils';
import { getStyleProfile } from '../utils/styleLabels';
import { CREATIVE_VECTORS, NAME_PATTERNS, NamePattern, SCRIPT_LABELS, Script } from '../utils/namePatterns';

export type NameLanguage = 'cyrillic' | 'latin' | 'any';

export interface NameRequest {
  industry: string;
  keywords: string;
  style: string;
  preferences?: string;
  language?: NameLanguage;
  exclude?: string[];
}

interface NameSlot {
  pattern: NamePattern;
  script: Script;
}

// Приём модель возвращает вместе с названием: по нему видно, какие слоты
// остались непокрытыми. Наружу поле не уходит — фронт ждёт name и meaning
interface SlottedSuggestion extends NameSuggestion {
  pattern: string;
}

// Слаги сетей GenAPI пишутся через дефис и без точек, nano-вариантов у него нет
const MODEL = 'gpt-5-6-luna';
const NAMES_COUNT = 6;
const SLOTS_PER_BUCKET = 2;
const MAX_EXCLUDE = 60;

const SYSTEM_PROMPT =
  'Ты нейминг-специалист брендингового агентства. Придумываешь названия, которые не стыдно ' +
  'поставить на вывеску и внести в устав компании. Каждое название строишь строго тем приёмом, ' +
  'который назван в задании, а не тем, который тебе привычнее. ' +
  'Отвечаешь строго в запрошенном формате, без пояснений и вступлений.';

// Одной строки «пиши латиницей» модели мало: в русскоязычном промпте она понимает
// её как транслит русского слова, и пользователь получал «Vektor» вместо названия
const LATIN_RULE =
  'Написание «латиница» означает латинские буквы И международные, английские или латинские корни. ' +
  'Транслитерация русского слова латиницей — ошибка: «Vektor», «Stroykom», «Uyut» не подходят. ' +
  'Подходят: Nordwell, Lumina, Bright Harbor.';

const CYRILLIC_RULE =
  'Написание «кириллица» означает русские буквы; латинских букв в таком названии быть не должно.';

const CYRILLIC_LETTERS = /[А-Яа-яЁё]/;
const LATIN_LETTERS = /[A-Za-z]/;

const modelNamesSchema = z.object({
  names: z.array(z.object({
    name: z.string(),
    meaning: z.string().optional().default(''),
    pattern: z.string().optional().default(''),
  })).min(1),
});

export class NameService {
  private shuffle<T>(items: T[]): T[] {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  private slotScript(language: NameLanguage, index: number): Script {
    if (language === 'latin') return 'latin';
    if (language === 'cyrillic') return 'cyrillic';
    // При «без разницы» письменность раздаём сами: три параллельных вызова
    // выбрали бы её независимо друг от друга и выдача вышла бы случайной
    return index % 2 === 0 ? 'cyrillic' : 'latin';
  }

  // Разнообразие держится на слотах, а не на уговорах в промпте: приёмы
  // перемешиваются, поэтому от генерации к генерации меняется и состав, и раскладка
  private buildSlots(style: string, language: NameLanguage): NameSlot[] {
    const profile = getStyleProfile(style);

    return this.shuffle(profile.patterns)
      .map(id => NAME_PATTERNS[id])
      .filter(Boolean)
      .slice(0, NAMES_COUNT)
      .map((pattern, index) => ({ pattern, script: this.slotScript(language, index) }));
  }

  private pluralNames(count: number): string {
    if (count === 1) return 'название';
    return count < 5 ? 'названия' : 'названий';
  }

  private buildPrompt(input: NameRequest, slots: NameSlot[], exclude: string[]): string {
    const profile = getStyleProfile(input.style);
    const vector = CREATIVE_VECTORS[Math.floor(Math.random() * CREATIVE_VECTORS.length)];

    const lines = [
      `Придумай ${slots.length} ${this.pluralNames(slots.length)} для бизнеса.`,
      '',
      `Ниша: ${input.industry}`,
      `Ключевые слова (смысловой ориентир, а не части названия): ${input.keywords}`,
      `Стиль: ${profile.tone}`,
      `Дополнительные пожелания: ${input.preferences?.trim() || 'нет'}`,
    ];

    if (profile.extraRule) {
      lines.push('', `Особое требование стиля: ${profile.extraRule}.`);
    }

    lines.push('', `Творческий вектор: ${vector}.`, '', 'Названия строй строго по слотам:');

    slots.forEach((slot, index) => {
      lines.push(
        `${index + 1}. Приём «${slot.pattern.label}»: ${slot.pattern.instruction}. ` +
        `Длина ${slot.pattern.length[0]}-${slot.pattern.length[1]} символов. ` +
        `Написание: ${SCRIPT_LABELS[slot.script]}. ` +
        `Эталоны тональности (не копируй): ${slot.pattern.hints[slot.script].join(', ')}. ` +
        `В ответе укажи pattern: "${slot.pattern.id}".`
      );
    });

    if (slots.some(slot => slot.script === 'latin')) {
      lines.push('', LATIN_RULE);
    }

    if (slots.some(slot => slot.script === 'cyrillic')) {
      lines.push('', CYRILLIC_RULE);
    }

    lines.push(
      '',
      'Общие требования:',
      '- название читается и запоминается с первого раза',
      '- не склеивай ключевые слова буквально',
      '- запрещены цифры, дефисы и кавычки внутри названия',
      '- к каждому названию дай пояснение на русском: 3-7 слов о том, откуда слово и что означает',
    );

    if (profile.forbidden.length > 0) {
      lines.push(`- не используй слова: ${profile.forbidden.join(', ')}`);
    }

    if (exclude.length > 0) {
      lines.push(`- не повторяй эти варианты и их производные: ${exclude.join(', ')}`);
    }

    lines.push(
      '',
      'Ответ — только JSON вида {"names": [{"name": "Название", "meaning": "пояснение", ' +
        '"pattern": "id приёма"}]}. ' +
        `Элементов в "names" должно быть ровно ${slots.length}.`
    );

    return lines.join('\n');
  }

  // Модель охотно добавляет нумерацию, кавычки и фразы вроде «Вот ваши названия:» —
  // всё это раньше попадало в выдачу как отдельное «название»
  private parseSuggestions(text: string): SlottedSuggestion[] {
    const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();

    let raw: unknown[] = [];
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = modelNamesSchema.safeParse(JSON.parse(jsonMatch[0]));
        if (parsed.success) {
          raw = parsed.data.names;
        }
      } catch {
        // молча падаем на построчный разбор
      }
    }

    if (raw.length === 0) {
      raw = cleaned.split('\n');
    }

    const suggestions = raw
      .map(item => {
        const source = item as any;
        const name = typeof source === 'string' ? source : source?.name;
        const meaning = typeof source === 'string' ? '' : source?.meaning;
        return {
          name: this.cleanName(String(name ?? '')),
          meaning: this.cleanMeaning(String(meaning ?? '')),
          pattern: typeof source === 'string' ? '' : String(source?.pattern ?? ''),
        };
      })
      .filter(suggestion =>
        suggestion.name.length >= 2 &&
        suggestion.name.length <= 40 &&
        suggestion.name.split(/\s+/).length <= 3 &&
        !/[:;!?]/.test(suggestion.name)
      );

    return this.dedupe(suggestions);
  }

  private cleanName(value: string): string {
    return value
      .trim()
      .replace(/^(?:\d+[.)]\s*|[-–—*•]\s*)+/, '')
      .replace(/^["«'`]+|["»'`]+$/g, '')
      .trim();
  }

  private cleanMeaning(value: string): string {
    const cleaned = value.trim().replace(/^["«'`]+|["»'`]+$/g, '').trim();
    return cleaned.length > 160 ? `${cleaned.slice(0, 157)}...` : cleaned;
  }

  private dedupe<T extends { name: string }>(suggestions: T[]): T[] {
    const seen = new Set<string>();
    return suggestions.filter(suggestion => {
      const key = suggestion.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  // Просьбы в промпте модель выполняет через раз, поэтому письменность проверяем сами
  private matchesScript(name: string, language: NameLanguage): boolean {
    const hasCyrillic = CYRILLIC_LETTERS.test(name);
    const hasLatin = LATIN_LETTERS.test(name);

    if (language === 'latin') return hasLatin && !hasCyrillic;
    if (language === 'cyrillic') return hasCyrillic && !hasLatin;
    return !(hasCyrillic && hasLatin);
  }

  private levenshtein(a: string, b: string): number {
    let previous = Array.from({ length: b.length + 1 }, (_, i) => i);

    for (let i = 1; i <= a.length; i++) {
      const current = [i];
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + cost);
      }
      previous = current;
    }

    return previous[b.length];
  }

  private looksAlike(first: string, second: string): boolean {
    const a = first.toLowerCase();
    const b = second.toLowerCase();

    if (a.length >= 5 && b.length >= 5 && a.slice(0, 4) === b.slice(0, 4)) return true;
    if (a.length >= 6 && b.length >= 6 && a.slice(-3) === b.slice(-3)) return true;
    return a.length >= 5 && b.length >= 5 && this.levenshtein(a, b) <= 2;
  }

  // Фильтр похожести мягкий: отбракованные возвращаются в конец, если названий
  // не хватило. Жёсткий отсекал бы половину выдачи вместо однообразия
  private pickDiverse<T extends { name: string }>(candidates: T[], limit: number): T[] {
    const chosen: T[] = [];
    const reserve: T[] = [];

    for (const candidate of candidates) {
      if (chosen.length < limit && !chosen.some(picked => this.looksAlike(picked.name, candidate.name))) {
        chosen.push(candidate);
      } else {
        reserve.push(candidate);
      }
    }

    while (chosen.length < limit && reserve.length > 0) {
      chosen.push(reserve.shift() as T);
    }

    return chosen;
  }

  private keepUsable(
    suggestions: SlottedSuggestion[],
    language: NameLanguage,
    excluded: Set<string>
  ): SlottedSuggestion[] {
    return this.dedupe(suggestions.filter(suggestion =>
      !excluded.has(suggestion.name.toLowerCase()) &&
      this.matchesScript(suggestion.name, language)
    ));
  }

  private async requestBucket(
    input: NameRequest,
    slots: NameSlot[],
    exclude: string[]
  ): Promise<SlottedSuggestion[]> {
    const initialResponse = await axios.post(`${apiUtils.getBaseUrl()}/networks/${MODEL}`, {
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: this.buildPrompt(input, slots, exclude.slice(0, MAX_EXCLUDE)) }
      ],
      // Запас нужен под рассуждения модели, иначе на текст ответа токенов не остаётся
      max_completion_tokens: 2000
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiUtils.getApiKey()}`
      }
    });

    // Опрос и разбор — общие для всех сервисов. Здесь были свои копии, и они
    // отличались не только умолчаниями: собственный throw об отказе задачи
    // попадал в собственный catch, и упавшая задача опрашивалась до конца лимита
    const completedResponse = await apiUtils.waitForResult(initialResponse.data.request_id);
    return this.parseSuggestions(apiUtils.extractTextFromResponse(completedResponse));
  }

  async generateNames(input: NameRequest): Promise<NameSuggestion[]> {
    const exclude = input.exclude || [];
    const excluded = new Set(exclude.map(name => name.toLowerCase()));
    const language = input.language || 'any';

    const slots = this.buildSlots(input.style, language);
    const buckets: NameSlot[][] = [];
    for (let i = 0; i < slots.length; i += SLOTS_PER_BUCKET) {
      buckets.push(slots.slice(i, i + SLOTS_PER_BUCKET));
    }

    // Корзины идут параллельно: латентность как у одного вызова, а один
    // вызов физически не может выдать шесть названий одной формы
    const results = await Promise.allSettled(
      buckets.map(bucket => this.requestBucket(input, bucket, exclude))
    );

    const failed = results.filter(result => result.status === 'rejected') as PromiseRejectedResult[];
    if (failed.length === buckets.length) {
      throw failed[0].reason;
    }

    if (failed.length > 0) {
      console.error(`Не ответили корзины названий: ${failed.length} из ${buckets.length}`);
    }

    const received = results
      .filter((result): result is PromiseFulfilledResult<SlottedSuggestion[]> => result.status === 'fulfilled')
      .flatMap(result => result.value);

    let collected = this.keepUsable(received, language, excluded);

    // Фильтры отсеивают часть вариантов, поэтому один раз добираем недостающие
    // по непокрытым приёмам; сбой добора не должен ронять уже полученные названия
    if (collected.length < NAMES_COUNT) {
      try {
        const covered = new Set(collected.map(suggestion => suggestion.pattern));
        const missing = slots.filter(slot => !covered.has(slot.pattern.id));
        const topUpSlots = (missing.length > 0 ? missing : this.shuffle(slots))
          .slice(0, NAMES_COUNT - collected.length);
        const extraExclude = [...collected.map(suggestion => suggestion.name), ...exclude];
        const extra = await this.requestBucket(input, topUpSlots, extraExclude);
        collected = this.dedupe([...collected, ...this.keepUsable(extra, language, excluded)]);
      } catch (error: any) {
        console.error('Не удалось добрать названия:', error.message);
      }
    }

    return this.pickDiverse(collected, NAMES_COUNT)
      .map(({ name, meaning }) => ({ name, meaning }));
  }
}

// Создаём экземпляр при первом обращении, чтобы импорт не требовал ключа
let nameServiceInstance: NameService | null = null;

export const getNameService = (): NameService => {
  if (!nameServiceInstance) {
    nameServiceInstance = new NameService();
  }
  return nameServiceInstance;
};

export const nameService = {
  generateNames: (input: NameRequest) => getNameService().generateNames(input)
};
