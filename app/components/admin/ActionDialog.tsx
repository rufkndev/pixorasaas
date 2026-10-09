"use client";

import React, { useEffect, useState } from 'react';
import { ApiError, apiJson } from '../../lib/authClient';

export interface ActionField {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'boolean' | 'select';
  required?: boolean;
  default?: string | number | boolean;
  options?: Array<{ value: string; label: string }>;
}

export interface ActionMeta {
  key: string;
  label: string;
  danger?: boolean;
  confirm?: string;
  fields?: ActionField[];
}

// Действие без полей и без предупреждения выполняется сразу, остальное — через окно
export const needsDialog = (action: ActionMeta): boolean => Boolean(action.confirm || action.fields?.length);

export const runAdminAction = (url: string, input: Record<string, unknown>) =>
  apiJson<{ success: true; message: string }>(url, { method: 'POST', body: JSON.stringify(input) });

export default function ActionDialog({
  action,
  url,
  onClose,
  onDone,
}: {
  action: ActionMeta;
  url: string;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const [values, setValues] = useState<Record<string, any>>(() =>
    Object.fromEntries((action.fields ?? []).map((field) => [field.key, field.default ?? (field.type === 'boolean' ? false : '')]))
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && !busy && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const input = Object.fromEntries(
        (action.fields ?? []).map((field) => [field.key, field.type === 'number' ? Number(values[field.key]) : values[field.key]])
      );
      const result = await runAdminAction(url, input);
      onDone(result.message);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось выполнить');
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={() => !busy && onClose()}>
      <form
        onSubmit={submit}
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl"
      >
        <h3 className="text-base font-semibold text-gray-900">{action.label}</h3>
        {action.confirm && <p className="mt-2 text-sm text-gray-600">{action.confirm}</p>}

        <div className="mt-4 space-y-3">
          {(action.fields ?? []).map((field) => (
            <label key={field.key} className="block text-sm">
              {field.type === 'boolean' ? (
                <span className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={Boolean(values[field.key])}
                    onChange={(event) => setValues({ ...values, [field.key]: event.target.checked })}
                  />
                  {field.label}
                </span>
              ) : (
                <>
                  <span className="mb-1 block text-gray-700">
                    {field.label}
                    {field.required && <span className="text-red-600"> *</span>}
                  </span>
                  {field.type === 'textarea' ? (
                    <textarea
                      className="w-full text-sm"
                      rows={3}
                      value={values[field.key]}
                      onChange={(event) => setValues({ ...values, [field.key]: event.target.value })}
                    />
                  ) : field.type === 'select' ? (
                    <select
                      className="w-full text-sm"
                      value={values[field.key]}
                      onChange={(event) => setValues({ ...values, [field.key]: event.target.value })}
                    >
                      {(field.options ?? []).map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      className="w-full text-sm"
                      type={field.type === 'number' ? 'number' : 'text'}
                      min={field.type === 'number' ? 0 : undefined}
                      required={field.required}
                      value={values[field.key]}
                      onChange={(event) => setValues({ ...values, [field.key]: event.target.value })}
                    />
                  )}
                </>
              )}
            </label>
          ))}
        </div>

        {error && <p className="mt-3 rounded bg-red-50 p-2 text-sm text-red-800">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={busy} className="rounded-md px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
            Отмена
          </button>
          <button
            type="submit"
            disabled={busy}
            className={`rounded-md px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 ${
              action.danger ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-900 hover:bg-gray-800'
            }`}
          >
            {busy ? 'Выполняется…' : action.label}
          </button>
        </div>
      </form>
    </div>
  );
}
