import { ReceiptItem, ReceiptSurcharge, ScannedReceiptData } from '../types';
import { getTippingRuleForCountry, ServiceType } from '../data/tippingCulture';

export interface ParsedReceiptTextResult {
  merchantName?: string;
  city?: string;
  state?: string;
  countryCode?: string;
  preTaxSubtotal: number;
  tax: number;
  surcharges: ReceiptSurcharge[];
  totalSurcharges: number;
  serviceCharge: number;
  serviceChargeIncluded: boolean;
  serviceChargeDescription?: string;
  total: number;
  items: ReceiptItem[];
  serviceType: ServiceType;
  rawText?: string;
}

// Keyword evidence for each kind of business; restaurant is the default when nothing stands out
const SERVICE_PATTERNS: Record<Exclude<ServiceType, 'restaurant'>, RegExp> = {
  beauty: /\b(salon|spa|massage|manicure|pedicure|mani|pedi|nails?|gel\s*polish|haircut|hair\s*cut|blow\s*dry|blowout|barber|stylist|facial|waxing|wax|lash(es)?|brows?|colou?r\s*treatment|highlights|keratin|thai\s*massage|reflexology|hammam)\b|美容|美髮|按摩|理髮|ネイル|マッサージ|미용|네일/gi,
  taxi: /\b(taxi|cab|fare|meter(ed)?|pick\s*-?up|drop\s*-?off|trip\s*(fare|total)|ride|uber|lyft|grab|bolt|didi|mileage|km|miles|driver\s*id|medallion)\b|的士|計程車|出租车|タクシー|택시/gi,
  cafe: /\b(caf[eé]|coffee|espresso|latte|cappuccino|americano|macchiato|mocha|flat\s*white|cold\s*brew|frappuccino|tea\s*latte|matcha|croissant|muffin|bagel|pastry|bakery|starbucks|dunkin|tim\s*hortons|costa)\b|咖啡|カフェ|커피/gi,
  bar: /\b(bar|pub|tavern|brewery|taproom|lounge|saloon|cocktails?|pint|draft|draught|ipa|lager|stout|ale|shots?|happy\s*hour|bar\s*tab|tab\s*#)\b|酒吧|居酒屋|バー|술집/gi,
};
// Evidence that it is a sit-down meal, which outweighs a few drink or coffee lines
const RESTAURANT_PATTERN = /\b(restaurant|ristorante|trattoria|bistro|brasserie|steakhouse|grill|kitchen|diner|eatery|entr[eé]e|appetizer|starter|main\s*course|dessert|table\s*#?\s*\d+|guests?|covers?|server|dine\s*-?in|steak|burger|pasta|pizza|salad|soup|sushi|ramen|dim\s*sum)\b|餐廳|餐厅|レストラン|식당/gi;

export function detectServiceType(text: string): ServiceType {
  if (!text) return 'restaurant';
  const count = (re: RegExp) => (text.match(re) || []).length;
  const beauty = count(SERVICE_PATTERNS.beauty);
  const taxi = count(SERVICE_PATTERNS.taxi);
  const cafe = count(SERVICE_PATTERNS.cafe);
  const bar = count(SERVICE_PATTERNS.bar);
  const meal = count(RESTAURANT_PATTERN);

  // Salons and rides almost never share vocabulary with food, so a couple of hits is enough
  if (beauty >= 2 && beauty > meal) return 'beauty';
  if (taxi >= 2 && taxi > meal + cafe) return 'taxi';
  // Restaurants often have a bar or serve coffee, so cafés and bars need to clearly outweigh meal evidence
  if (cafe >= 2 && cafe > meal * 2 && cafe >= bar) return 'cafe';
  if (bar >= 2 && bar > meal * 2) return 'bar';
  return 'restaurant';
}

const CITY_PATTERNS: Array<{ regex: RegExp; city: string; state: string; countryCode: string }> = [
  { regex: /\b(hong\s*kong|kowloon|central|tsim\s*sha\s*tsui|tst|causeway\s*bay|wan\s*chai|mong\s*kok|admiralty|sheung\s*wan|lan\s*kwai\s*fong|hkd)\b|加一|服務費/i, city: 'Hong Kong', state: '', countryCode: 'HK' },
  { regex: /\b(chicago)\b/i, city: 'Chicago', state: 'IL', countryCode: 'US' },
  { regex: /\b(san\s*francisco|sf)\b/i, city: 'San Francisco', state: 'CA', countryCode: 'US' },
  { regex: /\b(new\s*york|nyc|manhattan|brooklyn)\b/i, city: 'New York', state: 'NY', countryCode: 'US' },
  { regex: /\b(los\s*angeles)\b|\bl\.a\./i, city: 'Los Angeles', state: 'CA', countryCode: 'US' },
  { regex: /\b(austin)\b/i, city: 'Austin', state: 'TX', countryCode: 'US' },
  { regex: /\b(seattle)\b/i, city: 'Seattle', state: 'WA', countryCode: 'US' },
  { regex: /\b(boston)\b/i, city: 'Boston', state: 'MA', countryCode: 'US' },
  { regex: /\b(miami)\b/i, city: 'Miami', state: 'FL', countryCode: 'US' },
  { regex: /\b(denver)\b/i, city: 'Denver', state: 'CO', countryCode: 'US' },
  { regex: /\b(las\s*vegas)\b/i, city: 'Las Vegas', state: 'NV', countryCode: 'US' },
  { regex: /\b(london)\b/i, city: 'London', state: '', countryCode: 'GB' },
  { regex: /\b(paris)\b/i, city: 'Paris', state: '', countryCode: 'FR' },
  { regex: /\b(tokyo)\b/i, city: 'Tokyo', state: '', countryCode: 'JP' },
  { regex: /\b(toronto)\b/i, city: 'Toronto', state: 'ON', countryCode: 'CA' },
  { regex: /\b(vancouver)\b/i, city: 'Vancouver', state: 'BC', countryCode: 'CA' },
];

export function parseReceiptText(text: string): ParsedReceiptTextResult {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  let merchantName = lines[0] || 'Restaurant Bill';
  let detectedCity = '';
  let detectedState = '';
  let detectedCountry = '';

  // 1. Detect City / Location from receipt text
  for (const pattern of CITY_PATTERNS) {
    if (pattern.regex.test(text)) {
      detectedCity = pattern.city;
      detectedState = pattern.state;
      detectedCountry = pattern.countryCode;
      break;
    }
  }

  // Check state zip patterns e.g. "Chicago, IL 60611" or "IL 60654"
  const ilZipMatch = text.match(/\b(IL|Illinois)\s*(60\d{3})\b/i);
  if (ilZipMatch && !detectedCity) {
    detectedCity = 'Chicago';
    detectedState = 'IL';
    detectedCountry = 'US';
  }
  const caZipMatch = text.match(/\b(CA|California)\s*(941\d{2})\b/i);
  if (caZipMatch && !detectedCity) {
    detectedCity = 'San Francisco';
    detectedState = 'CA';
    detectedCountry = 'US';
  }

  // 2. Detect numbers and lines
  let preTaxSubtotal = 0;
  let tax = 0;
  let total = 0;
  let serviceCharge = 0;
  let serviceChargeIncluded = false;
  let serviceChargeDescription = '';
  const surcharges: ReceiptSurcharge[] = [];

  const items: ReceiptItem[] = [];

  // Helper to extract money float from a string line
  const extractMoney = (line: string): number | null => {
    // Look for numbers like 14.50, $14.50, 1,234.50 or ¥12,400
    const matches = line.match(/[$€£¥]?\s*((?:[0-9]{1,3}(?:,[0-9]{3})+|[0-9]+)\.[0-9]{2})\b/);
    if (matches) {
      return parseFloat(matches[1].replace(/,/g, ''));
    }
    const intMatch = line.match(/[$€£¥]\s*([0-9]{1,3}(?:,[0-9]{3})+|[0-9]+)\b/);
    if (intMatch) {
      return parseFloat(intMatch[1].replace(/,/g, ''));
    }
    return null;
  };

  for (const line of lines) {
    const money = extractMoney(line);

    // San Francisco Health Mandate / Health Surcharges
    // e.g. "SF Mandate 5% $3.40", "SF Health 4%", "Health Surcharge", "Healthy SF"
    if (
      /\b(sf\s*mandate|healthy\s*sf|health\s*surcharge|sf\s*health|san\s*francisco\s*health|wellness\s*fee|employee\s*health)\b/i.test(
        line
      )
    ) {
      const amount = money || 0;
      surcharges.push({
        name: 'San Francisco Health Mandate / Surcharge',
        amount,
        isHealthOrMandate: true,
      });
      continue;
    }

    // Kitchen Appreciation / Back of House Surcharges
    if (/\b(kitchen\s*appreciation|boh\s*fee|kitchen\s*surcharge|culinary\s*fee)\b/i.test(line)) {
      const amount = money || 0;
      surcharges.push({
        name: 'Kitchen / Back of House Surcharge',
        amount,
        isHealthOrMandate: false,
      });
      continue;
    }

    // Auto Gratuity / Service charge
    if (/\b(auto\s*gratuity|service\s*charge|discretionary\s*service|coperto|10%\s*svc|10%\s*sc)\b|加一|服務費|\+10%/i.test(line)) {
      const amount = money || 0;
      serviceCharge += amount;
      serviceChargeIncluded = true;
      serviceChargeDescription = line || '10% Service Charge (+10% 加一服務費)';
      continue;
    }

    // Subtotal
    if (/\b(subtotal|sub\s*total|food\/bev\s*subtotal)\b/i.test(line)) {
      if (money !== null) {
        preTaxSubtotal = money;
      }
      continue;
    }

    // Tax
    if (/\b(tax|sales\s*tax|vat|tva|gst|hst)\b/i.test(line)) {
      if (money !== null && tax === 0) {
        tax = money;
      }
      continue;
    }

    // Grand Total
    if (/\b(total|amount\s*due|balance\s*due|grand\s*total)\b/i.test(line) && !/subtotal/i.test(line)) {
      if (money !== null) {
        total = money;
      }
      continue;
    }

    // Items line parsing
    if (money !== null && items.length < 15) {
      // Clean item name
      const cleanName = line.replace(/[$€£¥]?\s*[0-9][0-9,]*\.[0-9]{2}.*$/, '').trim();
      if (cleanName.length > 2 && !/subtotal|tax|total|tip|visa|mastercard|cash|change/i.test(cleanName)) {
        items.push({
          name: cleanName,
          qty: 1,
          price: money,
        });
      }
    }
  }

  const totalSurcharges = surcharges.reduce((acc, s) => acc + s.amount, 0);

  // If subtotal was not explicitly found, infer it strictly excluding tax and surcharges!
  if (preTaxSubtotal === 0 && total > 0) {
    preTaxSubtotal = Math.max(0, Math.round((total - tax - totalSurcharges - serviceCharge) * 100) / 100);
  }

  // If total was not explicitly found, compute it
  if (total === 0 && preTaxSubtotal > 0) {
    total = Math.round((preTaxSubtotal + tax + totalSurcharges + serviceCharge) * 100) / 100;
  }

  return {
    merchantName,
    city: detectedCity,
    state: detectedState,
    countryCode: detectedCountry,
    preTaxSubtotal,
    tax,
    surcharges,
    totalSurcharges,
    serviceCharge,
    serviceChargeIncluded,
    serviceChargeDescription,
    total,
    items,
    serviceType: detectServiceType(text),
    rawText: text,
  };
}
