// Коды, у которых сервер присылает готовый текст для человека: приставка
// «Произошла ошибка» перед «С вашей сети сегодня…» читалась бы как сбой
const SELF_EXPLAINING = new Set(['GENERATION_LIMIT', 'IP_LIMIT', 'FREE_PAUSED', 'BUSY']);

export const describeGenerationError = (err: any, prefix: string): string =>
  SELF_EXPLAINING.has(err?.code) ? err.message : `${prefix}: ${err?.message || 'неизвестная ошибка'}`;
