import { UserLocation } from '../types';
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
      return JSON.parse(saved);
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

export function requestBrowserGps(): Promise<UserLocation> {
  return new Promise((resolve) => {
    // 1. Try browser device GPS first with a responsive timeout (3500ms)
    if (navigator.geolocation) {
      let isSettled = false;

      const timeoutId = setTimeout(async () => {
        if (!isSettled) {
          isSettled = true;
          console.warn('Browser GPS timed out, falling back to IP network location');
          const ipLoc = await getIpLocation();
          if (ipLoc) {
            resolve(ipLoc);
          } else {
            const saved = getSavedLocation();
            resolve({ ...saved, error: 'GPS request timed out' });
          }
        }
      }, 3500);

      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          if (isSettled) return;
          isSettled = true;
          clearTimeout(timeoutId);
          try {
            const { latitude, longitude } = pos.coords;
            const loc = await reverseGeocodeCoords(latitude, longitude);
            loc.source = 'gps';
            resolve(loc);
          } catch (geoErr) {
            const ipLoc = await getIpLocation();
            resolve(ipLoc || getSavedLocation());
          }
        },
        async (error) => {
          if (isSettled) return;
          isSettled = true;
          clearTimeout(timeoutId);
          console.warn('Browser GPS access denied or unavailable, trying IP location:', error.message);
          // Automatic seamless fallback to IP location
          const ipLoc = await getIpLocation();
          if (ipLoc) {
            resolve(ipLoc);
          } else {
            const saved = getSavedLocation();
            resolve({
              ...saved,
              isGps: false,
              error: error.message || 'Location access denied or unavailable',
            });
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 3500,
          maximumAge: 30000,
        }
      );
      return;
    }

    // 2. If navigator.geolocation not supported at all, fallback directly to IP location
    getIpLocation().then((ipLoc) => {
      if (ipLoc) {
        resolve(ipLoc);
      } else {
        const saved = getSavedLocation();
        resolve({ ...saved, error: 'Geolocation is not supported by your browser' });
      }
    });
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
  saveLocation(loc);
  return loc;
}
