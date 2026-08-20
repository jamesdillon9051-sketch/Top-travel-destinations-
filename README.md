# Top Travel Destinations

A static travel-planning site covering **France, Spain, the United States, Turkey and
Italy** — ten hand-picked destinations in each, every one with its own full guide.

Each destination page covers what is actually worth seeing, what to eat and where, which
neighbourhood to sleep in, how to get around, when to go, a day-by-day itinerary, travel
tips and an FAQ. Each country gets a structured country page listing its ten destinations
plus a separate long-form travel guide that ties them into real trips.

## Status

| Country | Destinations | Country page | Travel guide |
| --- | --- | --- | --- |
| France | 10 | ✅ | ✅ |
| Spain | 10 | ✅ | ✅ |
| United States | 10 | ✅ | ✅ |
| Turkey | 10 | ✅ | ✅ |
| Italy | 10 | ✅ | ✅ |

Version 1 is complete: 5 countries, 50 destination pages, 5 country travel guides and 10
cross-country articles — 75 pages in total.

## How it works

A zero-dependency Node generator. Content lives as JSON in `src/data`, templates are
plain functions returning HTML strings, and the output is static HTML written to `docs/`
— which is what GitHub Pages serves. There is no framework, no `node_modules` and no
build step for the reader.

```
build.mjs                      load → validate → render → write docs/
scripts/fetch-images.mjs       Wikimedia Commons → licence check → WebP → credits.json
scripts/check-links.mjs        assert every internal link resolves to a built file
scripts/search-commons.mjs     authoring aid: find licence-clean image candidates
src/lib/                       html helpers, URLs, content loading, validation, markup
src/templates/                 layout, partials, home, country, guide, destination,
                               article, index pages
src/assets/                    hand-written CSS and progressive-enhancement JS
src/data/
  site.json                    site config and home page content
  countries/<slug>.json        country pages
  guides/<slug>.json           long-form country travel guides
  destinations/<country>/*.json
  articles/*.json
content/images/                committed WebP renditions + credits.json
docs/                          build output (committed, served by GitHub Pages)
```

## Commands

```bash
npm run build        # build to docs/ using the production base path
npm run build:local  # build with BASE_PATH=/ so docs/ can be served directly
npm run serve        # build locally and serve docs/ at http://localhost:8080
npm run check        # verify every internal link resolves
npm test             # build + link check
npm run images       # fetch any missing images from Wikimedia Commons
```

`DEV=1` downgrades content-rule failures to warnings, which is useful while a country is
half-written. A normal build is strict.

## Content rules

`src/lib/validate.mjs` fails the build rather than letting fifty pages drift. It enforces
that each country lists exactly ten destinations that exist and belong to it, that things
to do and foods to try are five to seven items on both country and destination pages,
that every required section is present and non-empty, that every internal reference
resolves, and that **no image is reused between two destinations**.

Authored copy can link to other pages inline with a `[[slug]]` token — `[[paris]]`,
`[[paris|the capital]]`, `[[c:france]]` for a country, `[[a:europe-by-train]]` for an
article. An unknown target fails the build.

## Images and licensing

Every photograph comes from Wikimedia Commons under a free licence — public domain, CC0,
CC BY or CC BY-SA. `scripts/fetch-images.mjs` queries the Commons API for each file's
licence metadata, **rejects anything outside that allowlist**, downloads via
`Special:FilePath`, converts to WebP at two sizes with Pillow, and records photographer,
licence and source URL in `content/images/credits.json`.

Attribution renders as a credit line beneath every image and on the `/image-credits/`
page. The images are committed, so the fetch script only needs to run when new content is
added. It needs Python with Pillow; without it, source JPEGs are kept and a warning is
printed.

`scripts/search-commons.mjs "<query>"` lists licence-clean, high-resolution candidates
when adding a new destination.

## Deploying

`docs/` is committed, so GitHub Pages can serve it directly: **Settings → Pages → Deploy
from a branch**, then pick the branch and the `/docs` folder. The base path is set in
`src/data/site.json` (`basePath`) and every link is generated through a single `url()`
helper, so nothing is hard-coded to a domain.
