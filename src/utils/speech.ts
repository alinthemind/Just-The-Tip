import { LanguageCode } from '../data/translations';

/**
 * Spoken greeting when the user picks a language, using the browser's built-in speech synthesis.
 * The Web Speech API doesn't expose a voice's gender, so female voices are chosen by name.
 */

// Locale to speak each language in. Latin has no voice anywhere, but an Italian voice reads it naturally;
// the fictional languages fall back to English.
const SPEECH_LOCALE: Record<LanguageCode, string> = {
  en: 'en-US',
  fr: 'fr-FR',
  es: 'es-ES',
  it: 'it-IT',
  pt: 'pt-PT',
  de: 'de-DE',
  la: 'it-IT',
  tlh: 'en-US',
  vul: 'en-US',
  'zh-CN': 'zh-CN',
  'zh-TW': 'zh-TW',
  ja: 'ja-JP',
  ko: 'ko-KR',
  th: 'th-TH',
};

// Known female system voices (Apple, Google, Microsoft, Android) and known male ones to avoid
const FEMALE_VOICE =
  /female|woman|samantha|victoria|karen|moira|tessa|fiona|veena|allison|ava|susan|zoe|nicky|serena|kate|amélie|amelie|audrey|aurélie|marie|mónica|monica|paulina|marisol|soledad|alice|federica|elsa|joana|luciana|catarina|fernanda|anna|petra|helena|marlene|ting-?ting|mei-?jia|sin-?ji|lili|yu-?shu|kyoko|o-ren|yuna|sora|kanya|narisa|zira|aria|jenny|hazel|heera|hortense|julie|denise|laura|isabella|maria|hedda|katja|huihui|xiaoxiao|yaoyao|hanhan|hsiaochen|hsiaoyu|ayumi|haruka|nanami|heami|sunhi|achara|premwadee|francisca|raquel|grandma|shelley|sandy|flo/i;
const MALE_VOICE =
  /\bmale\b|alex|daniel|fred|thomas\b|jorge|diego|luca|markus|yannick|otoya|rishi|david|mark\b|george|ravi|paul\b|pablo|stefan|kangkang|ichiro|ryan|guy\b|henri|conrad|\bkai\b|gian|antonio|duarte|reed|rocko|eddy|grandpa|junior|ralph|albert|aaron|arthur|gordon|oliver|martin|jacques/i;

function scoreVoice(voice: SpeechSynthesisVoice, locale: string): number {
  const lang = voice.lang.replace('_', '-').toLowerCase();
  const want = locale.toLowerCase();
  let score = 0;
  if (lang === want) score += 10;
  else if (lang.split('-')[0] === want.split('-')[0]) score += 6;
  else return -Infinity;
  const name = voice.name;
  if (FEMALE_VOICE.test(name)) score += 5;
  else if (/^google/i.test(name) && !/male/i.test(name)) score += 4; // Google's default voices are female
  if (MALE_VOICE.test(name) && !/female/i.test(name)) score -= 8;
  if (/enhanced|premium|natural|neural/i.test(name)) score += 1;
  // Apple's novelty "Eloquence" voices sound robotic; use them only when nothing else speaks the language
  if (/^(flo|grandma|grandpa|shelley|sandy|rocko|eddy|reed)\b/i.test(name)) score -= 6;
  return score;
}

/** Best female-sounding voice for a locale, and whether we're confident it is female */
export function pickVoice(
  voices: SpeechSynthesisVoice[],
  locale: string
): { voice: SpeechSynthesisVoice | null; confidentFemale: boolean } {
  let best: SpeechSynthesisVoice | null = null;
  let bestScore = -Infinity;
  for (const v of voices) {
    const s = scoreVoice(v, locale);
    if (s > bestScore) {
      best = v;
      bestScore = s;
    }
  }
  const confidentFemale =
    !!best && (FEMALE_VOICE.test(best.name) || (/^google/i.test(best.name) && !/male/i.test(best.name)));
  return { voice: best, confidentFemale };
}

let cachedVoices: SpeechSynthesisVoice[] = [];

/** Voices load asynchronously in most browsers; call once at startup so they're ready by the first tap */
export function primeVoices(): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  const load = () => {
    cachedVoices = window.speechSynthesis.getVoices();
  };
  load();
  window.speechSynthesis.addEventListener?.('voiceschanged', load);
}

/** Speak `text` in the given app language with a female voice. Must be called from a user gesture on iOS. */
export function speakInLanguage(lang: LanguageCode, text: string): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  const synth = window.speechSynthesis;
  const locale = SPEECH_LOCALE[lang] || 'en-US';
  if (!cachedVoices.length) cachedVoices = synth.getVoices();
  const { voice, confidentFemale } = pickVoice(cachedVoices, locale);

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = voice?.lang || locale;
  if (voice) utterance.voice = voice;
  // If no known female voice exists for this language, a slightly higher pitch is the closest we can get
  utterance.pitch = confidentFemale ? 1 : 1.25;
  utterance.rate = 0.95;

  synth.cancel(); // switching languages quickly shouldn't queue greetings
  synth.speak(utterance);
}
