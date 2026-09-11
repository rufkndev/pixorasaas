import { PageModule } from '../document';
import { brandPage } from './brand';
import { clearspacePage } from './clearspace';
import { contentsPage } from './contents';
import { contrastPage } from './contrast';
import { coverPage } from './cover';
import { iconsPage } from './icons';
import { imprintPage } from './imprint';
import { lockupsPage } from './lockups';
import { logoPage } from './logo';
import { misusePage } from './misuse';
import { mockupsPage } from './mockups';
import { monoPage } from './mono';
import { palettePage } from './palette';
import { textsettingPage } from './textsetting';
import { typographyPage } from './typography';

// Порядок полос в документе. Полосы одного раздела идут подряд — по ним
// группируется содержание. Полоса без содержимого выпадает сама
// (PageModule.enabled), и в оглавлении дыры не появляется.
export const PAGES: PageModule[] = [
  coverPage,
  contentsPage,
  brandPage,
  logoPage,
  lockupsPage,
  monoPage,
  clearspacePage,
  misusePage,
  palettePage,
  contrastPage,
  typographyPage,
  textsettingPage,
  iconsPage,
  mockupsPage,
  imprintPage,
];
