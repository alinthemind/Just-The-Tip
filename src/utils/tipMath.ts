export type RoundMode = 'none' | 'total' | 'tip';

export interface TipComputation {
  percent: number;
  tipAmount: number;
  grandTotal: number;
  isRounded: boolean;
}

const cents = (n: number) => Math.round(n * 100) / 100;

/**
 * Tip on the pre-tax basis, added to the full bill. Rounding modes either round the
 * grand total up to a whole unit, or round the tip itself to a whole unit.
 */
export function computeTip(basis: number, billTotal: number, pct: number, roundMode: RoundMode): TipComputation {
  const rawTip = cents(basis * (pct / 100));
  const rawGrandTotal = cents(billTotal + rawTip);

  if (roundMode === 'none' || rawGrandTotal <= 0) {
    return { percent: pct, tipAmount: rawTip, grandTotal: rawGrandTotal, isRounded: false };
  }

  if (roundMode === 'total') {
    const roundedTotal = Math.ceil(rawGrandTotal);
    const adjustedTip = Math.max(0, cents(roundedTotal - billTotal));
    return {
      percent: basis > 0 ? Math.round((adjustedTip / basis) * 1000) / 10 : 0,
      tipAmount: adjustedTip,
      grandTotal: roundedTotal,
      isRounded: roundedTotal !== rawGrandTotal,
    };
  }

  let roundedTip = Math.round(rawTip);
  if (pct > 0 && rawTip > 0 && roundedTip === 0) roundedTip = 1;
  if (pct === 0) roundedTip = 0;
  return {
    percent: basis > 0 ? Math.round((roundedTip / basis) * 1000) / 10 : 0,
    tipAmount: roundedTip,
    grandTotal: cents(billTotal + roundedTip),
    isRounded: roundedTip !== rawTip,
  };
}

export const formatMoney = (symbol: string, amount: number) => `${symbol}${amount.toFixed(2)}`;
