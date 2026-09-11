import { query } from '../pool';
import { GeneratedName, NameSuggestion } from '../types';

// До появления пояснений в jsonb лежал простой массив строк — старые записи
// нельзя ломать, поэтому приводим оба формата к одному виду
const toSuggestion = (item: any): NameSuggestion | null => {
  if (typeof item === 'string') {
    return item.trim() ? { name: item.trim(), meaning: '' } : null;
  }
  if (item && typeof item.name === 'string' && item.name.trim()) {
    return { name: item.name.trim(), meaning: typeof item.meaning === 'string' ? item.meaning : '' };
  }
  return null;
};

const toSuggestions = (raw: any): NameSuggestion[] =>
  Array.isArray(raw) ? raw.map(toSuggestion).filter((s): s is NameSuggestion => s !== null) : [];

const toName = (row: any): GeneratedName => ({
  id: Number(row.id),
  userId: row.user_id,
  industry: row.industry,
  keywords: row.keywords,
  style: row.style,
  preferences: row.preferences,
  names: toSuggestions(row.names),
  createdAt: row.created_at,
});

export const namesRepo = {
  async create(input: {
    userId: string;
    industry?: string | null;
    keywords?: string | null;
    style?: string | null;
    preferences?: string | null;
    names: NameSuggestion[];
  }): Promise<GeneratedName> {
    const rows = await query(
      `INSERT INTO generated_names (user_id, industry, keywords, style, preferences, names)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb)
       RETURNING *`,
      [
        input.userId,
        input.industry ?? null,
        input.keywords ?? null,
        input.style ?? null,
        input.preferences || '',
        JSON.stringify(input.names),
      ]
    );
    return toName(rows[0]);
  },

  async listByUser(userId: string): Promise<GeneratedName[]> {
    const rows = await query(
      'SELECT * FROM generated_names WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    return rows.map(toName);
  },

  // Названия из прошлых генераций по той же нише — чтобы не выдавать их повторно
  async recentNamesForIndustry(userId: string, industry: string, limit: number = 24): Promise<string[]> {
    const rows = await query(
      `SELECT names FROM generated_names
       WHERE user_id = $1 AND lower(trim(industry)) = lower(trim($2))
       ORDER BY created_at DESC
       LIMIT 8`,
      [userId, industry]
    );

    const seen = new Set<string>();
    const names: string[] = [];
    for (const row of rows) {
      for (const suggestion of toSuggestions(row.names)) {
        const key = suggestion.name.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        names.push(suggestion.name);
        if (names.length >= limit) return names;
      }
    }
    return names;
  },
};
