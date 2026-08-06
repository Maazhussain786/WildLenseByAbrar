'use client';

import { JOURNEY_STATS } from '@/lib/journey';

type Props = {
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

export default function Header({ playing, onTogglePlay, progress }: Props) {
  const { legs, cities, distanceKm } = JOURNEY_STATS;

  return (
    <header className="relative z-[900] shrink-0 border-b border-ink-800 bg-ink-900">
      <div className="flex items-center gap-4 px-4 py-2.5 sm:px-5">
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-[19px] leading-tight text-mist-100 sm:text-[22px]">
            Wild Lens by Abrar
            <span className="mx-2 text-ember">—</span>
            <span className="text-mist-300">Pakistan → Saudi Arabia</span>
          </h1>

          <div className="mt-0.5 flex flex-wrap items-center gap-x-3.5 gap-y-1 sm:gap-x-5">
            <Stat value={String(legs)} label="legs" />
            <Stat value={String(cities)} label="places" />
            <Stat value={distanceKm.toLocaleString('en-US')} label="km" />
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

        <button
          type="button"
          onClick={onTogglePlay}
          aria-pressed={playing}
          className="shrink-0 rounded-md border border-ink-700 px-3 py-1.5 font-mono text-[10px]
                     uppercase tracking-[0.14em] text-mist-300 transition-colors
                     hover:border-ember-dim hover:text-ember"
        >
          {playing ? '❚❚ Pause' : '▶ Play journey'}
        </button>
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
