import fs from 'fs';
import path from 'path';

import { logosRepo } from '../db/repositories';
import { GeneratedLogo } from '../db/types';
import { GENERATED_LOGOS_DIR, resolveGeneratedLogoPath } from '../paths';
import { rawNameFor } from './logoService';

const DAY_MS = 24 * 60 * 60 * 1000;

// Демо-файлы до кэша (bb-0-…) и демо, которые не легли в кэш из-за сбоя слогана.
// Свежие не трогаем: страница предпросмотра может показывать их прямо сейчас
const LEGACY_DEMO = /^bb-0-[0-9a-f]+-demo-[a-z]+\.png$/;
const LOGO_DEMO = /^logo-(\d+)-[0-9a-f]{32}-demo-[a-z]+\.png$/;

const removeFile = (filePath: string | null): boolean => {
  if (!filePath || !fs.existsSync(filePath)) return false;
  fs.unlinkSync(filePath);
  return true;
};

const olderThan = (filePath: string, ms: number): boolean =>
  Date.now() - fs.statSync(filePath).mtimeMs > ms;

const referencedUrls = (variants: unknown[] | undefined): Set<string> =>
  new Set((variants ?? []).flatMap((variant: any) => [variant?.url, variant?.files?.png2048]));

export const cleanupOrphanDemoFiles = async (): Promise<number> => {
  if (!fs.existsSync(GENERATED_LOGOS_DIR)) return 0;

  const names = fs.readdirSync(GENERATED_LOGOS_DIR);
  const candidates = names.filter((name) => LEGACY_DEMO.test(name) || LOGO_DEMO.test(name));
  const logoIds = [...new Set(candidates.map((name) => Number(LOGO_DEMO.exec(name)?.[1])).filter(Boolean))];
  const cache = logoIds.length > 0 ? await logosRepo.demoVariantsByIds(logoIds) : new Map();

  let removed = 0;

  for (const name of candidates) {
    const filePath = path.join(GENERATED_LOGOS_DIR, name);
    if (!olderThan(filePath, DAY_MS)) continue;

    const logoId = Number(LOGO_DEMO.exec(name)?.[1]);
    if (logoId && referencedUrls(cache.get(logoId)).has(`/generated-logos/${name}`)) continue;

    if (removeFile(filePath)) removed++;
  }

  return removed;
};

// Все файлы логотипа: превью, чистый файл, кадр модели, вектор, кэш знака и демо.
// Файлы с префиксом logo-<id>- принадлежат ровно этому логотипу
const filesOfLogo = (logo: GeneratedLogo): string[] => {
  const source = resolveGeneratedLogoPath(logo.originalLogoUrl);
  const own = fs.existsSync(GENERATED_LOGOS_DIR)
    ? fs
        .readdirSync(GENERATED_LOGOS_DIR)
        .filter((name) => name.startsWith(`logo-${logo.id}-`))
        .map((name) => path.join(GENERATED_LOGOS_DIR, name))
    : [];

  return [
    resolveGeneratedLogoPath(logo.logoUrl),
    source,
    source ? path.join(path.dirname(source), rawNameFor(source)) : null,
    source ? source.replace(/\.png$/i, '.svg') : null,
    ...own,
  ].filter((file): file is string => Boolean(file));
};

// Срок записан в политике конфиденциальности и в политике обработки ПДн:
// меняя его, правьте и тексты (с подъёмом версии pdn). 0 в env выключает удаление
export const UNPAID_LOGO_RETENTION_DAYS_DEFAULT = 90;

export const cleanupExpiredUnpaidLogos = async (): Promise<number> => {
  const raw = process.env.UNPAID_LOGO_RETENTION_DAYS;
  const days = raw ? Number(raw) : UNPAID_LOGO_RETENTION_DAYS_DEFAULT;
  if (!Number.isInteger(days) || days <= 0) return 0;

  const expired = await logosRepo.listExpiredUnpaid(days, 200);
  let removed = 0;

  for (const logo of expired) {
    if (!(await logosRepo.deleteUnpaid(logo.id))) continue;
    filesOfLogo(logo).forEach(removeFile);
    removed++;
  }

  return removed;
};
