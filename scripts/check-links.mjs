#!/usr/bin/env node
/**
 * Post-build link and asset check.
 *
 * Walks every generated page in docs/ and asserts that each internal href,
 * image src, stylesheet and script resolves to a file that was actually
 * written, and that every in-page #anchor exists on the page that points to it.
 * With ~75 pages cross-linking each other, this is the only practical way to
 * guarantee no dead links ship.
 */

import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'docs');

const HREF = /(?:href|src)="([^"]+)"/g;
const ID = /\sid="([^"]+)"/g;

async function walk(dir) {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(full)));
    else if (entry.name.endsWith('.html')) files.push(full);
  }
  return files;
}

/** Map a site-absolute URL to the file docs/ should contain. */
function resolveTarget(href, basePath) {
  let clean = href.split('#')[0].split('?')[0];
  if (!clean) return null;
  if (!clean.startsWith(basePath)) return { outside: true, clean };

  clean = clean.slice(basePath.length);
  if (!clean || clean.endsWith('/')) clean += 'index.html';
  else if (!/\.[a-z0-9]{2,5}$/i.test(clean)) clean += '/index.html';
  return { file: path.join(OUT, clean), clean };
}

async function main() {
  if (!existsSync(OUT)) {
    console.error('docs/ does not exist — run `npm run build` first.');
    process.exit(1);
  }

  const site = JSON.parse(await readFile(path.join(ROOT, 'src/data/site.json'), 'utf8'));
  let basePath = process.env.BASE_PATH ?? site.basePath ?? '/';
  if (!basePath.endsWith('/')) basePath += '/';

  const files = await walk(OUT);
  const errors = [];
  let checked = 0;
  let external = 0;

  for (const file of files) {
    const relative = path.relative(OUT, file);
    const source = await readFile(file, 'utf8');

    const ids = new Set();
    ID.lastIndex = 0;
    let idMatch;
    while ((idMatch = ID.exec(source))) ids.add(idMatch[1]);

    HREF.lastIndex = 0;
    let match;
    while ((match = HREF.exec(source))) {
      const href = match[1];

      if (/^(https?:|mailto:|tel:|data:)/i.test(href)) {
        external += 1;
        continue;
      }

      // Same-page anchor.
      if (href.startsWith('#')) {
        const id = href.slice(1);
        if (id && !ids.has(id)) errors.push(`${relative}: anchor "${href}" has no matching id.`);
        checked += 1;
        continue;
      }

      if (!href.startsWith('/')) {
        errors.push(`${relative}: relative link "${href}" — every link must go through url().`);
        continue;
      }

      const target = resolveTarget(href, basePath);
      if (!target) continue;
      if (target.outside) {
        errors.push(`${relative}: link "${href}" does not start with the base path "${basePath}".`);
        continue;
      }

      checked += 1;
      if (!existsSync(target.file)) {
        errors.push(`${relative}: link "${href}" → missing ${path.relative(ROOT, target.file)}`);
      }
    }
  }

  console.log(
    `Checked ${checked} internal links and assets across ${files.length} pages ` +
      `(${external} external links skipped).`
  );

  if (errors.length) {
    const unique = [...new Set(errors)];
    console.error(`\n${unique.length} broken link(s):\n`);
    for (const error of unique.slice(0, 60)) console.error(`  ✗ ${error}`);
    if (unique.length > 60) console.error(`  … and ${unique.length - 60} more`);
    console.error('');
    process.exit(1);
  }

  console.log('No broken internal links.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
