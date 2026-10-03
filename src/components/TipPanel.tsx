import React from 'react';
import { Frown, Meh, Smile, SmilePlus, SlidersHorizontal, Equal, Coins, Banknote, Receipt, HandCoins, Plus } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Card, Segmented } from './ui';
import { BillSplitter } from './BillSplitter';
import { computeTip, formatMoney, RoundMode } from '../utils/tipMath';

export type TierKey = 'poor' | 'minimum' | 'average' | 'high' | 'custom';

const TIER_META: Record<Exclude<TierKey, 'custom'>, { icon: LucideIcon; labelKey: string; tint: string }> = {
  poor: { icon: Frown, labelKey: 'tierPoor', tint: 'text-[#8e8e93]' },
  minimum: { icon: Meh, labelKey: 'tierMinimum', tint: 'text-[#ff9500]' },
  average: { icon: Smile, labelKey: 'tierAverage', tint: 'text-accent' },
  high: { icon: SmilePlus, labelKey: 'tierHigh', tint: 'text-[#34c759]' },
};

interface TipPanelProps {
  percents: Record<Exclude<TierKey, 'custom'>, number>;
  selected: TierKey;
  onSelect: (tier: TierKey) => void;
  customPercent: number;
  onCustomPercent: (pct: number) => void;
  roundMode: RoundMode;
  onRoundMode: (mode: RoundMode) => void;
  basis: number;
  billTotal: number;
  currencySymbol: string;
  currencyCode: string;
  merchantName: string;
  t: (key: string) => string;
  /** Rendered at the right of the total card, e.g. a "scan another" button */
  totalAction?: React.ReactNode;
}

export const TipPanel: React.FC<TipPanelProps> = ({
  percents,
  selected,
  onSelect,
  customPercent,
  onCustomPercent,
  roundMode,
  onRoundMode,
  basis,
  billTotal,
  currencySymbol,
  currencyCode,
  merchantName,
  t,
  totalAction,
}) => {
  const activePct = selected === 'custom' ? customPercent : percents[selected];
  const active = computeTip(basis, billTotal, activePct, roundMode);
  const sliderMax = 35;

  return (
    <div className="space-y-3">
      {/* Tier picker: face icon, percentage, tip amount */}
      <Card className="p-2">
        <div className="grid grid-cols-4 gap-1.5">
          {(Object.keys(TIER_META) as Array<keyof typeof TIER_META>).map((key) => {
            const meta = TIER_META[key];
            const Icon = meta.icon;
            const data = computeTip(basis, billTotal, percents[key], roundMode);
            const isSelected = selected === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => onSelect(key)}
                title={t(meta.labelKey)}
                aria-label={`${t(meta.labelKey)} ${percents[key]}%`}
                aria-pressed={isSelected}
                className={`flex flex-col items-center gap-1 py-3 px-1 rounded-[16px] transition-all cursor-pointer active:scale-95 ${
                  isSelected
                    ? 'bg-accent text-white shadow-[0_6px_16px_-6px_rgba(255,45,85,0.6)]'
                    : 'hover:bg-zinc-100 dark:hover:bg-elevated-2'
                }`}
              >
                <Icon className={`w-7 h-7 ${isSelected ? 'text-white' : meta.tint}`} strokeWidth={1.8} />
                <span className={`text-[17px] font-semibold tabular-nums leading-none mt-1 ${isSelected ? '' : 'text-zinc-900 dark:text-white'}`}>
                  {percents[key]}%
                </span>
                <span className={`text-[12px] tabular-nums ${isSelected ? 'text-white/85' : 'text-zinc-500 dark:text-zinc-400'}`}>
                  {formatMoney(currencySymbol, data.tipAmount)}
                </span>
              </button>
            );
          })}
        </div>

        {/* Custom percentage slider */}
        <div className="flex items-center gap-3 px-2.5 pt-3 pb-2">
          <SlidersHorizontal
            className={`w-[18px] h-[18px] flex-shrink-0 ${selected === 'custom' ? 'text-accent' : 'text-zinc-400'}`}
            aria-label={t('customTip')}
          />
          <input
            type="range"
            min="0"
            max={sliderMax}
            step="1"
            value={customPercent}
            aria-label={t('customTip')}
            onChange={(e) => {
              onCustomPercent(parseInt(e.target.value, 10));
              onSelect('custom');
            }}
            className="ios-slider flex-1 cursor-pointer"
            style={{ ['--fill' as any]: `${(customPercent / sliderMax) * 100}%` }}
          />
          <span
            className={`text-[15px] font-semibold tabular-nums w-11 text-right ${
              selected === 'custom' ? 'text-accent' : 'text-zinc-500 dark:text-zinc-400'
            }`}
          >
            {customPercent}%
          </span>
        </div>
      </Card>

      {/* Rounding */}
      <Segmented<RoundMode>
        value={roundMode}
        onChange={onRoundMode}
        options={[
          { value: 'none', icon: Equal, label: t('roundExact') },
          { value: 'total', icon: Coins, label: t('roundTotal') },
          { value: 'tip', icon: Banknote, label: t('roundTip') },
        ]}
      />

      {/* Total */}
      <Card className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[13px] font-medium text-zinc-500 dark:text-zinc-400">{t('total')}</div>
            <div className="text-[44px] leading-[1.05] font-bold tracking-tight tabular-nums text-zinc-900 dark:text-white mt-0.5">
              {formatMoney(currencySymbol, active.grandTotal)}
            </div>
          </div>
          {totalAction}
        </div>
        <div className="mt-3 flex items-center gap-2 text-[15px] tabular-nums text-zinc-500 dark:text-zinc-400 flex-wrap">
          <span className="inline-flex items-center gap-1.5" title={t('bill')}>
            <Receipt className="w-4 h-4" />
            {formatMoney(currencySymbol, billTotal)}
          </span>
          <Plus className="w-3.5 h-3.5 opacity-60" />
          <span className="inline-flex items-center gap-1.5 text-accent font-semibold" title={t('tip')}>
            <HandCoins className="w-4 h-4" />
            {formatMoney(currencySymbol, active.tipAmount)}
            <span className="font-normal opacity-80">· {active.percent}%</span>
          </span>
        </div>

        <BillSplitter
          totalWithTip={active.grandTotal}
          tipAmount={active.tipAmount}
          currencySymbol={currencySymbol}
          currencyCode={currencyCode}
          merchantName={merchantName}
          t={t}
        />
      </Card>
    </div>
  );
};
