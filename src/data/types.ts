import type { CityName } from './cities';

/** How the distance was covered. Only `ride` legs get real road routing. */
export type LegMode = 'ride' | 'stay' | 'ferry' | 'flight' | 'train';

export type Leg = {
  id: string;
  /** Journey order, 1..n — matches playlist order. */
  order: number;
  /** Episode number as printed in the title. */
  episode: number;
  videoId: string;
  videoUrl: string;
  /** Full YouTube title, unmodified. */
  title: string;
  /** Title with the series branding stripped, for cards and the sidebar. */
  shortTitle: string;
  thumbnail: string;
  duration: string;
  fromCity: CityName;
  toCity: CityName;
  fromCoords: [number, number];
  toCoords: [number, number];
  mode: LegMode;
  /** Cached path: real road geometry for rides, a smooth curve otherwise. */
  routeGeometry?: [number, number][];
  /** Length of `routeGeometry` in km. */
  distanceKm?: number;
  /** True when any field above was guessed. */
  needsReview?: boolean;
  reviewNote?: string;
};

/** A leg as written by hand. Coordinates and geometry are attached at build. */
export type AuthoredLeg = Omit<Leg, 'fromCoords' | 'toCoords' | 'routeGeometry' | 'distanceKm'>;

/**
 * One journey — normally one YouTube playlist.
 *
 * `planned` tours are declared so the site knows they exist and can list them,
 * but carry no legs yet. See README for how to map one.
 */
export type TourStatus = 'mapped' | 'planned';

export type TourMeta = {
  /** URL-safe id, also the key in the registry. */
  id: string;
  /** Short name for the switcher, e.g. "Pakistan → Saudi Arabia". */
  title: string;
  /** One line of context under the title. */
  blurb: string;
  playlistId: string;
  status: TourStatus;
  /** Rough year(s), for the switcher. */
  years: string;
};

export type Tour = TourMeta & {
  playlistUrl: string;
  legs: Leg[];
  stats: {
    legs: number;
    cities: number;
    distanceKm: number;
    countries: string[];
  };
};
