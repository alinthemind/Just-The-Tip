import { venueLookupAvailable } from './serverConfig';

export interface VenueReview {
  text: string;
  rating?: number;
  author?: string;
  authorUri?: string;
  when?: string;
  uri?: string;
}

export interface VenueInfo {
  found: boolean;
  name?: string;
  address?: string;
  rating?: number;
  ratingCount?: number;
  mapsUri?: string;
  reviewsUri?: string;
  writeReviewUri?: string;
  type?: string;
  /** 1 (inexpensive) to 4 (very expensive) */
  priceLevel?: number;
  about?: string;
  openNow?: boolean;
  /** Opening hours per day, Monday first, already in the app's language */
  hours?: string[];
  phone?: string;
  website?: string;
  summary?: string;
  summaryDisclosure?: string;
  reviews?: VenueReview[];
}

// Names the app uses when it couldn't read one; searching Google for these would find a random venue
const PLACEHOLDER_NAMES = /^(restaurant bill|receipt|unknown)$/i;

export const isRealVenueName = (name?: string) => Boolean(name && name.trim().length >= 3 && !PLACEHOLDER_NAMES.test(name.trim()));

/** What's known about the venue from the receipt */
export interface VenueClues {
  name?: string;
  address?: string;
  phone?: string;
  city?: string;
}

/**
 * The most specific search for the venue that the receipt allows: name with street address, name with
 * city, the phone number, or the street address alone. Null when the receipt names no venue, phone or
 * address (a city alone would find a random place).
 */
export function venueSearchQuery({ name, address, phone, city }: VenueClues): string | null {
  const realName = isRealVenueName(name) ? name!.trim() : '';
  const cityMissing = (text: string) => city && !text.toLowerCase().includes(city.toLowerCase());
  if (realName && address) return [realName, address, cityMissing(address) ? city : ''].filter(Boolean).join(', ');
  if (realName) return [realName, city].filter(Boolean).join(' ');
  if (phone) return phone;
  if (address) return [address, cityMissing(address) ? city : ''].filter(Boolean).join(', ');
  return null;
}

/** Google Places details for the venue, or null when lookup isn't configured, fails or finds nothing */
export async function lookupVenue(clues: VenueClues & { latitude?: number | null; longitude?: number | null; lang: string }): Promise<VenueInfo | null> {
  const query = venueSearchQuery(clues);
  if (!query || !(await venueLookupAvailable())) return null;
  try {
    const res = await fetch('/api/venue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, latitude: clues.latitude, longitude: clues.longitude, lang: clues.lang }),
    });
    if (!res.ok) return null;
    const info: VenueInfo = await res.json();
    return info.found ? info : null;
  } catch {
    return null;
  }
}

/**
 * A Google Maps search for the venue, used when the exact place isn't known (no Maps key, or not found).
 * Without anything specific on the receipt, it searches near the photo's location, else the city.
 */
export function mapsSearchUrl(clues: VenueClues & { latitude?: number | null; longitude?: number | null; nearPhoto?: boolean }): string {
  const query = venueSearchQuery(clues);
  if (query) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  if (clues.nearPhoto && Number.isFinite(clues.latitude) && Number.isFinite(clues.longitude)) {
    return `https://www.google.com/maps/search/restaurants/@${clues.latitude},${clues.longitude},18z`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(['restaurants', clues.city].filter(Boolean).join(' '))}`;
}
