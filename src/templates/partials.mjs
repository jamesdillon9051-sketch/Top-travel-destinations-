import { html, raw, join, esc } from '../lib/html.mjs';
import { url } from '../lib/url.mjs';
import { categoryLabel } from '../lib/taxonomy.mjs';

/* ------------------------------------------------------------------ images */

function creditLine(credit) {
  if (!credit) return '';
  const artist = credit.artist || 'Unknown photographer';
  const source = credit.sourceUrl
    ? html`<a href="${credit.sourceUrl}" rel="noopener nofollow">${artist}</a>`
    : html`${artist}`;
  const licence = credit.licenseUrl
    ? html`<a href="${credit.licenseUrl}" rel="noopener nofollow license">${credit.license}</a>`
    : html`${credit.license}`;
  return html`<span class="credit">Photo: ${source} · ${licence}</span>`;
}

/**
 * Renders an image with its attribution. Falls back to a tinted placeholder so
 * the site still builds and lays out correctly before `npm run images` has run.
 */
export function picture({ credit, alt, variant = 'card', className = '', eager = false, sizes }) {
  const src = credit?.[variant];
  if (!src) {
    return html`<div class="media media--placeholder ${className}" role="img" aria-label="${alt}"></div>`;
  }
  const width = variant === 'hero' ? credit.heroWidth : credit.cardWidth;
  const height = variant === 'hero' ? credit.heroHeight : credit.cardHeight;
  return html`<img
    class="media ${className}"
    src="${url(src)}"
    alt="${alt}"
    ${width ? raw(`width="${esc(width)}"`) : ''}
    ${height ? raw(`height="${esc(height)}"`) : ''}
    ${sizes ? raw(`sizes="${esc(sizes)}"`) : ''}
    loading="${eager ? 'eager' : 'lazy'}"
    decoding="${eager ? 'sync' : 'async'}"
    ${eager ? raw('fetchpriority="high"') : ''}
  >`;
}

export function figure({ credit, alt, variant = 'card', className = '', eager = false }) {
  return html`<figure class="figure ${className}">
    ${picture({ credit, alt, variant, eager })}
    ${credit ? html`<figcaption class="figure__credit">${creditLine(credit)}</figcaption>` : ''}
  </figure>`;
}

/* ------------------------------------------------------------------- chrome */

export function breadcrumbs(trail) {
  return html`<nav class="breadcrumbs" aria-label="Breadcrumb">
    <ol class="breadcrumbs__list">
      ${join(
        trail.map((item, index) =>
          index === trail.length - 1
            ? html`<li class="breadcrumbs__item" aria-current="page">${item.label}</li>`
            : html`<li class="breadcrumbs__item"><a href="${url(item.href)}">${item.label}</a></li>`
        )
      )}
    </ol>
  </nav>`;
}

/** Hero used by country, destination, guide and article pages. */
export function hero({ credit, alt, eyebrow, title, tagline, meta = [], trail, actions }) {
  return html`<div class="hero">
    <div class="hero__media">
      ${picture({ credit, alt, variant: 'hero', eager: true, sizes: '100vw' })}
    </div>
    <div class="hero__scrim"></div>
    <div class="wrap hero__inner">
      ${trail ? breadcrumbs(trail) : ''}
      ${eyebrow ? html`<p class="hero__eyebrow">${eyebrow}</p>` : ''}
      <h1 class="hero__title">${title}</h1>
      ${tagline ? html`<p class="hero__tagline">${tagline}</p>` : ''}
      ${meta.length
        ? html`<ul class="hero__meta">
            ${join(meta.map((item) => html`<li><strong>${item.label}</strong> ${item.value}</li>`))}
          </ul>`
        : ''}
      ${actions ? html`<div class="hero__actions">${actions}</div>` : ''}
    </div>
    ${credit ? html`<p class="hero__credit">${creditLine(credit)}</p>` : ''}
  </div>`;
}

/** Sticky in-page table of contents. */
export function sectionNav(items) {
  if (!items.length) return '';
  return html`<nav class="section-nav" aria-label="On this page">
    <div class="wrap section-nav__inner">
      <span class="section-nav__label">On this page</span>
      <ul class="section-nav__list">
        ${join(items.map((item) => html`<li><a href="#${item.id}">${item.label}</a></li>`))}
      </ul>
    </div>
  </nav>`;
}

export function section({ id, eyebrow, title, lead, body, tone = '' }) {
  return html`<section class="section ${tone}" id="${id}">
    <div class="wrap">
      <header class="section__head">
        ${eyebrow ? html`<p class="section__eyebrow">${eyebrow}</p>` : ''}
        <h2 class="section__title">${title}</h2>
        ${lead ? html`<p class="section__lead">${lead}</p>` : ''}
      </header>
      ${body}
    </div>
  </section>`;
}

