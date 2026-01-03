
import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import { translations, Language } from '../i18n';

const LOCALE_MAP: Record<Language, string> = { zh: 'zh-CN', en: 'en' }; // 前端语言代码映射到后端

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string; // 使用string类型以兼容各组件的不同调用方式
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('language'); // 从localStorage读取语言设置，默认中文
    return (saved === 'en' || saved === 'zh') ? saved : 'zh';
  });
  const [dynamicTranslations, setDynamicTranslations] = useState<Record<string, string>>({});

  const loadDynamicTranslations = useCallback(async (lang: Language) => { // 异步加载后端翻译
    try {
      const locale = LOCALE_MAP[lang];
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/auth/translations/${locale}`);
      if (res.ok) setDynamicTranslations(await res.json());
    } catch (e) { console.warn('[i18n] Failed to load dynamic translations:', e); } // 静默降级
  }, []);

  useEffect(() => { loadDynamicTranslations(language); }, [language, loadDynamicTranslations]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
  };

  const t = useCallback((key: string): string => {
    return translations[language][key] || dynamicTranslations[key] || key; // 静态翻译优先，立即响应
  }, [language, dynamicTranslations]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
