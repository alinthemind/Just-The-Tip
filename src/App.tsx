import React, { useState, useEffect, useRef } from 'react';
import { ActiveTab, GpsErrorCode, ScannedReceiptData, UserLocation } from './types';
import { getSavedLocation, requestBrowserGps, saveLocation, setManualLocation, setLocationFromReceipt } from './utils/geolocation';
import { getTippingRuleForCountry, getServiceTiers, serviceAdvice, SERVICE_TYPES, ServiceType } from './data/tippingCulture';
import { prefetchOcrModels, runClientOcr } from './utils/ocr';
import { shrinkForUpload } from './utils/uploadImage';
import { cloudAiAvailable } from './utils/serverConfig';
import { receiptOffers, receiptTipLines } from './utils/venueText';
import { buildFallbackReceiptData, finalizeScanResult } from './utils/receiptResult';
import { primeVoices, speakInLanguage } from './utils/speech';
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

export type ThemeMode = 'dark' | 'light';

const GPS_ERROR_KEYS: Record<GpsErrorCode, string> = {
  insecure: 'locNeedsHttps',
  denied: 'locDenied',
  unavailable: 'locNoSignal',
  timeout: 'locTimeout',
  unsupported: 'locNoSignal',
};


export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('scanner');
  const [userLocation, setUserLocation] = useState<UserLocation>(getSavedLocation);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState<boolean>(false);
  // "Where is this restaurant?": only when a scanned receipt and its photo give no location
  const [locationSheet, setLocationSheet] = useState<{ open: boolean; reason: GpsErrorCode | null }>({ open: false, reason: null });
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
    // Greet in the chosen language (inside the tap, so phones allow audio)
    speakInLanguage(lang, `${getTranslation(lang, 'spokenBrand')} ${getTranslation(lang, 'heroTagline')}`);
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

  // Once the location is known, fetch the OCR model for that country's script in the background
  useEffect(() => {
    if (userLocation.source === 'gps' || userLocation.source === 'ip' || userLocation.source === 'manual') {
      prefetchOcrModels({ appLang: currentLang, countryCode: userLocation.countryCode });
    }
  }, [userLocation.countryCode, currentLang]);

  // Attempt to locate GPS on initial mount and purge any legacy history for strict user privacy
  useEffect(() => {
    primeVoices();
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
      const loc = await requestBrowserGps(
        (update) => {
          // Interim IP location, or a GPS fix that arrived late: show it unless a receipt is open
          if (!receiptOpenRef.current) setUserLocation(update);
        },
        // On launch never trigger the browser's permission prompt; the reset button is an explicit request
        { prompt: manualTrigger }
      );
      if (!receiptOpenRef.current) setUserLocation(loc);

      if (manualTrigger) {
        // Say why GPS wasn't used, so the user knows what to fix
        const reason = loc.errorCode ? t(GPS_ERROR_KEYS[loc.errorCode]) : '';
        if (loc.source !== 'gps') {
          const place = loc.city || (loc.error && loc.countryCode === 'US' ? '' : loc.countryName);
          setToastMessage({
            text: place
              ? `${reason ? `${reason} ` : ''}${t('locApproximate')}: ${place} ${loc.flag}`
              : reason || t('locFailed'),
            type: place ? 'info' : 'error',
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
      }
    } finally {
      setIsLocating(false);
    }
  };

  const handleSelectCountry = (countryCode: string) => {
    if (currentReceipt) {
      // Choosing where this restaurant is: re-price the receipt, don't change the saved device location
      relocateReceipt(countryCode, '', 'manual');
      return;
    }
    const loc = setManualLocation(countryCode);
    setUserLocation(loc);
  };

  /** Move the open receipt to another country/city and recompute its tip tiers there */
  const relocateReceipt = (countryCode: string, city: string, source: 'gps' | 'manual') => {
    const rule = getTippingRuleForCountry(countryCode);
    setCurrentReceipt((r) => {
      if (!r) return r;
      const service: ServiceType = r.serviceType || 'restaurant';
      const tiers = getServiceTiers(countryCode, service);
      const round2 = (n: number) => Math.round(n * 100) / 100;
      const tier = (percent: number, label: string, description = '') => {
        const amount = round2(r.tipBasisAmount * (percent / 100));
        return { percent, amount, totalWithTip: round2(r.total + amount), label, description };
      };
      return {
        ...r,
        city,
        state: '',
        locationSource: source,
        currencyCode: rule.currencyCode,
        currencySymbol: rule.currencySymbol,
        detectedCountry: { code: rule.countryCode, name: rule.countryName, flag: rule.flag },
        tippingCulture: {
          ...r.tippingCulture,
          isTippingCustomary: rule.isTippingCustomary,
          isTippingDiscouraged: rule.isTippingDiscouraged,
          poor: tier(tiers.poor, rule.poorLabel),
          minimum: tier(tiers.min, rule.minLabel),
          average: tier(tiers.avg, rule.avgLabel, serviceAdvice(rule, service)),
          high: tier(tiers.high, rule.highLabel),
          localEtiquetteNotes: [serviceAdvice(rule, service), ...(rule.specialRules || [])],
          paymentAdvice: rule.taxiAdvice || undefined,
        },
      };
    });
    const loc = setLocationFromReceipt(city, '', countryCode);
    loc.source = source === 'gps' ? 'gps' : 'manual';
    setUserLocation(loc);
  };

  /** "Use My Location" from the receipt sheet: an explicit request, so the permission prompt is fine here */
  const handleUseLocationForReceipt = async () => {
    setIsLocating(true);
    try {
      const loc = await requestBrowserGps(undefined, { prompt: true });
      if (loc.source === 'gps') {
        saveLocation(loc);
        relocateReceipt(loc.countryCode, loc.city, 'gps');
        setLocationSheet({ open: false, reason: null });
      } else if (loc.errorCode === 'timeout' && loc.city) {
        // GPS too slow but we have a network location: use it rather than leaving the sheet stuck
        relocateReceipt(loc.countryCode, loc.city, 'gps');
        setLocationSheet({ open: false, reason: null });
      } else {
        // Keep the sheet open and show how to turn location on
        setLocationSheet({ open: true, reason: loc.errorCode || 'unavailable' });
      }
    } finally {
      setIsLocating(false);
    }
  };

  const handleScanReceipt = async (
    base64Image: string,
    photoGps?: { latitude: number; longitude: number } | null,
    sampleInfo?: { countryCode: string; city: string; currencySymbol?: string }
  ) => {
    setIsScanning(true);
    setScanError(null);
    setScanStep(t('stepReading'));

    try {
      // If photo has EXIF GPS from phone, reverse geocode it as candidate photo location
      let photoLocationCandidate: any = null;
      if (photoGps && typeof photoGps.latitude === 'number' && typeof photoGps.longitude === 'number') {
        setScanStep(t('stepPhotoGps'));
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
          setScanStep(t('stepSample'));
          clientOcrResult = await runClientOcr(base64Image);
        } else {
          setScanStep(t('stepPreparing'));
          clientOcrResult = await runClientOcr(
            base64Image,
            (_p, statusKey) => setScanStep(t(statusKey)),
            // Which non-Latin script to try first if English OCR can't read the receipt
            { appLang: currentLang, countryCode: userLocation.countryCode }
          );
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

      setScanStep(t('stepCalculating'));
      // Work the result out on the phone: its own reading of the receipt plus the built-in tipping rules
      // (demo receipts carry their own numbers). This needs no network at all.
      let data: any = finalizeScanResult(
        buildFallbackReceiptData(candidateCountry, candidateCity, userLocation.countryName, base64Image, clientOcrResult),
        clientOcrResult
      );

      // Only when the phone's reading doesn't check out (amounts repaired or nothing to cross-check), and
      // only if the server has Gemini, send the photo for a second opinion. Any failure keeps the phone's result.
      const unsure = !sampleInfo && !clientOcrResult?.amountsConfirmed;
      if (unsure && (await cloudAiAvailable())) {
        try {
          const body = JSON.stringify({
            image: await shrinkForUpload(base64Image),
            latitude: candidateLat,
            longitude: candidateLon,
            countryCode: candidateCountry,
            cityName: candidateCity,
            countryName: userLocation.countryName,
            clientOcr: clientOcrResult,
          });
          const post = () =>
            fetch('/api/scan-receipt', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
          let response: Response;
          try {
            response = await post();
          } catch (networkErr) {
            // Phones drop the connection for a moment (Wi-Fi handoff, screen locked during a long scan)
            console.warn('Scan request failed, retrying once:', networkErr);
            await new Promise((r) => setTimeout(r, 1500));
            response = await post();
          }
          if (response.ok) {
            data = await response.json();
          } else {
            const errorData = await response.json().catch(() => ({}));
            console.warn(`AI scan unavailable (${response.status}), using the on-device result:`, errorData.error || '');
          }
        } catch (requestErr) {
          console.warn('AI scan unreachable, using the on-device result:', requestErr);
        }
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

      // A country read off the receipt (script, currency, AI) beats the phone's location even without a city
      const receiptCountry =
        sampleInfo?.countryCode ||
        clientOcrResult?.countryCode ||
        (!data.isFallback && data.detectedCountry?.code && data.detectedCountry.code !== candidateCountry
          ? data.detectedCountry.code
          : '');

      if (resolvedCity) {
        locationSource = 'receipt';
      } else if (receiptCountry) {
        resolvedCountryCode = receiptCountry;
        resolvedState = '';
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

      // Did the receipt itself (or its photo's GPS) say where the restaurant is? Gemini's country only counts
      // when it differs from the device location it was given as context, i.e. it read it off the receipt.
      const receiptLocated = Boolean(
        sampleInfo ||
          receiptCity ||
          clientOcrResult?.countryCode ||
          photoLocationCandidate ||
          (!data.isFallback && data.detectedCountry?.code && data.detectedCountry.code !== candidateCountry)
      );
      // Ask only then, and only if the device location is a guess (not real GPS, not a country the user picked)
      if (!receiptLocated && userLocation.source !== 'gps' && userLocation.source !== 'manual') {
        setLocationSheet({ open: true, reason: null });
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
            : serviceAdvice(rule, serviceType),
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
        needsReview: Boolean(data.needsReview) || (preTaxSubtotal <= 0 && total <= 0),
        venueAddress: clientOcrResult?.address,
        venuePhone: clientOcrResult?.phone,
        latitude: candidateLat,
        longitude: candidateLon,
        receiptOffers: receiptOffers(clientOcrResult?.rawText || ''),
        receiptTipNotes: receiptTipLines(clientOcrResult?.rawText || ''),
        scannedAt: Date.now(),
      };

      setCurrentReceipt(newReceipt);
    } catch (err: any) {
      console.error('Scan error:', err);
      setScanError(err.message || t('errGeneric'));
    } finally {
      setIsScanning(false);
      setScanStep('');
    }
  };

  // Leaving a receipt drops its location (printed, photo, or picked for it) and goes back to the saved device location
  const handleScanAnother = () => {
    setCurrentReceipt(null);
    setLocationSheet({ open: false, reason: null });
    setUserLocation(getSavedLocation());
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
              aria-label={t('dismiss')}
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
                key={`${currentReceipt.id}-${currentReceipt.detectedCountry?.code}`}
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
        open={locationSheet.open && currentReceipt !== null}
        reason={locationSheet.reason}
        isLocating={isLocating}
        onClose={() => setLocationSheet({ open: false, reason: null })}
        onUseLocation={handleUseLocationForReceipt}
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