export function prose(paragraphs) {
  return html`<div class="prose">
    ${join((paragraphs || []).map((text) => html`<p>${text}</p>`))}
  </div>`;
}

/* -------------------------------------------------------------------- cards */

export function categoryPills(categories) {
  return html`<ul class="pill-row">
    ${join((categories || []).map((slug) => html`<li class="pill">${categoryLabel(slug)}</li>`))}
  </ul>`;
}

/**
 * The "Best Places to Visit" card: rank, image, category, short description,
 * key highlight and an Explore Destination button.
 */
export function destinationCard(destination, { rank, showCountry = false } = {}) {
  const href = url(`${destination.country}/${destination.slug}`);
  const categories = (destination.categories || []).slice(0, 2);
  return html`<article
    class="card"
    data-categories="${(destination.categories || []).join(' ')}"
    data-name="${destination.name.toLowerCase()}"
  >
    <a class="card__media" href="${href}" tabindex="-1" aria-hidden="true">
      ${picture({
        credit: destination.credit,
        alt: destination.image?.alt || destination.name,
        variant: 'card',
        sizes: '(min-width: 60rem) 22rem, (min-width: 40rem) 45vw, 92vw'
      })}
      ${rank ? html`<span class="card__rank">${rank}</span>` : ''}
    </a>
    <div class="card__body">
      <div class="card__cats">
        ${join(categories.map((slug) => html`<span class="pill pill--sm">${categoryLabel(slug)}</span>`))}
      </div>
      <h3 class="card__title"><a href="${href}">${destination.name}</a></h3>
      <p class="card__region">
        ${destination.region}${showCountry && destination.countryData
          ? html`, ${destination.countryData.name}`
          : ''}
      </p>
      <p class="card__text">${destination.shortDescription}</p>
      <p class="card__highlight"><span>Don't miss</span> ${destination.highlight}</p>
      <a class="btn btn--primary card__btn" href="${href}">
        Explore Destination<span aria-hidden="true"> →</span>
        <span class="sr-only"> — ${destination.name}</span>
      </a>
    </div>
  </article>`;
}

export function destinationGrid(places, { ranked = false, showCountry = false } = {}) {
  return html`<div class="card-grid">
    ${join(
      places.map((place, index) =>
        destinationCard(place, { rank: ranked ? index + 1 : null, showCountry })
      )
    )}
  </div>`;
}

export function articleCard(article) {
  return html`<article class="mini-card">
    <a class="mini-card__media" href="${url(`articles/${article.slug}`)}" tabindex="-1" aria-hidden="true">
      ${picture({ credit: article.credit, alt: article.image?.alt || article.title, variant: 'card' })}
    </a>
    <div class="mini-card__body">
      <p class="mini-card__kicker">${article.kicker || 'Travel article'}</p>
      <h3 class="mini-card__title">
        <a href="${url(`articles/${article.slug}`)}">${article.title}</a>
      </h3>
      <p class="mini-card__text">${article.summary}</p>
    </div>
  </article>`;
}

export function countryCard(country) {
  return html`<article class="country-card">
    <a class="country-card__media" href="${url(country.slug)}" tabindex="-1" aria-hidden="true">
      ${picture({ credit: country.credit, alt: country.image?.alt || country.name, variant: 'card' })}
    </a>
    <div class="country-card__body">
      <h3 class="country-card__title"><a href="${url(country.slug)}">${country.name}</a></h3>
      <p class="country-card__text">${country.cardDescription || country.tagline}</p>
      <p class="country-card__meta">
        ${country.places.length} destinations · ${country.continent}
      </p>
      <p class="country-card__places">
        ${join(
          country.places.slice(0, 4).map((p) => html`<span>${p.name}</span>`),
          ' · '
        )} and more
      </p>
    </div>
  </article>`;
}

/* ------------------------------------------------------------------- blocks */

/** Numbered detail list used for Things to Do. */
export function detailList(items, { numbered = true } = {}) {
  const Tag = numbered ? 'ol' : 'ul';
  return raw(`<${Tag} class="detail-list${numbered ? '' : ' detail-list--plain'}">
    ${items
      .map(
        (item) =>
          html`<li class="detail-list__item">
            <h3 class="detail-list__title">${item.title || item.name}</h3>
            <p>${item.text}</p>
            ${item.tip ? html`<p class="detail-list__tip"><span>Tip</span> ${item.tip}</p>` : ''}
          </li>`
      )
      .join('')}
  </${Tag}>`);
}

