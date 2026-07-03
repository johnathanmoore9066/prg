/**
 * Lead capture — validation, spam controls, demo-mode submission.
 *
 * Spam architecture (live from day one, even while forms are demo-only):
 *  - honeypot: a visually-hidden "website" field; bots fill it, humans can't
 *  - time-trap: a hidden render timestamp; submissions faster than a human
 *    could type are dropped
 * Both failures "succeed" silently so bots learn nothing.
 *
 * Phase 2: point CONFIG.LEADS_ENDPOINT at a serverless function and
 * flip DEMO_MODE off — no markup changes needed.
 */

import { CONFIG } from './config.js';

const MIN_HUMAN_MS = 1500;

function showToast(message) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    toast.setAttribute('role', 'status');
    document.body.appendChild(toast);
  }
  toast.textContent = message;

  gsap.killTweensOf(toast);
  gsap
    .timeline()
    .fromTo(
      toast,
      { xPercent: -50, y: 120, opacity: 0 },
      { xPercent: -50, y: 0, opacity: 1, duration: 0.6, ease: 'expo.out' }
    )
    .to(toast, { y: 120, opacity: 0, duration: 0.5, ease: 'power2.in' }, '+=3.2');
}

function markValidity(form) {
  let firstBad = null;
  form.querySelectorAll('.field').forEach((field) => {
    const input = field.querySelector('.field__input');
    if (!input) return;
    const ok = input.checkValidity();
    field.classList.toggle('is-invalid', !ok);
    const err = field.querySelector('.field__error');
    if (err && !ok) err.textContent = input.validationMessage;
    if (!ok && !firstBad) firstBad = input;
  });
  if (firstBad) firstBad.focus();
  return !firstBad;
}

async function submitLead(form) {
  const data = Object.fromEntries(new FormData(form).entries());

  // Spam controls — fail silently
  const elapsed = Date.now() - Number(data._ts || 0);
  if (data.website || elapsed < MIN_HUMAN_MS) return true;

  delete data.website;
  delete data._ts;
  data._page = location.pathname + location.search;

  if (CONFIG.DEMO_MODE || !CONFIG.LEADS_ENDPOINT) {
    console.info('[PRG demo] Lead captured (not sent):', data);
    return true;
  }

  const res = await fetch(CONFIG.LEADS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.ok;
}

export function initForms() {
  document.querySelectorAll('form[data-lead]').forEach((form) => {
    form.setAttribute('novalidate', '');

    // time-trap timestamp
    const ts = document.createElement('input');
    ts.type = 'hidden';
    ts.name = '_ts';
    ts.value = String(Date.now());
    form.appendChild(ts);

    // clear error state while typing
    form.addEventListener('input', (e) => {
      const field = e.target.closest('.field');
      if (field) field.classList.remove('is-invalid');
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!markValidity(form)) return;

      const btn = form.querySelector('[type="submit"]');
      if (btn) btn.disabled = true;

      try {
        const ok = await submitLead(form);
        if (ok) {
          form.reset();
          ts.value = String(Date.now());
          showToast(form.dataset.success || "Thanks — we'll be in touch shortly.");
        } else {
          showToast('Something went wrong. Please call us at ' + CONFIG.PHONE + '.');
        }
      } finally {
        if (btn) btn.disabled = false;
      }
    });
  });
}
