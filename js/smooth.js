/**
 * Smooth scrolling — Lenis driven by GSAP's ticker, kept in sync
 * with ScrollTrigger (the canonical integration pattern).
 * Exposes REDUCED so every other module can respect reduced motion.
 */

export const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export let lenis = null;

export function initSmooth() {
  gsap.registerPlugin(ScrollTrigger);

  if (REDUCED) return null; // native scrolling, no smoothing

  lenis = new Lenis({
    duration: 1.15,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
  });

  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  // In-page anchors go through Lenis so they inherit the easing
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const target = document.querySelector(a.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    lenis.scrollTo(target, { offset: -80 });
  });

  return lenis;
}
