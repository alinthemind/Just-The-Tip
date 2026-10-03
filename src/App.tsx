import React, { useState, useEffect, useRef } from 'react';
import { ActiveTab, GpsErrorCode, ScannedReceiptData, UserLocation } from './types';
import { getSavedLocation, requestBrowserGps, saveLocation, setManualLocation, setLocationFromReceipt } from './utils/geolocation';
import { getTippingRuleForCountry, getServiceTiers, SERVICE_TYPES, ServiceType, TippingCultureRule } from './data/tippingCulture';
import { runClientOcr } from './utils/ocr';
import { SAMPLE_RECEIPTS, SampleReceipt } from './data/sampleReceipts';
import { Header } from './components/Header';
import { ReceiptScanner } from './components/ReceiptScanner';
import { TipResults } from './components/TipResults';
import { ManualCalculator } from './components/ManualCalculator';
import { CultureGuide } from './components/CultureGuide';
import { LocationPickerModal } from './components/LocationPickerModal';
import { LocationPermissionSheet } from './components/LocationPermissionSheet';
import { AlertCircle, Lock, Navigation, Wifi, X } from 'lucide-react';
import { LanguageCode, SUPPORTED_LANGUAGES, getTranslation } from './data/translations';

const HISTORY_STORAGE_KEY = 'globaltip_scans_history';
const LANGUAGE_STORAGE_KEY = 'globaltip_user_language';
const THEME_STORAGE_KEY = 'globaltip_user_theme';
const LOCATION_SHEET_SESSION_KEY = 'globaltip_location_sheet_shown';

export type ThemeMode = 'dark' | 'light';

const GPS_ERROR_KEYS: Record<GpsErrorCode, string> = {
  insecure: 'locNeedsHttps',
  denied: 'locDenied',
  unavailable: 'locNoSignal',
  timeout: 'locTimeout',
  unsupported: 'locNoSignal',
};

const SERVICE_ADVICE: Record<ServiceType, (rule: TippingCultureRule) => string> = {
  restaurant: (r) => r.restaurantAdvice,
  bar: (r) => r.barAdvice,
  cafe: (r) => r.counterCafeAdvice,
  taxi: (r) => r.taxiAdvice,
  beauty: (r) => r.beautyAdvice,
};

