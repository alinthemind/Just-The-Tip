import React, { useState, useEffect } from 'react';
import { COUNTRY_TIPPING_DATABASE, TippingCultureRule } from '../data/tippingCulture';
import { Search, Globe2, Utensils, Wine, Car, Coffee, Info, MapPin } from 'lucide-react';

type RegionKey = 'all' | 'americas' | 'europe' | 'asia' | 'middle-east';

const REGION_CONFIG: { id: RegionKey; label: string; icon: string }[] = [
  { id: 'all', label: 'All', icon: '🌐' },
  { id: 'americas', label: 'Americas', icon: '🌎' },
  { id: 'europe', label: 'Europe', icon: '🌍' },
  { id: 'asia', label: 'Asia & Pacific', icon: '🌏' },
  { id: 'middle-east', label: 'Middle East', icon: '🕌' },
];

const COUNTRY_REGION_MAP: Record<string, RegionKey> = {
  US: 'americas',
  CA: 'americas',
  MX: 'americas',
  BR: 'americas',
  GB: 'europe',
  FR: 'europe',
  IT: 'europe',
  DE: 'europe',
  ES: 'europe',
  CH: 'europe',
  NL: 'europe',
  GR: 'europe',
  IE: 'europe',
  JP: 'asia',
  KR: 'asia',
  CN: 'asia',
  HK: 'asia',
  TW: 'asia',
  SG: 'asia',
  TH: 'asia',
  IN: 'asia',
  AU: 'asia',
  NZ: 'asia',
  AE: 'middle-east',
};

