'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useState } from 'react';

import type { Tour } from '@/data/types';
import Header from './Header';
import LegCard from './LegCard';
import Sidebar from './Sidebar';
import VideoModal from './VideoModal';
import type { Projection } from './MapCanvas';

// MapLibre touches `window` at import time, so it must never run on the server.
const MapCanvas = dynamic(() => import('./MapCanvas'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-ink-950">
      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-mist-600">
        Loading globe…
      </span>
    </div>
  ),
});

/** How long each leg holds the screen during the play-through. */
const PLAY_INTERVAL_MS = 2600;

type Hover = { id: string; source: 'map' | 'list'; point?: { x: number; y: number } };

export default function Explorer({ tour }: { tour: Tour }) {
  const legs = tour.legs;

  const [hover, setHover] = useState<Hover | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [playIndex, setPlayIndex] = useState(0);
  const [projection, setProjection] = useState<Projection>('globe');

  // The highlight follows the cursor first, then the play-through, then
  // whatever is open in the modal.
  const activeId = hover?.id ?? (playing ? legs[playIndex]?.id : null) ?? selectedId;
  const focusId = playing ? legs[playIndex]?.id ?? null : selectedId;

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
    <div className="flex h-full flex-col bg-ink-950">
      <Header
        tour={tour}
        projection={projection}
        onProjectionChange={setProjection}
        playing={playing}
        onTogglePlay={togglePlay}
        progress={progress}
      />

      <div className="relative flex min-h-0 flex-1">
        {/* Sidebar — a left rail on desktop, a bottom sheet on small screens. */}
        <aside
          className={`z-[1000] flex flex-col border-ink-800 bg-ink-900
                      lg:relative lg:w-[330px] lg:shrink-0 lg:border-r
                      max-lg:absolute max-lg:inset-x-0 max-lg:bottom-0 max-lg:rounded-t-2xl
                      max-lg:border-t max-lg:shadow-[0_-20px_50px_-20px_rgba(0,0,0,0.9)]
                      max-lg:transition-[height] max-lg:duration-300
                      ${sheetOpen ? 'max-lg:h-[62%]' : 'max-lg:h-[52px]'}`}
        >
          <button
            type="button"
            onClick={() => setSheetOpen((o) => !o)}
            aria-expanded={sheetOpen}
            className="flex shrink-0 items-center justify-between border-b border-ink-800 px-4 py-3
                       font-mono text-[10px] uppercase tracking-[0.18em] text-mist-500 lg:cursor-default"
          >
            <span>The route · {legs.length} legs</span>
            <span aria-hidden className="lg:hidden">
              {sheetOpen ? '▾' : '▴'}
            </span>
          </button>

          <div className="min-h-0 flex-1">
            <Sidebar
              legs={legs}
              activeId={activeId}
              followActive={hover?.source === 'map' || playing}
              onHover={handleListHover}
              onSelect={(id) => {
                handleSelect(id);
                setSheetOpen(false);
              }}
            />
          </div>
        </aside>

        <main className="relative min-w-0 flex-1">
          <MapCanvas
            legs={legs}
            activeId={activeId}
            onHover={handleMapHover}
            onSelect={handleSelect}
            focusId={focusId}
            projection={projection}
          />
        </main>
      </div>

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