/** Cards for Local Foods to Try, each with a "where to try it" line. */
export function foodList(items) {
  return html`<ul class="food-grid">
    ${join(
      items.map(
        (item) => html`<li class="food">
          <h3 class="food__name">${item.name}</h3>
          <p class="food__text">${item.text}</p>
          ${item.whereToTry
            ? html`<p class="food__where"><span>Where to try it</span> ${item.whereToTry}</p>`
            : ''}
        </li>`
      )
    )}
  </ul>`;
}

/** Main attractions — image-free so the page stays fast, but detailed. */
export function attractionList(items) {
  return html`<ol class="attractions">
    ${join(
      items.map(
        (item, index) => html`<li class="attraction">
          <span class="attraction__num" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span>
          <div class="attraction__body">
            <h3 class="attraction__name">${item.name}</h3>
            <p>${item.text}</p>
            ${item.tip ? html`<p class="attraction__tip"><span>Tip</span> ${item.tip}</p>` : ''}
          </div>
        </li>`
      )
    )}
  </ol>`;
}

export function factTable(rows) {
  return html`<dl class="facts">
    ${join(
      rows
        .filter((row) => row.value)
        .map(
          (row) => html`<div class="facts__row">
            <dt>${row.label}</dt>
            <dd>${row.value}</dd>
          </div>`
        )
    )}
  </dl>`;
}

export function seasonList(seasons) {
  return html`<ul class="seasons">
    ${join(
      seasons.map(
        (season) => html`<li class="season season--${season.rating || 'good'}">
          <div class="season__head">
            <h3 class="season__name">${season.season}</h3>
            <span class="season__badge">${ratingLabel(season.rating)}</span>
          </div>
          <p>${season.text}</p>
        </li>`
      )
    )}
  </ul>`;
}

function ratingLabel(rating) {
  return (
    { best: 'Best time', good: 'Good', shoulder: 'Shoulder', quiet: 'Quiet', avoid: 'Think twice' }[
      rating
    ] || 'Good'
  );
}

export function itineraryList(days) {
  return html`<ol class="itinerary">
    ${join(
      days.map(
        (day) => html`<li class="itin-day">
          <div class="itin-day__marker"><span>Day</span><strong>${day.day}</strong></div>
          <div class="itin-day__body">
            <h3 class="itin-day__title">${day.title}</h3>
            ${day.summary ? html`<p class="itin-day__summary">${day.summary}</p>` : ''}
            <ul class="itin-day__slots">
              ${join(
                [
                  ['Morning', day.morning],
                  ['Afternoon', day.afternoon],
                  ['Evening', day.evening]
                ]
                  .filter(([, text]) => text)
                  .map(([label, text]) => html`<li><span>${label}</span> ${text}</li>`)
              )}
            </ul>
          </div>
        </li>`
      )
    )}
  </ol>`;
}

export function tipList(tips) {
  return html`<ul class="tips">
    ${join(
      tips.map(
        (tip) => html`<li class="tip">
          <span class="tip__icon" aria-hidden="true"></span>
          <span>${typeof tip === 'string' ? tip : tip.text}</span>
        </li>`
      )
    )}
  </ul>`;
}

/** FAQ built on <details> so it works with JavaScript disabled. */
export function faqList(faq) {
  return html`<div class="faq">
    ${join(
      faq.map(
        (item) => html`<details class="faq__item">
          <summary class="faq__q">${item.q}</summary>
          <div class="faq__a"><p>${item.a}</p></div>
        </details>`
      )
    )}
  </div>`;
}

export function optionList(options) {
  return html`<ul class="options">
    ${join(
      options.map(
        (option) => html`<li class="option">
          <h3 class="option__name">${option.mode || option.name || option.length}</h3>
          <p>${option.text}</p>
          ${option.detail ? html`<p class="option__detail">${option.detail}</p>` : ''}
        </li>`
      )
    )}
  </ul>`;
}

export function calloutList(items, { title, tone = 'do' }) {
  return html`<div class="callout callout--${tone}">
    <h3 class="callout__title">${title}</h3>
    <ul class="callout__list">${join(items.map((item) => html`<li>${item}</li>`))}</ul>
  </div>`;
}

export function filterBar(categories) {
  if (categories.length < 2) return '';
  return html`<div class="filter-bar" data-filter-bar hidden>
    <span class="filter-bar__label">Filter by type</span>
    <div class="filter-bar__buttons">
      <button class="filter-btn is-active" type="button" data-filter="all" aria-pressed="true">
        All
      </button>
      ${join(
        categories.map(
          (slug) => html`<button class="filter-btn" type="button" data-filter="${slug}" aria-pressed="false">
            ${categoryLabel(slug)}
          </button>`
        )
      )}
    </div>
  </div>`;
}
