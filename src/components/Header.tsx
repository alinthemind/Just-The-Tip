import React from 'react';
import { ActiveTab, UserLocation } from '../types';
import { ScanLine, Calculator, Globe2, RotateCw, Sun, Moon, Receipt, Navigation, MapPin, Camera, Wifi } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { MushroomTipLogo } from './InstagramIcon';
import { LanguageSelector } from './LanguageSelector';
import { IconButton, Segmented } from './ui';
import { LanguageCode, getTranslation } from '../data/translations';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  userLocation: UserLocation;
  onOpenLocationPicker: () => void;
  onRefreshGps: () => void;
  isLocating: boolean;
  currentLang: LanguageCode;
  onSelectLang: (lang: LanguageCode) => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

const TABS: Array<{ id: ActiveTab; icon: LucideIcon; labelKey: string }> = [
  { id: 'scanner', icon: ScanLine, labelKey: 'navScan' },
  { id: 'manual', icon: Calculator, labelKey: 'navCalc' },
  { id: 'guide', icon: Globe2, labelKey: 'navGuide' },
];

/** Small glyph telling where the current location came from */
const SOURCE_ICON: Record<NonNullable<UserLocation['source']>, LucideIcon> = {
  receipt: Receipt,
  'photo-gps': Camera,
  gps: Navigation,
  ip: Wifi,
  default: MapPin,
  manual: MapPin,
};

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  userLocation,
  onOpenLocationPicker,
  onRefreshGps,
  isLocating,
  currentLang,
  onSelectLang,
  theme,
  onToggleTheme,
}) => {
  const t = (key: string) => getTranslation(currentLang, key);
  const SourceIcon = SOURCE_ICON[userLocation.source || (userLocation.isGps ? 'gps' : 'default')];

  return (
    <>
      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-grouped/80 dark:bg-black/75 backdrop-blur-xl backdrop-saturate-150 border-b border-black/[0.06] dark:border-white/[0.08] pt-safe transition-colors">
        <div className="max-w-5xl mx-auto px-3 sm:px-6 h-14 flex items-center gap-2">
          <div className="flex items-center gap-2 flex-shrink-0">
            <MushroomTipLogo size={36} />
            <h1 className="font-bold text-[17px] sm:text-[19px] tracking-tight text-zinc-900 dark:text-white whitespace-nowrap hidden min-[370px]:block leading-none">
              Just the <span className="ig-gradient-text">Tip</span>
            </h1>
          </div>

          {/* Desktop tabs */}
          <div className="hidden sm:flex flex-1 justify-center">
            <Segmented<ActiveTab>
              className="w-[380px]"
              value={activeTab}
              onChange={setActiveTab}
              options={TABS.map((tab) => ({ value: tab.id, icon: tab.icon, label: t(tab.labelKey) }))}
            />
          </div>
          <div className="flex-1 sm:hidden" />

          {/* Location + actions */}
          <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0 min-w-0">
            <button
              type="button"
              onClick={onOpenLocationPicker}
              title={t('changeLocation')}
              aria-label={`${t('changeLocation')}: ${userLocation.city || userLocation.countryName}`}
              className="h-9 inline-flex items-center gap-1.5 pl-1.5 pr-2.5 rounded-full bg-[#767680]/12 dark:bg-[#767680]/24 hover:bg-[#767680]/20 active:scale-95 transition-all cursor-pointer max-w-[200px]"
            >
              <span className="w-6 h-6 rounded-full bg-white dark:bg-elevated flex items-center justify-center text-[15px] leading-none flex-shrink-0">
                {userLocation.flag}
              </span>
              {/* City name only where there's room; narrow phones show the flag and source icon */}
              <span className="hidden min-[440px]:inline text-[14px] font-medium text-zinc-900 dark:text-white truncate">
                {userLocation.city || userLocation.countryName}
              </span>
              <SourceIcon className="w-3.5 h-3.5 text-accent flex-shrink-0" />
            </button>
            <IconButton icon={RotateCw} label={t('refreshLocation')} onClick={onRefreshGps} disabled={isLocating} spin={isLocating} />
            <LanguageSelector currentLang={currentLang} onSelectLang={onSelectLang} />
            <IconButton
              icon={theme === 'dark' ? Sun : Moon}
              label={theme === 'dark' ? 'Light' : 'Dark'}
              onClick={onToggleTheme}
            />
          </div>
        </div>
      </header>

      {/* Mobile tab bar */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/80 dark:bg-elevated/80 backdrop-blur-xl backdrop-saturate-150 border-t border-black/[0.08] dark:border-white/[0.08] pb-safe transition-colors">
        <div className="grid grid-cols-3 pt-1.5">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                aria-current={active ? 'page' : undefined}
                className={`flex flex-col items-center gap-0.5 py-1 cursor-pointer active:scale-95 transition-all ${
                  active ? 'text-accent' : 'text-zinc-400 dark:text-zinc-500'
                }`}
              >
                <Icon className="w-6 h-6" strokeWidth={active ? 2.3 : 1.8} />
                <span className="text-[10px] font-medium">{t(tab.labelKey)}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
