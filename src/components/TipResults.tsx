import React, { useState } from 'react';
import { ScannedReceiptData, TipTier } from '../types';
import { BillSplitter } from './BillSplitter';
import {
  AlertTriangle,
  Info,
  CheckCircle2,
  Receipt,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Edit2,
  Check,
  Coins,
  Banknote,
  CreditCard,
  UtensilsCrossed,
  ShieldCheck,
  MapPin,
  Flame,
  ArrowRight
} from 'lucide-react';
import { LanguageCode, getTranslation } from '../data/translations';

interface TipResultsProps {
  receipt: ScannedReceiptData;
  onScanAnother: () => void;
  onUpdateReceipt: (updated: ScannedReceiptData) => void;
  currentLang?: LanguageCode;
}

export const TipResults: React.FC<TipResultsProps> = ({
  receipt,
  onScanAnother,
  onUpdateReceipt,
  currentLang = 'en',
}) => {
  const t = (key: string) => getTranslation(currentLang, key);
  const { tippingCulture } = receipt;
  // Selected tip tier: 'poor' | 'minimum' | 'average' | 'high' | 'custom'
  const [selectedTier, setSelectedTier] = useState<'poor' | 'minimum' | 'average' | 'high' | 'custom'>('average');
  const [customPercent, setCustomPercent] = useState<number>(tippingCulture.average.percent);
  // Rounding mode: 'none' (exact cents) | 'total' (round total bill to whole $) | 'tip' (round tip amount to whole $)
  const [roundMode, setRoundMode] = useState<'none' | 'total' | 'tip'>('none');
  const [showItemDetails, setShowItemDetails] = useState(false);
  const [isEditingReceipt, setIsEditingReceipt] = useState(false);

  // Editable fields
  const [editMerchant, setEditMerchant] = useState(receipt.merchantName);
  const [editSubtotal, setEditSubtotal] = useState((receipt.preTaxSubtotal || receipt.subtotal).toString());
  const [editTax, setEditTax] = useState(receipt.tax.toString());
  const [editSurcharges, setEditSurcharges] = useState((receipt.totalSurcharges || 0).toString());
  const [editServiceCharge, setEditServiceCharge] = useState(receipt.serviceCharge.toString());
  const [editTotal, setEditTotal] = useState(receipt.total.toString());

  const subtotalVal = parseFloat(editSubtotal) || receipt.preTaxSubtotal || receipt.subtotal;
  const taxVal = parseFloat(editTax) || receipt.tax;
  const surchargesVal = parseFloat(editSurcharges) || receipt.totalSurcharges || 0;
  const serviceChargeVal = parseFloat(editServiceCharge) || receipt.serviceCharge;
  const totalVal = parseFloat(editTotal) || receipt.total;

  // CRITICAL: Tip is calculated STRICTLY on the pre-tax food & beverage subtotal (excluding tax, excluding SF Health Mandates and surcharges)
  const tipBasisAmount = subtotalVal;

  // Dynamic helper to compute exact tip, grand total, and rounded whole numbers for any tier
  const computeTierValues = (pct: number) => {
    const rawTip = Math.round(tipBasisAmount * (pct / 100) * 100) / 100;
    const rawGrandTotal = Math.round((totalVal + rawTip) * 100) / 100;

    if (roundMode === 'none' || rawGrandTotal <= 0) {
      return {
        percent: pct,
        tipAmount: rawTip,
        grandTotal: rawGrandTotal,
        isRounded: false,
        roundType: 'none' as const,
      };
    }

    if (roundMode === 'total') {
      // Round up the grand total bill to the nearest whole integer (e.g. $89.50 -> $90.00)
      const roundedTotal = Math.ceil(rawGrandTotal);
      const adjustedTip = Math.max(0, Math.round((roundedTotal - totalVal) * 100) / 100);
      const effectivePct = tipBasisAmount > 0 ? Math.round((adjustedTip / tipBasisAmount) * 1000) / 10 : 0;

      return {
        percent: effectivePct,
        tipAmount: adjustedTip,
        grandTotal: roundedTotal,
        isRounded: roundedTotal !== rawGrandTotal,
        roundType: 'total' as const,
      };
    }

    // roundMode === 'tip': Round tip amount itself to whole dollar (e.g. $12.24 -> $12.00 or $13.00)
    let roundedTip = Math.round(rawTip);
    if (pct > 0 && rawTip > 0 && roundedTip === 0) {
      roundedTip = 1;
    }
    if (pct === 0) {
      roundedTip = 0;
    }
    const finalTotal = Math.round((totalVal + roundedTip) * 100) / 100;
    const effectivePct = tipBasisAmount > 0 ? Math.round((roundedTip / tipBasisAmount) * 1000) / 10 : 0;

    return {
      percent: effectivePct,
      tipAmount: roundedTip,
      grandTotal: finalTotal,
      isRounded: roundedTip !== rawTip,
      roundType: 'tip' as const,
    };
  };

  // Active tip details for the currently selected tier
  const getActiveTipDetails = () => {
    let pct = 0;
    if (selectedTier === 'poor') {
      pct = tippingCulture.poor?.percent ?? 0;
    } else if (selectedTier === 'minimum') {
      pct = tippingCulture.minimum.percent;
    } else if (selectedTier === 'average') {
      pct = tippingCulture.average.percent;
    } else if (selectedTier === 'high') {
      pct = tippingCulture.high.percent;
    } else {
      pct = customPercent;
    }

    return computeTierValues(pct);
  };

  const activeTip = getActiveTipDetails();

  const handleSaveEdits = () => {
    const updated: ScannedReceiptData = {
      ...receipt,
      merchantName: editMerchant,
      preTaxSubtotal: subtotalVal,
      subtotal: subtotalVal,
      tax: taxVal,
      totalSurcharges: surchargesVal,
      serviceCharge: serviceChargeVal,
      total: totalVal,
      tipBasisAmount: subtotalVal,
    };
    onUpdateReceipt(updated);
    setIsEditingReceipt(false);
  };

  return (
    <div className="space-y-3 sm:space-y-4 pb-20 sm:pb-8">
      {/* Top Banner: Service Charge Already Included Alert */}
      {receipt.serviceChargeIncluded && receipt.serviceCharge > 0 && (
        <div className="bg-amber-50 border border-amber-200/90 rounded-2xl px-3.5 py-2.5 flex items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-700 flex-shrink-0" />
            <span className="text-xs font-bold text-amber-950">
              Service Charge Included ({receipt.currencySymbol}{receipt.serviceCharge.toFixed(2)})
            </span>
          </div>
          <span className="text-[10px] font-extrabold bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full uppercase">
            Extra Tip Discretionary
          </span>
        </div>
      )}

      {/* Surcharges / SF Mandate Excluded Alert */}
      {surchargesVal > 0 && (
        <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl px-3.5 py-2.5 flex items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-700 flex-shrink-0" />
            <span className="text-xs font-bold text-amber-950">
              Surcharges Excluded (-{receipt.currencySymbol}{surchargesVal.toFixed(2)})
            </span>
          </div>
          <span className="text-[10px] font-extrabold bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full uppercase">
            Not Tipped On
          </span>
        </div>
      )}
      {/* AI Access Fallback Notice */}
      {receipt.aiNotice && (
        <div className="bg-pink-50/60 border border-pink-200/80 rounded-2xl px-3.5 py-2.5 flex items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#E1306C] flex-shrink-0" />
            <span className="text-xs text-zinc-700">
              {receipt.aiNotice}
            </span>
          </div>
          <button
            onClick={() => setIsEditingReceipt(true)}
            className="px-2.5 py-1 rounded-xl bg-zinc-900 text-white text-[11px] font-bold flex-shrink-0 cursor-pointer"
          >
            Edit
          </button>
        </div>
      )}

      {/* Cultural Etiquette Notice (e.g. Japan 0% or Europe Service Compris) */}
      {tippingCulture.isTippingDiscouraged ? (
        <div className="bg-sky-50 border border-sky-200 rounded-2xl p-4 sm:p-5 flex items-start gap-3 shadow-sm">
          <div className="p-2 rounded-xl bg-sky-100 text-sky-800 flex-shrink-0">
            <Info className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sky-950 text-sm sm:text-base">
              Tipping is Not Customary in {receipt.detectedCountry?.name || 'this location'} (0%)
            </h3>
            <p className="text-xs sm:text-sm text-sky-800 mt-1">
              In this culture, great service is already standard and built into the bill. Pay the exact bill total only.
            </p>
          </div>
        </div>
      ) : tippingCulture.alreadyIncludedWarning ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3 shadow-sm">
          <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800 flex-shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <p className="text-xs sm:text-sm text-emerald-900 font-medium">
            {tippingCulture.alreadyIncludedWarning}
          </p>
        </div>
      ) : null}

      {/* Primary 3 Tip Calculation Cards: Minimum, Average, High */}
      <div className="bg-white rounded-3xl border border-zinc-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-4 sm:p-8 relative overflow-hidden">
        {/* Instagram top gradient bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 ig-gradient" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-zinc-100">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <div className="ig-story-ring-sm">
                <span className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-sm">
                  {receipt.detectedCountry?.flag || '🌐'}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-zinc-900 tracking-tight">
                {t('tipRecommendations')}
              </h2>
              {receipt.city && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-gradient-to-r from-pink-50 to-amber-50 text-zinc-900 border border-pink-200/80">
                  <MapPin className="w-3 h-3 text-[#E1306C]" />
                  {receipt.city}{receipt.state ? `, ${receipt.state}` : ''}
                  <span className="text-[9px] uppercase tracking-wider font-extrabold ig-gradient-text ml-0.5">
                    Receipt
                  </span>
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-600 mt-1">
              <span className="font-extrabold text-[#E1306C] bg-pink-50 px-2.5 py-0.5 rounded-md border border-pink-200/70 font-mono">
                {t('billSubtotal') || 'Pre-Tax Tip Basis'}: {receipt.currencySymbol}{tipBasisAmount.toFixed(2)}
              </span>
              <span className="text-zinc-400 hidden xs:inline">•</span>
              <span className="text-[11px] text-zinc-500">
                {t('excludesTax')} ({receipt.currencySymbol}{taxVal.toFixed(2)})
              </span>
            </div>
          </div>

          {/* Round to Whole ($) Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* 1-Tap Master Toggle Button explicitly labeled "Round to Whole ($)" */}
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
                  : 'bg-white text-zinc-800 border border-zinc-200 hover:border-pink-300'
              }`}
              title="Toggle Round to Whole currency"
            >
              <Coins className="w-3.5 h-3.5" />
              <span>
                {roundMode === 'total'
                  ? `✓ ${t('wholeTotal')} (${receipt.currencySymbol})`
                  : roundMode === 'tip'
                  ? `✓ ${t('wholeTip')} (${receipt.currencySymbol})`
                  : `${t('roundToWhole')} (${receipt.currencySymbol})`}
              </span>
            </button>

            {/* Segmented Selector for Exact Cents vs Whole Total vs Whole Tip */}
            <div className="flex items-center p-0.5 bg-zinc-100/90 rounded-full border border-zinc-200 text-xs">
              <button
                type="button"
                onClick={() => setRoundMode('none')}
                className={`px-3 py-1 rounded-full font-bold transition-all cursor-pointer ${
                  roundMode === 'none'
                    ? 'bg-white text-zinc-900 shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                {t('roundExact')}
              </button>
              <button
                type="button"
                onClick={() => setRoundMode('total')}
                className={`flex items-center gap-1 px-3 py-1 rounded-full font-bold transition-all cursor-pointer ${
                  roundMode === 'total'
                    ? 'bg-[#E1306C] text-white shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-900'
                }`}
                title={`Round grand total to whole ${receipt.currencySymbol}`}
              >
                <span>{t('wholeTotal')}</span>
              </button>
              <button
                type="button"
                onClick={() => setRoundMode('tip')}
                className={`flex items-center gap-1 px-3 py-1 rounded-full font-bold transition-all cursor-pointer ${
                  roundMode === 'tip'
                    ? 'bg-[#E1306C] text-white shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-900'
                }`}
                title={`Round tip amount to whole ${receipt.currencySymbol}`}
              >
                <span>{t('wholeTip')}</span>
              </button>
            </div>
          </div>
        </div>

        {/* The 4 Tip Cards in a 2x2 or 4-col responsive grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5 mt-4 sm:mt-5">
          {/* 1. Poor Service Card */}
          {(() => {
            const poorPct = tippingCulture.poor?.percent ?? 0;
            const data = computeTierValues(poorPct);
            const isSelected = selectedTier === 'poor';

            return (
              <div
                onClick={() => setSelectedTier('poor')}
                className={`cursor-pointer rounded-2xl p-3.5 sm:p-4 border-2 transition-all flex flex-col justify-between relative ${
                  isSelected
                    ? 'border-[#E1306C] bg-pink-50/25 shadow-md ring-2 ring-pink-500/20'
                    : 'border-zinc-200 hover:border-zinc-300 bg-zinc-50/40'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-zinc-500 truncate">
                      {t('tierPoor')}
                    </span>
                    <span className="text-[10px] sm:text-xs font-black px-1.5 py-0.5 rounded-full bg-zinc-200 text-zinc-800 font-mono">
                      {poorPct}%
                    </span>
                  </div>

                  <div className="mt-1 space-y-1.5">
                    {/* Tip row */}
                    <div className="flex items-baseline justify-between gap-1">
                      <span className="text-[11px] font-bold text-zinc-500">
                        {t('tip')}:
                      </span>
                      <div className="text-right flex items-baseline gap-1">
                        <span className={`font-mono font-black text-base sm:text-lg ${roundMode === 'tip' ? 'text-[#E1306C]' : 'text-zinc-900'}`}>
                          {receipt.currencySymbol}{data.tipAmount.toFixed(2)}
                        </span>
                        {roundMode === 'tip' && (
                          <span className="text-[9px] font-bold text-[#E1306C] bg-pink-50 border border-pink-200 px-1 py-0.2 rounded font-sans">
                            {t('wholeTip')}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Total row */}
                    <div className="flex items-baseline justify-between gap-1 pt-1 border-t border-zinc-200/60">
                      <span className="text-[11px] font-bold text-zinc-500">
                        Total:
                      </span>
                      <div className="text-right flex items-baseline gap-1">
                        <span className={`font-mono font-black text-base sm:text-lg ${roundMode === 'total' ? 'text-[#E1306C]' : 'text-zinc-800'}`}>
                          {receipt.currencySymbol}{data.grandTotal.toFixed(2)}
                        </span>
                        {roundMode === 'total' && (
                          <span className="text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1 py-0.2 rounded font-sans">
                            {t('wholeTotal')}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-[10px] text-zinc-400 font-mono text-right">
                      {data.percent}% on pre-tax
                    </div>
                  </div>
                </div>

                <div className="mt-2.5 pt-2 border-t border-zinc-200/60 text-[10px] sm:text-[11px] text-zinc-500 line-clamp-2">
                  {tippingCulture.poor?.description || 'Sub-par service baseline.'}
                </div>
              </div>
            );
          })()}

          {/* 2. Minimum Tip Card */}
          {(() => {
            const data = computeTierValues(tippingCulture.minimum.percent);
            const isSelected = selectedTier === 'minimum';

            return (
              <div
                onClick={() => setSelectedTier('minimum')}
                className={`cursor-pointer rounded-2xl p-3.5 sm:p-4 border-2 transition-all flex flex-col justify-between relative ${
                  isSelected
                    ? 'border-[#E1306C] bg-pink-50/25 shadow-md ring-2 ring-pink-500/20'
                    : 'border-zinc-200 hover:border-zinc-300 bg-zinc-50/40'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-zinc-500 truncate">
                      {t('tierMinimum')}
                    </span>
                    <span className="text-[10px] sm:text-xs font-black px-1.5 py-0.5 rounded-full bg-zinc-200 text-zinc-800 font-mono">
                      {tippingCulture.minimum.percent}%
                    </span>
                  </div>

                  <div className="mt-1 space-y-1.5">
                    {/* Tip row */}
                    <div className="flex items-baseline justify-between gap-1">
                      <span className="text-[11px] font-bold text-zinc-500">
                        {t('tip')}:
                      </span>
                      <div className="text-right flex items-baseline gap-1">
                        <span className={`font-mono font-black text-base sm:text-lg ${roundMode === 'tip' ? 'text-[#E1306C]' : 'text-zinc-900'}`}>
                          {receipt.currencySymbol}{data.tipAmount.toFixed(2)}
                        </span>
                        {roundMode === 'tip' && (
                          <span className="text-[9px] font-bold text-[#E1306C] bg-pink-50 border border-pink-200 px-1 py-0.2 rounded font-sans">
                            {t('wholeTip')}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Total row */}
                    <div className="flex items-baseline justify-between gap-1 pt-1 border-t border-zinc-200/60">
                      <span className="text-[11px] font-bold text-zinc-500">
                        Total:
                      </span>
                      <div className="text-right flex items-baseline gap-1">
                        <span className={`font-mono font-black text-base sm:text-lg ${roundMode === 'total' ? 'text-[#E1306C]' : 'text-zinc-800'}`}>
                          {receipt.currencySymbol}{data.grandTotal.toFixed(2)}
                        </span>
                        {roundMode === 'total' && (
                          <span className="text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1 py-0.2 rounded font-sans">
                            {t('wholeTotal')}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-[10px] text-zinc-400 font-mono text-right">
                      {data.percent}% on pre-tax
                    </div>
                  </div>
                </div>

                <div className="mt-2.5 pt-2 border-t border-zinc-200/60 text-[10px] sm:text-[11px] text-zinc-500 line-clamp-2">
                  {tippingCulture.minimum.label}
                </div>
              </div>
            );
          })()}

          {/* 3. Average Tip Card (Featured in Instagram Story Ring!) */}
          {(() => {
            const data = computeTierValues(tippingCulture.average.percent);
            const isSelected = selectedTier === 'average';

            return (
              <div
                onClick={() => setSelectedTier('average')}
                className={`cursor-pointer rounded-2xl p-3.5 sm:p-4 border-2 transition-all flex flex-col justify-between relative ${
                  isSelected
                    ? 'border-transparent shadow-xl ring-2 ring-pink-500/30 bg-gradient-to-b from-white to-pink-50/30'
                    : 'border-pink-200/70 hover:border-pink-400 bg-white'
                }`}
              >
                {/* Instagram story gradient border if selected */}
                {isSelected && (
                  <div className="absolute inset-0 rounded-2xl ig-gradient -z-10 p-[2px]">
                    <div className="w-full h-full bg-white rounded-[14px]" />
                  </div>
                )}

                {/* Featured Badge */}
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 ig-gradient text-white text-[9px] font-black uppercase tracking-wider px-2.5 py-0.2 rounded-full shadow-xs flex items-center gap-0.5 whitespace-nowrap">
                  <Flame className="w-2.5 h-2.5 text-yellow-200 fill-yellow-200" />
                  <span>{t('tierAverage')}</span>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider ig-gradient-text truncate">
                      {t('tierAverage')}
                    </span>
                    <span className="text-[10px] sm:text-xs font-black px-1.5 py-0.5 rounded-full ig-gradient text-white shadow-xs font-mono">
                      {tippingCulture.average.percent}%
                    </span>
                  </div>

                  <div className="mt-1 space-y-1.5">
                    {/* Tip row */}
                    <div className="flex items-baseline justify-between gap-1">
                      <span className="text-[11px] font-bold text-zinc-500">
                        {t('tip')}:
                      </span>
                      <div className="text-right flex items-baseline gap-1">
                        <span className={`font-mono font-black text-base sm:text-lg ${roundMode === 'tip' ? 'text-[#E1306C]' : 'ig-gradient-text'}`}>
                          {receipt.currencySymbol}{data.tipAmount.toFixed(2)}
                        </span>
                        {roundMode === 'tip' && (
                          <span className="text-[9px] font-bold text-[#E1306C] bg-pink-50 border border-pink-200 px-1 py-0.2 rounded font-sans">
                            {t('wholeTip')}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Total row */}
                    <div className="flex items-baseline justify-between gap-1 pt-1 border-t border-pink-100">
                      <span className="text-[11px] font-bold text-zinc-500">
                        Total:
                      </span>
                      <div className="text-right flex items-baseline gap-1">
                        <span className={`font-mono font-black text-base sm:text-lg ${roundMode === 'total' ? 'text-[#E1306C]' : 'text-zinc-900'}`}>
                          {receipt.currencySymbol}{data.grandTotal.toFixed(2)}
                        </span>
                        {roundMode === 'total' && (
                          <span className="text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1 py-0.2 rounded font-sans">
                            {t('wholeTotal')}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-[10px] text-zinc-400 font-mono text-right">
                      {data.percent}% on pre-tax
                    </div>
                  </div>
                </div>

                <div className="mt-2.5 pt-2 border-t border-pink-100 text-[10px] sm:text-[11px] text-zinc-600 line-clamp-2">
                  {tippingCulture.average.label}
                </div>
              </div>
            );
          })()}

          {/* 4. High Tip Card */}
          {(() => {
            const data = computeTierValues(tippingCulture.high.percent);
            const isSelected = selectedTier === 'high';

            return (
              <div
                onClick={() => setSelectedTier('high')}
                className={`cursor-pointer rounded-2xl p-3.5 sm:p-4 border-2 transition-all flex flex-col justify-between relative ${
                  isSelected
                    ? 'border-[#E1306C] bg-pink-50/25 shadow-md ring-2 ring-pink-500/20'
                    : 'border-zinc-200 hover:border-zinc-300 bg-zinc-50/40'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-zinc-500 truncate">
                      {t('tierHigh')}
                    </span>
                    <span className="text-[10px] sm:text-xs font-black px-1.5 py-0.5 rounded-full bg-zinc-200 text-zinc-800 font-mono">
                      {tippingCulture.high.percent}%
                    </span>
                  </div>

                  <div className="mt-1 space-y-1.5">
                    {/* Tip row */}
                    <div className="flex items-baseline justify-between gap-1">
                      <span className="text-[11px] font-bold text-zinc-500">
                        {t('tip')}:
                      </span>
                      <div className="text-right flex items-baseline gap-1">
                        <span className={`font-mono font-black text-base sm:text-lg ${roundMode === 'tip' ? 'text-[#E1306C]' : 'text-zinc-900'}`}>
                          {receipt.currencySymbol}{data.tipAmount.toFixed(2)}
                        </span>
                        {roundMode === 'tip' && (
                          <span className="text-[9px] font-bold text-[#E1306C] bg-pink-50 border border-pink-200 px-1 py-0.2 rounded font-sans">
                            {t('wholeTip')}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Total row */}
                    <div className="flex items-baseline justify-between gap-1 pt-1 border-t border-zinc-200/60">
                      <span className="text-[11px] font-bold text-zinc-500">
                        Total:
                      </span>
                      <div className="text-right flex items-baseline gap-1">
                        <span className={`font-mono font-black text-base sm:text-lg ${roundMode === 'total' ? 'text-[#E1306C]' : 'text-zinc-800'}`}>
                          {receipt.currencySymbol}{data.grandTotal.toFixed(2)}
                        </span>
                        {roundMode === 'total' && (
                          <span className="text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1 py-0.2 rounded font-sans">
                            {t('wholeTotal')}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-[10px] text-zinc-400 font-mono text-right">
                      {data.percent}% on pre-tax
                    </div>
                  </div>
                </div>

                <div className="mt-2.5 pt-2 border-t border-zinc-200/60 text-[10px] sm:text-[11px] text-zinc-500 line-clamp-2">
                  {tippingCulture.high.label}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Custom Tip Slider Section */}
        <div className="mt-5 pt-4 border-t border-zinc-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-extrabold text-zinc-700">{t('customTip')}:</span>
            <span className="text-xs font-mono font-black ig-gradient text-white px-2.5 py-0.5 rounded-full shadow-xs">
              {activeTip.percent}% ({receipt.currencySymbol}{activeTip.tipAmount.toFixed(2)})
            </span>
          </div>

          <input
            type="range"
            min="0"
            max="35"
            step="1"
            value={customPercent}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              setCustomPercent(val);
              setSelectedTier('custom');
            }}
            className="w-full h-2.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-[#E1306C]"
          />

          <div className="flex justify-between text-[10px] text-zinc-400 mt-1 font-mono">
            <span>0%</span>
            <span>15%</span>
            <span>18%</span>
            <span>20%</span>
            <span>25%</span>
            <span>35%</span>
          </div>
        </div>

        {/* Selected Tip Summary Box (Instagram Style) */}
        <div className="mt-5 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-white rounded-2xl p-4 sm:p-6 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-zinc-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-zinc-400 font-bold uppercase tracking-wider">
                {t('totalWithSelectedTip')}
              </span>
              {roundMode === 'total' && (
                <span className="text-[10px] font-extrabold text-yellow-300 bg-zinc-800/90 border border-zinc-700 px-2 py-0.2 rounded-full">
                  🪙 {t('wholeTotal')}: {receipt.currencySymbol}{activeTip.grandTotal.toFixed(2)}
                </span>
              )}
              {roundMode === 'tip' && (
                <span className="text-[10px] font-extrabold text-emerald-300 bg-zinc-800/90 border border-zinc-700 px-2 py-0.2 rounded-full">
                  💵 {t('wholeTip')}: {receipt.currencySymbol}{activeTip.tipAmount.toFixed(2)}
                </span>
              )}
            </div>
            <div className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-white mt-0.5">
              {receipt.currencySymbol}{activeTip.grandTotal.toFixed(2)}
            </div>
            <div className="text-xs text-zinc-300 mt-1 flex flex-wrap items-center gap-2">
              <span>{t('bill')}: {receipt.currencySymbol}{totalVal.toFixed(2)}</span>
              <span>+</span>
              <span className="ig-gradient-text font-black">
                {t('tip')} ({activeTip.percent}%): {receipt.currencySymbol}{activeTip.tipAmount.toFixed(2)}
              </span>
              {surchargesVal > 0 && (
                <span className="text-amber-400 text-[11px] font-medium">
                  (SF Mandate {receipt.currencySymbol}{surchargesVal.toFixed(2)} excluded from tip)
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={onScanAnother}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl ig-gradient hover:opacity-95 text-white text-xs font-bold transition-all shadow-md shadow-pink-500/25 active:scale-95 cursor-pointer"
            >
              <Receipt className="w-4 h-4" />
              {t('scanAnother')}
            </button>
          </div>
        </div>

        {/* Bill Splitter Section */}
        <BillSplitter
          totalWithTip={activeTip.grandTotal}
          tipAmount={activeTip.tipAmount}
          subtotal={subtotalVal}
          tax={taxVal}
          currencySymbol={receipt.currencySymbol}
          currencyCode={receipt.currencyCode}
          merchantName={receipt.merchantName}
        />
      </div>

      {/* Local Etiquette & Dining Customs Box */}
      <div className="bg-white rounded-3xl border border-zinc-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] p-5 sm:p-6">
        <div className="flex items-center gap-2.5 mb-3.5">
          <div className="ig-story-ring-sm">
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[#E1306C]">
              <UtensilsCrossed className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h3 className="font-extrabold text-sm sm:text-base text-zinc-900 leading-tight">
              Tipping Customs in {receipt.city || receipt.detectedCountry?.name || 'this location'} {receipt.detectedCountry?.flag}
            </h3>
            <p className="text-[11px] text-zinc-500">Local standards &amp; payment etiquette</p>
          </div>
        </div>

        <div className="space-y-2 text-xs sm:text-sm text-zinc-700">
          {tippingCulture.localEtiquetteNotes && tippingCulture.localEtiquetteNotes.length > 0 ? (
            tippingCulture.localEtiquetteNotes.map((note, idx) => (
              <div key={idx} className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#E1306C] mt-2 flex-shrink-0" />
                <span className="leading-relaxed">{note}</span>
              </div>
            ))
          ) : (
            <p className="text-xs text-zinc-500">Standard dining etiquette applies.</p>
          )}

          {tippingCulture.paymentAdvice && (
            <div className="mt-3 p-3 rounded-xl bg-zinc-50 border border-zinc-200/80 text-xs text-zinc-700 flex items-start gap-2">
              <CreditCard className="w-4 h-4 text-zinc-500 flex-shrink-0 mt-0.5" />
              <span><strong>Payment Tip:</strong> {tippingCulture.paymentAdvice}</span>
            </div>
          )}
        </div>
      </div>

      {/* Receipt Breakdown & Verification Accordion */}
      <div className="bg-white rounded-3xl border border-zinc-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] overflow-hidden">
        <div
          onClick={() => setShowItemDetails(!showItemDetails)}
          className="p-4 sm:p-6 flex items-center justify-between cursor-pointer hover:bg-zinc-50/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Receipt className="w-5 h-5 text-zinc-600" />
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-zinc-900">
                Receipt Verification &amp; Items ({receipt.merchantName})
              </h3>
              <p className="text-xs text-zinc-500">
                {receipt.items?.length || 0} line items • Total: {receipt.currencySymbol}{totalVal.toFixed(2)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsEditingReceipt(!isEditingReceipt);
              }}
              className="px-2.5 py-1 rounded-xl border border-zinc-200 hover:bg-zinc-100 text-xs font-bold text-zinc-700 flex items-center gap-1.5 cursor-pointer"
            >
              <Edit2 className="w-3 h-3 text-zinc-500" />
              <span>{isEditingReceipt ? 'Cancel' : 'Edit Numbers'}</span>
            </button>
            {showItemDetails ? (
              <ChevronUp className="w-5 h-5 text-zinc-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-zinc-400" />
            )}
          </div>
        </div>

        {/* Collapsible Details */}
        {(showItemDetails || isEditingReceipt) && (
          <div className="p-4 sm:p-6 pt-0 border-t border-zinc-100 space-y-4">
            {isEditingReceipt ? (
              /* Edit Form */
              <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-200 space-y-3">
                <span className="text-xs font-bold text-zinc-700 block">Edit Detected Receipt Data</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-500 block">Merchant Name</label>
                    <input
                      type="text"
                      value={editMerchant}
                      onChange={(e) => setEditMerchant(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border border-zinc-300 bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-500 block">Pre-Tax Food/Bev Subtotal ({receipt.currencySymbol})</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editSubtotal}
                      onChange={(e) => setEditSubtotal(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border border-zinc-300 bg-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-amber-700 block">SF Mandate / Surcharges ({receipt.currencySymbol})</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editSurcharges}
                      onChange={(e) => setEditSurcharges(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border border-amber-300 bg-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-500 block">Tax / VAT ({receipt.currencySymbol})</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editTax}
                      onChange={(e) => setEditTax(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border border-zinc-300 bg-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-500 block">Service Charge / Auto-Gratuity ({receipt.currencySymbol})</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editServiceCharge}
                      onChange={(e) => setEditServiceCharge(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border border-zinc-300 bg-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-500 block">Bill Total Due ({receipt.currencySymbol})</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editTotal}
                      onChange={(e) => setEditTotal(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border border-zinc-300 bg-white font-mono"
                    />
                  </div>
                </div>
                <button
                  onClick={handleSaveEdits}
                  className="px-4 py-2 ig-gradient text-white rounded-xl text-xs font-bold hover:opacity-95 flex items-center gap-1.5 cursor-pointer shadow-sm shadow-pink-500/25"
                >
                  <Check className="w-3.5 h-3.5" />
                  Save &amp; Recalculate
                </button>
              </div>
            ) : null}

            {/* Itemized Line Items */}
            {receipt.items && receipt.items.length > 0 && (
              <div className="border border-zinc-100 rounded-2xl overflow-hidden">
                <div className="bg-zinc-50 px-4 py-2 text-[11px] font-bold text-zinc-500 uppercase tracking-wider flex justify-between">
                  <span>Item</span>
                  <span>Price</span>
                </div>
                <div className="divide-y divide-zinc-100 max-h-56 overflow-y-auto">
                  {receipt.items.map((item, idx) => (
                    <div key={idx} className="px-4 py-2.5 text-xs flex justify-between items-center">
                      <span className="text-zinc-800">
                        {item.qty > 1 && <span className="font-semibold text-zinc-500 mr-1.5">{item.qty}x</span>}
                        {item.name}
                      </span>
                      <span className="font-mono text-zinc-700">
                        {receipt.currencySymbol}{item.price.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Financial Summary */}
            <div className="bg-zinc-50/70 p-4 rounded-2xl border border-zinc-200/60 space-y-2 text-xs">
              <div className="flex justify-between text-[#E1306C] font-black">
                <span>Food &amp; Beverage Subtotal (Tip Basis):</span>
                <span className="font-mono">{receipt.currencySymbol}{subtotalVal.toFixed(2)}</span>
              </div>
              {surchargesVal > 0 && (
                <div className="flex justify-between text-amber-800 font-medium">
                  <span>SF Mandate / Surcharges (Excluded from Tip):</span>
                  <span className="font-mono">{receipt.currencySymbol}{surchargesVal.toFixed(2)}</span>
                </div>
              )}
              {taxVal > 0 && (
                <div className="flex justify-between text-zinc-600">
                  <span>Tax / VAT (Excluded from Tip):</span>
                  <span className="font-mono">{receipt.currencySymbol}{taxVal.toFixed(2)}</span>
                </div>
              )}
              {serviceChargeVal > 0 && (
                <div className="flex justify-between text-amber-700 font-semibold">
                  <span>Included Service Charge:</span>
                  <span className="font-mono">{receipt.currencySymbol}{serviceChargeVal.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-zinc-900 font-black pt-2 border-t border-zinc-200">
                <span>Total Amount Due:</span>
                <span className="font-mono">{receipt.currencySymbol}{totalVal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
