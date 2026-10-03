import React, { useState, useEffect, useRef } from 'react';
import { COUNTRY_TIPPING_DATABASE, TippingCultureRule, getTippingRuleForCountry } from '../data/tippingCulture';
import { Search, Utensils, Wine, Car, Coffee, Lightbulb, Ban, ChevronRight, Frown, Meh, Smile, SmilePlus } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Card, IconTile, TileColor } from './ui';
import { LanguageCode, getTranslation } from '../data/translations';

type RegionKey = 'all' | 'americas' | 'europe' | 'asia' | 'middle-east';

const REGION_CONFIG: { id: RegionKey; label: string; icon: string }[] = [
  { id: 'all', label: 'All', icon: '🌐' },
  { id: 'americas', label: 'Americas', icon: '🌎' },
  { id: 'europe', label: 'Europe', icon: '🌍' },
  { id: 'asia', label: 'Asia Pacific', icon: '🌏' },
  { id: 'middle-east', label: 'Middle East', icon: '🕌' },
];

const COUNTRY_REGION_MAP: Record<string, RegionKey> = {
  // americas
  US: 'americas',
  CA: 'americas',
  MX: 'americas',
  BR: 'americas',
  AR: 'americas',
  CL: 'americas',
  PE: 'americas',
  CO: 'americas',
  CR: 'americas',
  DO: 'americas',
  JM: 'americas',
  // europe
  GB: 'europe',
  FR: 'europe',
  IT: 'europe',
  DE: 'europe',
  ES: 'europe',
  CH: 'europe',
  NL: 'europe',
  GR: 'europe',
  IE: 'europe',
  PT: 'europe',
  AT: 'europe',
  BE: 'europe',
  CZ: 'europe',
  PL: 'europe',
  HU: 'europe',
  HR: 'europe',
  DK: 'europe',
  SE: 'europe',
  NO: 'europe',
  IS: 'europe',
  TR: 'europe',
  // asia
  JP: 'asia',
  KR: 'asia',
  CN: 'asia',
  HK: 'asia',
  MO: 'asia',
  TW: 'asia',
  SG: 'asia',
  TH: 'asia',
  IN: 'asia',
  AU: 'asia',
  NZ: 'asia',
  VN: 'asia',
  ID: 'asia',
  MY: 'asia',
  PH: 'asia',
  KH: 'asia',
  LK: 'asia',
  MV: 'asia',
  FJ: 'asia',
  // middle-east
  AE: 'middle-east',
  IL: 'middle-east',
  JO: 'middle-east',
  QA: 'middle-east',
  SA: 'middle-east',
  OM: 'middle-east',
  BH: 'middle-east',
  EG: 'middle-east',
};

/** Four bars, one per service level, scaled against a 25% ceiling */
const TipMeter: React.FC<{ country: TippingCultureRule; t: (k: string) => string }> = ({ country, t }) => {
  const tiers: Array<{ pct: number; icon: LucideIcon; label: string; bar: string }> = [
    { pct: getTippingRuleForCountry(country.countryCode).poorPercent, icon: Frown, label: t('tierPoor'), bar: 'bg-[#8e8e93]' },
    { pct: country.minPercent, icon: Meh, label: t('tierMinimum'), bar: 'bg-ig-orange' },
    { pct: country.avgPercent, icon: Smile, label: t('tierAverage'), bar: 'ig-gradient' },
    { pct: country.highPercent, icon: SmilePlus, label: t('tierHigh'), bar: 'bg-ig-purple' },
  ];
  const ceiling = Math.max(25, ...tiers.map((x) => x.pct));
  return (
    <div className="grid grid-cols-4 gap-3 items-end h-36" role="img" aria-label={tiers.map((x) => `${x.label} ${x.pct}%`).join(', ')}>
      {tiers.map(({ pct, icon: Icon, label, bar }) => (
        <div key={label} className="flex flex-col items-center justify-end h-full gap-1.5" title={label}>
          <span className="text-[15px] font-semibold tabular-nums text-zinc-900 dark:text-white">{pct}%</span>
          <div className="w-full max-w-[44px] flex-1 flex items-end">
            <div
              className={`w-full rounded-[8px] ${pct > 0 ? bar : 'bg-[#767680]/20'} transition-all duration-500`}
              style={{ height: `${Math.max(6, (pct / ceiling) * 100)}%` }}
            />
          </div>
          <Icon className="w-5 h-5 text-zinc-400" strokeWidth={1.8} />
        </div>
      ))}
    </div>
  );
};

