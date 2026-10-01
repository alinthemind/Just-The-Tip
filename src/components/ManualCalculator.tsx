import React, { useState } from 'react';
import { UserLocation } from '../types';
import { getTippingRuleForCountry } from '../data/tippingCulture';
import { BillSplitter } from './BillSplitter';
import { Calculator, MapPin, Coins, Info, ShieldCheck, Flame } from 'lucide-react';

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
  const [roundUp, setRoundUp] = useState<boolean>(false);

  const rawBill = parseFloat(billAmount) || 0; // Pure pre-tax subtotal
  const rawSurcharges = hasSurcharges ? parseFloat(surchargeAmount) || 0 : 0;
  const rawTax = parseFloat(taxAmount) || 0;
  const totalBillDue = rawBill + rawSurcharges + rawTax;

  // STRICT PRE-TAX TIP BASIS: only rawBill, excluding surcharges and excluding taxes!
  const tipBasisAmount = rawBill;

  // Tip calculation
  const getActiveTip = () => {
    let pct = rule.avgPercent;
    if (selectedTier === 'poor') pct = rule.poorPercent;
    else if (selectedTier === 'min') pct = rule.minPercent;
    else if (selectedTier === 'avg') pct = rule.avgPercent;
    else if (selectedTier === 'high') pct = rule.highPercent;
    else pct = customPercent;

    if (rule.isTippingDiscouraged) {
      pct = 0;
    }

    let tip = Math.round(tipBasisAmount * (pct / 100) * 100) / 100;
    let finalTotal = Math.round((totalBillDue + tip) * 100) / 100;

    if (roundUp && finalTotal > 0) {
      const rounded = Math.ceil(finalTotal);
      tip = Math.round((rounded - totalBillDue) * 100) / 100;
      finalTotal = rounded;
      pct = tipBasisAmount > 0 ? Math.round((tip / tipBasisAmount) * 1000) / 10 : 0;
    }

    return { percent: pct, tip, total: finalTotal };
  };

  const active = getActiveTip();

  return (
    <div className="space-y-4 sm:space-y-6 max-w-3xl mx-auto pb-20 sm:pb-8">
      <div className="bg-white rounded-3xl border border-zinc-200/80 p-4 sm:p-8 shadow-[0_2px_12px_rgba(0,0,0,0.04)] relative overflow-hidden">
        {/* Instagram top bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 ig-gradient" />

        {/* Title & Location indicator */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-zinc-100">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-pink-50 to-amber-50 border border-pink-200/60 text-xs font-bold mb-2">
              <Calculator className="w-3.5 h-3.5 text-[#E1306C]" />
              <span className="ig-gradient-text">Pre-Tax Culture Tip Calculator</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-zinc-900">
              Just the Tip Calculator
            </h2>
            <p className="text-xs text-zinc-500 mt-1">
              Enter your food &amp; beverage subtotal to calculate tips excluding taxes and health mandates.
            </p>
          </div>

          <button
            onClick={onOpenLocationPicker}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-zinc-200 bg-white hover:border-pink-300 text-xs font-bold text-zinc-800 transition-all cursor-pointer shadow-xs active:scale-95"
          >
            <div className="ig-story-ring-sm">
              <span className="w-5 h-5 rounded-full bg-white flex items-center justify-center text-xs">
                {rule.flag}
              </span>
            </div>
            <span className="font-extrabold text-zinc-900">{rule.countryName}</span>
            <MapPin className="w-3.5 h-3.5 text-[#E1306C]" />
          </button>
        </div>

        {/* Culture note banner */}
        {rule.isTippingDiscouraged ? (
          <div className="mt-4 bg-sky-50 border border-sky-200 p-4 rounded-2xl flex items-start gap-3 text-xs text-sky-900">
            <Info className="w-4 h-4 text-sky-600 flex-shrink-0 mt-0.5" />
            <div>
              <strong>No Tipping in {rule.countryName}:</strong> {rule.cultureSummary}
            </div>
          </div>
        ) : (
          <div className="mt-4 bg-gradient-to-r from-pink-50/50 via-purple-50/50 to-orange-50/50 border border-pink-200/80 p-3.5 rounded-2xl text-xs text-zinc-700 space-y-1">
            <div className="font-black text-zinc-900 flex items-center gap-1.5">
              <span>{rule.flag} {rule.countryName} Customary Rates:</span>
              <span className="font-mono ig-gradient-text font-black">
                Min {rule.minPercent}% • Avg {rule.avgPercent}% • High {rule.highPercent}%
              </span>
            </div>
            <p className="text-zinc-600 text-[11px] leading-relaxed">{rule.cultureSummary}</p>
          </div>
        )}

        {/* Input Form */}
        <div className="mt-5 space-y-3.5">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-black text-zinc-900">
                Pre-Tax Food &amp; Beverage Subtotal ({rule.currencySymbol})
              </label>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Tip Basis
              </span>
            </div>
            <div className="relative max-w-sm">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-zinc-400 text-base">
                {rule.currencySymbol}
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={billAmount}
                onChange={(e) => setBillAmount(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-2xl border border-zinc-200 text-lg font-mono font-black text-zinc-900 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-[#E1306C] bg-zinc-50/60"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Surcharges (SF Mandate) and Tax toggles */}
          <div className="bg-zinc-50/70 p-3.5 rounded-2xl border border-zinc-200/70 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="flex items-center gap-2 text-xs text-zinc-800 font-bold cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasSurcharges}
                  onChange={(e) => setHasSurcharges(e.target.checked)}
                  className="rounded text-[#E1306C] focus:ring-pink-400 w-4 h-4 border-zinc-300"
                />
                <span>Include SF Health Mandate or fees (Excluded from tip)</span>
              </label>

              {hasSurcharges && (
                <div className="flex items-center gap-1.5 self-end sm:self-auto">
                  <span className="text-xs text-zinc-500 font-bold">{rule.currencySymbol}</span>
                  <input
                    type="number"
                    step="0.01"
                    value={surchargeAmount}
                    onChange={(e) => setSurchargeAmount(e.target.value)}
                    className="w-20 px-2 py-1 text-xs border border-zinc-300 rounded-lg font-mono font-bold bg-white"
                    placeholder="0.00"
                  />
                  <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-bold">
                    Not tipped on
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-200/60">
              <label className="text-xs text-zinc-600 font-medium">
                Sales Tax (Excluded from tip):
              </label>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-zinc-500 font-bold">{rule.currencySymbol}</span>
                <input
                  type="number"
                  step="0.01"
                  value={taxAmount}
                  onChange={(e) => setTaxAmount(e.target.value)}
                  className="w-20 px-2 py-1 text-xs border border-zinc-300 rounded-lg font-mono font-bold bg-white"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 4 Tip Tier Options in a 2x2 or 4-col responsive grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5 mt-4 sm:mt-5">
          {/* Poor */}
          <div
            onClick={() => setSelectedTier('poor')}
            className={`p-3.5 sm:p-4 rounded-2xl border-2 transition-all cursor-pointer ${
              selectedTier === 'poor'
                ? 'border-[#E1306C] bg-pink-50/25 shadow-sm ring-2 ring-pink-500/20'
                : 'border-zinc-200 hover:border-zinc-300 bg-zinc-50/40'
            }`}
          >
            <div className="text-[10px] font-black uppercase tracking-wider text-zinc-500 truncate">
              Poor Service
            </div>
            <div className="text-xl sm:text-2xl font-black text-zinc-900 font-mono mt-1">
              {rule.currencySymbol}{(rawBill * (rule.poorPercent / 100)).toFixed(2)}
            </div>
            <div className="text-[10px] sm:text-xs text-zinc-500 mt-0.5 truncate">
              {rule.poorPercent}% ({rule.poorLabel})
            </div>
          </div>

          {/* Min */}
          <div
            onClick={() => setSelectedTier('min')}
            className={`p-3.5 sm:p-4 rounded-2xl border-2 transition-all cursor-pointer ${
              selectedTier === 'min'
                ? 'border-[#E1306C] bg-pink-50/25 shadow-sm ring-2 ring-pink-500/20'
                : 'border-zinc-200 hover:border-zinc-300 bg-zinc-50/40'
            }`}
          >
            <div className="text-[10px] font-black uppercase tracking-wider text-zinc-500 truncate">
              Minimum
            </div>
            <div className="text-xl sm:text-2xl font-black text-zinc-900 font-mono mt-1">
              {rule.currencySymbol}{(rawBill * (rule.minPercent / 100)).toFixed(2)}
            </div>
            <div className="text-[10px] sm:text-xs text-zinc-500 mt-0.5 truncate">
              {rule.minPercent}% ({rule.minLabel})
            </div>
          </div>

          {/* Avg (Featured with Instagram Story border) */}
          <div
            onClick={() => setSelectedTier('avg')}
            className={`p-3.5 sm:p-4 rounded-2xl border-2 transition-all cursor-pointer relative ${
              selectedTier === 'avg'
                ? 'border-transparent shadow-lg ring-2 ring-pink-500/30 bg-white'
                : 'border-pink-200 hover:border-pink-400 bg-white'
            }`}
          >
            {selectedTier === 'avg' && (
              <div className="absolute inset-0 rounded-2xl ig-gradient -z-10 p-[2px]">
                <div className="w-full h-full bg-white rounded-[14px]" />
              </div>
            )}
            <span className="absolute -top-2.5 right-2 ig-gradient text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.2 rounded-full shadow-xs flex items-center gap-0.5 whitespace-nowrap">
              <Flame className="w-2.5 h-2.5 text-yellow-200 fill-yellow-200" />
              Standard
            </span>
            <div className="text-[10px] font-black uppercase tracking-wider ig-gradient-text truncate">
              Standard
            </div>
            <div className="text-xl sm:text-2xl font-black ig-gradient-text font-mono mt-1">
              {rule.currencySymbol}{(rawBill * (rule.avgPercent / 100)).toFixed(2)}
            </div>
            <div className="text-[10px] sm:text-xs text-zinc-700 mt-0.5 font-bold truncate">
              {rule.avgPercent}% ({rule.avgLabel})
            </div>
          </div>

          {/* High */}
          <div
            onClick={() => setSelectedTier('high')}
            className={`p-3.5 sm:p-4 rounded-2xl border-2 transition-all cursor-pointer ${
              selectedTier === 'high'
                ? 'border-[#E1306C] bg-pink-50/25 shadow-sm ring-2 ring-pink-500/20'
                : 'border-zinc-200 hover:border-zinc-300 bg-zinc-50/40'
            }`}
          >
            <div className="text-[10px] font-black uppercase tracking-wider text-zinc-500 truncate">
              Generous
            </div>
            <div className="text-xl sm:text-2xl font-black text-zinc-900 font-mono mt-1">
              {rule.currencySymbol}{(rawBill * (rule.highPercent / 100)).toFixed(2)}
            </div>
            <div className="text-[10px] sm:text-xs text-zinc-500 mt-0.5 truncate">
              {rule.highPercent}% ({rule.highLabel})
            </div>
          </div>
        </div>

        {/* Total Summary */}
        <div className="mt-5 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-white p-4 sm:p-6 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-zinc-800 shadow-xl">
          <div>
            <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Total Due With Tip</div>
            <div className="text-3xl sm:text-4xl font-black font-mono ig-gradient-text">
              {rule.currencySymbol}{active.total.toFixed(2)}
            </div>
            <div className="text-xs text-zinc-300 mt-1">
              Bill: {rule.currencySymbol}{totalBillDue.toFixed(2)} + Tip: {rule.currencySymbol}{active.tip.toFixed(2)} ({active.percent}%)
            </div>
          </div>

          <button
            onClick={() => setRoundUp(!roundUp)}
            className={`px-3.5 py-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 ${
              roundUp
                ? 'ig-gradient text-white border-transparent shadow-md shadow-pink-500/25'
                : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700'
            }`}
          >
            <Coins className="w-3.5 h-3.5" />
            <span>Round Up</span>
          </button>
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
