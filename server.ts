import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import os from 'os';
import http from 'http';
import https from 'https';
import net from 'net';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import { COUNTRY_TIPPING_DATABASE, DEFAULT_TIPPING_RULE, SERVICE_TYPES, ServiceType, getServiceTiers, getTippingRuleForCountry } from './src/data/tippingCulture.ts';
import { SAMPLE_RECEIPTS } from './src/data/sampleReceipts.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);

app.use(express.json({ limit: '20mb' }));

// Dev only: a phone opening http://<LAN-IP>:port is sent to https so the browser allows location access.
// Proxied hosts (Google AI Studio, production) never match: they use public hostnames and terminate TLS upstream.
app.use((req, res, next) => {
  if (
    process.env.NODE_ENV !== 'production' &&
    !(req.socket as any).encrypted &&
    req.method === 'GET' &&
    fs.existsSync(path.resolve(__dirname, '.cert', 'cert.pem'))
  ) {
    const host = (req.headers.host || '').replace(/:\d+$/, '');
    if (isPrivateLanHost(host)) {
      return res.redirect(307, `https://${req.headers.host}${req.originalUrl}`);
    }
  }
  next();
});

// Shared Gemini client instance
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

function buildFallbackReceiptData(
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
  let preTaxSubtotal = 48.0;
  let tax = 4.25;
  let surcharges: Array<{ name: string; amount: number; isHealthOrMandate?: boolean }> = [];
  let serviceCharge = 0;
  let serviceChargeIncluded = false;
  let serviceChargeDesc = '';
  let items = [
    { name: 'House Special Entree', qty: 2, price: 34.0 },
    { name: 'Craft Beverage / Wine', qty: 2, price: 10.0 },
    { name: 'Side / Dessert', qty: 1, price: 4.0 },
  ];

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
      if (subMatch && preTaxSubtotal === 48.0) preTaxSubtotal = parseFloat(subMatch[1]) || preTaxSubtotal;

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
      if (taxMatch && tax === 4.25) tax = parseFloat(taxMatch[1]) || tax;

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
  const total = Math.round((preTaxSubtotal + tax + totalSurcharges + serviceCharge) * 100) / 100;

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
  };
}

