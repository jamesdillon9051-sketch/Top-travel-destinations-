/**
 * Minimal HTML templating helpers.
 *
 * Everything interpolated into an `html` template is escaped by default. Values
 * that are already markup must be wrapped in `raw()` — which is what every
 * template function in src/templates returns — so it is impossible to forget to
 * escape a string of page copy.
 */

const ESCAPES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
};

/** Marker for strings that are already safe HTML. */
class RawHtml {
  constructor(value) {
    this.value = value;
  }
  toString() {
    return this.value;
  }
}

/** Mark a string as trusted markup so `html` will not escape it. */
export function raw(value) {
  return value instanceof RawHtml ? value : new RawHtml(String(value ?? ''));
}

export function isRaw(value) {
  return value instanceof RawHtml;
}

/** Escape a value for insertion into HTML text or a double-quoted attribute. */
export function esc(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[&<>"']/g, (char) => ESCAPES[char]);
}

function resolve(value) {
  if (value === null || value === undefined || value === false) return '';
  if (value instanceof RawHtml) return value.value;
  if (Array.isArray(value)) return value.map(resolve).join('');
  return esc(value);
}

/**
 * Tagged template that escapes interpolations, flattens arrays and drops
 * null/undefined/false so conditional fragments can be written inline.
 */
export function html(strings, ...values) {
  let out = strings[0];
  for (let i = 0; i < values.length; i += 1) {
    out += resolve(values[i]) + strings[i + 1];
  }
  return raw(out);
}

/**
 * Build an attribute string from an object. `true` renders a bare attribute,
 * `false`/null/undefined omit it entirely.
 */
export function attrs(map) {
  const parts = [];
  for (const [key, value] of Object.entries(map)) {
    if (value === false || value === null || value === undefined) continue;
    if (value === true) {
      parts.push(key);
      continue;
    }
    parts.push(`${key}="${esc(value)}"`);
  }
  return raw(parts.length ? ' ' + parts.join(' ') : '');
}

/** Join an array of fragments with a separator, escaping non-raw entries. */
export function join(items, separator = '') {
  return raw(items.map(resolve).join(separator));
}

/** Serialise a value as a <script type="application/ld+json"> safe payload. */
export function jsonLd(data) {
  const json = JSON.stringify(data, null, 2)
    // Prevent an embedded "</script>" in copy from closing the tag early.
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
  return raw(`<script type="application/ld+json">\n${json}\n</script>`);
}

const ENTITIES = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&nbsp;': ' '
};

/**
 * Strip tags, decode entities and collapse whitespace. Used for meta
 * descriptions and JSON-LD, both of which need plain text — copy reaching them
 * may already have been through link expansion and escaping.
 */
export function plain(value, maxLength = 0) {
  const text = String(value ?? '')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;|&lt;|&gt;|&quot;|&#39;|&nbsp;/g, (entity) => ENTITIES[entity])
    .replace(/\s+/g, ' ')
    .trim();
  if (!maxLength || text.length <= maxLength) return text;
  const cut = text.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > maxLength * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[,;:.\s]+$/, '') + '…';
}
