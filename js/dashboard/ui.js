/**
 * Shared dashboard UI: toast, modal/confirm, formatters, labels.
 * All animation is CSS — no GSAP on this page.
 */

export const FORM_TYPES = ['contact', 'owner', 'showing', 'applications', 'maintenance', 'payments'];
export const STATUSES = ['unread', 'pending', 'complete', 'archived'];

export const TYPE_LABELS = {
  contact: 'Contact Messages',
  owner: 'Owner Inquiries',
  showing: 'Showing Requests',
  applications: 'Applications',
  maintenance: 'Maintenance',
  payments: 'Payments',
};

export const FIELD_LABELS = {
  name: 'Name',
  email: 'Email',
  phone: 'Phone',
  role: 'I am a',
  message: 'Message',
  property_address: 'Property address',
  property: 'Property',
  move_in: 'Desired move-in',
  interest: 'Interest',
  _page: 'Submitted from',
};

export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

/* ---- Toast ---- */

let toastTimer = null;

export function toast(message, isError = false) {
  const el = document.querySelector('[data-toast]');
  el.textContent = message;
  el.classList.toggle('is-error', isError);
  el.hidden = false;
  // restart the entrance animation
  el.style.animation = 'none';
  void el.offsetHeight;
  el.style.animation = '';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.hidden = true;
  }, 3200);
}

/* ---- Modal ---- */

let onModalClose = null;

export function openModal(html, { onClose } = {}) {
  const wrap = document.querySelector('[data-modal]');
  const card = document.querySelector('[data-modal-card]');
  card.innerHTML = html;
  wrap.hidden = false;
  onModalClose = onClose || null;
  return card;
}

export function closeModal() {
  const wrap = document.querySelector('[data-modal]');
  if (wrap.hidden) return;
  wrap.hidden = true;
  document.querySelector('[data-modal-card]').innerHTML = '';
  const cb = onModalClose;
  onModalClose = null;
  if (cb) cb();
}

// Scrim click + Escape close the modal — wired once at import time.
document.querySelector('[data-modal-close]')?.addEventListener('click', closeModal);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

export function confirmDialog(message, confirmLabel = 'Delete') {
  return new Promise((resolve) => {
    let settled = false;
    const settle = (val) => {
      if (!settled) {
        settled = true;
        resolve(val);
      }
    };
    const card = openModal(
      `<h2 class="dash-modal__title">Are you sure?</h2>
       <p style="margin:0 0 1.5rem; color: var(--paper-dim)">${escapeHtml(message)}</p>
       <div class="dash-form__foot">
         <button class="neu-btn" type="button" data-cancel>Cancel</button>
         <button class="neu-btn neu-btn--danger" type="button" data-confirm>${escapeHtml(confirmLabel)}</button>
       </div>`,
      { onClose: () => settle(false) }
    );
    card.querySelector('[data-cancel]').addEventListener('click', closeModal);
    card.querySelector('[data-confirm]').addEventListener('click', () => {
      settle(true);
      closeModal();
    });
  });
}

/* ---- Formatters ---- */

export function fmtPrice(n) {
  return typeof n === 'number' ? `$${n.toLocaleString('en-US')}/mo` : '—';
}

const dateFmt = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

export function fmtDate(iso) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : dateFmt.format(d);
}

export function statusPill(status) {
  return `<span class="dash-pill dash-pill--${escapeHtml(status)}">${escapeHtml(status)}</span>`;
}

export function loading(label = 'Loading…') {
  return `<div class="dash-loading">${escapeHtml(label)}</div>`;
}

/** Ask main.js to refresh the sidebar unread badge (avoids an import cycle). */
export function requestBadgeRefresh() {
  window.dispatchEvent(new Event('dash:badge'));
}
