# Wild Lens by Abrar — overland tours, mapped

An interactive globe of Abrar's overland motorcycle journeys. Every episode of a tour's
YouTube playlist is drawn as one leg of the route: hover a route to highlight it and see
that episode's video, click to watch it without leaving the map.

Currently mapped: **[Pakistan → Saudi Arabia][playlist]** — 51 episodes, 31 places,
9,764 km. Six more tours from the channel are declared in the registry and not yet
mapped; see [Adding a tour](#adding-a-tour).

[playlist]: https://www.youtube.com/playlist?list=PLSjc2o-bXB-oxawtq5CJ9KCuXYF3ag51z

## Setup

```bash
npm install
npm run dev          # http://localhost:3000
```

That's the whole setup. No API keys, no accounts, no paid services: the basemap is
OpenStreetMap vector data served free and token-less by OpenFreeMap, and every route's
road geometry is committed to the repo.

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run check:map` | Validate the map layers against the MapLibre style spec |
| `npm run build:routes` | Re-fetch road geometry from OSRM (see below) |
| `npm run review` | List the legs whose cities were inferred |

## How it works

- **Next.js (App Router) + TypeScript + Tailwind CSS 4.**
- **MapLibre GL** with the `globe` projection, loaded via `dynamic(..., { ssr: false })`
  because it touches `window` at import time. A Globe/Flat toggle switches projection.
- **Colour carries meaning.** Routes are coloured by the country a leg ends in, from the
  same table the sidebar and the header legend use. The one accent colour (amber) is
  reserved for the highlighted leg, so nothing else competes with it.
- **No routing at render time.** Road geometry is fetched once at build time and
  committed, so a page load makes zero requests to any routing service.

```
src/
  app/globals.css              theme tokens + MapLibre overrides
  components/
    Explorer.tsx               owns hover / selection / play state
    MapCanvas.tsx              the MapLibre globe (client-only)
    Header.tsx                 stats, legend, tour switcher, globe/flat toggle
    Sidebar.tsx                leg list, hover-synced with the map
    LegCard.tsx                the card that follows the cursor over a route
    VideoModal.tsx             embedded player
  lib/
    mapLayers.ts               every map layer spec (see below)
    journey.ts                 grouping + formatting helpers
  data/
    types.ts                   Leg and Tour types
    cities.ts                  name -> [lat, lng] gazetteer, shared by all tours
    tours/index.ts             the tour registry
    tours/<tour>.ts            one tour's authored legs
    route-geometry.json        generated, do not hand-edit
scripts/
  build-routes.mjs             generates route-geometry.json
  check-map-style.mjs          validates the layers without a browser
  list-review.mjs              lists inferred legs
```

### Why the layers live in `src/lib/mapLayers.ts`

A bad MapLibre expression only throws when `addLayer` runs in a real browser, and some
mistakes are quiet — layout properties such as `text-size` reject `feature-state`, which
is easy to write by accident. Keeping the layer specs in a module that imports nothing
from the app (colours are passed in) lets `npm run check:map` run them through the same
validator MapLibre uses internally, in plain Node. It caught exactly that bug once
already.

If you edit a layer, run `npm run check:map`.

## Adding a tour

Tours live in `src/data/tours/`. `index.ts` holds the registry: `MAPPED` for tours with
legs, `PLANNED_TOURS` for playlists that exist on the channel but nobody has mapped yet.
The header's **Tours** menu lists both.

To promote a planned tour:

1. Scrape its playlist for video ids, titles and durations, and write
   `src/data/tours/<id>.ts` exporting `meta` and `legs` — copy the shape of
   `pakistan-to-saudi-arabia.ts`.
2. Add any new places to `CITIES` in `src/data/cities.ts`. `fromCity`/`toCity` are typed
   against that table, so a typo fails the build rather than silently producing a leg
   with no coordinates.
3. Import it in `src/data/tours/index.ts`, add it to `MAPPED`, and drop it from
   `PLANNED_TOURS`.
4. Run `npm run build:routes`. Only new or changed legs are fetched — everything else is
   reused from the cache, so adding one tour will not re-request the others.

### Where the data came from

No `YOUTUBE_API_KEY` was needed: the public playlist page was scraped for video ids,
titles and durations. (The data files work the same if you later regenerate them from the
YouTube Data API — only the scraping step would change.)

The episode titles are descriptive rather than `City to City`, so cities were taken from
the `Route:` line that Abrar puts in each video's own description — for example Ep.18's
reads *"Bandar Mahshahr to Basra via Shalamcheh border"*. Where that line is blank or
copy-pasted from a previous episode, the city was inferred and the leg flagged (below).

Two independent checks support the inferred start: Ep.01's title says a 650 km ride and
OSRM routes Quetta → Taftan at 630 km; Ep.40's title says 860 km and OSRM routes
Riyadh → Medina at 826 km.

## Editing the journey

### Fix a city or a leg

Legs live in **`src/data/tours/<tour>.ts`**. One entry per episode, in playlist order:

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
coordinates. To move a place, edit its `coords` there and every leg using it follows, in
every tour.

Only `mode: "ride"` legs get real road routing. `stay` means the episode never leaves the
city — it draws no line, just its own dot fanned out from the city marker.

### After changing any city or leg

```bash
npm run build:routes
```

This re-asks OSRM for the road path of each ride, simplifies it, and rewrites
`src/data/route-geometry.json` (~115 KB, committed, keyed `<tourId>/<legId>`). Ferry,
flight and train legs get a smooth curve instead, as does any leg OSRM can't route.

Legs whose endpoints and mode are unchanged are reused from the existing cache, so a
re-run is fast; pass `--force` to re-fetch everything. A full run takes about a minute —
there's a deliberate ~1 s pause between requests to stay inside the demo server's fair-use
limits.

### Fixing a flagged leg

Legs whose cities were inferred carry `needsReview: true` and a `reviewNote` saying
exactly what was assumed. They show a small **check** tag in the sidebar and a note in the
video modal. To resolve one: correct `fromCity`/`toCity` in the tour file, delete both `needsReview`
and `reviewNote`, then re-run `npm run build:routes`.

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

- The basemap is OpenFreeMap's Liberty style: OpenStreetMap vector data over Natural Earth
  shaded relief, free and token-less. `STYLE_URL` in `MapCanvas.tsx` is the single place to
  change it; CARTO's Voyager is a drop-in alternative, also token-free.
- MapLibre's stylesheet is imported from `globals.css`, *before* the overrides there.
  Importing it from the map component instead loads it last and its own control styling
  wins.
- MapLibre renders through WebGL on `requestAnimationFrame`, so a hidden or fully occluded
  tab draws nothing until it becomes visible. That is normal browser throttling, not a bug.
- The header's "Play journey" button traces the legs in order with a running distance total.
- Keyboard: `Esc` closes the player, `←`/`→` step between episodes.
