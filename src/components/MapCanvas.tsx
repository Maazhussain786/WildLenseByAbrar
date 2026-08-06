'use client';

// Leaflet's stylesheet is imported from app/globals.css, ahead of the overrides
// there — importing it here would load it last and undo them.
import L from 'leaflet';
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CircleMarker, MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet';

import { CITIES, COUNTRY_COLORS, type CityName } from '@/data/cities';
import type { Leg } from '@/data/legs';

const ROUTE_IDLE = '#49535f';
const ROUTE_ACTIVE = '#e8843c';

/** Zoom at which the map is uncluttered enough to show every city name. */
const LABEL_ZOOM = 6;

type Props = {
  legs: Leg[];
  /** The leg drawn in the accent colour. */
  activeId: string | null;
  onHover: (id: string | null, point?: { x: number; y: number }) => void;
  onSelect: (id: string) => void;
  /** Changing this eases the map to that leg. */
  focusId: string | null;
};

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function boundsOf(legs: Leg[]): L.LatLngBounds {
  const pts: L.LatLngExpression[] = [];
  for (const leg of legs) {
    pts.push(leg.fromCoords, leg.toCoords);
    if (leg.routeGeometry) pts.push(...leg.routeGeometry);
  }
  return L.latLngBounds(pts);
}

/**
 * Owns everything about where the map is looking: the opening frame, easing to
 * a focused leg, reporting zoom, and re-measuring when the container resizes.
 *
 * Leaflet caches its container size, so it draws tiles into a stale rectangle
 * if the element changes size after init. Worse, the opening `fitBounds` runs
 * before the flex layout has settled, which on a phone leaves the map framed on
 * the wrong part of the world. So a resize both re-measures and re-frames —
 * but only while the view is still the one we chose, never after the reader has
 * panned or zoomed somewhere themselves.
 */
function MapController({
  legs,
  focusId,
  onZoom,
}: {
  legs: Leg[];
  focusId: string | null;
  onZoom: (z: number) => void;
}) {
  const map = useMap();
  const didFit = useRef(false);
  const userMoved = useRef(false);
  /** True while a move we started is in flight, so it isn't read as the user's. */
  const programmatic = useRef(false);
  /** Read by the resize observer, which must not re-subscribe on every focus. */
  const focusRef = useRef(focusId);
  useEffect(() => {
    focusRef.current = focusId;
  }, [focusId]);

  const move = useCallback(
    (fn: () => void) => {
      programmatic.current = true;
      fn();
      // Cleared on moveend; this covers moves that settle synchronously.
      requestAnimationFrame(() => {
        programmatic.current = false;
      });
    },
    []
  );

  const fitAll = useCallback(() => {
    move(() => map.fitBounds(boundsOf(legs), { padding: [56, 56] }));
  }, [map, legs, move]);

  useEffect(() => {
    if (didFit.current) return;
    didFit.current = true;
    fitAll();
    onZoom(map.getZoom());
  }, [fitAll, map, onZoom]);

  useEffect(() => {
    const onZoomEnd = () => onZoom(map.getZoom());
    const onMoveStart = () => {
      if (!programmatic.current) userMoved.current = true;
    };
    const onMoveEnd = () => {
      programmatic.current = false;
    };
    map.on('zoomend', onZoomEnd);
    map.on('movestart', onMoveStart);
    map.on('moveend', onMoveEnd);
    return () => {
      map.off('zoomend', onZoomEnd);
      map.off('movestart', onMoveStart);
      map.off('moveend', onMoveEnd);
    };
  }, [map, onZoom]);

  useEffect(() => {
    const observer = new ResizeObserver(() => {
      map.invalidateSize({ animate: false });
      if (!userMoved.current && !focusRef.current) fitAll();
    });
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map, fitAll]);

  useEffect(() => {
    if (!focusId) return;
    const leg = legs.find((l) => l.id === focusId);
    if (!leg) return;
    const animate = !prefersReducedMotion();

    move(() => {
      if (leg.fromCity === leg.toCity) {
        map.setView(leg.fromCoords, Math.max(map.getZoom(), 9), { animate });
        return;
      }
      const pts = (
        leg.routeGeometry?.length ? leg.routeGeometry : [leg.fromCoords, leg.toCoords]
      ) as L.LatLngExpression[];
      map.fitBounds(L.latLngBounds(pts), { padding: [80, 80], animate, maxZoom: 11 });
    });
  }, [focusId, legs, map, move]);

  return null;
}

/** Leaflet's own zoom buttons, moved out of the header's way. */
function ZoomButtons() {
  const map = useMap();
  useEffect(() => {
    const control = L.control.zoom({ position: 'bottomright' });
    control.addTo(map);
    return () => {
      control.remove();
    };
  }, [map]);
  return null;
}

/**
 * Stay-in-city episodes have no line to draw, so each gets its own dot fanned
 * out from the city marker. The offset is applied in pixels through
 * `iconAnchor`, so the cluster keeps its shape at every zoom level.
 */
function stayIcon(active: boolean, dx: number, dy: number) {
  const box = 22;
  const dot = 9;
  return L.divIcon({
    className: '',
    html: `<span style="
      display:block;width:${dot}px;height:${dot}px;border-radius:999px;
      margin:${(box - dot) / 2}px;
      background:${active ? ROUTE_ACTIVE : '#141a22'};
      border:1.5px solid ${active ? ROUTE_ACTIVE : ROUTE_IDLE};
      box-shadow:${active ? '0 0 0 4px rgba(232,132,60,0.22)' : 'none'};
      transition:background .18s,border-color .18s,box-shadow .18s;
      cursor:pointer;
    "></span>`,
    iconSize: [box, box],
    iconAnchor: [box / 2 - dx, box / 2 - dy],
  });
}

