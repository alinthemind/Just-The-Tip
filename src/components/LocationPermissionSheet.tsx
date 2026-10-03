import React from 'react';
import { MapPin, Lock, RotateCw, Globe2, Settings } from 'lucide-react';
import { GpsErrorCode } from '../types';
import { LanguageCode, getTranslation } from '../data/translations';

interface LocationPermissionSheetProps {
  reason: GpsErrorCode | null;
  onClose: () => void;
  onRetry: () => void;
  onChooseCountry: () => void;
  currentLang?: LanguageCode;
}

/** Web pages can't open the phone's Settings app, so for a denied permission we show the exact steps */
function settingsStepsKey(): string {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'locStepsIos';
  if (/Android/i.test(ua)) return 'locStepsAndroid';
  return 'locStepsDesktop';
}

export const LocationPermissionSheet: React.FC<LocationPermissionSheetProps> = ({
  reason,
  onClose,
  onRetry,
  onChooseCountry,
  currentLang = 'en',
}) => {
  const t = (key: string) => getTranslation(currentLang, key);
  if (!reason) return null;

  // Over plain http the same dev server also answers https, so switching protocol is enough
  const canOpenSecure =
    reason === 'insecure' && typeof window !== 'undefined' && window.location.protocol === 'http:';
  const openSecure = () => {
    window.location.href = `https://${window.location.host}${window.location.pathname}`;
  };

  const primaryBtn =
    'w-full py-3.5 rounded-[14px] ig-gradient text-white text-[17px] font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform cursor-pointer';
  const secondaryBtn =
    'w-full py-3 rounded-[14px] bg-[#767680]/12 dark:bg-[#767680]/24 text-zinc-900 dark:text-white text-[17px] font-medium flex items-center justify-center gap-2 active:scale-[0.98] transition-transform cursor-pointer';

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center sm:p-4 animate-in fade-in" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('locSheetTitle')}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-elevated w-full sm:max-w-sm rounded-t-[20px] sm:rounded-[20px] px-5 pt-3 pb-8 sm:pb-6 shadow-2xl animate-in slide-in-from-bottom-8 duration-200"
      >
        <div className="w-9 h-[5px] rounded-full bg-zinc-300 dark:bg-zinc-600 mx-auto sm:hidden" />

        <div className="mt-5 flex flex-col items-center text-center">
          <span className="w-16 h-16 rounded-[18px] ig-gradient flex items-center justify-center text-white shadow-[0_8px_20px_-8px_rgba(225,48,108,0.7)]">
            {reason === 'insecure' ? <Lock className="w-8 h-8" /> : <MapPin className="w-8 h-8" />}
          </span>
          <h3 className="mt-4 text-[22px] font-bold tracking-tight text-zinc-900 dark:text-white">{t('locSheetTitle')}</h3>
          <p className="mt-1.5 text-[15px] leading-snug text-zinc-500 dark:text-zinc-400">{t('locSheetBody')}</p>
        </div>

        {reason !== 'insecure' && (
          <div className="mt-5 flex items-start gap-3 rounded-[14px] bg-[#767680]/[0.08] dark:bg-[#767680]/20 p-3.5 text-left">
            <Settings className="w-5 h-5 text-zinc-400 flex-shrink-0 mt-0.5" />
            <p className="text-[14px] leading-snug text-zinc-700 dark:text-zinc-300">{t(settingsStepsKey())}</p>
          </div>
        )}

        <div className="mt-5 space-y-2.5">
          {canOpenSecure ? (
            <button type="button" onClick={openSecure} className={primaryBtn}>
              <Lock className="w-5 h-5" />
              {t('locOpenSecure')}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                onClose();
                onRetry();
              }}
              className={primaryBtn}
            >
              <RotateCw className="w-5 h-5" />
              {t('locTryAgain')}
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              onClose();
              onChooseCountry();
            }}
            className={secondaryBtn}
          >
            <Globe2 className="w-5 h-5 text-accent" />
            {t('locChooseCountry')}
          </button>
          <button type="button" onClick={onClose} className="w-full py-2 text-[15px] text-zinc-500 dark:text-zinc-400 cursor-pointer">
            {t('locNotNow')}
          </button>
        </div>
      </div>
    </div>
  );
};
