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

export function requestBrowserGps(): Promise<UserLocation> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      const saved = getSavedLocation();
      resolve({ ...saved, error: 'Geolocation is not supported by your browser' });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const loc = await reverseGeocodeCoords(latitude, longitude);
        resolve(loc);
      },
      (error) => {
        console.warn('Geolocation error:', error.message);
        const saved = getSavedLocation();
        resolve({
          ...saved,
          isGps: false,
          error: error.message || 'Location access denied or unavailable',
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
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
  saveLocation(loc);
  return loc;
}
