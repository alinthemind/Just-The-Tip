import React, { useState } from 'react';
import { Users, Copy, Check, Plus, Minus, ArrowUpToLine } from 'lucide-react';
import { formatMoney } from '../utils/tipMath';

interface BillSplitterProps {
  totalWithTip: number;
  tipAmount: number;
  currencySymbol: string;
  currencyCode: string;
  merchantName: string;
  t: (key: string) => string;
}

export const BillSplitter: React.FC<BillSplitterProps> = ({
  totalWithTip,
  tipAmount,
  currencySymbol,
  currencyCode,
  merchantName,
  t,
}) => {
  const [diners, setDiners] = useState(1);
  const [roundUpPerPerson, setRoundUpPerPerson] = useState(false);
  const [copied, setCopied] = useState(false);

  const rawPerPerson = totalWithTip / diners;
  const finalPerPerson = roundUpPerPerson ? Math.ceil(rawPerPerson) : Math.round(rawPerPerson * 100) / 100;
  // Everything except the tip (food, tax, surcharges, service charge), so Bill + Tip adds up to the per-person total
  const basePerPerson = Math.round(((totalWithTip - tipAmount) / diners) * 100) / 100;
  const tipPerPerson = Math.round((tipAmount / diners) * 100) / 100;

  const handleCopy = () => {
    const text = `🍽️ ${merchantName || 'Bill'}
${t('total')}: ${formatMoney(currencySymbol, totalWithTip)} (${currencyCode})
👥 ${diners}
👉 ${t('eachPersonPays')}: ${formatMoney(currencySymbol, finalPerPerson)}
(${t('bill')}: ${formatMoney(currencySymbol, basePerPerson)} + ${t('tip')}: ${formatMoney(currencySymbol, tipPerPerson)})`;

    navigator.clipboard?.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const stepBtn =
    'w-8 h-8 rounded-full flex items-center justify-center text-zinc-700 dark:text-zinc-200 hover:bg-white dark:hover:bg-[#636366] disabled:opacity-30 transition-colors active:scale-90 cursor-pointer';

  return (
    <div className="mt-5 pt-4 border-t border-black/[0.06] dark:border-white/[0.08]">
      <div className="flex items-center gap-3">
        <Users className="w-5 h-5 text-zinc-400 flex-shrink-0" aria-label={t('numPeople')} />

        {/* Stepper */}
        <div className="flex items-center rounded-full bg-[#767680]/12 dark:bg-[#767680]/24 p-0.5" title={t('numPeople')}>
          <button
            type="button"
            onClick={() => setDiners((d) => Math.max(1, d - 1))}
            disabled={diners <= 1}
            className={stepBtn}
            aria-label="−"
          >
            <Minus className="w-4 h-4" />
          </button>
          <span className="w-7 text-center text-[15px] font-semibold tabular-nums text-zinc-900 dark:text-white">{diners}</span>
          <button
            type="button"
            onClick={() => setDiners((d) => Math.min(30, d + 1))}
            className={stepBtn}
            aria-label="+"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1" />

        <button
          type="button"
          onClick={() => setRoundUpPerPerson((v) => !v)}
          aria-pressed={roundUpPerPerson}
          title={t('roundUp')}
          aria-label={t('roundUp')}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer active:scale-90 ${
            roundUpPerPerson ? 'ig-gradient text-white' : 'bg-[#767680]/12 dark:bg-[#767680]/24 text-zinc-500 dark:text-zinc-300'
          }`}
        >
          <ArrowUpToLine className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={handleCopy}
          title={copied ? t('copied') : t('copy')}
          aria-label={copied ? t('copied') : t('copy')}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer active:scale-90 ${
            copied ? 'bg-[#34c759] text-white' : 'bg-[#767680]/12 dark:bg-[#767680]/24 text-zinc-500 dark:text-zinc-300'
          }`}
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>

      {diners > 1 && (
        <div className="mt-3 flex items-baseline justify-between gap-3">
          <span className="text-[13px] text-zinc-500 dark:text-zinc-400">{t('eachPersonPays')}</span>
          <span className="text-[22px] font-semibold tabular-nums text-zinc-900 dark:text-white">
            {formatMoney(currencySymbol, finalPerPerson)}
          </span>
        </div>
      )}
    </div>
  );
};
