'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { LEGS } from '@/data/legs';
import Header from './Header';
import LegCard from './LegCard';
import Sidebar from './Sidebar';
import VideoModal from './VideoModal';

// Leaflet touches `window` at import time, so it must never run on the server.
const MapCanvas = dynamic(() => import('./MapCanvas'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-ink-950">
      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-mist-600">
        Loading map…
      </span>
    </div>
  ),
});

/** How long each leg holds the screen during the play-through. */
const PLAY_INTERVAL_MS = 2600;

type Hover = { id: string; source: 'map' | 'list'; point?: { x: number; y: number } };

export default function Explorer() {
  const [hover, setHover] = useState<Hover | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [playIndex, setPlayIndex] = useState(0);

  // The map highlight follows the cursor first, then the play-through, then
  // whatever is open in the modal.
  const activeId = hover?.id ?? (playing ? LEGS[playIndex]?.id : null) ?? selectedId;

  const focusId = playing ? LEGS[playIndex]?.id ?? null : selectedId;

  const hoveredLeg = useMemo(
    () => (hover ? LEGS.find((l) => l.id === hover.id) ?? null : null),
    [hover]
  );
  const selectedLeg = useMemo(
    () => (selectedId ? LEGS.find((l) => l.id === selectedId) ?? null : null),
    [selectedId]
  );
  const selectedIndex = selectedLeg ? LEGS.indexOf(selectedLeg) : -1;

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
        const i = LEGS.findIndex((l) => l.id === current);
        if (i === -1) return current;
        const next = LEGS[i + delta];
        return next ? next.id : current;
      });
    },
    []
  );

  // Play-through: advance one leg at a time, stopping at the end.
  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => {
      setPlayIndex((i) => {
        if (i + 1 >= LEGS.length) {
          setPlaying(false);
          return i;
        }
        return i + 1;
      });
    }, PLAY_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [playing]);

  const togglePlay = useCallback(() => {
    setPlaying((p) => {
      const next = !p;
      if (next) {
        setSelectedId(null);
        // Restart if the previous run finished.
        setPlayIndex((i) => (i + 1 >= LEGS.length ? 0 : i));
      }
      return next;
    });
  }, []);

  const progress = useMemo(() => {
    if (!playing && playIndex === 0) return null;
    const done = playIndex + 1;
    const km = LEGS.slice(0, done).reduce((s, l) => s + (l.distanceKm ?? 0), 0);
    return { done, km: Math.round(km) };
  }, [playing, playIndex]);

  // The floating card only makes sense when the cursor is on the map.
  const showCard = hover?.source === 'map' && hover.point && hoveredLeg;

  return (
    <div className="flex h-full flex-col bg-ink-950">
      <Header playing={playing} onTogglePlay={togglePlay} progress={progress} />

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
            <span>The route · {LEGS.length} legs</span>
            <span aria-hidden className="lg:hidden">
              {sheetOpen ? '▾' : '▴'}
            </span>
          </button>

          <div className="min-h-0 flex-1">
            <Sidebar
              legs={LEGS}
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
            legs={LEGS}
            activeId={activeId}
            onHover={handleMapHover}
            onSelect={handleSelect}
            focusId={focusId}
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
          hasNext={selectedIndex > -1 && selectedIndex < LEGS.length - 1}
        />
      )}
    </div>
  );
}
