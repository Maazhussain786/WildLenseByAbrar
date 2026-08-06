'use client';

import { useEffect, useRef } from 'react';

import { COUNTRY_COLORS } from '@/data/cities';
import type { Leg } from '@/data/legs';
import { formatKm, groupByCountry, MODE_LABEL } from '@/lib/journey';

type Props = {
  legs: Leg[];
  activeId: string | null;
  /** True when the highlight came from the map, so the list should scroll to it. */
  followActive: boolean;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
};

export default function Sidebar({ legs, activeId, followActive, onHover, onSelect }: Props) {
  const listRef = useRef<HTMLDivElement>(null);
  const groups = groupByCountry(legs);

  // Keep the list in step with the map, but never fight the user's own scrolling.
  useEffect(() => {
    if (!followActive || !activeId) return;
    const el = listRef.current?.querySelector<HTMLElement>(`[data-leg="${activeId}"]`);
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [activeId, followActive]);

  return (
    <div ref={listRef} className="scroll-slim h-full overflow-y-auto overscroll-contain">
      {groups.map((group, gi) => (
        <section key={`${group.country}-${gi}`}>
          <h2
            className="sticky top-0 z-10 flex items-center gap-2 border-b border-ink-800 bg-ink-900/92
                       px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-mist-500 backdrop-blur"
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: COUNTRY_COLORS[group.country] }}
            />
            {group.country}
            <span className="ml-auto text-mist-600">{group.legs.length}</span>
          </h2>

          <ul>
            {group.legs.map((leg) => {
              const active = leg.id === activeId;
              // scroll-mt-10 below keeps the item clear of the sticky country
              // header when the map scrolls it into view.
              return (
                <li key={leg.id}>
                  <button
                    type="button"
                    data-leg={leg.id}
                    onMouseEnter={() => onHover(leg.id)}
                    onMouseLeave={() => onHover(null)}
                    onFocus={() => onHover(leg.id)}
                    onBlur={() => onHover(null)}
                    onClick={() => onSelect(leg.id)}
                    aria-current={active || undefined}
                    className={`group relative flex w-full scroll-mt-10 items-start gap-3 border-b
                                border-ink-850 px-4 py-3 text-left transition-colors duration-150 outline-none
                                focus-visible:bg-ink-800
                                ${active ? 'bg-ink-800' : 'hover:bg-ink-850'}`}
                  >
                    <span
                      aria-hidden
                      className={`absolute inset-y-0 left-0 w-[2px] transition-colors duration-150
                                  ${active ? 'bg-ember' : 'bg-transparent'}`}
                    />

                    <span
                      className={`mt-0.5 w-7 shrink-0 font-mono text-[11px] tabular-nums transition-colors
                                  ${active ? 'text-ember' : 'text-mist-600'}`}
                    >
                      {String(leg.order).padStart(2, '0')}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span
                        className={`flex items-center gap-1.5 text-[12px] font-medium transition-colors
                                    ${active ? 'text-mist-100' : 'text-mist-300'}`}
                      >
                        <span className="truncate">{leg.fromCity}</span>
                        {leg.fromCity !== leg.toCity && (
                          <>
                            <span className={active ? 'text-ember' : 'text-mist-600'}>→</span>
                            <span className="truncate">{leg.toCity}</span>
                          </>
                        )}
                      </span>

                      <span className="mt-0.5 line-clamp-1 block text-[11px] leading-relaxed text-mist-600">
                        {leg.shortTitle}
                      </span>

                      <span className="mt-1 flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.1em] text-mist-600">
                        <span>{MODE_LABEL[leg.mode]}</span>
                        {leg.distanceKm ? (
                          <>
                            <span className="h-2.5 w-px bg-ink-600" />
                            <span>{formatKm(leg.distanceKm)}</span>
                          </>
                        ) : null}
                        {leg.duration && (
                          <>
                            <span className="h-2.5 w-px bg-ink-600" />
                            <span>{leg.duration}</span>
                          </>
                        )}
                        {leg.needsReview && (
                          <span
                            title={leg.reviewNote}
                            className="ml-auto rounded-sm border border-ink-600 px-1 py-px text-[8.5px] text-mist-500"
                          >
                            check
                          </span>
                        )}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
