"use client";

export type BuildStepState = 'pending' | 'running' | 'done' | 'skipped' | 'failed';

export interface BuildProgressData {
  status: 'processing' | 'completed' | 'failed';
  progress: number;
  step: string | null;
  label: string | null;
  steps: Array<{ key: string; label: string; state: BuildStepState; error?: string }>;
  error: string | null;
}

// Подписи и метки одинаковы на странице оплаты и на странице брендбука:
// покупатель видит один и тот же список шагов, куда бы ни попал
const MARK: Record<BuildStepState, { sign: string; className: string }> = {
  done: { sign: '✓', className: 'text-green-600' },
  running: { sign: '•', className: 'text-gray-900 animate-pulse' },
  skipped: { sign: '—', className: 'text-gray-400' },
  failed: { sign: '!', className: 'text-amber-600' },
  pending: { sign: '·', className: 'text-gray-300' },
};

interface Props {
  build: BuildProgressData;
  title?: string;
}

export default function BuildProgress({ build, title }: Props) {
  const percent = Math.min(100, Math.max(0, build.progress));

  return (
    <div className="max-w-md mx-auto text-left">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {title || 'Собираем ваш брендбук'}
        </h2>
        <p className="text-gray-600">
          {build.label
            ? `${build.label}…`
            : 'Это занимает пару минут — страницу можно не держать открытой.'}
        </p>
      </div>

      <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden mb-6">
        <div
          className="h-full bg-gray-900 rounded-full transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>

      <ul className="space-y-2">
        {build.steps.map((step) => {
          const mark = MARK[step.state] || MARK.pending;

          return (
            <li key={step.key} className="flex items-start text-sm">
              <span className={`w-5 flex-shrink-0 font-bold ${mark.className}`}>{mark.sign}</span>
              <span
                className={
                  step.state === 'pending' ? 'text-gray-400' : 'text-gray-700'
                }
              >
                {step.label}
                {/* Пропущенный шаг — не ошибка: брендбук собран без этой части */}
                {step.state === 'skipped' && (
                  <span className="text-gray-400"> — пропущен</span>
                )}
                {step.state === 'failed' && (
                  <span className="text-amber-600"> — не получилось, собрали без него</span>
                )}
              </span>
            </li>
          );
        })}
      </ul>

      {build.status === 'failed' && (
        <p className="mt-6 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-3">
          Сборка сорвалась, но заказ оплачен и не потерян — мы повторим её автоматически.
          Если через полчаса брендбука не будет в кабинете, напишите нам.
        </p>
      )}
    </div>
  );
}
