#!/usr/bin/env node
/**
 * Fetches every image referenced by the content tree from Wikimedia Commons,
 * checks its licence, converts it to WebP and records attribution.
 *
 *   node scripts/fetch-images.mjs            # only what is missing
 *   node scripts/fetch-images.mjs --force    # re-fetch everything
 *   node scripts/fetch-images.mjs paris nice # only these slugs
 *
 * Output lands in content/images/ and is committed, so nobody needs to run this
 * to build the site. Requires Python with Pillow for the WebP step; without it
 * the downloaded JPEG is kept as-is and a warning is printed.
 *
 * Note: upload.wikimedia.org rejects arbitrary thumbnail widths, so downloads
 * go through Special:FilePath, which resizes reliably.
 */

import { readFile, readdir, writeFile, mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';

const run = promisify(execFile);

const ROOT = process.cwd();
const DATA = path.join(ROOT, 'src/data');
const IMAGES = path.join(ROOT, 'content/images');
const TMP = path.join(IMAGES, '_originals');
const CREDITS = path.join(IMAGES, 'credits.json');

const USER_AGENT =
  'TopTravelDestinations/1.0 (https://github.com/jamesdillon9051-sketch/Top-travel-destinations-)';

const HERO = { width: 1600, maxRatio: 16 / 9 };
const CARD = { width: 800, ratio: 3 / 2 };

/** Free licences only. Anything non-commercial, no-derivatives or unfree fails. */
const ALLOWED = /^(cc0|cc[- ]by([- ]sa)?([- ]\d|$)|pd([- ]|$)|public[- ]domain|attribution)/i;
const FORBIDDEN = /(\bnc\b|[- ]nc[- ]|[- ]nc$|\bnd\b|[- ]nd[- ]|[- ]nd$|fair[- ]?use|non[- ]?free)/i;

const args = process.argv.slice(2);
const force = args.includes('--force');
const only = args.filter((a) => !a.startsWith('--'));

/* ------------------------------------------------------------------ collect */

async function readJson(file) {
  return JSON.parse(await readFile(file, 'utf8'));
}

async function listJson(dir) {
  if (!existsSync(dir)) return [];
  const names = (await readdir(dir)).filter((n) => n.endsWith('.json')).sort();
  return Promise.all(names.map((n) => readJson(path.join(dir, n))));
}

/** Every image the site needs, with the output path it should be written to. */
async function collectTargets() {
  const targets = [];
  const add = (file, alt, dir, name, context) => {
    if (file) targets.push({ file, alt, dir, name, context });
  };

  const site = await readJson(path.join(DATA, 'site.json'));
  add(site.hero?.file, site.hero?.alt, 'home', 'hero', 'Home page');

  const countries = await listJson(path.join(DATA, 'countries'));
  for (const country of countries) {
    add(country.image?.file, country.image?.alt, country.slug, '_country', country.name);
    for (const destination of await listJson(path.join(DATA, 'destinations', country.slug))) {
      add(
        destination.image?.file,
        destination.image?.alt,
        country.slug,
        destination.slug,
        `${destination.name}, ${country.name}`
      );
    }
  }

  for (const article of await listJson(path.join(DATA, 'articles'))) {
    add(article.image?.file, article.image?.alt, 'articles', article.slug, article.title);
  }

  return only.length ? targets.filter((t) => only.includes(t.name)) : targets;
}

/* ---------------------------------------------------------------- commons */

async function request(url, { asBuffer = false, attempts = 4 } = {}) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT, Accept: asBuffer ? 'image/*' : 'application/json' },
        redirect: 'follow'
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return asBuffer ? Buffer.from(await response.arrayBuffer()) : await response.json();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, 2 ** attempt * 500));
      }
    }
  }
  throw new Error(`${url} failed after ${attempts} attempts: ${lastError.message}`);
}

/** Batch metadata lookup — the API accepts up to 50 titles per call. */
async function fetchMetadata(files) {
  const out = new Map();
  for (let i = 0; i < files.length; i += 40) {
    const batch = files.slice(i, i + 40);
    const endpoint =
      'https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo' +
      '&iiprop=url%7Cextmetadata%7Csize&titles=' +
      encodeURIComponent(batch.join('|'));

    const data = await request(endpoint);
    const pages = data?.query?.pages || {};
    const normalised = new Map(
      (data?.query?.normalized || []).map((entry) => [entry.to, entry.from])
    );

    for (const page of Object.values(pages)) {
      const requested = normalised.get(page.title) || page.title;
      if (page.missing !== undefined || !page.imageinfo?.length) {
        out.set(requested, { missing: true, title: page.title });
        continue;
      }
      const info = page.imageinfo[0];
      const meta = info.extmetadata || {};
      const text = (key) =>
        meta[key]?.value ? String(meta[key].value).replace(/<[^>]*>/g, '').trim() : '';

      out.set(requested, {
        title: page.title,
        license: text('LicenseShortName') || text('License'),
        licenseCode: (meta.License?.value || '').toLowerCase(),
        licenseUrl: text('LicenseUrl'),
        artist: text('Artist') || text('Credit') || 'Unknown',
        descriptionUrl: info.descriptionurl,
        width: info.width,
        height: info.height
      });
    }
  }
  return out;
}

function licenceIsFree(meta) {
  const candidates = [meta.licenseCode, meta.license].filter(Boolean).map((s) => s.toLowerCase());
  if (!candidates.length) return false;
  if (candidates.some((value) => FORBIDDEN.test(value))) return false;
  return candidates.some((value) => ALLOWED.test(value));
}

/* ---------------------------------------------------------------- convert */

