'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { CITIES } from '@/data/cities';
import type { Tour } from '@/data/types';
import LegCard from './LegCard';
import RouteList from './RouteList';
import StatBlock from './StatBlock';
import TopBar from './TopBar';
import VideoModal from './VideoModal';
import type { Projection } from './MapCanvas';

// MapLibre touches `window` at import time, so it must never run on the server.
const MapCanvas = dynamic(() => import('./MapCanvas'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full w-full place-items-center bg-ink-950">
      <span className="u-label text-[9px] text-mist-600">Loading globe…</span>
    </div>
  ),
});

/** How long each leg holds the screen during the play-through. */
const PLAY_INTERVAL_MS = 2600;
/** Width of the floating panel; the map insets its framing by this much. */
const PANEL_W = 360;

type Hover = { id: string; source: 'map' | 'list'; point?: { x: number; y: number } };

export default function Explorer({ tour }: { tour: Tour }) {
  const legs = tour.legs;

  const [hover, setHover] = useState<Hover | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [playIndex, setPlayIndex] = useState(0);
  const [projection, setProjection] = useState<Projection>('globe');
  const [hoverCountry, setHoverCountry] = useState<string | null>(null);
  const [focusCountry, setFocusCountry] = useState<string | null>(null);

  // The highlight follows the cursor first, then the play-through, then
  // whatever is open in the modal.
  const activeId = hover?.id ?? (playing ? legs[playIndex]?.id : null) ?? selectedId;

  const legsIn = useCallback(
    (country: string) => legs.filter((l) => CITIES[l.toCity].country === country),
    [legs]
  );

  // Hovering a country outranks a single leg: it is the more specific intent.
  const activeIds = useMemo(() => {
    if (hoverCountry) return legsIn(hoverCountry).map((l) => l.id);
    return activeId ? [activeId] : [];
  }, [hoverCountry, legsIn, activeId]);

  const focusIds = useMemo(() => {
    if (focusCountry) return legsIn(focusCountry).map((l) => l.id);
    const id = playing ? legs[playIndex]?.id ?? null : selectedId;
    return id ? [id] : null;
  }, [focusCountry, legsIn, playing, legs, playIndex, selectedId]);

  const hoveredLeg = useMemo(
    () => (hover ? legs.find((l) => l.id === hover.id) ?? null : null),
    [hover, legs]
  );
  const selectedLeg = useMemo(
    () => (selectedId ? legs.find((l) => l.id === selectedId) ?? null : null),
    [selectedId, legs]
  );
  const selectedIndex = selectedLeg ? legs.indexOf(selectedLeg) : -1;

  const handleMapHover = useCallback((id: string | null, point?: { x: number; y: number }) => {
    setHover(id ? { id, source: 'map', point } : null);
  }, []);

  const handleListHover = useCallback((id: string | null) => {
    setHover(id ? { id, source: 'list' } : null);
  }, []);

  const handleSelect = useCallback((id: string) => {
    setPlaying(false);
    setFocusCountry(null);
    setSelectedId(id);
  }, []);

  const stepSelection = useCallback(
    (delta: number) => {
      setSelectedId((current) => {
        const i = legs.findIndex((l) => l.id === current);
        if (i === -1) return current;
        return legs[i + delta]?.id ?? current;
      });
    },
    [legs]
  );

  // Play-through: advance one leg at a time, stopping at the end.
  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => {
      setPlayIndex((i) => {
        if (i + 1 >= legs.length) {
          setPlaying(false);
          return i;
        }
        return i + 1;
      });
    }, PLAY_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [playing, legs.length]);

  const togglePlay = useCallback(() => {
    setPlaying((p) => {
      const next = !p;
      if (next) {
        setSelectedId(null);
        // A hover left over from before would otherwise outrank the play-through.
        setHover(null);
        setPlayIndex((i) => (i + 1 >= legs.length ? 0 : i));
      }
      return next;
    });
  }, [legs.length]);

  const progress = useMemo(() => {
    if (!playing && playIndex === 0) return null;
    const done = playIndex + 1;
    const km = legs.slice(0, done).reduce((s, l) => s + (l.distanceKm ?? 0), 0);
    return { done, km: Math.round(km) };
  }, [playing, playIndex, legs]);

  // The floating card only makes sense when the cursor is on the map.
  const showCard = hover?.source === 'map' && hover.point && hoveredLeg;

  return (
    <div className="relative h-full overflow-hidden bg-ink-950">
      {/* Full-bleed map. Everything else floats on top of it. */}
      <div className="absolute inset-0">
        <MapCanvas
          legs={legs}
          activeIds={activeIds}
          onHover={handleMapHover}
          onSelect={handleSelect}
          focusIds={focusIds}
          projection={projection}
          framePadding={{ left: PANEL_W }}
        />
      </div>

      <TopBar
        tour={tour}
        projection={projection}
        onProjectionChange={setProjection}
        playing={playing}
        onTogglePlay={togglePlay}
      />

      {/* The panel — a left rail on desktop, a bottom sheet on small screens. */}
      <aside
        style={{ ['--panel-w' as string]: `${PANEL_W}px` }}
        className={`absolute z-[1000] flex flex-col overflow-hidden
                    lg:bottom-4 lg:left-4 lg:top-4 lg:w-(--panel-w) lg:rounded-xl
                    max-lg:inset-x-0 max-lg:bottom-0 max-lg:rounded-t-2xl
                    max-lg:transition-[height] max-lg:duration-300
                    u-panel
                    ${sheetOpen ? 'max-lg:h-[70%]' : 'max-lg:h-[64px]'}`}
      >
        {/* Sheet handle — only interactive below lg. */}
        <button
          type="button"
          onClick={() => setSheetOpen((o) => !o)}
          aria-expanded={sheetOpen}
          className="flex shrink-0 items-center justify-between px-5 py-3 lg:hidden"
        >
          <span className="u-display text-[13px] text-mist-100">{tour.title}</span>
          <span className="u-label flex items-center gap-2 text-[9px] text-mist-600">
            {legs.length} legs
            <span aria-hidden>{sheetOpen ? '▾' : '▴'}</span>
          </span>
        </button>

        <div className="hidden lg:block">
          <StatBlock tour={tour} progress={progress} />
        </div>

        <div className="min-h-0 flex-1">
          <RouteList
            legs={legs}
            activeId={activeId}
            followActive={hover?.source === 'map' || playing}
            onHover={handleListHover}
            onSelect={(id) => {
              handleSelect(id);
              setSheetOpen(false);
            }}
            activeCountry={hoverCountry}
            onHoverCountry={setHoverCountry}
            onSelectCountry={(c) => {
              setPlaying(false);
              setSelectedId(null);
              // Re-trigger even if the same country is clicked twice.
              setFocusCountry(null);
              requestAnimationFrame(() => setFocusCountry(c));
            }}
          />
        </div>
      </aside>

      {showCard && <LegCard leg={hoveredLeg} point={hover.point!} />}

      {selectedLeg && (
        <VideoModal
          leg={selectedLeg}
          onClose={() => setSelectedId(null)}
          onStep={stepSelection}
          hasPrev={selectedIndex > 0}
          hasNext={selectedIndex > -1 && selectedIndex < legs.length - 1}
        />
      )}
    </div>
  );
}
