#!/usr/bin/env node
/**
 * Authoring aid: find licence-clean Wikimedia Commons candidates for a
 * destination, so `image.file` in the data files points at something that
 * actually exists and passes the allowlist in fetch-images.mjs.
 *
 *   node scripts/search-commons.mjs "Mont Saint-Michel"
 *   node scripts/search-commons.mjs "Pamukkale travertine" --limit 12
 */

import { setTimeout as sleep } from 'node:timers/promises';

const USER_AGENT =
  'TopTravelDestinations/1.0 (https://github.com/jamesdillon9051-sketch/Top-travel-destinations-)';

const ALLOWED = /^(cc0|cc[- ]by([- ]sa)?([- ]\d|$)|pd([- ]|$)|public[- ]domain|attribution)/i;
const FORBIDDEN = /(\bnc\b|[- ]nc[- ]|[- ]nc$|\bnd\b|[- ]nd[- ]|[- ]nd$|fair[- ]?use|non[- ]?free)/i;

const args = process.argv.slice(2);
const limitIndex = args.indexOf('--limit');
const limit = limitIndex === -1 ? 8 : Number(args[limitIndex + 1]);
const queries = (limitIndex === -1 ? args : args.slice(0, limitIndex)).filter(Boolean);

if (!queries.length) {
  console.error('Usage: node scripts/search-commons.mjs "<query>" ["<query>" …] [--limit N]');
  process.exit(1);
}

async function search(query) {
  const endpoint =
    'https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search' +
    `&gsrsearch=${encodeURIComponent(`${query} filetype:bitmap`)}` +
    `&gsrnamespace=6&gsrlimit=${limit * 3}&prop=imageinfo&iiprop=url%7Cextmetadata%7Csize`;

  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const response = await fetch(endpoint, { headers: { 'User-Agent': USER_AGENT } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      if (attempt === 4) throw error;
      await sleep(2 ** attempt * 400);
    }
  }
}

for (const query of queries) {
  const data = await search(query);
  const pages = Object.values(data?.query?.pages || {}).sort(
    (a, b) => (a.index ?? 0) - (b.index ?? 0)
  );

  console.log(`\n=== ${query} ===`);
  if (!pages.length) {
    console.log('  (no results)');
    continue;
  }

  let shown = 0;
  for (const page of pages) {
    const info = page.imageinfo?.[0];
    if (!info) continue;
    const meta = info.extmetadata || {};
    const licence = (meta.LicenseShortName?.value || meta.License?.value || '').replace(/<[^>]*>/g, '');
    const code = (meta.License?.value || '').toLowerCase();
    const free = !FORBIDDEN.test(code) && (ALLOWED.test(code) || ALLOWED.test(licence));
    if (!free) continue;
    if (info.width < 1200) continue; // too small for a hero

    const artist = (meta.Artist?.value || 'Unknown').replace(/<[^>]*>/g, '').trim().slice(0, 38);
    console.log(
      `  ${page.title}\n      ${info.width}×${info.height}  ${licence}  — ${artist}`
    );
    shown += 1;
    if (shown >= limit) break;
  }
  if (!shown) console.log('  (no freely-licensed results above 1200px)');
}
