# Wild Lens by Abrar — Pakistan → Saudi Arabia

An interactive map of Abrar's overland motorcycle journey from Pakistan to Saudi Arabia.
Every episode of the [Pakistan to Saudi Arabia playlist][playlist] is drawn as one leg of
the route. Hover a route to highlight it and see that episode's video; click to watch it
without leaving the map.

[playlist]: https://www.youtube.com/playlist?list=PLSjc2o-bXB-oxawtq5CJ9KCuXYF3ag51z

## Setup

```bash
npm install
npm run dev          # http://localhost:3000
```

That's the whole setup. There are no API keys, no accounts and no paid services — map
tiles come from OpenStreetMap data (via CARTO's free dark basemap) and all route geometry
is committed to the repo.

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run build:routes` | Re-fetch road geometry from OSRM (see below) |
| `npm run review` | List the legs whose cities were inferred |

## How it works

- **Next.js (App Router) + TypeScript + Tailwind CSS 4.**
- **Leaflet via react-leaflet**, loaded with `dynamic(..., { ssr: false })` because Leaflet
  touches `window` at import time.
- **No routing at render time.** Road geometry is fetched once at build time and committed,
  so a page load makes zero requests to any routing service.

```
src/
  app/globals.css        theme tokens + Leaflet overrides
  components/
    Explorer.tsx         owns hover / selection / play state; ties everything together
    MapCanvas.tsx        the Leaflet map (client-only)
    Sidebar.tsx          leg list, hover-synced with the map
    LegCard.tsx          the card that follows the cursor over a route
    VideoModal.tsx       embedded player
  data/
    legs.ts              the single source of truth — edit this
    cities.ts            name → [lat, lng] gazetteer — edit this
    route-geometry.json  generated, do not hand-edit
scripts/build-routes.mjs generates route-geometry.json
```

### Where the data came from

No `YOUTUBE_API_KEY` was needed: the public playlist page was scraped for video ids,
titles and durations. (`src/data/legs.ts` still works the same if you later regenerate it
from the YouTube Data API — only the scraping step would change.)

The episode titles are descriptive rather than `City to City`, so cities were taken from
the `Route:` line that Abrar puts in each video's own description — for example Ep.18's
reads *"Bandar Mahshahr to Basra via Shalamcheh border"*. Where that line is blank or
copy-pasted from a previous episode, the city was inferred and the leg flagged (below).

Two independent checks support the inferred start: Ep.01's title says a 650 km ride and
OSRM routes Quetta → Taftan at 630 km; Ep.40's title says 860 km and OSRM routes
Riyadh → Medina at 826 km.

## Editing the journey

### Fix a city or a leg

Everything is in **`src/data/legs.ts`**. One entry per episode, in playlist order:

```ts
{
  id: "ep-18",
  order: 18,
  episode: 18,
  videoId: "EtW-l6-KNwk",
  fromCity: "Bandar Mahshahr",
  toCity: "Basra",
  mode: "ride",       // ride | stay | ferry | flight | train
  // needsReview / reviewNote appear only on inferred legs
}
```

`fromCity` and `toCity` must be keys of `CITIES` in **`src/data/cities.ts`** — TypeScript
will reject a name that isn't in the table, so a typo can't silently produce a leg with no
coordinates. To move a place, edit its `coords` there and every leg using it follows.

Only `mode: "ride"` legs get real road routing. `stay` means the episode never leaves the
city — it draws no line, just its own dot fanned out from the city marker.

### After changing any city or leg

```bash
npm run build:routes
```

This re-asks OSRM for the road path of each ride, simplifies it, and rewrites
`src/data/route-geometry.json` (~115 KB, committed). Ferry, flight and train legs get a
smooth curve instead, as does any leg OSRM can't route. It takes about a minute — there's
a deliberate ~1 s pause between requests to stay inside the demo server's fair-use limits.

### Fixing a flagged leg

Legs whose cities were inferred carry `needsReview: true` and a `reviewNote` saying
exactly what was assumed. They show a small **check** tag in the sidebar and a note in the
video modal. To resolve one: correct `fromCity`/`toCity`, delete both `needsReview` and
`reviewNote`, then re-run `npm run build:routes`.

To print them all with their notes:

```bash
npm run review
```

**13 of the 51 legs are currently flagged** — 1, 2, 13, 17, 23, 24, 25, 28, 29, 30, 32, 35
and 38. The most consequential are:

- **Ep.01 `Quetta → Taftan`** — the description's Route line is blank; the start city comes
  from the title's "650 KM ride".
- **Ep.02 `Taftan → Iranshahr`** — blank Route line. Ep.03 departs Iranshahr, so this
  assumes he pushed through in one day; he may have stopped in Zahedan.
- **Ep.17 `Tehran → Bandar Mahshahr`** — ~800 km, probably more than one riding day.
- **Ep.23/24/25** — the description repeats a stale "Chibayish to Najaf" line for three
  consecutive episodes that are actually Najaf, Najaf → Karbala, and Karbala.
- **Ep.35 `Salmiya → Mangaf`** — the Route line covers only ~30 km but the title says he
  reached the Saudi border; only the described portion is drawn.

One city is also approximate: **Wadi Al-Jinn** (`needsReview` in `cities.ts`).

## Notes

- Tiles are CARTO's dark basemap over OpenStreetMap data — free and token-less, and dark by
  default rather than a bright map filtered dark.
- Leaflet's stylesheet is imported from `globals.css`, *before* the overrides there.
  Importing it from the map component instead loads it last, and its default light map
  background wins.
- The header's "Play journey" button traces the legs in order with a running distance total.
- Keyboard: `Esc` closes the player, `←`/`→` step between episodes.
