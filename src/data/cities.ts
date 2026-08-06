/**
 * Static gazetteer for every place on the Pakistan -> Saudi Arabia route.
 *
 * Deliberately a hand-maintained table rather than a live geocoding call: the
 * site then has no runtime network dependency and the map renders identically
 * on every load. Coordinates are city-centre points (or the site itself for
 * landmarks such as Persepolis and Babylon).
 *
 * To correct a location, edit the `coords` pair here — every leg that
 * references the city picks the change up automatically.
 */

export type Country = 'Pakistan' | 'Iran' | 'Iraq' | 'Kuwait' | 'Saudi Arabia';

export type City = {
  /** Display name, also the key used by legs. */
  name: string;
  country: Country;
  /** [lat, lng] */
  coords: [number, number];
  /** Set when the exact point is an approximation worth verifying. */
  needsReview?: boolean;
  /** Shown in the UI when the place is not a city proper. */
  note?: string;
};

export const CITIES = {
  // ---------------------------------------------------------------- Pakistan
  Quetta: { name: 'Quetta', country: 'Pakistan', coords: [30.1798, 66.975] },
  Taftan: {
    name: 'Taftan',
    country: 'Pakistan',
    coords: [28.9481, 61.5906],
    note: 'Pakistan–Iran border crossing',
  },

  // -------------------------------------------------------------------- Iran
  Iranshahr: { name: 'Iranshahr', country: 'Iran', coords: [27.2025, 60.6848] },
  Chabahar: { name: 'Chabahar', country: 'Iran', coords: [25.2919, 60.643] },
  'Bandar-e Jask': { name: 'Bandar-e Jask', country: 'Iran', coords: [25.6465, 57.7742] },
  'Bandar Abbas': { name: 'Bandar Abbas', country: 'Iran', coords: [27.1865, 56.2808] },
  Qeshm: {
    name: 'Qeshm',
    country: 'Iran',
    coords: [26.9581, 56.2719],
    note: 'Qeshm Island, reached by ferry',
  },
  Shiraz: { name: 'Shiraz', country: 'Iran', coords: [29.5918, 52.5837] },
  Persepolis: {
    name: 'Persepolis',
    country: 'Iran',
    coords: [29.9354, 52.8916],
    note: 'Achaemenid ruins north of Shiraz',
  },
  Mashhad: { name: 'Mashhad', country: 'Iran', coords: [36.2605, 59.6168] },
  Tehran: { name: 'Tehran', country: 'Iran', coords: [35.6892, 51.389] },
  'Bandar Mahshahr': { name: 'Bandar Mahshahr', country: 'Iran', coords: [30.5589, 49.1981] },

  // -------------------------------------------------------------------- Iraq
  Basra: { name: 'Basra', country: 'Iraq', coords: [30.5081, 47.7835] },
  'Al Qurna': { name: 'Al Qurna', country: 'Iraq', coords: [31.0114, 47.4306] },
  Chibayish: {
    name: 'Chibayish',
    country: 'Iraq',
    coords: [30.9631, 46.9186],
    note: 'Mesopotamian Marshes',
  },
  Najaf: { name: 'Najaf', country: 'Iraq', coords: [31.9959, 44.3148] },
  Karbala: { name: 'Karbala', country: 'Iraq', coords: [32.616, 44.0249] },
  Baghdad: { name: 'Baghdad', country: 'Iraq', coords: [33.3152, 44.3661] },
  Samarra: { name: 'Samarra', country: 'Iraq', coords: [34.1959, 43.8748] },
  Hillah: { name: 'Hillah', country: 'Iraq', coords: [32.4637, 44.4197] },
  Babylon: {
    name: 'Babylon',
    country: 'Iraq',
    coords: [32.5355, 44.4207],
    note: 'Ancient city beside Hillah',
  },

  // ------------------------------------------------------------------ Kuwait
  'Kuwait City': { name: 'Kuwait City', country: 'Kuwait', coords: [29.3759, 47.9774] },
  Salmiya: { name: 'Salmiya', country: 'Kuwait', coords: [29.3394, 48.0761] },
  Mangaf: { name: 'Mangaf', country: 'Kuwait', coords: [29.0972, 48.1306] },

  // ------------------------------------------------------------ Saudi Arabia
  'Qaryat Al Ulya': {
    name: 'Qaryat Al Ulya',
    country: 'Saudi Arabia',
    coords: [27.5561, 47.6931],
    note: 'First town after the Kuwait border',
  },
  Riyadh: { name: 'Riyadh', country: 'Saudi Arabia', coords: [24.7136, 46.6753] },
  Diriyah: {
    name: 'Diriyah',
    country: 'Saudi Arabia',
    coords: [24.737, 46.5758],
    note: 'Historic quarter on the edge of Riyadh',
  },
  Medina: { name: 'Medina', country: 'Saudi Arabia', coords: [24.4686, 39.6142] },
  Mecca: { name: 'Mecca', country: 'Saudi Arabia', coords: [21.3891, 39.8579] },
  Khaybar: { name: 'Khaybar', country: 'Saudi Arabia', coords: [25.6981, 39.2917] },
  'Wadi Al-Jinn': {
    name: 'Wadi Al-Jinn',
    country: 'Saudi Arabia',
    coords: [24.6539, 39.3222],
    needsReview: true,
    note: 'Magnetic valley NW of Medina — approximate point',
  },
} as const satisfies Record<string, City>;

export type CityName = keyof typeof CITIES;

export function getCity(name: CityName): City {
  return CITIES[name];
}

/**
 * Route colours, one per country.
 *
 * These walk a single monotonic hue ramp in journey order — rose, violet,
 * azure, teal, green — so the colour encodes *progress* as well as country:
 * read west-to-east the route shifts through the spectrum, and the header
 * legend shows the same ramp left to right. Chroma and lightness are held
 * roughly constant so the five read as one family rather than a random set.
 *
 * The ramp deliberately stops short of orange. That band is reserved for the
 * highlight (`ROUTE_ACTIVE` in lib/mapLayers.ts) so a hovered leg can never be
 * confused with a country colour — the previous palette had Saudi Arabia in
 * amber, which collided with exactly that.
 *
 * All five are mid-tone, so they hold up both on the bright terrain basemap
 * (helped by the dark casing under each route) and on the dark sidebar.
 */
export const COUNTRY_COLORS: Record<Country, string> = {
  Pakistan: '#e84a7b', // rose
  Iran: '#9b5de5', // violet
  Iraq: '#3a86e0', // azure
  Kuwait: '#06b49a', // teal
  'Saudi Arabia': '#7fb236', // green
};
