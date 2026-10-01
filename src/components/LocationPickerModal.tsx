import React, { useState } from 'react';
import { UserLocation } from '../types';
import { COUNTRY_TIPPING_DATABASE } from '../data/tippingCulture';
import { X, Search, MapPin, RefreshCw, Check, Sparkles } from 'lucide-react';

interface LocationPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLocation: UserLocation;
  onSelectCountry: (countryCode: string) => void;
  onRefreshGps: () => void;
  isLocating: boolean;
}

export const LocationPickerModal: React.FC<LocationPickerModalProps> = ({
  isOpen,
  onClose,
  currentLocation,
  onSelectCountry,
  onRefreshGps,
  isLocating,
}) => {
  const [search, setSearch] = useState('');

  if (!isOpen) return null;

  const countries = Object.values(COUNTRY_TIPPING_DATABASE);
  const filtered = countries.filter(
    (c) =>
      c.countryName.toLowerCase().includes(search.toLowerCase()) ||
      c.countryCode.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl border border-zinc-200 overflow-hidden relative">
        {/* Instagram top gradient */}
        <div className="h-1.5 ig-gradient w-full" />

        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="ig-story-ring-sm">
              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[#E1306C]">
                <MapPin className="w-4 h-4" />
              </div>
            </div>
            <div>
              <h3 className="font-black text-zinc-900 text-sm sm:text-base">Select Dining Location</h3>
              <p className="text-[11px] text-zinc-500">Tipping culture &amp; rates adapt to your destination</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-zinc-100 text-zinc-500 hover:text-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* GPS Button */}
        <div className="p-4 bg-zinc-50/80 border-b border-zinc-200/80">
          <button
            onClick={() => {
              onRefreshGps();
            }}
            disabled={isLocating}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl ig-gradient hover:opacity-95 active:scale-98 text-white font-bold text-xs shadow-md shadow-pink-500/20 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLocating ? 'animate-spin' : ''}`} />
            <span>{isLocating ? 'Detecting GPS from Phone...' : 'Detect Location from Phone GPS'}</span>
          </button>

          {currentLocation.isGps && (
            <div className="mt-2 text-center text-[11px] text-[#E1306C] flex items-center justify-center gap-1 font-bold">
              <Check className="w-3.5 h-3.5" />
              <span>Current GPS: {currentLocation.city || currentLocation.countryName} ({currentLocation.countryCode})</span>
            </div>
          )}
        </div>

        {/* Search */}
        <div className="p-4 pb-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search 20+ countries (e.g. France, Japan, Mexico)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-zinc-200 bg-zinc-50/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-[#E1306C]"
            />
          </div>
        </div>

        {/* Country List */}
        <div className="flex-1 overflow-y-auto p-4 pt-1 space-y-1 divide-y divide-zinc-100">
          {filtered.map((item) => {
            const isSelected = currentLocation.countryCode === item.countryCode;
            return (
              <button
                key={item.countryCode}
                onClick={() => {
                  onSelectCountry(item.countryCode);
                  onClose();
                }}
                className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all cursor-pointer text-left ${
                  isSelected
                    ? 'bg-pink-50/60 text-zinc-950 font-bold border border-pink-200'
                    : 'hover:bg-zinc-50 text-zinc-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="ig-story-ring-sm">
                    <span className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-lg">
                      {item.flag}
                    </span>
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-black flex items-center gap-2">
                      <span>{item.countryName}</span>
                      <span className="text-[10px] text-zinc-400 font-mono">({item.currencyCode})</span>
                    </div>
                    <div className="text-[11px] text-zinc-500 font-medium">
                      {item.isTippingDiscouraged
                        ? 'No Tipping (0%)'
                        : `Min ${item.minPercent}% • Avg ${item.avgPercent}% • High ${item.highPercent}%`}
                    </div>
                  </div>
                </div>

                {isSelected ? (
                  <span className="p-1 rounded-full ig-gradient text-white shadow-xs">
                    <Check className="w-3.5 h-3.5" />
                  </span>
                ) : (
                  <span className="text-xs text-zinc-400 font-mono">{item.countryCode}</span>
                )}
              </button>
            );
          })}

          {filtered.length === 0 && (
            <div className="p-6 text-center text-xs text-zinc-500">
              No country found for "{search}".
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
