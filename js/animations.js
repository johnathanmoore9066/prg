/**
 * Animations — nav behavior, hero intro, scroll reveals, parallax,
 * ken-burns. Everything checks REDUCED and degrades to static.
 */

import { REDUCED } from './smooth.js';

/* ------------------------------------------------------------
   Nav: solid backdrop after leaving the top, hide on scroll down,
   return on scroll up (streaming-site pattern)
   ------------------------------------------------------------ */
export function initNav() {
  const nav = document.querySelector('[data-nav]');
  if (!nav) return;

  const setSolid = () => nav.classList.toggle('nav--solid', window.scrollY > 24);
  setSolid();

  if (REDUCED) {
    window.addEventListener('scroll', setSolid, { passive: true });
    return;
  }

  ScrollTrigger.create({
    start: 0,
    end: 'max',
    onUpdate(self) {
      setSolid();
      const pastHero = window.scrollY > innerHeight * 0.6;
      if (self.direction === 1 && pastHero) {
        nav.classList.add('nav--hidden');
      } else {
        nav.classList.remove('nav--hidden');
      }
    },
  });
}

/* ------------------------------------------------------------
   Mobile fullscreen menu
   ------------------------------------------------------------ */
export function initMenu() {
  const burger = document.querySelector('.nav__burger');
  const menu = document.querySelector('.menu');
  if (!burger || !menu) return;

  const links = menu.querySelectorAll('.menu__link, .menu__meta');
  let open = false;

  const tl = REDUCED
    ? null
    : gsap
        .timeline({ paused: true })
        .to(menu, { autoAlpha: 1, duration: 0.35, ease: 'power2.out' })
        .fromTo(
          links,
          { y: 34, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.6, stagger: 0.06, ease: 'expo.out' },
          '<0.05'
        );

  function toggle(force) {
    open = force ?? !open;
    burger.setAttribute('aria-expanded', String(open));
    menu.classList.toggle('is-open', open);
    document.documentElement.style.overflow = open ? 'clip' : '';
    if (tl) {
      open ? tl.play() : tl.reverse();
    } else {
      menu.style.opacity = open ? '1' : '0';
      menu.style.visibility = open ? 'visible' : 'hidden';
    }
  }

  burger.addEventListener('click', () => toggle());
  menu.addEventListener('click', (e) => {
    if (e.target.closest('a')) toggle(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && open) toggle(false);
  });
}

/* ------------------------------------------------------------
   Hero intro — staggered rise of [data-hero-stagger] children,
   called after the curtain reveals the page
   ------------------------------------------------------------ */
export function prepareHeroIntro() {
  if (REDUCED) return;
  const items = document.querySelectorAll('[data-hero-stagger] > *');
  if (items.length) gsap.set(items, { y: 44, opacity: 0 });
}

export function playHeroIntro() {
  if (REDUCED) return;
  const items = document.querySelectorAll('[data-hero-stagger] > *');
  if (!items.length) return;
  gsap.to(items, {
    y: 0,
    opacity: 1,
    duration: 1.1,
    stagger: 0.09,
    ease: 'expo.out',
    clearProps: 'transform',
  });
}

/* ------------------------------------------------------------
   Scroll reveals — [data-reveal] rises in when entering viewport
   ------------------------------------------------------------ */
export function initReveals() {
  const els = gsap.utils.toArray('[data-reveal]');
  if (!els.length) return;

  if (REDUCED) return; // elements simply stay visible

  gsap.set(els, { y: 40, opacity: 0 });

  ScrollTrigger.batch(els, {
    start: 'top 88%',
    once: true,
    onEnter: (batch) =>
      gsap.to(batch, {
        y: 0,
        opacity: 1,
        duration: 0.9,
        stagger: 0.08,
        ease: 'expo.out',
        clearProps: 'transform',
      }),
  });
}

/* ------------------------------------------------------------
   Hero parallax + slow ken-burns on hero media
   ------------------------------------------------------------ */
export function initParallax() {
  if (REDUCED) return;

  gsap.utils.toArray('[data-parallax]').forEach((wrap) => {
    const img = wrap.querySelector('.media__img');
    if (!img) return;
    gsap.fromTo(
      img,
      { yPercent: -6 },
      {
        yPercent: 6,
        ease: 'none',
        scrollTrigger: {
          trigger: wrap,
          start: 'top top',
          end: 'bottom top',
          scrub: true,
        },
      }
    );
  });
}

export function initKenBurns() {
  if (REDUCED) return;
  gsap.utils.toArray('[data-kenburns] .media__img').forEach((img) => {
    gsap.fromTo(img, { scale: 1 }, { scale: 1.08, duration: 18, ease: 'none' });
  });
}
