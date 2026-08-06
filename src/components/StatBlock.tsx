'use client';

import { COUNTRY_COLORS, type Country } from '@/data/cities';
import type { Tour } from '@/data/types';

/**
 * The headline numbers. These are the whole point of the page, so they are set
 * large and tabular — the label goes underneath, small and tracked, rather than
 * competing with the figure.
 */
function Figure({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  return (
    <div className="min-w-0">
      <div
        className={`u-display u-tnum text-[30px] leading-[0.9] ${
          accent ? 'text-ember' : 'text-mist-100'
        }`}
      >
        {value}
      </div>
      <div className="u-label mt-1.5 text-[9px] text-mist-600">{label}</div>
    </div>
  );
}

export default function StatBlock({
  tour,
  progress,
}: {
  tour: Tour;
  progress: { done: number; km: number } | null;
}) {
  const { legs, cities, distanceKm, countries } = tour.stats;

  return (
    <div className="border-b border-ink-800 px-5 pb-4 pt-4">
      <div className="u-label text-[9px] text-mist-600">Wild Lens by Abrar</div>
      {/* text-balance keeps the break sensible — without it "Arabia" orphans
          onto a line of its own. */}
      <h1 className="u-display mt-2 text-balance text-[25px] leading-[0.95] text-mist-100">
        {tour.title}
      </h1>
      <p className="mt-2 text-[11.5px] leading-relaxed text-mist-500">{tour.blurb}</p>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <Figure value={String(legs)} label="Legs" />
        <Figure value={String(cities)} label="Places" />
        <Figure value={distanceKm.toLocaleString('en-US')} label="Kilometres" />
      </div>

      {/* Country ramp — the legend for the route colours, in journey order. */}
      <div className="mt-4">
        <div
          className="flex h-1.5 overflow-hidden rounded-full"
          role="img"
          aria-label={`Route colours in order: ${countries.join(', ')}`}
        >
          {countries.map((c) => (
            <span
              key={c}
              title={c}
              className="flex-1"
              style={{ background: COUNTRY_COLORS[c as Country] }}
            />
          ))}
        </div>
        {/* Each label takes the same share as its segment above, so the two rows
            line up instead of drifting apart. */}
        <div className="mt-1.5 flex">
          {countries.map((c) => (
            <span key={c} className="u-label flex-1 truncate text-center text-[8px] text-mist-600">
              {c === 'Saudi Arabia' ? 'Saudi' : c}
            </span>
          ))}
        </div>
      </div>

      {progress && (
        <div className="mt-4 rounded-md border border-ember-dim/60 bg-ember/8 px-3 py-2">
          <div className="flex items-baseline justify-between">
            <span className="u-display u-tnum text-[17px] text-ember">
              {progress.km.toLocaleString('en-US')}
              <span className="ml-1 text-[10px]">km</span>
            </span>
            <span className="u-label text-[9px] text-ember-soft">Leg {progress.done}</span>
          </div>
          <div className="mt-2 h-0.5 w-full overflow-hidden rounded-full bg-ink-700">
            <div
              className="h-full bg-ember transition-[width] duration-500 ease-linear"
              style={{ width: `${(progress.done / legs) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