/** Same shape as /api/scan-receipt's response, built from a demo receipt's own data */
function sampleToScanData(sample: SampleReceipt) {
  const rule = getTippingRuleForCountry(sample.countryCode);
  const surcharges = sample.surcharges || [];
  const tier = (percent: number | undefined, label: string) => ({ percent: percent ?? 0, label, description: '' });
  return {
    merchantName: sample.name,
    date: sample.date,
    address: sample.state ? `${sample.city}, ${sample.state}` : sample.city,
    city: sample.city,
    state: sample.state || '',
    locationSource: 'receipt',
    preTaxSubtotal: sample.subtotal,
    subtotal: sample.subtotal,
    tax: sample.tax,
    surcharges,
    totalSurcharges: surcharges.reduce((acc, s) => acc + s.amount, 0),
    serviceCharge: sample.serviceCharge,
    serviceChargeIncluded: sample.serviceCharge > 0,
    serviceChargeDescription: sample.notes,
    total: sample.total,
    tipBasisAmount: sample.subtotal,
    items: sample.items,
    detectedCountry: { code: rule.countryCode, name: rule.countryName, flag: rule.flag },
    tippingCulture: {
      isTippingCustomary: rule.isTippingCustomary,
      isTippingDiscouraged: rule.isTippingDiscouraged,
      tippingBasis: 'subtotal',
      poor: tier(rule.poorPercent, rule.poorLabel || ''),
      minimum: tier(rule.minPercent, rule.minLabel),
      average: tier(rule.avgPercent, rule.avgLabel),
      high: tier(rule.highPercent, rule.highLabel),
      localEtiquetteNotes: [rule.restaurantAdvice, rule.counterCafeAdvice, rule.barAdvice, ...(rule.specialRules || [])],
      paymentAdvice: rule.taxiAdvice ? `Taxis: ${rule.taxiAdvice}` : undefined,
    },
    isFallback: true,
  };
}

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('scanner');
  const [userLocation, setUserLocation] = useState<UserLocation>(getSavedLocation);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState<boolean>(false);
  // Shown when GPS is blocked in a way the user can fix (permission off, insecure page)
  const [locationSheetReason, setLocationSheetReason] = useState<GpsErrorCode | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Default to Dark Mode as requested
  const [theme, setTheme] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'light' || saved === 'dark') {
        return saved as ThemeMode;
      }
    } catch {}
    return 'dark'; // UI defaults to dark mode
  });

  useEffect(() => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {}
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const [currentLang, setCurrentLang] = useState<LanguageCode>(() => {
    try {
      const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (saved && SUPPORTED_LANGUAGES.some((l) => l.code === saved)) {
        return saved as LanguageCode;
      }
    } catch {}
    return 'en';
  });

  const handleSelectLang = (lang: LanguageCode) => {
    setCurrentLang(lang);
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    } catch {}
  };

  const t = (key: string) => getTranslation(currentLang, key);

  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanStep, setScanStep] = useState<string>('');
  const [scanError, setScanError] = useState<string | null>(null);
  const [currentReceipt, setCurrentReceipt] = useState<ScannedReceiptData | null>(null);
  // Location callbacks outlive renders, so they read whether a receipt is open from a ref
  const receiptOpenRef = useRef(false);
  receiptOpenRef.current = currentReceipt !== null || isScanning;

  // Attempt to locate GPS on initial mount and purge any legacy history for strict user privacy
  useEffect(() => {
    handleRefreshGps(false);
    try {
      localStorage.removeItem(HISTORY_STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  // Auto-dismiss toast
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), toastMessage.type === 'success' ? 3500 : 7000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const handleRefreshGps = async (manualTrigger = true) => {
    setIsLocating(true);
    if (manualTrigger) {
      setCurrentReceipt(null); // Reset back to scanner view on refresh
      setScanError(null);
      setActiveTab('scanner');
    }
    try {
      const loc = await requestBrowserGps((update) => {
        // Interim IP location, or a GPS fix that arrived late: show it unless a receipt is open
        if (!receiptOpenRef.current) setUserLocation(update);
      });
      if (!receiptOpenRef.current) setUserLocation(loc);

      // Fixable problems get the "Turn On Location" sheet: always on a manual refresh, once per session on launch
      const fixable = loc.errorCode === 'denied' || loc.errorCode === 'insecure' || loc.errorCode === 'unavailable';
      if (fixable) {
        let alreadyAsked = false;
        try {
          alreadyAsked = sessionStorage.getItem(LOCATION_SHEET_SESSION_KEY) === '1';
          sessionStorage.setItem(LOCATION_SHEET_SESSION_KEY, '1');
        } catch {}
        if (manualTrigger || !alreadyAsked) {
          setLocationSheetReason(loc.errorCode!);
          return;
        }
      }

      if (manualTrigger) {
        // Say why GPS wasn't used, so the user knows what to fix
        const reason = loc.errorCode ? t(GPS_ERROR_KEYS[loc.errorCode]) : '';
        if (loc.error && !loc.city && loc.countryCode === 'US') {
          setToastMessage({
            text: reason ? `${reason} ${t('locFailed')}` : t('locFailed'),
            type: 'error',
          });
          setIsLocationModalOpen(true);
        } else if (loc.source !== 'gps') {
          setToastMessage({
            text: `${reason ? `${reason} ` : ''}${t('locApproximate')}: ${loc.city || loc.countryName} ${loc.flag}`,
            type: 'info',
          });
        } else {
          setToastMessage({
            text: `${loc.city || loc.countryName} ${loc.flag}`,
            type: 'success',
          });
        }
      }
    } catch (err) {
      console.warn('GPS refresh error:', err);
      if (manualTrigger) {
        setToastMessage({
          text: t('locFailed'),
          type: 'error',
        });
        setIsLocationModalOpen(true);
      }
    } finally {
      setIsLocating(false);
    }
  };

  const handleSelectCountry = (countryCode: string) => {
    const loc = setManualLocation(countryCode);
    setUserLocation(loc);
  };

  const handleScanReceipt = async (
    base64Image: string,
    photoGps?: { latitude: number; longitude: number } | null,
    sampleInfo?: { countryCode: string; city: string; currencySymbol?: string }
  ) => {
    setIsScanning(true);
    setScanError(null);
    setScanStep('Reading receipt image...');

    try {
      // If photo has EXIF GPS from phone, reverse geocode it as candidate photo location
      let photoLocationCandidate: any = null;
      if (photoGps && typeof photoGps.latitude === 'number' && typeof photoGps.longitude === 'number') {
        setScanStep('Reading photo GPS location...');
        try {
          const revRes = await fetch('/api/reverse-geocode', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ latitude: photoGps.latitude, longitude: photoGps.longitude }),
          });
          if (revRes.ok) {
            photoLocationCandidate = await revRes.json();
          }
        } catch (revErr) {
          console.warn('Photo GPS geocode failed:', revErr);
        }
      }

      // Run local client-side OCR in parallel to capture merchant name, city (e.g. Hong Kong, Chicago) & surcharges
      let clientOcrResult = null;
      try {
        if (sampleInfo) {
          setScanStep('Loading test receipt details...');
          clientOcrResult = await runClientOcr(base64Image);
        } else {
          setScanStep('Scanning text for restaurant name & city...');
          clientOcrResult = await runClientOcr(base64Image, (_p, status) => {
            setScanStep(status);
          });
        }
      } catch (ocrErr) {
        console.warn('Client OCR notice:', ocrErr);
      }

      // Precedence: Demo sample info > Receipt text location > Photo EXIF location > Phone live GPS
      const candidateCountry =
        sampleInfo?.countryCode ||
        clientOcrResult?.countryCode ||
        photoLocationCandidate?.countryCode ||
        userLocation.countryCode;
      const candidateCity =
        sampleInfo?.city ||
        clientOcrResult?.city ||
        photoLocationCandidate?.city ||
        userLocation.city;
      const candidateLat = photoGps?.latitude ?? userLocation.latitude;
      const candidateLon = photoGps?.longitude ?? userLocation.longitude;

      setScanStep('Calculating tip on pre-tax subtotal & local etiquette...');
      let data: any;
      try {
        const response = await fetch('/api/scan-receipt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: base64Image,
            latitude: candidateLat,
            longitude: candidateLon,
            countryCode: candidateCountry,
            cityName: candidateCity,
            countryName: userLocation.countryName,
            clientOcr: clientOcrResult,
          }),
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error ||
              (response.status === 404
                ? 'The receipt server is not reachable. Start the app with "npm run dev".'
                : response.status === 413
                ? 'This photo is too large. Please try a smaller image.'
                : `Failed to scan receipt (error ${response.status}). Please try another photo.`)
          );
        }
        data = await response.json();
      } catch (requestErr) {
        // Demo receipts carry their own numbers, so they still work when the server can't be reached
        const sample = SAMPLE_RECEIPTS.find((s) => s.svgDataUri === base64Image);
        if (!sample) {
          // fetch() rejects with a TypeError when the server can't be reached at all
          throw requestErr instanceof TypeError
            ? new Error('Can’t reach the server. Check your connection, or that "npm run dev" is still running.')
            : requestErr;
        }
        console.warn('Scan request failed, using built-in sample data:', requestErr);
        data = sampleToScanData(sample);
      }

      // DETERMINE FINAL LOCATION SOURCE:
      // Priority 1: Sample info or receipt location (printed city or detected country)
      // Priority 2: Photo EXIF GPS
      // Priority 3: Phone GPS
      let resolvedCountryCode =
        sampleInfo?.countryCode ||
        data.detectedCountry?.code ||
        clientOcrResult?.countryCode ||
        'US';
      // The fallback path echoes the GPS city back with locationSource 'gps'; that isn't a receipt location
      const receiptCity =
        sampleInfo?.city ||
        (data.locationSource !== 'gps' ? data.city : '') ||
        clientOcrResult?.city ||
        '';
      let resolvedCity = receiptCity || (resolvedCountryCode === 'HK' ? 'Hong Kong' : '');
      let resolvedState = data.state || clientOcrResult?.state;
      let locationSource: 'receipt' | 'photo-gps' | 'gps' = 'receipt';

      if (resolvedCity) {
        locationSource = 'receipt';
      } else if (photoLocationCandidate) {
        resolvedCity = photoLocationCandidate.city;
        resolvedState = photoLocationCandidate.state || '';
        resolvedCountryCode = photoLocationCandidate.countryCode;
        locationSource = 'photo-gps';
      } else if (userLocation.city) {
        resolvedCity = userLocation.city;
        resolvedState = '';
        resolvedCountryCode = userLocation.countryCode;
        locationSource = 'gps';
      }

      if (!resolvedCountryCode) {
        resolvedCountryCode = 'US';
      }

      // Sync active location so user sees correct culture & currency in Header
      const loc = setLocationFromReceipt(resolvedCity || '', resolvedState || '', resolvedCountryCode);
      loc.source = locationSource;
      setUserLocation(loc);

      const rule = getTippingRuleForCountry(resolvedCountryCode);
      const preTaxSubtotal = Number(data.preTaxSubtotal) || Number(data.subtotal) || 0;
      const surcharges = Array.isArray(data.surcharges) ? data.surcharges : [];
      const totalSurcharges = Number(data.totalSurcharges) || surcharges.reduce((acc: number, s: any) => acc + (Number(s.amount) || 0), 0);
      const tipBasisAmount = Number(data.tipBasisAmount) || preTaxSubtotal;
      const total = Number(data.total) || 0;

      // Kind of business on the receipt decides which tip range applies
      const serviceType: ServiceType = SERVICE_TYPES.includes(data.serviceType)
        ? data.serviceType
        : clientOcrResult?.serviceType || 'restaurant';
      const serviceTiers = getServiceTiers(resolvedCountryCode, serviceType);
      const isTableService = serviceType === 'restaurant' || serviceType === 'bar';

      // Handle 0% tip cultures (Hong Kong, Taiwan, China, Singapore, or when service charge is included).
      // These are restaurant norms; a taxi or salon in those places follows its own service range.
      const isZeroTipCulture =
        isTableService &&
        (resolvedCountryCode === 'HK' ||
          resolvedCountryCode === 'TW' ||
          resolvedCountryCode === 'CN' ||
          resolvedCountryCode === 'SG' ||
          Boolean(data.serviceChargeIncluded));

      const poorPercent = isZeroTipCulture
        ? 0
        : typeof data.tippingCulture?.poor?.percent === 'number'
        ? data.tippingCulture.poor.percent
        : serviceTiers.poor;

      const minPercent = isZeroTipCulture
        ? 0
        : typeof data.tippingCulture?.minimum?.percent === 'number'
        ? data.tippingCulture.minimum.percent
        : serviceTiers.min;

      const avgPercent = isZeroTipCulture
        ? 0
        : typeof data.tippingCulture?.average?.percent === 'number'
        ? data.tippingCulture.average.percent
        : serviceTiers.avg;

      const highPercent = isZeroTipCulture
        ? resolvedCountryCode === 'HK' || resolvedCountryCode === 'TW'
          ? 10
          : 0
        : typeof data.tippingCulture?.high?.percent === 'number'
        ? data.tippingCulture.high.percent
        : serviceTiers.high;

      const poorAmount = Math.round(tipBasisAmount * (poorPercent / 100) * 100) / 100;
      const minAmount = Math.round(tipBasisAmount * (minPercent / 100) * 100) / 100;
      const avgAmount = Math.round(tipBasisAmount * (avgPercent / 100) * 100) / 100;
      const highAmount = Math.round(tipBasisAmount * (highPercent / 100) * 100) / 100;

      const tippingCulture = {
        ...data.tippingCulture,
        isTippingCustomary: isZeroTipCulture ? false : rule.isTippingCustomary,
        isTippingDiscouraged: resolvedCountryCode === 'CN' || rule.isTippingDiscouraged,
        alreadyIncludedWarning:
          resolvedCountryCode === 'HK'
            ? `In Hong Kong, a 10% Service Charge (+10% 加一服務費) is already included. Additional tip is 0% (HK$0.00).`
            : data.serviceChargeIncluded
            ? `A service charge is already included on this bill. Additional tip is 0%.`
            : data.tippingCulture?.alreadyIncludedWarning,
        poor: {
          percent: poorPercent,
          amount: poorAmount,
          totalWithTip: Math.round((total + poorAmount) * 100) / 100,
          label: rule.poorLabel,
          description: isZeroTipCulture ? 'No tip.' : rule.poorDescription || 'Baseline for sub-par service.',
        },
        minimum: {
          percent: minPercent,
          amount: minAmount,
          totalWithTip: Math.round((total + minAmount) * 100) / 100,
          label: rule.minLabel,
          description: isZeroTipCulture ? '0% (Standard etiquette).' : 'Calculated on pre-tax subtotal.',
        },
        average: {
          percent: avgPercent,
          amount: avgAmount,
          totalWithTip: Math.round((total + avgAmount) * 100) / 100,
          label: rule.avgLabel,
          description: isZeroTipCulture
            ? `Standard tip in ${resolvedCity || rule.countryName} is 0% (service charge already on bill).`
            : SERVICE_ADVICE[serviceType](rule),
        },
        high: {
          percent: highPercent,
          amount: highAmount,
          totalWithTip: Math.round((total + highAmount) * 100) / 100,
          label: rule.highLabel,
          description: isZeroTipCulture
            ? 'Only for standout or banquet service.'
            : 'Generous tip for exceptional service.',
        },
      };

      const finalCurrencySymbol = sampleInfo?.currencySymbol || rule.currencySymbol;
      const finalCurrencyCode = rule.currencyCode;

      const newReceipt: ScannedReceiptData = {
        id: `receipt-${Date.now()}`,
        merchantName: data.merchantName || 'Restaurant Bill',
        date: data.date,
        address: data.address,
        city: resolvedCity,
        state: resolvedState,
        locationSource,
        serviceType,
        currencyCode: finalCurrencyCode,
        currencySymbol: finalCurrencySymbol,
        preTaxSubtotal,
        subtotal: preTaxSubtotal,
        tax: Number(data.tax) || 0,
        surcharges,
        totalSurcharges,
        serviceCharge: Number(data.serviceCharge) || 0,
        serviceChargeIncluded: Boolean(data.serviceChargeIncluded) || resolvedCountryCode === 'HK' || resolvedCountryCode === 'TW',
        serviceChargeDescription: data.serviceChargeDescription,
        total,
        tipBasisAmount,
        items: data.items || [],
        detectedCountry: {
          code: rule.countryCode,
          name: rule.countryName,
          flag: rule.flag,
        },
        tippingCulture,
        receiptImage: base64Image,
        aiNotice: data.aiNotice,
        isFallback: data.isFallback,
        scannedAt: Date.now(),
      };

      setCurrentReceipt(newReceipt);
    } catch (err: any) {
      console.error('Scan error:', err);
      setScanError(err.message || 'An error occurred while scanning the receipt.');
    } finally {
      setIsScanning(false);
      setScanStep('');
    }
  };

  // Leaving a receipt drops its location and goes back to the device's (saved) location
  const handleScanAnother = () => {
    setCurrentReceipt(null);
    if (userLocation.source === 'receipt' || userLocation.source === 'photo-gps') {
      setUserLocation(getSavedLocation());
    }
  };

  const handleUpdateReceipt = (updated: ScannedReceiptData) => {
    setCurrentReceipt(updated);
  };

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-200 selection:bg-accent/20 ${
      theme === 'dark' ? 'dark bg-black text-white' : 'bg-grouped text-zinc-900'
    }`}>
      <Header
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          if (tab !== 'scanner') {
            setScanError(null);
          }
        }}
        userLocation={userLocation}
        onOpenLocationPicker={() => setIsLocationModalOpen(true)}
        onRefreshGps={() => handleRefreshGps(true)}
        isLocating={isLocating}
        currentLang={currentLang}
        onSelectLang={handleSelectLang}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-16 inset-x-0 z-50 flex justify-center px-4 pointer-events-none animate-in slide-in-from-top-2 fade-in duration-200">
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="pointer-events-auto inline-flex items-center gap-2 pl-3 pr-4 py-2.5 rounded-full text-[15px] font-medium shadow-[0_8px_30px_rgba(0,0,0,0.18)] backdrop-blur-xl bg-white/90 dark:bg-elevated-2/90 text-zinc-900 dark:text-white cursor-pointer"
          >
            {toastMessage.type === 'error' ? (
              <AlertCircle className="w-5 h-5 text-[#ff3b30]" />
            ) : toastMessage.type === 'info' ? (
              <Wifi className="w-5 h-5 text-ig-blue" />
            ) : (
              <Navigation className="w-5 h-5 text-accent" fill="currentColor" />
            )}
            <span>{toastMessage.text}</span>
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-5 sm:py-10 pb-6 sm:pb-10">
        {scanError && (
          <div className="max-w-xl mx-auto mb-5 px-4 py-3 rounded-[16px] bg-[#ff3b30]/10 text-[15px] text-[#d70015] dark:text-[#ff6961] flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="flex-1">{scanError}</p>
            <button
              type="button"
              onClick={() => setScanError(null)}
              aria-label="Dismiss"
              className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-[#ff3b30]/10 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Tab 1: Scanner */}
        {activeTab === 'scanner' && (
          <div>
            {currentReceipt ? (
              <TipResults
                receipt={currentReceipt}
                onScanAnother={handleScanAnother}
                onUpdateReceipt={handleUpdateReceipt}
                currentLang={currentLang}
              />
            ) : (
              <ReceiptScanner
                onScan={handleScanReceipt}
                isScanning={isScanning}
                userLocation={userLocation}
                scanStep={scanStep}
                currentLang={currentLang}
              />
            )}
          </div>
        )}

        {/* Tab 2: Manual Calculator */}
        {activeTab === 'manual' && (
          <ManualCalculator
            userLocation={userLocation}
            onOpenLocationPicker={() => setIsLocationModalOpen(true)}
            currentLang={currentLang}
          />
        )}

        {/* Tab 3: World Etiquette Guide */}
        {activeTab === 'guide' && <CultureGuide currentLang={currentLang} />}

      </main>

      {/* Location Picker Modal */}
      <LocationPickerModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        currentLocation={userLocation}
        onSelectCountry={handleSelectCountry}
        onRefreshGps={() => handleRefreshGps(true)}
        isLocating={isLocating}
        currentLang={currentLang}
      />

      <LocationPermissionSheet
        reason={locationSheetReason}
        onClose={() => setLocationSheetReason(null)}
        onRetry={() => handleRefreshGps(true)}
        onChooseCountry={() => setIsLocationModalOpen(true)}
        currentLang={currentLang}
      />

      {/* Footer */}
      <footer className="py-6 pb-28 sm:pb-8 text-center text-[12px] text-zinc-400 dark:text-zinc-600 flex items-center justify-center gap-1.5">
        <Lock className="w-3 h-3" />
        <span>{t('privacyBadge')}</span>
      </footer>
    </div>
  );
}
