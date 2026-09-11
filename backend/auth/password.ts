import argon2 from 'argon2';

// argon2id с параметрами из OWASP Password Storage Cheat Sheet
const OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 19_456, // 19 МиБ
  timeCost: 2,
  parallelism: 1,
};

export const hashPassword = (password: string): Promise<string> =>
  argon2.hash(password, OPTIONS);

// Не бросает: пустой или повреждённый хеш (например, у удалённого аккаунта)
// означает просто «не совпало».
export const verifyPassword = async (hash: string, password: string): Promise<boolean> => {
  if (!hash) return false;

  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
};