// Reverse geocode route
app.post('/api/reverse-geocode', async (req: Request, res: Response) => {
  try {
    const { latitude, longitude } = req.body;
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return res.status(400).json({ error: 'Latitude and longitude are required numbers' });
    }

    // Try Nominatim with a fast timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'GlobalTip-App/1.0 (contact: info@globaltip.local)',
            'Accept-Language': 'en',
          },
          signal: controller.signal,
        }
      );
      if (response.ok) {
        const data = await response.json();
        const address = data.address || {};
        let countryCode = (address.country_code || '').toUpperCase();
        let countryName = address.country || '';

        // Nominatim reports Hong Kong/Macau as country "cn"; the SAR is only in ISO3166-2-lvl3 (e.g. "CN-HK")
        const sarCode = String(address['ISO3166-2-lvl3'] || '').match(/^CN-([A-Z]{2})$/)?.[1];
        if (sarCode && COUNTRY_TIPPING_DATABASE[sarCode]) {
          countryCode = sarCode;
          countryName = COUNTRY_TIPPING_DATABASE[sarCode].countryName;
        }
        const city =
          address.city ||
          address.town ||
          address.village ||
          address.municipality ||
          address.county ||
          address.state ||
          '';

        const rule = getTippingRuleForCountry(countryCode);

        return res.json({
          countryCode: countryCode || rule.countryCode,
          countryName: countryName || rule.countryName,
          city,
          state: address.state || '',
          flag: rule.flag,
          currencyCode: rule.currencyCode,
          currencySymbol: rule.currencySymbol,
        });
      }
    } catch (nomErr) {
      // Nominatim failed or timed out, fall back to Gemini
      console.warn('Nominatim reverse geocode failed, using AI fallback:', nomErr);
    } finally {
      clearTimeout(timeout);
    }

    // AI Fallback for reverse geocoding coordinates
    try {
      const geoResponse = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Identify the country code (ISO 2-letter, e.g. US, FR, JP, GB), country name, and nearest city for coordinates: Latitude ${latitude}, Longitude ${longitude}. Return JSON strictly matching: {"countryCode": "US", "countryName": "United States", "city": "New York"}`,
        config: {
          responseMimeType: 'application/json',
        },
      });
      const parsed = JSON.parse(geoResponse.text || '{}');
      const countryCode = (parsed.countryCode || 'US').toUpperCase();
      const rule = getTippingRuleForCountry(countryCode);
      return res.json({
        countryCode: countryCode,
        countryName: parsed.countryName || rule.countryName,
        city: parsed.city || '',
        flag: rule.flag,
        currencyCode: rule.currencyCode,
        currencySymbol: rule.currencySymbol,
      });
    } catch (aiErr: any) {
      console.warn('AI reverse geocode failed, defaulting to US:', aiErr?.message || aiErr);
      return res.json({
        countryCode: 'US',
        countryName: 'United States',
        city: '',
        flag: '🇺🇸',
        currencyCode: 'USD',
        currencySymbol: '$',
      });
    }
  } catch (error: any) {
    console.error('Reverse geocode error:', error);
    res.status(500).json({ error: error?.message || 'Geocoding failed' });
  }
});

// Network IP Geolocation route (instant fallback when device GPS is blocked/denied in browser)
app.get('/api/ip-location', async (req: Request, res: Response) => {
  try {
    const forwarded = req.headers['x-forwarded-for'];
    let clientIp = '';
    if (typeof forwarded === 'string') {
      clientIp = forwarded.split(',')[0].trim();
    } else if (Array.isArray(forwarded) && forwarded[0]) {
      clientIp = forwarded[0].trim();
    } else {
      clientIp = req.socket.remoteAddress || '';
    }

    // Node reports IPv4 peers as IPv4-mapped IPv6 (e.g. "::ffff:127.0.0.1")
    clientIp = clientIp.replace(/^::ffff:/, '');

    const isLocalhost =
      !clientIp ||
      clientIp === '::1' ||
      clientIp.startsWith('127.') ||
      clientIp.startsWith('192.168.') ||
      clientIp.startsWith('10.') ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(clientIp) ||
      /^f[cd]/i.test(clientIp) ||
      /^fe80:/i.test(clientIp);

    const targetUrl = isLocalhost ? 'https://ipwho.is/' : `https://ipwho.is/${clientIp}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const ipRes = await fetch(targetUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (ipRes.ok) {
      const data = await ipRes.json();
      if (data && data.success) {
        const countryCode = (data.country_code || 'US').toUpperCase();
        const rule = getTippingRuleForCountry(countryCode);
        return res.json({
          latitude: data.latitude,
          longitude: data.longitude,
          countryCode: countryCode,
          countryName: data.country || rule.countryName,
          city: data.city || rule.countryName,
          state: data.region || '',
          flag: rule.flag,
          currencyCode: rule.currencyCode,
          currencySymbol: rule.currencySymbol,
          isGps: false,
          source: 'ip',
        });
      }
    }

    // Default fallback
    return res.json({
      countryCode: 'US',
      countryName: 'United States',
      city: 'United States',
      flag: '🇺🇸',
      currencyCode: 'USD',
      currencySymbol: '$',
      isGps: false,
      source: 'default',
    });
  } catch (err: any) {
    console.warn('IP location fetch fallback warning:', err?.message || err);
    return res.json({
      countryCode: 'US',
      countryName: 'United States',
      city: 'United States',
      flag: '🇺🇸',
      currencyCode: 'USD',
      currencySymbol: '$',
      isGps: false,
      source: 'default',
    });
  }
});

