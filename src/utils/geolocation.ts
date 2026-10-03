import { GpsErrorCode, UserLocation } from '../types';
import { getTippingRuleForCountry } from '../data/tippingCulture';

const LOCATION_STORAGE_KEY = 'globaltip_user_location';

export const DEFAULT_FALLBACK_LOCATION: UserLocation = {
  latitude: null,
  longitude: null,
  countryCode: 'US',
  countryName: 'United States',
  city: '',
  flag: '🇺🇸',
  currencyCode: 'USD',
  currencySymbol: '$',
  isGps: false,
  source: 'default',
};

export function getSavedLocation(): UserLocation {
  try {
    const saved = localStorage.getItem(LOCATION_STORAGE_KEY);
    if (saved) {
      const loc: UserLocation = JSON.parse(saved);
      // Older versions saved a scanned receipt's location here; it is not the device's location
      if (loc.source === 'receipt' || loc.source === 'photo-gps') {
        localStorage.removeItem(LOCATION_STORAGE_KEY);
        return DEFAULT_FALLBACK_LOCATION;
      }
      return loc;
    }
  } catch (e) {
    console.error('Failed to read saved location:', e);
  }
  return DEFAULT_FALLBACK_LOCATION;
}

export function saveLocation(location: UserLocation): void {
  try {
    localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(location));
  } catch (e) {
    console.error('Failed to save location:', e);
  }
}

export async function reverseGeocodeCoords(
  latitude: number,
  longitude: number
): Promise<UserLocation> {
  try {
    const res = await fetch('/api/reverse-geocode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ latitude, longitude }),
    });

    if (res.ok) {
      const data = await res.json();
      const loc: UserLocation = {
        latitude,
        longitude,
        countryCode: data.countryCode || 'US',
        countryName: data.countryName || 'United States',
        city: data.city || '',
        flag: data.flag || '📍',
        currencyCode: data.currencyCode || 'USD',
        currencySymbol: data.currencySymbol || '$',
        isGps: true,
      };
      saveLocation(loc);
      return loc;
    }
  } catch (err) {
    console.warn('Backend reverse geocode failed, using local rule:', err);
  }

  // Fallback if network issue
  const fallback = {
    ...DEFAULT_FALLBACK_LOCATION,
    latitude,
    longitude,
    isGps: true,
  };
  saveLocation(fallback);
  return fallback;
}

export async function getIpLocation(): Promise<UserLocation | null> {
  try {
    const res = await fetch('/api/ip-location');
    if (res.ok) {
      const data = await res.json();
      if (data && data.countryCode) {
        const rule = getTippingRuleForCountry(data.countryCode);
        const loc: UserLocation = {
          latitude: data.latitude || null,
          longitude: data.longitude || null,
          countryCode: data.countryCode,
          countryName: data.countryName || rule.countryName,
          city: data.city || rule.countryName,
          flag: rule.flag,
          currencyCode: rule.currencyCode,
          currencySymbol: rule.currencySymbol,
          isGps: false,
          source: 'ip',
        };
        saveLocation(loc);
        return loc;
      }
    }
  } catch (err) {
    console.warn('IP location fetch failed:', err);
  }
  return null;
}

/** Browsers (phones especially) only expose GPS on https or localhost */
export function canUseBrowserGps(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.geolocation && (typeof window === 'undefined' || window.isSecureContext);
}

async function ipFallback(
  errorCode: GpsErrorCode | undefined,
  error: string | undefined,
  ipPromise: Promise<UserLocation | null> = getIpLocation()
): Promise<UserLocation> {
  const ipLoc = await ipPromise;
  if (ipLoc) return { ...ipLoc, error, errorCode };
  return { ...getSavedLocation(), isGps: false, error, errorCode };
}

/**
 * Resolve the device location. The IP lookup starts at the same time as GPS and is passed to
 * `onUpdate` as soon as it arrives, so the UI never sits on a stale location while the phone gets
 * a fix (or waits for the permission prompt). A GPS fix that comes after the promise resolved is
 * also delivered through `onUpdate`.
 */
export async function requestBrowserGps(
  onUpdate?: (loc: UserLocation) => void,
  { prompt = true }: { prompt?: boolean } = {}
): Promise<UserLocation> {
  // Without `prompt`, only use GPS the user already allowed; never trigger the browser's permission prompt
  if (!prompt && canUseBrowserGps()) {
    const state = await navigator.permissions
      ?.query({ name: 'geolocation' as PermissionName })
      .then((status) => status.state)
      .catch(() => 'prompt');
    if (state !== 'granted') return ipFallback(undefined, undefined);
  }
  return requestGps(onUpdate);
}

