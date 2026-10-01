import React, { useState } from 'react';
import { COUNTRY_TIPPING_DATABASE, TippingCultureRule } from '../data/tippingCulture';
import { Search, Globe2, Utensils, Wine, Car, Bike, Coffee, Info, Sparkles } from 'lucide-react';

export const CultureGuide: React.FC = () => {
  const [search, setSearch] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<TippingCultureRule>(COUNTRY_TIPPING_DATABASE['US']);
  const [filterRegion, setFilterRegion] = useState<'all' | 'americas' | 'europe' | 'asia'>('all');

  const allCountries = Object.values(COUNTRY_TIPPING_DATABASE);

  const filteredCountries = allCountries.filter((c) => {
    const matchSearch =
      c.countryName.toLowerCase().includes(search.toLowerCase()) ||
      c.countryCode.toLowerCase().includes(search.toLowerCase());

    if (!matchSearch) return false;

    if (filterRegion === 'americas') {
      return ['US', 'CA', 'MX', 'BR'].includes(c.countryCode);
    }
    if (filterRegion === 'europe') {
      return ['GB', 'FR', 'IT', 'DE', 'ES', 'CH', 'NL', 'GR', 'IE'].includes(c.countryCode);
    }
    if (filterRegion === 'asia') {
      return ['JP', 'KR', 'CN', 'HK', 'AU', 'NZ', 'TH', 'IN', 'SG', 'AE'].includes(c.countryCode);
    }
    return true;
  });

  return (
    <div className="space-y-4 sm:space-y-6 max-w-5xl mx-auto pb-20 sm:pb-8">
      {/* Header */}
      <div className="bg-white rounded-3xl border border-zinc-200/80 p-4 sm:p-8 shadow-[0_2px_12px_rgba(0,0,0,0.04)] relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1.5 ig-gradient" />

        <div className="max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-pink-50 to-amber-50 border border-pink-200/60 text-xs font-bold mb-2">
            <Globe2 className="w-3.5 h-3.5 text-[#E1306C]" />
            <span className="ig-gradient-text">World Tipping Culture Directory</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-zinc-900">
            Global Tipping Etiquette
          </h2>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1">
            Compare dining, bar, taxi, and delivery customs across different countries.
          </p>
        </div>

        {/* Search & Region filter */}
        <div className="mt-5 flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search by country (e.g. France, Japan, Mexico)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-zinc-200 bg-zinc-50/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-[#E1306C]"
            />
          </div>

          <div className="flex gap-1 bg-zinc-100 p-1 rounded-xl overflow-x-auto no-scrollbar">
            {(['all', 'americas', 'europe', 'asia'] as const).map((reg) => (
              <button
                key={reg}
                onClick={() => setFilterRegion(reg)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all whitespace-nowrap ${
                  filterRegion === reg
                    ? 'ig-gradient text-white shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                {reg === 'all' ? 'All' : reg}
              </button>
            ))}
          </div>
        </div>

        {/* Selected Country Detailed Card */}
        {selectedCountry && (
          <div className="mt-5 pt-5 border-t border-zinc-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="ig-story-ring">
                  <span className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-3xl">
                    {selectedCountry.flag}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-black text-zinc-900 flex items-center gap-2">
                    <span>{selectedCountry.countryName}</span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700">
                      {selectedCountry.currencyCode} ({selectedCountry.currencySymbol})
                    </span>
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5">{selectedCountry.cultureSummary}</p>
                </div>
              </div>

              {/* Tier Pills */}
              <div className="flex items-center gap-1.5 bg-zinc-50 border border-zinc-200/80 p-2 rounded-2xl self-start sm:self-auto">
                <div className="text-center px-1.5">
                  <span className="text-[9px] text-zinc-400 font-black uppercase block">Poor</span>
                  <span className="text-xs font-black text-zinc-700">{selectedCountry.poorPercent ?? 0}%</span>
                </div>
                <div className="w-px h-5 bg-zinc-200" />
                <div className="text-center px-1.5">
                  <span className="text-[9px] text-zinc-400 font-black uppercase block">Min</span>
                  <span className="text-xs font-black text-zinc-700">{selectedCountry.minPercent}%</span>
                </div>
                <div className="w-px h-5 bg-zinc-200" />
                <div className="text-center px-1.5">
                  <span className="text-[9px] text-[#E1306C] font-black uppercase block">Avg</span>
                  <span className="text-xs font-black ig-gradient-text">{selectedCountry.avgPercent}%</span>
                </div>
                <div className="w-px h-5 bg-zinc-200" />
                <div className="text-center px-1.5">
                  <span className="text-[9px] text-zinc-400 font-black uppercase block">High</span>
                  <span className="text-xs font-black text-zinc-700">{selectedCountry.highPercent}%</span>
                </div>
              </div>
            </div>

            {/* Service Breakdown Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 mt-3.5">
              <div className="bg-zinc-50 p-3.5 rounded-2xl border border-zinc-200/70">
                <div className="flex items-center gap-2 text-zinc-900 font-black text-xs mb-1.5">
                  <Utensils className="w-3.5 h-3.5 text-[#E1306C]" />
                  <span>Restaurants</span>
                </div>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  {selectedCountry.restaurantAdvice}
                </p>
              </div>

              <div className="bg-zinc-50 p-3.5 rounded-2xl border border-zinc-200/70">
                <div className="flex items-center gap-2 text-zinc-900 font-black text-xs mb-1.5">
                  <Wine className="w-3.5 h-3.5 text-[#833AB4]" />
                  <span>Bars &amp; Pubs</span>
                </div>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  {selectedCountry.barAdvice}
                </p>
              </div>

              <div className="bg-zinc-50 p-3.5 rounded-2xl border border-zinc-200/70">
                <div className="flex items-center gap-2 text-zinc-900 font-black text-xs mb-1.5">
                  <Car className="w-3.5 h-3.5 text-[#F77737]" />
                  <span>Taxis</span>
                </div>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  {selectedCountry.taxiAdvice}
                </p>
              </div>

              <div className="bg-zinc-50 p-3.5 rounded-2xl border border-zinc-200/70">
                <div className="flex items-center gap-2 text-zinc-900 font-black text-xs mb-1.5">
                  <Coffee className="w-3.5 h-3.5 text-[#FCAF45]" />
                  <span>Cafes &amp; Delivery</span>
                </div>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  {selectedCountry.counterCafeAdvice}
                </p>
              </div>
            </div>

            {selectedCountry.specialRules && (
              <div className="mt-3 p-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 rounded-xl text-xs text-amber-900 space-y-1">
                <span className="font-black flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-amber-700" />
                  Local Nuances:
                </span>
                <ul className="list-disc pl-5 space-y-0.5 text-amber-800 text-[11px]">
                  {selectedCountry.specialRules.map((rule, idx) => (
                    <li key={idx}>{rule}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Grid of All Countries */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
        {filteredCountries.map((c) => {
          const isSelected = selectedCountry?.countryCode === c.countryCode;
          return (
            <div
              key={c.countryCode}
              onClick={() => setSelectedCountry(c)}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer bg-white active:scale-98 ${
                isSelected
                  ? 'border-transparent shadow-md ring-2 ring-pink-500/30'
                  : 'border-zinc-200 hover:border-pink-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="ig-story-ring-sm">
                    <span className="w-7 h-7 rounded-full bg-white flex items-center justify-center text-base">
                      {c.flag}
                    </span>
                  </div>
                  <div>
                    <span className="font-extrabold text-xs sm:text-sm text-zinc-900 block leading-tight">
                      {c.countryName}
                    </span>
                    <span className="text-[10px] text-zinc-400 font-mono">{c.currencyCode}</span>
                  </div>
                </div>
                <span
                  className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                    c.isTippingDiscouraged
                      ? 'bg-rose-100 text-rose-800'
                      : 'ig-gradient text-white shadow-xs'
                  }`}
                >
                  {c.isTippingDiscouraged ? '0%' : `Avg ${c.avgPercent}%`}
                </span>
              </div>

              <p className="text-[11px] text-zinc-500 line-clamp-2 leading-relaxed">{c.cultureSummary}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
