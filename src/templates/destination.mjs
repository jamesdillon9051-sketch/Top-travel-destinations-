import { html, join, plain } from '../lib/html.mjs';
import { url, absolute } from '../lib/url.mjs';
import { displayName, inlineName } from '../lib/text.mjs';
import { layout } from './layout.mjs';
import {
  hero,
  sectionNav,
  section,
  prose,
  categoryPills,
  attractionList,
  detailList,
  foodList,
  factTable,
  seasonList,
  itineraryList,
  tipList,
  faqList,
  optionList,
  destinationGrid,
  articleCard
} from './partials.mjs';

const SECTIONS = [
  { id: 'why-visit', label: 'Why visit' },
  { id: 'attractions', label: 'Attractions' },
  { id: 'things-to-do', label: 'Things to do' },
  { id: 'food', label: 'Food' },
  { id: 'stay', label: 'Where to stay' },
  { id: 'getting-around', label: 'Getting around' },
  { id: 'best-time', label: 'Best time' },
  { id: 'itinerary', label: 'Itinerary' },
  { id: 'tips', label: 'Tips' },
  { id: 'faq', label: 'FAQ' }
];

export function renderDestination(destination, { site }) {
  const country = destination.countryData;
  const name = displayName(destination);
  const inName = inlineName(destination);
  const pagePath = `${country.slug}/${destination.slug}`;
  const description = plain(destination.metaDescription || destination.intro[0], 158);

  const content = html`
    ${hero({
      credit: destination.credit,
      alt: destination.image?.alt || destination.name,
      eyebrow: `${destination.region} · ${country.name}`,
      title: destination.name,
      tagline: destination.tagline,
      meta: [
        { label: 'Best time', value: destination.bestTime.headline },
        { label: 'Stay', value: destination.suggestedStay },
        { label: 'Good for', value: destination.goodFor }
      ].filter((m) => m.value),
      trail: [
        { label: 'Home', href: '' },
        { label: country.name, href: country.slug },
        { label: destination.name }
      ]
    })}

    ${sectionNav(SECTIONS)}

    <section class="section section--intro" id="introduction">
      <div class="wrap layout-split">
        <div class="layout-split__main">
          <h2 class="section__title">${`Welcome to ${inName}`}</h2>
          ${prose(destination.intro)}
          ${categoryPills(destination.categories)}
        </div>
        <aside class="layout-split__aside">
          <div class="panel">
            <h2 class="panel__title">At a glance</h2>
            ${factTable([
              { label: 'Region', value: destination.region },
              { label: 'Country', value: html`<a href="${url(country.slug)}">${country.name}</a>` },
              { label: 'Best time', value: destination.bestTime.headline },
              { label: 'Suggested stay', value: destination.suggestedStay },
              { label: 'Nearest airport', value: destination.nearestAirport },
              { label: 'Known for', value: destination.knownFor },
              { label: 'Budget', value: destination.budget }
            ])}
            <a class="btn btn--ghost panel__btn" href="${url(`${country.slug}/travel-guide`)}">
              ${country.name} travel guide
            </a>
          </div>
        </aside>
      </div>
    </section>

    ${section({
      id: 'why-visit',
      eyebrow: 'Why visit',
      title: `Why visit ${inName}?`,
      lead: destination.whyVisit.intro,
      body: detailList(destination.whyVisit.points, { numbered: false })
    })}

    ${section({
      id: 'attractions',
      eyebrow: 'Main attractions',
      title: `Top things to see in ${inName}`,
      lead: destination.attractionsIntro,
      tone: 'section--tint',
      body: attractionList(destination.attractions)
    })}

    ${section({
      id: 'things-to-do',
      eyebrow: 'Things to do',
      title: `Best things to do in ${inName}`,
      lead: destination.thingsToDoIntro,
      body: detailList(destination.thingsToDo)
    })}

    ${section({
      id: 'food',
      eyebrow: 'Local food',
      title: `What to eat in ${inName}`,
      lead: destination.foodIntro,
      tone: 'section--tint',
      body: foodList(destination.foods)
    })}

    ${section({
      id: 'stay',
      eyebrow: 'Accommodation',
      title: `Where to stay in ${inName}`,
      lead: destination.accommodation.intro,
      body: html`
        ${optionList(destination.accommodation.areas.map((a) => ({ name: a.name, text: a.text, detail: a.bestFor ? `Best for: ${a.bestFor}` : null })))}
        ${destination.accommodation.budget
          ? html`<div class="budget-bands">
              <h3 class="budget-bands__title">What a night costs</h3>
              ${factTable(
                destination.accommodation.budget.map((b) => ({ label: b.label, value: b.value }))
              )}
            </div>`
          : ''}
      `
    })}

    ${section({
      id: 'getting-around',
      eyebrow: 'Transport',
      title: `Getting to and around ${inName}`,
      lead: destination.gettingThere.intro,
      tone: 'section--tint',
      body: html`
        <h3 class="subhead">Getting there</h3>
        ${optionList(destination.gettingThere.options)}
        <h3 class="subhead">Getting around</h3>
        <p class="section__lead section__lead--inline">${destination.gettingAround.intro}</p>
        ${optionList(destination.gettingAround.options)}
      `
    })}

    ${section({
      id: 'best-time',
      eyebrow: 'When to go',
      title: `Best time to visit ${inName}`,
      lead: destination.bestTime.summary,
      body: html`
        ${seasonList(destination.bestTime.seasons)}
        ${destination.bestTime.avoid
          ? html`<p class="note note--warn"><strong>Worth planning around:</strong> ${destination.bestTime.avoid}</p>`
          : ''}
      `
    })}

    ${section({
      id: 'itinerary',
      eyebrow: 'Itinerary',
      title: destination.itinerary.title || `${destination.itinerary.days.length} days in ${inName}`,
      lead: destination.itinerary.intro,
      tone: 'section--tint',
      body: itineraryList(destination.itinerary.days)
    })}

    ${section({
      id: 'tips',
      eyebrow: 'Travel tips',
      title: `${name} travel tips`,
      lead: destination.tipsIntro,
      body: tipList(destination.tips)
    })}

    ${section({
      id: 'faq',
      eyebrow: 'FAQ',
      title: `${name}: frequently asked questions`,
      tone: 'section--tint',
      body: faqList(destination.faq)
    })}

    ${section({
      id: 'related',
      eyebrow: 'Keep exploring',
      title: 'Related destinations',
      lead: `Places that pair well with ${inName}, whether you have a few spare days or are building a longer route.`,
      body: html`
        ${destinationGrid(destination.relatedPlaces, { showCountry: true })}
        <p class="section__more">
          <a class="btn btn--ghost" href="${url(country.slug)}">
            All 10 destinations in ${country.name}<span aria-hidden="true"> →</span>
          </a>
        </p>
      `
    })}

    ${section({
      id: 'articles',
      eyebrow: 'Read next',
      title: 'Related travel articles',
      body: html`<div class="mini-grid">
        ${join(destination.relatedArticleData.map((article) => articleCard(article)))}
      </div>`
    })}
  `;

  const schema = [
    {
      '@context': 'https://schema.org',
      '@type': 'TouristDestination',
      name: destination.name,
      description,
      url: absolute(pagePath),
      image: destination.credit ? absolute(destination.credit.hero) : undefined,
      address: {
        '@type': 'PostalAddress',
        addressRegion: destination.region,
        addressCountry: country.countryCode || country.name
      },
      geo: destination.coords
        ? {
            '@type': 'GeoCoordinates',
            latitude: destination.coords.lat,
            longitude: destination.coords.lng
          }
        : undefined,
      touristType: destination.categories.map((c) => c.replace(/-/g, ' ')),
      includesAttraction: destination.attractions.map((a) => ({
        '@type': 'TouristAttraction',
        name: plain(a.name),
        description: plain(a.text, 200)
      }))
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: absolute('') },
        { '@type': 'ListItem', position: 2, name: country.name, item: absolute(country.slug) },
        { '@type': 'ListItem', position: 3, name: destination.name, item: absolute(pagePath) }
      ]
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: destination.faq.map((item) => ({
        '@type': 'Question',
        name: plain(item.q),
        acceptedAnswer: { '@type': 'Answer', text: plain(item.a) }
      }))
    }
  ];

  return layout({
    site,
    title: `${destination.name} Travel Guide`,
    description,
    path: pagePath,
    image: destination.credit ? { src: destination.credit.hero } : null,
    bodyClass: 'page-destination',
    schema,
    content
  });
}
