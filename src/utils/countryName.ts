import { LanguageCode } from '../data/translations';

// Intl locale for each app language; the fictional languages show English names
const INTL_LOCALE: Record<LanguageCode, string> = {
  en: 'en',
  fr: 'fr',
  es: 'es',
  it: 'it',
  pt: 'pt-PT',
  de: 'de',
  la: 'la',
  tlh: 'en',
  vul: 'en',
  'zh-CN': 'zh-Hans',
  'zh-TW': 'zh-Hant',
  ja: 'ja',
  ko: 'ko',
  th: 'th',
};

const cache = new Map<string, Intl.DisplayNames | null>();

function displayNames(lang: LanguageCode): Intl.DisplayNames | null {
  const locale = INTL_LOCALE[lang] || 'en';
  if (!cache.has(locale)) {
    try {
      // Locales the browser has no data for (e.g. Latin) fall back to English rather than throwing
      const supported = Intl.DisplayNames.supportedLocalesOf([locale]);
      cache.set(locale, new Intl.DisplayNames(supported.length ? supported : ['en'], { type: 'region' }));
    } catch {
      cache.set(locale, null);
    }
  }
  return cache.get(locale) || null;
}

/** Country name in the app's language, using the browser's built-in region names */
export function localizedCountryName(code: string, lang: LanguageCode, fallback: string): string {
  if (!/^[A-Z]{2}$/.test(code)) return fallback;
  try {
    return displayNames(lang)?.of(code) || fallback;
  } catch {
    return fallback;
  }
}
