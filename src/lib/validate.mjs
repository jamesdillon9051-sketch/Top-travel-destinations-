/**
 * Content rules for the build.
 *
 * The brief is specific — ten destinations per country, five to seven things to
 * do and foods to try, a full set of sections on every destination page, no
 * image shared between two destinations. Fifty pages is far too many to police
 * by eye, so the build fails loudly instead.
 */

import { existsSync } from 'node:fs';
import path from 'node:path';
import { slugify } from './url.mjs';

const DESTINATIONS_PER_COUNTRY = 10;
const LIST_MIN = 5;
const LIST_MAX = 7;

/** Sections every destination page must carry, per the brief. */
const DESTINATION_SECTIONS = [
  ['intro', (d) => nonEmptyArray(d.intro)],
  ['whyVisit', (d) => nonEmptyArray(d.whyVisit?.points)],
  ['attractions', (d) => nonEmptyArray(d.attractions)],
  ['thingsToDo', (d) => nonEmptyArray(d.thingsToDo)],
  ['foods', (d) => nonEmptyArray(d.foods)],
  ['accommodation', (d) => nonEmptyArray(d.accommodation?.areas)],
  ['gettingThere', (d) => nonEmptyArray(d.gettingThere?.options)],
  ['gettingAround', (d) => nonEmptyArray(d.gettingAround?.options)],
  ['bestTime', (d) => nonEmptyArray(d.bestTime?.seasons)],
  ['itinerary', (d) => nonEmptyArray(d.itinerary?.days)],
  ['tips', (d) => nonEmptyArray(d.tips)],
  ['faq', (d) => nonEmptyArray(d.faq)],
  ['related', (d) => nonEmptyArray(d.relatedPlaces)],
  ['relatedArticles', (d) => nonEmptyArray(d.relatedArticleData)]
];

const COUNTRY_SECTIONS = [
  ['intro', (c) => nonEmptyArray(c.intro)],
  ['thingsToDo', (c) => nonEmptyArray(c.thingsToDo)],
  ['foods', (c) => nonEmptyArray(c.foods)],
  ['practical', (c) => c.practical && Object.keys(c.practical).length > 0],
  ['bestTime', (c) => nonEmptyArray(c.bestTime?.seasons)],
  ['tripDuration', (c) => nonEmptyArray(c.tripDuration?.options)],
  ['transport', (c) => nonEmptyArray(c.transport?.options)],
  ['tips', (c) => nonEmptyArray(c.tips)],
  ['culture', (c) => nonEmptyArray(c.culture?.etiquette)],
  ['itinerary', (c) => nonEmptyArray(c.itinerary?.days)],
  ['faq', (c) => nonEmptyArray(c.faq)]
];

function nonEmptyArray(value) {
  return Array.isArray(value) && value.length > 0;
}

/**
 * @param {object} options
 * @param {boolean} [options.requireImages] Fail rather than warn on a missing image.
 * @param {boolean} [options.strict] Enforce the full content rules. Set false
 *   (DEV=1) while a country is mid-write, so templates can be previewed before
 *   all ten destinations exist.
 */