// Receipt OCR & Tipping Analysis route
app.post('/api/scan-receipt', async (req: Request, res: Response) => {
  try {
    const {
      image,
      mimeType = 'image/jpeg',
      latitude,
      longitude,
      countryCode,
      cityName,
      countryName,
      clientOcr,
    } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'Image base64 data is required' });
    }

    // Normalize base64 string
    let cleanBase64 = image;
    let detectedMime = mimeType;
    if (image.startsWith('data:')) {
      const matches = image.match(/^data:([a-zA-Z0-9/+-]+);base64,(.+)$/);
      if (matches) {
        detectedMime = matches[1];
        cleanBase64 = matches[2];
      } else {
        // SVG or plain base64
        const commaIdx = image.indexOf(',');
        if (commaIdx !== -1) {
          cleanBase64 = image.substring(commaIdx + 1);
        }
      }
    }

    // Prepare context for Gemini
    const locationContext = [
      clientOcr?.city ? `Receipt Text City: ${clientOcr.city}` : null,
      cityName ? `GPS City: ${cityName}` : null,
      countryCode ? `Country Code: ${countryCode}` : null,
      countryName ? `Country: ${countryName}` : null,
      typeof latitude === 'number' && typeof longitude === 'number' ? `GPS: ${latitude}, ${longitude}` : null,
    ]
      .filter(Boolean)
      .join(', ');

    const prompt = `You are a world-class receipt OCR extractor and international tipping etiquette expert.

Analyze this receipt image and extract structured data.
Detected Location Context: ${locationContext || 'Unknown - infer from receipt address/currency'}.

CRITICAL REQUIREMENTS:
1. RESTAURANT LOCATION PRIORITY:
   - Extract the restaurant name, address, printed city/state/country on the receipt FIRST (e.g. Hong Kong, Chicago, IL, San Francisco, CA, Paris, Tokyo).
   - If the receipt shows Hong Kong (e.g. HKD, HK$, Central, Kowloon, Wan Chai, TST, Causeway Bay, or +852), standard tip is NOT 18%! Most Hong Kong sit-down restaurants add a 10% Service Charge (+10% 加一服務費). Additional tip is 0% to round up coins.
2. Extract all itemized lines (name, quantity, total line price).
3. Extract financial components:
   - preTaxSubtotal: Pure food and beverage pre-tax subtotal. EXCLUDE all taxes, and EXCLUDE health surcharges or mandate fees!
   - surcharges: Array of any fees/surcharges, such as San Francisco Health Mandate, Healthy SF, employee wellness fee, kitchen appreciation fee. Each with { name, amount, isHealthOrMandate }.
   - tax: Tax or VAT amount (0 if none or already included).
   - serviceCharge: Any auto-gratuity or mandatory service charge ALREADY included on the bill (e.g. 10% in Hong Kong).
   - total: Final amount due printed on receipt.
   - currencyCode: ISO 3-letter currency code (e.g. HKD, USD, EUR, GBP, JPY, CAD, MXN, AUD).
   - currencySymbol: Symbol (e.g. HK$, $, €, £, ¥, CA$).
4. SERVICE TYPE: serviceType is one of "restaurant" (sit-down meals), "bar" (pubs, bars, lounges where drinks dominate), "cafe" (coffee shops, bakeries, counter service), "taxi" (taxis and rides), "beauty" (hair and nail salons, barbers, spas, massage). Tip tiers must fit that service in that country (e.g. US salon or taxi 15-20%, US café counter 0-15%).
5. TIPPING TIERS (Provide 4 distinct tiers strictly based on local culture and the service type):
   - poor: { percent: number, label: string, description: string } (Baseline tip for sub-par/poor service, e.g. 0% in HK/Europe/Asia, 10% in US/Canada).
   - minimum: { percent: number, label: string, description: string } (Basic acceptable service).
   - average: { percent: number, label: string, description: string } (Standard customary etiquette, e.g. 0% / round up change in Hong Kong because 10% service charge is already added).
   - high: { percent: number, label: string, description: string } (Generous / exceptional service).
   - isTippingCustomary: boolean
   - isTippingDiscouraged: boolean
   - localEtiquetteNotes: Array of cultural advice.
   - detectedCity: City printed on receipt if visible.
   - detectedCountry: { code: string, name: string, flag: string }

Return strictly valid JSON.`;

    let parsedData: any = null;

    // Check if the image matches an SVG or demo sample right away
    if (image.startsWith('data:image/svg+xml') || image.includes('<svg') || image.includes('SUBTOTAL')) {
      parsedData = buildFallbackReceiptData(countryCode, cityName, countryName, image, clientOcr);
    } else {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType: detectedMime.includes('svg') ? 'image/png' : detectedMime,
                  data: cleanBase64,
                },
              },
              {
                text: prompt,
              },
            ],
          },
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                merchantName: { type: Type.STRING },
                serviceType: { type: Type.STRING, enum: [...SERVICE_TYPES] },
                date: { type: Type.STRING },
                address: { type: Type.STRING },
                city: { type: Type.STRING },
                state: { type: Type.STRING },
                currencyCode: { type: Type.STRING },
                currencySymbol: { type: Type.STRING },
                preTaxSubtotal: { type: Type.NUMBER },
                subtotal: { type: Type.NUMBER },
                tax: { type: Type.NUMBER },
                surcharges: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      amount: { type: Type.NUMBER },
                      isHealthOrMandate: { type: Type.BOOLEAN },
                    },
                    required: ['name', 'amount'],
                  },
                },
                serviceCharge: { type: Type.NUMBER },
                serviceChargeIncluded: { type: Type.BOOLEAN },
                serviceChargeDescription: { type: Type.STRING },
                total: { type: Type.NUMBER },
                items: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      qty: { type: Type.NUMBER },
                      price: { type: Type.NUMBER },
                    },
                    required: ['name', 'price'],
                  },
                },
                detectedCountry: {
                  type: Type.OBJECT,
                  properties: {
                    code: { type: Type.STRING },
                    name: { type: Type.STRING },
                    flag: { type: Type.STRING },
                  },
                  required: ['code', 'name'],
                },
                tippingCulture: {
                  type: Type.OBJECT,
                  properties: {
                    isTippingCustomary: { type: Type.BOOLEAN },
                    isTippingDiscouraged: { type: Type.BOOLEAN },
                    tippingBasis: { type: Type.STRING },
                    alreadyIncludedWarning: { type: Type.STRING },
                    poor: {
                      type: Type.OBJECT,
                      properties: {
                        percent: { type: Type.NUMBER },
                        label: { type: Type.STRING },
                        description: { type: Type.STRING },
                      },
                      required: ['percent', 'label', 'description'],
                    },
                    minimum: {
                      type: Type.OBJECT,
                      properties: {
                        percent: { type: Type.NUMBER },
                        label: { type: Type.STRING },
                        description: { type: Type.STRING },
                      },
                      required: ['percent', 'label', 'description'],
                    },
                    average: {
                      type: Type.OBJECT,
                      properties: {
                        percent: { type: Type.NUMBER },
                        label: { type: Type.STRING },
                        description: { type: Type.STRING },
                      },
                      required: ['percent', 'label', 'description'],
                    },
                    high: {
                      type: Type.OBJECT,
                      properties: {
                        percent: { type: Type.NUMBER },
                        label: { type: Type.STRING },
                        description: { type: Type.STRING },
                      },
                      required: ['percent', 'label', 'description'],
                    },
                    localEtiquetteNotes: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                    paymentAdvice: { type: Type.STRING },
                  },
                  required: ['isTippingCustomary', 'poor', 'minimum', 'average', 'high', 'localEtiquetteNotes'],
                },
              },
              required: [
                'merchantName',
                'currencyCode',
                'currencySymbol',
                'total',
                'tippingCulture',
              ],
            },
          },
        });

        const text = response.text;
        if (text) {
          parsedData = JSON.parse(text);
        }
      } catch (geminiError: any) {
        console.warn('Gemini OCR unavailable or permission denied:', geminiError?.message || geminiError);
        parsedData = buildFallbackReceiptData(countryCode, cityName, countryName, image, clientOcr);
        parsedData.aiNotice =
          'Google Cloud Gemini API key has project restrictions. Calculations computed using device GPS tipping etiquette rules.';
      }
    }

    if (!parsedData) {
      parsedData = buildFallbackReceiptData(countryCode, cityName, countryName, image, clientOcr);
    }

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

    res.json(parsedData);
  } catch (error: any) {
    console.error('Scan receipt error:', error);
    res.status(500).json({
      error: error?.message || 'Failed to scan receipt image',
    });
  }
});

