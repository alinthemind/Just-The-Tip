import { ReceiptItem, ReceiptSurcharge } from '../types';
import { ServiceType } from '../data/tippingCulture';

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

// Keyword evidence for each kind of business; restaurant is the default when nothing stands out.
// CJK/Thai/Korean words have no word boundaries, so they sit outside the \b group.
const SERVICE_PATTERNS: Record<Exclude<ServiceType, 'restaurant'>, RegExp> = {
  beauty: /\b(salon|spa|massage|manicure|pedicure|mani|pedi|nails?|gel\s*polish|haircut|hair\s*cut|blow\s*dry|blowout|barber|stylist|facial|waxing|wax|lash(es)?|brows?|colou?r\s*treatment|highlights|keratin|thai\s*massage|foot\s*massage|reflexology|hammam|aromatherapy|beauty|coiffure|coiffeur|friseur|parrucchiere|peluquer[ií]a)\b|美容|美髮|美发|按摩|推拿|足疗|足療|理髮|理发|剪髮|剪发|洗剪吹|洗头|洗頭|洗发|洗髮|髮型|发型|焗油|护发|護髮|染发|染髮|电发|電髮|美甲|ネイル|マッサージ|美容室|ヘアサロン|カット|整体|미용|미용실|네일|마사지|헤어|นวด|สปา|ทำเล็บ|ตัดผม/gi,
  taxi: /\b(taxi|cab|fare|meter(ed)?|pick\s*-?up|drop\s*-?off|trip\s*(fare|total)|ride|uber|lyft|grab|bolt|didi|mileage|km|miles|driver\s*id|medallion|tolls?|congestion|flag\s*fall|booking\s*fee)\b|的士|計程車|计程车|出租车|出租車|车费|車資|里程|上车|下车|降车|迎车|乘车|上車|下車|降車|迎車|乘車|タクシー|運賃|乗車|택시|요금|미터|แท็กซี่|ค่าโดยสาร|มิเตอร์/gi,
  cafe: /\b(caf[eé]|coffee|espresso|latte|cappuccino|americano|macchiato|mocha|flat\s*white|cold\s*brew|frappuccino|tea\s*latte|matcha|croissant|muffin|bagel|pastry|bakery|starbucks|dunkin|tim\s*hortons|costa|kaffee|caff[eè])\b|咖啡|拿铁|拿鐵|美式|カフェ|コーヒー|ラテ|커피|카페|아메리카노|라떼|กาแฟ|ลาเต้|คาปูชิโน่/gi,
  bar: /\b(bar|pub|tavern|brewery|taproom|lounge|saloon|cocktails?|pint|draft|draught|ipa|lager|stout|ale|shots?|happy\s*hour|bar\s*tab|tab\s*#|whisk(e)?y|tequila|vodka|gin\s*&?\s*tonic|negroni|margarita|mojito|cantina|cerveza|mezcal|bi[eè]re|bier|birra|spritz)\b|酒吧|鸡尾酒|雞尾酒|威士忌|啤酒|バー|カクテル|ハイボール|술집|칵테일|맥주|บาร์|ค็อกเทล|เบียร์/gi,
  hotel: /\b(hotel|inn|resort|suites?|folio|guest\s*folio|room\s*(charge|rate|no\.?|number)?|nights?|check[\s-]*in|check[\s-]*out|arrival|departure|accommodation|lodging|city\s*tax|tourism\s*(tax|levy)|occupancy\s*tax)\b|\d\s*泊|\d\s*晚|酒店|饭店|飯店|宾馆|賓館|旅馆|旅館|客房|房费|房費|入住|退房|ホテル|宿泊|旅館|チェックイン|客室|호텔|숙박|객실|체크인|โรงแรม|ห้องพัก|เช็คอิน/gi,
};
// Evidence that it is a sit-down meal, which outweighs a few drink or coffee lines
const RESTAURANT_PATTERN = /\b(restaurant|ristorante|trattoria|bistro|brasserie|steakhouse|grill|kitchen|diner|eatery|entr[eé]e|appetizer|starter|main\s*course|dessert|table\s*#?\s*\d+|guests?|covers?|server|dine\s*-?in|steak|burger|pasta|pizza|salad|soup|sushi|ramen|dim\s*sum|tapas)\b|餐廳|餐厅|酒家|酒楼|酒樓|桌号|桌號|堂食|菜品|レストラン|食堂|定食|식당|정식|ร้านอาหาร/gi;

export function detectServiceType(text: string): ServiceType {
  if (!text) return 'restaurant';
  const count = (re: RegExp) => (text.match(re) || []).length;
  const beauty = count(SERVICE_PATTERNS.beauty);
  const taxi = count(SERVICE_PATTERNS.taxi);
  const cafe = count(SERVICE_PATTERNS.cafe);
  const bar = count(SERVICE_PATTERNS.bar);
  const hotel = count(SERVICE_PATTERNS.hotel);
  const meal = count(RESTAURANT_PATTERN);

  const drinksOrFood = meal + cafe + bar;
  // A room bill (folio, nights, check-in/out) is a hotel even if it lists the hotel's restaurant
  if ((hotel >= 3 && hotel > meal) || (hotel >= 2 && drinksOrFood === 0)) return 'hotel';
  // Salons and rides almost never share vocabulary with food, so a couple of hits is enough, and a
  // single one when nothing on the receipt is food or drink (OCR often loses the rest)
  if ((beauty >= 2 && beauty > meal) || (beauty >= 1 && drinksOrFood === 0 && hotel === 0)) return 'beauty';
  if (taxi >= 2 && taxi > meal + cafe) return 'taxi';
  // Restaurants often have a bar or serve coffee, so cafés and bars need to clearly outweigh meal evidence
  if (cafe >= 2 && cafe > meal * 2 && cafe >= bar) return 'cafe';
  if (bar >= 2 && bar > meal * 2) return 'bar';
  return 'restaurant';
}

// Cities printed on receipts. CJK/Thai names have no word boundaries, so they sit outside \b groups.
const CITY_PATTERNS: Array<{ regex: RegExp; city: string; state: string; countryCode: string }> = [
  { regex: /\b(hong\s*kong|kowloon|tsim\s*sha\s*tsui|causeway\s*bay|wan\s*chai|mong\s*kok|sheung\s*wan|lan\s*kwai\s*fong|hkd)\b|hk\$|香港|九龍|九龙|尖沙咀|銅鑼灣|铜锣湾|旺角|中環|中环|灣仔|湾仔|加一/i, city: 'Hong Kong', state: '', countryCode: 'HK' },
  { regex: /\b(macau|macao)\b|澳門|澳门/i, city: 'Macau', state: '', countryCode: 'MO' },
  { regex: /\b(taipei)\b|nt\$|台北|臺北/i, city: 'Taipei', state: '', countryCode: 'TW' },
  { regex: /\b(kaohsiung)\b|高雄/i, city: 'Kaohsiung', state: '', countryCode: 'TW' },
  { regex: /\b(shenzhen)\b|深圳/i, city: 'Shenzhen', state: '', countryCode: 'CN' },
  { regex: /\b(shanghai)\b|上海/i, city: 'Shanghai', state: '', countryCode: 'CN' },
  { regex: /\b(beijing)\b|北京/i, city: 'Beijing', state: '', countryCode: 'CN' },
  { regex: /\b(guangzhou)\b|广州|廣州/i, city: 'Guangzhou', state: '', countryCode: 'CN' },
  { regex: /\b(chengdu)\b|成都/i, city: 'Chengdu', state: '', countryCode: 'CN' },
  { regex: /\b(hangzhou)\b|杭州/i, city: 'Hangzhou', state: '', countryCode: 'CN' },
  { regex: /\b(tokyo)\b|東京|东京/i, city: 'Tokyo', state: '', countryCode: 'JP' },
  { regex: /\b(osaka)\b|大阪/i, city: 'Osaka', state: '', countryCode: 'JP' },
  { regex: /\b(kyoto)\b|京都/i, city: 'Kyoto', state: '', countryCode: 'JP' },
  { regex: /\b(seoul)\b|서울/i, city: 'Seoul', state: '', countryCode: 'KR' },
  { regex: /\b(busan)\b|부산/i, city: 'Busan', state: '', countryCode: 'KR' },
  { regex: /\b(bangkok)\b|กรุงเทพ/i, city: 'Bangkok', state: '', countryCode: 'TH' },
  { regex: /\b(chiang\s*mai)\b|เชียงใหม่/i, city: 'Chiang Mai', state: '', countryCode: 'TH' },
  { regex: /\b(phuket)\b|ภูเก็ต/i, city: 'Phuket', state: '', countryCode: 'TH' },
  { regex: /\b(singapore)\b/i, city: 'Singapore', state: '', countryCode: 'SG' },
  { regex: /\b(chicago)\b/i, city: 'Chicago', state: 'IL', countryCode: 'US' },
  { regex: /\b(san\s*francisco)\b/i, city: 'San Francisco', state: 'CA', countryCode: 'US' },
  { regex: /\b(new\s*york|nyc|manhattan|brooklyn)\b/i, city: 'New York', state: 'NY', countryCode: 'US' },
  { regex: /\b(los\s*angeles)\b|\bl\.a\./i, city: 'Los Angeles', state: 'CA', countryCode: 'US' },
  { regex: /\b(austin)\b/i, city: 'Austin', state: 'TX', countryCode: 'US' },
  { regex: /\b(seattle)\b/i, city: 'Seattle', state: 'WA', countryCode: 'US' },
  { regex: /\b(boston)\b/i, city: 'Boston', state: 'MA', countryCode: 'US' },
  { regex: /\b(miami)\b/i, city: 'Miami', state: 'FL', countryCode: 'US' },
  { regex: /\b(denver)\b/i, city: 'Denver', state: 'CO', countryCode: 'US' },
  { regex: /\b(las\s*vegas)\b/i, city: 'Las Vegas', state: 'NV', countryCode: 'US' },
  { regex: /\b(london)\b/i, city: 'London', state: '', countryCode: 'GB' },
  { regex: /\b(dublin)\b/i, city: 'Dublin', state: '', countryCode: 'IE' },
  { regex: /\b(paris)\b/i, city: 'Paris', state: '', countryCode: 'FR' },
  { regex: /\b(ciudad\s*de\s*m(é|e)xico|cdmx)\b/i, city: 'Mexico City', state: '', countryCode: 'MX' },
  { regex: /\b(roma|rome)\b/i, city: 'Rome', state: '', countryCode: 'IT' },
  { regex: /\b(milano|milan)\b/i, city: 'Milan', state: '', countryCode: 'IT' },
  { regex: /\b(madrid)\b/i, city: 'Madrid', state: '', countryCode: 'ES' },
  { regex: /\b(barcelona)\b/i, city: 'Barcelona', state: '', countryCode: 'ES' },
  { regex: /\b(berlin)\b/i, city: 'Berlin', state: '', countryCode: 'DE' },
  { regex: /\b(m(ü|ue|u)nchen|munich)\b/i, city: 'Munich', state: '', countryCode: 'DE' },
  { regex: /\b(lisboa|lisbon)\b/i, city: 'Lisbon', state: '', countryCode: 'PT' },
  { regex: /\b(amsterdam)\b/i, city: 'Amsterdam', state: '', countryCode: 'NL' },
  { regex: /\b(dubai)\b/i, city: 'Dubai', state: '', countryCode: 'AE' },
  { regex: /\b(toronto)\b/i, city: 'Toronto', state: 'ON', countryCode: 'CA' },
  { regex: /\b(vancouver)\b/i, city: 'Vancouver', state: 'BC', countryCode: 'CA' },
  { regex: /\b(sydney)\b/i, city: 'Sydney', state: '', countryCode: 'AU' },
];

// Currency markers that pin down the country when no city is printed
const CURRENCY_COUNTRY: Array<[RegExp, string]> = [
  [/nt\$|\bntd\b|新台幣|新臺幣/i, 'TW'],
  [/hk\$|\bhkd\b|港幣|港币/i, 'HK'],
  [/\bmop\b|澳門元|澳门元/i, 'MO'],
  [/\brmb\b|\bcny\b|人民币|人民幣/i, 'CN'],
  [/円|\bjpy\b/i, 'JP'],
  [/₩|\bkrw\b|원/, 'KR'],
  [/฿|บาท|\bthb\b/i, 'TH'],
  [/₫|\bvnd\b/i, 'VN'],
  [/₹|\binr\b/i, 'IN'],
  [/₱|\bphp\b/i, 'PH'],
  [/\bS\$|\bsgd\b/, 'SG'],
  [/\bRM\s?\d|\bmyr\b/, 'MY'],
  [/£|\bgbp\b/i, 'GB'],
  [/\b(aed|dhs?)\b/i, 'AE'],
];

// Writing systems: a receipt in Hangul is almost certainly Korean, kana Japanese, Thai script Thai
const HANGUL = /[가-힯]/g;
const KANA = /[぀-ヿ]/g;
const THAI = /[฀-๿]/g;
const HAN = /[一-鿿]/g;
// Characters that only exist in Simplified Chinese (vs. Traditional) — enough to tell mainland receipts apart
const SIMPLIFIED_ONLY = /[们这个来时说会对国过还后从样经发进动业车门间听写觉买卖题总认识边让单号价钱费税账务结计应实员优惠条码订饭鸡鱼汤面东广华门]/g;
const TRADITIONAL_ONLY = /[們這個來時說會對國過還後從樣經發進動業車門間聽寫覺買賣題總認識邊讓單號價錢費稅帳務結計應實員優惠條碼訂飯雞魚湯麵東廣華]/g;

function countryFromScript(text: string): string {
  const n = (re: RegExp) => (text.match(re) || []).length;
  const hangul = n(HANGUL), kana = n(KANA), thai = n(THAI), han = n(HAN);
  if (hangul >= 4 && hangul >= han) return 'KR';
  if (thai >= 6) return 'TH';
  if (kana >= 3) return 'JP';
  if (han >= 6) return n(SIMPLIFIED_ONLY) >= n(TRADITIONAL_ONLY) ? 'CN' : 'TW';
  return '';
}

// Receipt labels in the languages the app supports. CJK/Thai are matched without \b.
const SUBTOTAL_RE =
  /\b(sub\s*-?\s*total|subtot\.?|food\/bev\s*subtotal|total\s*ht|hors\s*taxes?|sous[\s-]*total|zwischensumme|netto(betrag)?|subtotale|imponibile|base\s*imponible)\b|小计|小計|菜品价格合计|菜品金额|菜品金額|商品合计|商品合計|消费金额|消費金額|소계|공급가액|ยอดรวมย่อย|ก่อนภาษี/i;
const TOTAL_RE =
  /\b(total|grand\s*total|amount\s*due|balance\s*due|to\s*pay|totale|gesamt(betrag)?|summe|endbetrag|zu\s*zahlen|importe|a\s*pagar|montant|net\s*[àa]\s*payer|valor\s*total)\b|合计|合計|总计|總計|总额|總額|应付|應付|实付|實付|应收|應收|支付合计|订单金额|訂單金額|お会計|ご請求|お支払|합계|총액|총\s*금액|결제\s*금액|받을\s*금액|รวมทั้งสิ้น|ยอดรวม|ยอดชำระ|ยอดสุทธิ|รวมเงิน|รวม/i;
const TAX_RE =
  /\b(tax|sales\s*tax|vat|gst|hst|pst|tva|mwst|ust|iva|igv|ppn|sst|impuesto|imposta)\b|消費税|消费税|税额|稅額|税金|稅金|税|稅|부가세|부가가치세|ภาษี/i;
const SERVICE_RE =
  /\b(auto\s*gratuity|service\s*charge|service\s*fee|discretionary\s*service|servizio|service\s*compris|bedienung|10%\s*svc|10%\s*sc)\b|加一|服务费|服務費|サービス料|奉仕料|봉사료|서비스\s*요금|ค่าบริการ|\+10%/i;
// Lines that are payments or bookkeeping, not dishes
const NOT_AN_ITEM =
  /subtotal|tax|total|tip|visa|master|amex|cash|change|card|payment|paid|支付|付款|现金|現金|找零|找續|微信|alipay|wechat|クレジット|お釣|카드|현금|거스름|เงินสด|บัตร|ทอน|金额|金額|合计|合計|应付|應付|单号|單號|会员|會員|发票|發票|电话|電話|tel|phone|www|http/i;
// Generic headings at the top of a receipt that are not the restaurant's name
const GENERIC_HEADER =
  /^(receipt|sales\s*receipt|tax\s*invoice|invoice|bill|guest\s*check|check|ticket|order|welcome.*|thank\s*you.*|结账单|結帳單|结帐单|账单|帳單|收据|收據|小票|收银小票|欢迎光临|歡迎光臨|領収書|領収証|レシート|いらっしゃいませ|영수증|계산서|ใบเสร็จ.*|ใบกำกับภาษี.*|addition|note|facture|rechnung|quittung|beleg|scontrino|conto|cuenta|recibo|nota)$/i;

// Street-address lines near the top (not the restaurant's name)
const ADDRESS_RE =
  /\b(street|st\.|avenue|ave\.?|road|rd\.|blvd|boulevard|lane|via|viale|rue|avenue|calle|avenida|av\.|stra(ß|ss)e|str\.|platz|plaza|square|floor)\b|[市区區县縣路街道号號巷弄]|丁目|番地|[구로길동]\s*\d|ถนน|ซอย|แขวง|เขต/i;
// Words that mark a line as the business name
const BUSINESS_WORD_RE =
  /\b(restaurant|ristorante|trattoria|bistro|brasserie|caf[eé]|bar|pub|grill|kitchen|diner|tavern|steakhouse|osteria|taquer[ií]a|gasthaus|club|cabaret|lounge|eatery|house)\b|店|餐|厨|廚|酒家|酒楼|酒樓|食堂|屋|亭|館|馆|식당|가든|ร้าน/i;
// Scripts expected in the business name, by country, so OCR garbage in another script is rejected
const NAME_SCRIPT: Record<string, RegExp> = {
  CN: HAN, TW: HAN, HK: HAN, MO: HAN, JP: /[\u3040-\u30ff\u4e00-\u9fff]/g, KR: HANGUL, TH: THAI,
};

/**
 * The restaurant's name: among the top lines, one that is mostly real letters, isn't a heading like
 * "Receipt"/结账单 or an address, and (for CJK/Thai receipts) is written in that script. Lines with
 * business words (店, restaurant...) win. Falls back to a plain label rather than OCR noise.
 */
function pickMerchantName(lines: string[], country: string): string {
  const script = NAME_SCRIPT[country];
  let best = '';
  let bestScore = 0;
  for (const raw of lines.slice(0, 6)) {
    const line = raw
      .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N})）]+$/gu, '')
      .replace(/(\s+[^\p{L}\s]+)+$/u, ''); // trailing tokens with no letters ("<5", "| 3")
    const letters = (line.match(/\p{L}/gu) || []).length;
    const visible = line.replace(/\s/g, '').length;
    if (letters < 2 || letters / Math.max(1, visible) < 0.6) continue;
    if (GENERIC_HEADER.test(line)) continue;
    if (ADDRESS_RE.test(line) && /\d/.test(line)) continue;
    // A line with a price is a dish, not the name
    if (/[$€£¥₩฿₫₹₱]|\d+[.,]\d{2}\b|\d{2,}\s*(元|円|원|บาท)?\s*$/.test(line)) continue;
    // CJK/Thai receipts: the name must be in that script, unless it's a clear English business name
    // ("Calypso Cabaret"); Latin text there is otherwise usually OCR noise from big bold headers
    if (script && (line.match(script) || []).length < 2 && !BUSINESS_WORD_RE.test(line)) continue;
    const score = 1 + (BUSINESS_WORD_RE.test(line) ? 2 : 0);
    if (score > bestScore) {
      best = line;
      bestScore = score;
    }
  }
  return best || 'Restaurant Bill';
}

