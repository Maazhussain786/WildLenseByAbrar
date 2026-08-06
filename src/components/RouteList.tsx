'use client';

import { useEffect, useRef } from 'react';

import { COUNTRY_COLORS } from '@/data/cities';
import type { Leg, LegMode } from '@/data/types';
import { formatKm, groupByCountry } from '@/lib/journey';

/** A glyph per travel mode — faster to scan down a column than repeated words. */
const MODE_GLYPH: Record<LegMode, string> = {
  ride: '›',
  stay: '•',
  ferry: '≈',
  flight: '✈',
  train: '⊟',
};

const MODE_LABEL: Record<LegMode, string> = {
  ride: 'Ride',
  stay: 'In town',
  ferry: 'Ferry',
  flight: 'Flight',
  train: 'Train',
};

type Props = {
  legs: Leg[];
  activeId: string | null;
  /** True when the highlight came from the map, so the list should scroll to it. */
  followActive: boolean;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
  /** Hovering a country lights up that whole stretch of the journey. */
  onHoverCountry: (country: string | null) => void;
  /** Clicking it frames that stretch on the map. */
  onSelectCountry: (country: string) => void;
  activeCountry: string | null;
};

export default function RouteList({
  legs,
  activeId,
  followActive,
  onHover,
  onSelect,
  onHoverCountry,
  onSelectCountry,
  activeCountry,
}: Props) {
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
      {groups.map((group, gi) => {
        const color = COUNTRY_COLORS[group.country];
        const km = group.legs.reduce((s, l) => s + (l.distanceKm ?? 0), 0);

        return (
          <section key={`${group.country}-${gi}`}>
            {/* Chapter break. Sticky so you always know which country you are
                in, and interactive so it can frame that stretch on the map. */}
            <h2 className="sticky top-0 z-10">
              <button
                type="button"
                onMouseEnter={() => onHoverCountry(group.country)}
                onMouseLeave={() => onHoverCountry(null)}
                onFocus={() => onHoverCountry(group.country)}
                onBlur={() => onHoverCountry(null)}
                onClick={() => onSelectCountry(group.country)}
                title={`Zoom to ${group.country}`}
                className={`flex w-full items-center gap-2.5 px-5 py-2.5 text-left outline-none
                            backdrop-blur transition-colors
                            ${activeCountry === group.country ? 'bg-ink-800/95' : 'bg-ink-950/92 hover:bg-ink-900/95'}`}
              >
                <span
                  className="h-3 w-[3px] shrink-0 rounded-full transition-all"
                  style={{
                    background: color,
                    boxShadow: activeCountry === group.country ? `0 0 8px ${color}` : undefined,
                  }}
                />
                <span className="u-display text-[12px] text-mist-100">{group.country}</span>
                <span className="u-label ml-auto text-[9px] text-mist-600">
                  {group.legs.length} · {formatKm(km)}
                </span>
              </button>
            </h2>

            <ul>
              {group.legs.map((leg) => {
                const active = leg.id === activeId;
                const sameCity = leg.fromCity === leg.toCity;

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
                      className={`group relative flex w-full scroll-mt-12 gap-3 px-5 py-2.5 text-left
                                  outline-none transition-colors duration-150
                                  ${active ? 'bg-ink-800' : 'hover:bg-ink-900 focus-visible:bg-ink-900'}`}
                    >
                      {/* Timeline rail: a continuous line with a node per leg. */}
                      <span aria-hidden className="relative w-[3px] shrink-0">
                        <span
                          className="absolute inset-x-0 -top-2.5 bottom-[-10px] rounded-full opacity-25"
                          style={{ background: color }}
                        />
                        <span
                          className={`absolute left-1/2 top-[7px] h-2 w-2 -translate-x-1/2 rounded-full
                                      border-2 transition-all duration-150
                                      ${active ? 'scale-125' : ''}`}
                          style={{
                            background: active ? 'var(--color-ember)' : 'var(--color-ink-950)',
                            borderColor: active ? 'var(--color-ember)' : color,
                          }}
                        />
                      </span>

                      <span
                        className={`u-display u-tnum mt-[3px] w-6 shrink-0 text-[13px] transition-colors
                                    ${active ? 'text-ember' : 'text-mist-600'}`}
                      >
                        {String(leg.order).padStart(2, '0')}
                      </span>

                      <span className="min-w-0 flex-1">
                        <span
                          className={`u-display flex items-baseline gap-1.5 text-[13px] transition-colors
                                      ${active ? 'text-mist-100' : 'text-mist-300'}`}
                        >
                          <span className="truncate">{leg.fromCity}</span>
                          {!sameCity && (
                            <>
                              <span
                                className="shrink-0 text-[11px]"
                                style={{ color: active ? 'var(--color-ember)' : color }}
                              >
                                →
                              </span>
                              <span className="truncate">{leg.toCity}</span>
                            </>
                          )}
                        </span>

                        <span className="mt-1 line-clamp-1 block text-[11px] leading-snug text-mist-600">
                          {leg.shortTitle}
                        </span>

                        <span className="mt-1.5 flex items-center gap-2 font-mono text-[9.5px] text-mist-600">
                          <span title={MODE_LABEL[leg.mode]} className="text-mist-500">
                            {MODE_GLYPH[leg.mode]} {MODE_LABEL[leg.mode]}
                          </span>
                          {leg.distanceKm ? <span>{formatKm(leg.distanceKm)}</span> : null}
                          {leg.duration && <span>{leg.duration}</span>}
                          {leg.needsReview && (
                            <span
                              title={leg.reviewNote}
                              className="ml-auto rounded-sm border border-ink-600 px-1 py-px text-[8.5px] text-mist-500"
                            >
                              ?
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
        );
      })}
    </div>
  );
}
