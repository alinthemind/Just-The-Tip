import React, { useEffect, useState } from 'react';
import { AlertTriangle, BadgePercent, Clock, ExternalLink, Globe, HandCoins, MapPin, Phone, Star, Store, Tag, ThumbsUp } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { ScannedReceiptData } from '../types';
import { Card, IconTile, SectionCaption, TileColor } from './ui';
import { isRealVenueName, lookupVenue, mapsSearchUrl, VenueInfo } from '../utils/venue';
import { offerSentences, Offers, serviceSentences, tippingSentences } from '../utils/venueText';

// Google Places review languages for the app's languages (Klingon, Vulcan and Latin read English)
const PLACES_LANG: Record<string, string> = { tlh: 'en', vul: 'en', la: 'en' };

/** Name, street address, phone and city read off the receipt */
const venueClues = (receipt: ScannedReceiptData) => ({
  name: receipt.merchantName,
  address: receipt.venueAddress,
  phone: receipt.venuePhone,
  city: receipt.city,
});

/** Looks the venue up on Google once per receipt (only when a Maps key is set and the name is real) */
export function useVenue(receipt: ScannedReceiptData, lang: string): VenueInfo | null {
  const [venue, setVenue] = useState<VenueInfo | null>(null);
  useEffect(() => {
    let alive = true;
    setVenue(null);
    lookupVenue({
      ...venueClues(receipt),
      // The phone's position only helps when it's where the receipt is from (not a city printed on it)
      latitude: receipt.locationSource === 'receipt' ? null : receipt.latitude,
      longitude: receipt.locationSource === 'receipt' ? null : receipt.longitude,
      lang: PLACES_LANG[lang] || lang,
    }).then((v) => alive && setVenue(v));
    return () => {
      alive = false;
    };
  }, [receipt.merchantName, receipt.venueAddress, receipt.venuePhone, receipt.city, receipt.latitude, receipt.longitude, receipt.locationSource, lang]);
  return venue;
}

const Stars: React.FC<{ rating: number }> = ({ rating }) => (
  <span className="inline-flex" aria-hidden="true">
    {[1, 2, 3, 4, 5].map((i) => (
      <Star
        key={i}
        className={`w-3.5 h-3.5 ${i <= Math.round(rating) ? 'fill-ig-yellow text-ig-yellow' : 'text-zinc-300 dark:text-zinc-600'}`}
      />
    ))}
  </span>
);

const Quote: React.FC<{ text: string; author?: string; authorUri?: string; when?: string }> = ({ text, author, authorUri, when }) => (
  <figure className="rounded-[14px] bg-[#767680]/[0.08] dark:bg-[#767680]/20 px-3 py-2.5">
    <blockquote className="text-[15px] leading-snug text-zinc-700 dark:text-zinc-300">“{text}”</blockquote>
    {author && (
      <figcaption className="mt-1 text-[12px] text-zinc-500 dark:text-zinc-400">
        —{' '}
        {authorUri ? (
          <a href={authorUri} target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline">
            {author}
          </a>
        ) : (
          author
        )}
        {when ? ` · ${when}` : ''}
      </figcaption>
    )}
  </figure>
);

const SubHeading: React.FC<{ icon: LucideIcon; className?: string; children: React.ReactNode }> = ({ icon: Icon, className = '', children }) => (
  <p className={`flex items-center gap-1.5 text-[13px] font-semibold mb-1.5 ${className || 'text-zinc-500 dark:text-zinc-400'}`}>
    <Icon className="w-4 h-4" />
    {children}
  </p>
);

const DetailRow: React.FC<{ icon: LucideIcon; href?: string; children: React.ReactNode }> = ({ icon: Icon, href, children }) => {
  const body = (
    <>
      <Icon className="w-4 h-4 mt-0.5 text-zinc-400 flex-shrink-0" />
      <span className="min-w-0 break-words">{children}</span>
    </>
  );
  const cls = 'flex items-start gap-2.5 text-[14px] leading-snug text-zinc-700 dark:text-zinc-300';
  return href ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={`${cls} hover:text-accent`}>
      {body}
    </a>
  ) : (
    <div className={cls}>{body}</div>
  );
};

/**
 * Summary of the venue: what it is, rating, hours and contact details; what reviewers say about the
 * service (praise and reported issues); and tip info from the receipt and from reviews. Receipt details
 * show without Google; the rest needs a Maps key.
 */
