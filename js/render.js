/**
 * Rendering — clones <template> nodes and fills [data-slot] elements.
 * All listing data goes in via textContent (never innerHTML), so the
 * JSON can never inject markup.
 */

import { formatPrice, cityState, posterSrc, detailUrl } from './data.js';

/* Fill any element marked data-slot inside a root node */
function fill(root, slot, value) {
  root.querySelectorAll(`[data-slot="${slot}"]`).forEach((el) => {
    el.textContent = value ?? '';
  });
}

function setMedia(figure, src, alt) {
  if (!figure) return;
  const img = figure.querySelector('.media__img');
  if (src && img) {
    img.src = src;
    img.alt = alt || '';
  } else if (img) {
    img.remove();
    figure.classList.add('media--fallback');
  }
}

/* ------------------------------------------------------------
   Poster card (used by rows and the rentals grid)
   ------------------------------------------------------------ */
export function posterCard(listing) {
  const tpl = document.getElementById('tpl-poster-card');
  if (!tpl) return null;

  const node = tpl.content.firstElementChild.cloneNode(true);
  node.href = detailUrl(listing);
  node.setAttribute('aria-label', `${listing.street_address}, ${cityState(listing)} — ${formatPrice(listing.monthly_price)}`);

  setMedia(node.querySelector('.media'), posterSrc(listing), `${listing.street_address}, ${cityState(listing)}`);

  fill(node, 'status', listing.status);
  fill(node, 'address', listing.street_address);
  fill(node, 'city', cityState(listing));
  fill(node, 'price', formatPrice(listing.monthly_price));
  fill(node, 'tagline', listing.tagline || '');

  return node;
}

export function renderCards(container, listings) {
  if (!container) return;
  const frag = document.createDocumentFragment();
  listings.forEach((l) => {
    const card = posterCard(l);
    if (card) frag.appendChild(card);
  });
  container.replaceChildren(frag);
}

/* ------------------------------------------------------------
   Home feature hero
   ------------------------------------------------------------ */
export function fillFeatureHero(listing) {
  const hero = document.querySelector('[data-feature-hero]');
  if (!hero || !listing) return;

  setMedia(hero.querySelector('.media'), posterSrc(listing), `${listing.street_address}, ${cityState(listing)}`);

  const [l1, l2] = hero.querySelectorAll('.hero__title .line > span');
  if (l1) l1.textContent = listing.street_address;
  if (l2) l2.textContent = cityState(listing);

  fill(hero, 'status', listing.status);
  fill(hero, 'city', cityState(listing));
  fill(hero, 'price', formatPrice(listing.monthly_price));
  fill(hero, 'tagline', listing.tagline || '');

  const cta = hero.querySelector('[data-slot-href="detail"]');
  if (cta) cta.href = detailUrl(listing);
}

/* ------------------------------------------------------------
   Property detail page
   ------------------------------------------------------------ */
export function renderDetail(listing) {
  const page = document.querySelector('[data-detail]');
  if (!page || !listing) return;

  document.title = `${listing.street_address} · ${cityState(listing)} — PRG Property Management`;

  setMedia(document.querySelector('[data-detail-backdrop]'), posterSrc(listing), '');
  setMedia(document.querySelector('[data-detail-poster]'), posterSrc(listing), `${listing.street_address} exterior`);

  fill(page, 'status', listing.status);
  fill(page, 'address', listing.street_address);
  fill(page, 'city', cityState(listing));
  fill(page, 'zip', listing.zipcode || '');
  fill(page, 'price', formatPrice(listing.monthly_price));
  fill(page, 'tagline', listing.tagline || '');
  fill(page, 'desc', listing.description || '');
  fill(page, 'mls', `MLS #${listing.mls_number}`);

  fill(page, 'beds', listing.beds ?? '—');
  fill(page, 'baths', listing.baths ?? '—');
  fill(page, 'sqft', typeof listing.sqft === 'number' ? listing.sqft.toLocaleString('en-US') : '—');
  fill(page, 'mls-num', listing.mls_number);

  // Pre-fill the showing-request form context (form lives outside [data-detail])
  const propField = document.querySelector('[data-form-property]');
  if (propField) propField.value = `${listing.street_address}, ${cityState(listing)} (MLS #${listing.mls_number})`;
}

export function showNotFound() {
  ['[data-detail]', '[data-detail-hero]', '#showing', '[data-related]'].forEach((sel) => {
    const el = document.querySelector(sel);
    if (el) el.hidden = true;
  });
  const nf = document.querySelector('[data-notfound]');
  if (nf) nf.hidden = false;
  document.title = 'Listing not found — PRG Property Management';
}
