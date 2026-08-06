'use client';

// maplibre-gl's stylesheet is imported from app/globals.css, ahead of the
// overrides there — importing it here would load it last and undo them.
import {
  LngLatBounds,
  Map as MapLibreMap,
  NavigationControl,
  type GeoJSONSource,
  type MapLayerMouseEvent,
} from 'maplibre-gl';
import type { Feature, FeatureCollection, LineString, Point } from 'geojson';
import { useCallback, useEffect, useMemo, useRef } from 'react';

import { CITIES, COUNTRY_COLORS, type CityName } from '@/data/cities';
import type { Leg } from '@/data/types';
import { buildLayers, interactiveLayerIds } from '@/lib/mapLayers';

/**
 * A full-colour basemap: OpenStreetMap vector data with Natural Earth shaded
 * relief underneath, so deserts, mountains and coastlines read as real terrain
 * rather than a flat fill. Free and token-less.
 *
 * Swap for CARTO's if OpenFreeMap is ever unavailable — both are token-free:
 *   https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json
 */
const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';

/** Deepest slot count we generate offset layers for. */
const MAX_STAY_SLOTS = 8;

export type Projection = 'globe' | 'mercator';

type Props = {
  legs: Leg[];
  activeId: string | null;
  onHover: (id: string | null, point?: { x: number; y: number }) => void;
  onSelect: (id: string) => void;
  focusId: string | null;
  projection: Projection;
  onReady?: () => void;
};

/** Puts the globe in deep space so it reads as a planet, not a cut-out. */
function applyProjection(map: MapLibreMap, projection: Projection) {
  map.setProjection({ type: projection });
  map.setSky(
    projection === 'globe'
      ? {
          'sky-color': '#0a1020',
          'horizon-color': '#2d4a72',
          'fog-color': '#0a1020',
          'sky-horizon-blend': 0.6,
          'horizon-fog-blend': 0.5,
          'fog-ground-blend': 0.1,
          'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 5, 0.7, 8, 0],
        }
      : { 'atmosphere-blend': 0 }
  );
}

