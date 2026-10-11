import type { BlogPost } from './types';
import { post as logoPrice } from './skolko-stoit-logotip';
import { post as companyName } from './kak-pridumat-nazvanie-dlya-ooo';
import { post as brandbookContents } from './chto-vhodit-v-brendbuk';
import { post as aiTrademark } from './logotip-iz-neyroseti-tovarnyy-znak';
import { post as nameCheck } from './kak-proverit-nazvanie-biznesa';

// Новая статья: файл рядом, строка здесь — список блога, маршрут и sitemap
// подхватят её сами. Каталог с подчёркиванием Next не превращает в адреса
export const POSTS: BlogPost[] = [logoPrice, companyName, brandbookContents, aiTrademark, nameCheck].sort((a, b) =>
  b.published.localeCompare(a.published),
);

export const findPost = (slug: string) => POSTS.find((post) => post.slug === slug);

export const formatDate = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
