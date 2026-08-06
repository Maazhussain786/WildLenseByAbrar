/**
 * Validate the map's layers against the MapLibre style spec, without a browser.
 *
 * An invalid expression only throws when `addLayer` runs on a real map, which
 * is easy to miss — layout properties in particular reject `feature-state`
 * silently until then. This runs the same validator MapLibre uses internally.
 *
 * Run with:  npm run check:map
 *
 * Imports the TypeScript module directly; Node strips the types.
 */
import { validateStyleMin } from '@maplibre/maplibre-gl-style-spec';

const { buildLayers, interactiveLayerIds } = await import('../src/lib/mapLayers.ts');
const { COUNTRY_COLORS } = await import('../src/data/cities.ts');

// Cover more slots than the data currently needs, so adding a tour with more
// stay-episodes in one city is covered too.
const SLOT_COUNTS = [1, 2, 4, 8];

const emptySource = () => ({
  type: 'geojson',
  data: { type: 'FeatureCollection', features: [] },
});

let failed = false;

for (const slots of SLOT_COUNTS) {
  const layers = buildLayers(slots, COUNTRY_COLORS);
  const style = {
    version: 8,
    name: 'wildlens-check',
    glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
    sources: { routes: emptySource(), stays: emptySource(), cities: emptySource() },
    sky: {
      'sky-color': '#0a1020',
      'horizon-color': '#2d4a72',
      'fog-color': '#0a1020',
      'sky-horizon-blend': 0.6,
      'horizon-fog-blend': 0.5,
      'fog-ground-blend': 0.1,
      'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 5, 0.7, 8, 0],
    },
    layers,
  };

  const errors = validateStyleMin(style);
  if (errors.length) {
    failed = true;
    console.error(`\n${slots} stay slot(s): ${errors.length} problem(s)`);
    for (const e of errors) console.error(`  ${e.message}`);
    continue;
  }

  // Every interactive layer must actually exist, or hover silently does nothing.
  const ids = new Set(layers.map((l) => l.id));
  const missing = interactiveLayerIds(slots).filter((id) => !ids.has(id));
  if (missing.length) {
    failed = true;
    console.error(`\n${slots} stay slot(s): interactive layers not defined: ${missing.join(', ')}`);
    continue;
  }

  console.log(`${slots} stay slot(s): ${layers.length} layers valid`);
}

if (failed) {
  console.error('\nMap style check failed.');
  process.exit(1);
}
console.log('\nMap style OK.');