export const CultureGuide: React.FC = () => {
  const [search, setSearch] = useState('');
  const [filterRegion, setFilterRegion] = useState<RegionKey>('all');

  const allCountries = Object.values(COUNTRY_TIPPING_DATABASE).sort((a, b) =>
    a.countryName.localeCompare(b.countryName)
  );

  const filteredCountries = allCountries.filter((c) => {
    const matchSearch =
      c.countryName.toLowerCase().includes(search.toLowerCase()) ||
      c.countryCode.toLowerCase().includes(search.toLowerCase());

    if (!matchSearch) return false;

    if (filterRegion !== 'all') {
      return COUNTRY_REGION_MAP[c.countryCode] === filterRegion;
    }
    return true;
  });

  const [selectedCountry, setSelectedCountry] = useState<TippingCultureRule>(
    filteredCountries[0] || COUNTRY_TIPPING_DATABASE['US']
  );

  // Sync selectedCountry whenever region filter or search changes
  useEffect(() => {
    if (
      filteredCountries.length > 0 &&
      !filteredCountries.some((c) => c.countryCode === selectedCountry?.countryCode)
    ) {
      setSelectedCountry(filteredCountries[0]);
    }
  }, [filterRegion, search]);

  const handleSelectRegion = (reg: RegionKey) => {
    setFilterRegion(reg);
    const matches = allCountries.filter((c) => {
      const matchSearch =
        c.countryName.toLowerCase().includes(search.toLowerCase()) ||
        c.countryCode.toLowerCase().includes(search.toLowerCase());
      if (!matchSearch) return false;
      return reg === 'all' || COUNTRY_REGION_MAP[c.countryCode] === reg;
    });
    if (matches.length > 0) {
      setSelectedCountry(matches[0]);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-5xl mx-auto pb-20 sm:pb-8">
      {/* Header */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/80 dark:border-zinc-800 p-4 sm:p-8 shadow-[0_2px_12px_rgba(0,0,0,0.04)] dark:shadow-none relative overflow-hidden transition-colors">
        <div className="absolute top-0 left-0 right-0 h-1.5 ig-gradient" />

        <div className="max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-pink-50 to-amber-50 dark:from-pink-950/40 dark:to-amber-950/40 border border-pink-200/60 dark:border-pink-900/60 text-xs font-bold mb-2">
            <Globe2 className="w-3.5 h-3.5 text-[#E1306C]" />
            <span className="ig-gradient-text">World Tipping Culture Directory</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-100">
            Global Tipping Etiquette
          </h2>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
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
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/70 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:bg-white dark:focus:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-[#E1306C]"
            />
          </div>

          <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl overflow-x-auto no-scrollbar">
            {REGION_CONFIG.map((reg) => {
              const count = allCountries.filter(
                (c) => reg.id === 'all' || COUNTRY_REGION_MAP[c.countryCode] === reg.id
              ).length;
              return (
                <button
                  key={reg.id}
                  onClick={() => handleSelectRegion(reg.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                    filterRegion === reg.id
                      ? 'ig-gradient text-white shadow-xs'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                  }`}
                >
                  <span>{reg.icon}</span>
                  <span>{reg.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      filterRegion === reg.id
                        ? 'bg-white/20 text-white'
                        : 'bg-zinc-200/80 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Country Detailed Card */}
        {selectedCountry && (
          <div className="mt-5 pt-5 border-t border-zinc-100 dark:border-zinc-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="ig-story-ring">
                  <span className="w-12 h-12 rounded-full bg-white dark:bg-zinc-900 flex items-center justify-center text-3xl">
                    {selectedCountry.flag}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <span>{selectedCountry.countryName}</span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                      {selectedCountry.currencyCode} ({selectedCountry.currencySymbol})
                    </span>
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{selectedCountry.cultureSummary}</p>
                </div>
              </div>

              {/* Tier Pills */}
              <div className="flex items-center gap-1.5 bg-zinc-50 dark:bg-zinc-950/80 border border-zinc-200/80 dark:border-zinc-800 p-2 rounded-2xl self-start sm:self-auto">
                <div className="text-center px-1.5">
                  <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-black uppercase block">Poor</span>
                  <span className="text-xs font-black text-zinc-700 dark:text-zinc-300">{selectedCountry.poorPercent ?? 0}%</span>
                </div>
                <div className="w-px h-5 bg-zinc-200 dark:bg-zinc-800" />
                <div className="text-center px-1.5">
                  <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-black uppercase block">Min</span>
                  <span className="text-xs font-black text-zinc-700 dark:text-zinc-300">{selectedCountry.minPercent}%</span>
                </div>
                <div className="w-px h-5 bg-zinc-200 dark:bg-zinc-800" />
                <div className="text-center px-1.5">
                  <span className="text-[9px] text-[#E1306C] font-black uppercase block">Avg</span>
                  <span className="text-xs font-black ig-gradient-text">{selectedCountry.avgPercent}%</span>
                </div>
                <div className="w-px h-5 bg-zinc-200 dark:bg-zinc-800" />
                <div className="text-center px-1.5">
                  <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-black uppercase block">High</span>
                  <span className="text-xs font-black text-zinc-700 dark:text-zinc-300">{selectedCountry.highPercent}%</span>
                </div>
              </div>
            </div>

            {/* Service Breakdown Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 mt-3.5">
              <div className="bg-zinc-50 dark:bg-zinc-950/70 p-3.5 rounded-2xl border border-zinc-200/70 dark:border-zinc-800">
                <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100 font-black text-xs mb-1.5">
                  <Utensils className="w-3.5 h-3.5 text-[#E1306C]" />
                  <span>Restaurants</span>
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  {selectedCountry.restaurantAdvice}
                </p>
              </div>

              <div className="bg-zinc-50 dark:bg-zinc-950/70 p-3.5 rounded-2xl border border-zinc-200/70 dark:border-zinc-800">
                <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100 font-black text-xs mb-1.5">
                  <Wine className="w-3.5 h-3.5 text-[#833AB4]" />
                  <span>Bars &amp; Pubs</span>
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  {selectedCountry.barAdvice}
                </p>
              </div>

              <div className="bg-zinc-50 dark:bg-zinc-950/70 p-3.5 rounded-2xl border border-zinc-200/70 dark:border-zinc-800">
                <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100 font-black text-xs mb-1.5">
                  <Car className="w-3.5 h-3.5 text-[#FD1D1D]" />
                  <span>Taxis &amp; Rides</span>
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  {selectedCountry.taxiAdvice}
                </p>
              </div>

              <div className="bg-zinc-50 dark:bg-zinc-950/70 p-3.5 rounded-2xl border border-zinc-200/70 dark:border-zinc-800">
                <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100 font-black text-xs mb-1.5">
                  <Coffee className="w-3.5 h-3.5 text-[#F56040]" />
                  <span>Cafés &amp; Counters</span>
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  {selectedCountry.counterCafeAdvice}
                </p>
              </div>
            </div>

            {selectedCountry.specialRules && (
              <div className="mt-3 p-3 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200/80 dark:border-amber-900/50 rounded-xl text-xs text-amber-900 dark:text-amber-200 space-y-1">
                <span className="font-black flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
                  <Info className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                  Local Nuances:
                </span>
                <ul className="list-disc pl-5 space-y-0.5 text-amber-800 dark:text-amber-300/90 text-[11px]">
                  {selectedCountry.specialRules.map((rule, idx) => (
                    <li key={idx}>{rule}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Grid of Filtered Countries Header */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
          Listing {filteredCountries.length} {filteredCountries.length === 1 ? 'Country' : 'Countries'}{' '}
          {filterRegion !== 'all' ? `in ${REGION_CONFIG.find((r) => r.id === filterRegion)?.label}` : ''}
        </span>
      </div>

      {/* Grid of All Countries */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
        {filteredCountries.map((c) => {
          const isSelected = selectedCountry?.countryCode === c.countryCode;
          return (
            <div
              key={c.countryCode}
              onClick={() => setSelectedCountry(c)}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer bg-white dark:bg-zinc-900 active:scale-98 ${
                isSelected
                  ? 'border-transparent shadow-md ring-2 ring-pink-500/30'
                  : 'border-zinc-200 dark:border-zinc-800 hover:border-pink-300 dark:hover:border-pink-500/50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="ig-story-ring-sm">
                    <span className="w-7 h-7 rounded-full bg-white dark:bg-zinc-800 flex items-center justify-center text-base">
                      {c.flag}
                    </span>
                  </div>
                  <div>
                    <span className="font-extrabold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 block leading-tight">
                      {c.countryName}
                    </span>
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">{c.currencyCode}</span>
                  </div>
                </div>
                <span
                  className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                    c.isTippingDiscouraged
                      ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
                      : 'ig-gradient text-white shadow-xs'
                  }`}
                >
                  {c.isTippingDiscouraged ? '0%' : `Avg ${c.avgPercent}%`}
                </span>
              </div>

              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">{c.cultureSummary}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
