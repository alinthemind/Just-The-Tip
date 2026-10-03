/**
 * Finds tipping comments, deals and happy hours in free text (receipt lines, Google reviews).
 * Runs on the phone; also safe on the server (no browser-only APIs).
 */

// Talk about tipping, in the app's languages
const TIP_RE =
  /\b(tip(s|ped|ping)?|gratuit(y|ies)|service\s*(charge|fee)|auto[-\s]?grat|pourboire|propina|trinkgeld|mancia|gorjeta|bedienungsgeld|servizio|coperto)\b|小费|小費|服务费|服務費|加一|チップ|心付け|サービス料|팁|봉사료|ทิป|ทิปส์|ค่าบริการ/i;

// Happy hour, in the app's languages
const HAPPY_HOUR_RE = /happy\s*hours?|hora\s*feliz|heure\s*joyeuse|欢乐时光|歡樂時光|ハッピーアワー|해피\s*아워|แฮปปี้\s*อาวร์/i;

// Discounts and offers (not happy hour, which is listed separately)
const DEAL_RE = new RegExp(
  [
    String.raw`\d+\s*%\s*(off|discount|de\s*descuento|de\s*r[ée]duction|rabatt|sconto|desconto)`,
    String.raw`\b(discount|coupon|voucher|promo(tion)?\s*code|use\s+code|code\s*[:：]\s*[A-Z0-9]{3,}|special\s+offer|buy\s+\d+\s*,?\s*get|bogo|two\s+for\s+one|2\s*for\s*1|loyalty|stamp\s*card|next\s+visit|free\s+(drink|dessert|coffee|beer|wine|appetizer|starter|shot|refill|item|meal|side|upgrade|gift)s?|for\s+free|on\s+the\s+house|complimentary)\b`,
    String.raw`\b(review\s+us|leave\s+(us\s+)?a\s+review|rate\s+us)\b`,
    String.raw`\b(r[ée]duction|remise|offert|descuento|cup[oó]n|gratis|rabatt|gutschein|sconto|omaggio|desconto|cupom|gr[aá]tis)\b`,
    String.raw`\d\s*折|折扣|优惠|優惠|打折|免费|免費|赠送|贈送|买一送一|買一送一|クーポン|割引|無料|サービス券|할인|쿠폰|무료|증정|ส่วนลด|ฟรี|คูปอง`,
  ].join('|'),
  'i'
);

// Pricing specials: reduced prices on certain items or days, set menus
const SPECIAL_RE = new RegExp(
  [
    String.raw`\b(half[-\s]?price|half\s+off|(lunch|dinner|daily|weekday|weekend|early[-\s]?bird|chef'?s|today'?s)\s+specials?|specials\b|prix[-\s]fixe|set\s+(menu|lunch|dinner)|fixed[-\s]price|all[-\s]you[-\s]can[-\s](eat|drink)|bottomless|kids\s+eat\s+free|(taco|wing|burger|oyster|pizza|sushi)\s+(mon|tues|wednes|thurs|fri|satur|sun)day|menu\s+du\s+jour|formule|men[uú]\s+del\s+d[ií]a|mittagstisch|tagesmen[uü]|menu\s+fisso|prato\s+do\s+dia)\b`,
    // "$1 wings on Mondays", "$2 tacos all day" ($ can't sit inside the \b group above)
    String.raw`[$€£]\s?\d+(\.\d\d)?\s+([a-z]+\s+){0,3}(on\s+)?((mon|tues|wednes|thurs|fri|satur|sun)days?|all\s+day|each|every)\b`,
    String.raw`早鸟|早鳥|特价|特價|套餐|午市|商务午餐|商務午餐|ランチセット|日替わり|特価|お得|런치\s*세트|특가|세트\s*메뉴|ราคาพิเศษ|เซ็ตเมนู`,
  ].join('|'),
  'i'
);

export type OfferKind = 'happyHour' | 'special' | 'deal';

/** Which kind of offer a sentence or line describes, if any */
function offerKind(s: string): OfferKind | null {
  if (HAPPY_HOUR_RE.test(s)) return 'happyHour';
  if (SPECIAL_RE.test(s)) return 'special';
  if (DEAL_RE.test(s) && !NOT_A_DEAL.test(s)) return 'deal';
  return null;
}

export interface Offers {
  happyHours: string[];
  specials: string[];
  deals: string[];
}

// "Gluten free", "sugar free"... are not offers
const NOT_A_DEAL = /\b(gluten|sugar|dairy|lactose|nut|fat|alcohol|caffeine|smoke|duty|tax|toll)[\s-]*free\b/i;

/** Split review text into sentences (handles CJK and Thai punctuation) */
function sentences(text: string): string[] {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+|(?<=[。！？])|\s+(?=[-•·]\s)/)
    .map((s) => s.trim())
    .filter((s) => s.length > 3);
}

const clip = (s: string, max = 220) => (s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s);

/** The sentences of a review that talk about tipping */
export function tippingSentences(text: string): string[] {
  return sentences(text).filter((s) => TIP_RE.test(s)).slice(0, 2).map((s) => clip(s));
}

// Talk about the service and staff
const SERVICE_RE =
  /\b(service|staff|server|waiter|waitress|waitstaff|bartender|host(ess)?|manager|attentive|friendly|rude|welcom(e|ing)|helpful|ignored|wait(ed|ing)?|servicio|personal|camarer[oa]|meser[oa]|serveur|serveuse|personnel|accueil|bedienung|kellner|personale|cameriere|atendimento|empregad[oa]|gar[cç]om)\b|服务|服務|店员|店員|服务员|服務生|态度|態度|接客|サービス|スタッフ|직원|서비스|친절|พนักงาน|บริการ/i;
