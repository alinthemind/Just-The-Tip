import React, { useState } from 'react';
import { Users, Copy, Check, Plus, Minus } from 'lucide-react';

interface BillSplitterProps {
  totalWithTip: number;
  tipAmount: number;
  subtotal: number;
  tax: number;
  currencySymbol: string;
  currencyCode: string;
  merchantName: string;
}

export const BillSplitter: React.FC<BillSplitterProps> = ({
  totalWithTip,
  tipAmount,
  subtotal,
  tax,
  currencySymbol,
  currencyCode,
  merchantName,
}) => {
  const [diners, setDiners] = useState(2);
  const [roundUpPerPerson, setRoundUpPerPerson] = useState(false);
  const [copied, setCopied] = useState(false);

  const rawPerPerson = totalWithTip / diners;
  const finalPerPerson = roundUpPerPerson ? Math.ceil(rawPerPerson) : Math.round(rawPerPerson * 100) / 100;
  const basePerPerson = Math.round((subtotal / diners) * 100) / 100;
  const tipPerPerson = Math.round((tipAmount / diners) * 100) / 100;

  const handleCopy = () => {
    const text = `🍽️ Bill Split for ${merchantName || 'Dining'}:
Total with Tip: ${currencySymbol}${totalWithTip.toFixed(2)} (${currencyCode})
Split between: ${diners} people
👉 Each person pays: ${currencySymbol}${finalPerPerson.toFixed(2)}
(Base: ${currencySymbol}${basePerPerson.toFixed(2)} + Tip: ${currencySymbol}${tipPerPerson.toFixed(2)})`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="bg-gradient-to-br from-zinc-50 via-pink-50/20 to-zinc-50 rounded-2xl border border-zinc-200/80 p-4 sm:p-5 mt-4">
      <div className="flex items-center justify-between mb-3.5 gap-2">
        <div className="flex items-center gap-2">
          <div className="ig-story-ring-sm">
            <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center text-[#E1306C]">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <h4 className="font-extrabold text-xs sm:text-sm text-zinc-900 leading-tight">
              Split Bill Among Diners
            </h4>
            <p className="text-[11px] text-zinc-500">Each person's exact share with tip</p>
          </div>
        </div>

        {/* Counter controls with large touch targets */}
        <div className="flex items-center gap-1.5 bg-white border border-zinc-200 rounded-full px-2 py-1 shadow-xs">
          <button
            onClick={() => setDiners((d) => Math.max(1, d - 1))}
            disabled={diners <= 1}
            className="w-7 h-7 rounded-full flex items-center justify-center text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 disabled:opacity-30 transition-colors active:scale-90"
            title="Decrease diners"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <span className="font-black text-zinc-900 text-xs sm:text-sm w-6 text-center font-mono">
            {diners}
          </span>
          <button
            onClick={() => setDiners((d) => Math.min(30, d + 1))}
            className="w-7 h-7 rounded-full flex items-center justify-center text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition-colors active:scale-90"
            title="Increase diners"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Split Result Card */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center bg-white p-3.5 sm:p-4 rounded-2xl border border-zinc-200/80 shadow-xs">
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
            Each Person Pays
          </span>
          <div className="text-2xl sm:text-3xl font-black ig-gradient-text font-mono mt-0.5">
            {currencySymbol}{finalPerPerson.toFixed(2)}
          </div>
          <div className="text-xs text-zinc-500 mt-1 flex items-center gap-2">
            <span>Food: {currencySymbol}{basePerPerson.toFixed(2)}</span>
            <span>•</span>
            <span className="text-zinc-700 font-medium">Tip: {currencySymbol}{tipPerPerson.toFixed(2)}</span>
          </div>
        </div>

        <div className="flex flex-col sm:items-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-100">
          <label className="flex items-center gap-2 text-xs text-zinc-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={roundUpPerPerson}
              onChange={(e) => setRoundUpPerPerson(e.target.checked)}
              className="rounded text-[#E1306C] focus:ring-pink-400 w-4 h-4 border-zinc-300"
            />
            <span>Round up to nearest whole {currencySymbol}</span>
          </label>

          <button
            onClick={handleCopy}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl ig-gradient hover:opacity-95 text-white text-xs font-bold transition-all shadow-md shadow-pink-500/20 active:scale-95 cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-yellow-200" />
                <span>Copied to Clipboard!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Share Split Breakdown</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
