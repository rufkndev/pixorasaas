"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// Те же пределы, что у generateLogoSchema на бэкенде
const NAME_MAX_LENGTH = 60;
const FIELD_MAX_LENGTH = 100;

// Для тех, у кого название уже есть: шаг генерации берёт всё из адреса,
// а вход спросит сам и вернёт обратно с теми же параметрами
// Лендинги ниш подставляют свою нишу и стиль, чтобы человеку оставалось ввести название
export default function LogoStartForm({
  defaults = {},
}: {
  defaults?: { industry?: string; style?: string; keywordsPlaceholder?: string };
}) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [keywords, setKeywords] = useState('');
  const [industry, setIndustry] = useState(defaults.industry || '');
  const [style, setStyle] = useState(defaults.style || 'modern');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = new URLSearchParams({
      name: name.trim(),
      keywords: keywords.trim(),
      industry: industry.trim(),
      style,
    });
    router.push(`/pages/logo-generator?${query.toString()}`);
  };

  const inputClass =
    'mt-1 block w-full rounded-md border border-gray-300 p-3 shadow-sm focus:border-gray-500 focus:ring-gray-500 sm:text-sm';

  return (
    <form onSubmit={submit} className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-md">
      <div>
        <label htmlFor="logo-name" className="block text-sm font-medium text-gray-700">
          Название <span className="text-red-500">*</span>
        </label>
        <input
          id="logo-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={NAME_MAX_LENGTH}
          required
          placeholder="Например: Зерно"
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="logo-keywords" className="block text-sm font-medium text-gray-700">
          Ключевые слова <span className="text-red-500">*</span>
        </label>
        <input
          id="logo-keywords"
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
          maxLength={FIELD_MAX_LENGTH}
          required
          placeholder={defaults.keywordsPlaceholder || 'Например: кофе, уют, свежая обжарка'}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="logo-industry" className="block text-sm font-medium text-gray-700">
          Ниша
        </label>
        <input
          id="logo-industry"
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
          maxLength={FIELD_MAX_LENGTH}
          placeholder="Например: кофейня"
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="logo-style" className="block text-sm font-medium text-gray-700">
          Стиль
        </label>
        <select id="logo-style" value={style} onChange={(e) => setStyle(e.target.value)} className={inputClass}>
          <option value="modern">Современный</option>
          <option value="classic">Классический</option>
          <option value="creative">Креативный</option>
          <option value="professional">Профессиональный</option>
          <option value="playful">Игривый</option>
        </select>
      </div>

      <button
        type="submit"
        className="w-full rounded-md bg-gray-900 px-4 py-3 text-sm font-medium text-white shadow-sm hover:bg-gray-800"
      >
        Создать логотип
      </button>
    </form>
  );
}
