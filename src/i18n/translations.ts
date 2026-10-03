import { SUPPORTED_LANGUAGES, TRANSLATIONS as DATA_TRANSLATIONS, LanguageCode, getTranslation as dataGetTranslation } from '../data/translations';

export type Language = LanguageCode;

export interface LanguageOption {
  code: Language;
  label: string;
  flag: string;
}

export const LANGUAGE_OPTIONS: LanguageOption[] = SUPPORTED_LANGUAGES.map((l) => ({
  code: l.code,
  label: l.label,
  flag: l.flag,
}));

export const TRANSLATIONS: Record<Language, Record<string, string>> = DATA_TRANSLATIONS;

export function getTranslation(lang: Language, key: string, fallback?: string): string {
  return dataGetTranslation(lang, key) || fallback || key;
}
