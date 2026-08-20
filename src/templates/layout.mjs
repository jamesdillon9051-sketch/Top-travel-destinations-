import { html, raw, join, jsonLd as ldScript, esc } from '../lib/html.mjs';
import { url, absolute } from '../lib/url.mjs';

/** Inline SVG favicon — a compass rose. Avoids an extra request and a binary file. */
const FAVICON =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='15' fill='%230f766e'/%3E%3Cpath d='M22 10 13.5 13.5 10 22l8.5-3.5z' fill='%23fdfcfa'/%3E%3C/svg%3E";

const NAV = [
  { label: 'Destinations', href: 'destinations' },
  { label: 'France', href: 'france' },
  { label: 'Spain', href: 'spain' },
  { label: 'USA', href: 'united-states' },
  { label: 'Turkey', href: 'turkey' },
  { label: 'Italy', href: 'italy' },
  { label: 'Articles', href: 'articles' }
];

function header(activePath) {
  return html`
    <a class="skip-link" href="#main">Skip to content</a>
    <header class="site-header">
      <div class="wrap site-header__inner">
        <a class="brand" href="${url()}">
          <span class="brand__mark" aria-hidden="true"></span>
          <span class="brand__text">Top Travel<span class="brand__thin">Destinations</span></span>
        </a>
        <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav">
          <span class="nav-toggle__bars" aria-hidden="true"></span>
          <span class="nav-toggle__label">Menu</span>
        </button>
        <nav class="nav" id="site-nav" aria-label="Primary">
          <ul class="nav__list">
            ${join(
              NAV.map((item) => {
                const isActive = activePath === item.href || activePath.startsWith(`${item.href}/`);
                return html`<li>
                  <a class="nav__link${isActive ? ' is-active' : ''}" href="${url(item.href)}"${isActive
                    ? raw(' aria-current="page"')
                    : ''}>${item.label}</a>
                </li>`;
              })
            )}
          </ul>
        </nav>
      </div>
    </header>
  `;
}

function footer(site) {
  const year = new Date().getFullYear();
  return html`
    <footer class="site-footer">
      <div class="wrap site-footer__grid">
        <div class="site-footer__about">
          <span class="brand brand--footer">
            <span class="brand__mark" aria-hidden="true"></span>
            <span class="brand__text">Top Travel<span class="brand__thin">Destinations</span></span>
          </span>
          <p>${site.description}</p>
        </div>
        <div>
          <h2 class="site-footer__title">Countries</h2>
          <ul class="site-footer__list">
            ${join(
              NAV.slice(1, 6).map(
                (item) => html`<li><a href="${url(item.href)}">${item.label}</a></li>`
              )
            )}
          </ul>
        </div>
        <div>
          <h2 class="site-footer__title">Plan a trip</h2>
          <ul class="site-footer__list">
            <li><a href="${url('destinations')}">All 50 destinations</a></li>
            <li><a href="${url('articles')}">Travel articles</a></li>
            <li><a href="${url('france/travel-guide')}">France travel guide</a></li>
            <li><a href="${url('italy/travel-guide')}">Italy travel guide</a></li>
          </ul>
        </div>
        <div>
          <h2 class="site-footer__title">About</h2>
          <ul class="site-footer__list">
            <li><a href="${url('image-credits')}">Image credits</a></li>
            <li><a href="${site.repoUrl}">Source on GitHub</a></li>
          </ul>
        </div>
      </div>
      <div class="wrap site-footer__legal">
        <p>
          © ${year} ${site.title}. An independent travel guide — always check official
          sources for visa, opening-hours and safety information before you travel.
        </p>
        <p>
          Photography from Wikimedia Commons under free licences.
          <a href="${url('image-credits')}">Full credits</a>.
        </p>
      </div>
    </footer>
  `;
}

/**
 * Wraps page content in the site shell.
 *
 * @param {object} options
 * @param {string} options.title      Page <title>, without the site suffix.
 * @param {string} options.description Meta description.
 * @param {string} options.path       Site path, e.g. "france/paris".
 * @param {object} [options.image]    { src, alt } for Open Graph.
 * @param {Array}  [options.schema]   JSON-LD objects.
 */
export function layout({
  site,
  title,
  description,
  path: pagePath = '',
  image,
  schema = [],
  bodyClass = '',
  content
}) {
  const fullTitle = pagePath === '' ? `${site.title} — ${site.tagline}` : `${title} | ${site.title}`;
  const ogImage = image?.src ? absolute(image.src) : absolute(site.hero?.card || '');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(absolute(pagePath))}">
<meta name="theme-color" content="#0f766e" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#14120f" media="(prefers-color-scheme: dark)">
<meta property="og:type" content="${pagePath === '' ? 'website' : 'article'}">
<meta property="og:site_name" content="${esc(site.title)}">
<meta property="og:title" content="${esc(fullTitle)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(absolute(pagePath))}">
<meta property="og:image" content="${esc(ogImage)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(fullTitle)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(ogImage)}">
<link rel="icon" href="${FAVICON}">
<link rel="stylesheet" href="${esc(url('assets/site.css'))}">
${schema.map((item) => ldScript(item).toString()).join('\n')}
</head>
<body class="${esc(bodyClass)}">
${header(pagePath).toString()}
<main id="main">
${content.toString()}
</main>
${footer(site).toString()}
<script src="${esc(url('assets/site.js'))}" defer></script>
</body>
</html>
`;
}
