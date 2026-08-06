/**
 * Build-time route cache.
 *
 * Asks the public OSRM demo server for the real road path of every `ride` leg
 * and writes the result to src/data/route-geometry.json. Legs that are not
 * ridden (ferry / flight / train) and any leg OSRM cannot route get a smooth
 * quadratic-bezier arc instead, so the map always has a line to draw.
 *
 * Run with:  npm run build:routes
 *
 * This is the only thing that ever talks to a routing service. The site itself
 * reads the cached JSON, so page loads make no routing requests at all.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(HERE, '..', 'src', 'data');
const OUT = path.join(DATA_DIR, 'route-geometry.json');

const OSRM = 'https://router.project-osrm.org/route/v1/driving';
const PAUSE_MS = 1100; // stay well inside the demo server's fair-use limits
const SIMPLIFY_TOLERANCE = 0.0015; // ~150 m; plenty for a country-scale map

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// --- geometry helpers -------------------------------------------------------

function haversineKm([lat1, lon1], [lat2, lon2]) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** Ramer–Douglas–Peucker, on raw lat/lng — good enough at this scale. */
function simplify(points, tolerance) {
  if (points.length < 3) return points;
  const sqTol = tolerance * tolerance;

  const sqSegDist = (p, a, b) => {
    let [x, y] = [a[0], a[1]];
    let dx = b[0] - x;
    let dy = b[1] - y;
    if (dx !== 0 || dy !== 0) {
      const t = ((p[0] - x) * dx + (p[1] - y) * dy) / (dx * dx + dy * dy);
      if (t > 1) [x, y] = b;
      else if (t > 0) [x, y] = [x + dx * t, y + dy * t];
    }
    dx = p[0] - x;
    dy = p[1] - y;
    return dx * dx + dy * dy;
  };

  const keep = new Array(points.length).fill(false);
  keep[0] = keep[points.length - 1] = true;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [first, last] = stack.pop();
    let maxSq = 0;
    let index = -1;
    for (let i = first + 1; i < last; i++) {
      const sq = sqSegDist(points[i], points[first], points[last]);
      if (sq > maxSq) {
        maxSq = sq;
        index = i;
      }
    }
    if (maxSq > sqTol && index !== -1) {
      keep[index] = true;
      stack.push([first, index], [index, last]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

/**
 * Smooth arc between two points, bulging perpendicular to the straight line.
 * Used for ferry/flight/train legs and whenever routing is unavailable.
 */
function curveBetween(from, to, steps = 64) {
  const [lat1, lon1] = from;
  const [lat2, lon2] = to;
  const midLat = (lat1 + lat2) / 2;
  const midLon = (lon1 + lon2) / 2;

  // Perpendicular offset, scaled by separation so short hops stay near-straight.
  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;
  const bulge = 0.12;
  const ctrl = [midLat + dLon * bulge, midLon - dLat * bulge];

  const out = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const mt = 1 - t;
    out.push([
      mt * mt * lat1 + 2 * mt * t * ctrl[0] + t * t * lat2,
      mt * mt * lon1 + 2 * mt * t * ctrl[1] + t * t * lon2,
    ]);
  }
  return out;
}

// --- OSRM -------------------------------------------------------------------

async function fetchRoad(from, to) {
  const coords = `${from[1]},${from[0]};${to[1]},${to[0]}`;
  const url = `${OSRM}/${coords}?overview=full&geometries=geojson&alternatives=false&steps=false`;
  const res = await fetch(url, { headers: { 'User-Agent': 'wildlens-by-abrar/1.0' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (json.code !== 'Ok' || !json.routes?.length) throw new Error(json.code || 'no route');
  const route = json.routes[0];
  // GeoJSON is [lng, lat]; Leaflet wants [lat, lng].
  const points = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
  return { points, distanceKm: route.distance / 1000 };
}

// --- main -------------------------------------------------------------------

// Read the authored legs without pulling in TypeScript: the fields we need are
// simple literals, so a targeted parse of legs.ts is enough.
function readLegs() {
  const src = fs.readFileSync(path.join(DATA_DIR, 'legs.ts'), 'utf8');
  const cities = readCities();
  const legs = [];
  const blockRe = /\{\s*id: "(ep-\d+)",([\s\S]*?)\n  \},/g;
  let m;
  while ((m = blockRe.exec(src))) {
    const [, id, body] = m;
    const get = (key) => body.match(new RegExp(`${key}: "([^"]*)"`))?.[1];
    legs.push({
      id,
      fromCity: get('fromCity'),
      toCity: get('toCity'),
      mode: get('mode'),
      from: cities[get('fromCity')],
      to: cities[get('toCity')],
    });
  }
  return legs;
}

function readCities() {
  const src = fs.readFileSync(path.join(DATA_DIR, 'cities.ts'), 'utf8');
  const out = {};
  const re = /name: '([^']+)',\s*country: '[^']+',\s*coords: \[([-\d.]+), ([-\d.]+)\]/g;
  let m;
  while ((m = re.exec(src))) out[m[1]] = [Number(m[2]), Number(m[3])];
  return out;
}

const legs = readLegs();
if (!legs.length) throw new Error('parsed no legs out of legs.ts');

const result = {};
let routed = 0;
let curved = 0;
let stays = 0;

for (const leg of legs) {
  if (!leg.from || !leg.to) {
    console.warn(`! ${leg.id}: missing coords for ${leg.fromCity} -> ${leg.toCity}`);
    continue;
  }

  // Same place: nothing to draw, the city marker carries the episode.
  if (leg.from[0] === leg.to[0] && leg.from[1] === leg.to[1]) {
    result[leg.id] = { geometry: [], distanceKm: 0, source: 'stay' };
    stays++;
    console.log(`- ${leg.id}  ${leg.fromCity} (stay)`);
    continue;
  }

  if (leg.mode !== 'ride') {
    const geometry = curveBetween(leg.from, leg.to);
    result[leg.id] = {
      geometry,
      distanceKm: Number(haversineKm(leg.from, leg.to).toFixed(1)),
      source: leg.mode,
    };
    curved++;
    console.log(`~ ${leg.id}  ${leg.fromCity} -> ${leg.toCity} (${leg.mode}, curve)`);
    continue;
  }

  try {
    const { points, distanceKm } = await fetchRoad(leg.from, leg.to);
    const geometry = simplify(points, SIMPLIFY_TOLERANCE);
    result[leg.id] = {
      geometry,
      distanceKm: Number(distanceKm.toFixed(1)),
      source: 'osrm',
    };
    routed++;
    console.log(
      `+ ${leg.id}  ${leg.fromCity} -> ${leg.toCity}  ${distanceKm.toFixed(0)} km  ` +
        `(${points.length} -> ${geometry.length} pts)`
    );
  } catch (err) {
    const geometry = curveBetween(leg.from, leg.to);
    result[leg.id] = {
      geometry,
      distanceKm: Number(haversineKm(leg.from, leg.to).toFixed(1)),
      source: 'fallback-curve',
    };
    curved++;
    console.warn(`~ ${leg.id}  ${leg.fromCity} -> ${leg.toCity}  routing failed (${err.message}), using curve`);
  }
  await sleep(PAUSE_MS);
}

fs.writeFileSync(OUT, JSON.stringify(result, null, 1));

const total = Object.values(result).reduce((s, r) => s + r.distanceKm, 0);
console.log(
  `\n${legs.length} legs -> ${routed} routed, ${curved} curved, ${stays} stays` +
    `\ntotal ${Math.round(total).toLocaleString('en-US')} km` +
    `\nwrote ${path.relative(process.cwd(), OUT)}`
);
