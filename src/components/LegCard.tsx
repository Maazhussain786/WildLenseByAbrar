'use client';

import { useLayoutEffect, useRef, useState } from 'react';

import { COUNTRY_COLORS, CITIES } from '@/data/cities';
import type { Leg } from '@/data/types';
import { MODE_LABEL } from '@/lib/journey';

const CARD_W = 300;
const GAP = 18;

/**
 * The card that follows the cursor when a route is hovered on the map.
 * Positioned fixed and clamped so it never leaves the viewport.
 */
export default function LegCard({ leg, point }: { leg: Leg; point: { x: number; y: number } }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: point.x + GAP, top: point.y + GAP });
  const color = COUNTRY_COLORS[CITIES[leg.toCity].country];

  useLayoutEffect(() => {
    const h = ref.current?.offsetHeight ?? 250;
    const { innerWidth: vw, innerHeight: vh } = window;

    let left = point.x + GAP;
    if (left + CARD_W > vw - 12) left = point.x - GAP - CARD_W;
    left = Math.max(12, Math.min(left, vw - CARD_W - 12));

    let top = point.y + GAP;
    if (top + h > vh - 12) top = point.y - GAP - h;
    top = Math.max(12, Math.min(top, vh - h - 12));

    setPos({ left, top });
  }, [point.x, point.y]);

  return (
    <div
      ref={ref}
      style={{ left: pos.left, top: pos.top, width: CARD_W }}
      className="u-panel pointer-events-none fixed z-[1200] overflow-hidden rounded-xl"
    >
      <div className="relative aspect-video w-full bg-ink-800">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={leg.thumbnail}
          alt=""
          className="h-full w-full object-cover"
          loading="eager"
          decoding="async"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/10 to-transparent" />
        {leg.duration && (
          <span className="absolute bottom-2 right-2 rounded bg-ink-950/85 px-1.5 py-0.5 font-mono text-[10px] text-mist-300">
            {leg.duration}
          </span>
        )}
        {/* Country stripe ties the card to the route colour it came from. */}
        <span className="absolute inset-x-0 bottom-0 h-[3px]" style={{ background: color }} />
      </div>

      <div className="space-y-2 p-4">
        <div className="flex items-center gap-2">
          <span className="u-display u-tnum text-[15px] text-ember">
            {String(leg.order).padStart(2, '0')}
          </span>
          <span className="u-label text-[8.5px] text-mist-600">{MODE_LABEL[leg.mode]}</span>
          {leg.distanceKm ? (
            <span className="u-label ml-auto u-tnum text-[8.5px] text-mist-500">
              {Math.round(leg.distanceKm).toLocaleString('en-US')} km
            </span>
          ) : null}
        </div>

        <p className="u-display flex items-baseline gap-1.5 text-[14px] text-mist-100">
          <span className="truncate">{leg.fromCity}</span>
          {leg.fromCity !== leg.toCity && (
            <>
              <span style={{ color }}>→</span>
              <span className="truncate">{leg.toCity}</span>
            </>
          )}
        </p>

        <p className="text-[11.5px] leading-snug text-mist-500">{leg.shortTitle}</p>

        <p className="u-label pt-1 text-[8.5px] text-ember-soft">Click to watch ▸</p>
      </div>
    </div>
  );
}
