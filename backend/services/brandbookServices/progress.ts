import { Brandbook, BuildStep, BuildStepState } from '../../db/types';

export type StepKey =
  | 'palette'
  | 'typography'
  | 'logo'
  | 'slogan'
  | 'icons'
  | 'guidelines'
  | 'mockups'
  | 'pdf';

export interface StepMeta {
  key: StepKey;
  label: string;
  weight: number;
  // Критичный шаг роняет выдачу, и следующий опрос со страницы успеха повторит
  // сборку. Некритичный пропускается: за наш сбой покупатель платить не должен.
  critical: boolean;
  timeoutMs: number;
}

// Порядок обязательный: логотип берёт палитру и шрифты, рекомендации — всё
// собранное до них, макеты — палитру, шрифты и иконки. Сумма весов равна 100.
export const BUILD_STEPS: StepMeta[] = [
  { key: 'palette', label: 'Собираем палитру', weight: 5, critical: true, timeoutMs: 15_000 },
  { key: 'typography', label: 'Подбираем шрифты', weight: 3, critical: true, timeoutMs: 15_000 },
  { key: 'logo', label: 'Готовим версии логотипа', weight: 20, critical: true, timeoutMs: 180_000 },
  { key: 'slogan', label: 'Пишем слоган', weight: 5, critical: false, timeoutMs: 90_000 },
  { key: 'icons', label: 'Подбираем иконки и графику', weight: 10, critical: false, timeoutMs: 60_000 },
  { key: 'guidelines', label: 'Пишем рекомендации', weight: 12, critical: false, timeoutMs: 180_000 },
  { key: 'mockups', label: 'Рисуем носители', weight: 20, critical: false, timeoutMs: 120_000 },
  { key: 'pdf', label: 'Собираем PDF', weight: 25, critical: false, timeoutMs: 240_000 },
];

// Сколько процентов показать перед началом шага
export const progressBefore = (key: StepKey): number => {
  let sum = 0;
  for (const step of BUILD_STEPS) {
    if (step.key === key) break;
    sum += step.weight;
  }
  return sum;
};

export interface BuildProgress {
  status: 'processing' | 'completed' | 'failed';
  progress: number;
  step: string | null;
  label: string | null;
  steps: Array<{ key: string; label: string; state: BuildStepState; error?: string }>;
  error: string | null;
}

// Шаги отдаются все сразу, включая ещё не начатые: покупатель должен видеть
// список целиком, а не растущий с нуля.
export const toProgress = (row: Brandbook): BuildProgress => {
  const done: BuildStep[] = row.buildSteps ?? [];
  const byKey = new Map(done.map((step) => [step.key, step]));

  const steps = BUILD_STEPS.map((meta) => {
    const actual = byKey.get(meta.key);
    return {
      key: meta.key,
      label: meta.label,
      state: (actual?.state ?? 'pending') as BuildStepState,
      error: actual?.error,
    };
  });

  const status =
    row.status === 'completed' || row.status === 'failed'
      ? (row.status as 'completed' | 'failed')
      : 'processing';

  return {
    status,
    progress: status === 'completed' ? 100 : row.buildProgress ?? 0,
    step: row.buildStep,
    label: BUILD_STEPS.find((meta) => meta.key === row.buildStep)?.label ?? null,
    steps,
    error: row.buildError,
  };
};
