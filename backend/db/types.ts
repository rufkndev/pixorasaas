// Доменные типы. Репозитории отдают только их — snake_case наружу не выходит.

export interface User {
  id: string;
  email: string;
  fullName: string | null;
  emailVerifiedAt: Date | null;
  createdAt: Date;
}

// То же плюс хеш пароля. Не покидает слой аутентификации.
export interface UserWithSecret extends User {
  passwordHash: string;
  deletedAt: Date | null;
}

export type AuthTokenKind = 'email_verify' | 'password_reset';

export interface AuthToken {
  id: string;
  userId: string;
  kind: AuthTokenKind;
  expiresAt: Date;
  usedAt: Date | null;
}

export interface Session {
  id: string;
  userId: string;
  expiresAt: Date;
  createdAt: Date;
}

export type ConsentKind = 'pdn' | 'offer' | 'marketing' | 'cookies';

export interface ConsentInput {
  userId?: string | null;
  subject?: string | null;
  kind: ConsentKind;
  docVersion: string;
  source: string;
  ip?: string | null;
  userAgent?: string | null;
}

export interface NameSuggestion {
  name: string;
  meaning: string;
}

export interface GeneratedName {
  id: number;
  userId: string;
  industry: string | null;
  keywords: string | null;
  style: string | null;
  preferences: string;
  names: NameSuggestion[];
  createdAt: Date;
}

export interface GeneratedLogo {
  id: number;
  userId: string;
  name: string | null;
  keywords: string | null;
  logoUrl: string;
  industry: string | null;
  isPaid: boolean;
  orderId: string | null;
  paymentId: string | null;
  paymentMethod: string | null;
  email: string | null;
  phone: string | null;
  originalLogoUrl: string | null;
  // Заполняются с перехода на векторную генерацию; у старых записей null
  style: string | null;
  pattern: string | null;
  subject: string | null;
  concept: string | null;
  palette: string[] | null;
  svgUrl: string | null;
  originalSvgUrl: string | null;
  // Семейство надписи на логотипе: брендбук рекомендует именно его
  lockupFont: string | null;
  // Вектор голого знака без надписи, кэш для сборки брендбука
  markSvgUrl: string | null;
  createdAt: Date;
  updatedAt: Date | null;
}

export type BuildStepState = 'pending' | 'running' | 'done' | 'skipped' | 'failed';

export interface BuildStep {
  key: string;
  label: string;
  state: BuildStepState;
  error?: string;
  at?: string;
}

export interface Brandbook {
  id: number;
  userId: string;
  orderId: string;
  businessName: string;
  keywords: string | null;
  slogan: string;
  originalLogoUrl: string | null;
  logoVariants: any[];
  fonts: any[];
  colorPalette: any[];
  icons: any[];
  guidelines: any | null;
  applications: any | null;
  status: string;
  paymentStatus: string;
  isDemo: boolean;
  style: string | null;
  industry: string | null;
  buildStep: string | null;
  buildProgress: number;
  buildSteps: BuildStep[];
  buildStartedAt: Date | null;
  buildError: string | null;
  assets: Record<string, any>;
  pdfUrl: string | null;
  emailSentAt: Date | null;
  createdAt: Date;
  updatedAt: Date | null;
  completedAt: Date | null;
}

export type ProductType = 'logo' | 'brandbook';

export type DeliveryStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface Payment {
  id: number;
  // Наш номер заказа. Именно он уходит в return_url и в brandbooks.order_id
  orderId: string;
  yookassaPaymentId: string | null;
  userId: string | null;
  productType: ProductType;
  amount: number;
  currency: string;
  status: string;
  deliveryStatus: DeliveryStatus;
  deliveryError: string | null;
  productData: Record<string, any>;
  description: string | null;
  createdAt: Date;
  paidAt: Date | null;
  deliveredAt: Date | null;
}
