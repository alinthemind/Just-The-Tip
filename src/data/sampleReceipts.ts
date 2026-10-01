export interface SampleReceipt {
  id: string;
  name: string;
  countryCode: string;
  countryName: string;
  city: string;
  state?: string;
  flag: string;
  currency: string;
  currencySymbol: string;
  subtotal: number; // Pre-tax food & beverage
  tax: number;
  surcharges?: Array<{ name: string; amount: number; isHealthOrMandate?: boolean }>;
  serviceCharge: number;
  total: number;
  date: string;
  items: Array<{ name: string; qty: number; price: number }>;
  svgDataUri: string;
  notes: string;
}

function createReceiptSvg(
  restaurant: string,
  cityCountry: string,
  date: string,
  items: Array<{ name: string; qty: number; price: number }>,
  subtotal: number,
  tax: number,
  surcharges: Array<{ name: string; amount: number }> = [],
  serviceCharge: number = 0,
  total: number = 0,
  currencySym: string = '$',
  extraFooter?: string
): string {
  const itemLines = items
    .map(
      (item) => `
      <div style="display:flex; justify-content:space-between; margin-bottom:4px; font-size:12px; font-family:'Courier New', Courier, monospace;">
        <span>${item.qty}x ${item.name}</span>
        <span>${currencySym}${item.price.toFixed(2)}</span>
      </div>`
    )
    .join('');

  const surchargeLines = surcharges
    .map(
      (s) => `
      <div style="font-size:12px; margin-bottom:3px; display:flex; justify-content:space-between; color:#b45309; font-weight:600;">
        <span>${s.name.toUpperCase()}:</span>
        <span>${currencySym}${s.amount.toFixed(2)}</span>
      </div>`
    )
    .join('');

  const svgContent = `
  <svg xmlns="http://www.w3.org/2000/svg" width="380" height="540" viewBox="0 0 380 540">
    <defs>
      <filter id="paper-shadow" x="-5%" y="-5%" width="110%" height="110%">
        <feDropShadow dx="0" dy="4" stdDeviation="6" flood-opacity="0.15" />
      </filter>
    </defs>
    <rect width="380" height="540" fill="#f4f4f5" />
    <g filter="url(#paper-shadow)">
      <path d="M 20 20 L 360 20 L 360 515 L 345 510 L 330 515 L 315 510 L 300 515 L 285 510 L 270 515 L 255 510 L 240 515 L 225 510 L 210 515 L 195 510 L 180 515 L 165 510 L 150 515 L 135 510 L 120 515 L 105 510 L 90 515 L 75 510 L 60 515 L 45 510 L 30 515 L 20 510 Z" fill="#ffffff" stroke="#e4e4e7" stroke-width="1"/>
    </g>
    <foreignObject x="35" y="35" width="310" height="470">
      <div xmlns="http://www.w3.org/1999/xhtml" style="font-family:'Courier New', Courier, monospace; color:#18181b; line-height:1.3;">
        <div style="text-align:center; margin-bottom:12px;">
          <div style="font-size:16px; font-weight:bold; letter-spacing:1px; text-transform:uppercase;">${restaurant}</div>
          <div style="font-size:11px; color:#52525b; margin-top:2px;">${cityCountry}</div>
          <div style="font-size:10px; color:#71717a; margin-top:2px;">Date: ${date}</div>
          <div style="border-bottom:1px dashed #a1a1aa; margin:10px 0;"></div>
        </div>
        
        <div style="margin-bottom:12px;">
          ${itemLines}
        </div>

        <div style="border-bottom:1px dashed #a1a1aa; margin:10px 0;"></div>

        <div style="font-size:12px; margin-bottom:3px; display:flex; justify-content:space-between; font-weight:bold;">
          <span>FOOD/BEV SUBTOTAL:</span>
          <span>${currencySym}${subtotal.toFixed(2)}</span>
        </div>
        ${surchargeLines}
        ${
          tax > 0
            ? `<div style="font-size:12px; margin-bottom:3px; display:flex; justify-content:space-between;">
                <span>TAX / VAT:</span>
                <span>${currencySym}${tax.toFixed(2)}</span>
              </div>`
            : ''
        }
        ${
          serviceCharge > 0
            ? `<div style="font-size:12px; margin-bottom:3px; display:flex; justify-content:space-between; color:#b91c1c; font-weight:bold;">
                <span>SERVICE CHARGE:</span>
                <span>${currencySym}${serviceCharge.toFixed(2)}</span>
              </div>`
            : ''
        }
        <div style="border-bottom:2px solid #18181b; margin:6px 0;"></div>
        <div style="font-size:15px; font-weight:bold; display:flex; justify-content:space-between; margin-bottom:12px;">
          <span>TOTAL DUE:</span>
          <span>${currencySym}${total.toFixed(2)}</span>
        </div>

        ${
          extraFooter
            ? `<div style="font-size:10px; text-align:center; color:#52525b; margin-top:14px; border-top:1px dashed #d4d4d8; padding-top:8px;">
                ${extraFooter}
               </div>`
            : `<div style="font-size:10px; text-align:center; color:#71717a; margin-top:14px;">
                *** THANK YOU FOR DINING WITH US ***
               </div>`
        }
      </div>
    </foreignObject>
  </svg>
  `;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svgContent)}`;
}

export const SAMPLE_RECEIPTS: SampleReceipt[] = [
  {
    id: 'chicago-grill',
    name: 'The Purple Pig',
    countryCode: 'US',
    countryName: 'United States',
    city: 'Chicago',
    state: 'IL',
    flag: '🇺🇸',
    currency: 'USD',
    currencySymbol: '$',
    subtotal: 78.0,
    tax: 8.0,
    serviceCharge: 0,
    total: 86.0,
    date: '2026-09-30 19:30',
    items: [
      { name: 'Braised Pork Shoulder', qty: 1, price: 32.0 },
      { name: 'House Charcuterie Board', qty: 1, price: 26.0 },
      { name: 'Chicago Craft IPA', qty: 2, price: 20.0 }
    ],
    svgDataUri: createReceiptSvg(
      'The Purple Pig',
      '500 N Michigan Ave, Chicago, IL 60611',
      '2026-09-30 19:30',
      [
        { name: 'Braised Pork Shoulder', qty: 1, price: 32.0 },
        { name: 'House Charcuterie Board', qty: 1, price: 26.0 },
        { name: 'Chicago Craft IPA', qty: 2, price: 20.0 }
      ],
      78.0,
      8.0,
      [],
      0,
      86.0,
      '$',
      'Chicago, IL dining etiquette.<br/>Tips calculated on pre-tax subtotal ($78.00).'
    ),
    notes: 'Chicago, IL receipt! Automatically detects Chicago location & tips on pre-tax $78.'
  },
  {
    id: 'sf-health-mandate',
    name: 'Zuni Cafe & Bar',
    countryCode: 'US',
    countryName: 'United States',
    city: 'San Francisco',
    state: 'CA',
    flag: '🇺🇸',
    currency: 'USD',
    currencySymbol: '$',
    subtotal: 68.0,
    tax: 5.86,
    surcharges: [
      { name: 'SF Health Mandate (5%)', amount: 3.4, isHealthOrMandate: true }
    ],
    serviceCharge: 0,
    total: 77.26,
    date: '2026-09-29 20:15',
    items: [
      { name: 'Roast Chicken for Two', qty: 1, price: 54.0 },
      { name: 'Shoestring French Fries', qty: 1, price: 14.0 }
    ],
    svgDataUri: createReceiptSvg(
      'Zuni Cafe & Bar',
      '1658 Market St, San Francisco, CA 94102',
      '2026-09-29 20:15',
      [
        { name: 'Roast Chicken for Two', qty: 1, price: 54.0 },
        { name: 'Shoestring French Fries', qty: 1, price: 14.0 }
      ],
      68.0,
      5.86,
      [{ name: 'SF Mandate (5%)', amount: 3.4 }],
      0,
      77.26,
      '$',
      '5% SF Health Care Security Ordinance surcharge added.<br/>Tip calculated on $68.00 pre-tax, EXCLUDING SF mandate.'
    ),
    notes: 'Features 5% SF Health Mandate! Tip is calculated on $68 pre-tax, excluding surcharge.'
  },
  {
    id: 'london-pub',
    name: 'The Churchill Arms',
    countryCode: 'GB',
    countryName: 'United Kingdom',
    city: 'London',
    flag: '🇬🇧',
    currency: 'GBP',
    currencySymbol: '£',
    subtotal: 64.0,
    tax: 12.8,
    serviceCharge: 8.0,
    total: 72.0,
    date: '2026-09-29 13:15',
    items: [
      { name: 'Fish & Hand-cut Chips', qty: 2, price: 34.0 },
      { name: 'Sticky Toffee Pudding', qty: 1, price: 8.0 },
      { name: 'Pint of London Pride', qty: 2, price: 14.0 },
      { name: 'Sparkling Mineral Water', qty: 1, price: 8.0 }
    ],
    svgDataUri: createReceiptSvg(
      'The Churchill Arms',
      '119 Kensington Church St, London W8 7LN',
      '2026-09-29 13:15',
      [
        { name: 'Fish & Hand-cut Chips', qty: 2, price: 34.0 },
        { name: 'Sticky Toffee Pudding', qty: 1, price: 8.0 },
        { name: 'Pint of London Pride', qty: 2, price: 14.0 },
        { name: 'Sparkling Mineral Water', qty: 1, price: 8.0 }
      ],
      64.0,
      12.8,
      [],
      8.0,
      72.0,
      '£',
      'An optional 12.5% service charge (£8.00) has been added to your bill.<br/>VAT No: GB 429 881 201'
    ),
    notes: 'Has 12.5% discretionary service charge already included on bill! Extra tip is £0.'
  },
  {
    id: 'hong-kong-dimsum',
    name: "Maxim's Palace Dim Sum (大會堂美心皇宮)",
    countryCode: 'HK',
    countryName: 'Hong Kong',
    city: 'Hong Kong',
    flag: '🇭🇰',
    currency: 'HKD',
    currencySymbol: 'HK$',
    subtotal: 214.0,
    tax: 0.0,
    serviceCharge: 21.4,
    total: 235.4,
    date: '2026-09-30 12:45',
    items: [
      { name: 'Steamed Har Gow (蝦餃皇)', qty: 1, price: 68.0 },
      { name: 'Pork Siu Mai (蟹籽燒賣)', qty: 1, price: 62.0 },
      { name: 'Baked BBQ Pork Bun (叉燒包)', qty: 1, price: 48.0 },
      { name: 'Pu-erh Tea Service (普洱茶位)', qty: 2, price: 36.0 }
    ],
    svgDataUri: createReceiptSvg(
      "Maxim's Palace (美心皇宮)",
      'City Hall 2/F Low Block, Central, Hong Kong (中環)',
      '2026-09-30 12:45',
      [
        { name: 'Steamed Har Gow (蝦餃皇)', qty: 1, price: 68.0 },
        { name: 'Pork Siu Mai (蟹籽燒賣)', qty: 1, price: 62.0 },
        { name: 'Baked BBQ Pork Bun (叉燒包)', qty: 1, price: 48.0 },
        { name: 'Pu-erh Tea Service (普洱茶位)', qty: 2, price: 36.0 }
      ],
      214.0,
      0.0,
      [],
      21.4,
      235.4,
      'HK$',
      '10% SERVICE CHARGE (+10% 加一服務費): HK$21.40 INCLUDED.<br/>Standard tip is NOT 18%. Extra tip is 0% or round up change!'
    ),
    notes: 'Hong Kong +10% Service Charge (加一)! Standard tip is 0% or round up small change.'
  }
];