const CJK_OR_THAI = '[\\u3000-\\u30ff\\u3400-\\u9fff\\uac00-\\ud7af\\u0e00-\\u0e7f\\uff00-\\uffef]';
// Spaces only: \s would also eat line breaks and merge a line into the next one
const SPACE_INSIDE_SCRIPT = new RegExp(`(?<=${CJK_OR_THAI})[ \\t\\u3000]+(?=${CJK_OR_THAI})`, 'g');

/** Parse one numeric token, handling 1,234.56 / 1.234,56 / 1 234,56 / 12,50 / 295 */
function parseAmountToken(raw: string): number | null {
  let s = raw.replace(/[\s ']/g, '');
  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  if (lastComma >= 0 && lastDot >= 0) {
    // Whichever separator comes last is the decimal point
    if (lastComma > lastDot) s = s.replace(/\./g, '').replace(',', '.');
    else s = s.replace(/,/g, '');
  } else if (lastComma >= 0) {
    const decimals = s.length - lastComma - 1;
    s = decimals === 2 || decimals === 1 ? s.replace(/,(?=\d{1,2}$)/, '.').replace(/,/g, '') : s.replace(/,/g, '');
  } else if (lastDot >= 0) {
    const decimals = s.length - lastDot - 1;
    // "1.234" is a thousands separator; "12.50" is a decimal point
    if (decimals === 3 && /^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  }
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

/** The money amount on a line: the right-most number that isn't a date, time, percentage or ID */
function extractMoney(line: string): number | null {
  const cleaned = line
    // A currency sign misread as a digit right after a thousands group ("15,000원" -> "15,0008")
    .replace(/(\d{1,3}(?:,\d{3})+)\d(?!\d)/g, '$1')
    .replace(/\b\d{2,4}[-/.年]\d{1,2}[-/.月]\d{1,2}日?/g, ' ') // dates
    .replace(/\b\d{1,2}:\d{2}(:\d{2})?\b/g, ' ') // times
    .replace(/\d+(\.\d+)?\s*%/g, ' ') // percentages
    .replace(/[*#xX×]\s*\d+/g, ' '); // masked numbers, "x2" quantities
  const tokens = cleaned.match(/\d{1,3}(?:[.,\s']\d{3})+(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?/g);
  if (!tokens) return null;
  for (let i = tokens.length - 1; i >= 0; i--) {
    const digits = tokens[i].replace(/\D/g, '');
    if (digits.length > 9) continue; // order numbers, phone numbers, card numbers
    const n = parseAmountToken(tokens[i]);
    if (n !== null && n > 0) return n;
  }
  return null;
}

// A line that is only an amount ("¥96,800", "HK$42.00", "15,000원")
const AMOUNT_ONLY = /^[\s$€£¥₩฿₫₹₱]*(NT\$|HK\$|S\$|RM|US\$)?\s*\d[\d.,\s']*\s*(元|円|원|บาท|€|EUR|USD)?\s*$/i;

/**
 * Right-aligned amount columns often come out of OCR (or text extraction) on their own line:
 * "TOTAL DUE:" / "¥96,800". Join such an amount onto the label line above it.
 */
function joinSplitAmounts(lines: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const next = lines[i + 1];
    if (next && AMOUNT_ONLY.test(next) && !AMOUNT_ONLY.test(line) && extractMoney(line) === null && /\p{L}/u.test(line)) {
      out.push(`${line} ${next}`);
      i++;
    } else {
      out.push(line);
    }
  }
  return out;
}

/** How much this OCR text looks like a real receipt: label words recognised plus amounts found */
export function receiptTextScore(text: string): number {
  const lines = joinSplitAmounts(text.split('\n').map((l) => l.replace(SPACE_INSIDE_SCRIPT, '').trim()).filter(Boolean));
  let score = 0;
  for (const line of lines) {
    const labelled = SUBTOTAL_RE.test(line) || TOTAL_RE.test(line) || TAX_RE.test(line) || SERVICE_RE.test(line);
    if (labelled) score += extractMoney(line) !== null ? 2 : 1;
  }
  return score;
}

export function parseReceiptText(text: string): ParsedReceiptTextResult {
  const normalized = (text || '').replace(SPACE_INSIDE_SCRIPT, '');
  const lines = joinSplitAmounts(normalized.split('\n').map((l) => l.trim()).filter(Boolean));

  let detectedCity = '';
  let detectedState = '';
  let detectedCountry = '';

  // 1. Location: a printed city, then US ZIP hints, then currency markers, then the writing system
  for (const pattern of CITY_PATTERNS) {
    if (pattern.regex.test(normalized)) {
      detectedCity = pattern.city;
      detectedState = pattern.state;
      detectedCountry = pattern.countryCode;
      break;
    }
  }
  if (!detectedCity && /\b(IL|Illinois)\s*(60\d{3})\b/i.test(normalized)) {
    detectedCity = 'Chicago';
    detectedState = 'IL';
    detectedCountry = 'US';
  }
  if (!detectedCity && /\b(CA|California)\s*(941\d{2})\b/i.test(normalized)) {
    detectedCity = 'San Francisco';
    detectedState = 'CA';
    detectedCountry = 'US';
  }
  if (!detectedCountry) {
    detectedCountry = CURRENCY_COUNTRY.find(([re]) => re.test(normalized))?.[1] || countryFromScript(normalized);
  }

  const merchantName = pickMerchantName(lines, detectedCountry);

  // 2. Amounts
  let preTaxSubtotal = 0;
  let tax = 0;
  let total = 0;
  let serviceCharge = 0;
  let serviceChargeIncluded = false;
  let serviceChargeDescription = '';
  const surcharges: ReceiptSurcharge[] = [];
  const items: ReceiptItem[] = [];
  const totalCandidates: number[] = [];
  // Amounts on lines without a recognised label, in receipt order (used when labels are unreadable)
  const unlabelled: number[] = [];
  // Tax rate printed on the tax line ("IVA 10%", "MwSt 19%"), used to cross-check misread amounts
  let taxRate = 0;

  for (const line of lines) {
    const money = extractMoney(line);

    // San Francisco Health Mandate / Health Surcharges
    if (/\b(sf\s*mandate|healthy\s*sf|health\s*surcharge|sf\s*health|san\s*francisco\s*health|wellness\s*fee|employee\s*health)\b/i.test(line)) {
      surcharges.push({ name: 'San Francisco Health Mandate / Surcharge', amount: money || 0, isHealthOrMandate: true });
      continue;
    }
    // Kitchen Appreciation / Back of House Surcharges
    if (/\b(kitchen\s*appreciation|boh\s*fee|kitchen\s*surcharge|culinary\s*fee)\b/i.test(line)) {
      surcharges.push({ name: 'Kitchen / Back of House Surcharge', amount: money || 0, isHealthOrMandate: false });
      continue;
    }
    // Service charge already on the bill
    if (SERVICE_RE.test(line)) {
      if (money !== null) serviceCharge += money;
      serviceChargeIncluded = true;
      serviceChargeDescription = line;
      continue;
    }
    if (SUBTOTAL_RE.test(line)) {
      if (money !== null) preTaxSubtotal = money;
      continue;
    }
    // "合計(税込)" / "Total incl. VAT" are totals even though they mention tax
    const isTotal = TOTAL_RE.test(line);
    const taxIncludedTotal = isTotal && /税込|稅込|込|incl|inkl|ttc|含税|含稅|포함/i.test(line);
    // "VAT No. GB 123 4567 89", "GST Reg 12-345", "Tax ID ..." are registration numbers, not amounts
    if (TAX_RE.test(line) && /\b(no|nr|n°|number|reg(istration)?|id|tin|abn|uid|siret)\b\.?|#|登记|登記|番号|번호/i.test(line) && !/[$€£¥₩฿]/.test(line)) {
      continue;
    }
    if (TAX_RE.test(line) && !taxIncludedTotal) {
      const rate = line.match(/(\d{1,2}(?:[.,]\d{1,3})?)\s*%/);
      if (rate && taxRate === 0) taxRate = parseFloat(rate[1].replace(',', '.')) / 100;
      if (money !== null && tax === 0) tax = money;
      continue;
    }
    if (isTotal) {
      if (money !== null) totalCandidates.push(money);
      continue;
    }
    // Item lines
    if (money !== null && totalCandidates.length === 0) unlabelled.push(money);
    if (money !== null && items.length < 25) {
      const name = line
        .replace(/[$€£¥₩฿₫₹₱]?\s*\d[\d.,\s']*(元|円|원|บาท)?\s*$/u, '')
        .replace(/\s+\d+\s*(份|个|個|点|點|개|x)?\s*$/iu, '')
        .trim();
      if ((name.match(/\p{L}/gu) || []).length >= 2 && !NOT_AN_ITEM.test(name)) {
        items.push({ name, qty: 1, price: money });
      }
    }
  }

  // Receipts repeat the amount due (order total, amount due, paid...), while OCR misreads tend to be
  // one-offs: take the most frequent total, preferring the larger on a tie
  if (totalCandidates.length) {
    const counts = new Map<number, number>();
    for (const v of totalCandidates) counts.set(v, (counts.get(v) || 0) + 1);
    total = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0][0];
  }

  const totalSurcharges = surcharges.reduce((acc, s) => acc + s.amount, 0);
  const round2 = (n: number) => Math.round(n * 100) / 100;
  const near = (a: number, b: number) => Math.abs(a - b) < 0.015;

  // Labels unreadable: an amount equal to the sum of the amounts above it is the subtotal, and what
  // remains up to the total is tax (e.g. items, 30,000 / 3,000 / total 33,000)
  // The run of items may start after stray numbers (street numbers, table numbers), so any start works.
  structural: if (preTaxSubtotal === 0 && total > 0 && unlabelled.length >= 3) {
    for (let i = unlabelled.length - 1; i >= 2; i--) {
      if (unlabelled[i] > total + 0.01) continue;
      const rest = round2(unlabelled.slice(i + 1).reduce((a, b) => a + b, 0));
      if (!near(unlabelled[i] + rest + serviceCharge + totalSurcharges, total)) continue;
      for (let j = 0; j <= i - 2; j++) {
        const run = round2(unlabelled.slice(j, i).reduce((a, b) => a + b, 0));
        if (near(unlabelled[i], run)) {
          preTaxSubtotal = unlabelled[i];
          if (tax === 0) tax = rest;
          const drop = new Set([unlabelled[i], rest]);
          items.splice(0, items.length, ...items.filter((it) => ![...drop].some((v) => near(it.price, v))));
          break structural;
        }
      }
    }
  }

  // If subtotal was not explicitly found, infer it strictly excluding tax and surcharges
  if (preTaxSubtotal === 0 && total > 0) {
    preTaxSubtotal = Math.max(0, Math.round((total - tax - totalSurcharges - serviceCharge) * 100) / 100);
  }
  // If total was not explicitly found, compute it
  if (total === 0 && preTaxSubtotal > 0) {
    total = Math.round((preTaxSubtotal + tax + totalSurcharges + serviceCharge) * 100) / 100;
  }
  // A subtotal larger than the total is an OCR misread (e.g. a lost decimal point); trust the total
  if (total > 0 && preTaxSubtotal > total) {
    preTaxSubtotal = Math.max(0, round2(total - tax - totalSurcharges - serviceCharge));
  }
  // A printed tax rate settles which amount was misread: tax should equal rate x taxed base (subtotal
  // plus service charge and fees). If it doesn't, rebuild subtotal and tax from the total and the rate.
  if (total > 0 && taxRate > 0 && taxRate < 0.3 && preTaxSubtotal > 0) {
    const base = preTaxSubtotal + serviceCharge + totalSurcharges;
    const addsUp = near(preTaxSubtotal + tax + serviceCharge + totalSurcharges, total);
    const rateFits = Math.abs(base * taxRate - tax) <= Math.max(0.02, tax * 0.02);
    // Tax-inclusive receipts (VAT already in the prices) are consistent with tax = total x r/(1+r)
    const inclusiveFits = near(round2(total - total / (1 + taxRate)), tax) && near(preTaxSubtotal + tax, total);
    if (!(addsUp && rateFits) && !inclusiveFits) {
      const taxedBase = round2(total / (1 + taxRate));
      const sub = round2(taxedBase - serviceCharge - totalSurcharges);
      if (sub > 0) {
        preTaxSubtotal = sub;
        tax = round2(total - taxedBase);
      }
    }
  }

  // Subtotal + tax + service + fees should equal the total. The total is usually the clearest line
  // (often printed twice), so a tax that doesn't add up is re-derived from it, within a sane range.
  if (total > 0 && preTaxSubtotal > 0) {
    const implied = round2(total - preTaxSubtotal - serviceCharge - totalSurcharges);
    if (!near(preTaxSubtotal + tax + serviceCharge + totalSurcharges, total) && implied >= 0 && implied <= preTaxSubtotal * 0.35) {
      tax = implied;
    }
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
    serviceType: detectServiceType(normalized),
    rawText: text,
  };
}
