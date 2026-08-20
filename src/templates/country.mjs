import { html, join, plain } from '../lib/html.mjs';
import { url, absolute } from '../lib/url.mjs';
import { CATEGORY_ORDER } from '../lib/taxonomy.mjs';
import { displayName, inlineName } from '../lib/text.mjs';
import { layout } from './layout.mjs';
import {
  hero,
  sectionNav,
  section,
  prose,
  destinationGrid,
  detailList,
  foodList,
  factTable,
  seasonList,
  itineraryList,
  tipList,
  faqList,
  optionList,
  calloutList,
  filterBar
} from './partials.mjs';

const SECTIONS = [
  { id: 'places', label: 'Best places' },
  { id: 'things-to-do', label: 'Things to do' },
  { id: 'food', label: 'Food' },
  { id: 'practical', label: 'Practical info' },
  { id: 'best-time', label: 'Best time' },
  { id: 'duration', label: 'How long' },
  { id: 'transport', label: 'Transport' },
  { id: 'itinerary', label: 'Itinerary' },
  { id: 'culture', label: 'Culture' },
  { id: 'tips', label: 'Tips' },
  { id: 'faq', label: 'FAQ' }
];

export function renderCountry(country, { site }) {
  const name = displayName(country);
  const inName = inlineName(country);
  const description = plain(country.metaDescription || country.intro[0], 158);
  const usedCategories = CATEGORY_ORDER.filter((slug) =>
    country.places.some((place) => (place.categories || []).includes(slug))
  );

  const content = html`
    ${hero({
      credit: country.credit,
      alt: country.image?.alt || country.name,
      eyebrow: country.continent,
      title: `${name} Travel Guide`,
      tagline: country.tagline,
      meta: [
        { label: 'Destinations', value: `${country.places.length} hand-picked` },
        { label: 'Best time', value: country.bestTime.headline },
        { label: 'Ideal trip', value: country.tripDuration.headline }
      ].filter((m) => m.value),
      trail: [{ label: 'Home', href: '' }, { label: country.name }],
      actions: html`
        <a class="btn btn--primary" href="#places">See the 10 best places</a>
        <a class="btn btn--ghost btn--on-dark" href="${url(`${country.slug}/travel-guide`)}">
          Full ${name} travel guide
        </a>
      `
    })}

    ${sectionNav(SECTIONS)}

    <section class="section section--intro" id="introduction">
      <div class="wrap layout-split">
        <div class="layout-split__main">
          <h2 class="section__title">${`Why go to ${inName}`}</h2>
          ${prose(country.intro)}
        </div>
        <aside class="layout-split__aside">
          <div class="panel">
            <h2 class="panel__title">Country basics</h2>
            ${factTable([
              { label: 'Capital', value: country.practical.capital },
              { label: 'Language', value: country.practical.language },
              { label: 'Currency', value: country.practical.currency },
              { label: 'Time zone', value: country.practical.timeZone },
              { label: 'Best time', value: country.bestTime.headline },
              { label: 'Ideal trip', value: country.tripDuration.headline }
            ])}
            <a class="btn btn--ghost panel__btn" href="${url(`${country.slug}/travel-guide`)}">
              Read the full travel guide
            </a>
          </div>
        </aside>
      </div>
    </section>

    ${section({
      id: 'places',
      eyebrow: 'Where to go',
      title: `Best Places to Visit in ${inName}`,
      lead: country.placesIntro,
      tone: 'section--tint',
      body: html`
        ${filterBar(usedCategories)}
        ${destinationGrid(country.places, { ranked: true })}
        <p class="section__more">
          <a class="btn btn--ghost" href="${url('destinations')}">
            Browse all 50 destinations<span aria-hidden="true"> →</span>
          </a>
        </p>
      `
    })}

    ${section({
      id: 'things-to-do',
      eyebrow: 'Experiences',
      title: `Best things to do in ${inName}`,
      lead: country.thingsToDoIntro,
      body: detailList(country.thingsToDo)
    })}

    ${section({
      id: 'food',
      eyebrow: 'Food and drink',
      title: `${name} foods to try`,
      lead: country.foodIntro,
      tone: 'section--tint',
      body: foodList(country.foods)
    })}

    ${section({
      id: 'practical',
      eyebrow: 'Before you go',
      title: `Practical travel information for ${inName}`,
      lead: country.practicalIntro,
      body: html`
        ${factTable([
          { label: 'Capital', value: country.practical.capital },
          { label: 'Language', value: country.practical.language },
          { label: 'Currency', value: country.practical.currency },
          { label: 'Cards and cash', value: country.practical.money },
          { label: 'Entry and visas', value: country.practical.visa },
          { label: 'Power sockets', value: country.practical.plugs },
          { label: 'Emergency number', value: country.practical.emergency },
          { label: 'Tipping', value: country.practical.tipping },
          { label: 'Safety', value: country.practical.safety },
          { label: 'Internet and SIM', value: country.practical.connectivity },
          { label: 'Time zone', value: country.practical.timeZone }
        ])}
        ${country.practical.budget
          ? html`<div class="budget-bands">
              <h3 class="budget-bands__title">Daily budget guide (per person)</h3>
              ${factTable(country.practical.budget.map((b) => ({ label: b.label, value: b.value })))}
              <p class="note">Excludes international flights. Figures are typical rather than absolute — cities and peak season run higher.</p>
            </div>`
          : ''}
      `
    })}

    ${section({
      id: 'best-time',
      eyebrow: 'When to go',
      title: `Best time to visit ${inName}`,
      lead: country.bestTime.summary,
      tone: 'section--tint',
      body: html`
        ${seasonList(country.bestTime.seasons)}
        ${country.bestTime.avoid
          ? html`<p class="note note--warn"><strong>Worth planning around:</strong> ${country.bestTime.avoid}</p>`
          : ''}
      `
    })}

    ${section({
      id: 'duration',
      eyebrow: 'Trip length',
      title: `How long to spend in ${inName}`,
      lead: country.tripDuration.summary,
      body: optionList(country.tripDuration.options)
    })}

    ${section({
      id: 'transport',
      eyebrow: 'Getting around',
      title: `Transportation in ${inName}`,
      lead: country.transport.intro,
      tone: 'section--tint',
      body: optionList(country.transport.options)
    })}

    ${section({
      id: 'itinerary',
      eyebrow: 'Sample route',
      title: country.itinerary.title,
      lead: country.itinerary.intro,
      body: itineraryList(country.itinerary.days)
    })}

    ${section({
      id: 'culture',
      eyebrow: 'Culture',
      title: `Culture and etiquette in ${inName}`,
      lead: country.culture.intro,
      tone: 'section--tint',
      body: html`
        ${detailList(country.culture.etiquette, { numbered: false })}
        <div class="callout-pair">
          ${calloutList(country.culture.dos, { title: 'Do', tone: 'do' })}
          ${calloutList(country.culture.donts, { title: "Don't", tone: 'dont' })}
        </div>
      `
    })}

    ${section({
      id: 'tips',
      eyebrow: 'Travel tips',
      title: `${name} travel tips`,
      lead: country.tipsIntro,
      body: tipList(country.tips)
    })}

    ${section({
      id: 'faq',
      eyebrow: 'FAQ',
      title: `Visiting ${inName}: frequently asked questions`,
      tone: 'section--tint',
      body: faqList(country.faq)
    })}

    <section class="section section--cta">
      <div class="wrap cta">
        <h2 class="cta__title">Ready to plan your ${name} trip?</h2>
        <p class="cta__text">
          The full travel guide covers routes, budgets, regional differences and how to
          string these ten destinations into a trip that actually works.
        </p>
        <a class="btn btn--primary btn--lg" href="${url(`${country.slug}/travel-guide`)}">
          Read the ${name} travel guide<span aria-hidden="true"> →</span>
        </a>
      </div>
    </section>
  `;

  const schema = [
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: `Best Places to Visit in ${inName}`,
      description,
      numberOfItems: country.places.length,
      itemListElement: country.places.map((place, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: place.name,
        url: absolute(`${country.slug}/${place.slug}`)
      }))
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: absolute('') },
        { '@type': 'ListItem', position: 2, name: country.name, item: absolute(country.slug) }
      ]
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: country.faq.map((item) => ({
        '@type': 'Question',
        name: plain(item.q),
        acceptedAnswer: { '@type': 'Answer', text: plain(item.a) }
      }))
    }
  ];

  return layout({
    site,
    title: `${name} Travel Guide — 10 Best Places to Visit`,
    description,
    path: country.slug,
    image: country.credit ? { src: country.credit.hero } : null,
    bodyClass: 'page-country',
    schema,
    content
  });
}
