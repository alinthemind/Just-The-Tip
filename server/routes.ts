/**
 * The API: every /api route, shared by the local server (server.ts) and the Vercel function (api/index.ts).
 * Import paths use .js so the file also runs after TypeScript is compiled to plain JavaScript (on Vercel).
 */
import 'dotenv/config';
import express, { Request, Response } from 'express';
import { GoogleGenAI, Type } from '@google/genai';
import { COUNTRY_TIPPING_DATABASE, SERVICE_TYPES, getTippingRuleForCountry } from '../src/data/tippingCulture.js';
import { buildFallbackReceiptData, finalizeScanResult } from '../src/utils/receiptResult.js';

const app = express();
app.use(express.json({ limit: '20mb' }));

// OpenStreetMap's usage policy asks every app to identify itself
const OSM_USER_AGENT = 'JustTheTip/1.0 (+https://justthetiptip.vercel.app)';

// Without a key, the Gemini client goes looking for Google Cloud credentials (which can stall on a host),
// so skip it entirely and use the built-in fallbacks
const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY);

// Shared Gemini client instance
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

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
            'User-Agent': OSM_USER_AGENT,
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
    if (hasGeminiKey) try {
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
4. SERVICE TYPE: serviceType is one of "restaurant" (sit-down meals), "bar" (pubs, bars, lounges where drinks dominate), "cafe" (coffee shops, bakeries, counter service), "taxi" (taxis and rides), "beauty" (hair and nail salons, barbers, spas, massage), "hotel" (room/folio bills). Tip tiers must fit that service in that country (e.g. US salon or taxi 15-20%, US café counter 0-15%; hotel bills 0% since hotel staff get flat tips).
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
    if (!hasGeminiKey || image.startsWith('data:image/svg+xml') || image.includes('<svg') || image.includes('SUBTOTAL')) {
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

    finalizeScanResult(parsedData, clientOcr);

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

// What the server can do beyond the phone: with a Gemini key it can read receipts the phone is unsure of;
// with a Google Maps key it can look up the venue's rating and reviews
const mapsKey = process.env.GOOGLE_MAPS_API_KEY || '';
app.get('/api/config', (_req: Request, res: Response) => {
  // Venue lookup always works: Google Places with a key (ratings, reviews), else OpenStreetMap (free)
  res.json({ ai: hasGeminiKey, places: true, placesProvider: mapsKey ? 'google' : 'osm' });
});

// Google place types to look for nearby, per kind of service (taxis have no venue)
const NEARBY_TYPES: Record<string, string[]> = {
  restaurant: ['restaurant'],
  bar: ['bar', 'pub', 'night_club'],
  cafe: ['cafe', 'coffee_shop', 'bakery'],
  beauty: ['beauty_salon', 'hair_salon', 'nail_salon', 'spa', 'massage'],
  hotel: ['hotel', 'lodging'],
};
const PLACE_FIELDS = [
  'id', 'displayName', 'formattedAddress', 'rating', 'userRatingCount', 'googleMapsUri', 'googleMapsLinks', 'reviews',
  'reviewSummary', 'primaryTypeDisplayName', 'priceLevel', 'editorialSummary', 'currentOpeningHours',
  'regularOpeningHours', 'nationalPhoneNumber', 'websiteUri',
];

// Venue lookup (Google Places API, New): rating, Google's review summary and the latest reviews, plus
// the "write a review" link. Only passes Google's data through; the phone picks out tipping comments,
// deals and happy hours itself.
//   query: the venue as the receipt describes it (name with address or city, a phone number, or an address)
//   near:  a precise phone position at scan time; biases the search tightly, or (with no query) finds the
//          nearest venue of the receipt's kind of service
app.post('/api/venue', async (req: Request, res: Response) => {
  const { query, latitude, longitude, near, serviceType, lang } = req.body || {};
  if (!mapsKey) return osmVenue(req, res);
  const hasQuery = typeof query === 'string' && query.trim().length > 0;
  const nearOk = near && Number.isFinite(near.latitude) && Number.isFinite(near.longitude);
  const nearbyTypes = NEARBY_TYPES[serviceType] || NEARBY_TYPES.restaurant;
  if (!hasQuery && !(nearOk && serviceType !== 'taxi')) return res.status(400).json({ error: 'A search query or position is required' });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const languageCode = typeof lang === 'string' ? lang : 'en';
    const radius = nearOk ? Math.min(250, Math.max(60, Number(near.accuracy) * 2 || 100)) : 5000;
    const center = nearOk ? { latitude: near.latitude, longitude: near.longitude } : { latitude, longitude };
    const hasCenter = nearOk || (Number.isFinite(latitude) && Number.isFinite(longitude));
    const [endpoint, body] = hasQuery
      ? [
          'searchText',
          {
            textQuery: query.trim().slice(0, 200),
            languageCode,
            pageSize: 1,
            ...(hasCenter ? { locationBias: { circle: { center, radius } } } : {}),
          },
        ]
      : [
          'searchNearby',
          {
            includedTypes: nearbyTypes,
            maxResultCount: 1,
            rankPreference: 'DISTANCE',
            languageCode,
            locationRestriction: { circle: { center, radius } },
          },
        ];
    const response = await fetch(`https://places.googleapis.com/v1/places:${endpoint}`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': mapsKey,
        'X-Goog-FieldMask': PLACE_FIELDS.map((f) => `places.${f}`).join(','),
      },
      body: JSON.stringify(body),
    });
    const data: any = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.warn('Places lookup failed:', response.status, data?.error?.message);
      return res.status(502).json({ error: 'Venue lookup failed' });
    }
    const place = data.places?.[0];
    if (!place) return res.json({ found: false });
    res.json({
      found: true,
      source: 'google',
      // Found only by being the closest venue: the app asks the user to check it's the right place
      matchedBy: hasQuery ? 'receipt' : 'location',
      name: place.displayName?.text,
      address: place.formattedAddress,
      rating: place.rating,
      ratingCount: place.userRatingCount,
      mapsUri: place.googleMapsUri,
      reviewsUri: place.googleMapsLinks?.reviewsUri || place.reviewSummary?.reviewsUri || place.googleMapsUri,
      writeReviewUri: place.googleMapsLinks?.writeAReviewUri || `https://search.google.com/local/writereview?placeid=${encodeURIComponent(place.id)}`,
      type: place.primaryTypeDisplayName?.text,
      // PRICE_LEVEL_INEXPENSIVE .. PRICE_LEVEL_VERY_EXPENSIVE -> 1..4
      priceLevel: ['PRICE_LEVEL_INEXPENSIVE', 'PRICE_LEVEL_MODERATE', 'PRICE_LEVEL_EXPENSIVE', 'PRICE_LEVEL_VERY_EXPENSIVE'].indexOf(place.priceLevel) + 1 || undefined,
      about: place.editorialSummary?.text,
      openNow: place.currentOpeningHours?.openNow,
      // Monday first, in the requested language (e.g. "Monday: 11:00 AM – 10:00 PM")
      hours: place.regularOpeningHours?.weekdayDescriptions,
      phone: place.nationalPhoneNumber,
      website: place.websiteUri,
      summary: place.reviewSummary?.text?.text,
      summaryDisclosure: place.reviewSummary?.disclosureText?.text,
      reviews: (place.reviews || []).map((r: any) => ({
        text: r.text?.text || r.originalText?.text || '',
        rating: r.rating,
        author: r.authorAttribution?.displayName,
        authorUri: r.authorAttribution?.uri,
        when: r.relativePublishTimeDescription,
        uri: r.googleMapsUri,
      })),
    });
  } catch (err: any) {
    console.warn('Places lookup error:', err?.message || err);
    res.status(502).json({ error: 'Venue lookup failed' });
  } finally {
    clearTimeout(timeout);
  }
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

