import type { ExpressionSpecification, LayerSpecification } from '@maplibre/maplibre-gl-style-spec';

/**
 * Every layer the journey draws on top of the basemap, in draw order.
 *
 * Kept out of the component so `npm run check:map` can run these through the
 * same validator MapLibre uses at runtime. That matters because an invalid
 * expression throws only when `addLayer` runs in a browser, which is easy to
 * miss — and layout properties in particular silently reject `feature-state`.
 *
 * Deliberately free of `@/` imports and of React: the colour table is passed
 * in, so plain Node can import this module to check it.
 */

/** Must stay in step with `--color-ember` in app/globals.css. */
export const ROUTE_ACTIVE = '#ff8a3d';
const CASING = '#0a0d12';
const LABEL = '#f2f5f9';
const STAY_FILL = '#11161d';

/** True for whichever leg is hovered, selected, or playing. */
const isActive: ExpressionSpecification = ['boolean', ['feature-state', 'active'], false];

/**
 * Country colour lookup, built from the same table the sidebar uses so the two
 * can never disagree.
 *
 * The double cast is unavoidable: the spec types `match` as a tuple requiring
 * literal case pairs at fixed positions, which a runtime-built list cannot
 * satisfy even though the value is valid.
 */
function countryColor(colors: Record<string, string>): ExpressionSpecification {
  const pairs = Object.entries(colors).flat();
  return ['match', ['get', 'country'], ...pairs, '#9aa4b2'] as unknown as ExpressionSpecification;
}

/**
 * Where each stay-episode dot sits relative to its city, in pixels.
 * `circle-translate` is constant per layer, which is exactly what keeps the
 * fan the same shape at every zoom level — hence one layer per slot.
 */
export function stayOffset(slot: number, slots: number): [number, number] {
  const radius = slots === 1 ? 13 : 16;
  const angle =
    slots === 1 ? -Math.PI / 2 : -Math.PI * 0.9 + (Math.PI * 0.8 * slot) / Math.max(slots - 1, 1);
  return [Math.cos(angle) * radius, Math.sin(angle) * radius];
}

export function buildLayers(
  staySlots: number,
  countryColors: Record<string, string>
): LayerSpecification[] {
  const slots = Math.max(staySlots, 1);
  const country = countryColor(countryColors);

  const layers: LayerSpecification[] = [
    // Dark casing keeps the routes readable over bright terrain.
    {
      id: 'route-casing',
      type: 'line',
      source: 'routes',
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': CASING,
        'line-opacity': ['case', isActive, 0.85, 0.5],
        'line-width': [
          'interpolate', ['linear'], ['zoom'],
          3, ['case', isActive, 7, 3.5],
          10, ['case', isActive, 13, 7],
        ],
      },
    },
    {
      id: 'route-line',
      type: 'line',
      source: 'routes',
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': ['case', isActive, ROUTE_ACTIVE, country],
        'line-opacity': ['case', isActive, 1, 0.9],
        'line-width': [
          'interpolate', ['linear'], ['zoom'],
          3, ['case', isActive, 4, 1.8],
          10, ['case', isActive, 8, 3.6],
        ],
        // Ferry, flight and train legs were not ridden, so they read as dotted.
        'line-dasharray': [
          'case',
          ['==', ['get', 'dashed'], 1],
          ['literal', [0.4, 1.8]],
          ['literal', [1, 0]],
        ],
      },
    },
    // Invisible, generously wide target so thin routes stay easy to hover.
    {
      id: 'route-hit',
      type: 'line',
      source: 'routes',
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': '#000', 'line-opacity': 0, 'line-width': 22 },
    },
  ];

  for (let slot = 0; slot < slots; slot++) {
    layers.push({
      id: `stay-${slot}`,
      type: 'circle',
      source: 'stays',
      filter: ['==', ['get', 'slot'], slot],
      paint: {
        'circle-translate': stayOffset(slot, slots),
        'circle-radius': ['case', isActive, 6, 4.2],
        'circle-color': ['case', isActive, ROUTE_ACTIVE, STAY_FILL],
        'circle-stroke-width': 1.6,
        'circle-stroke-color': ['case', isActive, ROUTE_ACTIVE, country],
      },
    });
  }

  layers.push(
    {
      id: 'city-dot',
      type: 'circle',
      source: 'cities',
      paint: {
        'circle-radius': ['case', isActive, 5.5, 3.4],
        'circle-color': CASING,
        'circle-stroke-width': ['case', isActive, 2.4, 1.5],
        'circle-stroke-color': ['case', isActive, ROUTE_ACTIVE, country],
      },
    },
    {
      id: 'city-label',
      type: 'symbol',
      source: 'cities',
      minzoom: 3.6,
      layout: {
        'text-field': ['get', 'name'],
        'text-font': ['Noto Sans Bold'],
        // Constant: layout properties cannot read feature-state, so the active
        // city is distinguished by colour and halo (both paint) instead.
        'text-size': 11,
        'text-offset': [0, 1.1],
        'text-anchor': 'top',
        'text-letter-spacing': 0.08,
        'text-transform': 'uppercase',
        'text-allow-overlap': false,
        'text-padding': 4,
      },
      paint: {
        'text-color': ['case', isActive, ROUTE_ACTIVE, LABEL],
        'text-halo-color': ['case', isActive, '#2a1206', '#080b10'],
        'text-halo-width': ['case', isActive, 2.4, 1.6],
        'text-halo-blur': 0.4,
      },
    }
  );

  return layers;
}

/** Layers that respond to the pointer, given how many stay slots exist. */
export function interactiveLayerIds(staySlots: number): string[] {
  return ['route-hit', ...Array.from({ length: Math.max(staySlots, 1) }, (_, i) => `stay-${i}`)];
}
