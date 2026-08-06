'use client';

import { useLayoutEffect, useRef, useState } from 'react';

import type { Leg } from '@/data/types';
import { MODE_LABEL } from '@/lib/journey';

const CARD_W = 290;
const GAP = 18;

/**
 * The card that follows the cursor when a route is hovered on the map.
 * Positioned fixed and clamped so it never leaves the viewport.
 */
export default function LegCard({ leg, point }: { leg: Leg; point: { x: number; y: number } }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: point.x + GAP, top: point.y + GAP });

  useLayoutEffect(() => {
    const h = ref.current?.offsetHeight ?? 240;
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
      className="pointer-events-none fixed z-[1200] overflow-hidden rounded-xl border border-ink-600
                 bg-ink-900/95 shadow-[0_18px_50px_-12px_rgba(0,0,0,0.85)] backdrop-blur-md"
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
        <div className="absolute inset-0 bg-gradient-to-t from-ink-900 via-transparent to-transparent" />
        {leg.duration && (
          <span className="absolute bottom-2 right-2 rounded bg-ink-950/85 px-1.5 py-0.5 font-mono text-[10px] text-mist-300">
            {leg.duration}
          </span>
        )}
      </div>

      <div className="space-y-2 p-3.5">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-mist-600">
          <span className="text-ember">Day {leg.order}</span>
          <span className="h-3 w-px bg-ink-600" />
          <span>{MODE_LABEL[leg.mode]}</span>
          {leg.distanceKm ? (
            <>
              <span className="h-3 w-px bg-ink-600" />
              <span>{Math.round(leg.distanceKm).toLocaleString('en-US')} km</span>
            </>
          ) : null}
        </div>

        <p className="text-[13px] font-medium leading-snug text-mist-100">{leg.shortTitle}</p>

        <p className="flex items-center gap-1.5 text-[11px] text-mist-500">
          <span>{leg.fromCity}</span>
          <span className="text-ember">→</span>
          <span>{leg.toCity}</span>
        </p>

        <p className="pt-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-mist-600">
          Click to watch
        </p>
      </div>
    </div>
  );
}