export const CultureGuide: React.FC<{ currentLang?: LanguageCode }> = ({ currentLang = 'en' }) => {
  const t = (key: string) => getTranslation(currentLang, key);
  const [search, setSearch] = useState('');
  const [filterRegion, setFilterRegion] = useState<RegionKey>('all');
  const detailRef = useRef<HTMLDivElement>(null);

  const allCountries = Object.values(COUNTRY_TIPPING_DATABASE).sort((a, b) =>
    a.countryName.localeCompare(b.countryName)
  );

  const matches = (c: TippingCultureRule, reg: RegionKey) => {
    const q = search.toLowerCase();
    const matchSearch = c.countryName.toLowerCase().includes(q) || c.countryCode.toLowerCase().includes(q);
    return matchSearch && (reg === 'all' || COUNTRY_REGION_MAP[c.countryCode] === reg);
  };
  const filteredCountries = allCountries.filter((c) => matches(c, filterRegion));

  // Nothing is selected until the user taps a country
  const [selectedCountry, setSelectedCountry] = useState<TippingCultureRule | null>(null);

  // Drop the selection if the current search or region hides it
  useEffect(() => {
    if (selectedCountry && !filteredCountries.some((c) => c.countryCode === selectedCountry.countryCode)) {
      setSelectedCountry(null);
    }
  }, [filterRegion, search]);

  const handleSelect = (c: TippingCultureRule) => {
    setSelectedCountry(c);
    detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const services: Array<{ icon: LucideIcon; color: TileColor; label: string; text: string }> = selectedCountry
    ? [
        { icon: Utensils, color: 'gradient', label: t('restaurants'), text: selectedCountry.restaurantAdvice },
        { icon: Wine, color: 'purple', label: t('bars'), text: selectedCountry.barAdvice },
        { icon: Car, color: 'blue', label: t('taxis'), text: selectedCountry.taxiAdvice },
        { icon: Coffee, color: 'yellow', label: t('cafes'), text: selectedCountry.counterCafeAdvice },
      ]
    : [];

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <h2 className="text-[34px] font-bold tracking-tight text-zinc-900 dark:text-white px-1">{t('navGuide')}</h2>

      {/* Search + regions */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="search"
            placeholder={t('searchCountry')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-[17px] rounded-[10px] bg-[#767680]/12 dark:bg-[#767680]/24 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-3 px-3 sm:mx-0 sm:px-0">
          {REGION_CONFIG.map((reg) => (
            <button
              key={reg.id}
              type="button"
              onClick={() => setFilterRegion(reg.id)}
              className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[15px] font-medium transition-colors cursor-pointer ${
                filterRegion === reg.id
                  ? 'ig-gradient text-white'
                  : 'bg-white dark:bg-elevated text-zinc-700 dark:text-zinc-300'
              }`}
            >
              <span>{reg.icon}</span>
              <span>{reg.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Selected country */}
      {selectedCountry && (
        <div ref={detailRef} className="space-y-3 scroll-mt-20">
          <Card className="p-5">
            <div className="flex items-center gap-4">
              <span className="text-[52px] leading-none">{selectedCountry.flag}</span>
              <div className="min-w-0">
                <h3 className="text-[22px] font-bold tracking-tight text-zinc-900 dark:text-white truncate">
                  {selectedCountry.countryName}
                </h3>
                <div className="text-[15px] text-zinc-500 dark:text-zinc-400 tabular-nums">
                  {selectedCountry.currencySymbol} · {selectedCountry.currencyCode}
                </div>
              </div>
              {selectedCountry.isTippingDiscouraged && (
                <span className="ml-auto" title={t('tippingNotCustomary')}>
                  <IconTile icon={Ban} color="purple" />
                </span>
              )}
            </div>
            <div className="mt-6">
              <TipMeter country={selectedCountry} t={t} />
            </div>
            <p className="mt-5 text-[15px] leading-snug text-zinc-600 dark:text-zinc-400">{selectedCountry.cultureSummary}</p>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {services.map((s) => (
              <Card key={s.label} className="p-4">
                <div className="flex items-center gap-2.5 mb-2">
                  <IconTile icon={s.icon} color={s.color} size="sm" />
                  <span className="text-[15px] font-semibold text-zinc-900 dark:text-white">{s.label}</span>
                </div>
                <p className="text-[14px] leading-snug text-zinc-600 dark:text-zinc-400">{s.text}</p>
              </Card>
            ))}
          </div>

          {selectedCountry.specialRules && selectedCountry.specialRules.length > 0 && (
            <Card className="p-4 space-y-2">
              {selectedCountry.specialRules.map((rule, idx) => (
                <div key={idx} className="flex items-start gap-2.5 text-[14px] leading-snug text-zinc-700 dark:text-zinc-300">
                  <Lightbulb className="w-4 h-4 text-ig-orange mt-0.5 flex-shrink-0" />
                  <span>{rule}</span>
                </div>
              ))}
            </Card>
          )}
        </div>
      )}

      {/* All countries */}
      <Card className="overflow-hidden">
        {filteredCountries.map((c) => {
          const isSelected = selectedCountry?.countryCode === c.countryCode;
          return (
            <button
              key={c.countryCode}
              type="button"
              onClick={() => handleSelect(c)}
              className={`w-full flex items-center gap-3 pl-4 text-left cursor-pointer group transition-colors ${
                isSelected ? 'bg-accent/[0.06]' : 'active:bg-zinc-100 dark:active:bg-elevated-2'
              }`}
            >
              <span className="text-[26px] leading-none">{c.flag}</span>
              <div className="flex-1 flex items-center gap-2 py-3 pr-3 border-b border-black/[0.06] dark:border-white/[0.08] group-last:border-b-0 min-w-0">
                <span className={`flex-1 text-[17px] truncate ${isSelected ? 'text-accent font-medium' : 'text-zinc-900 dark:text-white'}`}>
                  {c.countryName}
                </span>
                {c.isTippingDiscouraged ? (
                  <Ban className="w-4 h-4 text-ig-purple dark:text-[#b67be0]" aria-label={t('tippingNotCustomary')} />
                ) : (
                  <span className="text-[15px] tabular-nums text-zinc-400">{c.avgPercent}%</span>
                )}
                <ChevronRight className="w-4 h-4 text-zinc-300 dark:text-zinc-600" />
              </div>
            </button>
          );
        })}
        {filteredCountries.length === 0 && (
          <div className="p-8 flex justify-center text-zinc-400">
            <Search className="w-8 h-8" />
          </div>
        )}
      </Card>
    </div>
  );
};
