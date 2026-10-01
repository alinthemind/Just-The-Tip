import React from 'react';
import { ScannedReceiptData } from '../types';
import { History, Receipt, Trash2, ArrowRight, Calendar, MapPin } from 'lucide-react';

interface ScanHistoryProps {
  history: ScannedReceiptData[];
  onSelectReceipt: (receipt: ScannedReceiptData) => void;
  onClearHistory: () => void;
}

export const ScanHistory: React.FC<ScanHistoryProps> = ({
  history,
  onSelectReceipt,
  onClearHistory,
}) => {
  if (history.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-zinc-200 p-12 text-center max-w-lg mx-auto shadow-sm">
        <div className="w-12 h-12 rounded-2xl bg-zinc-100 text-zinc-400 flex items-center justify-center mx-auto mb-3">
          <History className="w-6 h-6" />
        </div>
        <h3 className="font-bold text-zinc-900 text-base">No Scanned Receipts Yet</h3>
        <p className="text-xs text-zinc-500 mt-1">
          When you scan paper receipts, they will be saved here so you can review previous bills and tip calculations.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-zinc-900">Receipt Scan History</h2>
          <p className="text-xs text-zinc-500">{history.length} saved receipt calculations</p>
        </div>
        <button
          onClick={onClearHistory}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition-colors cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Clear All
        </button>
      </div>

      <div className="space-y-3">
        {history.map((receipt) => {
          const dateStr = receipt.scannedAt
            ? new Date(receipt.scannedAt).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })
            : receipt.date || 'Recent';

          return (
            <div
              key={receipt.id}
              onClick={() => onSelectReceipt(receipt)}
              className="bg-white rounded-2xl border border-zinc-200 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-pink-300 hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex items-start gap-3.5">
                <div className="p-3 rounded-xl bg-zinc-100 group-hover:bg-pink-50 text-zinc-600 group-hover:text-[#E1306C] transition-colors flex-shrink-0">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-zinc-900 text-sm sm:text-base">
                      {receipt.merchantName}
                    </span>
                    <span className="text-base">{receipt.detectedCountry?.flag}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500 mt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-zinc-400" />
                      {dateStr}
                    </span>
                    {receipt.detectedCountry && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-[#E1306C]" />
                        {receipt.city ? `${receipt.city}, ` : ''}{receipt.detectedCountry.name}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-2 sm:pt-0 border-zinc-100">
                <div className="text-right">
                  <span className="text-[10px] text-zinc-400 uppercase font-semibold block">Bill Total</span>
                  <span className="font-mono font-bold text-zinc-900 text-base">
                    {receipt.currencySymbol}{receipt.total.toFixed(2)}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-[#E1306C] uppercase font-bold block">Avg Tip</span>
                  <span className="font-mono font-black ig-gradient-text text-base">
                    {receipt.currencySymbol}
                    {(receipt.subtotal * (receipt.tippingCulture.average.percent / 100)).toFixed(2)}
                  </span>
                </div>

                <div className="p-2 rounded-xl bg-zinc-50 group-hover:ig-gradient group-hover:text-white text-zinc-400 transition-all">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
