'use client';

import { useEffect, useRef, useState } from 'react';

import { COUNTRY_COLORS, type Country } from '@/data/cities';
import { ALL_TOUR_META } from '@/data/tours';
import type { Tour } from '@/data/types';
import type { Projection } from './MapCanvas';

type Props = {
  tour: Tour;
  projection: Projection;
  onProjectionChange: (p: Projection) => void;
  playing: boolean;
  onTogglePlay: () => void;
  progress: { done: number; km: number } | null;
};

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <span className="flex items-baseline gap-1.5">
      <span className="font-mono text-[12px] tabular-nums text-mist-100">{value}</span>
      <span className="text-[10px] uppercase tracking-[0.14em] text-mist-600">{label}</span>
    </span>
  );
}

/**
 * Lists every journey on the channel. Only the mapped ones can be opened;
 * the rest are shown so the site says what exists rather than implying this is
 * the only trip.
 */
function TourSwitcher({ tour }: { tour: Tour }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-1.5 rounded-md border border-ink-700 px-2.5 py-1.5
                   font-mono text-[10px] uppercase tracking-[0.14em] text-mist-400
                   transition-colors hover:border-ember-dim hover:text-ember"
      >
        Tours
        <span aria-hidden className={`transition-transform ${open ? 'rotate-180' : ''}`}>
          ▾
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-1.5 w-72 overflow-hidden rounded-lg border
                     border-ink-700 bg-ink-900/97 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.9)] backdrop-blur-md"
        >
          {ALL_TOUR_META.map((t) => {
            const current = t.id === tour.id;
            const mapped = t.status === 'mapped';
            return (
              <div
                key={t.id}
                className={`flex items-start gap-2.5 border-b border-ink-850 px-3 py-2.5 last:border-b-0
                            ${current ? 'bg-ink-800' : ''}`}
              >
                <span
                  aria-hidden
                  className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                    current ? 'bg-ember' : mapped ? 'bg-mist-500' : 'bg-ink-600'
                  }`}
                />
                <span className="min-w-0 flex-1">
                  <span
                    className={`block text-[12px] font-medium ${
                      mapped ? 'text-mist-100' : 'text-mist-500'
                    }`}
                  >
                    {t.title}
                  </span>
                  <span className="mt-0.5 block text-[10.5px] leading-relaxed text-mist-600">
                    {t.blurb}
                  </span>
                </span>
                <span className="shrink-0 pt-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-mist-600">
                  {current ? 'Showing' : mapped ? t.years : 'Not mapped'}
                </span>
              </div>
            );
          })}
          <p className="bg-ink-850 px-3 py-2 text-[10px] leading-relaxed text-mist-600">
            Only mapped tours can be opened. See the README to map another one.
          </p>
        </div>
      )}
    </div>
  );
}

export default function Header({
  tour,
  projection,
  onProjectionChange,
  playing,
  onTogglePlay,
  progress,
}: Props) {
  const { legs, cities, distanceKm, countries } = tour.stats;

  return (
    <header className="relative z-[900] shrink-0 border-b border-ink-800 bg-ink-900">
      <div className="flex items-start gap-3 px-4 py-2.5 sm:gap-4 sm:px-5">
        <div className="min-w-0 flex-1">
          {/* Wraps rather than truncates: losing the destination would cost the
              headline its point on a narrow screen. */}
          <h1 className="font-display text-[18px] leading-tight text-mist-100 sm:text-[22px]">
            Wild Lens by Abrar
            <span className="mx-2 text-ember">—</span>
            <span className="text-mist-300">{tour.title}</span>
          </h1>

          <div className="mt-1 flex flex-wrap items-center gap-x-3.5 gap-y-1 sm:gap-x-5">
            <Stat value={String(legs)} label="legs" />
            <Stat value={String(cities)} label="places" />
            <Stat value={distanceKm.toLocaleString('en-US')} label="km" />

            {/* Country rail — doubles as the legend for the route colours. */}
            <span className="flex items-center gap-1.5">
              {countries.map((c) => (
                <span key={c} className="flex items-center gap-1" title={c}>
                  <span
                    className="h-1.5 w-4 rounded-full"
                    style={{ background: COUNTRY_COLORS[c as Country] }}
                  />
                </span>
              ))}
            </span>

            {progress && (
              <span className="flex items-baseline gap-1.5">
                <span className="font-mono text-[12px] tabular-nums text-ember">
                  {progress.km.toLocaleString('en-US')}
                </span>
                <span className="text-[10px] uppercase tracking-[0.14em] text-mist-600">
                  km ridden · leg {progress.done}
                </span>
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {/* Globe / flat toggle */}
          <div
            role="group"
            aria-label="Map projection"
            className="flex overflow-hidden rounded-md border border-ink-700"
          >
            {(['globe', 'mercator'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => onProjectionChange(p)}
                aria-pressed={projection === p}
                className={`px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors
                            ${
                              projection === p
                                ? 'bg-ember/15 text-ember'
                                : 'text-mist-500 hover:text-mist-300'
                            }`}
              >
                {p === 'globe' ? '◍ Globe' : '▭ Flat'}
              </button>
            ))}
          </div>

          <TourSwitcher tour={tour} />

          <button
            type="button"
            onClick={onTogglePlay}
            aria-pressed={playing}
            className="rounded-md border border-ink-700 px-3 py-1.5 font-mono text-[10px]
                       uppercase tracking-[0.14em] text-mist-300 transition-colors
                       hover:border-ember-dim hover:text-ember"
          >
            {playing ? '❚❚ Pause' : '▶ Play'}
          </button>
        </div>
      </div>

      {/* Progress rail for the play-through. */}
      <div className="h-px w-full bg-ink-800">
        <div
          className="h-px bg-ember transition-[width] duration-500 ease-linear"
          style={{ width: progress ? `${(progress.done / legs) * 100}%` : '0%' }}
        />
      </div>
    </header>
  );
}