export const VenueSummary: React.FC<{ receipt: ScannedReceiptData; venue: VenueInfo | null; t: (key: string) => string }> = ({
  receipt,
  venue,
  t,
}) => {
  const reviews = venue?.reviews || [];
  const tipping = reviews.flatMap((r) => tippingSentences(r.text).map((text) => ({ ...r, text }))).slice(0, 3);
  // Low-rated reviews first, so real problems surface before passing gripes
  const byRating = [...reviews].sort((x, y) => (x.rating ?? 3) - (y.rating ?? 3));
  const issues = byRating.flatMap((r) => serviceSentences(r.text).issues.map((text) => ({ ...r, text }))).slice(0, 3);
  const praise = [...byRating].reverse().flatMap((r) => serviceSentences(r.text).praise.map((text) => ({ ...r, text }))).slice(0, 2);

  const name = venue?.name || (isRealVenueName(receipt.merchantName) ? receipt.merchantName : '');
  const address = venue?.address || receipt.venueAddress;
  const phone = venue?.phone || receipt.venuePhone;
  const tipNotes = receipt.receiptTipNotes || [];
  const todayHours = venue?.hours?.[(new Date().getDay() + 6) % 7];
  const subline = [venue?.type, venue?.priceLevel ? '$'.repeat(venue.priceLevel) : '', venue?.openNow == null ? '' : t(venue.openNow ? 'openNow' : 'closedNow')]
    .filter(Boolean)
    .join(' · ');

  if (!venue && !address && !phone && !tipNotes.length && !receipt.serviceChargeIncluded) return null;

  return (
    <div>
      <SectionCaption>{t('aboutVenue')}</SectionCaption>
      <Card className="px-4 py-3.5 space-y-3.5">
        <div className="flex items-center gap-3">
          <IconTile icon={Store} color="gradient" />
          <div className="flex-1 min-w-0">
            <p className="text-[17px] text-zinc-900 dark:text-white truncate">{name || receipt.merchantName}</p>
            {subline && <p className="text-[13px] text-zinc-500 dark:text-zinc-400 truncate">{subline}</p>}
            {venue?.rating != null && (
              <p className="flex items-center gap-1.5 text-[13px] text-zinc-500 dark:text-zinc-400">
                <span className="font-semibold text-zinc-900 dark:text-white tabular-nums">{venue.rating.toFixed(1)}</span>
                <Stars rating={venue.rating} />
                {venue.ratingCount != null && <span>{t('reviewsCount').replace('{n}', venue.ratingCount.toLocaleString())}</span>}
              </p>
            )}
          </div>
        </div>

        {(venue?.about || venue?.summary) && (
          <div>
            <p className="text-[15px] leading-snug text-zinc-700 dark:text-zinc-300">{venue.about || venue.summary}</p>
            {!venue.about && venue.summaryDisclosure && <p className="mt-1 text-[12px] text-zinc-400">{venue.summaryDisclosure}</p>}
          </div>
        )}
        {venue?.about && venue.summary && (
          <div>
            <p className="text-[15px] leading-snug text-zinc-700 dark:text-zinc-300">{venue.summary}</p>
            {venue.summaryDisclosure && <p className="mt-1 text-[12px] text-zinc-400">{venue.summaryDisclosure}</p>}
          </div>
        )}

        {(address || phone || todayHours || venue?.website) && (
          <div className="space-y-1.5">
            {address && (
              <DetailRow icon={MapPin} href={venue?.mapsUri || mapsSearchUrl({ name, address, city: receipt.city })}>
                {address}
              </DetailRow>
            )}
            {phone && (
              <DetailRow icon={Phone} href={`tel:${phone.replace(/[^\d+]/g, '')}`}>
                {phone}
              </DetailRow>
            )}
            {todayHours && <DetailRow icon={Clock}>{todayHours}</DetailRow>}
            {venue?.website && (
              <DetailRow icon={Globe} href={venue.website}>
                {venue.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
              </DetailRow>
            )}
          </div>
        )}

        {venue && (praise.length > 0 || issues.length > 0) && (
          <div className="space-y-3">
            {praise.length > 0 && (
              <div>
                <SubHeading icon={ThumbsUp} className="text-[#248a3d] dark:text-[#30d158]">{t('servicePraise')}</SubHeading>
                <div className="space-y-2">
                  {praise.map((q, i) => (
                    <Quote key={i} text={q.text} author={q.author} authorUri={q.authorUri} when={q.when} />
                  ))}
                </div>
              </div>
            )}
            {issues.length > 0 && (
              <div>
                <SubHeading icon={AlertTriangle} className="text-ig-orange">{t('serviceIssues')}</SubHeading>
                <div className="space-y-2">
                  {issues.map((q, i) => (
                    <Quote key={i} text={q.text} author={q.author} authorUri={q.authorUri} when={q.when} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {(venue || tipNotes.length > 0 || receipt.serviceChargeIncluded) && (
          <div>
            <SubHeading icon={HandCoins}>{t('tipInfo')}</SubHeading>
            <div className="space-y-2">
              {receipt.serviceChargeIncluded && (
                <p className="text-[14px] leading-snug text-zinc-700 dark:text-zinc-300">{t('serviceChargeOnBill')}</p>
              )}
              {tipNotes.map((line, i) => (
                <div key={`n${i}`} className="rounded-[14px] bg-[#767680]/[0.08] dark:bg-[#767680]/20 px-3 py-2.5">
                  <p className="text-[15px] leading-snug text-zinc-800 dark:text-zinc-200">{line}</p>
                  <p className="mt-0.5 text-[12px] text-zinc-500 dark:text-zinc-400">{t('fromReceipt')}</p>
                </div>
              ))}
              {tipping.map((q, i) => (
                <Quote key={`r${i}`} text={q.text} author={q.author} authorUri={q.authorUri} when={q.when} />
              ))}
              {venue && tipping.length === 0 && <p className="text-[14px] text-zinc-500 dark:text-zinc-400">{t('noTippingMentions')}</p>}
            </div>
          </div>
        )}

        {venue && (
          <div className="flex items-center justify-between pt-1 text-[13px]">
            {venue.reviewsUri && (
              <a href={venue.reviewsUri} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-accent">
                {t('readAllReviews')}
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
            <span className="text-zinc-400">Google Maps</span>
          </div>
        )}
      </Card>
    </div>
  );
};

const GROUPS: Array<{ key: keyof Offers; label: string; icon: LucideIcon; color: TileColor }> = [
  { key: 'happyHours', label: 'happyHour', icon: Clock, color: 'orange' },
  { key: 'specials', label: 'priceSpecials', icon: Tag, color: 'purple' },
  { key: 'deals', label: 'discounts', icon: BadgePercent, color: 'green' },
];

/** Happy hours, pricing specials and deals: printed on the receipt, or mentioned in Google reviews */
export const VenueDeals: React.FC<{ receipt: ScannedReceiptData; venue: VenueInfo | null; t: (key: string) => string }> = ({
  receipt,
  venue,
  t,
}) => {
  const fromReceipt: Offers = receipt.receiptOffers || { happyHours: [], specials: [], deals: [] };
  const fromReviews: Record<keyof Offers, Array<{ text: string; author?: string; authorUri?: string; when?: string }>> = {
    happyHours: [],
    specials: [],
    deals: [],
  };
  for (const r of venue?.reviews || []) {
    const found = offerSentences(r.text);
    for (const g of GROUPS) for (const text of found[g.key]) fromReviews[g.key].push({ ...r, text });
  }
  const groups = GROUPS.map((g) => ({ ...g, receipt: fromReceipt[g.key], reviews: fromReviews[g.key].slice(0, 2) })).filter(
    (g) => g.receipt.length || g.reviews.length
  );

  return (
    <div>
      <SectionCaption>{t('dealsTitle')}</SectionCaption>
      <Card className="px-4 py-3.5">
        {groups.length === 0 ? (
          <p className="text-[14px] text-zinc-500 dark:text-zinc-400">{t('noDeals')}</p>
        ) : (
          <div className="space-y-4">
            {groups.map((g) => (
              <div key={g.key}>
                <p className="flex items-center gap-2 mb-2 text-[15px] font-semibold text-zinc-900 dark:text-white">
                  <IconTile icon={g.icon} color={g.color} size="sm" />
                  {t(g.label)}
                </p>
                <div className="space-y-2">
                  {g.receipt.map((text, i) => (
                    <div key={`r${i}`} className="rounded-[14px] bg-[#767680]/[0.08] dark:bg-[#767680]/20 px-3 py-2.5">
                      <p className="text-[15px] leading-snug text-zinc-800 dark:text-zinc-200">{text}</p>
                      <p className="mt-0.5 text-[12px] text-zinc-500 dark:text-zinc-400">{t('fromReceipt')}</p>
                    </div>
                  ))}
                  {g.reviews.map((q, i) => (
                    <Quote key={`v${i}`} text={q.text} author={q.author ? `${q.author} · ${t('fromReviews')}` : t('fromReviews')} authorUri={q.authorUri} when={q.when} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

/** Opens Google's "write a review" for the venue, or a Maps search for it when the exact place isn't known */
export const RateOnGoogle: React.FC<{ receipt: ScannedReceiptData; venue: VenueInfo | null; t: (key: string) => string }> = ({
  receipt,
  venue,
  t,
}) => {
  const href =
    venue?.writeReviewUri ||
    mapsSearchUrl({ ...venueClues(receipt), latitude: receipt.latitude, longitude: receipt.longitude, nearPhoto: receipt.locationSource === 'photo-gps' });
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="w-full py-3.5 rounded-[16px] bg-white dark:bg-elevated text-zinc-900 dark:text-white text-[17px] font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
    >
      <span className="inline-flex">
        {[0, 1, 2, 3, 4].map((i) => (
          <Star key={i} className="w-4 h-4 fill-ig-yellow text-ig-yellow" />
        ))}
      </span>
      {t('rateOnGoogle')}
    </a>
  );
};
