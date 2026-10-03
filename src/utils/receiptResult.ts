/**
 * Builds a scan result (amounts, location, tip tiers) from the phone's own reading of the receipt and the
 * built-in tipping rules. Runs on the phone for every scan, and on the server as the fallback when Gemini
 * is unavailable, so the two always agree. Must stay free of browser-only and Node-only APIs.
 * Import paths use .js so the server's compiled copy runs in plain Node (on Vercel).
 */
import { SERVICE_TYPES, ServiceType, getServiceTiers, getTippingRuleForCountry } from '../data/tippingCulture.js';
import { SAMPLE_RECEIPTS } from '../data/sampleReceipts.js';

export function buildFallbackReceiptData(
  countryCode: string | null | undefined,
  cityName: string | null | undefined,
  countryName: string | null | undefined,
  imageStr: string,
  clientOcr?: any
) {
  let merchant = 'Restaurant Bill';
  let detectedCity = cityName || '';
  let detectedState = '';
  // Whether the city came from the receipt itself (OCR, sample, or text match) rather than device GPS
  let cityFromReceipt = false;
  // Start empty: when nothing can be read, the app asks for the amounts rather than showing invented ones
  let preTaxSubtotal = 0;
  let tax = 0;
  let surcharges: Array<{ name: string; amount: number; isHealthOrMandate?: boolean }> = [];
  let serviceCharge = 0;
  let serviceChargeIncluded = false;
  let serviceChargeDesc = '';
  let items: Array<{ name: string; qty: number; price: number }> = [];

  // 1. If client OCR data is provided, use it
  if (clientOcr && (clientOcr.preTaxSubtotal > 0 || clientOcr.total > 0)) {
    if (clientOcr.merchantName) merchant = clientOcr.merchantName;
    if (clientOcr.city) {
      detectedCity = clientOcr.city;
      detectedState = clientOcr.state || '';
      cityFromReceipt = true;
    }
    if (clientOcr.preTaxSubtotal > 0) preTaxSubtotal = clientOcr.preTaxSubtotal;
    if (clientOcr.tax > 0) tax = clientOcr.tax;
    if (clientOcr.surcharges && clientOcr.surcharges.length > 0) {
      surcharges = clientOcr.surcharges;
    }
    if (clientOcr.serviceCharge > 0) {
      serviceCharge = clientOcr.serviceCharge;
      serviceChargeIncluded = true;
      serviceChargeDesc = clientOcr.serviceChargeDescription || '';
    }
    if (clientOcr.items && clientOcr.items.length > 0) {
      items = clientOcr.items;
    }
  }

  // 2. Try matching any sample receipts if clicked.
  // Only SVG demo receipts contain readable text; a raster photo's base64 is random
  // characters that would spuriously match short patterns like "sf" or "hkd".
  const isSvg = imageStr.startsWith('data:image/svg+xml') || imageStr.includes('<svg');
  let decodedStr = '';
  if (isSvg) {
    try {
      decodedStr = decodeURIComponent(imageStr.replace(/%(?![0-9a-fA-F]{2})/g, '%25'));
    } catch {
      decodedStr = imageStr;
    }
  }

  for (const sample of SAMPLE_RECEIPTS) {
    if (!decodedStr) break;
    if (
      decodedStr.includes(sample.id) ||
      decodedStr.includes(sample.name) ||
      (sample.countryCode === 'HK' && (decodedStr.includes('Maxim') || decodedStr.includes('美心') || decodedStr.includes('Hong Kong') || decodedStr.includes('HK$'))) ||
      (sample.countryCode === 'TW' && (decodedStr.includes('鼎泰豐') || decodedStr.includes('Din Tai Fung') || decodedStr.includes('Taipei') || decodedStr.includes('NT$'))) ||
      (sample.countryCode === 'CN' && (decodedStr.includes('老吉士') || decodedStr.includes('Old Jesse') || decodedStr.includes('姥姥家') || decodedStr.includes('Shanghai'))) ||
      (sample.countryCode === 'TH' && (decodedStr.includes('Calypso') || decodedStr.includes('Somtum') || decodedStr.includes('Bangkok') || decodedStr.includes('ส้มตำ'))) ||
      (sample.countryCode === 'JP' && (decodedStr.includes('Sukiyabashi') || decodedStr.includes('すきやばし') || decodedStr.includes('Jiro') || decodedStr.includes('次郎') || decodedStr.includes('Tokyo'))) ||
      (sample.countryCode === 'FR' && (decodedStr.includes('Robuchon') || decodedStr.includes('Joël') || decodedStr.includes('Paris'))) ||
      (sample.countryCode === 'US' && sample.city === 'San Francisco' && (decodedStr.includes('Bix') || decodedStr.includes('San Francisco') || decodedStr.includes('Zuni'))) ||
      (sample.countryCode === 'US' && sample.city === 'Las Vegas' && (decodedStr.includes('Las Vegas') || decodedStr.includes('Delilah') || decodedStr.includes('Wynn')))
    ) {
      merchant = sample.name;
      preTaxSubtotal = sample.subtotal;
      tax = sample.tax;
      surcharges = sample.surcharges || [];
      serviceCharge = sample.serviceCharge;
      serviceChargeIncluded = sample.serviceCharge > 0;
      serviceChargeDesc = sample.notes;
      items = sample.items;
      countryCode = sample.countryCode;
      countryName = sample.countryName;
      detectedCity = sample.city;
      detectedState = sample.state || '';
      cityFromReceipt = true;
      break;
    }
  }

  // 3. Fallback regex detection on text for cities, currencies, and surcharges
  if (decodedStr && (!detectedCity || !countryCode)) {
    const cityBefore = detectedCity;
    if (/hong\s*kong|美心|kowloon|central|hk\$|hkd/i.test(decodedStr)) {
      detectedCity = 'Hong Kong';
      countryCode = 'HK';
      countryName = 'Hong Kong';
    } else if (/taiwan|taipei|鼎泰豐|nt\$/i.test(decodedStr)) {
      detectedCity = 'Taipei';
      countryCode = 'TW';
      countryName = 'Taiwan';
    } else if (/bangkok|thailand|calypso|somtum|฿|thb/i.test(decodedStr)) {
      detectedCity = 'Bangkok';
      countryCode = 'TH';
      countryName = 'Thailand';
    } else if (/shanghai|china|老吉士|old\s*jesse|姥姥家/i.test(decodedStr)) {
      detectedCity = 'Shanghai';
      countryCode = 'CN';
      countryName = 'China';
    } else if (/las\s*vegas|delilah|wynn|bellagio/i.test(decodedStr)) {
      detectedCity = 'Las Vegas';
      detectedState = 'NV';
      countryCode = 'US';
      countryName = 'United States';
    } else if (/chicago/i.test(decodedStr)) {
      detectedCity = 'Chicago';
      detectedState = 'IL';
      countryCode = 'US';
      countryName = 'United States';
    } else if (/san\s*francisco|\bsf\b|bix/i.test(decodedStr)) {
      detectedCity = 'San Francisco';
      detectedState = 'CA';
      countryCode = 'US';
      countryName = 'United States';
    } else if (/tokyo|japan|sukiyabashi|jiro|すきやばし|一蘭|寿司|ichiran|sushi\s*dai|toyosu|shinjuku/i.test(decodedStr)) {
      detectedCity = 'Tokyo';
      countryCode = 'JP';
      countryName = 'Japan';
    } else if (/paris|france|robuchon|joël|paul\s*bert|café\s*de\s*flore|croque|saint-germain/i.test(decodedStr)) {
      detectedCity = 'Paris';
      countryCode = 'FR';
      countryName = 'France';
    } else if (/mexico\s*city|mexico|cdmx|califa|pujol|taqueria|condesa|polanco/i.test(decodedStr)) {
      detectedCity = 'Mexico City';
      countryCode = 'MX';
      countryName = 'Mexico';
    }
    if (detectedCity !== cityBefore) cityFromReceipt = true;
  }

  // Parse financial amounts if present in SVG or plain text
  if (
    decodedStr.includes('SUBTOTAL') ||
    decodedStr.includes('TOTAL') ||
    decodedStr.includes('SERVICE CHARGE')
  ) {
    try {
      const subMatch =
        decodedStr.match(/SUBTOTAL[^:]*:[^0-9]*([0-9]+\.[0-9]{2})/i) ||
        decodedStr.match(/SUBTOTAL[:\s]+[$€£¥฿]?\s*([0-9]+(?:\.[0-9]{2})?)/i);
      if (subMatch && !preTaxSubtotal) preTaxSubtotal = parseFloat(subMatch[1]) || preTaxSubtotal;

      const sfMatch = decodedStr.match(/(?:SF\s*MANDATE|HEALTH)[^:]*:[^0-9]*([0-9]+\.[0-9]{2})/i);
      if (sfMatch && surcharges.length === 0) {
        const scAmt = parseFloat(sfMatch[1]) || 0;
        surcharges.push({
          name: 'SF Health Mandate (5%)',
          amount: scAmt,
          isHealthOrMandate: true,
        });
      }

      const taxMatch =
        decodedStr.match(/TAX[^:]*:[^0-9]*([0-9]+\.[0-9]{2})/i) ||
        decodedStr.match(/TAX[:\s]+[$€£¥฿]?\s*([0-9]+(?:\.[0-9]{2})?)/i);
      if (taxMatch && !tax) tax = parseFloat(taxMatch[1]) || tax;

      const scMatch =
        decodedStr.match(/SERVICE CHARGE[^:]*:[^0-9]*([0-9]+\.[0-9]{2})/i) ||
        decodedStr.match(/SERVICE CHARGE[:\s]+[$€£¥฿]?\s*([0-9]+(?:\.[0-9]{2})?)/i) ||
        decodedStr.match(/(?:加一|服務費)[^0-9]*([0-9]+\.[0-9]{2})/i);
      if (scMatch && serviceCharge === 0) {
        serviceCharge = parseFloat(scMatch[1]) || 0;
        serviceChargeIncluded = true;
      }
    } catch (e) {
      console.warn('SVG parse error:', e);
    }
  }

  const totalSurcharges = surcharges.reduce((acc, s) => acc + s.amount, 0);
  // The total printed on the receipt wins; otherwise add up the parts
  const total =
    clientOcr?.total > 0 && !decodedStr
      ? Number(clientOcr.total)
      : Math.round((preTaxSubtotal + tax + totalSurcharges + serviceCharge) * 100) / 100;

  // IMPORTANT: Tip is STRICTLY calculated on preTaxSubtotal (excluding tax AND excluding health surcharges)
  const tipBasisAmount = preTaxSubtotal;

  const rule = getTippingRuleForCountry(countryCode);

  const poorAmt = Math.round(tipBasisAmount * (rule.poorPercent / 100) * 100) / 100;
  const minAmt = Math.round(tipBasisAmount * (rule.minPercent / 100) * 100) / 100;
  const avgAmt = Math.round(tipBasisAmount * (rule.avgPercent / 100) * 100) / 100;
  const highAmt = Math.round(tipBasisAmount * (rule.highPercent / 100) * 100) / 100;

  const cityDisplay = detectedCity
    ? detectedState
      ? `${detectedCity}, ${detectedState}`
      : detectedCity
    : countryName || rule.countryName;

  return {
    merchantName: merchant,
    date: new Date().toLocaleDateString(),
    address: cityDisplay,
    city: detectedCity,
    state: detectedState,
    locationSource: cityFromReceipt ? 'receipt' : 'gps',
    currencyCode: rule.currencyCode,
    currencySymbol: rule.currencySymbol,
    preTaxSubtotal,
    subtotal: preTaxSubtotal,
    tax,
    surcharges,
    totalSurcharges,
    serviceCharge,
    serviceChargeIncluded,
    serviceChargeDescription:
      serviceChargeDesc ||
      (serviceChargeIncluded
        ? `${rule.currencySymbol}${serviceCharge.toFixed(2)} service charge included on bill`
        : undefined),
    total,
    tipBasisAmount,
    items,
    detectedCountry: {
      code: rule.countryCode,
      name: rule.countryName,
      flag: rule.flag,
    },
    tippingCulture: {
      isTippingCustomary: rule.isTippingCustomary,
      isTippingDiscouraged: rule.isTippingDiscouraged,
      tippingBasis: 'subtotal',
      alreadyIncludedWarning: serviceChargeIncluded
        ? `A service charge of ${rule.currencySymbol}${serviceCharge.toFixed(2)} is already on this bill. In ${rule.countryName}, additional tipping is not required.`
        : undefined,
      poor: {
        percent: rule.poorPercent,
        amount: poorAmt,
        totalWithTip: Math.round((total + poorAmt) * 100) / 100,
        label: rule.poorLabel,
        description: rule.poorDescription || 'Baseline for sub-par service.',
      },
      minimum: {
        percent: rule.minPercent,
        amount: minAmt,
        totalWithTip: Math.round((total + minAmt) * 100) / 100,
        label: rule.minLabel,
        description: `Calculated on pre-tax subtotal (${rule.currencySymbol}${tipBasisAmount.toFixed(2)}).`,
      },
      average: {
        percent: rule.avgPercent,
        amount: avgAmt,
        totalWithTip: Math.round((total + avgAmt) * 100) / 100,
        label: rule.avgLabel,
        description: `Standard etiquette in ${detectedCity || rule.countryName}. Based strictly on pre-tax food & beverage (${rule.currencySymbol}${tipBasisAmount.toFixed(2)}).`,
      },
      high: {
        percent: rule.highPercent,
        amount: highAmt,
        totalWithTip: Math.round((total + highAmt) * 100) / 100,
        label: rule.highLabel,
        description: `Generous tip for exceptional service in ${detectedCity || rule.countryName}.`,
      },
      localEtiquetteNotes: [
        rule.restaurantAdvice,
        rule.counterCafeAdvice,
        rule.barAdvice,
        ...(rule.specialRules || []),
      ],
      paymentAdvice: rule.taxiAdvice || undefined,
    },
    isFallback: true,
    // Nothing usable was read off the receipt: the user needs to enter the amounts
    needsReview: !(preTaxSubtotal > 0 || total > 0),
  };
}

