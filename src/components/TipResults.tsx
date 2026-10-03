import React, { useState } from 'react';
import { ScannedReceiptData } from '../types';
import {
  MapPin,
  Receipt,
  Camera,
  Navigation,
  CheckCircle2,
  ShieldCheck,
  Ban,
  CloudOff,
  ChevronDown,
  Pencil,
  Check,
  ScanLine,
  Utensils,
  Percent,
  ConciergeBell,
  ShieldAlert,
  Lightbulb,
  Store,
  Wine,
  Coffee,
  Car,
  Sparkles,
  BedDouble,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { LanguageCode, getTranslation } from '../data/translations';
import { Card, Chip, IconTile, SectionCaption, Segmented } from './ui';
import { getServiceTiers, getTippingRuleForCountry, serviceAdvice, ServiceType } from '../data/tippingCulture';
import { TipPanel, TierKey } from './TipPanel';
import { formatMoney, RoundMode } from '../utils/tipMath';
import { localizedCountryName } from '../utils/countryName';
import { useEtiquette } from '../data/etiquette';

interface TipResultsProps {
  receipt: ScannedReceiptData;
  onScanAnother: () => void;
  onUpdateReceipt: (updated: ScannedReceiptData) => void;
  currentLang?: LanguageCode;
}

export const SERVICE_OPTIONS: Array<{ value: ServiceType; icon: LucideIcon; labelKey: string }> = [
  { value: 'restaurant', icon: Utensils, labelKey: 'restaurants' },
  { value: 'bar', icon: Wine, labelKey: 'bars' },
  { value: 'cafe', icon: Coffee, labelKey: 'cafes' },
  { value: 'taxi', icon: Car, labelKey: 'taxis' },
  { value: 'beauty', icon: Sparkles, labelKey: 'beauty' },
  { value: 'hotel', icon: BedDouble, labelKey: 'hotels' },
];

const SOURCE_ICON: Record<NonNullable<ScannedReceiptData['locationSource']>, LucideIcon> = {
  receipt: Receipt,
  'photo-gps': Camera,
  gps: Navigation,
  manual: MapPin,
};

export const TipResults: React.FC<TipResultsProps> = ({
  receipt,
  onScanAnother,
  onUpdateReceipt,
  currentLang = 'en',
}) => {
  const t = (key: string) => getTranslation(currentLang, key);
  // Etiquette notes built from the country data translate; free-form AI notes stay as written
  const tr = useEtiquette(currentLang);
  const { tippingCulture } = receipt;
  const detectedService: ServiceType = receipt.serviceType || 'restaurant';
  const [serviceType, setServiceType] = useState<ServiceType>(detectedService);
  const [selectedTier, setSelectedTier] = useState<TierKey>('average');
  const [customPercent, setCustomPercent] = useState<number>(tippingCulture.average.percent);
  const [roundMode, setRoundMode] = useState<RoundMode>('none');
  const [showCustoms, setShowCustoms] = useState(false);
  // Unreadable receipts open straight into the edit form so the user can type the amounts
  const [showItemDetails, setShowItemDetails] = useState(Boolean(receipt.needsReview));
  const [isEditingReceipt, setIsEditingReceipt] = useState(Boolean(receipt.needsReview));

  // Editable fields
  const [editMerchant, setEditMerchant] = useState(receipt.merchantName);
  const [editSubtotal, setEditSubtotal] = useState((receipt.preTaxSubtotal || receipt.subtotal).toString());
  const [editTax, setEditTax] = useState(receipt.tax.toString());
  const [editSurcharges, setEditSurcharges] = useState((receipt.totalSurcharges || 0).toString());
  const [editServiceCharge, setEditServiceCharge] = useState(receipt.serviceCharge.toString());
  const [editTotal, setEditTotal] = useState(receipt.total.toString());

  // Fall back to the scanned value only when the field is blank/invalid, so 0 is a valid edit
  const parseEdit = (value: string, fallback: number) => {
    const n = parseFloat(value);
    return Number.isFinite(n) && n >= 0 ? n : fallback;
  };
  const subtotalVal = parseEdit(editSubtotal, receipt.preTaxSubtotal || receipt.subtotal);
  const taxVal = parseEdit(editTax, receipt.tax);
  const surchargesVal = parseEdit(editSurcharges, receipt.totalSurcharges || 0);
  const serviceChargeVal = parseEdit(editServiceCharge, receipt.serviceCharge);
  const totalVal = parseEdit(editTotal, receipt.total);

  // CRITICAL: Tip is calculated STRICTLY on the pre-tax food & beverage subtotal (excluding tax, excluding SF Health Mandates and surcharges)
  const tipBasisAmount = subtotalVal;
  const sym = receipt.currencySymbol;

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

  // The scan's own tiers apply to the detected service; switching service uses that service's local range
  const percents =
    serviceType === detectedService
      ? {
          poor: tippingCulture.poor?.percent ?? 0,
          minimum: tippingCulture.minimum.percent,
          average: tippingCulture.average.percent,
          high: tippingCulture.high.percent,
        }
      : (() => {
          const tiers = getServiceTiers(receipt.detectedCountry?.code, serviceType);
          return { poor: tiers.poor, minimum: tiers.min, average: tiers.avg, high: tiers.high };
        })();

  const handleServiceChange = (next: ServiceType) => {
    setServiceType(next);
    setSelectedTier('average');
    setCustomPercent(
      next === detectedService ? tippingCulture.average.percent : getServiceTiers(receipt.detectedCountry?.code, next).avg
    );
  };

  const SourceIcon = SOURCE_ICON[receipt.locationSource || 'receipt'];
  const place = receipt.city
    ? `${receipt.city}${receipt.state && !receipt.city.includes(',') ? `, ${receipt.state}` : ''}`
    : receipt.detectedCountry
    ? localizedCountryName(receipt.detectedCountry.code, currentLang, receipt.detectedCountry.name)
    : '';

  const editFields: Array<{ label: string; icon: LucideIcon; value: string; set: (v: string) => void; numeric?: boolean }> = [
    { label: '', icon: Store, value: editMerchant, set: setEditMerchant },
    { label: t('preTaxBasis'), icon: Utensils, value: editSubtotal, set: setEditSubtotal, numeric: true },
    { label: t('tax'), icon: Percent, value: editTax, set: setEditTax, numeric: true },
    { label: t('fees'), icon: ShieldAlert, value: editSurcharges, set: setEditSurcharges, numeric: true },
    { label: t('serviceChargeIncluded'), icon: ConciergeBell, value: editServiceCharge, set: setEditServiceCharge, numeric: true },
    { label: t('totalDue'), icon: Receipt, value: editTotal, set: setEditTotal, numeric: true },
  ];

  const summaryRows: Array<{ label: string; icon: LucideIcon; amount: number; show: boolean; strong?: boolean }> = [
    { label: t('preTaxBasis'), icon: Utensils, amount: subtotalVal, show: true },
    { label: t('fees'), icon: ShieldAlert, amount: surchargesVal, show: surchargesVal > 0 },
    { label: t('tax'), icon: Percent, amount: taxVal, show: taxVal > 0 },
    { label: t('serviceChargeIncluded'), icon: ConciergeBell, amount: serviceChargeVal, show: serviceChargeVal > 0 },
    { label: t('totalDue'), icon: Receipt, amount: totalVal, show: true, strong: true },
  ];

  return (
    <div className="space-y-5 max-w-xl mx-auto">
      {/* Place header */}
      <div className="flex items-center gap-3.5 px-1">
        <span className="w-14 h-14 rounded-full bg-white dark:bg-elevated flex items-center justify-center text-[32px] leading-none flex-shrink-0">
          {receipt.detectedCountry?.flag || '🌐'}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[28px] font-bold tracking-tight text-zinc-900 dark:text-white truncate leading-tight">
            {receipt.merchantName}
          </h2>
          <div className="flex items-center gap-1.5 text-[15px] text-zinc-500 dark:text-zinc-400 min-w-0">
            <SourceIcon className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{place}</span>
          </div>
        </div>
      </div>

      {receipt.needsReview && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-[16px] bg-ig-orange/12 text-[15px] text-[#c4501a] dark:text-ig-orange">
          <Pencil className="w-5 h-5 flex-shrink-0" />
          <p className="flex-1">{t('enterAmounts')}</p>
        </div>
      )}

      {/* Status chips: what is and isn't tipped on */}
      <div className="flex flex-wrap gap-2 px-1">
        <Chip icon={ShieldCheck} tone="pink" title={t('excludesTax')}>
          {t('preTaxBasis')} {formatMoney(sym, tipBasisAmount)}
        </Chip>
        {tippingCulture.isTippingDiscouraged && (
          <Chip icon={Ban} tone="purple">
            {t('tippingNotCustomary')}
          </Chip>
        )}
        {receipt.serviceChargeIncluded && (
          <Chip icon={CheckCircle2} tone="green" title={tippingCulture.alreadyIncludedWarning}>
            {t('serviceChargeIncluded')}
            {receipt.serviceCharge > 0 ? ` ${formatMoney(sym, receipt.serviceCharge)}` : ''}
          </Chip>
        )}
        {surchargesVal > 0 && (
          <Chip icon={ShieldAlert} tone="amber" title={t('notTippedOn')}>
            {t('surchargesExcluded')} {formatMoney(sym, surchargesVal)}
          </Chip>
        )}
        {receipt.aiNotice && (
          <button
            type="button"
            onClick={() => {
              setShowItemDetails(true);
              setIsEditingReceipt(true);
            }}
            className="cursor-pointer"
            title={receipt.aiNotice}
          >
            <Chip icon={CloudOff} tone="gray">
              {t('editNumbers')}
            </Chip>
          </button>
        )}
      </div>

      {/* Type of service: detected from the receipt, tap to change */}
      <div>
        <SectionCaption>{t(SERVICE_OPTIONS.find((o) => o.value === serviceType)!.labelKey)}</SectionCaption>
        <Segmented<ServiceType>
          value={serviceType}
          onChange={handleServiceChange}
          options={SERVICE_OPTIONS.map((o) => ({ value: o.value, icon: o.icon, title: t(o.labelKey) }))}
        />
        {/* How tipping works for this service here (e.g. hotels: flat amounts per bag/night, not a %) */}
        <p className="mt-2 px-4 text-[13px] leading-snug text-zinc-500 dark:text-zinc-400">
          {tr(serviceAdvice(getTippingRuleForCountry(receipt.detectedCountry?.code), serviceType))}
        </p>
      </div>

      <TipPanel
        percents={percents}
        selected={selectedTier}
        onSelect={setSelectedTier}
        customPercent={customPercent}
        onCustomPercent={setCustomPercent}
        roundMode={roundMode}
        onRoundMode={setRoundMode}
        basis={tipBasisAmount}
        billTotal={totalVal}
        currencySymbol={sym}
        currencyCode={receipt.currencyCode}
        merchantName={receipt.merchantName}
        t={t}
        totalAction={
          <button
            type="button"
            onClick={onScanAnother}
            title={t('scanAnother')}
            aria-label={t('scanAnother')}
            className="w-11 h-11 rounded-full ig-gradient text-white flex items-center justify-center flex-shrink-0 active:scale-90 transition-transform cursor-pointer shadow-[0_6px_16px_-6px_rgba(225,48,108,0.7)]"
          >
            <ScanLine className="w-5 h-5" />
          </button>
        }
      />

      {/* Local customs (collapsed) */}
      <Card className="overflow-hidden">
        <button
          type="button"
          onClick={() => setShowCustoms((v) => !v)}
          aria-expanded={showCustoms}
          className="w-full flex items-center gap-3 px-4 py-3 cursor-pointer text-left"
        >
          <IconTile icon={Lightbulb} color="gradient" />
          <span className="flex-1 text-[17px] text-zinc-900 dark:text-white">
            {t('localCustoms')} <span className="ml-0.5">{receipt.detectedCountry?.flag}</span>
          </span>
          <ChevronDown className={`w-5 h-5 text-zinc-400 transition-transform ${showCustoms ? 'rotate-180' : ''}`} />
        </button>
        {showCustoms && (
          <div className="px-4 pb-4 space-y-2.5">
            {(tippingCulture.localEtiquetteNotes || []).filter(Boolean).map((note, idx) => (
              <div key={idx} className="flex items-start gap-2.5 text-[15px] leading-snug text-zinc-700 dark:text-zinc-300">
                <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
                <span>{tr(note)}</span>
              </div>
            ))}
            {tippingCulture.paymentAdvice && (
              <div className="flex items-start gap-2.5 text-[15px] leading-snug text-zinc-700 dark:text-zinc-300">
                <Car className="w-4 h-4 text-zinc-400 mt-0.5 flex-shrink-0" />
                <span>
                  <span className="font-semibold">{t('taxis')}:</span> {tr(tippingCulture.paymentAdvice.replace(/^Taxis:\s*/, ''))}
                </span>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Receipt breakdown (collapsed) */}
      <div>
        <SectionCaption
          action={
            <button
              type="button"
              onClick={() => {
                setShowItemDetails(true);
                setIsEditingReceipt((v) => !v);
              }}
              className="inline-flex items-center gap-1 text-[13px] font-medium text-accent cursor-pointer"
            >
              {isEditingReceipt ? null : <Pencil className="w-3.5 h-3.5" />}
              {isEditingReceipt ? t('cancel') : t('editNumbers')}
            </button>
          }
        >
          {t('receiptBreakdown')}
        </SectionCaption>
        <Card className="overflow-hidden">
          <button
            type="button"
            onClick={() => setShowItemDetails((v) => !v)}
            aria-expanded={showItemDetails}
            className="w-full flex items-center gap-3 px-4 py-3 cursor-pointer text-left"
          >
            <IconTile icon={Receipt} color="gray" />
            <span className="flex-1 min-w-0">
              <span className="block text-[17px] text-zinc-900 dark:text-white truncate">{receipt.merchantName}</span>
            </span>
            <span className="text-[17px] tabular-nums text-zinc-500 dark:text-zinc-400">{formatMoney(sym, totalVal)}</span>
            <ChevronDown className={`w-5 h-5 text-zinc-400 transition-transform ${showItemDetails ? 'rotate-180' : ''}`} />
          </button>

          {(showItemDetails || isEditingReceipt) && (
            <div className="border-t border-black/[0.06] dark:border-white/[0.08]">
              {isEditingReceipt ? (
                <div className="p-4 space-y-2">
                  {editFields.map((f) => {
                    const Icon = f.icon;
                    return (
                      <label
                        key={f.label || 'merchant'}
                        className="flex items-center gap-3 rounded-[12px] bg-[#767680]/[0.08] dark:bg-[#767680]/20 px-3 py-2"
                      >
                        <Icon className="w-[18px] h-[18px] text-zinc-400 flex-shrink-0" />
                        {f.label && <span className="text-[13px] text-zinc-500 dark:text-zinc-400 w-28 truncate">{f.label}</span>}
                        <input
                          type={f.numeric ? 'number' : 'text'}
                          inputMode={f.numeric ? 'decimal' : undefined}
                          step={f.numeric ? '0.01' : undefined}
                          value={f.value}
                          onChange={(e) => f.set(e.target.value)}
                          className={`flex-1 min-w-0 bg-transparent ${f.label ? 'text-right' : 'text-left'} text-[17px] text-zinc-900 dark:text-white focus:outline-none ${
                            f.numeric ? 'tabular-nums' : ''
                          }`}
                        />
                      </label>
                    );
                  })}
                  <button
                    type="button"
                    onClick={handleSaveEdits}
                    className="w-full mt-2 py-3 rounded-[14px] ig-gradient text-white text-[17px] font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform cursor-pointer"
                  >
                    <Check className="w-5 h-5" />
                    {t('saveRecalculate')}
                  </button>
                </div>
              ) : (
                <>
                  {receipt.items && receipt.items.length > 0 && (
                    <div className="max-h-64 overflow-y-auto px-4 py-2 border-b border-black/[0.06] dark:border-white/[0.08]">
                      {receipt.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between gap-3 py-1.5 text-[15px]">
                          <span className="text-zinc-700 dark:text-zinc-300 truncate">
                            {item.qty > 1 && <span className="text-zinc-400 mr-1.5 tabular-nums">{item.qty}×</span>}
                            {item.name}
                          </span>
                          <span className="tabular-nums text-zinc-500 dark:text-zinc-400">{formatMoney(sym, item.price)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="px-4 py-2">
                    {summaryRows
                      .filter((r) => r.show)
                      .map((r) => {
                        const Icon = r.icon;
                        return (
                          <div
                            key={r.label}
                            className={`flex items-center gap-2.5 py-1.5 text-[15px] ${
                              r.strong ? 'font-semibold text-zinc-900 dark:text-white border-t border-black/[0.06] dark:border-white/[0.08] mt-1 pt-2.5' : 'text-zinc-600 dark:text-zinc-400'
                            }`}
                          >
                            <Icon className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                            <span className="flex-1 truncate">{r.label}</span>
                            <span className="tabular-nums">{formatMoney(sym, r.amount)}</span>
                          </div>
                        );
                      })}
                  </div>
                </>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
