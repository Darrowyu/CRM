// 国际化类型定义
import { en } from './en';

export type Language = 'en' | 'zh';
export type TranslationKeys = keyof typeof en;
export type Translations = Record<string, string>;
