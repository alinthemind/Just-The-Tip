import React, { useState, useEffect } from 'react';
import { ActiveTab, ScannedReceiptData, UserLocation } from './types';
import { getSavedLocation, requestBrowserGps, saveLocation, setManualLocation, setLocationFromReceipt } from './utils/geolocation';
import { getTippingRuleForCountry } from './data/tippingCulture';
import { runClientOcr } from './utils/ocr';
import { Header } from './components/Header';
import { ReceiptScanner } from './components/ReceiptScanner';
import { TipResults } from './components/TipResults';
import { ManualCalculator } from './components/ManualCalculator';
import { CultureGuide } from './components/CultureGuide';
import { ScanHistory } from './components/ScanHistory';
import { LocationPickerModal } from './components/LocationPickerModal';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

const HISTORY_STORAGE_KEY = 'globaltip_scans_history';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('scanner');
  const [userLocation, setUserLocation] = useState<UserLocation>(getSavedLocation);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState<boolean>(false);

  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanStep, setScanStep] = useState<string>('');
  const [scanError, setScanError] = useState<string | null>(null);
  const [currentReceipt, setCurrentReceipt] = useState<ScannedReceiptData | null>(null);

  const [history, setHistory] = useState<ScannedReceiptData[]>(() => {
    try {
      const saved = localStorage.getItem(HISTORY_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Attempt to locate GPS on initial mount
  useEffect(() => {
    handleRefreshGps(false);
  }, []);

  // Save history to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
    } catch (e) {
      console.error('Failed to save scan history:', e);
    }
  }, [history]);

  const handleRefreshGps = async (manualTrigger = true) => {
    setIsLocating(true);
    try {
      const loc = await requestBrowserGps();
      setUserLocation(loc);
    } catch (err) {
      console.warn('GPS refresh error:', err);
    } finally {
      setIsLocating(false);
    }
  };

  const handleSelectCountry = (countryCode: string) => {
    const loc = setManualLocation(countryCode);
    setUserLocation(loc);
  };

  const handleScanReceipt = async (base64Image: string, photoGps?: { latitude: number; longitude: number } | null) => {
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
        setScanStep('Scanning text for restaurant name & city...');
        clientOcrResult = await runClientOcr(base64Image, (_p, status) => {
          setScanStep(status);
        });
      } catch (ocrErr) {
        console.warn('Client OCR notice:', ocrErr);
      }

      // Precedence: Receipt text location > Photo EXIF location > Phone live GPS
      const candidateCountry = clientOcrResult?.countryCode || photoLocationCandidate?.countryCode || userLocation.countryCode;
      const candidateCity = clientOcrResult?.city || photoLocationCandidate?.city || userLocation.city;
      const candidateLat = photoGps?.latitude ?? userLocation.latitude;
      const candidateLon = photoGps?.longitude ?? userLocation.longitude;

      setScanStep('Calculating tip on pre-tax subtotal & local etiquette...');
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
        throw new Error(errorData.error || 'Failed to scan receipt. Please try another photo.');
      }

      const data = await response.json();

      // DETERMINE FINAL LOCATION SOURCE:
      // Priority 1: Receipt location (printed city or detected country)
      // Priority 2: Photo EXIF GPS
      // Priority 3: Phone GPS
      let resolvedCity = data.city || clientOcrResult?.city;
      let resolvedState = data.state || clientOcrResult?.state;
      let resolvedCountryCode = data.detectedCountry?.code || clientOcrResult?.countryCode;
      let locationSource: 'receipt' | 'photo-gps' | 'gps' = 'gps';

      if (resolvedCity || clientOcrResult?.city) {
        locationSource = 'receipt';
      } else if (photoLocationCandidate) {
        resolvedCity = photoLocationCandidate.city;
        resolvedCountryCode = photoLocationCandidate.countryCode;
        locationSource = 'photo-gps';
      } else if (userLocation.city) {
        resolvedCity = userLocation.city;
        resolvedCountryCode = userLocation.countryCode;
        locationSource = 'gps';
      }

      if (!resolvedCountryCode) {
        resolvedCountryCode = 'US';
      }

      // Sync active location so user sees correct culture & currency
      const loc = setLocationFromReceipt(resolvedCity || '', resolvedState || '', resolvedCountryCode);
      loc.source = locationSource;
      setUserLocation(loc);

      const rule = getTippingRuleForCountry(resolvedCountryCode);
      const preTaxSubtotal = Number(data.preTaxSubtotal) || Number(data.subtotal) || 0;
      const surcharges = Array.isArray(data.surcharges) ? data.surcharges : [];
      const totalSurcharges = Number(data.totalSurcharges) || surcharges.reduce((acc: number, s: any) => acc + (Number(s.amount) || 0), 0);
      const tipBasisAmount = Number(data.tipBasisAmount) || preTaxSubtotal;
      const total = Number(data.total) || 0;

      // Ensure 4 tipping tiers: poor, minimum, average, high
      const poorPercent = typeof data.tippingCulture?.poor?.percent === 'number' ? data.tippingCulture.poor.percent : rule.poorPercent;
      const poorAmount = Math.round(tipBasisAmount * (poorPercent / 100) * 100) / 100;

      const tippingCulture = {
        ...data.tippingCulture,
        poor: data.tippingCulture?.poor || {
          percent: poorPercent,
          amount: poorAmount,
          totalWithTip: Math.round((total + poorAmount) * 100) / 100,
          label: rule.poorLabel,
          description: rule.poorDescription || 'Baseline for sub-par service.',
        },
        minimum: data.tippingCulture?.minimum || {
          percent: rule.minPercent,
          amount: Math.round(tipBasisAmount * (rule.minPercent / 100) * 100) / 100,
          totalWithTip: Math.round((total + tipBasisAmount * (rule.minPercent / 100)) * 100) / 100,
          label: rule.minLabel,
          description: `Calculated on pre-tax subtotal.`,
        },
        average: data.tippingCulture?.average || {
          percent: rule.avgPercent,
          amount: Math.round(tipBasisAmount * (rule.avgPercent / 100) * 100) / 100,
          totalWithTip: Math.round((total + tipBasisAmount * (rule.avgPercent / 100)) * 100) / 100,
          label: rule.avgLabel,
          description: rule.restaurantAdvice,
        },
        high: data.tippingCulture?.high || {
          percent: rule.highPercent,
          amount: Math.round(tipBasisAmount * (rule.highPercent / 100) * 100) / 100,
          totalWithTip: Math.round((total + tipBasisAmount * (rule.highPercent / 100)) * 100) / 100,
          label: rule.highLabel,
          description: `Generous tip for exceptional service.`,
        },
      };

      const newReceipt: ScannedReceiptData = {
        id: `receipt-${Date.now()}`,
        merchantName: data.merchantName || 'Restaurant Bill',
        date: data.date,
        address: data.address,
        city: resolvedCity,
        state: resolvedState,
        locationSource,
        currencyCode: data.currencyCode || rule.currencyCode,
        currencySymbol: data.currencySymbol || rule.currencySymbol,
        preTaxSubtotal,
        subtotal: preTaxSubtotal,
        tax: Number(data.tax) || 0,
        surcharges,
        totalSurcharges,
        serviceCharge: Number(data.serviceCharge) || 0,
        serviceChargeIncluded: Boolean(data.serviceChargeIncluded),
        serviceChargeDescription: data.serviceChargeDescription,
        total,
        tipBasisAmount,
        items: data.items || [],
        detectedCountry: data.detectedCountry || {
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
      setHistory((prev) => [newReceipt, ...prev.slice(0, 24)]);
    } catch (err: any) {
      console.error('Scan error:', err);
      setScanError(err.message || 'An error occurred while scanning the receipt.');
    } finally {
      setIsScanning(false);
      setScanStep('');
    }
  };

  const handleUpdateReceipt = (updated: ScannedReceiptData) => {
    setCurrentReceipt(updated);
    setHistory((prev) =>
      prev.map((item) => (item.id === updated.id ? updated : item))
    );
  };

  const handleClearHistory = () => {
    if (confirm('Clear all stored receipt scans?')) {
      setHistory([]);
      localStorage.removeItem(HISTORY_STORAGE_KEY);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 flex flex-col font-sans selection:bg-pink-100 selection:text-pink-900">
      {/* Header with Navigation and GPS selector */}
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
        historyCount={history.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-8 pb-28 sm:pb-8">
        {scanError && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-start gap-3 shadow-sm animate-in fade-in">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold block">Receipt Scan Error</span>
              <p>{scanError}</p>
            </div>
            <button
              onClick={() => setScanError(null)}
              className="text-rose-600 hover:text-rose-900 font-bold text-xs cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Tab 1: Scanner */}
        {activeTab === 'scanner' && (
          <div>
            {currentReceipt ? (
              <TipResults
                receipt={currentReceipt}
                onScanAnother={() => setCurrentReceipt(null)}
                onUpdateReceipt={handleUpdateReceipt}
              />
            ) : (
              <ReceiptScanner
                onScan={handleScanReceipt}
                isScanning={isScanning}
                userLocation={userLocation}
                scanStep={scanStep}
              />
            )}
          </div>
        )}

        {/* Tab 2: Manual Calculator */}
        {activeTab === 'manual' && (
          <ManualCalculator
            userLocation={userLocation}
            onOpenLocationPicker={() => setIsLocationModalOpen(true)}
          />
        )}

        {/* Tab 3: World Etiquette Guide */}
        {activeTab === 'guide' && <CultureGuide />}

        {/* Tab 4: History */}
        {activeTab === 'history' && (
          <ScanHistory
            history={history}
            onSelectReceipt={(receipt) => {
              setCurrentReceipt(receipt);
              setActiveTab('scanner');
            }}
            onClearHistory={handleClearHistory}
          />
        )}
      </main>

      {/* Location Picker Modal */}
      <LocationPickerModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        currentLocation={userLocation}
        onSelectCountry={handleSelectCountry}
        onRefreshGps={() => handleRefreshGps(true)}
        isLocating={isLocating}
      />

      {/* Footer */}
      <footer className="border-t border-zinc-200/80 bg-white py-6 pb-24 sm:pb-6 mt-8 sm:mt-12 text-center text-xs text-zinc-500">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 justify-center">
            <span className="font-black text-zinc-900">Just the <span className="ig-gradient-text">Tip</span></span>
            <span>•</span>
            <span>Accurate GPS tipping etiquette for travelers &amp; diners worldwide</span>
          </div>
          <div>
            Tipping calculated on pre-tax subtotal, excluding sales taxes and health mandates.
          </div>
        </div>
      </footer>
    </div>
  );
}
