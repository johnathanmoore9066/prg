/**
 * Entry point — boots the shared shell, populates the current page
 * from listings.json, then plays the curtain reveal.
 *
 * Page identity comes from <body data-page="…">.
 */

import { CONFIG } from './config.js';
import { initSmooth } from './smooth.js';
import { initTransitions, playEnter } from './transitions.js';
import {
  initNav,
  initMenu,
  prepareHeroIntro,
  playHeroIntro,
  initReveals,
  initParallax,
  initKenBurns,
} from './animations.js';
import { initForms } from './forms.js';
import { activeListings, featuredListing, findByMls, moreLikeThis } from './data.js';
import { fillFeatureHero, renderCards, renderDetail, showNotFound } from './render.js';

/* Never let a slow fetch hold the curtain down */
function withTimeout(promise, ms = 1800) {
  return Promise.race([promise, new Promise((r) => setTimeout(r, ms))]);
}

/* ---- Shared chrome ---- */

function injectConfig() {
  document.querySelectorAll('[data-config]').forEach((el) => {
    const key = el.dataset.config;
    switch (key) {
      case 'email':
        el.textContent = CONFIG.CONTACT_EMAIL;
        if (el.tagName === 'A') el.href = `mailto:${CONFIG.CONTACT_EMAIL}`;
        break;
      case 'phone':
        el.textContent = CONFIG.PHONE;
        if (el.tagName === 'A') el.href = `tel:+1${CONFIG.PHONE.replaceAll('-', '')}`;
        break;
      case 'fax':
        el.textContent = CONFIG.FAX;
        break;
      case 'address':
        el.textContent = CONFIG.ADDRESS_LINES.join(', ');
        break;
      case 'year':
        el.textContent = String(new Date().getFullYear());
        break;
    }
  });
}

function markCurrentNav() {
  const here = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav__link, .menu__link').forEach((a) => {
    const target = (a.getAttribute('href') || '').split('?')[0];
    if (target === here) a.setAttribute('aria-current', 'page');
  });
}

/* ---- Per-page population ---- */

async function populateHome() {
  const [feature, listings] = await Promise.all([featuredListing(), activeListings()]);
  fillFeatureHero(feature);
  renderCards(document.querySelector('[data-row-track]'), listings);
}

async function populateRentals() {
  const listings = await activeListings();
  renderCards(document.querySelector('[data-grid]'), listings);
  const count = document.querySelector('[data-count]');
  if (count) count.textContent = `${listings.length} ${listings.length === 1 ? 'home' : 'homes'} now showing`;
}

async function populateProperty() {
  const mls = new URLSearchParams(location.search).get('mls');
  const listing = mls ? await findByMls(mls) : null;

  if (!listing) {
    showNotFound();
    return;
  }

  renderDetail(listing);
  const related = await moreLikeThis(mls);
  const rowSection = document.querySelector('[data-related]');
  if (rowSection) {
    if (related.length) {
      renderCards(rowSection.querySelector('[data-row-track]'), related);
    } else {
      rowSection.hidden = true;
    }
  }
}

const populators = {
  home: populateHome,
  rentals: populateRentals,
  property: populateProperty,
};

/* ---- Boot ---- */

async function boot() {
  const page = document.body.dataset.page;

  initSmooth();
  initTransitions();
  prepareHeroIntro();

  injectConfig();
  markCurrentNav();

  if (populators[page]) {
    await withTimeout(populators[page]());
  }

  await playEnter();
  playHeroIntro();

  initNav();
  initMenu();
  initReveals();
  initParallax();
  initKenBurns();
  initForms();

  // Re-measure scroll positions once all imagery has arrived
  window.addEventListener('load', () => ScrollTrigger.refresh(), { once: true });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
