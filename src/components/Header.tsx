import React from 'react';
import { ActiveTab, UserLocation } from '../types';
import { MapPin, Navigation, Receipt, Calculator, Globe2, History, RefreshCw, Sparkles } from 'lucide-react';
import { TipCameraGlyph } from './InstagramIcon';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  userLocation: UserLocation;
  onOpenLocationPicker: () => void;
  onRefreshGps: () => void;
  isLocating: boolean;
  historyCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  userLocation,
  onOpenLocationPicker,
  onRefreshGps,
  isLocating,
  historyCount,
}) => {
  return (
    <>
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-zinc-100 shadow-[0_1px_3px_rgba(0,0,0,0.03)] pt-safe">
        <div className="max-w-5xl mx-auto px-3 sm:px-6">
          <div className="flex items-center justify-between py-2.5 sm:py-3 gap-2">
            {/* Brand Logo & Title */}
            <div className="flex items-center gap-2 sm:gap-2.5">
              <TipCameraGlyph size={26} />
              <div>
                <div className="flex items-center gap-1.5">
                  <h1 className="font-extrabold text-zinc-900 text-lg sm:text-xl tracking-tight leading-none">
                    Just the <span className="ig-gradient-text font-black">Tip</span>
                  </h1>
                </div>
                <p className="text-[10px] text-zinc-400 font-medium hidden sm:block mt-0.5">
                  Receipt AI • GPS Culture Engine
                </p>
              </div>
            </div>

            {/* Location Pill & GPS Button */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={onOpenLocationPicker}
                className="group flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-full border border-zinc-200 bg-white hover:border-pink-300 hover:shadow-sm active:scale-95 transition-all text-xs font-semibold text-zinc-800 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                title="Change location"
              >
                <div className="ig-story-ring-sm flex-shrink-0">
                  <span className="w-5 h-5 rounded-full bg-white flex items-center justify-center text-xs">
                    {userLocation.flag}
                  </span>
                </div>
                <div className="flex items-center gap-1 max-w-[120px] sm:max-w-[200px] truncate text-left">
                  <span className="truncate text-xs font-bold text-zinc-900">
                    {userLocation.city ? userLocation.city : userLocation.countryName}
                  </span>
                  {userLocation.source === 'receipt' && (
                    <span className="text-[8px] tracking-wider uppercase font-extrabold px-1.5 py-0.2 rounded-full bg-pink-100 text-pink-700 hidden xs:inline-block">
                      Receipt
                    </span>
                  )}
                </div>
                <MapPin className="w-3.5 h-3.5 text-[#E1306C] flex-shrink-0 group-hover:scale-110 transition-transform" />
              </button>

              <button
                onClick={onRefreshGps}
                disabled={isLocating}
                className="p-2 rounded-full border border-zinc-200 bg-white hover:bg-zinc-50 active:scale-95 text-zinc-600 hover:text-[#E1306C] transition-all disabled:opacity-50 shadow-sm"
                title="Refresh GPS from phone"
                aria-label="Refresh GPS"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin text-[#E1306C]' : ''}`} />
              </button>
            </div>
          </div>

          {/* Desktop & Tablet Navigation Tabs */}
          <nav className="hidden sm:flex space-x-1 border-t border-zinc-100 -mb-px py-1">
            <button
              onClick={() => setActiveTab('scanner')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all whitespace-nowrap ${
                activeTab === 'scanner'
                  ? 'ig-gradient text-white shadow-md shadow-pink-500/20'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100/70'
              }`}
            >
              <Receipt className="w-4 h-4" />
              Scan Receipt
            </button>

            <button
              onClick={() => setActiveTab('manual')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all whitespace-nowrap ${
                activeTab === 'manual'
                  ? 'ig-gradient text-white shadow-md shadow-pink-500/20'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100/70'
              }`}
            >
              <Calculator className="w-4 h-4" />
              Quick Calc
            </button>

            <button
              onClick={() => setActiveTab('guide')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all whitespace-nowrap ${
                activeTab === 'guide'
                  ? 'ig-gradient text-white shadow-md shadow-pink-500/20'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100/70'
              }`}
            >
              <Globe2 className="w-4 h-4" />
              World Etiquette
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all whitespace-nowrap ${
                activeTab === 'history'
                  ? 'ig-gradient text-white shadow-md shadow-pink-500/20'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100/70'
              }`}
            >
              <History className="w-4 h-4" />
              History
              {historyCount > 0 && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                    activeTab === 'history' ? 'bg-white/30 text-white' : 'bg-pink-100 text-pink-700'
                  }`}
                >
                  {historyCount}
                </span>
              )}
            </button>
          </nav>
        </div>
      </header>

      {/* Mobile Fixed Bottom App Bar (Instagram style!) */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-zinc-200 pb-safe shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
        <div className="grid grid-cols-4 px-2 py-1.5">
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
              Scan
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
              Calc
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
              Guide
            </span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all active:scale-95 relative ${
              activeTab === 'history' ? 'text-[#E1306C]' : 'text-zinc-400 hover:text-zinc-600'
            }`}
          >
            <div
              className={`p-1.5 rounded-xl relative ${
                activeTab === 'history' ? 'ig-gradient text-white shadow-sm shadow-pink-500/30' : ''
              }`}
            >
              <History className="w-5 h-5" />
              {historyCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-pink-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white">
                  {historyCount}
                </span>
              )}
            </div>
            <span
              className={`text-[10px] mt-0.5 font-bold ${
                activeTab === 'history' ? 'ig-gradient-text' : ''
              }`}
            >
              History
            </span>
          </button>
        </div>
      </div>
    </>
  );
};
