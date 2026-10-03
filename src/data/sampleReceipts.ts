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

// Receipt text is embedded in SVG markup, which must be valid XML to render as an <img>
const escapeXml = (str: string) =>
  str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function createReceiptSvg(
  sampleId: string,
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
        <span>${item.qty}x ${escapeXml(item.name)}</span>
        <span>${currencySym}${item.price.toFixed(2)}</span>
      </div>`
    )
    .join('');

  const surchargeLines = surcharges
    .map(
      (s) => `
      <div style="font-size:12px; margin-bottom:3px; display:flex; justify-content:space-between; color:#b45309; font-weight:600;">
        <span>${escapeXml(s.name.toUpperCase())}:</span>
        <span>${currencySym}${s.amount.toFixed(2)}</span>
      </div>`
    )
    .join('');

  const svgContent = `
  <svg xmlns="http://www.w3.org/2000/svg" data-sample-id="${sampleId}" width="380" height="540" viewBox="0 0 380 540">
    <!-- ID: ${sampleId} -->
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
          <div style="font-size:15px; font-weight:bold; letter-spacing:0.5px; text-transform:uppercase;">${escapeXml(restaurant)}</div>
          <div style="font-size:11px; color:#52525b; margin-top:2px;">${escapeXml(cityCountry)}</div>
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
                <span>TAX / VAT / IVA:</span>
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
                ${escapeXml(extraFooter).replace(/&lt;br\s*\/?&gt;/g, '<br/>')}
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
  // 1. Bix Restaurant & Bar (San Francisco, CA) - $112
  {
    id: 'sf-bix',
    name: 'Bix Restaurant & Bar',
    countryCode: 'US',
    countryName: 'United States',
    city: 'San Francisco',
    state: 'CA',
    flag: '🇺🇸',
    currency: 'USD',
    currencySymbol: '$',
    subtotal: 112.0,
    tax: 9.66,
    surcharges: [
      { name: 'SF Health Mandate (5%)', amount: 5.6, isHealthOrMandate: true }
    ],
    serviceCharge: 0,
    total: 127.26,
    date: '2026-10-01 20:30',
    items: [
      { name: 'Prime New York Strip Steak', qty: 1, price: 64.0 },
      { name: 'Dungeness Crab Cake', qty: 1, price: 28.0 },
      { name: 'Bix Classic Dry Martini', qty: 1, price: 20.0 }
    ],
    svgDataUri: createReceiptSvg(
      'sf-bix',
      'Bix Restaurant & Bar',
      '56 Gold St, San Francisco, CA 94133',
      '2026-10-01 20:30',
      [
        { name: 'Prime New York Strip Steak', qty: 1, price: 64.0 },
        { name: 'Dungeness Crab Cake', qty: 1, price: 28.0 },
        { name: 'Bix Classic Dry Martini', qty: 1, price: 20.0 }
      ],
      112.0,
      9.66,
      [{ name: 'SF Health Mandate (5%)', amount: 5.6 }],
      0,
      127.26,
      '$',
      '5% SF Health Mandate ($5.60) excluded from tip.<br/>Standard tip 18% - 20% on $112.00 pre-tax subtotal.'
    ),
    notes: 'San Francisco, CA: 5% SF Mandate is excluded from tip. Tip calculated on $112.00 pre-tax.'
  },

  // 2. Calypso Cabaret (Bangkok, Thailand) - 1,400 THB
  {
    id: 'thailand-calypso-cabaret',
    name: 'Calypso Cabaret (Asiatique)',
    countryCode: 'TH',
    countryName: 'Thailand',
    city: 'Bangkok',
    flag: '🇹🇭',
    currency: 'THB',
    currencySymbol: '฿',
    subtotal: 1400.0,
    tax: 98.0,
    serviceCharge: 140.0,
    total: 1638.0,
    date: '2026-10-01 19:30',
    items: [
      { name: 'VIP Thai Dinner & Theater Show (บัตรชมการแสดง)', qty: 1, price: 1200.0 },
      { name: 'Signature Thai Cocktail & Drink (เครื่องดื่ม)', qty: 1, price: 200.0 }
    ],
    svgDataUri: createReceiptSvg(
      'thailand-calypso-cabaret',
      'Calypso Cabaret Bangkok',
      'Asiatique The Riverfront, 2194 Charoen Krung Rd, Bangkok, Thailand',
      '2026-10-01 19:30',
      [
        { name: 'VIP Dinner & Theater Show', qty: 1, price: 1200.0 },
        { name: 'Signature Cocktail & Drink', qty: 1, price: 200.0 }
      ],
      1400.0,
      98.0,
      [],
      140.0,
      1638.0,
      '฿',
      '10% SERVICE CHARGE (฿140) + 7% VAT (฿98) INCLUDED.<br/>Extra tip is 0% or round up loose change.'
    ),
    notes: 'Bangkok, Thailand: 10% service charge + VAT included. Extra tip is 0% or small change.'
  },

  // 3. Din Tai Fung (Taipei, Taiwan) - NT$680
  {
    id: 'taiwan-dintaifung',
    name: 'Din Tai Fung (鼎泰豐信義店)',
    countryCode: 'TW',
    countryName: 'Taiwan',
    city: 'Taipei',
    flag: '🇹🇼',
    currency: 'TWD',
    currencySymbol: 'NT$',
    subtotal: 680.0,
    tax: 0.0,
    serviceCharge: 68.0,
    total: 748.0,
    date: '2026-09-30 18:30',
    items: [
      { name: 'Pork Xiao Long Bao (小籠包)', qty: 1, price: 250.0 },
      { name: 'Shrimp Fried Rice (蝦仁蛋炒飯)', qty: 1, price: 260.0 },
      { name: 'Spicy Wontons (紅油抄手)', qty: 1, price: 170.0 }
    ],
    svgDataUri: createReceiptSvg(
      'taiwan-dintaifung',
      'Din Tai Fung (鼎泰豐信義店)',
      'No. 194 Xinyi Rd Sec 2, Da’an, Taipei, Taiwan',
      '2026-09-30 18:30',
      [
        { name: 'Pork Xiao Long Bao (小籠包)', qty: 1, price: 250.0 },
        { name: 'Shrimp Fried Rice (蝦仁蛋炒飯)', qty: 1, price: 260.0 },
        { name: 'Spicy Wontons (紅油抄手)', qty: 1, price: 170.0 }
      ],
      680.0,
      0.0,
      [],
      68.0,
      748.0,
      'NT$',
      '10% Service Charge (服務費 10%): NT$68.00 Included.<br/>Tipping in Taiwan is 0% (Not Customary).'
    ),
    notes: 'Taiwan 10% Service Charge! Standard tip recommendation is 0% (NT$0).'
  },

  // 4. Joël Robuchon (Paris, France) - €300
  {
    id: 'paris-joel-robuchon',
    name: 'Joël Robuchon (Paris)',
    countryCode: 'FR',
    countryName: 'France',
    city: 'Paris',
    flag: '🇫🇷',
    currency: 'EUR',
    currencySymbol: '€',
    subtotal: 300.0,
    tax: 30.0,
    serviceCharge: 45.0,
    total: 375.0,
    date: '2026-10-01 21:00',
    items: [
      { name: 'Menu Dégustation Prestige', qty: 1, price: 220.0 },
      { name: 'La Caille au Foie Gras de Canard', qty: 1, price: 80.0 }
    ],
    svgDataUri: createReceiptSvg(
      'paris-joel-robuchon',
      'L’Atelier de Joël Robuchon',
      '5 Rue de Montalembert, 75007 Paris, France',
      '2026-10-01 21:00',
      [
        { name: 'Menu Dégustation Prestige', qty: 1, price: 220.0 },
        { name: 'La Caille au Foie Gras de Canard', qty: 1, price: 80.0 }
      ],
      300.0,
      30.0,
      [],
      45.0,
      375.0,
      '€',
      'SERVICE COMPRIS 15% INCLUS DANS LE PRIX (€45.00).<br/>Le pourboire est discrétionnaire (5€ - 10€ pour service exceptionnel).'
    ),
    notes: 'Paris fine dining: 15% Service Compris legally included in prices. Extra tip is strictly discretionary.'
  },

  // 5. Maxim's Palace Dim Sum (Hong Kong) - HK$214
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
      'hong-kong-dimsum',
      "Maxim's Palace Dim Sum (大會堂美心皇宮)",
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
      '10% SERVICE CHARGE (+10% 加一服務費): HK$21.40 INCLUDED.<br/>Standard tip in Hong Kong is 0%. Additional tip is NOT expected!'
    ),
    notes: 'Hong Kong +10% Service Charge (加一)! Standard tip is 0% (HK$0).'
  },

  // 6. Old Jesse Restaurant (Shanghai, China) - ¥888
  {
    id: 'china-shanghai-old-jesse',
    name: 'Old Jesse Restaurant (老吉士酒家)',
    countryCode: 'CN',
    countryName: 'China',
    city: 'Shanghai',
    flag: '🇨🇳',
    currency: 'CNY',
    currencySymbol: '¥',
    subtotal: 888.0,
    tax: 0.0,
    serviceCharge: 0.0,
    total: 888.0,
    date: '2026-10-01 19:15',
    items: [
      { name: 'Braised Pork Shoulder (老吉士紅燒蹄膀)', qty: 1, price: 288.0 },
      { name: 'Crab Meat & Roe with Tofu (蟹粉豆腐)', qty: 1, price: 360.0 },
      { name: 'Scallion Roasted Cod (蔥烤銀鱈魚)', qty: 1, price: 240.0 }
    ],
    svgDataUri: createReceiptSvg(
      'china-shanghai-old-jesse',
      'Old Jesse Restaurant (老吉士酒家)',
      '41 Tianping Rd, Xuhui District, Shanghai, China (天平路41號)',
      '2026-10-01 19:15',
      [
        { name: 'Braised Pork Shoulder (紅燒蹄膀)', qty: 1, price: 288.0 },
        { name: 'Crab Meat & Roe with Tofu (蟹粉豆腐)', qty: 1, price: 360.0 },
        { name: 'Scallion Roasted Cod (蔥烤銀鱈魚)', qty: 1, price: 240.0 }
      ],
      888.0,
      0.0,
      [],
      0,
      888.0,
      '¥',
      'TIPPING IS 0% IN MAINLAND CHINA.<br/>Gratuities are not customary and traditionally discouraged. Pay exact bill.'
    ),
    notes: 'Shanghai: Tipping is 0% and traditionally not customary in mainland China. Please pay exact bill amount.'
  },

  // 7. Delilah supper club at Wynn (Las Vegas, NV) - $156
  {
    id: 'las-vegas-delilah',
    name: 'Delilah (Wynn Las Vegas)',
    countryCode: 'US',
    countryName: 'United States',
    city: 'Las Vegas',
    state: 'NV',
    flag: '🇺🇸',
    currency: 'USD',
    currencySymbol: '$',
    subtotal: 156.0,
    tax: 13.07,
    serviceCharge: 0,
    total: 169.07,
    date: '2026-09-29 21:00',
    items: [
      { name: 'Beef Wellington', qty: 1, price: 92.0 },
      { name: 'Chicken Tenders & Caviar', qty: 1, price: 38.0 },
      { name: 'Classic Martini', qty: 1, price: 26.0 }
    ],
    svgDataUri: createReceiptSvg(
      'las-vegas-delilah',
      'Delilah Supper Club',
      'Wynn Las Vegas, 3131 S Las Vegas Blvd, Las Vegas, NV 89109',
      '2026-09-29 21:00',
      [
        { name: 'Beef Wellington', qty: 1, price: 92.0 },
        { name: 'Chicken Tenders & Caviar', qty: 1, price: 38.0 },
        { name: 'Classic Martini', qty: 1, price: 26.0 }
      ],
      156.0,
      13.07,
      [],
      0,
      169.07,
      '$',
      'Las Vegas, NV dining etiquette.<br/>Customary tip is 18% - 20% on pre-tax subtotal ($156.00).'
    ),
    notes: 'Las Vegas, NV: Customary US tip is 18-20% calculated on pre-tax $156.'
  },

  // 8. Sukiyabashi Jiro (Tokyo, Japan) - ¥88,000
  {
    id: 'japan-tokyo-sukiyabashi-jiro',
    name: 'Sukiyabashi Jiro (すきやばし次郎)',
    countryCode: 'JP',
    countryName: 'Japan',
    city: 'Tokyo',
    flag: '🇯🇵',
    currency: 'JPY',
    currencySymbol: '¥',
    subtotal: 88000.0,
    tax: 8800.0,
    serviceCharge: 0.0,
    total: 96800.0,
    date: '2026-10-01 18:00',
    items: [
      { name: 'Chef Jiro Omakase Tasting Course (特選おまかせ握りコース)', qty: 2, price: 88000.0 }
    ],
    svgDataUri: createReceiptSvg(
      'japan-tokyo-sukiyabashi-jiro',
      'Sukiyabashi Jiro (すきやばし次郎)',
      'Tsukamoto Sogyo Bldg B1F, 4 Chome-2-15 Ginza, Chuo City, Tokyo, Japan',
      '2026-10-01 18:00',
      [
        { name: 'Chef Jiro Omakase Course (おまかせ握りコース x2)', qty: 2, price: 88000.0 }
      ],
      88000.0,
      8800.0,
      [],
      0,
      96800.0,
      '¥',
      'NO TIPPING CUSTOM IN JAPAN (0%).<br/>Supreme culinary craftsmanship and hospitality are honored without monetary tip. Arigatō gozaimasu!'
    ),
    notes: 'Tokyo Ginza: 0% tip. In Japanese gastronomy and culture, world-class hospitality is built into the bill.'
  }
];
