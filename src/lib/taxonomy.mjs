/** Destination categories — shared by the card templates and the filter UI. */
export const CATEGORY_LABELS = {
  'capital-city': 'Capital City',
  'major-city': 'Major City',
  historic: 'Historic Site',
  unesco: 'UNESCO Site',
  archaeological: 'Archaeology',
  cultural: 'Culture & Arts',
  coastal: 'Coast & Beaches',
  island: 'Island',
  nature: 'Nature & Wildlife',
  'national-park': 'National Park',
  mountains: 'Mountains',
  scenic: 'Scenic Region',
  'food-and-wine': 'Food & Wine',
  'off-the-beaten-path': 'Off the Beaten Path'
};

/** Order categories appear in the country-page filter bar. */
export const CATEGORY_ORDER = Object.keys(CATEGORY_LABELS);

export function categoryLabel(slug) {
  return (
    CATEGORY_LABELS[slug] ||
    String(slug)
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  );
}

export function isKnownCategory(slug) {
  return Object.prototype.hasOwnProperty.call(CATEGORY_LABELS, slug);
}
