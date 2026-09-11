import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

import {
  GENERATED_LOGOS_DIR,
  GENERATED_LOGOS_URL_PREFIX,
  SOURCE_LOGO_SUFFIX,
} from '../../../paths';

// Файлы брендбука лежат плоско рядом с логотипами: resolveGeneratedLogoPath
// берёт basename и подкаталог всё равно потерял бы.
//
// Платные артефакты получают в имени подстроку -source, и заглушка перед
// express.static их не отдаёт — та же защита, что у чистого логотипа, без
// единой новой строки в index.ts. Открытые превью нужны странице брендбука.
export interface AssetName {
  brandbookId: number;
  // Случайный хвост: по нему нельзя перебрать превью чужого заказа
  token: string;
  slot: string;
  ext: string;
  paid: boolean;
}

export const newToken = (): string => crypto.randomBytes(3).toString('hex');

export const assetName = ({ brandbookId, token, slot, ext, paid }: AssetName): string =>
  `bb-${brandbookId}-${token}-${slot}${paid ? SOURCE_LOGO_SUFFIX : ''}.${ext}`;

export const assetUrl = (name: string): string => `${GENERATED_LOGOS_URL_PREFIX}${name}`;

export const assetPath = (name: string): string => path.join(GENERATED_LOGOS_DIR, name);

export const saveAsset = (content: Buffer | string, name: string): string => {
  if (!fs.existsSync(GENERATED_LOGOS_DIR)) {
    fs.mkdirSync(GENERATED_LOGOS_DIR, { recursive: true });
  }

  fs.writeFileSync(assetPath(name), content);
  return assetUrl(name);
};
