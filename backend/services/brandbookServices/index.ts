// Экспорт всех сервисов брендбука
export { brandbookService, getBrandbookService } from './brandbookService';
export { colorService } from './colorService';
export { fontService } from './fontService';
export { sloganService } from './sloganService';
export { iconService } from './iconService';
export { logoVariantService } from './logoVariantService';
export { demoBrandbookService } from './demoBrandbookService';
export { guidelinesService } from './guidelinesService';
export { applicationsService } from './applicationsService';

// Экспорт типов
export type { Brandbook, BrandElement } from './brandbookService';
export type { ColorPalette } from './colorService';
export type { Font } from './fontService';
export type { Icon } from './iconService';
export type { LogoVariant } from './logoVariantService';
export type { DemoBrandbook } from './demoBrandbookService';
export type { BrandGuidelines, FontGuideline, ColorGuideline, LogoGuideline, IconGuideline, ToneOfVoice } from './guidelinesService';
export type { BrandApplications, BusinessCard, Presentation, SocialMedia, EmailSignature, WebsiteLanding } from './applicationsService'; 