/**
 * Submissions inbox — type tabs + status filter chips + detail modal.
 * Opening a detail auto-advances unread → pending (server-side, ?open=1);
 * complete/archived are set manually from the detail's status select.
 */

import { api } from './api.js';
import {
  FORM_TYPES,
  STATUSES,
  TYPE_LABELS,
  FIELD_LABELS,
  escapeHtml,
  fmtDate,
  statusPill,
  toast,
  openModal,
  closeModal,
  requestBadgeRefresh,
} from './ui.js';

export async function renderSubmissions(outlet, params) {
  const type = FORM_TYPES.includes(params.get('type')) ? params.get('type') : '';
  const status = STATUSES.includes(params.get('status')) ? params.get('status') : '';
  const openId = Number(params.get('open')) || null;

  const qs = new URLSearchParams({ limit: '50' });
  if (type) qs.set('type', type);
  if (status) qs.set('status', status);
  const data = await api.get(`/api/admin/submissions?${qs}`);

  const typeTotals = {};
  let allTotal = 0;
  for (const c of data.counts) {
    typeTotals[c.form_type] = (typeTotals[c.form_type] || 0) + c.count;
    allTotal += c.count;
  }

  const hashFor = (t, s) => {
    const q = new URLSearchParams();
    if (t) q.set('type', t);
    if (s) q.set('status', s);
    const str = q.toString();
    return `#/submissions${str ? '?' + str : ''}`;
  };

  const typeChips = ['', ...FORM_TYPES]
    .map((t) => {
      const label = t ? TYPE_LABELS[t] : 'All';
      const count = t ? typeTotals[t] || 0 : allTotal;
      return `<button class="dash-chip" type="button" aria-pressed="${t === type}"
        data-hash="${hashFor(t, status)}">${label} <em>${count}</em></button>`;
    })
    .join('');

  const statusChips = ['', ...STATUSES]
    .map(
      (s) => `<button class="dash-chip" type="button" aria-pressed="${s === status}"
        data-hash="${hashFor(type, s)}">${s || 'Any status'}</button>`
    )
    .join('');

  const rows = data.submissions
    .map(
      (s) => `
      <li class="dash-list__item" data-open="${s.id}">
        <div class="dash-list__main">
          <div class="dash-list__title">${escapeHtml(s.name || s.email || '—')}</div>
          <div class="dash-list__sub">${TYPE_LABELS[s.form_type] || s.form_type} · ${escapeHtml(
            s.payload?.message || s.payload?.property || s.payload?.property_address || s.email || ''
          )}</div>
        </div>
        <span class="dash-list__meta">${fmtDate(s.created_at)}</span>
        ${statusPill(s.status)}
      </li>`
    )
    .join('');

  outlet.innerHTML = `
    <div class="dash-view">
      <div class="dash-view__head">
        <div>
          <h1>Submissions</h1>
          <p>${data.total} ${status || type ? 'matching' : 'open'} · archived are hidden unless filtered</p>
        </div>
      </div>
      <div class="dash-chips">${typeChips}</div>
      <div class="dash-chips">${statusChips}</div>
      <div class="neu-card dash-panel">
        ${
          rows
            ? `<ul class="dash-list">${rows}</ul>`
            : '<div class="dash-empty">Nothing here for this filter.</div>'
        }
      </div>
    </div>`;

  outlet.querySelectorAll('[data-hash]').forEach((chip) => {
    chip.addEventListener('click', () => {
      location.hash = chip.dataset.hash;
    });
  });

  const rerender = () => {
    const clean = new URLSearchParams(params);
    clean.delete('open');
    renderSubmissions(outlet, clean);
    requestBadgeRefresh();
  };

  outlet.querySelectorAll('[data-open]').forEach((row) => {
    row.addEventListener('click', () => openDetail(Number(row.dataset.open), rerender));
  });

  if (openId) {
    // Deep link (#/submissions?open=N) — open it, then drop the param so
    // closing the modal leaves a clean, re-clickable state.
    history.replaceState(null, '', hashFor(type, status) || '#/submissions');
    openDetail(openId, rerender);
  }
}

/* ---- Detail modal ---- */

async function openDetail(id, rerender) {
  let submission;
  try {
    ({ submission } = await api.get(`/api/admin/submissions/${id}?open=1`));
  } catch (err) {
    toast(err.message, true);
    return;
  }
  // The fetch itself may have advanced unread → pending
  rerender();

  const payloadRows = Object.entries(submission.payload || {})
    .filter(([, v]) => v !== '' && v != null)
    .map(
      ([k, v]) => `
      <div class="dash-detail__row">
        <dt>${escapeHtml(FIELD_LABELS[k] || k)}</dt>
        <dd>${escapeHtml(v)}</dd>
      </div>`
    )
    .join('');

  const statusOptions = STATUSES.map(
    (s) => `<option value="${s}" ${s === submission.status ? 'selected' : ''}>${s}</option>`
  ).join('');

  const replyHref = submission.email
    ? `mailto:${encodeURIComponent(submission.email)}?subject=${encodeURIComponent(
        `Re: your ${TYPE_LABELS[submission.form_type] || 'submission'} — PRG Property Management`
      )}`
    : '';

  const card = openModal(`
    <div class="dash-detail">
      <div class="dash-detail__head">
        <h2 class="dash-modal__title" style="margin:0">${TYPE_LABELS[submission.form_type] || submission.form_type}</h2>
        <span class="dash-list__meta">${fmtDate(submission.created_at)}</span>
      </div>
      <dl class="neu-inset dash-detail__fields" style="margin:0">${payloadRows}</dl>
      <div class="dash-detail__status">
        <label class="dash-list__meta" for="sub-status">Status</label>
        <select class="neu-input" id="sub-status" data-status>${statusOptions}</select>
        ${replyHref ? `<a class="neu-btn neu-btn--small" href="${replyHref}">Reply by email</a>` : ''}
        <button class="neu-btn neu-btn--small" type="button" data-close style="margin-left:auto">Close</button>
      </div>
    </div>`);

  card.querySelector('[data-close]').addEventListener('click', closeModal);

  card.querySelector('[data-status]').addEventListener('change', async (e) => {
    try {
      await api.patch(`/api/admin/submissions/${id}`, { status: e.target.value });
      toast(`Marked ${e.target.value}`);
      rerender();
    } catch (err) {
      toast(err.message, true);
      e.target.value = submission.status;
    }
  });
}
