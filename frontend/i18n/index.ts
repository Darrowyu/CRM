// 国际化入口 - 整合所有翻译文件
import { en } from './en';
import { zh } from './zh';
import { Language, TranslationKeys } from './types';

// 翻译字典
export const translations: Record<Language, Record<string, string>> = {
    en,
    zh,
};

// 导出类型
export type { Language, TranslationKeys };