export default function MapCanvas({ legs, activeId, onHover, onSelect, focusId }: Props) {
  const visibleRefs = useRef(new Map<string, L.Polyline>());
  const hitRefs = useRef(new Map<string, L.Polyline>());
  const [zoom, setZoom] = useState(5);
  const handleZoom = useCallback((z: number) => setZoom(z), []);

  const activeLeg = useMemo(
    () => (activeId ? legs.find((l) => l.id === activeId) ?? null : null),
    [activeId, legs]
  );

  // Cities in use, and the stay-episodes anchored to each of them.
  const { cityList, stayPlacements } = useMemo(() => {
    const used = new Set<CityName>();
    const stayByCity = new Map<CityName, Leg[]>();

    for (const leg of legs) {
      used.add(leg.fromCity);
      used.add(leg.toCity);
      if (leg.fromCity === leg.toCity) {
        const group = stayByCity.get(leg.fromCity) ?? [];
        group.push(leg);
        stayByCity.set(leg.fromCity, group);
      }
    }

    const placements: { leg: Leg; dx: number; dy: number }[] = [];
    for (const group of stayByCity.values()) {
      const n = group.length;
      const radius = n === 1 ? 14 : 17;
      group.forEach((leg, i) => {
        // Fan across the upper arc, clear of the city label below the marker.
        const spread = Math.PI * 0.8;
        const start = -Math.PI * 0.9;
        const angle = n === 1 ? -Math.PI / 2 : start + (spread * i) / (n - 1);
        placements.push({ leg, dx: Math.cos(angle) * radius, dy: Math.sin(angle) * radius });
      });
    }

    return {
      cityList: [...used].map((name) => ({ key: name, ...CITIES[name] })),
      stayPlacements: placements,
    };
  }, [legs]);

  // Raise the active leg above its neighbours so the highlight is never clipped.
  useEffect(() => {
    if (!activeId) return;
    visibleRefs.current.get(activeId)?.bringToFront();
    hitRefs.current.get(activeId)?.bringToFront();
  }, [activeId]);

  const showAllLabels = zoom >= LABEL_ZOOM;

  return (
    <MapContainer
      className="h-full w-full"
      center={[28, 52]}
      zoom={5}
      minZoom={3}
      maxZoom={13}
      zoomControl={false}
      scrollWheelZoom
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        subdomains="abcd"
        maxZoom={20}
        detectRetina
      />

      <ZoomButtons />
      <MapController legs={legs} focusId={focusId} onZoom={handleZoom} />

      {/* Routes */}
      {legs.map((leg) => {
        const geo = leg.routeGeometry;
        if (!geo || geo.length < 2) return null;
        const active = leg.id === activeId;
        const dashed = leg.mode !== 'ride';
        const hover = (e: L.LeafletMouseEvent) =>
          onHover(leg.id, { x: e.originalEvent.clientX, y: e.originalEvent.clientY });

        return (
          <Fragment key={leg.id}>
            {/* The drawn line. Not interactive — the wide line below owns events. */}
            <Polyline
              positions={geo}
              interactive={false}
              className="route-line"
              ref={(instance) => {
                if (instance) visibleRefs.current.set(leg.id, instance);
                else visibleRefs.current.delete(leg.id);
              }}
              pathOptions={{
                color: active ? ROUTE_ACTIVE : ROUTE_IDLE,
                weight: active ? 4.5 : 2,
                opacity: active ? 1 : 0.62,
                lineCap: 'round',
                lineJoin: 'round',
                dashArray: dashed ? '1 7' : undefined,
              }}
            />
            {/* Invisible, generously wide target so thin lines stay easy to hover. */}
            <Polyline
              positions={geo}
              ref={(instance) => {
                if (instance) hitRefs.current.set(leg.id, instance);
                else hitRefs.current.delete(leg.id);
              }}
              pathOptions={{ color: '#000', weight: 18, opacity: 0 }}
              bubblingMouseEvents={false}
              eventHandlers={{
                mouseover: hover,
                mousemove: hover,
                mouseout: () => onHover(null),
                click: () => onSelect(leg.id),
              }}
            />
          </Fragment>
        );
      })}

      {/* Stay-in-city episodes */}
      {stayPlacements.map(({ leg, dx, dy }) => (
        <Marker
          key={leg.id}
          position={leg.fromCoords}
          icon={stayIcon(leg.id === activeId, dx, dy)}
          eventHandlers={{
            mouseover: (e) => {
              const ev = e.originalEvent as MouseEvent;
              onHover(leg.id, { x: ev.clientX, y: ev.clientY });
            },
            mouseout: () => onHover(null),
            click: () => onSelect(leg.id),
          }}
        />
      ))}

      {/* Cities */}
      {cityList.map((city) => {
        const isEndpoint =
          !!activeLeg && (activeLeg.fromCity === city.key || activeLeg.toCity === city.key);
        return (
          <CircleMarker
            key={city.key}
            center={city.coords as [number, number]}
            interactive={false}
            radius={isEndpoint ? 5 : 3.5}
            pathOptions={{
              color: isEndpoint ? ROUTE_ACTIVE : COUNTRY_COLORS[city.country],
              weight: isEndpoint ? 2.5 : 1.5,
              opacity: isEndpoint ? 1 : 0.7,
              fillColor: '#070a0d',
              fillOpacity: 1,
            }}
          >
            {(showAllLabels || isEndpoint) && (
              <Tooltip
                permanent
                direction="bottom"
                offset={[0, 6]}
                className={`city-label${isEndpoint ? ' city-label--active' : ''}`}
              >
                {city.name}
              </Tooltip>
            )}
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