// Culture Lookup & Etiquette route
app.get('/api/culture/:countryCode', (req: Request, res: Response) => {
  const code = (req.params.countryCode || '').toUpperCase();
  const rule = getTippingRuleForCountry(code);
  res.json(rule);
});

// List all supported countries
app.get('/api/countries', (_req: Request, res: Response) => {
  const countries = Object.values(COUNTRY_TIPPING_DATABASE).map((c) => ({
    countryCode: c.countryCode,
    countryName: c.countryName,
    flag: c.flag,
    currencyCode: c.currencyCode,
    currencySymbol: c.currencySymbol,
    minPercent: c.minPercent,
    avgPercent: c.avgPercent,
    highPercent: c.highPercent,
    isTippingCustomary: c.isTippingCustomary,
    isTippingDiscouraged: c.isTippingDiscouraged,
  }));
  res.json(countries);
});

// Malformed or oversized request bodies: answer in JSON so the client can show a real message
app.use('/api', (err: any, _req: Request, res: Response, next: (err?: any) => void) => {
  if (!err) return next();
  const status = err.status || err.statusCode || 500;
  console.warn('API request error:', err.type || err.message);
  res.status(status).json({
    error:
      err.type === 'entity.too.large'
        ? 'This photo is too large. Please try a smaller image.'
        : err.message || 'Request failed',
  });
});

