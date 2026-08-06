'use client';

import { useEffect, useRef, useState } from 'react';

import { ALL_TOUR_META } from '@/data/tours';
import type { Tour } from '@/data/types';
import type { Projection } from './MapCanvas';

type Props = {
  tour: Tour;
  projection: Projection;
  onProjectionChange: (p: Projection) => void;
  playing: boolean;
  onTogglePlay: () => void;
};

function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="flex overflow-hidden rounded-md border border-ink-700">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={`u-label px-2.5 py-1.5 text-[9px] transition-colors
                      ${value === o.value ? 'bg-ember text-ink-950' : 'text-mist-500 hover:text-mist-100'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Lists every journey on the channel. Only the mapped ones can be opened; the
 * rest are shown so the site says what exists rather than implying this is the
 * only trip.
 */
function TourMenu({ tour }: { tour: Tour }) {
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

  const mappedCount = ALL_TOUR_META.filter((t) => t.status === 'mapped').length;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="u-label flex items-center gap-1.5 rounded-md border border-ink-700 px-2.5 py-1.5
                   text-[9px] text-mist-500 transition-colors hover:border-ember-dim hover:text-ember"
      >
        Tours
        <span className="u-tnum text-mist-600">
          {mappedCount}/{ALL_TOUR_META.length}
        </span>
        <span aria-hidden className={`transition-transform ${open ? 'rotate-180' : ''}`}>
          ▾
        </span>
      </button>

      {open && (
        <div role="menu" className="u-panel absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-lg">
          <p className="u-label border-b border-ink-800 px-3.5 py-2.5 text-[9px] text-mist-600">
            Journeys on the channel
          </p>
          {ALL_TOUR_META.map((t) => {
            const current = t.id === tour.id;
            const mapped = t.status === 'mapped';
            return (
              <div
                key={t.id}
                className={`flex items-start gap-2.5 border-b border-ink-850 px-3.5 py-2.5 last:border-b-0
                            ${current ? 'bg-ink-800' : ''}`}
              >
                {/* Filled marker for a mapped tour, hollow for one nobody has done yet. */}
                <span
                  aria-hidden
                  className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border text-[9px]
                              ${
                                current
                                  ? 'border-ember bg-ember text-ink-950'
                                  : mapped
                                    ? 'border-mist-500 text-mist-500'
                                    : 'border-ink-600 text-transparent'
                              }`}
                >
                  ✓
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={`u-display block text-[12px] ${mapped ? 'text-mist-100' : 'text-mist-500'}`}
                  >
                    {t.title}
                  </span>
                  <span className="mt-1 block text-[10.5px] leading-relaxed text-mist-600">
                    {t.blurb}
                  </span>
                </span>
                <span className="u-label shrink-0 pt-0.5 text-[8px] text-mist-600">
                  {current ? 'Showing' : mapped ? t.years : 'Not mapped'}
                </span>
              </div>
            );
          })}
          <p className="bg-ink-900 px-3.5 py-2 text-[10px] leading-relaxed text-mist-600">
            Only mapped tours can be opened — see the README to map another.
          </p>
        </div>
      )}
    </div>
  );
}

export default function TopBar({
  tour,
  projection,
  onProjectionChange,
  playing,
  onTogglePlay,
}: Props) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-[900] flex items-start justify-between gap-3 p-3 sm:p-4">
      {/* On desktop the wordmark lives in the panel, so this is only for small
          screens where the panel is collapsed to a sheet. */}
      <div className="u-panel pointer-events-auto rounded-lg px-3 py-2 lg:hidden">
        <div className="u-label text-[8px] text-mist-600">Wild Lens by Abrar</div>
        <div className="u-display mt-1 text-[13px] text-mist-100">{tour.title}</div>
      </div>
      <div className="hidden lg:block" />

      <div className="pointer-events-auto flex shrink-0 items-center gap-2">
        <Segmented
          label="Map projection"
          value={projection}
          onChange={onProjectionChange}
          options={[
            { value: 'globe', label: '◍ Globe' },
            { value: 'mercator', label: '▭ Flat' },
          ]}
        />
        <TourMenu tour={tour} />
        <button
          type="button"
          onClick={onTogglePlay}
          aria-pressed={playing}
          className={`u-label rounded-md border px-3 py-1.5 text-[9px] transition-colors
                      ${
                        playing
                          ? 'border-ember bg-ember text-ink-950'
                          : 'border-ink-700 text-mist-300 hover:border-ember-dim hover:text-ember'
                      }`}
        >
          {playing ? '❚❚ Pause' : '▶ Play'}
        </button>
      </div>
    </div>
  );
}
