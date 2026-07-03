/**
 * Page transitions — MPA with a dark curtain overlay.
 *
 * Enter: the curtain covers the page by default (CSS), so there is
 * never a flash of unstyled/unpopulated content. Once the page data
 * is in the DOM, playEnter() slides it away. First visit in the
 * session gets a longer branded preloader beat.
 *
 * Exit: same-origin link clicks are intercepted, the curtain slides
 * back in, then navigation proceeds.
 */

import { REDUCED } from './smooth.js';

const VISITED_KEY = 'prg-visited';

const curtain = () => document.querySelector('.curtain');

export async function playEnter() {
  const el = curtain();
  if (!el) return;

  document.documentElement.classList.add('is-transitioning');

  if (REDUCED) {
    el.style.display = 'none';
    document.documentElement.classList.remove('is-transitioning');
    return;
  }

  const mark = el.querySelector('.curtain__mark');
  const fill = el.querySelector('.curtain__line i');
  const firstVisit = !sessionStorage.getItem(VISITED_KEY);

  const tl = gsap.timeline();

  if (firstVisit && mark) {
    sessionStorage.setItem(VISITED_KEY, '1');
    tl.to(mark, { opacity: 1, duration: 0.6, ease: 'power2.out' });
    if (fill) {
      tl.to(fill, { scaleX: 1, duration: 0.9, ease: 'power2.inOut' }, '<0.15');
    }
    tl.to(mark, { opacity: 0, duration: 0.45, ease: 'power2.in' }, '+=0.3');
  }

  tl.to(el, {
    yPercent: -100,
    duration: 0.9,
    ease: 'expo.inOut',
    onComplete: () => {
      el.style.visibility = 'hidden';
      document.documentElement.classList.remove('is-transitioning');
    },
  });

  return tl.then();
}

function playExit() {
  const el = curtain();
  if (!el || REDUCED) return Promise.resolve();

  el.style.visibility = 'visible';
  gsap.set(el, { yPercent: 100 });
  const mark = el.querySelector('.curtain__mark');
  if (mark) gsap.set(mark, { opacity: 0 });

  return gsap
    .to(el, { yPercent: 0, duration: 0.55, ease: 'expo.inOut' })
    .then();
}

function isInternalNav(a) {
  if (!a || a.target === '_blank' || a.hasAttribute('download')) return false;
  const href = a.getAttribute('href') || '';
  if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return false;
  const url = new URL(a.href, location.href);
  if (url.origin !== location.origin) return false;
  // same page + hash only → let the anchor handler deal with it
  if (url.pathname === location.pathname && url.search === location.search && url.hash) return false;
  return true;
}

export function initTransitions() {
  // Intercept internal links → curtain out → navigate
  document.addEventListener('click', (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    const a = e.target.closest('a[href]');
    if (!isInternalNav(a)) return;
    e.preventDefault();
    playExit().then(() => location.assign(a.href));
  });

  // Back/forward cache restore: make sure the curtain is gone
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) {
      const el = curtain();
      if (el) {
        gsap.set(el, { yPercent: -100 });
        el.style.visibility = 'hidden';
      }
    }
  });
}
