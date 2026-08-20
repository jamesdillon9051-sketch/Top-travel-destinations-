/**
 * Reads src/data into a single in-memory content model and resolves the
 * cross-references (country → destinations, destination → related destinations
 * and articles) once, so templates only ever deal with real objects.
 */

import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { createLinker, expandLinks } from './markup.mjs';
import { configureUrls } from './url.mjs';

const DATA_DIR = 'src/data';
const CREDITS_FILE = 'content/images/credits.json';

async function readJson(file) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch (error) {
    throw new Error(`Could not parse ${file}: ${error.message}`);
  }
}

async function readJsonDir(dir) {
  if (!existsSync(dir)) return [];
  const names = (await readdir(dir)).filter((n) => n.endsWith('.json')).sort();
  return Promise.all(names.map((name) => readJson(path.join(dir, name))));
}

export async function loadContent(root = process.cwd(), { strictLinks = true } = {}) {
  const dir = (...parts) => path.join(root, DATA_DIR, ...parts);

  const site = await readJson(dir('site.json'));
  // Must happen before any link expansion, which builds hrefs through url().
  configureUrls({ base: site.basePath, siteUrl: site.siteUrl });

  const countryList = await readJsonDir(dir('countries'));
  const guideList = await readJsonDir(dir('guides'));
  const articleList = await readJsonDir(dir('articles'));

  const destinationList = [];
  for (const country of countryList) {
    const found = await readJsonDir(dir('destinations', country.slug));
    destinationList.push(...found);
  }

  const creditsPath = path.join(root, CREDITS_FILE);
  const credits = existsSync(creditsPath) ? await readJson(creditsPath) : {};

  const countries = new Map(countryList.map((c) => [c.slug, c]));
  const guides = new Map(guideList.map((g) => [g.country, g]));
  const articles = new Map(articleList.map((a) => [a.slug, a]));
  const destinations = new Map(destinationList.map((d) => [d.slug, d]));

  // Countries keep their authored destination order — it is the ranked
  // "Best Places to Visit" list, so it must not be re-sorted.
  for (const country of countryList) {
    country.places = (country.destinations || [])
      .map((slug) => destinations.get(slug))
      .filter(Boolean);
    country.guide = guides.get(country.slug) || null;
  }

  for (const destination of destinationList) {
    destination.countryData = countries.get(destination.country) || null;
    destination.relatedPlaces = (destination.related || [])
      .map((slug) => destinations.get(slug))
      .filter(Boolean);
    destination.relatedArticleData = (destination.relatedArticles || [])
      .map((slug) => articles.get(slug))
      .filter(Boolean);
    destination.credit = credits[destination.image?.file] || null;
  }

  for (const country of countryList) {
    country.credit = credits[country.image?.file] || null;
  }
  for (const article of articleList) {
    article.credit = credits[article.image?.file] || null;
  }
  if (site.hero?.file) site.heroCredit = credits[site.hero.file] || null;

  // Expand [[slug]] links once, after cross-references exist, so authored copy
  // can link to other pages inline. Throws on an unknown target.
  const expand = createLinker({ destinations, countries, articles, strict: strictLinks });
  const visited = new WeakSet();
  for (const node of [site, ...countryList, ...guideList, ...articleList, ...destinationList]) {
    expandLinks(node, expand, visited);
  }

  return {
    site,
    credits,
    countries,
    guides,
    articles,
    destinations,
    countryList,
    guideList,
    articleList,
    destinationList
  };
}