export default function MapCanvas({
  legs,
  activeId,
  onHover,
  onSelect,
  focusId,
  projection,
  onReady,
}: Props) {
  const holder = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const loaded = useRef(false);
  const prevActive = useRef<string | null>(null);
  const userMoved = useRef(false);
  const programmatic = useRef(false);
  const focusRef = useRef(focusId);

  useEffect(() => {
    focusRef.current = focusId;
  }, [focusId]);

  // Keep the latest callbacks reachable from MapLibre's own listeners, which
  // are attached once and must not be torn down on every render.
  const handlers = useRef({ onHover, onSelect });
  useEffect(() => {
    handlers.current = { onHover, onSelect };
  }, [onHover, onSelect]);

  /** Read once inside the load handler, which runs after the first render. */
  const projectionRef = useRef(projection);
  useEffect(() => {
    projectionRef.current = projection;
  }, [projection]);

  // ---------------------------------------------------------------- geometry

  const { routes, cities, stays, bounds, staySlots } = useMemo(() => {
    const routeFeatures: Feature<LineString>[] = [];
    const stayFeatures: Feature<Point>[] = [];
    const usedCities = new Set<CityName>();
    const perCity = new Map<CityName, number>();
    let maxSlot = 0;

    const bbox = { minLng: 180, minLat: 90, maxLng: -180, maxLat: -90 };
    const grow = ([lat, lng]: [number, number]) => {
      bbox.minLng = Math.min(bbox.minLng, lng);
      bbox.maxLng = Math.max(bbox.maxLng, lng);
      bbox.minLat = Math.min(bbox.minLat, lat);
      bbox.maxLat = Math.max(bbox.maxLat, lat);
    };

    for (const leg of legs) {
      usedCities.add(leg.fromCity);
      usedCities.add(leg.toCity);
      grow(leg.fromCoords);
      grow(leg.toCoords);

      if (leg.fromCity === leg.toCity) {
        const slot = perCity.get(leg.fromCity) ?? 0;
        perCity.set(leg.fromCity, slot + 1);
        maxSlot = Math.max(maxSlot, slot);
        stayFeatures.push({
          type: 'Feature',
          id: leg.id,
          properties: {
            legId: leg.id,
            country: CITIES[leg.fromCity].country,
            slot: Math.min(slot, MAX_STAY_SLOTS - 1),
          },
          geometry: { type: 'Point', coordinates: [leg.fromCoords[1], leg.fromCoords[0]] },
        });
        continue;
      }

      const path = leg.routeGeometry?.length
        ? leg.routeGeometry
        : [leg.fromCoords, leg.toCoords];
      for (const p of path) grow(p);

      routeFeatures.push({
        type: 'Feature',
        id: leg.id,
        properties: {
          legId: leg.id,
          country: CITIES[leg.toCity].country,
          dashed: leg.mode !== 'ride' ? 1 : 0,
        },
        // GeoJSON is [lng, lat]; the data is stored [lat, lng].
        geometry: { type: 'LineString', coordinates: path.map(([lat, lng]) => [lng, lat]) },
      });
    }

    const cityFeatures: Feature<Point>[] = [...usedCities].map((name) => ({
      type: 'Feature',
      id: name,
      properties: { name, country: CITIES[name].country },
      geometry: {
        type: 'Point',
        coordinates: [CITIES[name].coords[1], CITIES[name].coords[0]],
      },
    }));

    return {
      routes: { type: 'FeatureCollection', features: routeFeatures } as FeatureCollection,
      cities: { type: 'FeatureCollection', features: cityFeatures } as FeatureCollection,
      stays: { type: 'FeatureCollection', features: stayFeatures } as FeatureCollection,
      bounds: new LngLatBounds(
        [bbox.minLng, bbox.minLat],
        [bbox.maxLng, bbox.maxLat]
      ),
      staySlots: maxSlot + 1,
    };
  }, [legs]);

  const move = useCallback((fn: () => void) => {
    programmatic.current = true;
    fn();
    requestAnimationFrame(() => {
      programmatic.current = false;
    });
  }, []);

  // ------------------------------------------------------------------- setup

  useEffect(() => {
    if (!holder.current || mapRef.current) return;

    const map = new MapLibreMap({
      container: holder.current,
      style: STYLE_URL,
      center: [52, 28],
      zoom: 2.6,
      attributionControl: { compact: true },
      // The globe is the point of the view; keep it centred and legible.
      maxZoom: 13,
      minZoom: 1.4,
    });
    mapRef.current = map;

    map.addControl(new NavigationControl({ showCompass: false }), 'bottom-right');

    map.on('movestart', () => {
      if (!programmatic.current) userMoved.current = true;
    });

    map.on('load', () => {
      loaded.current = true;
      applyProjection(map, projectionRef.current);

      map.addSource('routes', { type: 'geojson', data: routes, promoteId: 'legId' });
      map.addSource('stays', { type: 'geojson', data: stays, promoteId: 'legId' });
      map.addSource('cities', { type: 'geojson', data: cities, promoteId: 'name' });

      for (const layer of buildLayers(staySlots, COUNTRY_COLORS)) map.addLayer(layer);

      for (const layer of interactiveLayerIds(staySlots)) {
        map.on('mousemove', layer, (e: MapLayerMouseEvent) => {
          const id = e.features?.[0]?.properties?.legId as string | undefined;
          if (!id) return;
          map.getCanvas().style.cursor = 'pointer';
          handlers.current.onHover(id, { x: e.originalEvent.clientX, y: e.originalEvent.clientY });
        });
        map.on('mouseleave', layer, () => {
          map.getCanvas().style.cursor = '';
          handlers.current.onHover(null);
        });
        map.on('click', layer, (e) => {
          const id = e.features?.[0]?.properties?.legId as string | undefined;
          if (id) handlers.current.onSelect(id);
        });
      }

      move(() => map.fitBounds(bounds, { padding: 70, duration: 0 }));
      onReady?.();
    });

    return () => {
      map.remove();
      mapRef.current = null;
      loaded.current = false;
    };
    // Built once. Data updates are pushed through setData below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ------------------------------------------------------------ data updates

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded.current) return;
    (map.getSource('routes') as GeoJSONSource | undefined)?.setData(routes);
    (map.getSource('stays') as GeoJSONSource | undefined)?.setData(stays);
    (map.getSource('cities') as GeoJSONSource | undefined)?.setData(cities);
    userMoved.current = false;
    move(() => map.fitBounds(bounds, { padding: 70, duration: 600 }));
  }, [routes, stays, cities, bounds, move]);

  // Highlight: feature-state rather than restyling, so it stays cheap.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded.current) return;

    const setActive = (legId: string | null, value: boolean) => {
      if (!legId) return;
      const leg = legs.find((l) => l.id === legId);
      if (!leg) return;
      const source = leg.fromCity === leg.toCity ? 'stays' : 'routes';
      map.setFeatureState({ source, id: legId }, { active: value });
      for (const city of [leg.fromCity, leg.toCity]) {
        map.setFeatureState({ source: 'cities', id: city }, { active: value });
      }
    };

    setActive(prevActive.current, false);
    setActive(activeId, true);
    prevActive.current = activeId;
  }, [activeId, legs]);

  // Later projection switches. The first one is applied in the load handler,
  // because this effect runs before the style is ready.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded.current) return;
    applyProjection(map, projection);
  }, [projection]);

  // Ease to the focused leg.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded.current || !focusId) return;
    const leg = legs.find((l) => l.id === focusId);
    if (!leg) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    move(() => {
      if (leg.fromCity === leg.toCity) {
        map.easeTo({
          center: [leg.fromCoords[1], leg.fromCoords[0]],
          zoom: Math.max(map.getZoom(), 7.5),
          duration: reduce ? 0 : 900,
        });
        return;
      }
      const path = leg.routeGeometry?.length ? leg.routeGeometry : [leg.fromCoords, leg.toCoords];
      const b = new LngLatBounds();
      for (const [lat, lng] of path) b.extend([lng, lat]);
      map.fitBounds(b, { padding: 110, duration: reduce ? 0 : 900, maxZoom: 9 });
    });
  }, [focusId, legs, move]);

  // MapLibre does not watch its container, so a layout change needs a nudge.
  useEffect(() => {
    const el = holder.current;
    const map = mapRef.current;
    if (!el || !map) return;
    const observer = new ResizeObserver(() => {
      map.resize();
      if (!userMoved.current && !focusRef.current && loaded.current) {
        move(() => map.fitBounds(bounds, { padding: 70, duration: 0 }));
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [bounds, move]);

  return <div ref={holder} className="h-full w-full" />;
}
