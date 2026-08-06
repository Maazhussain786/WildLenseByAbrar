import { CITIES, type Country } from '@/data/cities';
import { LEGS, TOTAL_DISTANCE_KM, VISITED_CITIES, type Leg, type LegMode } from '@/data/legs';

export const MODE_LABEL: Record<LegMode, string> = {
  ride: 'Ride',
  stay: 'In town',
  ferry: 'Ferry',
  flight: 'Flight',
  train: 'Train',
};

/** Header stat line. */
export const JOURNEY_STATS = {
  legs: LEGS.length,
  cities: VISITED_CITIES.length,
  distanceKm: TOTAL_DISTANCE_KM,
  countries: [...new Set(VISITED_CITIES.map((c) => CITIES[c].country))] as Country[],
};

/**
 * Legs grouped into the country they end up in, so the sidebar can show where
 * one leg of the trip becomes the next.
 */
export function groupByCountry(legs: Leg[]): { country: Country; legs: Leg[] }[] {
  const out: { country: Country; legs: Leg[] }[] = [];
  for (const leg of legs) {
    const country = CITIES[leg.toCity].country;
    const last = out[out.length - 1];
    if (last && last.country === country) last.legs.push(leg);
    else out.push({ country, legs: [leg] });
  }
  return out;
}

export function formatKm(km: number): string {
  return `${Math.round(km).toLocaleString('en-US')} km`;
}
