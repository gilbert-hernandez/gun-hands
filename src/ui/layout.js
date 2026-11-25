/**
 * A config section with its `touch` overrides applied, or as it is for desktop (GH-26). Nested
 * plain objects are merged; anything else is replaced.
 * @template {object} T
 * @param {T & { touch?: object }} base
 * @param {boolean} touch
 * @returns {T}
 */
export function pickLayout(base, touch) {
  return touch && base.touch ? merge(base, base.touch) : base;
}

function merge(base, over) {
  const out = { ...base };
  for (const [key, value] of Object.entries(over)) {
    const nested = value && typeof value === 'object' && !Array.isArray(value);
    out[key] = nested ? merge(base[key] ?? {}, value) : value;
  }
  return out;
}