export function validate(content, { root = process.cwd(), requireImages = true, strict = true } = {}) {
  const errors = [];
  const warnings = [];
  const fail = (message) => (strict ? errors : warnings).push(message);
  const warn = (message) => warnings.push(message);

  const { site, countryList, destinationList, articleList, destinations, articles, credits } = content;

  if (!site?.title || !site?.siteUrl) fail('site.json must define "title" and "siteUrl".');

  // ---- countries -----------------------------------------------------------
  for (const country of countryList) {
    const at = `country "${country.slug}"`;

    if (country.slug !== slugify(country.slug)) fail(`${at}: slug is not URL-safe.`);

    const listed = country.destinations || [];
    if (listed.length !== DESTINATIONS_PER_COUNTRY) {
      fail(`${at}: lists ${listed.length} destinations, expected exactly ${DESTINATIONS_PER_COUNTRY}.`);
    }
    if (new Set(listed).size !== listed.length) fail(`${at}: repeats a destination slug.`);

    for (const slug of listed) {
      const destination = destinations.get(slug);
      if (!destination) {
        fail(`${at}: references destination "${slug}", which has no data file.`);
      } else if (destination.country !== country.slug) {
        fail(`${at}: references "${slug}", but that destination belongs to "${destination.country}".`);
      }
    }

    checkListSize(country.thingsToDo, `${at} thingsToDo`, fail);
    checkListSize(country.foods, `${at} foods`, fail);

    for (const [name, present] of COUNTRY_SECTIONS) {
      if (!present(country)) fail(`${at}: section "${name}" is missing or empty.`);
    }

    if (!country.guide) fail(`${at}: has no travel guide in src/data/guides/${country.slug}.json.`);
    else if (!nonEmptyArray(country.guide.sections)) fail(`${at}: travel guide has no sections.`);
  }

  // ---- destinations --------------------------------------------------------
  const imageOwners = new Map();
  const namesSeen = new Map();

  for (const destination of destinationList) {
    const at = `destination "${destination.slug}"`;

    if (destination.slug !== slugify(destination.slug)) fail(`${at}: slug is not URL-safe.`);
    if (!destination.countryData) fail(`${at}: country "${destination.country}" has no data file.`);
    if (!nonEmptyArray(destination.categories)) fail(`${at}: needs at least one category.`);
    if (!destination.shortDescription) fail(`${at}: needs a shortDescription for its country-page card.`);
    if (!destination.highlight) fail(`${at}: needs a highlight for its country-page card.`);

    const nameKey = destination.name.toLowerCase();
    if (namesSeen.has(nameKey)) {
      fail(`${at}: duplicates the name of "${namesSeen.get(nameKey)}".`);
    }
    namesSeen.set(nameKey, destination.slug);

    checkListSize(destination.thingsToDo, `${at} thingsToDo`, fail);
    checkListSize(destination.foods, `${at} foods`, fail);

    if ((destination.attractions || []).length < 5) {
      fail(`${at}: has ${(destination.attractions || []).length} main attractions, expected at least 5.`);
    }
    if ((destination.faq || []).length < 5) {
      fail(`${at}: has ${(destination.faq || []).length} FAQ entries, expected at least 5.`);
    }
    if ((destination.tips || []).length < 5) {
      fail(`${at}: has ${(destination.tips || []).length} travel tips, expected at least 5.`);
    }

    for (const [name, present] of DESTINATION_SECTIONS) {
      if (!present(destination)) fail(`${at}: section "${name}" is missing or empty.`);
    }

    // Dead internal links are the single easiest defect to ship across 50 pages.
    for (const slug of destination.related || []) {
      if (!destinations.has(slug)) fail(`${at}: related destination "${slug}" does not exist.`);
      if (slug === destination.slug) fail(`${at}: lists itself as a related destination.`);
    }
    for (const slug of destination.relatedArticles || []) {
      if (!articles.has(slug)) fail(`${at}: related article "${slug}" does not exist.`);
    }

    // "Do not reuse the same image for multiple unrelated destinations."
    const file = destination.image?.file;
    if (!file) {
      fail(`${at}: has no image.file.`);
    } else if (imageOwners.has(file)) {
      fail(`${at}: reuses the image of "${imageOwners.get(file)}" (${file}).`);
    } else {
      imageOwners.set(file, destination.slug);
    }
    if (!destination.image?.alt) fail(`${at}: image is missing alt text.`);
  }

  // ---- articles ------------------------------------------------------------
  for (const article of articleList) {
    const at = `article "${article.slug}"`;
    if (article.slug !== slugify(article.slug)) fail(`${at}: slug is not URL-safe.`);
    if (!nonEmptyArray(article.sections)) fail(`${at}: has no sections.`);
    if (!article.summary) fail(`${at}: needs a summary.`);
  }

  // ---- images --------------------------------------------------------------
  const referenced = new Set(
    [
      site.hero?.file,
      ...countryList.map((c) => c.image?.file),
      ...destinationList.map((d) => d.image?.file),
      ...articleList.map((a) => a.image?.file)
    ].filter(Boolean)
  );

  for (const file of referenced) {
    const credit = credits[file];
    if (!credit) {
      const message = `image "${file}" has no entry in content/images/credits.json — run \`npm run images\`.`;
      requireImages ? fail(message) : warn(message);
      continue;
    }
    for (const variant of ['hero', 'card']) {
      const rel = credit[variant];
      if (!rel) {
        const message = `image "${file}" has no ${variant} rendition in credits.json.`;
        requireImages ? fail(message) : warn(message);
      } else if (!existsSync(path.join(root, 'content', rel))) {
        const message = `image "${file}" lists ${variant} file "${rel}", which is not on disk.`;
        requireImages ? fail(message) : warn(message);
      }
    }
  }

  return { errors, warnings };
}

function checkListSize(list, label, fail) {
  const size = Array.isArray(list) ? list.length : 0;
  if (size < LIST_MIN || size > LIST_MAX) {
    fail(`${label}: has ${size} items, expected between ${LIST_MIN} and ${LIST_MAX}.`);
  }
}
