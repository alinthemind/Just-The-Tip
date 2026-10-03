import { useEffect, useState } from 'react';
import type { LanguageCode } from '../translations';

/**
 * Translations of the country tipping advice in tippingCulture.ts. Each `<lang>.json` maps the exact
 * English sentence to its translation, so an edited or new English sentence simply shows in English
 * until it is translated. Files load on demand, only for the language in use.
 */
const loaders = import.meta.glob<Record<string, string>>('./*.json', { import: 'default' });
const cache = new Map<string, Record<string, string>>();

export async function loadEtiquette(lang: LanguageCode): Promise<Record<string, string> | null> {
  if (cache.has(lang)) return cache.get(lang)!;
  const load = loaders[`./${lang}.json`];
  if (!load) return null;
  const map = await load();
  cache.set(lang, map);
  return map;
}

/** Returns a translator for etiquette sentences in the given language (English passes through) */
export function useEtiquette(lang: LanguageCode): (text: string) => string {
  const [map, setMap] = useState<Record<string, string> | null>(() => cache.get(lang) || null);
  useEffect(() => {
    let alive = true;
    setMap(cache.get(lang) || null);
    loadEtiquette(lang)
      .then((m) => alive && setMap(m))
      .catch(() => alive && setMap(null));
    return () => {
      alive = false;
    };
  }, [lang]);
  return (text: string) => (text && map?.[text]) || text;
}
