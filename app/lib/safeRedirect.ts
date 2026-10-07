const PROBE_ORIGIN = 'https://pixora.invalid';

// Куда можно вернуть после входа: только путь на нашем сайте. Проверки
// startsWith('/') мало — «/\evil.com» браузер читает как «//evil.com».
export const safeInternalPath = (raw: string | null | undefined, fallback: string): string => {
  if (!raw || !raw.startsWith('/') || /[\\\u0000-\u001f]/.test(raw)) return fallback;

  try {
    const url = new URL(raw, PROBE_ORIGIN);
    if (url.origin !== PROBE_ORIGIN) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
};
