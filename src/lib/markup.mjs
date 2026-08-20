/**
 * Inline internal links inside authored copy.
 *
 * Guides and destination prose need to link to other pages in their own
 * sentences, but the copy lives in JSON where raw <a> tags would be both ugly
 * and unescapable. Instead copy uses a token:
 *
 *   [[paris]]                     → link to Paris, labelled "Paris"
 *   [[paris|the capital]]         → link to Paris, labelled "the capital"
 *   [[c:italy|northern Italy]]    → link to a country page
 *   [[a:europe-by-train]]         → link to an article
 *
 * Unknown targets throw, so a mistyped slug fails the build rather than
 * shipping a dead link on one of fifty pages.
 */

import { esc, raw, isRaw } from './html.mjs';
import { url } from './url.mjs';

const TOKEN = /\[\[([acd]:)?([a-z0-9-]+)(?:\|([^\]]+))?\]\]/g;

/** Long-form guide prose also supports **bold** for lead-ins within a paragraph. */
const BOLD = /\*\*([^*]+)\*\*/g;

/** Keys whose values are identifiers or structured data, never prose. */
const SKIP_KEYS = new Set([
  'slug',
  'country',
  'countryCode',
  'categories',
  'destinations',
  'related',
  'relatedArticles',
  'file',
  'hero',
  'card',
  'id',
  'href',
  'rating',
  'siteUrl',
  'basePath',
  'repoUrl',
  'licenseUrl',
  'sourceUrl',
  'license',
  'artist'
]);

export function createLinker({ destinations, countries, articles, strict = true }) {
  /** In dev builds an unwritten target degrades to plain text so a
   *  half-finished country still renders; a real build fails instead. */
  const miss = (match, slug, label) => {
    if (strict) throw new Error(`Unknown internal link "${match}" in authored copy.`);
    console.warn(`  warning: unresolved link ${match}`);
    // Emit readable text, never the token itself — leaving the brackets in
    // would re-match on a later pass.
    return esc(label || slug.replace(/-/g, ' '));
  };

  return function expand(text) {
    TOKEN.lastIndex = 0;
    BOLD.lastIndex = 0;
    const hasToken = TOKEN.test(text);
    BOLD.lastIndex = 0;
    const hasBold = BOLD.test(text);
    if (!hasToken && !hasBold) return null;
    TOKEN.lastIndex = 0;
    BOLD.lastIndex = 0;

    return esc(text).replace(BOLD, '<strong>$1</strong>').replace(TOKEN, (match, prefix, slug, label) => {
      const kind = (prefix || 'd:').slice(0, 1);

      if (kind === 'c') {
        const country = countries.get(slug);
        if (!country) return miss(match, slug, label);
        return `<a href="${esc(url(country.slug))}">${esc(label || country.name)}</a>`;
      }

      if (kind === 'a') {
        const article = articles.get(slug);
        if (!article) return miss(match, slug, label);
        return `<a href="${esc(url(`articles/${article.slug}`))}">${esc(label || article.title)}</a>`;
      }

      const destination = destinations.get(slug);
      if (!destination) return miss(match, slug, label);
      const href = url(`${destination.country}/${destination.slug}`);
      return `<a href="${esc(href)}">${esc(label || destination.name)}</a>`;
    });
  };
}

/**
 * Walks the loaded content tree and rewrites any string containing a link
 * token into pre-escaped markup. Strings without tokens are left alone so the
 * default escaping in `html` still applies to them.
 *
 * The content graph is cyclic (a country lists its destinations, each of which
 * points back at the country), and the same object is reachable from several
 * roots — so callers must share one `seen` set across every root, or a value
 * gets expanded twice and ends up double-wrapped.
 */
export function expandLinks(node, expand, seen = new WeakSet()) {
  if (typeof node !== 'object' || node === null) return;
  if (isRaw(node)) return; // already-expanded markup, not content to walk
  if (seen.has(node)) return;
  seen.add(node);

  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i += 1) {
      const value = node[i];
      if (typeof value === 'string') {
        const expanded = expand(value);
        if (expanded !== null) node[i] = raw(expanded);
      } else {
        expandLinks(value, expand, seen);
      }
    }
    return;
  }

  for (const [key, value] of Object.entries(node)) {
    if (SKIP_KEYS.has(key)) continue;
    if (typeof value === 'string') {
      const expanded = expand(value);
      if (expanded !== null) node[key] = raw(expanded);
    } else {
      expandLinks(value, expand, seen);
    }
  }
}
