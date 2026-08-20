import { html, join, plain } from '../lib/html.mjs';
import { url, absolute } from '../lib/url.mjs';
import { layout } from './layout.mjs';
import { hero, section, prose, destinationGrid, countryCard, articleCard, detailList } from './partials.mjs';

export function renderHome({ site, countryList, destinations, articles }) {
  const home = site.home;
  const featured = (home.featured || []).map((slug) => destinations.get(slug)).filter(Boolean);
  const featuredArticles = (home.featuredArticles || []).map((slug) => articles.get(slug)).filter(Boolean);
  const totalDestinations = countryList.reduce((sum, c) => sum + c.places.length, 0);

  const content = html`
    ${hero({
      credit: site.heroCredit,
      alt: site.hero?.alt || 'Travel destinations around the world',
      eyebrow: site.tagline,
      title: home.headline,
      tagline: home.subhead,
      actions: html`
        <a class="btn btn--primary btn--lg" href="${url('destinations')}">
          Browse all ${totalDestinations} destinations
        </a>
        <a class="btn btn--ghost btn--on-dark btn--lg" href="#countries">Pick a country</a>
      `
    })}

    <section class="section section--stats">
      <div class="wrap">
        <ul class="stats">
          ${join(
            (home.stats || []).map(
              (stat) => html`<li class="stat">
                <span class="stat__value">${stat.value}</span>
                <span class="stat__label">${stat.label}</span>
              </li>`
            )
          )}
        </ul>
      </div>
    </section>

    <section class="section section--intro" id="introduction">
      <div class="wrap wrap--narrow center">
        <h2 class="section__title">${home.introTitle}</h2>
        ${prose(home.intro)}
      </div>
    </section>

    ${section({
      id: 'countries',
      eyebrow: 'Start here',
      title: 'Five countries, ten destinations each',
      lead: home.countriesIntro,
      tone: 'section--tint',
      body: html`<div class="country-grid">
        ${join(countryList.map((country) => countryCard(country)))}
      </div>`
    })}

    ${featured.length
      ? section({
          id: 'featured',
          eyebrow: 'Editor’s picks',
          title: 'Destinations worth building a trip around',
          lead: home.featuredIntro,
          body: html`
            ${destinationGrid(featured, { showCountry: true })}
            <p class="section__more">
              <a class="btn btn--ghost" href="${url('destinations')}">
                See all ${totalDestinations} destinations<span aria-hidden="true"> →</span>
              </a>
            </p>
          `
        })
      : ''}

    ${home.how
      ? section({
          id: 'how',
          eyebrow: 'How to use this site',
          title: home.how.title,
          lead: home.how.intro,
          tone: 'section--tint',
          body: detailList(home.how.steps)
        })
      : ''}

    ${featuredArticles.length
      ? section({
          id: 'articles',
          eyebrow: 'Planning help',
          title: 'Travel articles',
          lead: home.articlesIntro,
          body: html`
            <div class="mini-grid">${join(featuredArticles.map((a) => articleCard(a)))}</div>
            <p class="section__more">
              <a class="btn btn--ghost" href="${url('articles')}">
                All travel articles<span aria-hidden="true"> →</span>
              </a>
            </p>
          `
        })
      : ''}
  `;

  const schema = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: site.title,
      description: plain(site.description),
      url: absolute('')
    }
  ];

  return layout({
    site,
    title: site.title,
    description: plain(site.description, 158),
    path: '',
    image: site.heroCredit ? { src: site.heroCredit.hero } : null,
    bodyClass: 'page-home',
    schema,
    content
  });
}
