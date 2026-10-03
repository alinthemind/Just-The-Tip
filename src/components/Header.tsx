import React from 'react';
import { ActiveTab, UserLocation } from '../types';
import { MapPin, Navigation, Receipt, Calculator, Globe2, RefreshCw, Sparkles } from 'lucide-react';
import { MushroomTipLogo } from './InstagramIcon';
import { LanguageSelector } from './LanguageSelector';
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
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  userLocation,
  onOpenLocationPicker,
  onRefreshGps,
  isLocating,
  currentLang,
  onSelectLang,
}) => {
  const t = (key: string) => getTranslation(currentLang, key);

  return (
    <>
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-zinc-100 shadow-[0_1px_3px_rgba(0,0,0,0.03)] pt-safe">
        <div className="max-w-5xl mx-auto px-3 sm:px-6">
          <div className="flex items-center justify-between py-2 sm:py-2.5 gap-1 sm:gap-2 flex-nowrap w-full">
            {/* Brand Logo & Title */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 flex-shrink-0">
              <MushroomTipLogo size={26} />
              <div>
                <div className="flex items-center gap-1">
                  <h1 className="font-extrabold text-zinc-900 text-sm xs:text-base sm:text-lg tracking-tight leading-none whitespace-nowrap">
                    Just the <span className="ig-gradient-text font-black">Tip</span>
                  </h1>
                </div>
                <p className="text-[10px] text-zinc-400 font-medium hidden md:block mt-0.5">
                  {t('appTagline')}
                </p>
              </div>
            </div>

            {/* Actions: Location Pill, Refresh GPS, & Language Selector (Strictly 1 single aligned line on mobile) */}
            <div className="flex items-center gap-1 sm:gap-1.5 flex-nowrap justify-end flex-shrink-0">
              {/* Location Pill */}
              <button
                onClick={onOpenLocationPicker}
                className="group flex items-center gap-1 sm:gap-1.5 px-1.5 xs:px-2 sm:px-2.5 py-1.5 rounded-full border border-zinc-200 bg-white hover:border-pink-300 hover:shadow-xs active:scale-95 transition-all text-xs font-semibold text-zinc-800 shadow-[0_1px_2px_rgba(0,0,0,0.04)] cursor-pointer flex-shrink-0"
                title={t('changeLocation')}
              >
                <div className="ig-story-ring-sm flex-shrink-0">
                  <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-white flex items-center justify-center text-xs">
                    {userLocation.flag}
                  </span>
                </div>
                <div className="flex items-center gap-1 max-w-[48px] xs:max-w-[85px] sm:max-w-[150px] truncate text-left">
                  <span className="truncate text-[11px] sm:text-xs font-bold text-zinc-900">
                    {userLocation.city ? userLocation.city : userLocation.countryName}
                  </span>
                  {userLocation.source === 'receipt' && (
                    <span className="text-[8px] tracking-wider uppercase font-extrabold px-1.5 py-0.2 rounded-full bg-pink-100 text-pink-700 hidden xs:inline-block">
                      Receipt
                    </span>
                  )}
                </div>
                <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#E1306C] flex-shrink-0 group-hover:scale-110 transition-transform" />
              </button>

              {/* Refresh Button (Circular arrows only) */}
              <button
                onClick={onRefreshGps}
                disabled={isLocating}
                className="p-1.5 sm:p-2 rounded-full border border-zinc-200 bg-white hover:bg-pink-50/40 hover:border-pink-300 active:scale-95 text-zinc-700 hover:text-[#E1306C] transition-all disabled:opacity-50 shadow-[0_1px_2px_rgba(0,0,0,0.04)] cursor-pointer flex-shrink-0"
                title="Refresh & Reset (GPS & Network Location)"
                aria-label="Refresh & Reset"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-[#E1306C] ${isLocating ? 'animate-spin' : ''}`} />
              </button>

              {/* Language Selector Dropdown */}
              <LanguageSelector currentLang={currentLang} onSelectLang={onSelectLang} />
            </div>
          </div>

          {/* Desktop & Tablet Navigation Tabs */}
          <nav className="hidden sm:flex space-x-1 border-t border-zinc-100 -mb-px py-1">
            <button
              onClick={() => setActiveTab('scanner')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'scanner'
                  ? 'ig-gradient text-white shadow-md shadow-pink-500/20'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100/70'
              }`}
            >
              <Receipt className="w-4 h-4" />
              {t('navScan')}
            </button>

            <button
              onClick={() => setActiveTab('manual')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'manual'
                  ? 'ig-gradient text-white shadow-md shadow-pink-500/20'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100/70'
              }`}
            >
              <Calculator className="w-4 h-4" />
              {t('navCalc')}
            </button>

            <button
              onClick={() => setActiveTab('guide')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'guide'
                  ? 'ig-gradient text-white shadow-md shadow-pink-500/20'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100/70'
              }`}
            >
              <Globe2 className="w-4 h-4" />
              {t('navGuide')}
            </button>
          </nav>
        </div>
      </header>

      {/* Mobile Fixed Bottom App Bar (Instagram style!) */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-zinc-200 pb-safe shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
        <div className="grid grid-cols-3 px-2 py-1.5">
          <button
            onClick={() => setActiveTab('scanner')}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all active:scale-95 ${
              activeTab === 'scanner' ? 'text-[#E1306C]' : 'text-zinc-400 hover:text-zinc-600'
            }`}
          >
            <div
              className={`p-1.5 rounded-xl ${
                activeTab === 'scanner' ? 'ig-gradient text-white shadow-sm shadow-pink-500/30' : ''
              }`}
            >
              <Receipt className="w-5 h-5" />
            </div>
            <span
              className={`text-[10px] mt-0.5 font-bold ${
                activeTab === 'scanner' ? 'ig-gradient-text' : ''
              }`}
            >
              {t('navScan')}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('manual')}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all active:scale-95 ${
              activeTab === 'manual' ? 'text-[#E1306C]' : 'text-zinc-400 hover:text-zinc-600'
            }`}
          >
            <div
              className={`p-1.5 rounded-xl ${
                activeTab === 'manual' ? 'ig-gradient text-white shadow-sm shadow-pink-500/30' : ''
              }`}
            >
              <Calculator className="w-5 h-5" />
            </div>
            <span
              className={`text-[10px] mt-0.5 font-bold ${
                activeTab === 'manual' ? 'ig-gradient-text' : ''
              }`}
            >
              {t('navCalc')}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('guide')}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all active:scale-95 ${
              activeTab === 'guide' ? 'text-[#E1306C]' : 'text-zinc-400 hover:text-zinc-600'
            }`}
          >
            <div
              className={`p-1.5 rounded-xl ${
                activeTab === 'guide' ? 'ig-gradient text-white shadow-sm shadow-pink-500/30' : ''
              }`}
            >
              <Globe2 className="w-5 h-5" />
            </div>
            <span
              className={`text-[10px] mt-0.5 font-bold ${
                activeTab === 'guide' ? 'ig-gradient-text' : ''
              }`}
            >
              {t('navGuide')}
            </span>
          </button>
        </div>
      </div>
    </>
  );
};
