import { html, join, plain } from '../lib/html.mjs';
import { url, absolute } from '../lib/url.mjs';
import { layout } from './layout.mjs';
import { hero, sectionNav, section, prose, detailList, faqList, destinationGrid, articleCard } from './partials.mjs';

export function renderArticle(article, { site, destinations, articles }) {
  const pagePath = `articles/${article.slug}`;
  const description = plain(article.summary, 158);

  const featured = (article.featuredDestinations || [])
    .map((slug) => destinations.get(slug))
    .filter(Boolean);
  const readNext = (article.readNext || [])
    .map((slug) => articles.get(slug))
    .filter(Boolean);

  const navItems = article.sections.map((s) => ({ id: s.id, label: s.navLabel || s.title }));

  const content = html`
    ${hero({
      credit: article.credit,
      alt: article.image?.alt || article.title,
      eyebrow: article.kicker || 'Travel article',
      title: article.title,
      tagline: article.subtitle,
      meta: [{ label: 'Reading time', value: article.readingTime }].filter((m) => m.value),
      trail: [
        { label: 'Home', href: '' },
        { label: 'Articles', href: 'articles' },
        { label: article.title }
      ]
    })}

    ${navItems.length > 2 ? sectionNav(navItems) : ''}

    <section class="section section--intro">
      <div class="wrap wrap--narrow">
        <p class="guide-summary">${article.summary}</p>
      </div>
    </section>

    ${join(
      article.sections.map(
        (sec) => html`<section class="section section--guide${sec.tone ? ` section--${sec.tone}` : ''}" id="${sec.id}">
          <div class="wrap wrap--narrow">
            <h2 class="section__title">${sec.title}</h2>
            ${sec.body ? prose(sec.body) : ''}
            ${sec.list ? detailList(sec.list, { numbered: Boolean(sec.numbered) }) : ''}
            ${sec.note ? html`<p class="note"><strong>${sec.noteLabel || 'Worth knowing'}:</strong> ${sec.note}</p>` : ''}
            ${sec.outro ? prose(sec.outro) : ''}
          </div>
        </section>`
      )
    )}

    ${article.faq
      ? section({ id: 'article-faq', eyebrow: 'FAQ', title: 'Common questions', body: faqList(article.faq) })
      : ''}

    ${featured.length
      ? section({
          id: 'featured',
          eyebrow: 'Destinations in this article',
          title: 'Places mentioned above',
          tone: 'section--tint',
          body: destinationGrid(featured, { showCountry: true })
        })
      : ''}

    ${readNext.length
      ? section({
          id: 'read-next',
          eyebrow: 'Read next',
          title: 'More travel articles',
          body: html`<div class="mini-grid">${join(readNext.map((a) => articleCard(a)))}</div>`
        })
      : ''}
  `;

  const schema = [
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: plain(article.title),
      description,
      image: article.credit ? absolute(article.credit.hero) : undefined,
      mainEntityOfPage: absolute(pagePath),
      author: { '@type': 'Organization', name: site.title },
      publisher: { '@type': 'Organization', name: site.title }
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: absolute('') },
        { '@type': 'ListItem', position: 2, name: 'Articles', item: absolute('articles') },
        { '@type': 'ListItem', position: 3, name: plain(article.title), item: absolute(pagePath) }
      ]
    }
  ];

  return layout({
    site,
    title: plain(article.title),
    description,
    path: pagePath,
    image: article.credit ? { src: article.credit.hero } : null,
    bodyClass: 'page-article',
    schema,
    content
  });
}
