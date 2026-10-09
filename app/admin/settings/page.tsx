"use client";

import React, { useEffect, useState } from 'react';
import { apiJson } from '../../lib/authClient';
import { Card, ErrorBox, Hint, Spinner } from '../../components/admin/ui';

interface Field {
  key: string;
  label: string;
  hint: string;
  type: 'boolean' | 'number';
}

export default function AdminSettingsPage() {
  const [fields, setFields] = useState<Field[]>([]);
  const [values, setValues] = useState<Record<string, any> | null>(null);
  const [saved, setSaved] = useState<Record<string, any> | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    apiJson<{ fields: Field[]; values: Record<string, any> }>('/api/admin/settings')
      .then((data) => {
        setFields(data.fields);
        setValues(data.values);
        setSaved(data.values);
      })
      .catch((err) => setError(err.message));
  }, []);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!values || !saved) return;
    setBusy(true);
    setError('');
    setNotice('');

    // Отправляем только изменённое: в журнал попадёт именно то, что поменяли
    const changes = Object.fromEntries(
      fields
        .filter((field) => values[field.key] !== saved[field.key])
        .map((field) => [field.key, field.type === 'number' ? Number(values[field.key]) : values[field.key]])
    );

    try {
      const result = await apiJson<{ values: Record<string, any> }>('/api/admin/settings', {
        method: 'PUT',
        body: JSON.stringify(changes),
      });
      setValues(result.values);
      setSaved(result.values);
      setNotice(Object.keys(changes).length ? 'Сохранено. Сервер подхватит изменения в течение 30 секунд.' : 'Изменений нет');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (error && !values) return <ErrorBox message={error} />;
  if (!values) return <Spinner />;

  return (
    <div className="max-w-2xl space-y-5">
      <h1 className="text-xl font-semibold text-gray-900">Настройки</h1>
      <Hint>
        Меняются без деплоя. Ставки комиссии и налога нужны только аналитике: в счёт покупателю они не попадают.
        Каждое сохранение пишется в журнал действий.
      </Hint>

      <form onSubmit={save}>
        <Card padded={false}>
          <div className="divide-y divide-gray-100">
            {fields.map((field) => (
              <label key={field.key} className="flex items-center justify-between gap-4 px-4 py-3">
                <span>
                  <span className="block text-sm text-gray-900">{field.label}</span>
                  <span className="block text-xs text-gray-500">{field.hint}</span>
                </span>
                {field.type === 'boolean' ? (
                  <input
                    type="checkbox"
                    className="h-5 w-5"
                    checked={Boolean(values[field.key])}
                    onChange={(event) => setValues({ ...values, [field.key]: event.target.checked })}
                  />
                ) : (
                  <input
                    type="number"
                    min={0}
                    step="any"
                    className="w-32 text-right text-sm"
                    value={values[field.key]}
                    onChange={(event) => setValues({ ...values, [field.key]: event.target.value })}
                  />
                )}
              </label>
            ))}
          </div>
        </Card>

        {error && <div className="mt-3"><ErrorBox message={error} /></div>}
        {notice && <p className="mt-3 text-sm text-emerald-700">● {notice}</p>}

        <button
          type="submit"
          disabled={busy}
          className="mt-4 rounded-md bg-gray-900 px-5 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {busy ? 'Сохраняем…' : 'Сохранить'}
        </button>
      </form>
    </div>
  );
}