// OpenStreetMap place categories per kind of service, for "nearest venue" searches
const OSM_AMENITIES: Record<string, string> = {
  restaurant: 'restaurant|fast_food|food_court',
  bar: 'bar|pub|biergarten|nightclub',
  cafe: 'cafe|ice_cream',
  beauty: '',
  hotel: '',
};

const metersBetween = (a: { lat: number; lon: number }, b: { lat: number; lon: number }) => {
  const rad = Math.PI / 180;
  const x = (b.lon - a.lon) * rad * Math.cos(((a.lat + b.lat) / 2) * rad);
  const y = (b.lat - a.lat) * rad;
  return Math.sqrt(x * x + y * y) * 6371000;
};

/** Whether two venue names are the same place's name ("BLUE BOTTLE COFFEE" vs "Blue Bottle Coffee", "The Red Lion" vs "Red Lion") */
function sameVenueName(a: string, b: string): boolean {
  const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/^the\s+/, '').replace(/[^\p{L}\p{N}]+/gu, '');
  const x = norm(a);
  const y = norm(b);
  return Boolean(x && y) && (x.includes(y) || y.includes(x));
}

/** VenueInfo from OpenStreetMap tags (no ratings or reviews: OSM doesn't have them) */
function osmToVenue(name: string, lat: number, lon: number, tags: Record<string, string>, address: string | undefined, matchedBy: 'receipt' | 'location') {
  const cuisine = tags.cuisine ? tags.cuisine.split(';')[0].replace(/_/g, ' ') : '';
  const kind = (tags.amenity || tags.shop || tags.tourism || tags.leisure || '').replace(/_/g, ' ');
  return {
    found: true,
    source: 'osm',
    matchedBy,
    name,
    address,
    type: [cuisine, kind].filter(Boolean).join(' ').replace(/^\w/, (c) => c.toUpperCase()) || undefined,
    phone: tags.phone || tags['contact:phone'],
    website: tags.website || tags['contact:website'],
    // OpenStreetMap's own notation, e.g. "Mo-Fr 11:00-22:00; Sa 12:00-23:00"
    openingHours: tags.opening_hours,
    mapsUri: `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`,
    reviewsUri: undefined,
    writeReviewUri: undefined,
    reviews: [],
  };
}