const PY_CONVERT = `
import sys
from PIL import Image, ImageOps

src, dest, target_w, target_ratio, quality = sys.argv[1], sys.argv[2], int(sys.argv[3]), float(sys.argv[4]), int(sys.argv[5])

img = ImageOps.exif_transpose(Image.open(src))
if img.mode not in ("RGB", "L"):
    img = img.convert("RGB")

w, h = img.size
# Crop to at most target_ratio, anchored above centre so skylines and peaks survive.
if w / h < target_ratio:
    new_h = int(round(w / target_ratio))
    top = int((h - new_h) * 0.35)
    img = img.crop((0, top, w, top + new_h))

if img.width > target_w:
    img = img.resize((target_w, max(1, round(img.height * target_w / img.width))), Image.LANCZOS)

img.save(dest, "WEBP", quality=quality, method=6)
print(f"{img.width} {img.height}")
`;

let pillowAvailable = null;

async function hasPillow() {
  if (pillowAvailable !== null) return pillowAvailable;
  try {
    await run('python3', ['-c', 'import PIL']);
    pillowAvailable = true;
  } catch {
    pillowAvailable = false;
  }
  return pillowAvailable;
}

async function convert(src, dest, width, ratio, quality) {
  const { stdout } = await run('python3', [
    '-c',
    PY_CONVERT,
    src,
    dest,
    String(width),
    String(ratio),
    String(quality)
  ]);
  const [w, h] = stdout.trim().split(/\s+/).map(Number);
  return { width: w, height: h };
}

/* ------------------------------------------------------------------- main */

async function main() {
  const targets = await collectTargets();
  if (!targets.length) {
    console.log('No images referenced yet — nothing to fetch.');
    return;
  }

  const credits = existsSync(CREDITS) ? await readJson(CREDITS) : {};
  const pending = targets.filter((target) => {
    if (force) return true;
    const existing = credits[target.file];
    return (
      !existing ||
      !existing.hero ||
      !existing.card ||
      !existsSync(path.join(ROOT, 'content', existing.hero)) ||
      !existsSync(path.join(ROOT, 'content', existing.card))
    );
  });

  console.log(`${targets.length} image(s) referenced, ${pending.length} to fetch.`);
  if (!pending.length) return;

  if (!(await hasPillow())) {
    console.warn('  warning: Pillow is not installed — images will be stored as JPEG.');
    console.warn('           Install with: pip install Pillow');
  }

  const metadata = await fetchMetadata([...new Set(pending.map((t) => t.file))]);
  const failures = [];

  await mkdir(TMP, { recursive: true });

  for (const target of pending) {
    const meta = metadata.get(target.file);
    const label = `${target.dir}/${target.name}`;

    if (!meta || meta.missing) {
      failures.push(`${label}: "${target.file}" does not exist on Wikimedia Commons.`);
      continue;
    }
    if (!licenceIsFree(meta)) {
      failures.push(
        `${label}: "${target.file}" is licensed "${meta.license || 'unknown'}", which is not on the free-licence allowlist.`
      );
      continue;
    }

    const bare = target.file.replace(/^File:/, '').replace(/ /g, '_');
    const source = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(bare)}?width=${HERO.width}`;

    let buffer;
    try {
      buffer = await request(source, { asBuffer: true });
    } catch (error) {
      failures.push(`${label}: download failed — ${error.message}`);
      continue;
    }

    const outDir = path.join(IMAGES, target.dir);
    await mkdir(outDir, { recursive: true });

    const original = path.join(TMP, `${target.dir}-${target.name}.img`);
    await writeFile(original, buffer);

    const entry = {
      artist: meta.artist,
      license: meta.license,
      licenseUrl: meta.licenseUrl,
      sourceUrl: meta.descriptionUrl,
      context: target.context
    };

    if (await hasPillow()) {
      const heroPath = path.join(outDir, `${target.name}.webp`);
      const cardPath = path.join(outDir, `${target.name}-card.webp`);
      try {
        const hero = await convert(original, heroPath, HERO.width, HERO.maxRatio, 80);
        const card = await convert(original, cardPath, CARD.width, CARD.ratio, 78);
        entry.hero = path.relative(path.join(ROOT, 'content'), heroPath).split(path.sep).join('/');
        entry.card = path.relative(path.join(ROOT, 'content'), cardPath).split(path.sep).join('/');
        entry.heroWidth = hero.width;
        entry.heroHeight = hero.height;
        entry.cardWidth = card.width;
        entry.cardHeight = card.height;
      } catch (error) {
        failures.push(`${label}: WebP conversion failed — ${error.message}`);
        continue;
      }
    } else {
      const jpegPath = path.join(outDir, `${target.name}.jpg`);
      await writeFile(jpegPath, buffer);
      entry.hero = path.relative(path.join(ROOT, 'content'), jpegPath).split(path.sep).join('/');
      entry.card = entry.hero;
    }

    credits[target.file] = entry;
    console.log(`  ✓ ${label.padEnd(34)} ${meta.license}`);
  }

  // Drop entries for images no longer referenced anywhere.
  const referenced = new Set(targets.map((t) => t.file));
  if (!only.length) {
    for (const key of Object.keys(credits)) {
      if (!referenced.has(key)) delete credits[key];
    }
  }

  const sorted = Object.fromEntries(Object.entries(credits).sort(([a], [b]) => a.localeCompare(b)));
  await writeFile(CREDITS, `${JSON.stringify(sorted, null, 2)}\n`, 'utf8');
  await rm(TMP, { recursive: true, force: true });

  if (failures.length) {
    console.error(`\n${failures.length} image(s) failed:\n`);
    for (const failure of failures) console.error(`  ✗ ${failure}`);
    console.error('');
    process.exit(1);
  }

  console.log(`\nWrote ${CREDITS.replace(ROOT + path.sep, '')}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
