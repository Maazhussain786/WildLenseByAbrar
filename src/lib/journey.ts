import { CITIES, type Country } from '@/data/cities';
import type { Leg, LegMode } from '@/data/types';

export const MODE_LABEL: Record<LegMode, string> = {
  ride: 'Ride',
  stay: 'In town',
  ferry: 'Ferry',
  flight: 'Flight',
  train: 'Train',
};

/**
 * Legs grouped into the country they end up in, so the sidebar shows where one
 * stretch of the journey becomes the next.
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
