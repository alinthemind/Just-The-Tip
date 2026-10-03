import React, { useState } from 'react';
import { UserLocation } from '../types';
import { getTippingRuleForCountry } from '../data/tippingCulture';
import { ChevronRight, Percent, ShieldAlert, Ban } from 'lucide-react';
import { Card, Chip, IconTile } from './ui';
import { TipPanel, TierKey } from './TipPanel';
import { RoundMode } from '../utils/tipMath';
import { LanguageCode, getTranslation } from '../data/translations';

interface ManualCalculatorProps {
  userLocation: UserLocation;
  onOpenLocationPicker: () => void;
  currentLang?: LanguageCode;
}

export const ManualCalculator: React.FC<ManualCalculatorProps> = ({
  userLocation,
  onOpenLocationPicker,
  currentLang = 'en',
}) => {
  const t = (key: string) => getTranslation(currentLang, key);
  const rule = getTippingRuleForCountry(userLocation.countryCode);
  const [billAmount, setBillAmount] = useState<string>('68.00');
  const [surchargeAmount, setSurchargeAmount] = useState<string>('');
  const [taxAmount, setTaxAmount] = useState<string>('5.86');
  const [selectedTier, setSelectedTier] = useState<TierKey>('average');
  const [customPercent, setCustomPercent] = useState<number>(rule.avgPercent);
  const [roundMode, setRoundMode] = useState<RoundMode>('none');

  const rawBill = parseFloat(billAmount) || 0; // Pure pre-tax subtotal
  const rawSurcharges = parseFloat(surchargeAmount) || 0;
  const rawTax = parseFloat(taxAmount) || 0;
  const totalBillDue = rawBill + rawSurcharges + rawTax;

  // Where tipping is discouraged, every suggested tier is 0%; the custom slider stays available
  const pct = (n: number | undefined) => (rule.isTippingDiscouraged ? 0 : n ?? 0);

  const extraRows: Array<{ icon: typeof Percent; color: 'gray' | 'orange'; label: string; value: string; set: (v: string) => void }> = [
    { icon: Percent, color: 'gray', label: t('tax'), value: taxAmount, set: setTaxAmount },
    { icon: ShieldAlert, color: 'orange', label: t('fees'), value: surchargeAmount, set: setSurchargeAmount },
  ];

  return (
    <div className="space-y-5 max-w-xl mx-auto">
      {/* Location */}
      <div className="flex items-center justify-between px-1">
        <h2 className="text-[34px] font-bold tracking-tight text-zinc-900 dark:text-white">{t('navCalc')}</h2>
        <button
          type="button"
          onClick={onOpenLocationPicker}
          title={t('changeLocation')}
          className="inline-flex items-center gap-1.5 pl-2 pr-1.5 py-1 rounded-full bg-white dark:bg-elevated text-[15px] font-medium text-zinc-900 dark:text-white active:scale-95 transition-transform cursor-pointer"
        >
          <span className="text-xl leading-none">{rule.flag}</span>
          <span>{rule.currencyCode}</span>
          <ChevronRight className="w-4 h-4 text-zinc-400" />
        </button>
      </div>

      {/* Big amount entry */}
      <Card className="px-5 pt-6 pb-5 text-center">
        <label htmlFor="calc-amount" className="text-[13px] font-medium text-zinc-500 dark:text-zinc-400">
          {t('preTaxBasis')}
        </label>
        <div className="flex items-baseline justify-center gap-1 mt-1">
          <span className="text-[34px] font-semibold text-zinc-400">{rule.currencySymbol}</span>
          <input
            id="calc-amount"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={billAmount}
            onChange={(e) => setBillAmount(e.target.value)}
            className="w-full max-w-[260px] bg-transparent text-[56px] leading-none font-bold tracking-tight tabular-nums text-zinc-900 dark:text-white focus:outline-none text-center caret-accent"
            placeholder="0.00"
          />
        </div>
        {rule.isTippingDiscouraged && (
          <div className="mt-3 flex justify-center">
            <Chip icon={Ban} tone="purple" title={rule.cultureSummary}>
              {t('tippingNotCustomary')}
            </Chip>
          </div>
        )}

        {/* Tax and fees: added to the bill, never tipped on */}
        <div className="mt-5 grid grid-cols-2 gap-2 text-left">
          {extraRows.map((row) => (
            <label
              key={row.label}
              title={t('notTippedOn')}
              className="flex items-center gap-2.5 rounded-[14px] bg-[#767680]/[0.08] dark:bg-[#767680]/20 px-3 py-2.5 cursor-text"
            >
              <IconTile icon={row.icon} color={row.color} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="text-[12px] text-zinc-500 dark:text-zinc-400 leading-tight">{row.label}</div>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  value={row.value}
                  onChange={(e) => row.set(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-transparent text-[17px] font-medium tabular-nums text-zinc-900 dark:text-white focus:outline-none"
                />
              </div>
            </label>
          ))}
        </div>
      </Card>

      <TipPanel
        percents={{
          poor: pct(rule.poorPercent),
          minimum: pct(rule.minPercent),
          average: pct(rule.avgPercent),
          high: pct(rule.highPercent),
        }}
        selected={selectedTier}
        onSelect={setSelectedTier}
        customPercent={customPercent}
        onCustomPercent={setCustomPercent}
        roundMode={roundMode}
        onRoundMode={setRoundMode}
        basis={rawBill}
        billTotal={totalBillDue}
        currencySymbol={rule.currencySymbol}
        currencyCode={rule.currencyCode}
        merchantName={t('appName')}
        t={t}
      />
    </div>
  );
};
