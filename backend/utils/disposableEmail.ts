import domains from '../data/disposableDomains.json';

// Список обновляется скриптом scripts/fetch-disposable-domains.mjs
const DISPOSABLE = new Set<string>(domains as string[]);

// Проверяется и сам домен, и родительские: одноразовые сервисы раздают
// случайные поддомены вида abc.mailinator.com
export const isDisposableEmail = (email: string): boolean => {
  const domain = email.split('@').pop()?.toLowerCase().trim();
  if (!domain) return false;

  const parts = domain.split('.');
  for (let index = 0; index < parts.length - 1; index++) {
    if (DISPOSABLE.has(parts.slice(index).join('.'))) return true;
  }
  return false;
};