// Something went wrong (any topic: service, food, billing, cleanliness)
const ISSUE_RE =
  /\b(rude|slow|ignored|long\s+wait|waited\s+(over\s+)?\d+|forgot|forgotten|wrong\s+(order|dish|bill)|overcharg\w*|charged\s+(us\s+)?(for|twice|extra)|hidden\s+(fee|charge)|cold\s+food|food\s+was\s+cold|dirty|unfriendly|unprofessional|never\s+came|terrible|awful|horrible|worst|disappoint\w*|mistake|sick|grosero|lento|malo|horrible|sucio|lent|sale|pire|mauvais|d[ée]cevant|langsam|unfreundlich|schlecht|scortese|pessimo|lento|sporco|ruim|demorado)\b|态度差|態度差|太慢|等了很久|脏|髒|失望|难吃|難吃|遅い|最悪|不親切|待たされ|불친절|느리|별로|실망|ช้า|แย่|ไม่ดี|ผิดหวัง/i;
const PRAISE_RE =
  /\b(friendly|attentive|great|excellent|amazing|wonderful|helpful|quick|fast|lovely|welcoming|professional|kind|best|fantastic|outstanding|warm|polite|amable|excelente|atento|r[aá]pido|sympa|accueillant|aimable|freundlich|aufmerksam|toll|gentile|ottimo|cordiale|simp[aá]tico|[oó]timo)\b|热情|熱情|周到|很好|亲切|親切|丁寧|最高|친절|최고|좋았|ประทับใจ|ดีมาก|น่ารัก/i;

/** What reviews say about the service, split into praise and reported issues */
export function serviceSentences(text: string): { praise: string[]; issues: string[] } {
  const praise: string[] = [];
  const issues: string[] = [];
  for (const s of sentences(text)) {
    if (TIP_RE.test(s)) continue; // shown with the tipping comments
    if (ISSUE_RE.test(s)) issues.push(clip(s));
    else if (SERVICE_RE.test(s) && PRAISE_RE.test(s)) praise.push(clip(s));
  }
  return { praise: praise.slice(0, 2), issues: issues.slice(0, 2) };
}

/** Sentences of a review that mention a happy hour, a pricing special or a deal */
export function offerSentences(text: string): Offers {
  const out: Offers = { happyHours: [], specials: [], deals: [] };
  for (const s of sentences(text)) {
    const kind = offerKind(s);
    if (kind === 'happyHour') out.happyHours.push(clip(s));
    else if (kind === 'special') out.specials.push(clip(s));
    else if (kind === 'deal') out.deals.push(clip(s));
  }
  return { happyHours: out.happyHours.slice(0, 2), specials: out.specials.slice(0, 2), deals: out.deals.slice(0, 2) };
}

// A price at the end of a line ("Happy Hour Pint 5.00") means it's an item, not an offer
const ENDS_WITH_PRICE = /\d[\d.,]*\s*(元|円|원|บาท|€)?\s*$/;
const CONTINUES = /^(and|&|to|for|get|on|with|y|et|und|e|valid|only|mon|tue|wed|thu|fri|sat|sun|daily|every)\b/i;

/**
 * Offer lines printed on a receipt ("Review us on Google for a free drink", "10% off next visit with
 * code SAVE10", "Happy Hour Mon-Fri 4-6pm"). A wrapped second line is joined on.
 */
export function receiptOffers(rawText: string): Offers {
  const lines = (rawText || '').split('\n').map((l) => l.trim()).filter(Boolean);
  const found: Offers = { happyHours: [], specials: [], deals: [] };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const kind = offerKind(line);
    if (!kind) continue;
    const isHappy = kind === 'happyHour';
    // Item lines with a price (e.g. a happy-hour drink) aren't offers, unless they state the offer itself
    // ("Lunch Special 12.50" is something that was ordered; "lunch special 2 courses for £15" is an offer)
    const statesOffer =
      /%|code|coupon|voucher|off\b/i.test(line) ||
      (isHappy && /\d\s*(am|pm|:\d\d|h\b|時|点|點|시)/i.test(line)) ||
      (kind === 'special' && /\b(for|from|each|all\s+day|only)\b|(mon|tue|wed|thu|fri|sat|sun)/i.test(line));
    if (ENDS_WITH_PRICE.test(line) && !statesOffer) continue;
    let text = line;
    const next = lines[i + 1];
    if (next && !ENDS_WITH_PRICE.test(next) && (CONTINUES.test(next) || /^[a-z]/.test(next) || (isHappy && /\d/.test(next) && next.length < 40))) {
      text = `${line} ${next}`;
      i++;
    }
    (kind === 'happyHour' ? found.happyHours : kind === 'special' ? found.specials : found.deals).push(clip(text, 160));
  }
  const unique = (xs: string[]) => [...new Set(xs)].slice(0, 3);
  return { happyHours: unique(found.happyHours), specials: unique(found.specials), deals: unique(found.deals) };
}

/** Tipping lines printed on a receipt: service charges, suggested gratuity, "tips appreciated"... */
export function receiptTipLines(rawText: string): string[] {
  const lines = (rawText || '').split('\n').map((l) => l.trim()).filter((l) => l.length > 3);
  const found = lines.filter((l) => TIP_RE.test(l) || /suggested|gratuity\s+guide|tips?\s+appreciated/i.test(l));
  return [...new Set(found.map((l) => clip(l, 120)))].slice(0, 4);
}
