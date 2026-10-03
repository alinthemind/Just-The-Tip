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
  summary?: string;
  summaryDisclosure?: string;
  reviews?: VenueReview[];
}

// Names the app uses when it couldn't read one; searching Google for these would find a random venue
const PLACEHOLDER_NAMES = /^(restaurant bill|receipt|unknown)$/i;

export const isRealVenueName = (name?: string) => Boolean(name && name.trim().length >= 3 && !PLACEHOLDER_NAMES.test(name.trim()));

/** Google Places details for the venue, or null when lookup isn't configured, fails or finds nothing */
export async function lookupVenue(query: {
  name: string;
  city?: string;
  latitude?: number | null;
  longitude?: number | null;
  lang: string;
}): Promise<VenueInfo | null> {
  if (!isRealVenueName(query.name) || !(await venueLookupAvailable())) return null;
  try {
    const res = await fetch('/api/venue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(query),
    });
    if (!res.ok) return null;
    const info: VenueInfo = await res.json();
    return info.found ? info : null;
  } catch {
    return null;
  }
}

/** A Google Maps search for the venue, used when there's no exact place (no key, or not found) */
export function mapsSearchUrl(name: string | undefined, place: string | undefined): string {
  const query = [isRealVenueName(name) ? name : '', place].filter(Boolean).join(' ');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query || 'restaurants')}`;
}
