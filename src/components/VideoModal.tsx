'use client';

import { useEffect, useRef } from 'react';

import type { Leg } from '@/data/types';
import { formatKm, MODE_LABEL } from '@/lib/journey';

type Props = {
  leg: Leg;
  onClose: () => void;
  onStep: (delta: number) => void;
  hasPrev: boolean;
  hasNext: boolean;
};

export default function VideoModal({ leg, onClose, onStep, hasPrev, hasNext }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
  }, [leg.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && hasNext) onStep(1);
      if (e.key === 'ArrowLeft' && hasPrev) onStep(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, onStep, hasNext, hasPrev]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={leg.title}
      className="fixed inset-0 z-[2000] flex items-center justify-center p-4 sm:p-8"
    >
      <button
        type="button"
        aria-label="Close video"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-ink-950/88 backdrop-blur-sm"
      />

      <div
        className="relative z-10 w-full max-w-4xl overflow-hidden rounded-2xl border border-ink-700
                   bg-ink-900 shadow-[0_40px_120px_-20px_rgba(0,0,0,0.9)]"
      >
        <div className="aspect-video w-full bg-black">
          <iframe
            key={leg.videoId}
            className="h-full w-full"
            src={`https://www.youtube.com/embed/${leg.videoId}?autoplay=1&rel=0&modestbranding=1`}
            title={leg.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>

        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:gap-5 sm:p-5">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-mist-600">
              <span className="text-ember">Day {leg.order}</span>
              <span className="h-3 w-px bg-ink-600" />
              <span>Episode {leg.episode}</span>
              <span className="h-3 w-px bg-ink-600" />
              <span>{MODE_LABEL[leg.mode]}</span>
              {leg.distanceKm ? (
                <>
                  <span className="h-3 w-px bg-ink-600" />
                  <span>{formatKm(leg.distanceKm)}</span>
                </>
              ) : null}
            </div>

            <h2 className="mt-1.5 text-[15px] font-medium leading-snug text-mist-100">
              {leg.shortTitle}
            </h2>

            <p className="mt-1 flex items-center gap-1.5 text-[12px] text-mist-500">
              <span>{leg.fromCity}</span>
              {leg.fromCity !== leg.toCity && (
                <>
                  <span className="text-ember">→</span>
                  <span>{leg.toCity}</span>
                </>
              )}
            </p>

            {leg.needsReview && (
              <p className="mt-2 rounded-md border border-ink-700 bg-ink-850 px-2.5 py-1.5 text-[11px] leading-relaxed text-mist-500">
                <span className="text-ember">Unverified route.</span> {leg.reviewNote}
              </p>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => onStep(-1)}
              disabled={!hasPrev}
              aria-label="Previous episode"
              className="rounded-md border border-ink-700 px-2.5 py-2 text-mist-300 transition-colors
                         hover:border-ink-600 hover:text-mist-100 disabled:opacity-30 disabled:hover:border-ink-700"
            >
              ←
            </button>
            <button
              type="button"
              onClick={() => onStep(1)}
              disabled={!hasNext}
              aria-label="Next episode"
              className="rounded-md border border-ink-700 px-2.5 py-2 text-mist-300 transition-colors
                         hover:border-ink-600 hover:text-mist-100 disabled:opacity-30 disabled:hover:border-ink-700"
            >
              →
            </button>
            <a
              href={leg.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md border border-ember-dim bg-ember/10 px-3 py-2 text-[11px] font-medium
                         text-ember-soft transition-colors hover:bg-ember/20"
            >
              Watch on YouTube
            </a>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-md border border-ink-700 px-2.5 py-2 text-mist-300 transition-colors
                         hover:border-ink-600 hover:text-mist-100"
            >
              ✕
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