// Reverse geocode route

/**
 * Final pass on any scan result (built here or returned by Gemini): settle the service type, swap in
 * that service's tip range for rule-based results, and compute every tier's amount from the pre-tax
 * subtotal. Mutates and returns `parsedData`.
 */
export function finalizeScanResult(parsedData: any, clientOcr?: any) {
  // Service type: Gemini's answer, else the client's keyword detection, else restaurant
  const serviceType: ServiceType = SERVICE_TYPES.includes(parsedData.serviceType)
    ? parsedData.serviceType
    : SERVICE_TYPES.includes(clientOcr?.serviceType)
    ? clientOcr.serviceType
    : 'restaurant';
  parsedData.serviceType = serviceType;
  // The fallback builds restaurant tiers from the static rules; swap in this service's range
  if (parsedData.isFallback && serviceType !== 'restaurant' && parsedData.tippingCulture) {
    const tiers = getServiceTiers(parsedData.detectedCountry?.code, serviceType);
    parsedData.tippingCulture.poor.percent = tiers.poor;
    parsedData.tippingCulture.minimum.percent = tiers.min;
    parsedData.tippingCulture.average.percent = tiers.avg;
    parsedData.tippingCulture.high.percent = tiers.high;
  }

  // Sanitize calculations and amounts
  const preTaxSubtotal =
    Number(parsedData.preTaxSubtotal) ||
    Number(parsedData.subtotal) ||
    (clientOcr?.preTaxSubtotal > 0 ? clientOcr.preTaxSubtotal : 0);
  parsedData.preTaxSubtotal = preTaxSubtotal;
  parsedData.subtotal = preTaxSubtotal;

  const surcharges = Array.isArray(parsedData.surcharges) ? parsedData.surcharges : [];
  const totalSurcharges = surcharges.reduce((acc: number, s: any) => acc + (Number(s.amount) || 0), 0);
  parsedData.surcharges = surcharges;
  parsedData.totalSurcharges = totalSurcharges;

  const total = Number(parsedData.total) || preTaxSubtotal;

  // TIP BASIS: Strictly pre-tax subtotal (EXCLUDING tax, EXCLUDING SF Health Surcharges, EXCLUDING auto-gratuity)
  const tipBasisAmount = preTaxSubtotal > 0 ? preTaxSubtotal : total;
  parsedData.tipBasisAmount = tipBasisAmount;

  // Attach calculated amounts to every tier based strictly on tipBasisAmount
  if (parsedData.tippingCulture?.poor) {
    const poorPct = parsedData.tippingCulture.poor.percent;
    parsedData.tippingCulture.poor.amount = Math.round(tipBasisAmount * (poorPct / 100) * 100) / 100;
    parsedData.tippingCulture.poor.totalWithTip = Math.round((total + parsedData.tippingCulture.poor.amount) * 100) / 100;
  }
  if (parsedData.tippingCulture?.minimum) {
    const minPct = parsedData.tippingCulture.minimum.percent;
    parsedData.tippingCulture.minimum.amount = Math.round(tipBasisAmount * (minPct / 100) * 100) / 100;
    parsedData.tippingCulture.minimum.totalWithTip = Math.round((total + parsedData.tippingCulture.minimum.amount) * 100) / 100;
  }
  if (parsedData.tippingCulture?.average) {
    const avgPct = parsedData.tippingCulture.average.percent;
    parsedData.tippingCulture.average.amount = Math.round(tipBasisAmount * (avgPct / 100) * 100) / 100;
    parsedData.tippingCulture.average.totalWithTip = Math.round((total + parsedData.tippingCulture.average.amount) * 100) / 100;
  }
  if (parsedData.tippingCulture?.high) {
    const highPct = parsedData.tippingCulture.high.percent;
    parsedData.tippingCulture.high.amount = Math.round(tipBasisAmount * (highPct / 100) * 100) / 100;
    parsedData.tippingCulture.high.totalWithTip = Math.round((total + parsedData.tippingCulture.high.amount) * 100) / 100;
  }

  return parsedData;
}
