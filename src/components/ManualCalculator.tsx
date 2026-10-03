import React, { useState } from 'react';
import { UserLocation } from '../types';
import { getTippingRuleForCountry } from '../data/tippingCulture';
import { BillSplitter } from './BillSplitter';
import { Calculator, MapPin, Coins, Banknote, Info, ShieldCheck, Flame } from 'lucide-react';

interface ManualCalculatorProps {
  userLocation: UserLocation;
  onOpenLocationPicker: () => void;
}

export const ManualCalculator: React.FC<ManualCalculatorProps> = ({
  userLocation,
  onOpenLocationPicker,
}) => {
  const rule = getTippingRuleForCountry(userLocation.countryCode);
  const [billAmount, setBillAmount] = useState<string>('68.00');
  const [hasSurcharges, setHasSurcharges] = useState<boolean>(false);
  const [surchargeAmount, setSurchargeAmount] = useState<string>('3.40');
  const [taxAmount, setTaxAmount] = useState<string>('5.86');
  const [selectedTier, setSelectedTier] = useState<'poor' | 'min' | 'avg' | 'high' | 'custom'>('avg');
  const [customPercent, setCustomPercent] = useState<number>(rule.avgPercent);
  // Rounding mode: 'none' (exact cents) | 'total' (round total bill to whole $) | 'tip' (round tip amount to whole $)
  const [roundMode, setRoundMode] = useState<'none' | 'total' | 'tip'>('none');

  const rawBill = parseFloat(billAmount) || 0; // Pure pre-tax subtotal
  const rawSurcharges = hasSurcharges ? parseFloat(surchargeAmount) || 0 : 0;
  const rawTax = parseFloat(taxAmount) || 0;
  const totalBillDue = rawBill + rawSurcharges + rawTax;

  // STRICT PRE-TAX TIP BASIS: only rawBill, excluding surcharges and excluding taxes!
  const tipBasisAmount = rawBill;

  // Compute exact tip, grand total, and rounded amounts
  const computeTierValues = (pct: number) => {
    const effectivePct = rule.isTippingDiscouraged ? 0 : pct;
    const rawTip = Math.round(tipBasisAmount * (effectivePct / 100) * 100) / 100;
    const rawTotal = Math.round((totalBillDue + rawTip) * 100) / 100;

    if (roundMode === 'none' || rawTotal <= 0) {
      return {
        percent: effectivePct,
        tip: rawTip,
        total: rawTotal,
        isRounded: false,
        roundType: 'none' as const,
      };
    }

    if (roundMode === 'total') {
      // Round total bill to whole dollar
      const roundedTotal = Math.ceil(rawTotal);
      const adjustedTip = Math.max(0, Math.round((roundedTotal - totalBillDue) * 100) / 100);
      const finalPct = tipBasisAmount > 0 ? Math.round((adjustedTip / tipBasisAmount) * 1000) / 10 : 0;

      return {
        percent: finalPct,
        tip: adjustedTip,
        total: roundedTotal,
        isRounded: roundedTotal !== rawTotal,
        roundType: 'total' as const,
      };
    }

    // roundMode === 'tip': Round tip amount itself to whole dollar
    let roundedTip = Math.round(rawTip);
    if (effectivePct > 0 && rawTip > 0 && roundedTip === 0) roundedTip = 1;
    if (effectivePct === 0) roundedTip = 0;

    const finalTotal = Math.round((totalBillDue + roundedTip) * 100) / 100;
    const finalPct = tipBasisAmount > 0 ? Math.round((roundedTip / tipBasisAmount) * 1000) / 10 : 0;

    return {
      percent: finalPct,
      tip: roundedTip,
      total: finalTotal,
      isRounded: roundedTip !== rawTip,
      roundType: 'tip' as const,
    };
  };

  // Tip calculation
  const getActiveTip = () => {
    let pct = rule.avgPercent;
    if (selectedTier === 'poor') pct = rule.poorPercent;
    else if (selectedTier === 'min') pct = rule.minPercent;
    else if (selectedTier === 'avg') pct = rule.avgPercent;
    else if (selectedTier === 'high') pct = rule.highPercent;
    else pct = customPercent;

    return computeTierValues(pct);
  };

  const active = getActiveTip();

  return (
    <div className="space-y-4 sm:space-y-6 max-w-3xl mx-auto pb-20 sm:pb-8">
      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/80 dark:border-zinc-800 p-4 sm:p-8 shadow-[0_2px_12px_rgba(0,0,0,0.04)] dark:shadow-none relative overflow-hidden transition-colors">
        {/* Instagram top bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 ig-gradient" />

        {/* Title & Location indicator */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-pink-50 to-amber-50 dark:from-pink-950/40 dark:to-amber-950/40 border border-pink-200/60 dark:border-pink-900/60 text-xs font-bold mb-2">
              <Calculator className="w-3.5 h-3.5 text-[#E1306C]" />
              <span className="ig-gradient-text">Pre-Tax Culture Tip Calculator</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-100">
              Just the Tip Calculator
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Enter your food &amp; beverage subtotal to calculate tips excluding taxes and health mandates.
            </p>
          </div>

          <button
            onClick={onOpenLocationPicker}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:border-pink-300 dark:hover:border-pink-500/50 text-xs font-bold text-zinc-800 dark:text-zinc-200 transition-all cursor-pointer shadow-xs active:scale-95"
          >
            <div className="ig-story-ring-sm">
              <span className="w-5 h-5 rounded-full bg-white dark:bg-zinc-900 flex items-center justify-center text-xs">
                {rule.flag}
              </span>
            </div>
            <span className="font-extrabold text-zinc-900 dark:text-zinc-100">{rule.countryName}</span>
            <MapPin className="w-3.5 h-3.5 text-[#E1306C]" />
          </button>
        </div>

        {/* Culture note banner */}
        {rule.isTippingDiscouraged ? (
          <div className="mt-4 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 p-4 rounded-2xl flex items-start gap-3 text-xs text-sky-900 dark:text-sky-200">
            <Info className="w-4 h-4 text-sky-600 dark:text-sky-400 flex-shrink-0 mt-0.5" />
            <div>
              <strong>No Tipping in {rule.countryName}:</strong> {rule.cultureSummary}
            </div>
          </div>
        ) : (
          <div className="mt-4 bg-gradient-to-r from-pink-50/50 via-purple-50/50 to-orange-50/50 dark:from-pink-950/20 dark:via-purple-950/20 dark:to-orange-950/20 border border-pink-200/80 dark:border-zinc-800 p-3.5 rounded-2xl text-xs text-zinc-700 dark:text-zinc-300 space-y-1">
            <div className="font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
              <span>{rule.flag} {rule.countryName} Customary Rates:</span>
              <span className="font-mono ig-gradient-text font-black">
                Min {rule.minPercent}% • Avg {rule.avgPercent}% • High {rule.highPercent}%
              </span>
            </div>
            <p className="text-zinc-600 dark:text-zinc-400 text-[11px] leading-relaxed">{rule.cultureSummary}</p>
          </div>
        )}

        {/* Input Form */}
        <div className="mt-5 space-y-3.5">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-black text-zinc-900 dark:text-zinc-100">
                Pre-Tax Food &amp; Beverage Subtotal ({rule.currencySymbol})
              </label>
              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                Tip Basis
              </span>
            </div>
            <div className="relative max-w-sm">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-zinc-400 dark:text-zinc-500 text-base">
                {rule.currencySymbol}
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={billAmount}
                onChange={(e) => setBillAmount(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-2xl border border-zinc-200 dark:border-zinc-700 text-lg font-mono font-black text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-[#E1306C] bg-zinc-50/60 dark:bg-zinc-950"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Surcharges (SF Mandate) and Tax toggles */}
          <div className="bg-zinc-50/70 dark:bg-zinc-950/60 p-3.5 rounded-2xl border border-zinc-200/70 dark:border-zinc-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="flex items-center gap-2 text-xs text-zinc-800 dark:text-zinc-200 font-bold cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasSurcharges}
                  onChange={(e) => setHasSurcharges(e.target.checked)}
                  className="rounded text-[#E1306C] focus:ring-pink-400 w-4 h-4 border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800"
                />
                <span>Include SF Health Mandate or fees (Excluded from tip)</span>
              </label>

              {hasSurcharges && (
                <div className="flex items-center gap-1.5 self-end sm:self-auto">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 font-bold">{rule.currencySymbol}</span>
                  <input
                    type="number"
                    step="0.01"
                    value={surchargeAmount}
                    onChange={(e) => setSurchargeAmount(e.target.value)}
                    className="w-20 px-2 py-1 text-xs border border-zinc-300 dark:border-zinc-700 rounded-lg font-mono font-bold bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
                    placeholder="0.00"
                  />
                  <span className="text-[10px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-1.5 py-0.5 rounded font-bold">
                    Not tipped on
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-200/60 dark:border-zinc-800">
              <label className="text-xs text-zinc-600 dark:text-zinc-400 font-medium">
                Sales Tax (Excluded from tip):
              </label>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-zinc-500 dark:text-zinc-400 font-bold">{rule.currencySymbol}</span>
                <input
                  type="number"
                  step="0.01"
                  value={taxAmount}
                  onChange={(e) => setTaxAmount(e.target.value)}
                  className="w-20 px-2 py-1 text-xs border border-zinc-300 dark:border-zinc-700 rounded-lg font-mono font-bold bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Round to Whole Currency Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2 mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-1 text-xs font-bold text-zinc-600 dark:text-zinc-400">
            <Coins className="w-3.5 h-3.5 text-[#E1306C]" />
            <span>Round to Whole ({rule.currencySymbol}):</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* 1-Tap Master Toggle Button */}
            <button
              type="button"
              onClick={() => {
                if (roundMode === 'none') {
                  setRoundMode('total');
                } else if (roundMode === 'total') {
                  setRoundMode('tip');
                } else {
                  setRoundMode('none');
                }
              }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95 ${
                roundMode !== 'none'
                  ? 'ig-gradient text-white shadow-pink-500/25 ring-2 ring-pink-400/40'
                  : 'bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 hover:border-pink-300 dark:hover:border-pink-500/50'
              }`}
              title="Toggle Round to Whole currency"
            >
              <Coins className="w-3.5 h-3.5" />
              <span>
                {roundMode === 'total'
                  ? `✓ Whole Total (${rule.currencySymbol})`
                  : roundMode === 'tip'
                  ? `✓ Whole Tip (${rule.currencySymbol})`
                  : `Round to Whole (${rule.currencySymbol})`}
              </span>
            </button>

            {/* Segmented Selector for Exact Cents vs Whole Total vs Whole Tip */}
            <div className="flex items-center p-0.5 bg-zinc-100 dark:bg-zinc-800 rounded-full border border-zinc-200 dark:border-zinc-700 text-xs">
              <button
                type="button"
                onClick={() => setRoundMode('none')}
                className={`px-3 py-1 rounded-full font-bold transition-all cursor-pointer ${
                  roundMode === 'none'
                    ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                }`}
              >
                Exact
              </button>
              <button
                type="button"
                onClick={() => setRoundMode('total')}
                className={`flex items-center gap-1 px-3 py-1 rounded-full font-bold transition-all cursor-pointer ${
                  roundMode === 'total'
                    ? 'bg-[#E1306C] text-white shadow-xs'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                }`}
                title={`Round grand total to whole ${rule.currencySymbol}`}
              >
                <span>Whole Total</span>
              </button>
              <button
                type="button"
                onClick={() => setRoundMode('tip')}
                className={`flex items-center gap-1 px-3 py-1 rounded-full font-bold transition-all cursor-pointer ${
                  roundMode === 'tip'
                    ? 'bg-[#E1306C] text-white shadow-xs'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                }`}
                title={`Round tip amount to whole ${rule.currencySymbol}`}
              >
                <span>Whole Tip</span>
              </button>
            </div>
          </div>
        </div>

        {/* 4 Tip Tier Options in a 2x2 or 4-col responsive grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5 mt-4 sm:mt-5">
          {/* 1. Poor Service Card */}
          {(() => {
            const pct = rule.poorPercent;
            const data = computeTierValues(pct);
            const isSelected = selectedTier === 'poor';

            return (
              <div
                onClick={() => setSelectedTier('poor')}
                className={`p-3.5 sm:p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'border-[#E1306C] bg-pink-50/25 dark:bg-pink-950/20 shadow-sm ring-2 ring-pink-500/20'
                    : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-50/40 dark:bg-zinc-950/40'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400 truncate">
                      ⚠️ Poor Service
                    </span>

                    <span className="text-[10px] sm:text-xs font-black px-1.5 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-mono">
                      {pct}%
                    </span>
                  </div>

                  <div className="mt-1 space-y-1.5">
                    {/* Tip row */}
                    <div className="flex items-baseline justify-between gap-1">
                      <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400">
                        Tip:
                      </span>
                      <div className="text-right flex items-baseline gap-1">
                        <span className={`font-mono font-black text-base sm:text-lg ${roundMode === 'tip' ? 'text-[#E1306C]' : 'text-zinc-900 dark:text-zinc-100'}`}>
                          {rule.currencySymbol}{data.tip.toFixed(2)}
                        </span>
                        {roundMode === 'tip' && (
                          <span className="text-[9px] font-bold text-[#E1306C] bg-pink-50 dark:bg-pink-950/50 border border-pink-200 dark:border-pink-900/50 px-1 py-0.2 rounded font-sans">
                            Whole Tip
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Total row */}
                    <div className="flex items-baseline justify-between gap-1 pt-1 border-t border-zinc-200/60 dark:border-zinc-800">
                      <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400">
                        Total:
                      </span>
                      <div className="text-right flex items-baseline gap-1">
                        <span className={`font-mono font-black text-base sm:text-lg ${roundMode === 'total' ? 'text-[#E1306C]' : 'text-zinc-800 dark:text-zinc-200'}`}>
                          {rule.currencySymbol}{data.total.toFixed(2)}
                        </span>
                        {roundMode === 'total' && (
                          <span className="text-[9px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 px-1 py-0.2 rounded font-sans">
                            Whole Total
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono text-right">
                      {data.percent}% on pre-tax
                    </div>
                  </div>
                </div>

                <div className="mt-2.5 pt-2 border-t border-zinc-200/60 dark:border-zinc-800 text-[10px] sm:text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                  {rule.poorDescription || 'Sub-par service baseline'}
                </div>
              </div>
            );
          })()}

          {/* 2. Min */}
          {(() => {
            const data = computeTierValues(rule.minPercent);
            const isSelected = selectedTier === 'min';

            return (
              <div
                onClick={() => setSelectedTier('min')}
                className={`p-3.5 sm:p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'border-[#E1306C] bg-pink-50/25 dark:bg-pink-950/20 shadow-sm ring-2 ring-pink-500/20'
                    : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-50/40 dark:bg-zinc-950/40'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400 truncate">
                      Minimum
                    </span>
                    <span className="text-[10px] sm:text-xs font-black px-1.5 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-mono">
                      {rule.minPercent}%
                    </span>
                  </div>

                  <div className="mt-1 space-y-1.5">
                    {/* Tip row */}
                    <div className="flex items-baseline justify-between gap-1">
                      <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400">
                        Tip:
                      </span>
                      <div className="text-right flex items-baseline gap-1">
                        <span className={`font-mono font-black text-base sm:text-lg ${roundMode === 'tip' ? 'text-[#E1306C]' : 'text-zinc-900 dark:text-zinc-100'}`}>
                          {rule.currencySymbol}{data.tip.toFixed(2)}
                        </span>
                        {roundMode === 'tip' && (
                          <span className="text-[9px] font-bold text-[#E1306C] bg-pink-50 dark:bg-pink-950/50 border border-pink-200 dark:border-pink-900/50 px-1 py-0.2 rounded font-sans">
                            Whole Tip
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Total row */}
                    <div className="flex items-baseline justify-between gap-1 pt-1 border-t border-zinc-200/60 dark:border-zinc-800">
                      <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400">
                        Total:
                      </span>
                      <div className="text-right flex items-baseline gap-1">
                        <span className={`font-mono font-black text-base sm:text-lg ${roundMode === 'total' ? 'text-[#E1306C]' : 'text-zinc-800 dark:text-zinc-200'}`}>
                          {rule.currencySymbol}{data.total.toFixed(2)}
                        </span>
                        {roundMode === 'total' && (
                          <span className="text-[9px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 px-1 py-0.2 rounded font-sans">
                            Whole Total
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono text-right">
                      {data.percent}% on pre-tax
                    </div>
                  </div>
                </div>

                <div className="mt-2.5 pt-2 border-t border-zinc-200/60 dark:border-zinc-800 text-[10px] sm:text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                  {rule.minPercent}% ({rule.minLabel})
                </div>
              </div>
            );
          })()}

          {/* 3. Avg (Featured with Instagram Story border) */}
          {(() => {
            const data = computeTierValues(rule.avgPercent);
            const isSelected = selectedTier === 'avg';

            return (
              <div
                onClick={() => setSelectedTier('avg')}
                className={`p-3.5 sm:p-4 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                  isSelected
                    ? 'border-transparent shadow-lg ring-2 ring-pink-500/30 bg-white dark:bg-zinc-900'
                    : 'border-pink-200 dark:border-pink-900/60 hover:border-pink-400 bg-white dark:bg-zinc-900'
                }`}
              >
                {isSelected && (
                  <div className="absolute inset-0 rounded-2xl ig-gradient -z-10 p-[2px]">
                    <div className="w-full h-full bg-white dark:bg-zinc-900 rounded-[14px]" />
                  </div>
                )}
                <span className="absolute -top-2.5 right-2 ig-gradient text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.2 rounded-full shadow-xs flex items-center gap-0.5 whitespace-nowrap">
                  <Flame className="w-2.5 h-2.5 text-yellow-200 fill-yellow-200" />
                  Standard
                </span>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black uppercase tracking-wider ig-gradient-text truncate">
                      Standard
                    </span>
                    <span className="text-[10px] sm:text-xs font-black px-1.5 py-0.5 rounded-full ig-gradient text-white shadow-xs font-mono">
                      {rule.avgPercent}%
                    </span>
                  </div>

                  <div className="mt-1 space-y-1.5">
                    {/* Tip row */}
                    <div className="flex items-baseline justify-between gap-1">
                      <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400">
                        Tip:
                      </span>
                      <div className="text-right flex items-baseline gap-1">
                        <span className={`font-mono font-black text-base sm:text-lg ${roundMode === 'tip' ? 'text-[#E1306C]' : 'ig-gradient-text'}`}>
                          {rule.currencySymbol}{data.tip.toFixed(2)}
                        </span>
                        {roundMode === 'tip' && (
                          <span className="text-[9px] font-bold text-[#E1306C] bg-pink-50 dark:bg-pink-950/50 border border-pink-200 dark:border-pink-900/50 px-1 py-0.2 rounded font-sans">
                            Whole Tip
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Total row */}
                    <div className="flex items-baseline justify-between gap-1 pt-1 border-t border-pink-100 dark:border-pink-950/60">
                      <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400">
                        Total:
                      </span>
                      <div className="text-right flex items-baseline gap-1">
                        <span className={`font-mono font-black text-base sm:text-lg ${roundMode === 'total' ? 'text-[#E1306C]' : 'text-zinc-900 dark:text-zinc-100'}`}>
                          {rule.currencySymbol}{data.total.toFixed(2)}
                        </span>
                        {roundMode === 'total' && (
                          <span className="text-[9px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 px-1 py-0.2 rounded font-sans">
                            Whole Total
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono text-right">
                      {data.percent}% on pre-tax
                    </div>
                  </div>
                </div>

                <div className="mt-2.5 pt-2 border-t border-pink-100 dark:border-pink-950/60 text-[10px] sm:text-[11px] text-zinc-600 dark:text-zinc-400 truncate">
                  {rule.avgPercent}% ({rule.avgLabel})
                </div>
              </div>
            );
          })()}

          {/* 4. High */}
          {(() => {
            const data = computeTierValues(rule.highPercent);
            const isSelected = selectedTier === 'high';

            return (
              <div
                onClick={() => setSelectedTier('high')}
                className={`p-3.5 sm:p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'border-[#E1306C] bg-pink-50/25 dark:bg-pink-950/20 shadow-sm ring-2 ring-pink-500/20'
                    : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-50/40 dark:bg-zinc-950/40'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400 truncate">
                      Generous
                    </span>
                    <span className="text-[10px] sm:text-xs font-black px-1.5 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-mono">
                      {rule.highPercent}%
                    </span>
                  </div>

                  <div className="mt-1 space-y-1.5">
                    {/* Tip row */}
                    <div className="flex items-baseline justify-between gap-1">
                      <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400">
                        Tip:
                      </span>
                      <div className="text-right flex items-baseline gap-1">
                        <span className={`font-mono font-black text-base sm:text-lg ${roundMode === 'tip' ? 'text-[#E1306C]' : 'text-zinc-900 dark:text-zinc-100'}`}>
                          {rule.currencySymbol}{data.tip.toFixed(2)}
                        </span>
                        {roundMode === 'tip' && (
                          <span className="text-[9px] font-bold text-[#E1306C] bg-pink-50 dark:bg-pink-950/50 border border-pink-200 dark:border-pink-900/50 px-1 py-0.2 rounded font-sans">
                            Whole Tip
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Total row */}
                    <div className="flex items-baseline justify-between gap-1 pt-1 border-t border-zinc-200/60 dark:border-zinc-800">
                      <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400">
                        Total:
                      </span>
                      <div className="text-right flex items-baseline gap-1">
                        <span className={`font-mono font-black text-base sm:text-lg ${roundMode === 'total' ? 'text-[#E1306C]' : 'text-zinc-800 dark:text-zinc-200'}`}>
                          {rule.currencySymbol}{data.total.toFixed(2)}
                        </span>
                        {roundMode === 'total' && (
                          <span className="text-[9px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 px-1 py-0.2 rounded font-sans">
                            Whole Total
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono text-right">
                      {data.percent}% on pre-tax
                    </div>
                  </div>
                </div>

                <div className="mt-2.5 pt-2 border-t border-zinc-200/60 dark:border-zinc-800 text-[10px] sm:text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                  {rule.highPercent}% ({rule.highLabel})
                </div>
              </div>
            );
          })()}
        </div>

        {/* Total Summary */}
        <div className="mt-5 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-white p-4 sm:p-6 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-zinc-800 shadow-xl">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Total Due With Tip</span>
              {roundMode === 'total' && (
                <span className="text-[10px] font-extrabold text-yellow-300 bg-zinc-800/90 border border-zinc-700 px-2 py-0.2 rounded-full">
                  🪙 Whole Total: {rule.currencySymbol}{active.total.toFixed(2)}
                </span>
              )}
              {roundMode === 'tip' && (
                <span className="text-[10px] font-extrabold text-emerald-300 bg-zinc-800/90 border border-zinc-700 px-2 py-0.2 rounded-full">
                  💵 Whole Tip: {rule.currencySymbol}{active.tip.toFixed(2)}
                </span>
              )}
            </div>
            <div className="text-3xl sm:text-4xl font-black font-mono ig-gradient-text mt-0.5">
              {rule.currencySymbol}{active.total.toFixed(2)}
            </div>
            <div className="text-xs text-zinc-300 mt-1">
              Bill: {rule.currencySymbol}{totalBillDue.toFixed(2)} + Tip: {rule.currencySymbol}{active.tip.toFixed(2)} ({active.percent}%)
            </div>
          </div>

          {/* Rounding Mode Options in Manual Calculator */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-zinc-800/90 rounded-2xl border border-zinc-700">
            <button
              type="button"
              onClick={() => setRoundMode('none')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                roundMode === 'none'
                  ? 'bg-white text-zinc-900 shadow-xs'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Exact
            </button>
            <button
              type="button"
              onClick={() => setRoundMode('total')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                roundMode === 'total'
                  ? 'ig-gradient text-white shadow-md shadow-pink-500/25 ring-2 ring-pink-400/40'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title={`Round grand total to whole ${rule.currencySymbol}`}
            >
              <Coins className="w-3.5 h-3.5" />
              <span>Whole Total ({rule.currencySymbol})</span>
            </button>
            <button
              type="button"
              onClick={() => setRoundMode('tip')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                roundMode === 'tip'
                  ? 'ig-gradient text-white shadow-md shadow-pink-500/25 ring-2 ring-pink-400/40'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title={`Round tip amount to whole ${rule.currencySymbol}`}
            >
              <Banknote className="w-3.5 h-3.5" />
              <span>Whole Tip ({rule.currencySymbol})</span>
            </button>
          </div>
        </div>

        {/* Bill Splitter */}
        <BillSplitter
          totalWithTip={active.total}
          tipAmount={active.tip}
          subtotal={rawBill}
          tax={rawTax}
          currencySymbol={rule.currencySymbol}
          currencyCode={rule.currencyCode}
          merchantName="Just the Tip Calc"
        />
      </div>
    </div>
  );
};
