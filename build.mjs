#!/usr/bin/env node
/**
 * Static site generator for Top Travel Destinations.
 *
 * Reads src/data, validates it against the content rules, renders every page
 * and writes plain HTML into docs/ — which is what GitHub Pages serves. No
 * dependencies: `node build.mjs` is the whole toolchain.
 */

import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

import { loadContent } from './src/lib/load.mjs';
import { validate } from './src/lib/validate.mjs';
import { url, absolute, outputPath } from './src/lib/url.mjs';
import { renderHome } from './src/templates/home.mjs';
import { renderCountry } from './src/templates/country.mjs';
import { renderGuide } from './src/templates/guide.mjs';
import { renderDestination } from './src/templates/destination.mjs';
import { renderArticle } from './src/templates/article.mjs';
import {
  renderDestinationsIndex,
  renderArticlesIndex,
  renderCredits,
  renderNotFound
} from './src/templates/indexes.mjs';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'docs');
const IMAGE_SRC = path.join(ROOT, 'content', 'images');

/** DEV=1 downgrades content-rule failures to warnings while a country is mid-write. */
const STRICT = process.env.DEV !== '1';
/** Images are still being fetched while content is written; warn instead of fail. */
const REQUIRE_IMAGES = process.env.REQUIRE_IMAGES !== '0' && STRICT;

const pages = [];

function addPage(sitePath, markup, { priority = 0.6, changefreq = 'monthly' } = {}) {
  pages.push({ sitePath, markup, priority, changefreq });
}

async function writePages() {
  for (const page of pages) {
    const file = path.join(OUT, outputPath(page.sitePath));
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, page.markup, 'utf8');
  }
}

function sitemap() {
  const entries = pages
    .filter((page) => !page.sitePath.endsWith('.html'))
    .map(
      (page) => `  <url>
    <loc>${absolute(page.sitePath)}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority.toFixed(1)}</priority>
  </url>`
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.w3.org/1999/sitemaps/0.9">
${entries}
</urlset>
`;
}

async function main() {
  const content = await loadContent(ROOT, { strictLinks: STRICT });
  const { site, countryList, destinationList, articleList, destinations, articles, credits } = content;

  const { errors, warnings } = validate(content, {
    root: ROOT,
    requireImages: REQUIRE_IMAGES,
    strict: STRICT
  });
  for (const warning of warnings) console.warn(`  warning: ${warning}`);
  if (errors.length) {
    console.error(`\nContent validation failed with ${errors.length} error(s):\n`);
    for (const error of errors) console.error(`  ✗ ${error}`);
    console.error('');
    process.exit(1);
  }

  // ---- render ---------------------------------------------------------------
  addPage('', renderHome({ site, countryList, destinations, articles }), {
    priority: 1.0,
    changefreq: 'weekly'
  });
  addPage('destinations', renderDestinationsIndex({ site, countryList, destinationList }), {
    priority: 0.9
  });

  for (const country of countryList) {
    addPage(country.slug, renderCountry(country, { site }), { priority: 0.9 });
    addPage(`${country.slug}/travel-guide`, renderGuide(country.guide, country, { site }), {
      priority: 0.8
    });
    for (const destination of country.places) {
      addPage(
        `${country.slug}/${destination.slug}`,
        renderDestination(destination, { site }),
        { priority: 0.8 }
      );
    }
  }

  if (articleList.length) {
    addPage('articles', renderArticlesIndex({ site, articleList }), { priority: 0.7 });
    for (const article of articleList) {
      addPage(`articles/${article.slug}`, renderArticle(article, { site, destinations, articles }), {
        priority: 0.6
      });
    }
  }

  addPage(
    'image-credits',
    renderCredits({ site, credits, countryList, destinationList, articleList }),
    { priority: 0.2 }
  );
  addPage('404.html', renderNotFound({ site, countryList }));

  // ---- write ----------------------------------------------------------------
  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });

  await writePages();

  await mkdir(path.join(OUT, 'assets'), { recursive: true });
  await cp(path.join(ROOT, 'src/assets/css/site.css'), path.join(OUT, 'assets/site.css'));
  await cp(path.join(ROOT, 'src/assets/js/site.js'), path.join(OUT, 'assets/site.js'));

  if (existsSync(IMAGE_SRC)) {
    await cp(IMAGE_SRC, path.join(OUT, 'images'), { recursive: true });
    await rm(path.join(OUT, 'images', 'credits.json'), { force: true });
  }

  await writeFile(path.join(OUT, 'sitemap.xml'), sitemap(), 'utf8');
  await writeFile(
    path.join(OUT, 'robots.txt'),
    `User-agent: *\nAllow: /\n\nSitemap: ${absolute('sitemap.xml')}\n`,
    'utf8'
  );
  // Stops GitHub Pages running the output through Jekyll.
  await writeFile(path.join(OUT, '.nojekyll'), '', 'utf8');

  const destinationPages = pages.filter((p) => /^[a-z-]+\/[a-z0-9-]+$/.test(p.sitePath)).length;
  console.log(`Built ${pages.length} pages into docs/`);
  console.log(
    `  ${countryList.length} countries · ${destinationList.length} destinations · ` +
      `${articleList.length} articles · base path ${url()}`
  );
  if (destinationPages) console.log(`  ${destinationPages} country sub-pages (destinations + guides)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
