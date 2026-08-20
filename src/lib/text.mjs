/**
 * Destination names are used both as headings ("The Dordogne travel tips") and
 * inside sentences ("Welcome to the Dordogne"). A single title-cased string
 * cannot do both, so data files may supply a `shortName` — the form that reads
 * naturally in prose — and templates lowercase its leading article when it
 * lands mid-sentence.
 */

/**
 * Heading and adjectival form: "The Dordogne", "Nice", "United States".
 * This is what reads correctly at the start of a heading ("Nice travel tips")
 * and before a noun ("your United States trip").
 */
export function displayName(item) {
  return item.shortName || item.name;
}

/**
 * Mid-sentence form: "the Dordogne", "Nice", "the United States". Derived by
 * lowercasing a leading article, or supplied explicitly by data for names that
 * take an article they do not otherwise carry.
 */
export function inlineName(item) {
  if (item.inlineName) return item.inlineName;
  return String(displayName(item)).replace(/^The\s/, 'the ');
}
