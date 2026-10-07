// Проверка принадлежности IP к CIDR-диапазону. Нужна для вебхуков ЮKassa:
// подписи у них нет, и список адресов — единственный дешёвый фильтр.

// IPv4 внутри IPv6 (::ffff:1.2.3.4) приходит от прокси сплошь и рядом
const stripV4Mapped = (ip: string): string => {
  const match = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(ip);
  return match ? match[1] : ip;
};

const v4ToBigInt = (ip: string): bigint | null => {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;

  let result = 0n;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const octet = Number(part);
    if (octet > 255) return null;
    result = (result << 8n) | BigInt(octet);
  }
  return result;
};

const v6ToBigInt = (ip: string): bigint | null => {
  const halves = ip.split('::');
  if (halves.length > 2) return null;

  const toGroups = (part: string | undefined): string[] => (part ? part.split(':') : []);
  const head = toGroups(halves[0]);
  const tail = toGroups(halves[1]);

  // Последняя группа может быть записана как IPv4 (::ffff:1.2.3.4)
  const target = tail.length > 0 ? tail : head;
  const last = target[target.length - 1];
  if (last !== undefined && last.includes('.')) {
    const v4 = v4ToBigInt(last);
    if (v4 === null) return null;
    target.splice(-1, 1, (v4 >> 16n).toString(16), (v4 & 0xffffn).toString(16));
  }

  const filler = 8 - head.length - tail.length;
  if (halves.length === 1 ? filler !== 0 : filler < 0) return null;

  const groups =
    halves.length === 1 ? head : [...head, ...Array(filler).fill('0'), ...tail];

  let result = 0n;
  for (const group of groups) {
    if (!/^[0-9a-f]{1,4}$/i.test(group)) return null;
    result = (result << 16n) | BigInt(parseInt(group, 16));
  }
  return result;
};

interface ParsedIp {
  value: bigint;
  bits: 32 | 128;
}

const parseIp = (raw: string): ParsedIp | null => {
  const ip = stripV4Mapped(raw.trim());

  if (ip.includes(':')) {
    const value = v6ToBigInt(ip);
    return value === null ? null : { value, bits: 128 };
  }

  const value = v4ToBigInt(ip);
  return value === null ? null : { value, bits: 32 };
};

// Диапазон без длины префикса считается одиночным адресом
export const ipInCidr = (rawIp: string, cidr: string): boolean => {
  const ip = parseIp(rawIp);
  if (!ip) return false;

  const [network, prefixPart] = cidr.split('/');
  const range = parseIp(network);
  if (!range || range.bits !== ip.bits) return false;

  const prefix = prefixPart === undefined ? range.bits : Number(prefixPart);
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > range.bits) return false;

  const mask = ((1n << BigInt(prefix)) - 1n) << BigInt(range.bits - prefix);
  return (ip.value & mask) === (range.value & mask);
};

// Ключ для лимитов по адресу. IPv6 сводится к подсети /64: абоненту выдают
// целый блок, и по одиночному адресу лимит обходился бы сменой адреса
export const ipLimitKey = (rawIp: string | undefined | null): string => {
  const ip = parseIp(rawIp || '');
  if (!ip) return `raw:${(rawIp || 'unknown').slice(0, 64)}`;
  if (ip.bits === 32) return stripV4Mapped(rawIp!.trim());

  const prefix = (ip.value >> 64n).toString(16).padStart(16, '0');
  return `${prefix.match(/.{4}/g)!.join(':')}::/64`;
};

export const ipInAnyCidr = (ip: string, cidrs: readonly string[]): boolean =>
  cidrs.some((cidr) => ipInCidr(ip, cidr));
