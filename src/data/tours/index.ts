import rawGeometry from '../route-geometry.json';
import { CITIES, type CityName, type Country } from '../cities';
import type { AuthoredLeg, Leg, Tour, TourMeta } from '../types';

import * as pakistanToSaudiArabia from './pakistan-to-saudi-arabia';

/**
 * Registry of every journey the site knows about.
 *
 * A `mapped` tour has an entry in `MAPPED` below with its authored legs.
 * A `planned` tour is a real playlist on the channel that nobody has mapped
 * yet — it is listed so the site can show what is coming without pretending to
 * have data. See the README for how to promote one.
 */

type GeometryEntry = { geometry: [number, number][]; distanceKm: number; source: string };
// TypeScript widens JSON arrays to number[][]; the generator guarantees pairs.
const GEOMETRY = rawGeometry as unknown as Record<string, GeometryEntry>;

/** Geometry is keyed by `<tourId>/<legId>` so tours can't collide. */
export const geometryKey = (tourId: string, legId: string) => `${tourId}/${legId}`;

const MAPPED: { meta: TourMeta; legs: AuthoredLeg[] }[] = [pakistanToSaudiArabia];

export const PLANNED_TOURS: TourMeta[] = [
  {
    id: 'north-to-south-america',
    title: 'North → South America',
    blurb: 'The length of the Americas by motorcycle.',
    playlistId: 'PLSjc2o-bXB-rhxKZ1zPQUTmwfhozJDGR8',
    status: 'planned',
    years: '2024–25',
  },
  {
    id: 'pakistan-to-japan',
    title: 'Pakistan → Japan',
    blurb: 'East across Asia to the Pacific.',
    playlistId: 'PLSjc2o-bXB-qnFC309ezyOWW2dtnH5VSj',
    status: 'planned',
    years: '2023',
  },
  {
    id: 'africa',
    title: 'Africa',
    blurb: 'The Africa motorcycle tour.',
    playlistId: 'PLSjc2o-bXB-pTmHL3eg203EpYONergcm2',
    status: 'planned',
    years: '2024',
  },
  {
    id: 'germany-to-pakistan',
    title: 'Germany → Pakistan',
    blurb: 'The ride home across Europe and Asia.',
    playlistId: 'PLSjc2o-bXB-pwzKWiBs2qLmlcjinXmDku',
    status: 'planned',
    years: '2019–20',
  },
  {
    id: 'middle-east',
    title: 'Middle East',
    blurb: 'The Middle East motorcycle tour.',
    playlistId: 'PLSjc2o-bXB-oZQZ1yj8BdPRp-nWueVZNX',
    status: 'planned',
    years: '2022',
  },
  {
    id: 'india',
    title: 'India',
    blurb: 'The India motorcycle tour.',
    playlistId: 'PLSjc2o-bXB-qZBL1_QWkOLk8mewXQnXqO',
    status: 'planned',
    years: '2023',
  },
];

function buildTour(meta: TourMeta, authored: AuthoredLeg[]): Tour {
  const legs: Leg[] = authored.map((leg) => {
    const cached = GEOMETRY[geometryKey(meta.id, leg.id)];
    return {
      ...leg,
      fromCoords: CITIES[leg.fromCity].coords as [number, number],
      toCoords: CITIES[leg.toCity].coords as [number, number],
      routeGeometry: cached?.geometry,
      distanceKm: cached?.distanceKm,
    };
  });

  const cities = new Set<CityName>();
  for (const leg of legs) {
    cities.add(leg.fromCity);
    cities.add(leg.toCity);
  }
  const countries: string[] = [];
  for (const city of cities) {
    const country: Country = CITIES[city].country;
    if (!countries.includes(country)) countries.push(country);
  }

  return {
    ...meta,
    playlistUrl: `https://www.youtube.com/playlist?list=${meta.playlistId}`,
    legs,
    stats: {
      legs: legs.length,
      cities: cities.size,
      distanceKm: Math.round(legs.reduce((sum, l) => sum + (l.distanceKm ?? 0), 0)),
      countries,
    },
  };
}

export const TOURS: Tour[] = MAPPED.map(({ meta, legs }) => buildTour(meta, legs));

export const DEFAULT_TOUR = TOURS[0];

export function getTour(id: string): Tour | undefined {
  return TOURS.find((t) => t.id === id);
}

/** Everything the switcher shows: mapped tours first, then the unmapped ones. */
export const ALL_TOUR_META: TourMeta[] = [...TOURS.map((t) => t as TourMeta), ...PLANNED_TOURS];
