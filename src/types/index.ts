import { TippingCultureRule, ServiceType } from '../data/tippingCulture';

export interface ReceiptItem {
  name: string;
  qty: number;
  price: number;
}

export interface ReceiptSurcharge {
  name: string;
  amount: number;
  percentage?: number;
  isHealthOrMandate?: boolean; // e.g. SF Health Mandate, employee wellness fee
}

export interface TipTier {
  percent: number;
  amount: number;
  totalWithTip: number;
  label: string;
  description: string;
}

export interface TippingCultureResult {
  isTippingCustomary: boolean;
  isTippingDiscouraged: boolean;
  tippingBasis: 'subtotal' | 'total' | 'round_up' | 'flat_amount';
  alreadyIncludedWarning?: string;
  poor: TipTier;
  minimum: TipTier;
  average: TipTier;
  high: TipTier;
  localEtiquetteNotes: string[];
  paymentAdvice?: string;
}

export interface ScannedReceiptData {
  id: string;
  merchantName: string;
  date?: string;
  address?: string;
  city?: string;
  state?: string;
  locationSource?: 'receipt' | 'photo-gps' | 'gps' | 'manual';
  serviceType?: ServiceType;
  currencyCode: string;
  currencySymbol: string;
  preTaxSubtotal: number; // Pure food & beverage pre-tax subtotal (Tip Basis)
  subtotal: number; // Backward compatibility
  tax: number;
  surcharges: ReceiptSurcharge[]; // e.g. SF Health Mandate, Kitchen Surcharges
  totalSurcharges: number;
  serviceCharge: number;
  serviceChargeIncluded: boolean;
  serviceChargeDescription?: string;
  total: number;
  tipBasisAmount: number; // Explicitly pre-tax and EXCLUDING all fees/surcharges
  items: ReceiptItem[];
  detectedCountry?: {
    code: string;
    name: string;
    flag: string;
  };
  tippingCulture: TippingCultureResult;
  receiptImage?: string;
  aiNotice?: string;
  isFallback?: boolean;
  /** Nothing could be read off the receipt; the user has to enter the amounts */
  needsReview?: boolean;
  /** Venue street address and phone number as printed on the receipt, to find it on Google */
  venueAddress?: string;
  venuePhone?: string;
  /** Where the receipt was scanned (photo GPS or the phone), to find the venue on Google */
  latitude?: number | null;
  longitude?: number | null;
  /** Tipping lines printed on the receipt (service charge, suggested gratuity) */
  receiptTipNotes?: string[];
  /** Happy hours, pricing specials and deals printed on the receipt */
  receiptOffers?: { happyHours: string[]; specials: string[]; deals: string[] };
  scannedAt: number;
}

export interface UserLocation {
  latitude: number | null;
  longitude: number | null;
  countryCode: string;
  countryName: string;
  city: string;
  flag: string;
  currencyCode: string;
  currencySymbol: string;
  isGps: boolean;
  source?: 'receipt' | 'photo-gps' | 'gps' | 'ip' | 'default' | 'manual';
  error?: string;
  /** Why GPS wasn't used, so the UI can say what to fix */
  errorCode?: GpsErrorCode;
}

export type GpsErrorCode = 'insecure' | 'denied' | 'unavailable' | 'timeout' | 'unsupported';

export type ActiveTab = 'scanner' | 'manual' | 'guide';