// Unknown API routes should not fall through to the SPA's index.html
app.use('/api', (_req: Request, res: Response) => {
  res.status(404).json({ error: 'Unknown API route' });
});

/**
 * Phones only expose GPS to secure origins (https, or localhost). In development the server answers
 * both http and https on the same port, using a self-signed cert made with openssl, and sends phones
 * that open the LAN address over http to the https version. The desktop keeps http://localhost.
 */
function lanAddresses(): string[] {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter((i): i is os.NetworkInterfaceInfo => !!i && i.family === 'IPv4' && !i.internal)
    .map((i) => i.address);
}

function loadDevCert(): { key: Buffer; cert: Buffer } | null {
  try {
    const dir = path.resolve(__dirname, '.cert');
    const keyPath = path.join(dir, 'key.pem');
    const certPath = path.join(dir, 'cert.pem');
    const ipsPath = path.join(dir, 'ips.txt');
    const ips = lanAddresses().sort().join(',');
    // Regenerate when the LAN address changes, so the cert names the address the phone opens
    const stale = !fs.existsSync(certPath) || !fs.existsSync(ipsPath) || fs.readFileSync(ipsPath, 'utf8') !== ips;
    if (stale) {
      fs.mkdirSync(dir, { recursive: true });
      const san = ['DNS:localhost', 'IP:127.0.0.1', ...lanAddresses().map((ip) => `IP:${ip}`)].join(',');
      execFileSync('openssl', [
        'req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '825',
        '-keyout', keyPath, '-out', certPath,
        '-subj', '/CN=Just the Tip (dev)',
        '-addext', `subjectAltName=${san}`,
      ], { stdio: 'ignore' });
      fs.writeFileSync(ipsPath, ips);
    }
    return { key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) };
  } catch (err: any) {
    console.warn('Could not create a dev https certificate (is openssl installed?); serving http only.', err?.message || err);
    return null;
  }
}

const isPrivateLanHost = (host: string) =>
  /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host) || host.endsWith('.local');

// Vite middleware or production static files
async function setupVite() {
  const isProduction = process.env.NODE_ENV === 'production';
  const tls = isProduction ? null : loadDevCert();
  const httpServer = http.createServer(app);
  const httpsServer = tls ? https.createServer(tls, app) : null;

  if (isProduction) {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    // HMR runs on the page's own port (ws:// or wss://); http upgrades are handed to the same handler
    const hmrServer = httpsServer || httpServer;
    if (httpsServer) {
      httpServer.on('upgrade', (req, socket, head) => httpsServer.emit('upgrade', req, socket, head));
    }
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        ...(process.env.DISABLE_HMR !== 'true' ? { ws: { server: hmrServer } } : {}),
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  // One port for both protocols: a TLS handshake starts with byte 0x16, anything else is plain http
  const listener = httpsServer
    ? net.createServer((socket) => {
        socket.once('data', (firstChunk) => {
          socket.pause();
          socket.unshift(firstChunk);
          (firstChunk[0] === 0x16 ? httpsServer : httpServer).emit('connection', socket);
          process.nextTick(() => socket.resume());
        });
        socket.on('error', () => socket.destroy());
      })
    : httpServer;

  listener.listen(port, '0.0.0.0', () => {
    console.log(`GlobalTip Server running at http://localhost:${port}`);
    for (const ip of lanAddresses()) {
      console.log(`  On your phone (same Wi-Fi): ${httpsServer ? 'https' : 'http'}://${ip}:${port}`);
    }
    if (httpsServer) {
      console.log('  The phone shows a certificate warning once (self-signed); accept it to allow location access.');
    }
  });
}

setupVite().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
