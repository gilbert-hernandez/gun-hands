/** Same condition as the `#rotate` prompt's CSS in index.html. */
const PORTRAIT_PHONE = '(orientation: portrait) and (pointer: coarse)';

/** @type {MediaQueryList | undefined} */
let query;

/** Whether the page is on a touch device held in portrait, where the rotate prompt covers it (GH-26). */
export function isPortraitPhone() {
  query ??= window.matchMedia(PORTRAIT_PHONE);
  return query.matches;
}