function requestGps(onUpdate?: (loc: UserLocation) => void): Promise<UserLocation> {
  if (!canUseBrowserGps()) {
    return navigator.geolocation
      ? ipFallback('insecure', 'GPS needs a secure (https) connection')
      : ipFallback('unsupported', 'Geolocation is not supported by your browser');
  }

  return new Promise((resolve) => {
    let isSettled = false;
    let gotGps = false;

    const ipPromise = getIpLocation();
    ipPromise.then((ipLoc) => {
      if (ipLoc && !isSettled && !gotGps) onUpdate?.(ipLoc);
    });

    const startFallbackTimer = (ms: number) =>
      setTimeout(async () => {
        if (isSettled) return;
        isSettled = true;
        console.warn('Browser GPS is slow, using IP network location until it responds');
        resolve(await ipFallback('timeout', 'GPS request timed out', ipPromise));
      }, ms);

    // Give the user time to answer the permission prompt before falling back
    let timeoutId = startFallbackTimer(12000);
    navigator.permissions
      ?.query({ name: 'geolocation' as PermissionName })
      .then((status) => {
        if (status.state === 'prompt' && !isSettled) {
          clearTimeout(timeoutId);
          timeoutId = startFallbackTimer(30000);
        }
      })
      .catch(() => {});

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        clearTimeout(timeoutId);
        gotGps = true;
        const { latitude, longitude } = pos.coords;
        const loc = await reverseGeocodeCoords(latitude, longitude);
        loc.source = 'gps';
        if (isSettled) {
          onUpdate?.(loc);
          return;
        }
        isSettled = true;
        resolve(loc);
      },
      async (error) => {
        clearTimeout(timeoutId);
        if (isSettled) return;
        isSettled = true;
        console.warn('Browser GPS denied or unavailable, trying IP location:', error.message);
        const code: GpsErrorCode =
          error.code === error.PERMISSION_DENIED ? 'denied' : error.code === error.TIMEOUT ? 'timeout' : 'unavailable';
        resolve(await ipFallback(code, error.message || 'Location access denied or unavailable', ipPromise));
      },
      {
        // City-level accuracy is all tipping needs; Wi-Fi/cell positioning answers much faster than satellite GPS
        enableHighAccuracy: false,
        timeout: 20000,
        maximumAge: 60000,
      }
    );
  });
}

export function setManualLocation(countryCode: string, cityName = ''): UserLocation {
  const rule = getTippingRuleForCountry(countryCode);
  const loc: UserLocation = {
    latitude: null,
    longitude: null,
    countryCode: rule.countryCode,
    countryName: rule.countryName,
    city: cityName || (rule.countryCode === 'US' ? 'United States' : rule.countryName),
    flag: rule.flag,
    currencyCode: rule.currencyCode,
    currencySymbol: rule.currencySymbol,
    isGps: false,
    source: 'manual',
  };
  saveLocation(loc);
  return loc;
}

export function setLocationFromReceipt(city: string, state = '', countryCode = 'US'): UserLocation {
  const rule = getTippingRuleForCountry(countryCode);
  const formattedCity = state ? `${city}, ${state}` : city;
  const loc: UserLocation = {
    latitude: null,
    longitude: null,
    countryCode: rule.countryCode,
    countryName: rule.countryName,
    city: formattedCity,
    flag: rule.flag,
    currencyCode: rule.currencyCode,
    currencySymbol: rule.currencySymbol,
    isGps: false,
    source: 'receipt',
  };
  // Not saved: a receipt's location only applies while that receipt is open, so the stored
  // location (used for fallbacks and on reload) always stays the device's or the user's choice
  return loc;
}

/**
 * A fresh, precise position for finding the venue the user is sitting in. Only asked when location
 * access is already granted (a scan never pops up a permission prompt), and only kept when it's
 * accurate to ~150 m. Resolves null otherwise.
 */
export async function getVenueFix(): Promise<{ latitude: number; longitude: number; accuracy: number } | null> {
  try {
    if (!canUseBrowserGps() || !navigator.permissions) return null;
    const status = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
    if (status.state !== 'granted') return null;
    const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
      navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 8000, maximumAge: 120000 })
    );
    const { latitude, longitude, accuracy } = pos.coords;
    return accuracy <= 150 ? { latitude, longitude, accuracy } : null;
  } catch {
    return null;
  }
}