/**
 * Free venue lookup on OpenStreetMap: Nominatim search for the receipt's details (biased to the phone's
 * position when known), or Overpass for the nearest venue of that kind when the receipt names nothing.
 */
async function osmVenue(req: Request, res: Response) {
  const { query, clues = {}, near, serviceType, lang } = req.body || {};
  const hasQuery = typeof query === 'string' && query.trim().length > 0;
  const nearOk = near && Number.isFinite(near.latitude) && Number.isFinite(near.longitude);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);
  const text = (v: unknown) => (typeof v === 'string' ? v.trim().slice(0, 120) : '');
  const headers = { 'User-Agent': OSM_USER_AGENT, 'Accept-Language': typeof lang === 'string' ? lang : 'en' };
  try {
    if (hasQuery) {
      const nominatimAll = async (params: Record<string, string>, limit = 1): Promise<any[]> => {
        const qs = new URLSearchParams({ ...params, format: 'jsonv2', limit: String(limit), extratags: '1', addressdetails: '0' });
        const r = await fetch(`https://nominatim.openstreetmap.org/search?${qs}`, { headers, signal: controller.signal });
        return r.ok ? await r.json() : [];
      };
      const nominatim = async (params: Record<string, string>) => (await nominatimAll(params))[0];
      const isVenue = (hit: any) => hit && !['highway', 'place', 'boundary', 'landuse', 'building'].includes(hit.category);
      const fromNominatim = (hit: any) => {
        const name = hit.name || hit.display_name.split(',')[0];
        const address = hit.display_name.split(',').slice(hit.name ? 1 : 0, 5).join(',').trim();
        return osmToVenue(name, Number(hit.lat), Number(hit.lon), { ...(hit.extratags || {}), [hit.category]: hit.type }, address, 'receipt');
      };
      const name = text(clues.name);
      const street = text(clues.address);

      // With a street address: find that spot, then the business with that name right there. First the
      // fast search (name + city, the match nearest the address within 250 m), then Overpass within 300 m
      // (businesses only, kept short: the public server can be slow in dense cities). A chain's other branch
      // elsewhere would show the wrong hours, so no match, or no answer in time, means "not found".
      if (name && street && /\d/.test(street)) {
        const spot = await nominatim({ q: [street, text(clues.city)].filter((v) => v && !street.includes(v)).join(', ') || street });
        // Often the address search lands on the business itself: done in one request
        if (isVenue(spot) && sameVenueName(spot.name || '', name)) return res.json(fromNominatim(spot));
        if (spot) {
          const here = { lat: Number(spot.lat), lon: Number(spot.lon) };
          await new Promise((r) => setTimeout(r, 1000)); // Nominatim: one request per second
          const sameName = await nominatimAll({ q: [name, text(clues.city)].filter(Boolean).join(' ') }, 10);
          const closest = sameName
            .filter(isVenue)
            .map((h) => ({ h, m: metersBetween(here, { lat: Number(h.lat), lon: Number(h.lon) }) }))
            .sort((a, b) => a.m - b.m)[0];
          if (closest && closest.m <= 250 && sameVenueName(closest.h.name || '', name)) return res.json(fromNominatim(closest.h));

          const n = name.replace(/[\\"^$.*+?()[\]{}|]/g, '\\$&');
          const around = `around:300,${spot.lat},${spot.lon}`;
          const ql = `[out:json][timeout:3];(nwr(${around})["amenity"]["name"~"${n}",i];nwr(${around})["shop"]["name"~"${n}",i];nwr(${around})["tourism"]["name"~"${n}",i];);out center tags 1;`;
          const quick = new AbortController();
          const quickTimer = setTimeout(() => quick.abort(), 3500);
          try {
            const r = await fetch('https://overpass-api.de/api/interpreter', {
              method: 'POST',
              headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' },
              body: `data=${encodeURIComponent(ql)}`,
              signal: quick.signal,
            });
            const el = (r.ok ? (await r.json()).elements || [] : [])[0];
            if (!el) return res.json({ found: false });
            const tags = el.tags || {};
            const address = [tags['addr:housenumber'], tags['addr:street'], tags['addr:city']].filter(Boolean).join(' ') || street;
            return res.json(osmToVenue(tags.name, el.lat ?? el.center?.lat, el.lon ?? el.center?.lon, tags, address, 'receipt'));
          } catch {
            return res.json({ found: false });
          } finally {
            clearTimeout(quickTimer);
          }
        }
      }

      // Otherwise the name with the city, then the full query (Nominatim allows one request per second)
      const attempts = [...new Set([[name, text(clues.city)].filter(Boolean).join(' '), query.trim().slice(0, 200)])].filter((q) => q.length > 2);
      for (const [i, q] of attempts.entries()) {
        if (i > 0) await new Promise((r) => setTimeout(r, 1000));
        const params: Record<string, string> = { q };
        if (nearOk) {
          const d = 0.02; // ~2 km box around the phone, preferred but not required
          params.viewbox = `${near.longitude - d},${near.latitude + d},${near.longitude + d},${near.latitude - d}`;
        }
        const hit = await nominatim(params);
        if (isVenue(hit)) return res.json(fromNominatim(hit));
      }
      return res.json({ found: false });
    }
    if (!nearOk || serviceType === 'taxi') return res.status(400).json({ error: 'A search query or position is required' });
    const radius = Math.min(250, Math.max(60, Number(near.accuracy) * 2 || 100));
    const filter =
      serviceType === 'beauty'
        ? '["shop"~"^(beauty|hairdresser|massage|cosmetics)$"]'
        : serviceType === 'hotel'
          ? '["tourism"~"^(hotel|hostel|guest_house|motel)$"]'
          : `["amenity"~"^(${OSM_AMENITIES[serviceType] || OSM_AMENITIES.restaurant})$"]`;
    const ql = `[out:json][timeout:5];nwr(around:${radius},${near.latitude},${near.longitude})${filter}["name"];out center tags 15;`;
    const r = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(ql)}`,
      signal: controller.signal,
    });
    const data: any = r.ok ? await r.json() : { elements: [] };
    const here = { lat: near.latitude, lon: near.longitude };
    const nearest = (data.elements || [])
      .map((e: any) => ({ e, lat: e.lat ?? e.center?.lat, lon: e.lon ?? e.center?.lon }))
      .filter((x: any) => Number.isFinite(x.lat))
      .sort((a: any, b: any) => metersBetween(here, a) - metersBetween(here, b))[0];
    if (!nearest) return res.json({ found: false });
    const t = nearest.e.tags || {};
    const address = [t['addr:housenumber'], t['addr:street'], t['addr:city']].filter(Boolean).join(' ') || undefined;
    return res.json(osmToVenue(t.name, nearest.lat, nearest.lon, t, address, 'location'));
  } catch (err: any) {
    console.warn('OpenStreetMap lookup error:', err?.message || err);
    res.status(502).json({ error: 'Venue lookup failed' });
  } finally {
    clearTimeout(timeout);
  }
}

export default app;
