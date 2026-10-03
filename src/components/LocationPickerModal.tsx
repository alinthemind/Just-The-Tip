import React, { useState } from 'react';
import { UserLocation } from '../types';
import { COUNTRY_TIPPING_DATABASE } from '../data/tippingCulture';
import { X, Search, Navigation, Check, Ban } from 'lucide-react';
import { LanguageCode, getTranslation } from '../data/translations';

interface LocationPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLocation: UserLocation;
  onSelectCountry: (countryCode: string) => void;
  onRefreshGps: () => void;
  isLocating: boolean;
  currentLang?: LanguageCode;
}

export const LocationPickerModal: React.FC<LocationPickerModalProps> = ({
  isOpen,
  onClose,
  currentLocation,
  onSelectCountry,
  onRefreshGps,
  isLocating,
  currentLang = 'en',
}) => {
  const t = (key: string) => getTranslation(currentLang, key);
  const [search, setSearch] = useState('');

  if (!isOpen) return null;

  const countries = Object.values(COUNTRY_TIPPING_DATABASE).sort((a, b) => a.countryName.localeCompare(b.countryName));
  const filtered = countries.filter(
    (c) =>
      c.countryName.toLowerCase().includes(search.toLowerCase()) ||
      c.countryCode.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center sm:p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('changeLocation')}
        onClick={(e) => e.stopPropagation()}
        className="bg-grouped dark:bg-elevated w-full sm:max-w-md h-[88vh] sm:h-[80vh] rounded-t-[14px] sm:rounded-[14px] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8 duration-200"
      >
        {/* Grabber + title bar */}
        <div className="pt-2 pb-2 px-4 flex-shrink-0">
          <div className="w-9 h-[5px] rounded-full bg-zinc-300 dark:bg-zinc-600 mx-auto sm:hidden" />
          <div className="flex items-center justify-between mt-2">
            <span className="w-8" />
            <h3 className="text-[17px] font-semibold text-zinc-900 dark:text-white">{t('changeLocation')}</h3>
            <button
              type="button"
              onClick={onClose}
              aria-label={t('cancel')}
              className="w-8 h-8 rounded-full bg-[#767680]/12 dark:bg-[#767680]/24 flex items-center justify-center text-zinc-500 dark:text-zinc-300 cursor-pointer"
            >
              <X className="w-4 h-4" strokeWidth={2.5} />
            </button>
          </div>

          {/* Search */}
          <div className="relative mt-3">
            <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="search"
              placeholder={t('searchCountry')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-[17px] rounded-[10px] bg-[#767680]/12 dark:bg-[#767680]/24 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-5">
          {/* Use current location */}
          <div className="bg-white dark:bg-elevated-2 rounded-[12px] overflow-hidden">
            <button
              type="button"
              onClick={onRefreshGps}
              disabled={isLocating}
              className="w-full flex items-center gap-3 px-4 py-3 text-left cursor-pointer active:bg-zinc-100 dark:active:bg-zinc-700 disabled:opacity-60"
            >
              <Navigation className={`w-5 h-5 text-accent ${isLocating ? 'animate-pulse' : ''}`} fill="currentColor" />
              <span className="flex-1 text-[17px] text-accent">{t('useMyLocation')}</span>
              {currentLocation.isGps && (
                <span className="text-[15px] text-zinc-400 truncate max-w-[40%]">
                  {currentLocation.city || currentLocation.countryName}
                </span>
              )}
            </button>
          </div>

          {/* Countries */}
          <div className="bg-white dark:bg-elevated-2 rounded-[12px] overflow-hidden">
            {filtered.map((item) => {
              const isSelected = currentLocation.countryCode === item.countryCode;
              return (
                <button
                  key={item.countryCode}
                  type="button"
                  onClick={() => {
                    onSelectCountry(item.countryCode);
                    onClose();
                  }}
                  className="w-full flex items-center gap-3 pl-4 text-left cursor-pointer active:bg-zinc-100 dark:active:bg-zinc-700 group"
                >
                  <span className="text-[24px] leading-none">{item.flag}</span>
                  <div className="flex-1 flex items-center gap-2 py-3 pr-4 border-b border-black/[0.06] dark:border-white/[0.08] group-last:border-b-0 min-w-0">
                    <span className="flex-1 text-[17px] text-zinc-900 dark:text-white truncate">{item.countryName}</span>
                    <span className="text-[15px] tabular-nums text-zinc-400 inline-flex items-center gap-1">
                      {item.isTippingDiscouraged ? <Ban className="w-4 h-4" /> : `${item.minPercent}–${item.highPercent}%`}
                    </span>
                    <Check className={`w-5 h-5 text-accent ${isSelected ? '' : 'invisible'}`} strokeWidth={2.5} />
                  </div>
                </button>
              );
            })}
            {filtered.length === 0 && (
              <div className="p-8 flex justify-center text-zinc-400">
                <Search className="w-8 h-8" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
